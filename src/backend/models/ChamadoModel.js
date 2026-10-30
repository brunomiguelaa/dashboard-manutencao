/**
 * ============================================================================
 * Camada de Modelo: ChamadoModel (Entidade de Negócio)
 * Arquitetura MVC - Backend / Models
 * ============================================================================
 * Responsabilidade:
 * - Representar o domínio do chamado de manutenção.
 * - Validar campos obrigatórios e integridade das regras de negócio.
 * - Gerar identificadores únicos padronizados (Protocolo MAN-YYYYMM-XXXX).
 * - Garantir a consistência das transições de status (Máquina de Estados).
 */

export const PrioridadeEnum = Object.freeze({
  URGENTE: 'urgente',
  IMPORTANTE: 'importante',
  ROTINA: 'rotina'
});

export const StatusEnum = Object.freeze({
  PENDENTE: 'pendente',
  EM_ANDAMENTO: 'em_andamento',
  CONCLUIDO: 'concluido',
  CANCELADO: 'cancelado'
});

export class ChamadoModel {
  /**
   * @param {Object} props
   */
  constructor({
    id = null,
    protocolo = null,
    solicitanteNome = '',
    setor = '',
    avisouGestor = false,
    prioridade = PrioridadeEnum.ROTINA,
    salaNome = '',
    salaId = null,
    descricao = '',
    observacoes = '',
    observacaoResolucao = '',
    fotoUrl = '',
    temFoto = false,
    status = StatusEnum.PENDENTE,
    criadoEm = null,
    atualizadoEm = null,
    concluidoEm = null,
    historicoStatus = []
  } = {}) {
    this.id = id;
    this.protocolo = protocolo || ChamadoModel.gerarProtocolo();
    this.solicitanteNome = String(solicitanteNome).trim();
    this.setor = String(setor).trim();
    this.avisouGestor = Boolean(avisouGestor);
    this.prioridade = this._validarPrioridade(prioridade);
    this.salaNome = String(salaNome).trim();
    this.salaId = salaId || this.salaNome;
    this.descricao = String(descricao).trim();
    this.observacoes = String(observacoes).trim();
    this.observacaoResolucao = String(observacaoResolucao).trim();
    this.fotoUrl = fotoUrl || '';
    this.temFoto = Boolean(temFoto || fotoUrl);
    this.status = this._validarStatus(status);
    this.criadoEm = criadoEm;
    this.atualizadoEm = atualizadoEm;
    this.concluidoEm = concluidoEm;
    this.historicoStatus = Array.isArray(historicoStatus) ? historicoStatus : [];
  }

  /**
   * Gera o protocolo padronizado no formato: MAN-YYYYMM-XXXX
   * @returns {string}
   */
  static gerarProtocolo() {
    const data = new Date();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const aleatorioHex = Math.random().toString(16).substring(2, 6).toUpperCase();
    return `MAN-${ano}${mes}-${aleatorioHex}`;
  }

  /**
   * Validação estrita das regras de negócio do modelo.
   * @throws {Error} se algum campo for inválido
   */
  validar() {
    const erros = [];

    if (!this.solicitanteNome || this.solicitanteNome.length < 3) {
      erros.push('O nome do solicitante é obrigatório e deve ter ao menos 3 caracteres.');
    }
    if (!this.setor) {
      erros.push('O setor do solicitante deve ser informado.');
    }
    if (!this.salaNome) {
      erros.push('A identificação da sala ou local é obrigatória.');
    }
    if (!this.descricao || this.descricao.length < 5) {
      erros.push('A descrição detalhada do problema deve ter pelo menos 5 caracteres.');
    }
    if (!Object.values(PrioridadeEnum).includes(this.prioridade)) {
      erros.push(`Prioridade inválida: ${this.prioridade}.`);
    }
    if (!Object.values(StatusEnum).includes(this.status)) {
      erros.push(`Status inválido: ${this.status}.`);
    }

    if (erros.length > 0) {
      const err = new Error(erros.join(' '));
      err.validationErrors = erros;
      throw err;
    }

    return true;
  }

  /**
   * Valida se a prioridade informada é suportada.
   * @private
   */
  _validarPrioridade(prio) {
    const valor = String(prio).toLowerCase();
    return Object.values(PrioridadeEnum).includes(valor) ? valor : PrioridadeEnum.ROTINA;
  }

  /**
   * Valida se o status informado é suportado.
   * @private
   */
  _validarStatus(st) {
    const valor = String(st).toLowerCase();
    return Object.values(StatusEnum).includes(valor) ? valor : StatusEnum.PENDENTE;
  }

  /**
   * Aplica transição de status com validação de ciclo de vida.
   * @param {string} novoStatus 
   * @param {string} responsavel 
   * @param {string} observacao 
   */
  mudarStatus(novoStatus, responsavel = 'Equipe Técnica', observacao = '') {
    if (!Object.values(StatusEnum).includes(novoStatus)) {
      throw new Error(`Status de destino inválido: ${novoStatus}`);
    }

    this.status = novoStatus;
    if (observacao) {
      this.observacaoResolucao = observacao;
    }

    this.historicoStatus.push({
      status: novoStatus,
      data: new Date().toISOString(),
      responsavel,
      observacao: observacao || null
    });
  }

  /**
   * Converte a instância para objeto plano serializável para persistência.
   * @returns {Object}
   */
  toFirestore() {
    return {
      protocolo: this.protocolo,
      solicitanteNome: this.solicitanteNome,
      setor: this.setor,
      avisouGestor: this.avisouGestor,
      prioridade: this.prioridade,
      salaNome: this.salaNome,
      salaId: this.salaId,
      descricao: this.descricao,
      observacoes: this.observacoes,
      observacaoResolucao: this.observacaoResolucao,
      fotoUrl: this.fotoUrl,
      temFoto: this.temFoto,
      status: this.status,
      criadoEm: this.criadoEm,
      atualizadoEm: this.atualizadoEm,
      concluidoEm: this.concluidoEm,
      historicoStatus: this.historicoStatus
    };
  }

  /**
   * Reconstrói uma instância a partir de dados do banco.
   * @param {string} id 
   * @param {Object} data 
   * @returns {ChamadoModel}
   */
  static fromFirestore(id, data = {}) {
    return new ChamadoModel({
      id,
      ...data
    });
  }
}
