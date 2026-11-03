# 📑 Especificação de Requisitos e Regras de Negócio

## 1. Perfis de Usuários (Atores do Sistema)

| Ator | Descrição | Nível de Acesso |
| :--- | :--- | :--- |
| **Colaborador / Solicitante** | Qualquer membro ou colaborador da Instituição Cliente que identifica uma anomalia predial. | Público (sem login obrigatório, via QR Code). |
| **Equipe Técnica / Administrador** | Profissional de manutenção responsável por diagnosticar, executar e concluir os chamados. | Autenticado (login e senha corporativos). |
| **Painel de Monitoramento (TV)** | Exibição contínua em tela técnica dedicada no setor de manutenção. | Leitura contínua em tempo real com alertas sonoros. |

---

## 2. Requisitos Funcionais (RF)

- **[RF01] Abertura de Chamado via QR Code:** O sistema deve permitir a abertura simplificada de chamados informando nome do solicitante, setor, aviso prévio ao gestor, nível de gravidade, identificação da sala/local e descrição do problema.
- **[RF02] Geração Automática de Protocolo:** Cada solicitação deve receber um identificador único auditável no formato `MAN-YYYYMM-XXXX`.
- **[RF03] Compressão e Anexo de Fotos Client-Side:** O solicitante deve poder capturar foto pela câmera do celular ou anexar imagem da galeria/área de transferência. O sistema deve comprimir a foto no navegador antes do envio (JPEG até 1024px, ~40-80 KB).
- **[RF04] Alerta de Confirmação para Gravidade Urgente:** Ao selecionar a opção "Urgente", o sistema deve exibir modal explicativo exigindo confirmação de risco físico ou paralisação total antes da submissão.
- **[RF05] Autenticação da Equipe Operacional:** O acesso ao painel administrativo deve ser restrito por e-mail e senha corporativos.
- **[RF06] Painel de Gestão e Triagem de Chamados:** A equipe técnica deve visualizar chamados ativos divididos por status (`pendente` e `em_andamento`), com filtros por texto, status, prioridade e setor.
- **[RF07] Transição de Status e Resolução Técnica:** O técnico deve poder alterar o status do chamado, registrar as ações executadas e encerrar o protocolo com observações de encerramento.
- **[RF08] Histórico de Chamados Concluídos:** O sistema deve manter registro histórico separado de chamados finalizados ou cancelados, com data de encerramento.
- **[RF09] Painel em Tempo Real para TV (Dashboard):** Exibição em grade dos chamados ativos ordenados prioritariamente por urgência e tempo de abertura, com relógio em tempo real e modo tela cheia.
- **[RF10] Alerta Sonoro Sintetizado:** A tela de TV e o painel administrativo devem emitir bipes sonoros diferenciados via Web Audio API para novos chamados rotineiros e urgentes.

---

## 3. Requisitos Não Funcionais (RNF)

- **[RNF01] Arquitetura MVC:** O código deve separar rigidamente Views (DOM/CSS), Controllers (orquestração e roteamento) e Models (validação e integridade de domínio).
- **[RNF02] Operação sem Custo (Spark Plan):** O sistema deve operar 100% dentro da cota gratuita do Firebase, sem necessidade de ativação de cartão de crédito ou serviço de Storage pago.
- **[RNF03] Resiliência e Modo Offline (Fallback):** Na ausência de credenciais do Firebase, a aplicação deve manter seu funcionamento pleno via persistência em `localStorage`.
- **[RNF04] Design Responsivo e Acessibilidade:** As interfaces devem se adaptar perfeitamente a smartphones (leitura de QR Code), computadores e televisores Full HD / 4K.
- **[RNF05] Identidade Visual Neutra:** A paleta de cores deve utilizar tons neutros de cinza e azul claro padrão, sem vínculos com identidades institucionais específicas.

---

## 4. Regras de Negócio (RN)

- **[RN01] Formato do Protocolo:** A numeração segue obrigatoriamente a máscara `MAN-` + `AnoMês (6 dígitos)` + `-` + `Hash Hexadecimal (4 caracteres maiúsculos)`.
- **[RN02] Trava de Segurança na Exclusão:** É estritamente proibido excluir chamados que estejam com status operacional ativo (`pendente` ou `em_andamento`). Apenas chamados finalizados (`concluido` ou `cancelado`) podem ser permanentemente descartados para liberação de cota.
- **[RN03] Carimbo de Tempo e Auditoria:** Toda mudança de status deve registrar a data/hora da alteração e o responsável.
- **[RN04] Reabertura de Chamado:** Um chamado concluído ou cancelado pode ser reaberto a qualquer momento, retornando ao status `pendente` e figurando imediatamente no topo da fila de atendimento.
- **[RN05] Otimização de Imagens no Firestore:** Nenhuma imagem pode ultrapassar 1280px ou tamanho superior a 300 KB em formato Base64.
