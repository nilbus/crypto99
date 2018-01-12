const binance = require('./binance');

module.exports = (app) => {

  return {
    binance: binance(app)
  }
};