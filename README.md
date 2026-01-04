# 🏠 Gestão de Casa & Financeiro

> 🔗 **[SITE](https://stuartlyrio.github.io/compras/)**

Um painel de controle completo (Dashboard) para quem está de mudança, reformando ou mobiliando uma casa nova. O aplicativo permite gerenciar orçamentos, criar listas de itens por cômodo e acompanhar o fluxo financeiro do projeto.

![Status do Projeto](https://img.shields.io/badge/Status-Concluído-green)
![Firebase](https://img.shields.io/badge/Backend-Firebase-orange)
![Tecnologia](https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JS-blue)

## 🎯 Funcionalidades

### 1. 💰 Gestão Financeira (Carteira)
* **Controle de Saldo:** Adicione entradas (ex: Salário, Economias) e saídas (ex: Dívidas, Gastos extras).
* **Histórico:** Visualização rápida das últimas movimentações.
* **Poder de Compra:** Uma barra de progresso mostra automaticamente quanto do seu projeto total o seu saldo atual consegue cobrir.

### 2. 📊 Métricas e Progresso
* **Financeiro:** Acompanhe visualmente quanto do valor total planejado já foi pago.
* **Físico (Itens):** Veja a porcentagem de itens comprados vs. pendentes.
* **Totais Globais:** Resumo automático de custos por categoria (Essencial, Comum, Desejado).

### 3. 🛋️ Organização da Casa
* **Seções e Cômodos:** Crie áreas personalizadas (ex: "Reforma", "Mobília") e adicione cômodos dentro delas (ex: "Sala", "Cozinha").
* **Categorização:** Itens divididos por prioridade:
    * 🚨 **Essenciais:** O básico para morar.
    * 🏠 **Comuns:** Itens padrão de conforto.
    * ✨ **Desejados:** Itens de luxo ou decoração futura.

### 4. 📝 Listas Inteligentes
* **Checklist Rápido:** Sugestões pré-definidas para adicionar itens com um clique.
* **Status de Compra:** Botão interativo que alterna entre **PENDENTE** (Vermelho) e **COMPRADO** (Verde/Ciano), atualizando todos os cálculos financeiros em tempo real.
* **Upload de Foto:** Adicione fotos de referência para cada item.

### 5. ☁️ Nuvem e Segurança
* **Login Google/Email:** Autenticação segura via Firebase.
* **Sincronização:** Seus dados são salvos automaticamente na nuvem. Acesse pelo celular ou computador e veja as mesmas informações.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend:** HTML5, CSS3 (Variáveis CSS, Flexbox, Grid), JavaScript (ES6+ Modules).
* **Backend as a Service:** Google Firebase.
    * **Authentication:** Gestão de usuários.
    * **Firestore:** Banco de dados NoSQL em tempo real.
* **Design:** Modo Escuro (Dark Mode) com paleta Neon Ciano (`#60d4ea`).

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
Você não precisa instalar nada (Node.js, Python, etc.) para rodar a versão final, pois ela usa tecnologias nativas da web e CDN.

### Passo 1: Configurar o Firebase
1.  Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
2.  Ative o **Authentication** (Google e Email/Senha).
3.  Crie um **Firestore Database** e configure as regras de segurança.
4.  Copie as credenciais do seu projeto (`apiKey`, `authDomain`, etc.).

### Passo 2: Configurar o Código
1.  Clone este repositório:
    ```bash
    git clone [https://github.com/stuartlyrio/compras.git](https://github.com/stuartlyrio/compras.git)
    ```
2.  Abra o arquivo `index.html`.
3.  Procure pela constante `firebaseConfig` no final do arquivo e substitua pelos dados do seu projeto Firebase.

### Passo 3: Executar
* **Localmente:** Use uma extensão como "Live Server" no VS Code. (Não abra o arquivo diretamente com dois cliques devido a bloqueios de segurança CORS/Module).
* **Online:** [Acesse o site rodando aqui](https://stuartlyrio.github.io/compras/)

---

## 🎨 Paleta de Cores

| Cor | Hex | Uso |
| :--- | :--- | :--- |
| **Fundo** | `#020202` | Background Principal |
| **Cards** | `#19191a` | Fundo dos Painéis |
| **Destaque** | `#60d4ea` | Botões, Totais, Status Pago |
| **Alerta** | `#ef5350` | Status Pendente, Saída de Dinheiro |
| **Carteira** | `#b388ff` | Identidade Visual da Carteira |

---

## 🤝 Contribuição

Sinta-se à vontade para fazer um fork deste projeto e enviar pull requests.

## 📄 Licença

Este projeto está sob a licença MIT.