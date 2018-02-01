const QueryStream = require('pg-query-stream');
const Writable = require('stream').Writable;

module.exports = (app) => {
  const tradeHistory = require('../tradeHistory')(app);
  const TradeHandler = require('../TradeHandler')(app);
  const decision = require('../decision')(app);
  const position = require('../position')(app);

  return class BackTester {

    constructor() {}

    async run({startTime, endTime, symbol}) {
      const history = await tradeHistory.createHistory({live: false, startTime, symbol});

      const tradHandlerOptions = {
        live: false,
        priceChangeFilterPct: 0.001,
        symbol
      };
      const tradeHandler = new TradeHandler(tradHandlerOptions, history, decision, position);

      try{
        //todo: format the timestamp to unix milliseconds
        const query = app.pgPromise.as.format(`
          SELECT * FROM $[tradeTable:name]
          WHERE trade_time > $[startTime]
          AND trade_time < $[endTime]
          ORDER BY binance_trade_id ASC
        `, {startTime, endTime, tradeTable: `binance_trades_${symbol}`});


        console.log('query: ', query);
        const writable_stream = Writable({ objectMode: true }); // ({ decodeStrings: false })
        writable_stream._write = function (chunk, enc, next) {
          chunk.priceUSD = chunk.price * chunk.btc_usdt;
          tradeHandler.handleMessage({symbol, data: chunk});
          // history.handleMessage({symbol, data: chunk});
          next();
        };

        const qs = new QueryStream(query);

        await app.pg.stream(qs, stream => {
          stream.pipe(writable_stream);
        });

        console.log(position.getPosition());
        console.timeEnd('backTest');

      }catch(e){
        console.log('BACKTESTER ERROR: ',e);
      }
    }
  }
};
