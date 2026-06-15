<p align="center">
  <img src="src/assets/logo-reservae.png" alt="Reservaê" width="220" />
</p>

Aplicacao web simples para gerenciamento e reserva de mesas de restaurante.

## Sobre

O objetivo da aplicacao e permitir que clientes reservem mesas online e que administradores gerenciem mesas, reservas e mensagens em uma aplicacao web integrada ao Firebase.

A autenticacao usa Firebase Authentication e os dados ficam no Firebase Realtime Database.

## Equipe

- Nome do integrante 1: Henrique Mamprim Melo
- Nome do integrante 2: Beatriz Krebs Yamaguchi
- Nome do integrante 3: Igor Biassi Severich

## Funcionalidades

- Login com e-mail/senha ou Google
- Cadastro de cliente
- Controle de acesso por perfil de administrador ou cliente
- Cadastro, edicao e remocao de mesas pelo administrador
- Visualizacao do mapa de mesas do restaurante
- Criacao de reservas por clientes
- Bloqueio de reservas sobrepostas para a mesma mesa, data e horario
- Consulta das reservas feitas pelo cliente
- Listagem de reservas no painel administrativo
- Filtros dinamicos para mesas e reservas
- Envio de mensagens de contato pelo cliente
- Acompanhamento e alteracao de status das mensagens pelo administrador
- Controle administrativo dos dias e horarios de funcionamento
- Finalizacao administrativa das reservas e relatorio simples

## Filtros

Na tela `src/pages/reservas.html`, o cliente pode filtrar a disponibilidade das mesas por:

- Data da reserva
- Horario da reserva
- Quantidade de pessoas

Na tela `src/pages/admin.html`, o administrador pode filtrar reservas por:

- Data
- Status
- Nome do cliente ou numero da mesa

Os filtros do administrador podem ser combinados e possuem contador de resultados e botao para limpar filtros.

Exemplo para validar:

- No cliente, altere data, horario e quantidade de pessoas; mesas ja reservadas ou com capacidade menor ficam indisponiveis.
- No admin, filtre uma data, escolha um status e pesquise pelo nome do cliente ou pelo numero da mesa; o contador deve atualizar sem recarregar a pagina.

## Contato

Na tela `src/pages/reservas.html`, o cliente logado pode enviar uma mensagem com assunto e texto. A mensagem fica salva em `/messages` no Realtime Database com usuario, e-mail, status e data de criacao.

Na tela `src/pages/admin.html`, o administrador visualiza todas as mensagens e pode alterar o status para `aberta`, `lida` ou `respondida`.

## Funcionamento e reservas

O administrador controla os dias de funcionamento do restaurante com ate dois turnos por dia e excecoes para datas especificas.

Regras principais:

- Horarios de reserva sao gerados em intervalos de 30 minutos.
- Reservas para o mesmo dia exigem 3 horas de antecedencia.
- A permanencia prevista depende da quantidade de pessoas: 1-2 pessoas por 1h30, 3-4 pessoas por 2h e 5+ pessoas por 2h30.
- Cada reserva salva `duracaoMinutos` e `fimPrevisto` para manter historico consistente.
- Excecoes por data sobrescrevem o horario semanal.
- Uma data pode ser marcada como fechada ou com horario especial.
- O admin nao consegue salvar uma alteracao que invalide reservas ativas existentes.
- O mapa de mesas so carrega depois que o cliente escolhe uma data.
- O mapa acompanha em tempo real as reservas ativas da data selecionada.
- Uma reserva ativa bloqueia a mesa somente no intervalo previsto da reserva.
- Se nao houver horarios validos, o cliente recebe a mensagem para escolher outro dia.

A documentacao completa esta em `src/assets/docs/REGRAS_FUNCIONAMENTO_RESERVAS.md`.

## Ciclo de vida das reservas

O administrador pode concluir uma reserva ativa com status definitivo:

- `finalizada`: cliente foi atendido e encerrou a visita.
- `cancelada`: cliente cancelou por telefone, presencialmente ou outro canal.
- `nao_compareceu`: cliente nao apareceu no horario reservado.

Ao alterar o status, o sistema salva data da alteracao, admin responsavel e motivo/observacao opcional. Status definitivo nao volta para `ativa` pelo painel.

O painel administrativo tambem possui relatorio simples com filtros por periodo, status, cliente ou mesa.

A documentacao completa esta em `src/assets/docs/CICLO_DE_VIDA_RESERVAS.md`.

## Tecnologias

- HTML
- CSS com Tailwind via CDN
- JavaScript ES Modules
- Firebase Authentication
- Firebase Realtime Database
- Firebase Hosting

## Estrutura

```text
src/
  404.html
  index.html
  app.js
  css/
    app.css
    README.md
  js/
    admin.js
    auth.js
    cadastro.js
    firebaseConfig.js
    minhas-reservas.js
    reservas.js
    services/
      messages-service.js
      operating-hours-service.js
      realtime-database-service.js
      reservations-service.js
      session-storage-service.js
      tables-service.js
      users-service.js
    ui.js
  pages/
    admin.html
    cadastro.html
    minhas-reservas.html
    reservas.html
  assets/
    docs/
```

As paginas principais possuem `header`, `main`, `footer`, link para pular ao conteudo e foco visivel para navegacao por teclado.

## Como executar

Instale as dependencias e inicie o hosting local do Firebase:

```bash
npm install
npm run dev
```

Depois acesse a URL exibida no terminal.

## Como testar

1. Acesse `https://reservae-5874f.web.app/` ou rode localmente com `npm run dev`.
2. Crie uma conta de cliente pela tela de cadastro ou entre com Google.
3. Como cliente, teste filtros de data, horario e quantidade de pessoas em `src/pages/reservas.html`.
4. Crie uma reserva e confira a listagem em `Minhas reservas`.
5. Envie uma mensagem de contato na tela de reservas.
6. Entre como administrador e valide CRUD de mesas, filtros de reservas e status das mensagens.

## Firebase

- Realtime Database: `https://reservae-5874f-default-rtdb.firebaseio.com/`
- Hosting publico: `https://reservae-5874f.web.app/`

## Usuarios de teste

Administrador: Só é possível virar admin através de alteração direta no banco de dados.

Cliente:

```text
Use a tela de cadastro para criar uma conta de cliente é (possível entrar com o Google).
```

## Observacoes de deploy

- O Hosting publica a pasta `src`.
- O projeto nao usa rewrite de SPA; as paginas HTML internas funcionam como paginas separadas.
- A pasta `src/assets/docs` e ignorada no deploy para nao publicar documentacao interna.
