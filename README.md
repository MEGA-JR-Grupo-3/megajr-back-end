# JubiTasks Backend

Este repositório contém o código-fonte do backend da aplicação **JubiTasks**, um sistema de lista de tarefas (to-do list) colaborativo, desenvolvido pela equipe da Mega JR. Ele é responsável por gerenciar a lógica de negócio, a persistência de dados, a autenticação de usuários e o armazenamento de arquivos.

## Tecnologias Utilizadas

O backend do JubiTasks foi construído com um conjunto robusto de tecnologias para garantir performance, escalabilidade e segurança:

* **Node.js**
* **Express.js**
* **TypeScript**
* **PostgreSQL**
* **Google Cloud Platform (GCP)**
* **Firebase Authentication**
* **Firebase Storage**

## Como o Projeto Foi Desenvolvido

O desenvolvimento do backend do JubiTasks seguiu uma arquitetura bem definida para separar as responsabilidades e facilitar o trabalho em equipe.

1.  **Estrutura de Projeto**: Adotamos uma estrutura modular, organizando o código por funcionalidades (ex: usuários, tarefas) e por camadas (controllers, services, repositories).
2.  **API RESTful**: Foram projetados e implementados endpoints RESTful para todas as operações CRUD (Criar, Ler, Atualizar, Deletar) relacionadas a tarefas e usuários.
3.  **Gerenciamento de Autenticação**: A integração com o **Firebase Authentication** permite que os usuários se cadastrem e façam login de forma segura, com o backend validando os tokens de autenticação.
4.  **Integração com Banco de Dados**: Utilizamos um ORM (Object-Relational Mapper) ou queries diretas (dependendo da sua implementação específica, você pode detalhar mais aqui) para interagir com o PostgreSQL, garantindo a manipulação eficiente dos dados.
5.  **Upload de Imagens**: A integração com o **Firebase Storage** permite que os usuários façam upload de imagens, que são armazenadas de forma segura e acessíveis através de URLs.
6.  **Validação e Tratamento de Erros**: Implementamos validações robustas para os dados de entrada e um tratamento de erros centralizado para garantir a consistência e a resiliência da API.

---

## Como Executar o Projeto Localmente

Para configurar e rodar o backend do JubiTasks em sua máquina local, siga os passos abaixo:

1.  **Pré-requisitos**:
    * **Node.js** (versão 14 ou superior recomendada)
    * **npm** ou **yarn** (gerenciador de pacotes)
    * **PostgreSQL** (servidor de banco de dados)
    * **Conta Google Cloud/Firebase** (para credenciais de autenticação e storage)

2.  **Clonar o Repositório**:
    ```bash
    git clone https://github.com/MEGA-JR-Grupo-3/megajr-back-end
    cd megajr-back-end
    ```

3.  **Instalar Dependências**:
    ```bash
    npm install
    # ou
    yarn install
    ```

4.  **Configurar Variáveis de Ambiente**:
    Crie um arquivo `.env` na raiz do projeto (se o seu projeto usa `dotenv` ou similar) com as seguintes variáveis (ajuste conforme a sua necessidade):

    ```dotenv
    PORT
    DATABASE_URL
    GOOGLE_APPLICATION_CREDENTIALS
    ```

6.  **Compilar o TypeScript**:
    ```bash
    npm run build
    # ou
    yarn build
    ```

7.  **Iniciar o Servidor**:
    ```bash
    npm start
    # ou
    yarn start
    ```
    O servidor estará disponível em `http://localhost:[PORTA_CONFIGURADA_NO_.ENV]`.

---

## Estrutura de Pastas

```
.
├── src/
│   ├── controllers/         # Lógica de requisição/resposta
│   ├── services/            # Lógica de negócio
│   ├── repositories/        # Interação com o banco de dados
│   ├── routes/              # Definição de rotas da API
│   ├── middlewares/         # Middlewares (autenticação, validação)
│   │   └── auth.ts          # Middleware de autenticação Firebase
│   ├── database/            # Configurações do banco de dados e migrações
│   ├── config/              # Configurações gerais (Firebase, etc.)
│   ├── models/              # Definição de modelos (se usar ORM)
│   └── app.ts               # Configuração principal da aplicação Express
├── .env.example             # Exemplo de variáveis de ambiente
├── package.json             # Dependências e scripts
├── tsconfig.json            # Configurações do TypeScript
└── README.md                # Este arquivo
```
