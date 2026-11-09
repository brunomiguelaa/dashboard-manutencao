/**
 * ============================================================================
 * Camada de Visão: SolicitarView
 * Arquitetura MVC - Frontend / Views
 * ============================================================================
 * Responsabilidade:
 * - Manipulação do DOM no formulário público de abertura de chamados.
 * - Gerenciamento do campo de texto livre de localização (local_id).
 * - Gerenciamento de anexos (arquivo/galeria e captura em tempo real via câmera).
 * - Tratamento de permissão de câmera (try/catch para NotAllowedError) sem quebra de UI.
 * - Exibição do modal de confirmação para chamados urgentes.
 * - Validação client-side e delegação ao ChamadoController.
 */

import { ChamadoController } from '../../../backend/controllers/ChamadoController.js';
import { compressImageToBase64 } from '../../../backend/services/imageCompressorService.js';

// ============================================================================
// Elementos do DOM
// ============================================================================
const form = document.getElementById('maintenanceForm');

// 1. Campo Local (Texto Livre)
const inputLocal = document.getElementById('local_id');

// 2. Área de Anexos e Câmera
const inputAnexoDocumento = document.getElementById('inputAnexoDocumento');
const btnAbrirCamera = document.getElementById('btnAbrirCamera');
const btnCapturarFoto = document.getElementById('btnCapturarFoto');
const btnFecharCamera = document.getElementById('btnFecharCamera');
const cameraContainer = document.getElementById('cameraContainer');
const cameraVideo = document.getElementById('cameraVideo');
const cameraCanvas = document.getElementById('cameraCanvas');
const cameraPermissionError = document.getElementById('cameraPermissionError');

// Containers e Cards de Pré-visualização
const photoUploadWrapper = document.getElementById('photoUploadWrapper');
const photoProcessingState = document.getElementById('photoProcessingState');
const photoAttachedCard = document.getElementById('photoAttachedCard');
const previewImage = document.getElementById('previewImage');
const photoSizeBadge = document.getElementById('photoSizeBadge');
const photoFilename = document.getElementById('photoFilename');
const btnChangePhoto = document.getElementById('btnChangePhoto');
const btnRemovePhoto = document.getElementById('btnRemovePhoto');

// Controles de Submissão e Telas de Retorno
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

// ============================================================================
// Estado Local da View
// ============================================================================
let fotoBase64Processada = null;
let videoStreamAtivo = null;

document.addEventListener('DOMContentLoaded', () => {
  inicializarParametrosUrl();
  inicializarListenersRadios();
  inicializarAreaAnexosECamera();
  inicializarModalUrgente();
});

/**
 * 1. Campo Local: Preenche o campo de texto caso venha parâmetro via URL (ex: QR Code fixado na sala)
 */
function inicializarParametrosUrl() {
  const params = new URLSearchParams(window.location.search);
  const localParam = params.get('local') || params.get('local_id') || params.get('sala') || params.get('salaId');
  if (localParam && inputLocal) {
    inputLocal.value = decodeURIComponent(localParam).trim();
  }
}

/**
 * 2 e 3. Área de Anexos e Câmera:
 * - Opção 1: Input de arquivo para "Anexar Documento" (abrir galeria/arquivos).
 * - Opção 2: Botão específico para "Abrir Câmera" (acionamento sob demanda).
 * - Tratamento de erro com try/catch evitando tela preta e orientando o usuário.
 */
function inicializarAreaAnexosECamera() {
  // Opção 1: Anexar Documento (Galeria / Arquivo)
  inputAnexoDocumento?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      processarFoto(e.target.files[0]);
    }
  });

  // Opção 2: Abrir Câmera (Inicialização sob demanda via clique)
  btnAbrirCamera?.addEventListener('click', async () => {
    await abrirCameraAoVivo();
  });

  // Botão de Captura de Foto a partir do stream da câmera
  btnCapturarFoto?.addEventListener('click', () => {
    capturarFotoDaCamera();
  });

  // Botão de Cancelar / Fechar Câmera
  btnFecharCamera?.addEventListener('click', () => {
    pararStreamCamera();
  });

  // Trocar anexo ou remover
  btnChangePhoto?.addEventListener('click', () => {
    inputAnexoDocumento?.click();
  });

  btnRemovePhoto?.addEventListener('click', (e) => {
    e.preventDefault();
    removerFoto();
  });

  // Suporte a colar print screen diretamente na tela (Ctrl + V)
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
}

/**
 * 3. Tratamento de Erro da Câmera (JS):
 * Inicializa a câmera apenas quando o usuário clica no botão "Abrir Câmera".
 * Encapsulado em try/catch para capturar NotAllowedError ou outros bloqueios,
 * exibindo mensagem amigável e impedindo que a tela fique preta.
 */
async function abrirCameraAoVivo() {
  if (cameraPermissionError) cameraPermissionError.style.display = 'none';

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Seu navegador não oferece suporte à captura de vídeo via câmera.');
    }

    // Solicita o stream de vídeo da câmera traseira/ambiente
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });

    videoStreamAtivo = stream;
    if (cameraContainer) cameraContainer.style.display = 'block';
    if (cameraVideo) {
      cameraVideo.srcObject = stream;
      cameraVideo.setAttribute('playsinline', 'true');
      await cameraVideo.play();
    }
  } catch (error) {
    console.error('[SolicitarView] Falha/Permissão ao inicializar leitor de câmera:', error);

    // Garante liberação de recursos para evitar tela preta travada
    pararStreamCamera();

    // Exibe banner amigável na tela
    if (cameraPermissionError) {
      cameraPermissionError.style.display = 'block';
    }

    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      alert('Acesso à câmera bloqueado! Por favor, libere a permissão de câmera nas configurações do navegador para tirar fotos ou ler QR Code.');
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      alert('Nenhuma câmera foi encontrada conectada neste dispositivo.');
    } else {
      alert(`Não foi possível inicializar a câmera: ${error.message || error.name}`);
    }
  }
}

/**
 * Captura um frame estático do vídeo e envia para o pipeline de compressão client-side
 */
function capturarFotoDaCamera() {
  if (!cameraVideo || !videoStreamAtivo) return;

  const canvas = cameraCanvas || document.createElement('canvas');
  canvas.width = cameraVideo.videoWidth || 640;
  canvas.height = cameraVideo.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    if (blob) {
      const file = new File([blob], `captura-camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      processarFoto(file);
    }
    pararStreamCamera();
  }, 'image/jpeg', 0.85);
}

/**
 * Encerra as tracks ativas de mídia e oculta o container de visualização
 */
function pararStreamCamera() {
  if (videoStreamAtivo) {
    videoStreamAtivo.getTracks().forEach(track => track.stop());
    videoStreamAtivo = null;
  }
  if (cameraVideo) cameraVideo.srcObject = null;
  if (cameraContainer) cameraContainer.style.display = 'none';
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

/**
 * Otimiza e comprime a foto anexada no lado do cliente antes do envio
 */
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
  if (inputAnexoDocumento) inputAnexoDocumento.value = '';
  if (previewImage) previewImage.src = '';
  if (photoProcessingState) photoProcessingState.style.display = 'none';
  if (photoAttachedCard) photoAttachedCard.style.display = 'none';
  if (photoUploadWrapper) photoUploadWrapper.style.display = 'flex';
}

// ============================================================================
// Submissão do Formulário
// ============================================================================
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const solicitanteNome = document.getElementById('solicitanteNome')?.value.trim();
    const setor = document.getElementById('setorSelect')?.value;
    const avisouGestorRadio = document.querySelector('input[name="avisouGestor"]:checked');
    const prioridadeRadio = document.querySelector('input[name="prioridade"]:checked');
    
    // 1. Campo Local (Frontend):
    // Impede submissão caso o local esteja em branco
    const salaNome = inputLocal?.value ? inputLocal.value.trim() : '';
    const descricao = document.getElementById('descricao')?.value.trim();
    const observacoes = document.getElementById('observacoes')?.value.trim();

    if (!solicitanteNome) return alert('Por favor, informe seu nome completo.');
    if (!setor) return alert('Por favor, selecione seu setor institucional.');
    if (!avisouGestorRadio) return alert('Por favor, indique se o gestor imediato já foi notificado.');
    if (!prioridadeRadio) return alert('Por favor, classifique a prioridade do chamado.');
    if (!salaNome) return alert('Por favor, digite a sala ou local da ocorrência.');
    if (!descricao) return alert('Por favor, descreva sucintamente o problema.');

    setLoading(true);

    try {
      const resultado = await ChamadoController.criarChamado({
        solicitanteNome,
        setor,
        avisouGestor: avisouGestorRadio.value === 'sim',
        prioridade: prioridadeRadio.value,
        salaNome,
        local_id: salaNome,
        descricao,
        observacoes,
        fotoBase64Previa: fotoBase64Processada
      });

      // Feedback Visual Amigável
      alert(`Chamado aberto com sucesso! Protocolo gerado: ${resultado.protocolo}`);

      const feedbackBox = document.getElementById('feedbackAberturaBox');
      const feedbackTexto = document.getElementById('feedbackAberturaTexto');
      if (feedbackBox && feedbackTexto) {
        feedbackTexto.textContent = `Chamado aberto com sucesso! Protocolo: ${resultado.protocolo}`;
        feedbackBox.style.display = 'block';
      }

      if (protocolDisplay) protocolDisplay.textContent = resultado.protocolo;
      if (formCard) formCard.style.display = 'none';
      if (successScreen) successScreen.classList.add('active');

      // Limpeza do formulário e estado
      form.reset();
      removerFoto();
      pararStreamCamera();
      document.querySelectorAll('.gestor-options .radio-option-card').forEach(c => c.classList.remove('active'));
      document.querySelectorAll('.priority-card').forEach(c => c.classList.remove('active'));

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

// Botão de reiniciar fluxo para abrir outro chamado
if (btnNewRequest) {
  btnNewRequest.addEventListener('click', () => {
    form?.reset();
    removerFoto();
    pararStreamCamera();
    document.querySelectorAll('.radio-option-card').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.priority-card').forEach(c => c.classList.remove('active'));
    
    successScreen?.classList.remove('active');
    if (formCard) formCard.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
