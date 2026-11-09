# 🛠️ Sistema de Chamados de Manutenção - Instituição Cliente

Sistema de abertura e gestão operacional de chamados de manutenção via QR Code e painel em tempo real, estruturado sob o padrão arquitetural **MVC (Model-View-Controller)** e otimizado para rodar **100% na cota gratuita do Firebase (Spark Plan)**.

---

## 📁 Estrutura de Diretórios (Padrão MVC)

```text
/
├── documentacao/               # Especificações, manuais e arquitetura
│   ├── arquitetura_mvc.md      # Detalhamento do padrão MVC e fluxo de dados
│   ├── especificacao_requisitos.md # Requisitos funcionais, não-funcionais e regras
│   └── manual_implantacao.md   # Guia passo a passo de deploy e configuração
│
├── src/
│   ├── backend/                # Camada de Negócio e Serviços
│   │   ├── controllers/        # Controladores (AuthController, ChamadoController, TvController)
│   │   ├── models/             # Modelos de Domínio e Validações (ChamadoModel, AuthModel)
│   │   └── services/           # Serviços compartilhados (firebaseService, imageCompressorService)
│   │
│   └── frontend/               # Camada de Visão (Views, HTMLs e CSS)
│       ├── admin/              # Visão do Painel Administrativo
│       ├── css/                # Folhas de estilo neutras (public.css, admin.css, tv.css)
│       ├── js/views/           # Manipulação do DOM (loginView, solicitarView, adminView, tvView)
│       ├── solicitar/          # Visão de Abertura de Chamado via QR Code
│       ├── tv/                 # Visão do Monitor de TV Operacional em Tempo Real
│       └── index.html          # Ponto de entrada / Tela de Login
│
├── validacao_qualidade/        # Garantia de Qualidade e Testes Automatizados
│   ├── checklist_qualidade.md  # Auditoria de descaracterização e integridade
│   └── test_regras_negocio.js  # Bateria de testes automatizados das regras de negócio
│
├── .firebaserc                 # Configuração de projeto do Firebase
├── firebase.json               # Configurações de rotas e rewrites do Firebase Hosting
├── firestore.rules             # Regras de segurança do Cloud Firestore
└── storage.rules               # Regras de segurança do Cloud Storage
```

---

## ⚡ Otimizações para o Spark Plan (Cota Gratuita)

1. **Compressão Automática de Fotos Client-Side:** Antes do envio ao banco, a foto tirada pelo celular (geralmente entre 5 MB e 12 MB) é comprimida via HTML5 Canvas para JPEG de até 1024px (~40 KB a 80 KB). Isso viabiliza persistir a imagem diretamente no Cloud Firestore, **sem custo de Firebase Storage e sem necessidade de cartão de crédito**.
2. **Subscrições Otimizadas com Filtro de Status:** O modo TV monitora via `onSnapshot` apenas documentos com status `pendente` e `em_andamento`, evitando leituras desnecessárias de chamados concluídos.
3. **Modo Demonstração (Mock Fallback):** Caso não haja conexão ou chaves configuradas, a aplicação executa automaticamente em modo de demonstração via `localStorage`.

---

## 🧪 Execução dos Testes Automatizados de Qualidade

Para rodar os testes unitários e de integração das regras de negócio:

```bash
node validacao_qualidade/test_regras_negocio.js
```

---

## 🚀 Como Executar Localmente

Você pode usar qualquer servidor estático local:

```bash
npx serve .
```

Acesse no navegador:
- **Portal de Acesso / Login:** `http://localhost:3000/src/frontend/index.html` (ou via redirecionamento na raiz)
- **Abertura de Chamado:** `http://localhost:3000/src/frontend/solicitar/index.html`
- **Painel Administrativo:** `http://localhost:3000/src/frontend/admin/index.html`
- **Monitor da TV:** `http://localhost:3000/src/frontend/tv/index.html`

Consulte a pasta [`documentacao/`](file:///documentacao/) para manuais completos de implantação e especificações arquiteturais.
