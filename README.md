<p align="center">
  <img src="src/assets/logo-reservae.png" alt="Reservaê" width="220" />
</p>

Aplicação web simples para gerenciamento e reserva de mesas de restaurante.

## Sobre

O objetivo da aplicação é permitir que clientes reservem mesas online e que administradores gerenciem mesas, reservas e mensagens em uma aplicação web integrada ao Firebase.

A autenticação usa Firebase Authentication e os dados ficam no Firebase Realtime Database.

## Equipe

- Nome do integrante 1: Henrique Mamprim Melo
- Nome do integrante 2: Beatriz Krebs Yamaguchi
- Nome do integrante 3: Igor Biassi Severich

## Funcionalidades

- Login com e-mail/senha ou Google
- Cadastro de cliente
- Controle de acesso por perfil de administrador ou cliente
- Cadastro, edição e remoção de mesas pelo administrador
- Visualização do mapa de mesas do restaurante
- Criação de reservas por clientes
- Bloqueio de reservas sobrepostas para a mesma mesa, data e horário
- Consulta das reservas feitas pelo cliente
- Listagem de reservas no painel administrativo
- Filtros dinâmicos para mesas e reservas
- Envio de mensagens de contato pelo cliente
- Acompanhamento e alteração de status das mensagens pelo administrador
- Controle administrativo dos dias e horários de funcionamento
- Finalização administrativa das reservas e relatório simples

## Filtros

Na tela `src/pages/reservas.html`, o cliente pode filtrar a disponibilidade das mesas por:

- Data da reserva
- Horário da reserva
- Quantidade de pessoas

Na tela `src/pages/admin.html`, o administrador pode filtrar reservas por:

- Data
- Status
- Nome do cliente ou número da mesa

Os filtros do administrador podem ser combinados e possuem contador de resultados e botão para limpar filtros.

Exemplo para validar:

- No cliente, altere data, horário e quantidade de pessoas; mesas já reservadas ou com capacidade menor ficam indisponíveis.
- No admin, filtre uma data, escolha um status e pesquise pelo nome do cliente ou pelo número da mesa; o contador deve atualizar sem recarregar a página.

## Contato

Na tela `src/pages/reservas.html`, o cliente logado pode enviar uma mensagem com assunto e texto. A mensagem fica salva em `/messages` no Realtime Database com usuário, e-mail, status e data de criação.

Na tela `src/pages/admin.html`, o administrador visualiza todas as mensagens e pode alterar o status para `aberta`, `lida` ou `respondida`.

## Funcionamento e reservas

O administrador controla os dias de funcionamento do restaurante com até dois turnos por dia e exceções para datas específicas.

Regras principais:

- Horários de reserva são gerados em intervalos de 30 minutos.
- Reservas para o mesmo dia exigem 3 horas de antecedência.
- A permanência prevista depende da quantidade de pessoas: 1-2 pessoas por 1h30, 3-4 pessoas por 2h e 5+ pessoas por 2h30.
- Cada reserva salva `duracaoMinutos` e `fimPrevisto` para manter histórico consistente.
- Exceções por data sobrescrevem o horário semanal.
- Uma data pode ser marcada como fechada ou com horário especial.
- O admin não consegue salvar uma alteração que invalide reservas ativas existentes.
- O mapa de mesas só carrega depois que o cliente escolhe uma data.
- O mapa acompanha em tempo real as reservas ativas da data selecionada.
- Uma reserva ativa bloqueia a mesa somente no intervalo previsto da reserva.
- Se não houver horários válidos, o cliente recebe a mensagem para escolher outro dia.

A documentação completa está em `src/assets/docs/REGRAS_FUNCIONAMENTO_RESERVAS.md`.

## Ciclo de vida das reservas

O administrador pode concluir uma reserva ativa com status definitivo:

- `finalizada`: cliente foi atendido e encerrou a visita.
- `cancelada`: cliente cancelou por telefone, presencialmente ou outro canal.
- `nao_compareceu`: cliente não apareceu no horário reservado.

Ao alterar o status, o sistema salva data da alteração, admin responsável e motivo/observação opcional. Status definitivo não volta para `ativa` pelo painel.

O painel administrativo também possui relatório simples com filtros por período, status, cliente ou mesa.

A documentação completa está em `src/assets/docs/CICLO_DE_VIDA_RESERVAS.md`.

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

## Acessibilidade

O projeto inclui melhorias para navegação por teclado, baixa visão e leitores de tela:

- As páginas principais usam `header`, `main`, `footer` e link para pular ao conteúdo.
- Os menus indicam a página atual com `aria-current`.
- Formulários usam labels, textos de ajuda com `aria-describedby`, mensagens de erro por campo e `aria-invalid`.
- Mensagens de sucesso e erro usam regiões anunciáveis com `aria-live`.
- Os modais de mapa possuem `role="dialog"`, `aria-modal`, fechamento com `Esc`, retorno de foco e armadilha de foco com `Tab`.
- O mapa de mesas do cliente usa botões reais, `aria-label` descritivo e texto visível de status para não depender apenas de cor.
- O cliente também possui uma lista textual alternativa com mesas disponíveis, reservadas e indisponíveis.
- Tabelas possuem cabeçalhos com `scope="col"`.
- O CSS respeita `prefers-reduced-motion` e reforça contraste em textos de apoio.

Validações recomendadas:

- Navegar pelas telas usando apenas teclado (`Tab`, `Shift + Tab`, `Enter`, `Espaço` e `Esc`).
- Testar o fluxo de reserva com leitor de tela real, como NVDA no Windows.
- Conferir contraste e tamanho de texto em telas pequenas, incluindo 320px de largura.

## Como executar

Instale as dependências e inicie o hosting local do Firebase:

```bash
npm install
npm run dev
```

Depois acesse a URL exibida no terminal.

## Como testar

1. Acesse `https://reservae-5874f.web.app/` ou rode localmente com `npm run dev`.
2. Crie uma conta de cliente pela tela de cadastro ou entre com Google.
3. Como cliente, teste filtros de data, horário e quantidade de pessoas em `src/pages/reservas.html`.
4. Crie uma reserva e confira a listagem em `Minhas reservas`.
5. Envie uma mensagem de contato na tela de reservas.
6. Para testar como administrador, altere manualmente o campo `perfil` do usuário no Realtime Database para `admin`.
7. Entre como administrador e valide CRUD de mesas, filtros de reservas e status das mensagens.

## Firebase

- Realtime Database: `https://reservae-5874f-default-rtdb.firebaseio.com/`
- Hosting público: `https://reservae-5874f.web.app/`

## Usuários de teste

Administrador:

Para transformar uma conta em administradora, acesse o Realtime Database e altere o campo `perfil` do registro do usuário em `/users/{uid}` para `admin`.

Exemplo:

```text
users
  {uid-do-usuario}
    perfil: "admin"
```

Cliente:

```text
Use a tela de cadastro para criar uma conta de cliente ou entre com o Google.
```

## Observações de deploy

- O Hosting publica a pasta `src`.
- O projeto não usa rewrite de SPA; as páginas HTML internas funcionam como páginas separadas.
- A pasta `src/assets/docs` é ignorada no deploy para não publicar documentação interna.
