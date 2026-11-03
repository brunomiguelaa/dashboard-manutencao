# 🚀 Manual de Implantação e Configuração

Este guia descreve os procedimentos completos para executar localmente e publicar o **Sistema de Chamados de Manutenção** em ambiente de produção utilizando a cota gratuita (Spark Plan) do Google Firebase.

---

## 1. Pré-Requisitos

- **Navegador Moderno:** Chrome, Edge, Firefox ou Safari (com suporte a ES Modules nativos).
- **Node.js (Opcional, para testes e servidor estático):** v18+ recomendado.
- **Conta no Google Firebase (Opcional para modo com persistência remota):** Gratuita (Spark Plan).

---

## 2. Execução Local

Como a aplicação é construída com **HTML5, CSS3 e JavaScript Moderno (ES Modules)**, basta utilizar qualquer servidor web estático.

### Opção A: Executar via Node.js (`npx serve`)
Na raiz do projeto, execute no terminal:
```bash
npx serve .
```
O terminal exibirá a URL local (geralmente `http://localhost:3000`).

### Opção B: Executar via Extensão Live Server (VS Code)
1. Abra a pasta do projeto no VS Code.
2. Clique com o botão direito no arquivo [`src/frontend/index.html`](file:///src/frontend/index.html).
3. Selecione **Open with Live Server**.

---

## 3. Configuração do Firebase (Spark Plan - 100% Gratuito)

Se desejar sincronizar os dados em nuvem em tempo real com múltiplos dispositivos:

### Passo 1: Criar o Projeto no Firebase
1. Acesse o [Firebase Console](https://console.firebase.google.com/).
2. Clique em **Adicionar Projeto** e defina um identificador genérico (Ex: `manutencao-institucional`).
3. Conclua o assistente de criação.

### Passo 2: Ativar o Firestore Database
1. No menu lateral, selecione **Build** > **Firestore Database**.
2. Clique em **Criar banco de dados** e escolha a região (ex: `southamerica-east1` em São Paulo).
3. Na aba **Regras (Rules)**, publique o seguinte conjunto de regras de segurança:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /chamados/{chamadoId} {
      // Criação pública via formulário / QR Code
      allow create: if request.resource.data.solicitanteNome is string
                    && request.resource.data.solicitanteNome.size() > 0
                    && request.resource.data.setor is string
                    && request.resource.data.prioridade in ['urgente', 'importante', 'rotina']
                    && request.resource.data.salaNome is string
                    && request.resource.data.descricao is string
                    && request.resource.data.status in ['pendente', 'em_andamento', 'concluido', 'cancelado'];
      
      // Leitura e manipulação restritas à equipe autenticada
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

### Passo 3: Ativar o Firebase Authentication
1. No menu lateral, acesse **Build** > **Authentication** > **Começar**.
2. Na aba **Sign-in method**, ative o provedor **E-mail/senha**.
3. Na aba **Users**, clique em **Adicionar usuário** e crie as credenciais da equipe técnica (Ex: `manutencao@instituicao.com.br`).

### Passo 4: Configurar as Credenciais no Código
No arquivo [`src/backend/services/firebaseService.js`](file:///src/backend/services/firebaseService.js), atualize o objeto `firebaseConfig` com as chaves geradas para o seu projeto:

```javascript
export const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.firebasestorage.app",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxx"
};
```

---

## 4. Publicação em Nuvem (Deploy Gratuito via Firebase Hosting)

1. Instale o Firebase CLI globalmente:
```bash
npm install -g firebase-tools
```

2. Autentique seu terminal:
```bash
firebase login
```

3. Vincule ao seu projeto:
```bash
firebase use --add
```

4. Publique todo o frontend:
```bash
firebase deploy
```
Ao final do deploy, a URL pública e segura (`https://seu-projeto.web.app`) estará disponível para acesso por qualquer colaborador ou televisor da instituição.
