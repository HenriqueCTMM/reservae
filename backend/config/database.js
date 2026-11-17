require('./env');
const mysql = require('mysql2/promise');
const { databaseSettings } = require('./settings');

const pool = mysql.createPool(databaseSettings());

module.exports = pool;
