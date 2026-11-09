/**
 * ============================================================================
 * Camada de Controlador: ChamadoController
 * Arquitetura MVC - Backend / Controllers
 * ============================================================================
 * Responsabilidade:
 * - Orquestrar o fluxo de abertura, consulta e atualização de chamados.
 * - Integrar o ChamadoModel com os serviços de persistência (Firebase Firestore)
 *   e compressão de imagens.
 * - Executar regras de negócio e validações de fluxo operacional.
 */

import { 
  db, 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  isConfigured 
} from '../services/firebaseService.js';
import { ChamadoModel, StatusEnum, PrioridadeEnum } from '../models/ChamadoModel.js';
import { compressImageToBase64 } from '../services/imageCompressorService.js';

export class ChamadoController {
  /**
   * Registra um novo chamado no sistema.
   * Valida os dados, processa e comprime a foto (se fornecida) e salva no Firestore.
   * 
   * @param {Object} dadosFormulario 
   * @param {File|null} fotoArquivo 
   * @returns {Promise<{ sucesso: boolean, protocolo: string, chamado: ChamadoModel }>}
   */
  static async criarChamado(dadosFormulario, fotoArquivo = null) {
    // 1. Campo Local (Controller):
    // Garante que a validação no Controller impeça o envio se este campo estiver em branco
    const valorLocal = dadosFormulario?.local_id ?? dadosFormulario?.salaNome;
    const salaNomeLimpo = valorLocal ? String(valorLocal).trim() : '';
    if (!salaNomeLimpo) {
      throw new Error('A identificação da sala ou local é obrigatória e não pode estar em branco.');
    }

    let fotoBase64 = '';
    
    // Processamento otimizado de foto client-side se existir
    if (fotoArquivo) {
      const compressao = await compressImageToBase64(fotoArquivo, 1024, 1024, 0.7);
      fotoBase64 = compressao.base64;
    } else if (dadosFormulario.fotoBase64Previa) {
      fotoBase64 = dadosFormulario.fotoBase64Previa;
    }

    const chamado = new ChamadoModel({
      solicitanteNome: dadosFormulario.solicitanteNome,
      setor: dadosFormulario.setor,
      avisouGestor: dadosFormulario.avisouGestor,
      prioridade: dadosFormulario.prioridade,
      salaNome: salaNomeLimpo,
      descricao: dadosFormulario.descricao,
      observacoes: dadosFormulario.observacoes || '',
      fotoUrl: fotoBase64,
      temFoto: Boolean(fotoBase64),
      status: StatusEnum.PENDENTE,
      criadoEm: isConfigured() ? serverTimestamp() : new Date().toISOString(),
      atualizadoEm: isConfigured() ? serverTimestamp() : new Date().toISOString(),
      historicoStatus: [
        {
          status: StatusEnum.PENDENTE,
          data: new Date().toISOString(),
          responsavel: 'Solicitante via Formulário Web'
        }
      ]
    });

    // Validação de integridade do modelo
    chamado.validar();

    if (isConfigured()) {
      const docRef = await addDoc(collection(db, 'chamados'), chamado.toFirestore());
      chamado.id = docRef.id;
      console.log(`[ChamadoController] Chamado gravado com sucesso no Firestore (Protocolo: ${chamado.protocolo}, ID: ${chamado.id})`);
    } else {
      // Modo Demonstração / Fallback local seguro
      chamado.id = 'demo-' + Date.now();
      const mockList = ChamadoController._obterListaDemo();
      mockList.unshift({ id: chamado.id, ...chamado.toFirestore() });
      localStorage.setItem('demo_chamados', JSON.stringify(mockList));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('chamados_atualizados'));
      }
    }

    return {
      sucesso: true,
      protocolo: chamado.protocolo,
      chamado
    };
  }

  /**
   * Escuta em tempo real os chamados ativos (pendentes e em andamento).
   * Utiliza o listener reativo onSnapshot() do Firebase para que telas como o Painel TV
   * reajam automaticamente sem necessidade de consultas estáticas (getDocs).
   * 
   * @param {Function} onUpdate Callback que recebe a lista ordenada de ChamadoModel e changes
   * @param {Function} onError Callback de erro
   * @returns {Function} Função para cancelar a subscrição (unsubscribe)
   */
  static ouvirChamadosAtivos(onUpdate, onError) {
    if (!isConfigured()) {
      const emitir = () => {
        const mockList = ChamadoController._obterListaDemo()
          .filter(c => c.status === StatusEnum.PENDENTE || c.status === StatusEnum.EM_ANDAMENTO)
          .map(c => ChamadoModel.fromFirestore(c.id, c));
        onUpdate(mockList, []);
      };
      emitir();

      const storageHandler = () => emitir();
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', storageHandler);
        window.addEventListener('chamados_atualizados', storageHandler);
      }
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage', storageHandler);
          window.removeEventListener('chamados_atualizados', storageHandler);
        }
      };
    }

    const chamadosRef = collection(db, 'chamados');
    // Consulta reativa em tempo real com onSnapshot() (substituindo qualquer consulta estática getDocs)
    const q = query(
      chamadosRef,
      where('status', 'in', [StatusEnum.PENDENTE, StatusEnum.EM_ANDAMENTO])
    );

    return onSnapshot(q, (snapshot) => {
      const chamados = [];
      snapshot.forEach(docSnap => {
        chamados.push(ChamadoModel.fromFirestore(docSnap.id, docSnap.data()));
      });

      // Ordenação: Urgentes > Importantes > Rotina; e data decrescente
      const pesoPrioridade = { [PrioridadeEnum.URGENTE]: 1, [PrioridadeEnum.IMPORTANTE]: 2, [PrioridadeEnum.ROTINA]: 3 };
      chamados.sort((a, b) => {
        const pesoA = pesoPrioridade[a.prioridade] || 4;
        const pesoB = pesoPrioridade[b.prioridade] || 4;
        if (pesoA !== pesoB) return pesoA - pesoB;

        const dataA = a.criadoEm?.toDate ? a.criadoEm.toDate() : new Date(a.criadoEm || 0);
        const dataB = b.criadoEm?.toDate ? b.criadoEm.toDate() : new Date(b.criadoEm || 0);
        return dataB - dataA;
      });

      onUpdate(chamados, snapshot.docChanges());
    }, (erro) => {
      console.error('[ChamadoController] Erro no listener onSnapshot() de chamados ativos:', erro);
      if (typeof onError === 'function') onError(erro);
    });
  }

  /**
   * Escuta todos os chamados para o painel administrativo.
   * 
   * @param {Function} onUpdate 
   * @param {Function} onError 
   * @returns {Function}
   */
  static ouvirTodosChamados(onUpdate, onError) {
    if (!isConfigured()) {
      const mockList = ChamadoController._obterListaDemo().map(c => ChamadoModel.fromFirestore(c.id, c));
      onUpdate(mockList, []);
      return () => {};
    }

    const chamadosRef = collection(db, 'chamados');
    const q = query(chamadosRef, orderBy('criadoEm', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const chamados = [];
      snapshot.forEach(docSnap => {
        chamados.push(ChamadoModel.fromFirestore(docSnap.id, docSnap.data()));
      });
      onUpdate(chamados, snapshot.docChanges());
    }, onError);
  }

  /**
   * Atualiza o status e/ou observação de resolução de um chamado.
   * 
   * @param {string} id 
   * @param {string} novoStatus 
   * @param {string} observacaoResolucao 
   */
  static async atualizarStatus(id, novoStatus, observacaoResolucao = '') {
    if (!id) throw new Error('ID do chamado é obrigatório.');

    const updatePayload = {
      status: novoStatus,
      atualizadoEm: isConfigured() ? serverTimestamp() : new Date().toISOString()
    };

    if (observacaoResolucao) {
      updatePayload.observacaoResolucao = observacaoResolucao;
    }

    if (novoStatus === StatusEnum.CONCLUIDO) {
      updatePayload.concluidoEm = isConfigured() ? serverTimestamp() : new Date().toISOString();
    }

    if (isConfigured()) {
      const chamadoRef = doc(db, 'chamados', id);
      await updateDoc(chamadoRef, updatePayload);
    } else {
      const mockList = ChamadoController._obterListaDemo();
      const item = mockList.find(c => c.id === id);
      if (item) {
        Object.assign(item, updatePayload);
        localStorage.setItem('demo_chamados', JSON.stringify(mockList));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('chamados_atualizados'));
        }
      }
    }

    return true;
  }

  /**
   * Conclui um chamado registrando observações de resolução.
   * 
   * @param {string} id 
   * @param {string} protocolo 
   * @param {string} observacaoResolucao 
   */
  static async concluirChamado(id, protocolo = '', observacaoResolucao = '') {
    return this.atualizarStatus(id, StatusEnum.CONCLUIDO, observacaoResolucao);
  }

  /**
   * Reabre um chamado previamente concluído ou cancelado.
   * 
   * @param {string} id 
   * @param {string} protocolo 
   */
  static async reabrirChamado(id, protocolo = '') {
    return this.atualizarStatus(id, StatusEnum.PENDENTE, '');
  }

  /**
   * Exclusão permanente com trava de segurança de negócio:
   * Apenas chamados finalizados (concluídos ou cancelados) podem ser excluídos.
   * 
   * @param {ChamadoModel} chamado 
   */
  static async excluirChamado(chamado) {
    if (!chamado || !chamado.id) {
      throw new Error('Chamado inválido para exclusão.');
    }

    // Regra de Negócio: Impede exclusão acidental de chamados operacionais ativos
    if (chamado.status !== StatusEnum.CONCLUIDO && chamado.status !== StatusEnum.CANCELADO) {
      throw new Error('Regra de Negócio violada: apenas chamados finalizados podem ser excluídos do histórico.');
    }

    if (isConfigured()) {
      const chamadoRef = doc(db, 'chamados', chamado.id);
      await deleteDoc(chamadoRef);
    } else {
      let mockList = ChamadoController._obterListaDemo();
      mockList = mockList.filter(c => c.id !== chamado.id);
      localStorage.setItem('demo_chamados', JSON.stringify(mockList));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('chamados_atualizados'));
      }
    }

    return true;
  }

  /**
   * Recupera lista demo do localStorage.
   * @private
   */
  static _obterListaDemo() {
    try {
      return JSON.parse(localStorage.getItem('demo_chamados') || '[]');
    } catch {
      return [];
    }
  }
}
