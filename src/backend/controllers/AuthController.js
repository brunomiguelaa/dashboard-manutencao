/**
 * ============================================================================
 * Camada de Controlador: AuthController
 * Arquitetura MVC - Backend / Controllers
 * ============================================================================
 * Responsabilidade:
 * - Gerenciar ciclo de vida da autenticação e proteção de rotas restritas.
 * - Integrar com Firebase Authentication e modo de demonstração.
 */

import { 
  auth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  isConfigured 
} from '../services/firebaseService.js';
import { AuthModel } from '../models/AuthModel.js';

export class AuthController {
  /**
   * Realiza autenticação com e-mail e senha corporativos.
   * 
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<AuthModel>}
   */
  static async login(email, password) {
    const emailLimpo = String(email).trim();
    if (!emailLimpo || !password) {
      throw new Error('E-mail e senha são obrigatórios.');
    }

    if (isConfigured()) {
      const userCredential = await signInWithEmailAndPassword(auth, emailLimpo, password);
      const user = userCredential.user;
      return new AuthModel({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || emailLimpo.split('@')[0]
      });
    } else {
      // Modo Demonstração
      localStorage.setItem('demo_logged_in', 'true');
      localStorage.setItem('demo_user_email', emailLimpo);
      return new AuthModel({
        uid: 'demo-admin-uid',
        email: emailLimpo,
        displayName: 'Administrador Demo'
      });
    }
  }

  /**
   * Encerra a sessão ativa do usuário.
   */
  static async logout() {
    if (isConfigured()) {
      await signOut(auth);
    } else {
      localStorage.removeItem('demo_logged_in');
      localStorage.removeItem('demo_user_email');
    }
  }

  /**
   * Monitora alterações no estado de autenticação (Guarda de Rota).
   * 
   * @param {Function} onAuthenticated Callback quando há usuário válido
   * @param {Function} onUnauthenticated Callback quando não autenticado
   * @returns {Function} Unsubscribe listener
   */
  static observarSessao(onAuthenticated, onUnauthenticated) {
    if (!isConfigured()) {
      const isDemoLoggedIn = localStorage.getItem('demo_logged_in') === 'true';
      if (isDemoLoggedIn) {
        const email = localStorage.getItem('demo_user_email') || 'admin@instituicao.demo';
        onAuthenticated(new AuthModel({
          uid: 'demo-uid',
          email,
          displayName: 'Administrador de Manutenção'
        }));
      } else {
        onUnauthenticated();
      }
      return () => {};
    }

    return onAuthStateChanged(auth, (user) => {
      if (user) {
        onAuthenticated(new AuthModel({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0]
        }));
      } else {
        onUnauthenticated();
      }
    });
  }
}
