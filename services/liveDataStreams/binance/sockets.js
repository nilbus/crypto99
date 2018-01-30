const WebSocket = require('ws');
const emailer = require('../../emailer');
module.exports = (app) => {

  const restartSocket = async (input) => {
    // @params: symbols: [String], name: String
    app.tradeEvents[input.name].terminate();
    await initiateSocket(input);
    return {success: true};
  };

  const initiateSocket = async (input = {}) => {
    /*
     *  initiates a websocket connection to binance to receive real time trade data from all added currency pairs
     *  @params: symbols: [String], name: String
     */

    let symbols = input.symbols;
    if (!symbols) {
      symbols = await app.pg.query(`
        select symbol from currency_pairs
      `);
    }

    const symbolLookup = {};
    const streamNames = symbols.map(row => {
      const symbol = typeof row === 'string' ? row : row.symbol;
      const streamName = symbol.replace('_', '').toLowerCase() + '@aggTrade';
      symbolLookup[streamName] = symbol;
      return streamName;
    })
      .join('/');

    input.symbolLookup = symbolLookup;

    const baseWSS = 'wss://stream.binance.com:9443/stream?streams=';
    const connectionUrl = baseWSS + streamNames;
    await createWebSocket(input, connectionUrl);

    return {success: true,};
  };

  const createWebSocket = (input, connectionUrl) => {
    return new Promise((resolve, reject) => {
      console.log('connecting binance websocket to url: ', connectionUrl);
      const ws = new WebSocket(connectionUrl);

      ws.on('message', (JSONstring) => {
        const message = JSON.parse(JSONstring);
        message.symbol = input.symbolLookup[message.stream];
        try {
          app.tradeEvents.newTrade(message);
        } catch (err) {
          if (err === 30 && app.tradeEvents.usdWS) {
            app.tradeEvents.usdWS.terminate();
            app.tradEvents.usdWS = undefined;
            console.log('could not find usd price from the last 30 seconds. Restarting usd socket');
            initiateSocket({symbols: ['btc_usdt'], name: 'usdWS'})
              .catch(err => { console.log('the retry to connect to usd socket failed, ', err)});
          }
        }

      });

      ws.on('open', () => {
        console.log(`websocket ${input.name} connection is open`);
        app.tradeEvents[input.name] = ws;
        app.tradeEvents.emit('open', ws);
        // give some overlap to make sure new connection is receiving data before old one is closed
        if (input.oldWS) setTimeout(() => input.oldWS.terminate(), 5000);
        // 23 hours
        setTimeout(() => initiateSocket({...input, oldWS: ws}), 82800000);
        //82800000
        resolve();
      });

      ws.on('close', () => {
        console.log('ws was closed');
        app.tradeEvents.emit('close', ws);
      });

      ws.on('error', (error) => {
        emailer.send({subject: 'Web Socket error', message: error.stack + ' \/n '});
        console.log('web socket error: ', error);
        app.tradeEvents.emit('error', error);
        ws.close(403, 'because');
        ws.terminate();

        console.log('attempting to reconnect websocket: ', input.name);
        initiateSocket({...input, oldWS: ws});
        reject(error);
      });
    });
  };

  const getBTCUSDHistory = async () => {
    try {
      const result = await app.pg.query(`
        select binance_trade_id, price, trade_time
        from binance_trades_btc_usdt
        where trade_time > NOW() - interval '4 days'
        order by binance_trade_id asc
      `);

      return result;

    } catch(err) {
      console.log('there was an error getting btc_usdt price history. Err: ', err);
      app.canTrade = false;
      return [];
    }

  };

  return {
    initiateSocket,
    restartSocket
  };
};