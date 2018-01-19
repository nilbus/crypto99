const WebSocket = require('ws');

module.exports = (app) => {
  const initiate = async (input) => {
    /*
     *  initiates a websocket connection to binance to receive real time trade data from all added currency pairs
     *  @params: currency_pair_id: Int || symbol: String
     */

    const symbols = await app.pg.query(`
      select symbol from currency_pairs
    `);

    const baseWSS = 'wss://stream.binance.com:9443/ws';
    const path = '/ethusdt@aggTrade';

    const ws = new WebSocket(baseWSS + path);
    ws.on('message', (data) => {
      console.log('message: ', data);

    });

    ws.on('open', () => {
      console.log('websocket connection is open');

    });
    ws.on('error', (error) => {
      console.log('web socket error: ', error);
      ws.close(403, 'because');
      ws.terminate();
    });

  };

  return initiate;
};