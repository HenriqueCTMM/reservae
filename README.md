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
  controllers/         # Autenticação, mesas e horários semanais
  models/              # Consultas de usuários, mesas e horários
  middlewares/         # Autenticação e permissão por perfil
  routes/              # Rotas de autenticação, mesas e horários
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

## Etapa atual: autenticação, gestão de mesas e API de horários semanais

- Cadastro com nome, e-mail e senha de pelo menos 6 caracteres (máximo de 72 bytes, limite do bcrypt).
- E-mails são normalizados para minúsculas e não podem se repetir.
- Senhas são armazenadas como hash bcrypt com custo 12, como no projeto de referência.
- Todo cadastro público cria um `cliente`, independentemente do perfil enviado.
- Após o cadastro, o usuário volta ao login pelo link da tela. Não há login automático.
- O login cria uma sessão e mantém o redirecionamento do frontend para a tela de reservas.
- Consulta de sessão e logout dão suporte ao fluxo de autenticação já existente nas telas.

Nesta etapa, estão implementados os endpoints de autenticação, listagem, cadastro, edição e exclusão de mesas e consulta/gravação de horários semanais. A tela administrativa de mesas (`pages/admin.html`) está integrada a esses endpoints e carrega apenas seus próprios dados. A API de horários semanais está disponível; sua integração ao frontend será feita na próxima parte. Reservas, contato e demais telas administrativas ainda usam `/api/data` para os módulos pendentes; essas chamadas serão substituídas nas próximas partes.

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

A carga só preenche a programação se os sete dias ainda estiverem no estado inicial fechado e sem turnos. Se já houver uma programação personalizada, ela é preservada por inteiro. Um marcador no banco registra que essa etapa já foi executada; repetir o seed não reabre dias fechados depois, mesmo que toda a semana tenha sido fechada manualmente. Salvar pelo PUT também marca a programação como definida, preservando uma semana explicitamente fechada mesmo antes do primeiro seed. Exceções por data também são preservadas. A gravação dos horários e do marcador usa uma única transação.

## API e persistência

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`.
- `GET /api/auth/me`: sessão atual.
- `GET /api/tables`: listagem de mesas para cliente ou administrador autenticado.
- `POST /api/tables`: cadastro de mesa, exclusivo para administrador.
- `PATCH /api/tables/:id`: edição parcial de mesa, exclusiva para administrador.
- `DELETE /api/tables/:id`: exclusão de mesa sem reservas vinculadas, exclusiva para administrador.
- `GET /api/operating-hours`: consulta de configurações e horários semanais para cliente ou administrador autenticado.
- `PUT /api/operating-hours`: substituição dos sete dias da semana, exclusiva para administrador.

O cadastro recebe `{ nome, email, senha }`; o login recebe `{ email, senha }`. Erros retornam JSON com `message` e status HTTP apropriado (400 para dados inválidos, 401 para credenciais/sessão inválidas, 409 para e-mail duplicado).

Usuários ficam na tabela `users` do MySQL. Login e sessão atual retornam `{ id, uid, nome, email, perfil, authProvider }`, sem o hash da senha, compatível com os serviços existentes do frontend.

Como no projeto de aula, sessões ficam na memória do servidor e são encerradas ao reiniciá-lo. O cookie tem duração de 8 horas, é HttpOnly e SameSite=Strict; com `NODE_ENV=production`, também é Secure e requer HTTPS. O localStorage usado pelo frontend guarda somente informações de exibição; a autenticação é validada no servidor pelo cookie.

A sessão agora é compartilhada por toda a API. Cadastro e login continuam públicos; a consulta `/api/auth/me` e as demais rotas de dados exigem autenticação. O middleware `requireAuth` consulta o usuário no MySQL e disponibiliza `req.user` sem o hash da senha. Sessão ausente ou usuário removido resulta em 401; nesse último caso, a sessão também é encerrada.

O middleware `requireProfile` é aplicado após `requireAuth`: cadastro, edição e exclusão de mesas e gravação de horários exigem `requireProfile('admin')` e retornam 403 para clientes. As próximas rotas poderão exigir perfil de administrador ou cliente da mesma forma. Perfil e identidade enviados no corpo ou guardados no navegador não concedem acesso. As respostas da API recebem `Cache-Control: no-store`.

### Listagem de mesas

`GET /api/tables` retorna um array ordenado pelo número da mesa, incluindo disponíveis e indisponíveis. Cada mesa contém `id` como string, `numero`, `capacidade`, `status`, `posicaoX`, `posicaoY`, `rotacao`, `createdAt` e `updatedAt`. Os timestamps são números em milissegundos. Sem mesas, retorna `[]`.

A consulta não aceita filtros: parâmetros de query retornam 400. Sem sessão válida, retorna 401. A condição de mesa reservada para determinado período será calculada no módulo de disponibilidade.

### Cadastro de mesas

`POST /api/tables` recebe todos os campos abaixo, sem campos extras ou parâmetros de query:

```json
{
  "numero": 6,
  "capacidade": 4,
  "status": "disponivel",
  "posicaoX": 40,
  "posicaoY": 340,
  "rotacao": 0
}
```

Número e capacidade devem ser inteiros, respectivamente entre 1–65535 e 1–8. O status deve ser `disponivel` ou `indisponivel`; a rotação, 0 ou 90. As posições devem ser inteiras, não negativas e manter a mesa inteira dentro do mapa de 800 × 520 pixels, considerando sua capacidade e rotação.

Retorna 201 com a mesa completa no mesmo formato da listagem. Dados inválidos retornam 400, sessão ausente retorna 401, perfil de cliente retorna 403 e número de mesa já cadastrado retorna 409. ID e timestamps são definidos pelo servidor.

### Edição de mesas

`PATCH /api/tables/:id` aceita um ou mais campos do cadastro. Exemplo de mudança de posição:

```json
{ "posicaoX": 120, "posicaoY": 80 }
```

Os campos omitidos são preservados. A mesa completa é validada após combinar os dados atuais com os campos enviados; alterar apenas a rotação ou a capacidade também considera os limites do mapa. Corpo vazio, campos extras, parâmetros de query e valores inválidos retornam 400. ID inválido retorna 400; mesa inexistente retorna 404; número já usado por outra mesa retorna 409. O sucesso retorna 200 com a mesa completa. Sem login retorna 401; cliente recebe 403.

Reduzir capacidade abaixo da quantidade de pessoas de uma reserva ativa ou tornar a mesa indisponível com reserva ativa ainda não encerrada retorna 409. A verificação considera o término previsto no fuso `America/Sao_Paulo`, incluindo reservas em andamento; reservas passadas ou com status definitivo não impedem essas alterações. Posição, rotação e número podem ser alterados sem modificar os registros das reservas.

A leitura da mesa, validação, consulta de reservas e gravação usam a mesma transação. Uma trava na configuração do restaurante coordena a edição com as futuras operações de reservas e funcionamento.

### Exclusão de mesas

`DELETE /api/tables/:id` exclui uma mesa sem reservas vinculadas. Envie apenas o ID na URL, sem parâmetros de query ou dados no corpo. O sucesso retorna 200 com `{ "message": "Mesa removida com sucesso." }`.

ID inválido ou dados não permitidos retornam 400; sessão ausente retorna 401; cliente recebe 403; mesa inexistente, inclusive uma já excluída, retorna 404. Qualquer reserva vinculada bloqueia a exclusão com 409, mesmo se for passada, cancelada ou finalizada. A consulta de vínculos e a exclusão usam a mesma transação e a trava de configuração usada na edição; a chave estrangeira também preserva o histórico no banco.

### Tela administrativa de mesas

Após entrar como administrador, a página Mesas permite listar, cadastrar, editar e excluir usando os endpoints acima. O arraste salva apenas a posição pelo PATCH; a rotação feita pelo botão é uma prévia até clicar em Salvar mesa. O frontend envia apenas os campos editáveis e usa os IDs numéricos em string retornados pelo MySQL. Conflitos informados pelo servidor são mostrados na tela, incluindo a impossibilidade de excluir mesa com reservas.

### Consulta de horários semanais

`GET /api/operating-hours` retorna `minAdvanceMinutes` (180), `slotIntervalMinutes` (30), `weekly` e `updatedAt`. O objeto `weekly` contém os sete dias, de `"0"` (domingo) a `"6"` (sábado). Cada dia contém `open` booleano e `shifts`, com até dois objetos `{ "start": "11:00", "end": "14:00" }`. Horários usam `HH:mm`; dias fechados retornam `open: false` e `shifts: []`.

`updatedAt` é um timestamp numérico em milissegundos, correspondente à alteração mais recente entre a configuração e os sete dias. A consulta lê esses dados em uma única instrução SQL. O campo interno `demo_hours_seeded` não é retornado. Exceções por data serão disponibilizadas em outra etapa.

O sucesso retorna 200; parâmetros de query retornam 400 e sessão ausente ou encerrada retorna 401. Se faltar a configuração ou algum dia no banco, a consulta segue o tratamento de erro 500 da API; não cria uma programação padrão durante a leitura. Execute `npm run db:init` para preparar esses registros.

### Gravação de horários semanais

`PUT /api/operating-hours` recebe `{ "weekly": { ... } }` com os sete dias completos no formato do GET. `minAdvanceMinutes` e `slotIntervalMinutes` podem ser omitidos; se enviados, devem ser os números 180 e 30. Não envie `updatedAt`, campos extras ou parâmetros de query.

Cada dia exige `open` booleano e `shifts`: fechado exige lista vazia; aberto exige um ou dois turnos. Cada turno aceita somente `start` e `end` em `HH:mm`, de `00:00` a `23:59`, com início anterior ao fim. Os turnos devem estar ordenados, sem sobreposição e dentro do mesmo dia. Turnos encostados são aceitos, mas a permanência de uma reserva deve caber integralmente em um único turno.

O sucesso retorna 200 com a configuração completa no formato do GET. Dados inválidos retornam 400; sem sessão retorna 401; cliente recebe 403. Retorna 409 se a programação não comportar alguma reserva ativa com término ainda futuro, inclusive em andamento, informando data e número da mesa. Reservas passadas ou com status definitivo não impedem a gravação. Datas com exceção seguem sua programação própria e não são afetadas pela troca da semana.

A trava de `operating_settings.id = 1`, leitura das reservas, gravação dos sete dias e leitura da resposta usam a mesma conexão transacional. Em caso de conflito ou falha, nenhuma alteração parcial é confirmada. A gravação não muda os parâmetros fixos nem as exceções por data.

## Validar

Validação exclusivamente manual: cadastrar cliente, repetir o e-mail, tentar senha incorreta, entrar, recarregar a página autenticada e sair.

Na tela administrativa de mesas: conferir lista e mapa; criar uma mesa; editar número, capacidade e status; girar e salvar; arrastar e recarregar para conferir a posição; excluir mesa sem reservas. Conferir também mensagens de número repetido, posição inválida e bloqueio de mesa com reserva vinculada quando houver esse registro no banco. Na aba Rede do navegador, as operações de mesas devem usar `/api/tables`, sem depender de `/api/data`.

Para conferir o banco, execute `npm run db:init`, consulte as sete tabelas e confirme o registro em `operating_settings` e os sete dias em `weekly_operating_hours`. Execute o comando novamente e confira que registros existentes e configurações alteradas foram preservados. No MySQL, confira também rejeição de número de mesa repetido, capacidade fora de 1 a 8 e exclusão de mesa com reserva vinculada.

Para conferir a consulta de horários, use um cliente HTTP manual com o cookie de sessão ou abra `/api/operating-hours` no mesmo navegador da aplicação:

1. Sem login, conferir 401. Entrar como cliente e depois como administrador em sessões separadas; ambos devem receber 200.
2. Acrescentar `?data=2030-11-15` à URL; conferir 400, pois a consulta não aceita filtros.
3. Em um banco de conferência, após somente `db:init`, conferir sete dias fechados, `shifts: []`, antecedência 180 e intervalo 30.
4. Executar `db:seed` nesse banco e comparar a resposta com os horários de demonstração acima. Conferir booleanos reais, horários `HH:mm`, até dois turnos por dia e ausência de campos internos.
5. Comparar `updatedAt` com o maior `updated_at` de `operating_settings` (id 1) e `weekly_operating_hours`, convertido em milissegundos. Em um banco de conferência, alterar um dia pelo MySQL para um único turno e consultar novamente; conferir o turno e a atualização do timestamp.
6. Sair da sessão e repetir a consulta; conferir 401.

Para conferir a gravação semanal, use um cliente HTTP manual em um banco de conferência:

1. A partir do GET, copie apenas `weekly` para o corpo do PUT; mudar o objeto retornado inteiro sem remover `updatedAt` deve resultar em 400.
2. Sem sessão, conferir 401; como cliente, 403; como administrador, salvar uma programação com dias fechados, um turno e dois turnos. Conferir 200, repetir o GET e comparar os sete dias com o MySQL.
3. Conferir 400 para corpo vazio ou lista, dia ausente/adicional, `open` não booleano, lista de turnos incompatível com aberto/fechado, campos extras, turno incompleto, três turnos, `24:00`, `12:60`, início igual/posterior ao fim, ordem invertida e sobreposição. Conferir também parâmetros fixos diferentes de 180/30 e parâmetros de query. Após rejeições, a configuração deve permanecer intacta.
4. Preparar reservas no MySQL: ativa futura, ativa em andamento, passada e com status definitivo. Fechar o dia, começar após o início reservado ou encerrar antes do término de uma ativa ainda não encerrada deve retornar 409, com data/mesa. Manter toda a reserva dentro de um turno, inclusive nos limites exatos, deve permitir 200. Reservas passadas ou encerradas não devem bloquear.
5. Preparar uma exceção por data e uma reserva compatível com ela; fechar o dia semanal correspondente deve permitir 200 e preservar a exceção. Retirar a exceção pelo MySQL e tentar salvar novamente deve retornar 409 se a reserva não couber na semana.
6. Em um banco novo após `db:init`, salvar toda a semana fechada pelo PUT e executar `db:seed`; conferir que o seed preserva o fechamento. Para demonstrar a trava, manter `SELECT id FROM operating_settings WHERE id = 1 FOR UPDATE` em uma transação MySQL aberta; enviar um PUT e liberar com COMMIT. O PUT deve aguardar e então revalidar os dados confirmados antes da gravação.

O comando `npm test` está configurado para o test runner do Node.js, mas esta versão ainda não contém arquivos de teste automatizado.

## Dados anteriores

A aplicação inicia com um banco novo. Contas e dados do provedor anterior não são importados automaticamente. O login social foi removido; os usuários devem se cadastrar novamente por e-mail/senha.

## Equipe

- Henrique Mamprim Melo
- Beatriz Krebs Yamaguchi
- Igor Biassi Severich
