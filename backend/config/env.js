const path = require('node:path');

// O caminho não depende da pasta em que o comando foi executado.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
