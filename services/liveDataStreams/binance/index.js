const WebSocket = require('ws');
const EventEmitter = require('events');
const saveStreamData = require('./saveStreamData');

module.exports = (app) => {
  const SaveAggTradeStream = saveStreamData(app);

  class TradeEventEmitter extends EventEmitter {
    constructor() {
      super();
      this.messageHistory = [];
      this.btcusdtHistory = [];
    }

    newTrade(message) {
      //if this message was received by another socket connection, don't emit it a second time
      const found = this.messageHistory.find(messageOld => messageOld.data.a === message.data.a);
      if(found) return;

      this.messageHistory.push(message);
      if (message.symbol === 'btc_usdt') {
        this.handleNewUSDTTrade(message);
        return;
      }

      this.emit('aggTrade', message);

      const thirtySecondsAgo = message.data.T - 30000;
      this.messageHistory = this.messageHistory.filter(messageOld => messageOld.data.T > thirtySecondsAgo);
    }

    handleNewUSDTTrade(message) {
      const trade = message.data;
      this.btcusdtHistory.push({
        price: trade.p,
        trade_time: trade.T,
        binance_trade_id: trade.a
      });
      let fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 5);
      this.btcusdtHistory = this.btcusdtHistory.filter(trade => Date.parse(trade.trade_time) > fourDaysAgo)
    }
  }

  app.tradeEvents = new TradeEventEmitter();
  SaveAggTradeStream.listen();

  const restartSockets = async (input) => {
    app.tradeEvents.ws.terminate();
    await initiateSockets();
    return {success: true};
  };

  const initiateSockets = async (input = {}) => {
    /*
     *  initiates a websocket connection to binance to receive real time trade data from all added currency pairs
     *  @params: currency_pair_id: Int || symbol: String
     */

    if (!app.tradeEvents.btcusdtHistory.length) {
      app.tradeEvents.btcusdtHistory = await getBTCUSDHistory();
    }

    let symbols = await app.pg.query(`
      select symbol from currency_pairs
    `);

    const symbolLookup = {};
    const streamNames = symbols.map(row => {
      const streamName = row.symbol.replace('_', '').toLowerCase() + '@aggTrade';
      symbolLookup[streamName] = row.symbol;
      return streamName;
    })
      .join('/');

    const baseWSS = 'wss://stream.binance.com:9443/stream?streams=';

    await new Promise((resolve, reject) => {
      console.log('connecting binance websocket to url: ', baseWSS + streamNames);
      const ws = new WebSocket(baseWSS + streamNames);

      ws.on('message', (JSONstring) => {
        const message = JSON.parse(JSONstring);
        message.symbol = symbolLookup[message.stream];
        app.tradeEvents.newTrade(message);
      });

      ws.on('open', () => {
        console.log('websocket connection is open');
        app.tradeEvents.ws = ws;
        app.tradeEvents.emit('open', ws);
        // give some overlap to make sure new connection is receiving data before old one is closed
        if (input.oldWS) setTimeout(() => input.oldWS.terminate(), 5000);
        // 23 hours
        setTimeout(() => initiateSockets({...input, oldWS: ws}), 15000);
        //82800000
        resolve();
      });

      ws.on('close', () => {
        console.log('ws was closed');
        app.tradeEvents.emit('close', ws);
      });

      ws.on('error', (error) => {
        console.log('web socket error: ', error);
        app.tradeEvents.emit('error', error);
        ws.close(403, 'because');
        ws.terminate();
        reject(error);
      });
    });

    return {success: true};
  };

  const getBTCUSDHistory = async () => {
    try {
      const result = await app.pg.query(`
        select binance_trade_id, price, trade_time
        from binance_trades_btc_usdt
        where trade_time > NOW() - interval '4 days'
        order by binance_trade_id asc
      `);

      let hasTradeGaps = false;
      let tradeId = result && result.binance_trade_id;
      for (let i = 0; i < result.length; i++) {
        const trade = result[i];
        if (trade.binance_trade_id !== tradeId) hasTradeGaps = true;
        tradeId += 1;
      }

      if (hasTradeGaps || !result.length) {
        app.canTrade = false;
        return [];
      }

      return result;

    } catch(err) {
      console.log('there was an error getting btc_usdt price history. Err: ', err);
      app.canTrade = false;
      return [];
    }

  };

  return {
    initiateSockets,
    restartSockets
  };
};