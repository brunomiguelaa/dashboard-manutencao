/**
 * ============================================================================
 * Camada de Controlador: TvController
 * Arquitetura MVC - Backend / Controllers
 * ============================================================================
 * Responsabilidade:
 * - Orquestrar o fluxo de dados em tempo real para o painel de TV operacional.
 * - Gerenciar notificações sonoras com sintetizador Web Audio API.
 * - Calcular indicadores e tempos relativos em tempo real.
 */

import { ChamadoController } from './ChamadoController.js';
import { PrioridadeEnum } from '../models/ChamadoModel.js';

export class TvController {
  constructor({ onDataUpdate = () => {}, onStatusUpdate = () => {} } = {}) {
    this.onDataUpdate = onDataUpdate;
    this.onStatusUpdate = onStatusUpdate;
    this.audioCtx = null;
    this.isFirstLoad = true;
    this.unsubscribe = null;
  }

  /**
   * Inicializa a subscrição e listeners de tempo real.
   */
  iniciar() {
    this.unsubscribe = ChamadoController.ouvirChamadosAtivos(
      (chamados, changes) => {
        // Disparar som de alerta para chamados recém-chegados
        if (!this.isFirstLoad && Array.isArray(changes)) {
          changes.forEach(change => {
            if (change.type === 'added') {
              const dados = change.doc ? change.doc.data() : null;
              const isUrgente = dados?.prioridade === PrioridadeEnum.URGENTE;
              this.tocarAlarme(isUrgente);
            }
          });
        }
        this.isFirstLoad = false;

        const metrics = {
          total: chamados.length,
          urgentes: chamados.filter(c => c.prioridade === PrioridadeEnum.URGENTE).length,
          andamento: chamados.filter(c => c.status === 'em_andamento').length
        };

        this.onDataUpdate(chamados, metrics);
      },
      (erro) => {
        console.error('[TvController] Erro na subscrição em tempo real:', erro);
        this.onStatusUpdate('Falha na conexão com Firestore');
      }
    );
  }

  /**
   * Encerra a subscrição em tempo real.
   */
  parar() {
    if (typeof this.unsubscribe === 'function') {
      this.unsubscribe();
    }
  }

  /**
   * Desbloqueia o contexto de áudio do navegador em resposta a interação do usuário.
   */
  desbloquearAudio() {
    if (!this.audioCtx) {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (AudioClass) {
        this.audioCtx = new AudioClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Sintetizador sonoro sem dependência de arquivos externos (Web Audio API pura).
   * 
   * @param {boolean} isUrgente 
   */
  tocarAlarme(isUrgente = false) {
    try {
      this.desbloquearAudio();
      if (!this.audioCtx) return;

      const ctx = this.audioCtx;
      if (isUrgente) {
        // Alarme urgente: Tom duplo incisivo (Sawtooth A5 -> D6)
        const playUrgentTone = (freq, start, dur) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
          gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + dur);
        };
        playUrgentTone(880, 0, 0.25);
        playUrgentTone(1174.66, 0.3, 0.45);
      } else {
        // Notificação de rotina: Acorde harmônico suave (Sine C5 -> E5 -> G5)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (e) {
      console.warn('[TvController] Áudio bloqueado pelo navegador até interação do usuário:', e);
    }
  }

  /**
   * Formata timestamp para notação de tempo relativo amigável.
   * 
   * @param {*} timestamp 
   * @returns {string}
   */
  static formatarTempoRelativo(timestamp) {
    if (!timestamp) return 'pouco tempo';
    let data;
    if (timestamp.toDate) {
      data = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
      data = new Date(timestamp);
    } else if (timestamp.seconds) {
      data = new Date(timestamp.seconds * 1000);
    } else {
      data = new Date();
    }

    const diffMs = Date.now() - data.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);

    if (diffMin < 1) return 'menos de 1 min';
    if (diffMin < 60) return `${diffMin} min`;
    if (diffHoras === 1) return '1 hora';
    if (diffHoras < 24) return `${diffHoras} horas`;
    return `${Math.floor(diffHoras / 24)} dias`;
  }
}
