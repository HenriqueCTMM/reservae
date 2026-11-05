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
  controllers/         # Autenticação, mesas, funcionamento, disponibilidade e reservas do cliente
  models/              # Consultas SQL por recurso
  middlewares/         # Autenticação e permissão por perfil
  routes/              # Endpoints e permissões por recurso
  utils/               # Datas, horários e regras de duração/slots
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

## Etapa atual: autenticação, mesas, funcionamento e reservas do cliente

- Cadastro com nome, e-mail e senha de pelo menos 6 caracteres (máximo de 72 bytes, limite do bcrypt).
- E-mails são normalizados para minúsculas e não podem se repetir.
- Senhas são armazenadas como hash bcrypt com custo 12, como no projeto de referência.
- Todo cadastro público cria um `cliente`, independentemente do perfil enviado.
- Após o cadastro, o usuário volta ao login pelo link da tela. Não há login automático.
- O login cria uma sessão e mantém o redirecionamento do frontend para a tela de reservas.
- Consulta de sessão e logout dão suporte ao fluxo de autenticação já existente nas telas.

Nesta etapa, estão implementados autenticação, gestão de mesas, horários semanais, exceções por data, consulta de disponibilidade, criação transacional de reservas e histórico do próprio cliente. Mesas (`pages/admin.html`), Configurações (`pages/admin-configuracoes.html`), seleção/confirmação em Reservas (`pages/reservas.html`) e Minhas reservas (`pages/minhas-reservas.html`) estão integradas às respectivas APIs. API e serviços foram conferidos manualmente; a validação visual dessas telas ainda está pendente. Contato e demais módulos administrativos ainda dependem da migração de `/api/data`.

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
- `GET /api/operating-hours/exceptions`: listagem de exceções por data para cliente ou administrador autenticado.
- `PUT /api/operating-hours/exceptions/:date`: criação ou substituição de exceção por data, exclusiva para administrador.
- `DELETE /api/operating-hours/exceptions/:date`: remoção de exceção por data, exclusiva para administrador.
- `GET /api/availability?data=2030-11-11&pessoas=4&horario=11:00`: horários e condição das mesas, para cliente ou administrador autenticado; `horario` é opcional.

O cadastro recebe `{ nome, email, senha }`; o login recebe `{ email, senha }`. Erros retornam JSON com `message` e status HTTP apropriado (400 para dados inválidos, 401 para credenciais/sessão inválidas, 409 para e-mail duplicado).

Usuários ficam na tabela `users` do MySQL. Login e sessão atual retornam `{ id, uid, nome, email, perfil, authProvider }`, sem o hash da senha, compatível com os serviços existentes do frontend.

Como no projeto de aula, sessões ficam na memória do servidor e são encerradas ao reiniciá-lo. O cookie tem duração de 8 horas, é HttpOnly e SameSite=Strict; com `NODE_ENV=production`, também é Secure e requer HTTPS. O localStorage usado pelo frontend guarda somente informações de exibição; a autenticação é validada no servidor pelo cookie.

A sessão agora é compartilhada por toda a API. Cadastro e login continuam públicos; a consulta `/api/auth/me` e as demais rotas de dados exigem autenticação. O middleware `requireAuth` consulta o usuário no MySQL e disponibiliza `req.user` sem o hash da senha. Sessão ausente ou usuário removido resulta em 401; nesse último caso, a sessão também é encerrada.

O middleware `requireProfile` é aplicado após `requireAuth`: cadastro, edição e exclusão de mesas, gravação de horários e gravação/exclusão de exceções exigem `requireProfile('admin')` e retornam 403 para clientes. As próximas rotas poderão exigir perfil de administrador ou cliente da mesma forma. Perfil e identidade enviados no corpo ou guardados no navegador não concedem acesso. As respostas da API recebem `Cache-Control: no-store`.

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

`updatedAt` é um timestamp numérico em milissegundos, correspondente à alteração mais recente entre a configuração e os sete dias. A consulta lê esses dados em uma única instrução SQL. O campo interno `demo_hours_seeded` não é retornado. Exceções por data são consultadas no endpoint próprio descrito abaixo.

O sucesso retorna 200; parâmetros de query retornam 400 e sessão ausente ou encerrada retorna 401. Se faltar a configuração ou algum dia no banco, a consulta segue o tratamento de erro 500 da API; não cria uma programação padrão durante a leitura. Execute `npm run db:init` para preparar esses registros.

### Gravação de horários semanais

`PUT /api/operating-hours` recebe `{ "weekly": { ... } }` com os sete dias completos no formato do GET. `minAdvanceMinutes` e `slotIntervalMinutes` podem ser omitidos; se enviados, devem ser os números 180 e 30. Não envie `updatedAt`, campos extras ou parâmetros de query.

Cada dia exige `open` booleano e `shifts`: fechado exige lista vazia; aberto exige um ou dois turnos. Cada turno aceita somente `start` e `end` em `HH:mm`, de `00:00` a `23:59`, com início anterior ao fim. Os turnos devem estar ordenados, sem sobreposição e dentro do mesmo dia. Turnos encostados são aceitos, mas a permanência de uma reserva deve caber integralmente em um único turno.

O sucesso retorna 200 com a configuração completa no formato do GET. Dados inválidos retornam 400; sem sessão retorna 401; cliente recebe 403. Retorna 409 se a programação não comportar alguma reserva ativa com término ainda futuro, inclusive em andamento, informando data e número da mesa. Reservas passadas ou com status definitivo não impedem a gravação. Datas com exceção seguem sua programação própria e não são afetadas pela troca da semana.

A trava de `operating_settings.id = 1`, leitura das reservas, gravação dos sete dias e leitura da resposta usam a mesma conexão transacional. Em caso de conflito ou falha, nenhuma alteração parcial é confirmada. A gravação não muda os parâmetros fixos nem as exceções por data.

### Consulta de exceções por data

`GET /api/operating-hours/exceptions` retorna um array ordenado por data crescente, incluindo datas passadas e futuras. Sem registros, retorna `[]`. Cada exceção contém `id` e `date` como a mesma string `YYYY-MM-DD`, `open` booleano, `shifts`, `reason` e `updatedAt` numérico em milissegundos. Dias fechados retornam `shifts: []`; dias abertos retornam um ou dois turnos com `start` e `end` em `HH:mm`. Motivo não preenchido é uma string vazia.

O sucesso retorna 200; parâmetros de query retornam 400; sessão ausente ou encerrada retorna 401. A consulta lê somente as exceções salvas, sem combinar a programação semanal ou gerar registros padrão. A precedência da exceção é aplicada nas alterações administrativas e no cálculo de horários da tela do cliente; este endpoint apenas lista seus dados.

### Gravação e exclusão de exceções

`PUT /api/operating-hours/exceptions/:date` cria ou substitui a exceção da data da URL. Aceita datas reais em `YYYY-MM-DD`, entre os anos 1000 e 9999, inclusive passadas. Recebe somente `open` booleano, `shifts` e `reason` opcional, texto de até 120 caracteres (padrão `""`). As regras de turnos são as mesmas da semana. Exemplo:

```json
{ "open": true, "shifts": [{ "start": "11:15", "end": "16:00" }], "reason": "Horário especial" }
```

Retorna 200 tanto ao criar quanto ao substituir, com a exceção completa no formato do GET. A data identifica o registro: salvar novamente não duplica; campos omitidos não são preservados numa substituição, então omitir `reason` limpa o motivo. `id`, `date` e `updatedAt` não são aceitos no corpo. Query, data ou corpo inválidos retornam 400; sem sessão, 401; cliente, 403. A exceção substitui a semana nessa data, inclusive para abrir um dia semanalmente fechado.

`DELETE /api/operating-hours/exceptions/:date` recebe somente a data na URL, sem query ou dados no corpo. Retorna 200 com `{ "message": "Exceção removida com sucesso." }`; se a exceção não existe ou já foi excluída, retorna 404. Datas/dados inválidos retornam 400; sem sessão, 401; cliente, 403. Após a remoção, volta a valer a programação semanal.

As duas operações usam a trava de `operating_settings.id = 1` como primeira leitura da transação. Consultas, validação das reservas e gravação/exclusão usam a mesma conexão. Reservas ativas com término ainda futuro, inclusive em andamento no fuso `America/Sao_Paulo`, devem caber por inteiro em um único turno. O PUT verifica a exceção proposta; o DELETE verifica a programação semanal que voltará a valer. Incompatibilidade retorna 409 com data e mesa, preservando os dados. Reservas passadas ou com status definitivo não bloqueiam. A operação não altera a semana nem o histórico das reservas.

### Tela administrativa de horários

Em Configurações, a programação semanal usa GET e PUT em `/api/operating-hours`; as exceções usam GET, PUT e DELETE em `/api/operating-hours/exceptions`. Semana e exceções carregam independentemente, com mensagens e botões Recarregar próprios. Cada formulário fica desabilitado até seu carregamento terminar com sucesso. Uma falha não é apresentada como programação padrão ou lista vazia, nem impede o outro formulário de carregar.

Ao salvar, o frontend envia `weekly` com os campos do formulário e usa a configuração retornada pelo servidor. Os controles ficam desabilitados durante a gravação. A validação local auxilia o preenchimento; a decisão sobre reservas é do backend. Mensagens de erro da API, incluindo conflitos com data e mesa, aparecem na tela e preservam os valores digitados para correção. Os turnos aceitam precisão de um minuto; o intervalo de 30 minutos se refere aos horários ofertados para reserva.

As exceções podem ser criadas, editadas, fechadas e excluídas pela tela. O formulário é limpo somente após salvar com sucesso; falhas preservam os valores digitados. A lista é atualizada pela resposta do servidor e os controles ficam desabilitados durante cada operação. A data identifica o registro: mudar a data no formulário salva outra exceção, sem mover a anterior. A exclusão não depende de carregar reservas pelo navegador: sua proteção é aplicada no servidor.

A tela do cliente consulta o funcionamento efetivo pela API de disponibilidade descrita abaixo. A exceção tem prioridade sobre a semana; ao removê-la, a semana volta a valer. A criação da reserva revalida esse funcionamento no servidor.

### Disponibilidade e tela de reservas

`GET /api/availability` exige `data` real e não passada (`YYYY-MM-DD`) e `pessoas` inteiro de 1 a 8. `horario` é opcional, em `HH:mm`; vazio é tratado como ausente. Parâmetros desconhecidos, repetidos ou malformados retornam 400. Sem sessão válida, retorna 401. Cliente e administrador podem consultar.

O backend aplica a exceção da data ou, na ausência dela, o dia semanal. Calcula permanência de 90 minutos para 1–2 pessoas, 120 para 3–4 e 150 para 5–8. Os horários começam no início de cada turno e avançam a cada 30 minutos; toda a permanência deve caber em um único turno. A antecedência mínima de 180 minutos usa o relógio do servidor no fuso `America/Sao_Paulo`, incluindo segundos e a virada do dia.

A resposta contém `data`, `pessoas`, `horario`, `duracaoMinutos`, `fimPrevisto`, `closed`, `horarioPermitido`, `slots`, `reason` e `mesas`:

- Sem horário: retorna os slots, `horario: null`, `fimPrevisto: null`, `horarioPermitido: false` e `mesas: []`.
- Com horário permitido: retorna término previsto e todas as mesas ordenadas por número, com os campos públicos de Mesa, mais `visualStatus` e `motivo`.
- Mesa desativada ou sem capacidade fica `indisponivel`; caso contrário, conflito com reserva ativa resulta em `reservada`; nos demais casos, `disponivel`.
- Há sobreposição quando a reserva começa antes do término consultado e termina após o início consultado. Períodos encostados são permitidos; reservas canceladas/finalizadas/não comparecimento ou de outra data não bloqueiam.
- Dia fechado: 200, `closed: true`, sem slots/mesas e motivo explicando o fechamento. Dia aberto sem slots também retorna 200, com `closed: false`.
- Horário real fora dos slots: 200, `horarioPermitido: false`, término nulo, sem mesas e motivo orientando outra escolha.

Funcionamento e condição das mesas são lidos na mesma transação de leitura (InnoDB/REPEATABLE READ), sem travar as gravações administrativas. A consulta retorna somente a condição por mesa: não inclui IDs/objetos de reservas, nomes, e-mails ou identidade dos clientes. Slots representam horários permitidos, mesmo quando nenhuma mesa está livre. Disponibilidade não confirma uma reserva; o POST faz nova validação transacional ao gravar.

Em Reservas, escolher data/pessoas consulta os horários; escolher um horário carrega o mapa e a lista acessível. Com seleção completa, o acompanhamento consulta a cada 3 segundos. Trocar filtros ou recarregar descarta a seleção anterior, cancela a requisição/acompanhamento anterior e ignora respostas antigas. Durante o acompanhamento, uma mesa selecionada que deixe de estar disponível é desmarcada. Falhas retiram as opções antigas e exibem a mensagem da API; Recarregar disponibilidade permite tentar novamente. O acompanhamento também recupera a exibição após uma falha, mesmo se os dados voltarem iguais aos anteriores.

A página usa `/api/auth/*`, `/api/availability` e POST `/api/reservations`; não busca reservas de outros clientes nem depende de `/api/data`.

### Criar reserva — M10

`POST /api/reservations` é exclusivo de cliente autenticado. Enviar somente:

```json
{ "mesaId": "2", "data": "2030-11-11", "horario": "18:00", "pessoas": 4 }
```

Todos os campos são obrigatórios. `mesaId` é uma string decimal positiva até 4294967295; data/horário devem ser reais e `pessoas` um número inteiro entre 1 e 8. Campos extras e query são rejeitados. Identidade vem da sessão; duração, término e status inicial `ativa` são definidos no servidor, e a criação recebe o timestamp do banco.

- **201:** reserva completa com IDs em string, dados do próprio cliente e da mesa obtidos por relacionamento, período, pessoas, duração, status e `createdAt` numérico em milissegundos. Auditoria inicial: `statusUpdatedAt`, `statusUpdatedBy` e `statusUpdatedByName` nulos; `statusReason` vazio.
- **400:** entrada inválida, data passada ou período que não atende funcionamento/antecedência.
- **401/403:** sem sessão / perfil diferente de cliente.
- **404:** mesa inexistente.
- **409:** mesa desativada, capacidade insuficiente ou sobreposição com reserva ativa.

O controller inicia uma transação e sua primeira leitura é `SELECT id FROM operating_settings WHERE id = 1 FOR UPDATE`, a trava comum às alterações de disponibilidade. Depois bloqueia a mesa, consulta o funcionamento e revalida os slots com o relógio de São Paulo atualizado após a espera. Consulta conflitos, insere e lê a resposta pela mesma conexão antes do commit. Falhas desfazem a operação e a conexão é sempre liberada. Duas criações conflitantes são serializadas: apenas uma confirma. Períodos encostados continuam permitidos.

Na tela, Confirmar reserva só fica habilitado com filtros completos e uma mesa disponível selecionada. Durante o envio, filtros, seleção e recarga ficam bloqueados, o botão mostra “Confirmando reserva...” e o acompanhamento de disponibilidade é cancelado. Novos envios são ignorados enquanto o primeiro aguarda resposta. Sucesso exibe mesa/data/período/pessoas retornados pela API; rejeição exibe a mensagem do servidor. Nos dois casos a seleção é limpa e a disponibilidade é consultada novamente, sem repetir automaticamente o POST. A gestão administrativa de reservas segue pendente do M12.

### Minhas reservas — M11

`GET /api/reservations/mine` é exclusivo de cliente autenticado. Não recebe corpo nem filtros; qualquer parâmetro de query, inclusive `usuarioId`, retorna 400. Corpos enviados como JSON (inclusive `{}`/`[]`) ou outro tipo de conteúdo também são rejeitados. Sem sessão retorna 401; administrador recebe 403.

A resposta 200 é um array com os mesmos objetos completos de Reserva retornados na criação, limitado por `usuario_id` ao usuário da sessão no próprio SQL. Inclui reservas passadas e futuras, ativas, finalizadas, canceladas e com não comparecimento, ordenadas por data, horário e ID crescentes. Sem reservas retorna `[]`. IDs são strings e timestamps numéricos em milissegundos; campos de auditoria preservam valores nulos ou os dados de encerramento existentes. Nome/e-mail são do próprio cliente; dados de mesa e nome do administrador responsável pelo status vêm dos relacionamentos, sem hashes de senha.

A página Minhas reservas usa somente `/api/auth/*` e `/api/reservations/mine`. Mostra número/capacidade da mesa, data, início/término, duração e pessoas conforme a resposta do servidor, além do status. Não consulta mesas separadamente nem recalcula o período. O botão Recarregar reservas fica desabilitado enquanto carrega e permite nova tentativa após falha. Erros mostram a mensagem da API, sem apresentar um histórico vazio como se a consulta tivesse sido bem-sucedida.

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

Para conferir a consulta de exceções, use um cliente HTTP manual em um banco de conferência:

1. Sem sessão, chamar GET `/api/operating-hours/exceptions` e conferir 401. Entrar como cliente e como administrador em sessões separadas; ambos devem consultar com 200.
2. Sem exceções no banco, conferir `[]`. Preparar no MySQL um fechamento, um dia aberto com um turno e outro com dois turnos, inseridos fora da ordem de data e incluindo uma data passada.
3. Comparar a resposta com o MySQL: ordenação crescente, inclusão da data passada, `id` igual a `date`, booleanos reais, horários `HH:mm`, motivo vazio quando não preenchido e timestamp em milissegundos.
4. Acrescentar `?date=2030-11-15` e conferir 400. Sair e repetir a consulta; conferir 401.

Na tela Configurações, conferir manualmente no navegador:

1. Entrar como administrador e abrir a página. Na aba Rede, confirmar que o carregamento usa `/api/auth/me`, GET `/api/operating-hours` e GET `/api/operating-hours/exceptions`, sem requisições a `/api/data` ou a outros módulos. Conferir os sete dias, a lista de exceções e os valores salvos.
2. Alterar um dia para fechado, outro para um turno e outro para dois turnos. Salvar e conferir o PUT, a mensagem de sucesso e a persistência após recarregar. Experimentar um turno iniciado às 11:15.
3. Preencher um turno incompleto, horários invertidos ou sobrepostos; conferir a mensagem local. Com uma reserva ativa futura preparada no banco, tentar fechar seu dia e conferir a mensagem 409 do backend com data/mesa. Os valores digitados devem permanecer para correção.
4. Durante o carregamento e a gravação, conferir os controles desabilitados. Em uma falha inicial, nenhum horário padrão deve aparecer e Salvar deve continuar desabilitado. Restabelecer a API e clicar em Recarregar horários para recuperar o formulário.
5. Criar um fechamento, editar para um ou dois turnos e recarregar a página. Conferir o botão Editar, o preenchimento do formulário, motivo, persistência e exclusão. Conferir na tela do cliente os horários calculados com a exceção e, após excluí-la, com a semana.
6. Tentar alterar ou excluir uma exceção que protege uma reserva futura; conferir 409 com data/mesa, valores digitados e registro preservados. Encerrar a sessão em outra aba e tentar salvar/excluir; conferir a mensagem de sessão inválida. Simular falha em apenas uma das consultas e conferir que o outro formulário carrega e que Recarregar recupera a área afetada.

Para conferir PUT e DELETE de exceções em um cliente HTTP manual:

1. Sem sessão, conferir 401 em ambos; como cliente, 403. Como administrador, criar e substituir a mesma data, conferir 200 e ausência de duplicação pelo GET/SQL. Salvar com motivo omitido e conferir `reason: ""` e limpeza do segundo turno quando ele não for enviado.
2. Conferir 400 para datas inexistentes, formato incompleto, anos fora do intervalo, corpo vazio/lista, booleano inválido, turnos incompletos/invertidos/sobrepostos, mais de dois turnos, `24:00`, motivo não textual ou acima de 120 caracteres, campos extras e query. No DELETE, rejeitar corpo não vazio e lista. Datas bissextas válidas devem funcionar; repetição de DELETE retorna 404.
3. Preparar no MySQL reservas ativas futuras e em andamento. Tentar fechamento ou turno insuficiente pelo PUT e conferir 409 sem mudança. Reservas nos limites exatos de um único turno devem permitir salvar; uma permanência dividida entre dois turnos não deve permitir. Reservas passadas, canceladas, finalizadas ou de outra data não devem bloquear.
4. Abrir uma exceção em domingo fechado e preparar uma reserva nessa data. DELETE deve retornar 409; uma exceção cuja reserva cabe na semana deve permitir 200. Após exclusão, conferir retorno à programação semanal e preservação do histórico no MySQL.
5. Em outra conexão, manter a trava de configuração numa transação aberta; enviar PUT/DELETE e inserir uma reserva antes do COMMIT. A requisição deve aguardar a liberação e considerar a reserva confirmada. Em erro SQL provocado em banco de conferência, a exceção anterior deve permanecer intacta.

Para conferir a disponibilidade manualmente:

1. Sem sessão e após logout, conferir 401. Com cliente e administrador, conferir 200. Rejeitar data passada/inexistente, pessoas fora de 1–8/fracionárias, horário inválido, parâmetros extras e valores repetidos com 400.
2. Consultar sem horário para 2, 4 e 6 pessoas; comparar slots e durações de 90/120/150 minutos. Testar turnos começando às 11:15 e conferir slots ancorados nesse início, sem atravessar o fim ou o intervalo entre turnos. Conferir a antecedência de hoje, incluindo seu limite exato, segundos e virada do dia.
3. Criar uma exceção aberta em domingo fechado, um fechamento em dia normalmente aberto e um turno menor que a duração da reserva. Conferir prioridade da exceção, `closed`, lista de slots vazia e motivos. Horário real fora dos slots deve retornar 200 sem mesas/término.
4. Preparar reservas no MySQL para conferir sobreposição, períodos encostados, status definitivos e outra data. Comparar as condições retornadas com SQL, incluindo capacidade insuficiente e mesa desativada antes do status de conflito. Conferir ordenação, IDs em string, timestamps e ausência de dados de outros usuários. Sem mesas cadastradas, horário permitido ainda retorna 200 com `mesas: []`.
5. No navegador, escolher filtros, selecionar pelo mapa e pela lista acessível, abrir/fechar o modal móvel, mudar pessoas/data/horário e recarregar. Conferir chamadas somente a `/api/availability`, descarte de respostas antigas e atualização a cada 3 segundos. Alterar uma mesa/reserva em outra sessão e conferir que uma seleção incompatível é removida.
6. Simular falha da API durante o acompanhamento e recuperar a conexão; conferir que as opções antigas deixam de ser selecionáveis e que a mesma resposta volta a ser exibida após recuperação. Trocar filtros e sair da página deve encerrar o acompanhamento anterior.

Para conferir a criação de reservas manualmente, use um banco de conferência e sessões distintas:

1. Sem sessão e após logout, conferir 401; como administrador, 403. Como cliente, criar uma reserva válida e conferir 201, objeto completo, autoria da sessão, duração/término, status `ativa`, timestamp e persistência por SQL.
2. Conferir 400 para campo ausente, corpo vazio/lista, query, ID numérico/zero/fora do limite, data inexistente/passada, horário inválido, pessoas textual/fracionária/fora de 1–8 e campos extras como `usuarioId`, `duracaoMinutos`, `fimPrevisto`, `status` ou timestamps. Mesa válida mas inexistente retorna 404.
3. Conferir 409 para mesa desativada, capacidade insuficiente e sobreposição ativa. Conferir 90/120/150 minutos para 2/4/6 pessoas, períodos encostados e reservas com status definitivo que não bloqueiam. Dia fechado, antecedência menor que 180 minutos, horário fora dos slots ou permanência que ultrapassa/divide turnos retornam 400. Exceção substitui semana, inclusive com slots iniciados às 11:15.
4. Em duas sessões de clientes diferentes, enviar solicitações conflitantes quase ao mesmo tempo. Conferir um 201, um 409 e apenas um registro ativo para o período. Manter a trava comum em outra conexão, enviar o POST e confirmar uma reserva conflitante ou fechar a data antes do COMMIT; o POST deve aguardar e considerar o novo estado. O relógio da antecedência é recalculado após essa espera.
5. Provocar uma falha SQL em banco de conferência, por exemplo com trigger temporária AFTER INSERT que gera SIGNAL. Conferir 500 sem detalhes de SQL e ausência da reserva no banco; remover a trigger e confirmar que uma nova solicitação válida funciona. Após criar uma reserva, alterações incompatíveis de mesa/funcionamento continuam retornando 409.
6. No navegador, selecionar mesa pelo mapa/lista e confirmar; conferir corpo com apenas os quatro campos, mensagem com dados reais e atualização do mapa. Durante o envio, tentar clique duplo/Enter e troca de filtros; deve haver apenas um POST e controles bloqueados. Simular disputa em outra sessão e conferir erro, limpeza da seleção e possibilidade de escolher outra mesa. Conferir também recuperação de falha, sessão encerrada, modal móvel e recarga/persistência. Essas interações visuais ainda precisam de execução manual e evidências da equipe.

Para conferir Minhas reservas manualmente:

1. Sem sessão e após logout, chamar GET `/api/reservations/mine` e conferir 401; como administrador, conferir 403. Como cliente sem reservas, conferir 200 com `[]` e `Cache-Control: no-store`.
2. Criar reservas com dois clientes em sessões distintas. Preparar também registros passados e com os quatro status em um banco de conferência. Cada cliente deve receber exclusivamente seus registros, com o objeto completo, mesa e formatos de IDs/datas/horários/timestamps corretos. Comparar a ordenação por data, horário e ID com SQL, incluindo empate de data/horário e auditoria de encerramento.
3. Como cliente A, tentar `?usuarioId=ID_DO_CLIENTE_B`, `?status=ativa` e corpo com `usuarioId`; todos devem retornar 400. Conferir também rejeição de `{}`, `[]` e corpo não JSON por um cliente HTTP manual que permita corpo em GET. Uma chamada sem filtros/corpo continua retornando apenas o histórico da sessão.
4. No navegador, abrir Minhas reservas após confirmar uma reserva. Conferir cards com dados reais, quatro rótulos de status, lista vazia para cliente novo e apenas chamadas de autenticação e `/api/reservations/mine`, sem `/api/tables` ou `/api/data`. Clicar Recarregar reservas e conferir carregamento, botão bloqueado e atualização dos dados. Essas interações visuais ainda precisam de execução manual e evidências da equipe.
5. Simular indisponibilidade da API ou falha SQL em banco de conferência: deve haver erro, sem histórico antigo/vazio apresentado como resultado válido. Restabelecer e recarregar; os mesmos registros devem voltar. Encerrar a sessão em outra aba e recarregar para conferir a mensagem de sessão inválida.

O comando `npm test` está configurado para o test runner do Node.js, mas esta versão ainda não contém arquivos de teste automatizado.

## Dados anteriores

A aplicação inicia com um banco novo. Contas e dados do provedor anterior não são importados automaticamente. O login social foi removido; os usuários devem se cadastrar novamente por e-mail/senha.

## Equipe

- Henrique Mamprim Melo
- Beatriz Krebs Yamaguchi
- Igor Biassi Severich
