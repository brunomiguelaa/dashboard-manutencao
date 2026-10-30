/**
 * ============================================================================
 * Camada de Visão: SolicitarView
 * Arquitetura MVC - Frontend / Views
 * ============================================================================
 * Responsabilidade:
 * - Manipulação do DOM no formulário público de abertura de chamados.
 * - Gerenciamento de captura de imagem (câmera, galeria, drag & drop e clipboard).
 * - Exibição do modal de confirmação para chamados urgentes.
 * - Delegação da criação de chamado para o ChamadoController.
 */

import { ChamadoController } from '../../../backend/controllers/ChamadoController.js';
import { compressImageToBase64 } from '../../../backend/services/imageCompressorService.js';

// Elementos do DOM
const form = document.getElementById('maintenanceForm');
const inputSala = document.getElementById('salaInput');
const btnTriggerCamera = document.getElementById('btnTriggerCamera');
const btnTriggerGallery = document.getElementById('btnTriggerGallery');
const fileCameraInput = document.getElementById('fotoCameraInput');
const fileGalleryInput = document.getElementById('fotoGalleryInput');
const uploadDropzone = document.getElementById('uploadDropzone');
const photoUploadWrapper = document.getElementById('photoUploadWrapper');
const photoProcessingState = document.getElementById('photoProcessingState');
const photoAttachedCard = document.getElementById('photoAttachedCard');
const previewImage = document.getElementById('previewImage');
const photoSizeBadge = document.getElementById('photoSizeBadge');
const photoFilename = document.getElementById('photoFilename');
const btnChangePhoto = document.getElementById('btnChangePhoto');
const btnRemovePhoto = document.getElementById('btnRemovePhoto');

const btnSubmit = document.getElementById('btnSubmit');
const submitText = document.getElementById('submitText');
const submitSpinner = document.getElementById('submitSpinner');
const formCard = document.getElementById('formCard');
const successScreen = document.getElementById('successScreen');
const protocolDisplay = document.getElementById('protocolDisplay');
const btnNewRequest = document.getElementById('btnNewRequest');

// Modal de Alerta de Urgência
const modalUrgenteAlert = document.getElementById('modalUrgenteAlert');
const btnConfirmarUrgente = document.getElementById('btnConfirmarUrgente');
const btnMudarImportante = document.getElementById('btnMudarImportante');
const radioImportante = document.querySelector('input[name="prioridade"][value="importante"]');

// Estado local da View
let fotoBase64Processada = null;

document.addEventListener('DOMContentLoaded', () => {
  inicializarParametrosUrl();
  inicializarListenersRadios();
  inicializarUploadFotos();
  inicializarModalUrgente();
});

function inicializarParametrosUrl() {
  const params = new URLSearchParams(window.location.search);
  const localParam = params.get('sala') || params.get('salaId') || params.get('local');
  if (localParam && inputSala) {
    inputSala.value = decodeURIComponent(localParam);
  }
}

function inicializarListenersRadios() {
  document.querySelectorAll('input[name="avisouGestor"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.querySelectorAll('.gestor-options .radio-option-card').forEach(card => card.classList.remove('active'));
      e.target.closest('.radio-option-card')?.classList.add('active');
    });
  });

  document.querySelectorAll('input[name="prioridade"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.querySelectorAll('.priority-card').forEach(card => card.classList.remove('active'));
      e.target.closest('.priority-card')?.classList.add('active');

      if (e.target.value === 'urgente' && modalUrgenteAlert) {
        modalUrgenteAlert.classList.add('active');
      }
    });
  });
}

function inicializarModalUrgente() {
  if (!modalUrgenteAlert) return;

  btnConfirmarUrgente?.addEventListener('click', (e) => {
    e.preventDefault();
    modalUrgenteAlert.classList.remove('active');
  });

  btnMudarImportante?.addEventListener('click', (e) => {
    e.preventDefault();
    aplicarPrioridadeImportante();
    modalUrgenteAlert.classList.remove('active');
  });

  modalUrgenteAlert.addEventListener('click', (e) => {
    if (e.target === modalUrgenteAlert) {
      aplicarPrioridadeImportante();
      modalUrgenteAlert.classList.remove('active');
    }
  });
}

function aplicarPrioridadeImportante() {
  if (radioImportante) {
    radioImportante.checked = true;
    document.querySelectorAll('.priority-card').forEach(card => card.classList.remove('active'));
    radioImportante.closest('.priority-card')?.classList.add('active');
  }
}

function inicializarUploadFotos() {
  btnTriggerCamera?.addEventListener('click', () => fileCameraInput?.click());
  btnTriggerGallery?.addEventListener('click', () => fileGalleryInput?.click());

  fileCameraInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) processarFoto(e.target.files[0]);
  });

  fileGalleryInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) processarFoto(e.target.files[0]);
  });

  if (uploadDropzone) {
    uploadDropzone.addEventListener('click', () => fileGalleryInput?.click());

    ['dragenter', 'dragover'].forEach(name => {
      uploadDropzone.addEventListener(name, (e) => {
        e.preventDefault();
        uploadDropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      uploadDropzone.addEventListener(name, (e) => {
        e.preventDefault();
        uploadDropzone.classList.remove('dragover');
      });
    });

    uploadDropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processarFoto(e.dataTransfer.files[0]);
      }
    });
  }

  // Suporte a colar print screen (Ctrl + V)
  window.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processarFoto(blob);
            break;
          }
        }
      }
    }
  });

  btnChangePhoto?.addEventListener('click', () => fileGalleryInput?.click());
  btnRemovePhoto?.addEventListener('click', (e) => {
    e.preventDefault();
    removerFoto();
  });
}

async function processarFoto(file) {
  if (!file) return;

  if (photoUploadWrapper) photoUploadWrapper.style.display = 'none';
  if (photoAttachedCard) photoAttachedCard.style.display = 'none';
  if (photoProcessingState) photoProcessingState.style.display = 'flex';

  try {
    const resultado = await compressImageToBase64(file, 1024, 1024, 0.7);
    fotoBase64Processada = resultado.base64;

    if (previewImage) previewImage.src = resultado.base64;
    if (photoSizeBadge) photoSizeBadge.textContent = `~${resultado.sizeKb} KB`;
    if (photoFilename) photoFilename.textContent = resultado.fileName;

    if (photoProcessingState) photoProcessingState.style.display = 'none';
    if (photoAttachedCard) photoAttachedCard.style.display = 'block';
  } catch (error) {
    console.error('[SolicitarView] Erro ao processar foto:', error);
    alert('Não foi possível otimizar a imagem selecionada. Formato inválido ou corrompido.');
    removerFoto();
  }
}

function removerFoto() {
  fotoBase64Processada = null;
  if (fileCameraInput) fileCameraInput.value = '';
  if (fileGalleryInput) fileGalleryInput.value = '';
  if (previewImage) previewImage.src = '';
  if (photoProcessingState) photoProcessingState.style.display = 'none';
  if (photoAttachedCard) photoAttachedCard.style.display = 'none';
  if (photoUploadWrapper) photoUploadWrapper.style.display = 'flex';
}

// Submissão do formulário delegando ao ChamadoController
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const solicitanteNome = document.getElementById('solicitanteNome')?.value.trim();
    const setor = document.getElementById('setorSelect')?.value;
    const avisouGestorRadio = document.querySelector('input[name="avisouGestor"]:checked');
    const prioridadeRadio = document.querySelector('input[name="prioridade"]:checked');
    const salaNome = inputSala?.value.trim();
    const descricao = document.getElementById('descricao')?.value.trim();
    const observacoes = document.getElementById('observacoes')?.value.trim();

    if (!solicitanteNome) return alert('Por favor, informe seu nome completo.');
    if (!setor) return alert('Por favor, selecione seu setor institucional.');
    if (!avisouGestorRadio) return alert('Por favor, indique se o gestor imediato já foi notificado.');
    if (!prioridadeRadio) return alert('Por favor, classifique a prioridade do chamado.');
    if (!salaNome) return alert('Por favor, informe a sala ou local da ocorrência.');
    if (!descricao) return alert('Por favor, descreva sucintamente o problema.');

    setLoading(true);

    try {
      const resultado = await ChamadoController.criarChamado({
        solicitanteNome,
        setor,
        avisouGestor: avisouGestorRadio.value === 'sim',
        prioridade: prioridadeRadio.value,
        salaNome,
        descricao,
        observacoes,
        fotoBase64Previa: fotoBase64Processada
      });

      if (protocolDisplay) protocolDisplay.textContent = resultado.protocolo;
      if (formCard) formCard.style.display = 'none';
      if (successScreen) successScreen.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error('[SolicitarView] Falha ao registrar chamado:', error);
      alert('Falha ao abrir o chamado: ' + error.message);
    } finally {
      setLoading(false);
    }
  });
}

function setLoading(isLoading) {
  if (!btnSubmit) return;
  btnSubmit.disabled = isLoading;
  if (isLoading) {
    if (submitText) submitText.textContent = 'Enviando solicitação...';
    if (submitSpinner) submitSpinner.style.display = 'block';
  } else {
    if (submitText) submitText.textContent = 'Enviar Solicitação de Manutenção';
    if (submitSpinner) submitSpinner.style.display = 'none';
  }
}

// Botão de reiniciar fluxo
if (btnNewRequest) {
  btnNewRequest.addEventListener('click', () => {
    form?.reset();
    removerFoto();
    document.querySelectorAll('.radio-option-card').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.priority-card').forEach(c => c.classList.remove('active'));
    
    successScreen?.classList.remove('active');
    if (formCard) formCard.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
