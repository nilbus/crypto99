const ioClient = require('socket.io-client');
console.log('io client: ', ioClient);

module.exports = (app) => {
  const initiate = async (input) => {
    /*
     *  initiates a websocket connection to binance to receive real time trade data from all added currency pairs
     *  @params: currency_pair_id: Int || symbol: String
     */

    const symbols = await app.pg.query(`
      select symbol from currency_pairs
    `);



  }
};