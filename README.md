<p align="center">
  <img src="frontend/src/assets/logo-reservae.png" alt="Reservaê" width="220" />
</p>

# Reservaê

Aplicação para reservas de mesas de restaurante, com frontend e backend no mesmo repositório (monorepo).

## Tecnologias

- Frontend: HTML, CSS com Tailwind via CDN e JavaScript ES Modules.
- Backend: Node.js 22+ e Express 4.
- Banco: MySQL 8.4.
- Autenticação por e-mail/senha, com bcrypt e express-session, seguindo o projeto `auth-site-aula`.
- npm workspaces: instalação centralizada e um único `package-lock.json`.

## Estrutura

```text
frontend/
  src/
    index.html
    app.js
    pages/             # Telas de cliente e administrador
    js/services/       # Comunicação com a API e serviços de tela
    css/
    assets/
  package.json
backend/
  app.js               # Configuração do Express, sessão e frontend estático
  server.js            # Inicialização HTTP
  config/              # Variáveis de ambiente e pool MySQL
  controllers/         # Cadastro, login, sessão atual e logout
  models/              # Consultas de usuários
  routes/              # Rotas de autenticação
  sql/schema.sql       # Tabelas, relacionamentos e configurações básicas
  scripts/init-db.js    # Inicialização do banco sem apagar dados existentes
  .env.example
  package.json
compose.yaml           # MySQL local opcional
package.json           # Comandos do monorepo
package-lock.json
```

## Executar localmente

1. Instale Node.js 22+ e as dependências, a partir da raiz:

   ```sh
   npm install
   ```

2. Inicie o MySQL (Docker Compose ou uma instalação própria):

   ```sh
   docker compose up -d --wait
   ```

   Se a porta 3306 já estiver ocupada, no PowerShell use `$env:MYSQL_PORT = '13306'` antes do comando e configure `DB_PORT=13306` no arquivo abaixo.

3. Copie `backend/.env.example` para `backend/.env`, ajuste os dados de conexão e substitua `SESSION_SECRET` por uma chave aleatória longa. Para gerar uma chave:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Os valores de conexão do exemplo correspondem ao MySQL do Compose. Com instalação própria, crie antes o banco e um usuário com permissão para criar tabelas e acessar os dados.

4. Crie as tabelas e inicie a aplicação:

   ```sh
   npm run db:init
   npm run dev
   ```

5. Acesse **http://localhost:3000**.

O Express entrega o frontend e a API na mesma origem. Não há compilação do frontend ou necessidade de iniciar um segundo servidor. Abra a aplicação por essa URL para que os formulários acessem a API. `npm start` inicia sem o modo watch.

## Etapa atual: autenticação e estrutura do banco

- Cadastro com nome, e-mail e senha de pelo menos 6 caracteres (máximo de 72 bytes, limite do bcrypt).
- E-mails são normalizados para minúsculas e não podem se repetir.
- Senhas são armazenadas como hash bcrypt com custo 12, como no projeto de referência.
- Todo cadastro público cria um `cliente`, independentemente do perfil enviado.
- Após o cadastro, o usuário volta ao login pelo link da tela. Não há login automático.
- O login cria uma sessão e mantém o redirecionamento do frontend para a tela de reservas.
- Consulta de sessão e logout dão suporte ao fluxo de autenticação já existente nas telas.

Nesta etapa, somente os endpoints de autenticação estão implementados. As telas de reservas, contato e administração já existem no frontend, mas ainda chamam `/api/data`, que será substituído por endpoints específicos nas próximas partes; elas ainda podem exibir mensagens de erro ao buscar esses dados após o login.

O comando `npm run db:init` prepara as tabelas `users`, `tables`, `reservations`, `messages`, `operating_settings`, `weekly_operating_hours` e `operating_exceptions`, incluindo chaves estrangeiras, índices e restrições básicas. Também cria a configuração de antecedência de 180 minutos, intervalo de 30 minutos e os sete dias da semana inicialmente fechados.

A inicialização pode ser repetida: tabelas existentes não são recriadas e registros/configurações salvos não são apagados nem sobrescritos. Para bancos das etapas anteriores, ela adiciona o campo de controle `demo_hours_seeded`, utilizado pelo seed de horários. Outras diferenças em estruturas antigas não são atualizadas automaticamente.

## Criar o administrador inicial

Após executar `npm run db:init`, preencha `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` em `backend/.env`. O nome pode ser omitido para usar `Administrador`. Use um e-mail que ainda não esteja cadastrado e uma senha com pelo menos 6 caracteres e no máximo 72 bytes.

Execute na raiz:

```sh
npm run db:admin
```

O comando cria um usuário com perfil `admin` e senha armazenada como hash bcrypt. Use o e-mail e a senha configurados para entrar pela tela de login. Executar novamente mantém a conta existente sem trocar nome ou senha. Se o e-mail pertencer a um cliente, o comando informa o conflito e não altera seu perfil. O cadastro público continua criando apenas clientes.

## Preparar os dados de demonstração

Execute novamente `npm run db:init` para atualizar o banco, caso ele tenha sido criado nas etapas anteriores. Depois, execute na raiz:

```sh
npm run db:seed
```

O comando prepara um cliente fictício para a apresentação:

- Nome: `Cliente Demonstração`.
- E-mail: `cliente@example.com`.
- Senha: `cliente123`.

A senha é armazenada como hash bcrypt. Se já existir um cliente com esse e-mail, o comando preserva nome, senha e perfil, sem duplicá-lo; as credenciais acima só são definidas na criação. Se o e-mail pertencer a um administrador, informa o conflito sem alterar a conta. O administrador inicial continua sendo criado separadamente com `npm run db:admin`.

Também prepara as mesas abaixo, com posições do mapa original e rotação inicial horizontal:

| Número | Capacidade | Status | Posição (X, Y) |
| --- | --- | --- | --- |
| 1 | 2 | disponivel | 40, 40 |
| 2 | 4 | disponivel | 220, 40 |
| 3 | 4 | disponivel | 420, 40 |
| 4 | 6 | disponivel | 120, 210 |
| 5 | 8 | indisponivel | 360, 220 |

A identificação é pelo número da mesa: números já cadastrados são preservados com seus dados atuais e somente os que faltam são inseridos. Outras mesas também permanecem intactas. Executar novamente não duplica as mesas nem redefine capacidade, status, posição ou rotação. As mesas são preparadas mesmo quando o cliente de demonstração já existe.

### Horários de demonstração

O mesmo comando também prepara a programação semanal original:

| Dias | Turno 1 | Turno 2 |
| --- | --- | --- |
| Domingo | Fechado | — |
| Segunda a quinta | 11:00–14:00 | 18:00–23:00 |
| Sexta | 11:00–14:00 | 18:00–23:30 |
| Sábado | 11:00–15:00 | 18:00–23:30 |

A carga só preenche a programação se os sete dias ainda estiverem no estado inicial fechado e sem turnos. Se já houver uma programação personalizada, ela é preservada por inteiro. Um marcador no banco registra que essa etapa já foi executada; repetir o seed não reabre dias fechados depois, mesmo que toda a semana tenha sido fechada manualmente. Exceções por data também são preservadas. A gravação dos horários e do marcador usa uma única transação.

## API e persistência

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`.
- `GET /api/auth/me`: sessão atual.

O cadastro recebe `{ nome, email, senha }`; o login recebe `{ email, senha }`. Erros retornam JSON com `message` e status HTTP apropriado (400 para dados inválidos, 401 para credenciais/sessão inválidas, 409 para e-mail duplicado).

Usuários ficam na tabela `users` do MySQL. Login e sessão atual retornam `{ id, uid, nome, email, perfil, authProvider }`, sem o hash da senha, compatível com os serviços existentes do frontend.

Como no projeto de aula, sessões ficam na memória do servidor e são encerradas ao reiniciá-lo. O cookie tem duração de 8 horas, é HttpOnly e SameSite=Strict; com `NODE_ENV=production`, também é Secure e requer HTTPS. O localStorage usado pelo frontend guarda somente informações de exibição; a autenticação é validada no servidor pelo cookie.

## Validar

Validação exclusivamente manual: cadastrar cliente, repetir o e-mail, tentar senha incorreta, entrar, recarregar a página autenticada e sair.

Para conferir o banco, execute `npm run db:init`, consulte as sete tabelas e confirme o registro em `operating_settings` e os sete dias em `weekly_operating_hours`. Execute o comando novamente e confira que registros existentes e configurações alteradas foram preservados. No MySQL, confira também rejeição de número de mesa repetido, capacidade fora de 1 a 8 e exclusão de mesa com reserva vinculada.

O comando `npm test` está configurado para o test runner do Node.js, mas esta versão ainda não contém arquivos de teste automatizado.

## Dados anteriores

A aplicação inicia com um banco novo. Contas e dados do provedor anterior não são importados automaticamente. O login social foi removido; os usuários devem se cadastrar novamente por e-mail/senha.

## Equipe

- Henrique Mamprim Melo
- Beatriz Krebs Yamaguchi
- Igor Biassi Severich
