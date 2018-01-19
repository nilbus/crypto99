const binanceLiveStream = require('./binance');

module.exports = (app) => {
  return {
    binance: binanceLiveStream(app)
  }
};