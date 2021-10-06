
const Pool = require('pg').Pool;

var pool = new Pool({
  user: 'admin', // get from .env
  host: 'localhost',
  database: 'api',
  password: '', // get from .env
  port: 5432,
});
