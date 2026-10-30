/**
 * ============================================================================
 * Camada de Visão: TvView
 * Arquitetura MVC - Frontend / Views
 * ============================================================================
 * Responsabilidade:
 * - Manipulação do DOM no painel em tempo real para TV/Monitor operacional.
 * - Renderização responsiva dos cards de chamados ativos.
 * - Gestão do relógio digital e alternância de modo tela cheia.
 * - Integração e orquestração através do TvController.
 */

import { TvController } from '../../../backend/controllers/TvController.js';

// Elementos do DOM
const tvGrid = document.getElementById('tvGrid');
const countUrgentPill = document.getElementById('countUrgentPill');
const countAndamentoPill = document.getElementById('countAndamentoPill');
const countTotalPill = document.getElementById('countTotalPill');
const clockTime = document.getElementById('clockTime');
const clockDate = document.getElementById('clockDate');
const btnFullscreen = document.getElementById('btnFullscreen');
const btnTestSoundTv = document.getElementById('btnTestSoundTv');
const connectionIndicator = document.getElementById('connectionIndicator');

// Instanciação do TvController
const tvController = new TvController({
  onDataUpdate: (chamados, metricas) => {
    atualizarPills(metricas);
    renderizarGrid(chamados);
  },
  onStatusUpdate: (statusTexto) => {
    if (connectionIndicator) connectionIndicator.textContent = statusTexto;
  }
});

document.addEventListener('DOMContentLoaded', () => {
  iniciarRelogio();
  inicializarTelaCheia();
  inicializarSomTeste();
  
  // Desbloqueia áudio ao interagir com a tela da TV
  window.addEventListener('click', () => tvController.desbloquearAudio(), { once: false });
  window.addEventListener('keydown', () => tvController.desbloquearAudio(), { once: false });

  tvController.iniciar();
});

function iniciarRelogio() {
  const atualizar = () => {
    const agora = new Date();
    if (clockTime) clockTime.textContent = agora.toLocaleTimeString('pt-BR', { hour12: false });
    if (clockDate) {
      clockDate.textContent = agora.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };
  atualizar();
  setInterval(atualizar, 1000);
}

function atualizarPills(metricas) {
  if (countUrgentPill) countUrgentPill.textContent = `${metricas.urgentes} Urgentes`;
  if (countAndamentoPill) countAndamentoPill.textContent = `${metricas.andamento} Em Andamento`;
  if (countTotalPill) countTotalPill.textContent = `${metricas.total} Ativos`;
}

function renderizarGrid(chamados) {
  if (!tvGrid) return;
  tvGrid.innerHTML = '';

  if (chamados.length === 0) {
    tvGrid.innerHTML = `
      <div class="tv-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 72px; height: 72px; margin-bottom: 1.25rem; color: #0284c7;">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <h2>Nenhum chamado pendente no momento</h2>
        <p>Todos os serviços de manutenção predial e infraestrutura estão em dia.</p>
      </div>
    `;
    return;
  }

  chamados.forEach(c => {
    const card = document.createElement('div');
    card.className = `tv-card ${c.prioridade}`;

    const tempoAtras = TvController.formatarTempoRelativo(c.criadoEm);

    card.innerHTML = `
      <div>
        <div class="tv-card-top">
          <span class="tv-protocol">${c.protocolo || ''}</span>
          <span class="tv-badge ${c.prioridade}">${c.prioridade}</span>
        </div>

        <div class="tv-room">
          ${escapeHtml(c.salaNome || 'Local não informado')}
          ${(c.fotoUrl || c.temFoto) ? '<span title="Possui foto anexada" style="font-size: 0.85rem; margin-left: 6px;">📷</span>' : ''}
        </div>
        <div class="tv-desc">${escapeHtml(c.descricao)}</div>
      </div>

      <div class="tv-card-bottom">
        <div class="tv-solicitante">
          <strong>${escapeHtml(c.solicitanteNome)}</strong> • ${escapeHtml(c.setor)}
          <div style="font-size: 0.78rem; color: var(--text-dim); margin-top: 2px;">Aberto há ${tempoAtras}</div>
        </div>

        <div class="tv-status-tag ${c.status === 'em_andamento' ? 'andamento' : 'pendente'}">
          <span class="status-dot"></span>
          <span>${c.status === 'em_andamento' ? 'Em Andamento' : 'Pendente'}</span>
        </div>
      </div>
    `;

    tvGrid.appendChild(card);
  });
}

function inicializarSomTeste() {
  btnTestSoundTv?.addEventListener('click', () => {
    const orig = btnTestSoundTv.innerHTML;
    btnTestSoundTv.innerHTML = '<span>🔊 Tocando...</span>';
    btnTestSoundTv.style.pointerEvents = 'none';

    tvController.tocarAlarme(false);
    setTimeout(() => tvController.tocarAlarme(true), 700);

    setTimeout(() => {
      btnTestSoundTv.innerHTML = orig;
      btnTestSoundTv.style.pointerEvents = 'auto';
    }, 1600);
  });
}

function inicializarTelaCheia() {
  btnFullscreen?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        alert(`Falha ao ativar tela cheia: ${err.message}`);
      });
      btnFullscreen.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
        </svg>
        <span>Sair da Tela Cheia</span>
      `;
    } else {
      document.exitFullscreen();
      btnFullscreen.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
        <span>Tela Cheia</span>
      `;
    }
  });
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
