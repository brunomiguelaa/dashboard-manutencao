/**
 * ============================================================================
 * Camada de Modelo: AuthModel (Sessão e Identidade)
 * Arquitetura MVC - Backend / Models
 * ============================================================================
 * Responsabilidade:
 * - Representar o usuário autenticado e suas permissões no sistema.
 * - Manter o estado da sessão ativo e encapsular verificações de acesso.
 */

export class AuthModel {
  constructor({ uid = null, email = '', displayName = '', perfil = 'operacional' } = {}) {
    this.uid = uid;
    this.email = email;
    this.displayName = displayName || email.split('@')[0] || 'Usuário';
    this.perfil = perfil;
    this.autenticadoEm = new Date().toISOString();
  }

  /**
   * Verifica se o usuário possui sessão válida ativa.
   * @returns {boolean}
   */
  estaAutenticado() {
    return Boolean(this.uid || this.email);
  }

  /**
   * Valida permissão para operações restritas (ex: exclusão de registros).
   * @returns {boolean}
   */
  possuiPermissaoAdmin() {
    return this.estaAutenticado();
  }

  /**
   * Converte o estado para armazenamento seguro de sessão (LocalStorage ou SessionStorage).
   * @returns {Object}
   */
  toJSON() {
    return {
      uid: this.uid,
      email: this.email,
      displayName: this.displayName,
      perfil: this.perfil,
      autenticadoEm: this.autenticadoEm
    };
  }
}
