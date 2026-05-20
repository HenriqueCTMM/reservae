# Restaurante App

Aplicacao web simples para gerenciamento e reserva de mesas de restaurante.

## Sobre

O projeto permite que clientes reservem mesas e que administradores gerenciem mesas e acompanhem reservas. Os dados sao armazenados no `localStorage` do navegador.

## Funcionalidades

- Login com perfil de administrador ou cliente
- Cadastro, edicao e remocao de mesas pelo administrador
- Visualizacao do mapa de mesas do restaurante
- Criacao de reservas por clientes
- Consulta das reservas feitas pelo cliente
- Listagem de reservas no painel administrativo

## Tecnologias

- HTML
- CSS com Tailwind via CDN
- JavaScript ES Modules
- LocalStorage

## Estrutura

```text
src/
  index.html
  app.js
  style.css
  js/
    admin.js
    auth.js
    data.js
    minhas-reservas.js
    reservas.js
    storage.js
    ui.js
  pages/
    admin.html
    minhas-reservas.html
    reservas.html
```

## Como executar

Abra o arquivo `src/index.html` em um navegador moderno.

Se preferir usar um servidor local, execute na raiz do projeto:

```bash
npx serve src
```

Depois acesse a URL exibida no terminal.

## Usuarios de teste

Administrador:

```text
E-mail: admin@restaurante.com
Senha: 123456
```

Cliente:

```text
E-mail: cliente@restaurante.com
Senha: 123456
```

## Observacoes

- As informacoes ficam salvas apenas no navegador usado.
- Para resetar os dados, limpe o `localStorage` do navegador.
