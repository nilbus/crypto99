const binance = require('./binance');
const backFillManager = require('./backFillManager');

module.exports = (app) => {

  return {
    binance: binance(app),
    status: backFillManager(app),
    backfillUSD: backfillUSD(app)
  }
};