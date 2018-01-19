const initiateBinanceStreams = require('./initiate');

module.exports = (app) => {
  return {
    initiate: initiateBinanceStreams(app)
  };
};