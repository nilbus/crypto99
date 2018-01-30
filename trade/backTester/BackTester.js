const QueryStream = require('pg-query-stream');
const Writable = require('stream').Writable;

module.exports = (app) => {
  const tradeHistory = require('../tradeHistory')(app);
  const TradeHandler = require('../TradeHandler')(app);
  const decision = require('../decision')(app);

  export class BackTester {
    constructor(options) {
      const { timeStart, timeEnd } = options;
      this.timeStart = timeStart;
      this.timeEnd = timeEnd;
    }

    async run({startTime, endTime, symbol}) {
      const history = tradeHistory.createHistory({live: false, startTime});

      const tradeHandler = new TradeHandler(
        {live: false, priceChangeFilterPct: 0.005, symbol},
        history,
        decision);
      //
      //start data stream

      try{

        const query = app.pgPromise.as.format(`
          SELECT * FROM $[tableName:name]
          WHERE trade_time > $[startTime]::date
          AND trade_time < $[endTime]::date
          ORDER BY binance_trade_id ASC
        `, {startTime, endTime, tradeTable: `binance_trades_${symbol}`});

        const writable_stream = Writable({ objectMode: true }); // ({ decodeStrings: false })
        writable_stream._write = function (chunk, enc, next) {
          console.log(chunk.binance_trade_id);
          tradeHandler.handleMessage({symbol, data: chunk});
          next();
        };

        const qs = new QueryStream(query);
        try{
          const stats = await app.pg.stream(qs, stream => {
            stream.pipe(writable_stream);
          });
        } catch(err) {
          console.log('there was a problem streaming: ', err);
          return {success: false};
        }
      }catch(e){
        console.log(e);
      }
    }
  }
};
