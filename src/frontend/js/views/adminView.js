/**
 * ============================================================================
 * Camada de Visão: AdminView
 * Arquitetura MVC - Frontend / Views
 * ============================================================================
 * Responsabilidade:
 * - Manipulação do DOM no painel administrativo de gestão de chamados.
 * - Renderização das tabelas de chamados ativos e concluídos.
 * - Aplicação de filtros reativos (busca, status, prioridade e setor).
 * - Controle dos modais de detalhes, edição de observação e geração de QR Code.
 * - Delegação das ações operacionais para o ChamadoController e AuthController.
 */

import { ChamadoController } from '../../../backend/controllers/ChamadoController.js';
import { AuthController } from '../../../backend/controllers/AuthController.js';
import { StatusEnum, PrioridadeEnum } from '../../../backend/models/ChamadoModel.js';

// Elementos Principais
const appContainer = document.getElementById('appContainer');
const loadingScreen = document.getElementById('loadingScreen');
const userEmailEl = document.getElementById('userEmail');
const btnLogout = document.getElementById('btnLogout');

// Navegação entre Abas
const navChamados = document.getElementById('navChamados');
const navChamadosConcluidos = document.getElementById('navChamadosConcluidos');
const navQrCode = document.getElementById('navQrCode');
const btnTopbarQr = document.getElementById('btnTopbarQr');

const badgeAtivosCount = document.getElementById('badgeAtivosCount');
const badgeConcluidosCount = document.getElementById('badgeConcluidosCount');

const viewChamados = document.getElementById('viewChamados');
const viewChamadosConcluidos = document.getElementById('viewChamadosConcluidos');
const viewQrCode = document.getElementById('viewQrCode');
const pageTitle = document.getElementById('pageTitle');

// Tabela e Filtros de Chamados Ativos
const chamadosTableBody = document.getElementById('chamadosTableBody');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const filterPrioridade = document.getElementById('filterPrioridade');
const filterSetor = document.getElementById('filterSetor');

// Métricas de Chamados Ativos
const countAtivosTotal = document.getElementById('countAtivosTotal');
const countPendentes = document.getElementById('countPendentes');
const countAndamento = document.getElementById('countAndamento');
const countUrgentes = document.getElementById('countUrgentes');

// Tabela e Filtros de Chamados Concluídos
const chamadosConcluidosTableBody = document.getElementById('chamadosConcluidosTableBody');
const searchConcluidosInput = document.getElementById('searchConcluidosInput');
const filterConcluidosStatus = document.getElementById('filterConcluidosStatus');
const filterConcluidosPrioridade = document.getElementById('filterConcluidosPrioridade');
const filterConcluidosSetor = document.getElementById('filterConcluidosSetor');

// Métricas de Chamados Concluídos
const countConcluidosTotal = document.getElementById('countConcluidosTotal');
const countConcluidosHoje = document.getElementById('countConcluidosHoje');
const countCancelados = document.getElementById('countCancelados');

// Modal de Detalhes
const modalChamado = document.getElementById('modalChamado');
const btnCloseModalChamado = document.getElementById('btnCloseModalChamado');
const modalProtocolo = document.getElementById('modalProtocolo');
const modalSolicitante = document.getElementById('modalSolicitante');
const modalSetor = document.getElementById('modalSetor');
const modalSala = document.getElementById('modalSala');
const modalAvisouGestor = document.getElementById('modalAvisouGestor');
const modalPrioridadeBadge = document.getElementById('modalPrioridadeBadge');
const modalDataAbertura = document.getElementById('modalDataAbertura');
const modalDataFechamentoWrap = document.getElementById('modalDataFechamentoWrap');
const modalDataFechamento = document.getElementById('modalDataFechamento');
const modalDescricao = document.getElementById('modalDescricao');
const modalObservacoes = document.getElementById('modalObservacoes');
const modalPhotoWrap = document.getElementById('modalPhotoWrap');
const modalPhotoImg = document.getElementById('modalPhotoImg');
const modalPhotoLink = document.getElementById('modalPhotoLink');
const modalAdminObsEditSection = document.getElementById('modalAdminObsEditSection');
const modalAdminObsViewSection = document.getElementById('modalAdminObsViewSection');
const modalAdminObservacao = document.getElementById('modalAdminObservacao');
const modalAdminObservacaoDisplay = document.getElementById('modalAdminObservacaoDisplay');
const btnEditarObsAdmin = document.getElementById('btnEditarObsAdmin');
const modalAdminObsEditActions = document.getElementById('modalAdminObsEditActions');
const btnCancelarEdicaoObs = document.getElementById('btnCancelarEdicaoObs');
const btnSalvarEdicaoObs = document.getElementById('btnSalvarEdicaoObs');
const modalStatusSelect = document.getElementById('modalStatusSelect');
const btnSalvarStatus = document.getElementById('btnSalvarStatus');
const btnModalConcluir = document.getElementById('btnModalConcluir');
const btnModalReabrir = document.getElementById('btnModalReabrir');
const btnModalExcluir = document.getElementById('btnModalExcluir');

// QR Code
const qrCodeMainContainer = document.getElementById('qrCodeMainContainer');
const qrMainLinkInput = document.getElementById('qrMainLinkInput');
const btnMainCopyLink = document.getElementById('btnMainCopyLink');
const btnMainDownloadQr = document.getElementById('btnMainDownloadQr');

// Estado interno da View
let todosChamados = [];
let chamadoSelecionadoId = null;
let abaAtiva = 'chamados';

document.addEventListener('DOMContentLoaded', () => {
  inicializarAutenticacao();
  inicializarNavegacao();
  inicializarFiltros();
  inicializarEventosModal();
  inicializarQrCode();
});

function inicializarAutenticacao() {
  AuthController.observarSessao(
    (usuario) => {
      if (usuario && usuario.estaAutenticado()) {
        if (userEmailEl) userEmailEl.textContent = usuario.email;
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';
        iniciarSubscricaoChamados();
      } else {
        window.location.href = '../index.html';
      }
    },
    () => {
      window.location.href = '../index.html';
    }
  );

  btnLogout?.addEventListener('click', async () => {
    if (confirm('Deseja realmente encerrar a sessão administrativa?')) {
      await AuthController.logout();
      window.location.href = '../index.html';
    }
  });
}

function iniciarSubscricaoChamados() {
  ChamadoController.ouvirTodosChamados(
    (chamados) => {
      todosChamados = chamados;
      atualizarViews();
    },
    (erro) => {
      console.error('[AdminView] Erro ao escutar chamados:', erro);
    }
  );
}

function atualizarViews() {
  atualizarMetricas();
  renderizarTabelaAtivos();
  renderizarTabelaConcluidos();
}

function inicializarNavegacao() {
  navChamados?.addEventListener('click', () => mudarAba('chamados'));
  navChamadosConcluidos?.addEventListener('click', () => mudarAba('concluidos'));
  navQrCode?.addEventListener('click', () => mudarAba('qrcode'));
  btnTopbarQr?.addEventListener('click', () => mudarAba('qrcode'));
}

function mudarAba(nomeAba) {
  abaAtiva = nomeAba;
  [navChamados, navChamadosConcluidos, navQrCode].forEach(n => n?.classList.remove('active'));
  [viewChamados, viewChamadosConcluidos, viewQrCode].forEach(v => { if (v) v.style.display = 'none'; });

  if (nomeAba === 'chamados') {
    navChamados?.classList.add('active');
    if (viewChamados) viewChamados.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'Chamados Ativos';
    renderizarTabelaAtivos();
  } else if (nomeAba === 'concluidos') {
    navChamadosConcluidos?.classList.add('active');
    if (viewChamadosConcluidos) viewChamadosConcluidos.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'Chamados Finalizados';
    renderizarTabelaConcluidos();
  } else if (nomeAba === 'qrcode') {
    navQrCode?.classList.add('active');
    if (viewQrCode) viewQrCode.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'QR Code de Solicitação';
    gerarQrCodePrincipal();
  }
}

function inicializarFiltros() {
  [searchInput, filterStatus, filterPrioridade, filterSetor].forEach(el => {
    el?.addEventListener('input', () => renderizarTabelaAtivos());
  });

  [searchConcluidosInput, filterConcluidosStatus, filterConcluidosPrioridade, filterConcluidosSetor].forEach(el => {
    el?.addEventListener('input', () => renderizarTabelaConcluidos());
  });
}

function atualizarMetricas() {
  const ativos = todosChamados.filter(c => c.status === StatusEnum.PENDENTE || c.status === StatusEnum.EM_ANDAMENTO);
  const concluidos = todosChamados.filter(c => c.status === StatusEnum.CONCLUIDO || c.status === StatusEnum.CANCELADO);

  if (badgeAtivosCount) badgeAtivosCount.textContent = ativos.length;
  if (badgeConcluidosCount) badgeConcluidosCount.textContent = concluidos.length;

  if (countAtivosTotal) countAtivosTotal.textContent = ativos.length;
  if (countPendentes) countPendentes.textContent = ativos.filter(c => c.status === StatusEnum.PENDENTE).length;
  if (countAndamento) countAndamento.textContent = ativos.filter(c => c.status === StatusEnum.EM_ANDAMENTO).length;
  if (countUrgentes) countUrgentes.textContent = ativos.filter(c => c.prioridade === PrioridadeEnum.URGENTE).length;

  if (countConcluidosTotal) countConcluidosTotal.textContent = concluidos.length;
  if (countCancelados) countCancelados.textContent = concluidos.filter(c => c.status === StatusEnum.CANCELADO).length;

  // Concluídos hoje
  const hoje = new Date().toISOString().slice(0, 10);
  const hojeConcluidos = concluidos.filter(c => {
    const dataRef = c.concluidoEm || c.atualizadoEm;
    if (!dataRef) return false;
    const str = dataRef.toDate ? dataRef.toDate().toISOString() : String(dataRef);
    return str.startsWith(hoje);
  });
  if (countConcluidosHoje) countConcluidosHoje.textContent = hojeConcluidos.length;
}

function renderizarTabelaAtivos() {
  if (!chamadosTableBody) return;

  const termoBusca = (searchInput?.value || '').toLowerCase().trim();
  const statusFiltro = filterStatus?.value || 'todos';
  const prioFiltro = filterPrioridade?.value || 'todas';
  const setorFiltro = filterSetor?.value || 'todos';

  let filtrados = todosChamados.filter(c => c.status === StatusEnum.PENDENTE || c.status === StatusEnum.EM_ANDAMENTO);

  if (statusFiltro !== 'todos') filtrados = filtrados.filter(c => c.status === statusFiltro);
  if (prioFiltro !== 'todas') filtrados = filtrados.filter(c => c.prioridade === prioFiltro);
  if (setorFiltro !== 'todos') filtrados = filtrados.filter(c => c.setor === setorFiltro);

  if (termoBusca) {
    filtrados = filtrados.filter(c => 
      (c.protocolo && c.protocolo.toLowerCase().includes(termoBusca)) ||
      (c.solicitanteNome && c.solicitanteNome.toLowerCase().includes(termoBusca)) ||
      (c.salaNome && c.salaNome.toLowerCase().includes(termoBusca)) ||
      (c.descricao && c.descricao.toLowerCase().includes(termoBusca))
    );
  }

  chamadosTableBody.innerHTML = '';

  if (filtrados.length === 0) {
    chamadosTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          Nenhum chamado ativo encontrado com os critérios de filtro selecionados.
        </td>
      </tr>
    `;
    return;
  }

  filtrados.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: monospace; font-weight: 700; color: var(--text-muted);">${c.protocolo || '-'}</td>
      <td>
        <span class="badge badge-${c.status}">
          ${c.status === 'em_andamento' ? 'Em Andamento' : 'Pendente'}
        </span>
      </td>
      <td>
        <span class="badge badge-${c.prioridade}">
          ${c.prioridade.toUpperCase()}
        </span>
      </td>
      <td>
        <strong>${escapeHtml(c.salaNome || 'Local não informado')}</strong>
        <div style="font-size: 0.82rem; color: var(--text-muted); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(c.descricao)}
        </div>
      </td>
      <td>
        <div>${escapeHtml(c.solicitanteNome)}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(c.setor)}</div>
      </td>
      <td>${formatarDataHora(c.criadoEm)}</td>
      <td style="white-space: nowrap;">
        <button type="button" class="btn-table-action" data-action="detalhes" data-id="${c.id}">
          🔍 Detalhes
        </button>
        <button type="button" class="btn-quick-concluir" data-action="concluir" data-id="${c.id}" data-protocolo="${c.protocolo || ''}">
          ✓ Concluir
        </button>
      </td>
    `;
    chamadosTableBody.appendChild(tr);
  });

  adicionarEventosBotoesTabela(chamadosTableBody);
}

function renderizarTabelaConcluidos() {
  if (!chamadosConcluidosTableBody) return;

  const termoBusca = (searchConcluidosInput?.value || '').toLowerCase().trim();
  const statusFiltro = filterConcluidosStatus?.value || 'todos';
  const prioFiltro = filterConcluidosPrioridade?.value || 'todas';
  const setorFiltro = filterConcluidosSetor?.value || 'todos';

  let filtrados = todosChamados.filter(c => c.status === StatusEnum.CONCLUIDO || c.status === StatusEnum.CANCELADO);

  if (statusFiltro !== 'todos') filtrados = filtrados.filter(c => c.status === statusFiltro);
  if (prioFiltro !== 'todas') filtrados = filtrados.filter(c => c.prioridade === prioFiltro);
  if (setorFiltro !== 'todos') filtrados = filtrados.filter(c => c.setor === setorFiltro);

  if (termoBusca) {
    filtrados = filtrados.filter(c => 
      (c.protocolo && c.protocolo.toLowerCase().includes(termoBusca)) ||
      (c.solicitanteNome && c.solicitanteNome.toLowerCase().includes(termoBusca)) ||
      (c.salaNome && c.salaNome.toLowerCase().includes(termoBusca)) ||
      (c.descricao && c.descricao.toLowerCase().includes(termoBusca))
    );
  }

  chamadosConcluidosTableBody.innerHTML = '';

  if (filtrados.length === 0) {
    chamadosConcluidosTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          Nenhum chamado no histórico com os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  filtrados.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: monospace; font-weight: 700; color: var(--text-muted);">${c.protocolo || '-'}</td>
      <td>
        <span class="badge badge-${c.status}">
          ${c.status === 'concluido' ? 'Concluído' : 'Cancelado'}
        </span>
      </td>
      <td>
        <span class="badge badge-${c.prioridade}">
          ${c.prioridade.toUpperCase()}
        </span>
      </td>
      <td>
        <strong>${escapeHtml(c.salaNome || 'Local não informado')}</strong>
        <div style="font-size: 0.82rem; color: var(--text-muted); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(c.descricao)}
        </div>
      </td>
      <td>
        <div>${escapeHtml(c.solicitanteNome)}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(c.setor)}</div>
      </td>
      <td>${formatarDataHora(c.concluidoEm || c.atualizadoEm)}</td>
      <td style="white-space: nowrap;">
        <button type="button" class="btn-table-action" data-action="detalhes" data-id="${c.id}">
          🔍 Detalhes
        </button>
        <button type="button" class="btn-quick-reabrir" data-action="reabrir" data-id="${c.id}" data-protocolo="${c.protocolo || ''}">
          ↺ Reabrir
        </button>
      </td>
    `;
    chamadosConcluidosTableBody.appendChild(tr);
  });

  adicionarEventosBotoesTabela(chamadosConcluidosTableBody);
}

function adicionarEventosBotoesTabela(tbody) {
  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      const protocolo = btn.getAttribute('data-protocolo');

      if (action === 'detalhes') {
        abrirModalChamado(id);
      } else if (action === 'concluir') {
        const obs = prompt(`Conclusão rápida do chamado ${protocolo}:\nDigite observações da resolução (opcional):`) || '';
        await ChamadoController.concluirChamado(id, protocolo, obs);
      } else if (action === 'reabrir') {
        if (confirm(`Deseja reabrir o chamado ${protocolo}? Ele retornará aos chamados ativos.`)) {
          await ChamadoController.reabrirChamado(id, protocolo);
        }
      }
    });
  });
}

function inicializarEventosModal() {
  btnCloseModalChamado?.addEventListener('click', () => modalChamado?.classList.remove('active'));
  modalChamado?.addEventListener('click', (e) => {
    if (e.target === modalChamado) modalChamado.classList.remove('active');
  });

  btnSalvarStatus?.addEventListener('click', async () => {
    if (!chamadoSelecionadoId) return;
    const novoStatus = modalStatusSelect.value;
    const obs = modalAdminObservacao?.value.trim() || '';

    btnSalvarStatus.disabled = true;
    try {
      await ChamadoController.atualizarStatus(chamadoSelecionadoId, novoStatus, obs);
      modalChamado.classList.remove('active');
    } catch (err) {
      alert('Erro ao atualizar chamado: ' + err.message);
    } finally {
      btnSalvarStatus.disabled = false;
    }
  });

  btnModalConcluir?.addEventListener('click', async () => {
    if (!chamadoSelecionadoId) return;
    const obs = modalAdminObservacao?.value.trim() || '';
    if (!obs) {
      const confirma = confirm('Deseja concluir o chamado sem registrar detalhes da resolução técnica?');
      if (!confirma) {
        modalAdminObservacao?.focus();
        return;
      }
    }
    await ChamadoController.concluirChamado(chamadoSelecionadoId, '', obs);
    modalChamado.classList.remove('active');
  });

  btnModalReabrir?.addEventListener('click', async () => {
    if (!chamadoSelecionadoId) return;
    await ChamadoController.reabrirChamado(chamadoSelecionadoId);
    modalChamado.classList.remove('active');
  });

  btnModalExcluir?.addEventListener('click', async () => {
    if (!chamadoSelecionadoId) return;
    const chamado = todosChamados.find(c => c.id === chamadoSelecionadoId);
    if (!chamado) return;

    if (confirm(`Tem certeza que deseja excluir permanentemente o chamado ${chamado.protocolo}? Esta ação não pode ser desfeita.`)) {
      try {
        await ChamadoController.excluirChamado(chamado);
        modalChamado.classList.remove('active');
      } catch (err) {
        alert(err.message);
      }
    }
  });

  btnEditarObsAdmin?.addEventListener('click', () => {
    if (modalAdminObsViewSection) modalAdminObsViewSection.style.display = 'none';
    if (modalAdminObsEditSection) modalAdminObsEditSection.style.display = 'block';
    if (modalAdminObsEditActions) modalAdminObsEditActions.style.display = 'flex';
  });

  btnCancelarEdicaoObs?.addEventListener('click', () => {
    if (modalAdminObsEditSection) modalAdminObsEditSection.style.display = 'none';
    if (modalAdminObsEditActions) modalAdminObsEditActions.style.display = 'none';
    if (modalAdminObsViewSection) modalAdminObsViewSection.style.display = 'block';
  });

  btnSalvarEdicaoObs?.addEventListener('click', async () => {
    if (!chamadoSelecionadoId) return;
    const obs = modalAdminObservacao?.value.trim() || '';
    await ChamadoController.atualizarStatus(chamadoSelecionadoId, modalStatusSelect.value, obs);
    if (modalAdminObservacaoDisplay) modalAdminObservacaoDisplay.textContent = obs || 'Nenhuma observação registrada.';
    if (modalAdminObsEditSection) modalAdminObsEditSection.style.display = 'none';
    if (modalAdminObsEditActions) modalAdminObsEditActions.style.display = 'none';
    if (modalAdminObsViewSection) modalAdminObsViewSection.style.display = 'block';
  });
}

function abrirModalChamado(id) {
  const chamado = todosChamados.find(c => c.id === id);
  if (!chamado) return;

  chamadoSelecionadoId = id;
  if (modalProtocolo) modalProtocolo.textContent = chamado.protocolo || '-';
  if (modalSolicitante) modalSolicitante.textContent = chamado.solicitanteNome;
  if (modalSetor) modalSetor.textContent = chamado.setor;
  if (modalSala) modalSala.textContent = chamado.salaNome;
  if (modalAvisouGestor) modalAvisouGestor.textContent = chamado.avisouGestor ? 'Sim, já avisou' : 'Não avisou';
  
  if (modalPrioridadeBadge) {
    modalPrioridadeBadge.className = `badge badge-${chamado.prioridade}`;
    modalPrioridadeBadge.textContent = chamado.prioridade.toUpperCase();
  }

  if (modalDataAbertura) modalDataAbertura.innerHTML = formatarDataHora(chamado.criadoEm);
  if (modalDescricao) modalDescricao.textContent = chamado.descricao;
  if (modalObservacoes) modalObservacoes.textContent = chamado.observacoes || 'Nenhuma observação informada.';
  if (modalStatusSelect) modalStatusSelect.value = chamado.status;

  const isFinalizado = (chamado.status === StatusEnum.CONCLUIDO || chamado.status === StatusEnum.CANCELADO);
  if (modalDataFechamentoWrap) {
    modalDataFechamentoWrap.style.display = isFinalizado ? 'block' : 'none';
    if (modalDataFechamento) modalDataFechamento.innerHTML = formatarDataHora(chamado.concluidoEm || chamado.atualizadoEm);
  }

  if (modalAdminObservacao) modalAdminObservacao.value = chamado.observacaoResolucao || '';
  if (modalAdminObservacaoDisplay) {
    modalAdminObservacaoDisplay.textContent = chamado.observacaoResolucao || 'Nenhuma observação técnica registrada.';
  }

  if (isFinalizado) {
    if (modalAdminObsEditSection) modalAdminObsEditSection.style.display = 'none';
    if (modalAdminObsEditActions) modalAdminObsEditActions.style.display = 'none';
    if (modalAdminObsViewSection) modalAdminObsViewSection.style.display = 'block';
    if (btnModalConcluir) btnModalConcluir.style.display = 'none';
    if (btnModalReabrir) btnModalReabrir.style.display = 'inline-flex';
    if (btnModalExcluir) btnModalExcluir.style.display = 'inline-flex';
  } else {
    if (modalAdminObsEditSection) modalAdminObsEditSection.style.display = 'block';
    if (modalAdminObsEditActions) modalAdminObsEditActions.style.display = 'none';
    if (modalAdminObsViewSection) modalAdminObsViewSection.style.display = 'none';
    if (btnModalConcluir) btnModalConcluir.style.display = 'inline-flex';
    if (btnModalReabrir) btnModalReabrir.style.display = 'none';
    if (btnModalExcluir) btnModalExcluir.style.display = 'none';
  }

  if (chamado.fotoUrl && modalPhotoImg && modalPhotoWrap) {
    modalPhotoImg.src = chamado.fotoUrl;
    if (modalPhotoLink) modalPhotoLink.href = chamado.fotoUrl;
    modalPhotoWrap.style.display = 'block';
  } else if (modalPhotoWrap) {
    modalPhotoWrap.style.display = 'none';
  }

  modalChamado?.classList.add('active');
}

function inicializarQrCode() {
  btnMainCopyLink?.addEventListener('click', () => {
    if (!qrMainLinkInput) return;
    qrMainLinkInput.select();
    navigator.clipboard.writeText(qrMainLinkInput.value).then(() => {
      const orig = btnMainCopyLink.textContent;
      btnMainCopyLink.textContent = '✅ Copiado!';
      setTimeout(() => { btnMainCopyLink.textContent = orig; }, 2000);
    });
  });

  btnMainDownloadQr?.addEventListener('click', () => {
    const canvas = qrCodeMainContainer?.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'qrcode-solicitar-manutencao.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  });
}

function gerarQrCodePrincipal() {
  const urlAtual = window.location.href;
  const urlDestino = urlAtual.replace(/\/admin\/?(index\.html)?$/, '/solicitar/index.html');

  if (qrMainLinkInput) qrMainLinkInput.value = urlDestino;
  if (qrCodeMainContainer) qrCodeMainContainer.innerHTML = '';

  if (window.QRCode && qrCodeMainContainer) {
    new QRCode(qrCodeMainContainer, {
      text: urlDestino,
      width: 220,
      height: 220,
      colorDark: "#1e293b",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }
}

function formatarDataHora(ts) {
  if (!ts) return '-';
  let d;
  if (ts.toDate) d = ts.toDate();
  else if (typeof ts === 'string') d = new Date(ts);
  else if (ts.seconds) d = new Date(ts.seconds * 1000);
  else d = new Date();

  const dataStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const horaStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `<span style="font-weight:600;">${dataStr}</span> <span style="font-size:0.8rem; color:var(--text-muted);">${horaStr}</span>`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
