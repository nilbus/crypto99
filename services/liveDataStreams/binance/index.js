const saveStreamData = require('./saveStreamData');
const TradeEventEmitter = require('./TradeEventEmitter');
const sockets = require('./sockets');

module.exports = (app) => {
  const SaveAggTradeStream = saveStreamData(app);
  app.tradeEvents = new TradeEventEmitter();
  SaveAggTradeStream.listen();

  return sockets(app);
};