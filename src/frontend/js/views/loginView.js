/**
 * ============================================================================
 * Camada de Visão: LoginView
 * Arquitetura MVC - Frontend / Views
 * ============================================================================
 * Responsabilidade:
 * - Manipulação exclusiva do DOM na tela de login administrativo.
 * - Capturar eventos de submissão do formulário e delegar ao AuthController.
 * - Exibir estados de carregamento e mensagens de erro de autenticação.
 */

import { AuthController } from '../../../backend/controllers/AuthController.js';

// Elementos do DOM
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const btnLogin = document.getElementById('btnLogin');
const btnLoginText = document.getElementById('btnLoginText');
const btnLoginSpinner = document.getElementById('btnLoginSpinner');
const authError = document.getElementById('authError');

// Observador de rota: se já houver sessão ativa, redireciona ao painel
AuthController.observarSessao(
  (usuario) => {
    if (usuario && usuario.estaAutenticado()) {
      window.location.href = 'admin/index.html';
    }
  },
  () => {
    // Permanece na tela de login
  }
);

// Evento de submissão do formulário
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    esconderErro();

    if (!email || !password) {
      exibirErro('Por favor, informe suas credenciais corporativas completas.');
      return;
    }

    definirCarregando(true);

    try {
      await AuthController.login(email, password);
      window.location.href = 'admin/index.html';
    } catch (error) {
      console.error('[LoginView] Falha de autenticação:', error);
      let mensagem = 'Credenciais incorretas ou acesso não autorizado.';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        mensagem = 'E-mail ou senha incorretos. Verifique os dados digitados.';
      } else if (error.code === 'auth/too-many-requests') {
        mensagem = 'Limite de tentativas excedido temporariamente. Tente novamente mais tarde.';
      } else if (error.code === 'auth/invalid-email') {
        mensagem = 'Formato de e-mail corporativo inválido.';
      } else if (error.message) {
        mensagem = error.message;
      }
      
      exibirErro(mensagem);
    } finally {
      definirCarregando(false);
    }
  });
}

function exibirErro(mensagem) {
  if (authError) {
    authError.textContent = mensagem;
    authError.style.display = 'block';
  }
}

function esconderErro() {
  if (authError) {
    authError.style.display = 'none';
  }
}

function definirCarregando(carregando) {
  if (!btnLogin) return;
  btnLogin.disabled = carregando;
  if (carregando) {
    if (btnLoginText) btnLoginText.textContent = 'Autenticando...';
    if (btnLoginSpinner) btnLoginSpinner.style.display = 'inline-block';
  } else {
    if (btnLoginText) btnLoginText.textContent = 'Acessar Painel de Manutenção';
    if (btnLoginSpinner) btnLoginSpinner.style.display = 'none';
  }
}
