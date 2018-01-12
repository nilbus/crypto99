const pgp = require('pg-promise')();
const config = require('./config');

module.exports = function(app) {
  app.pgPromise = pgp;
  app.pg = pgp(config.postgres.connectionObject);
};