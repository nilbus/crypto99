const WebSocket = require('ws');
const EventEmitter = require('events');

module.exports = (app) => {
  class TradeEventEmitter extends EventEmitter {
    constructor() {
      super();
      this.messageHistory = [];
    }

    newTrade(message) {
      //if this message was received by another socket connection, don't emit it a second time
      const found = this.messageHistory.find(messageOld => messageOld.data.a === message.data.a);
      if(found) return;

      this.messageHistory.push(message);
      this.emit('aggTrade', message);

      const thirtySecondsAgo = message.data.T - 30000;
      this.messageHistory = this.messageHistory.filter(messageOld => messageOld.data.T > thirtySecondsAgo);
    }
  }

  app.tradeEvents = new TradeEventEmitter();

  /*const tester = [];
  app.tradeEvents.on('aggTrade', (message) => {
    if (message.symbol !== 'xrp_btc') return;
    const found = tester.find(oldmessage => oldmessage.data.a === message.data.a);
    if (found) console.log('there was a duplicate: ', message.data.a);
    //else console.log('not duplicate: ', message.data.a);
    tester.push(message);
  });*/

  const initiateSockets = async (input = {}) => {
    /*
     *  initiates a websocket connection to binance to receive real time trade data from all added currency pairs
     *  @params: currency_pair_id: Int || symbol: String
     */

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

    console.log('connecting binance websocket to url: ', baseWSS + streamNames);
    const ws = new WebSocket(baseWSS + streamNames);

    ws.on('message', (JSONstring) => {
      const message = JSON.parse(JSONstring);
      message.symbol = symbolLookup[message.stream];
      app.tradeEvents.newTrade(message);
    });

    ws.on('open', () => {
      console.log('websocket connection is open');
      // give some overlap to make sure new connection is receiving data before old one is closed
      if (input.oldWS) setTimeout(() => input.oldWS.terminate(), 5000);
      // 23 hours
      setTimeout(() => initiateSockets({...input, oldWS: ws}), 82800000);
    });

    ws.on('close', () => {
      console.log('ws was closed');
    });

    ws.on('error', (error) => {
      console.log('web socket error: ', error);
      ws.close(403, 'because');
      ws.terminate();
    });

  };

  return initiateSockets;
};