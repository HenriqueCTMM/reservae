# Reservae

Aplicacao web simples para gerenciamento e reserva de mesas de restaurante.

## Sobre

O projeto permite que clientes reservem mesas e que administradores gerenciem mesas e acompanhem reservas. A autenticacao usa Firebase Authentication e os dados ficam no Firebase Realtime Database.

## Funcionalidades

- Login com e-mail/senha ou Google
- Cadastro de cliente
- Controle de acesso por perfil de administrador ou cliente
- Cadastro, edicao e remocao de mesas pelo administrador
- Visualizacao do mapa de mesas do restaurante
- Criacao de reservas por clientes
- Bloqueio de reservas duplicadas para a mesma mesa, data e horario
- Consulta das reservas feitas pelo cliente
- Listagem de reservas no painel administrativo
- Filtros dinamicos para mesas e reservas
- Envio de mensagens de contato pelo cliente
- Acompanhamento e alteracao de status das mensagens pelo administrador

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
  index.html
  app.js
  js/
    admin.js
    auth.js
    cadastro.js
    firebaseConfig.js
    minhas-reservas.js
    reservas.js
    services/
    ui.js
  pages/
    admin.html
    cadastro.html
    minhas-reservas.html
    reservas.html
```

## Como executar

Instale as dependencias e inicie o hosting local do Firebase:

```bash
npm install
npm run dev
```

Depois acesse a URL exibida no terminal.

## Firebase

- Realtime Database: `https://reservae-5874f-default-rtdb.firebaseio.com/`
- Hosting publico: `https://realtime25-c5f73.web.app/`
- Administrador inicial: `henriquemamprim.m@gmail.com`

O login com Google sempre cria ou acessa perfil de cliente.
