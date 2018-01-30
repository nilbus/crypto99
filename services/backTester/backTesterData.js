const QueryStream = require('pg-query-stream');
module.exports = (app) => {
  // inputs: symbol, begin_date, end_date
  const backTesterData = async (inputs) => {
    try{
    // const params = {tableName:'binance_trades_xrp_btc',begin_date:'2018-01-01 00:00:01',end_date:'2018-01-01 23:59:59'};
    const tableName = `binance_trades_${inputs.symbol}`;
    const params = {tableName:tableName,begin_date:inputs.begin_date,end_date:inputs.end_date};
      const query = app.pgPromise.as.format(
        "SELECT * FROM $[tableName:name] WHERE trade_time "+
        "BETWEEN $[begin_date] AND $[end_date] ORDER BY binance_trade_id ASC",params
      );

      var Writable = require('stream').Writable;
      var writable_stream = Writable({ objectMode: true }); // ({ decodeStrings: false })
      writable_stream._write = function (chunk, enc, next) {
          console.log(chunk.binance_trade_id);
          // tradeHandler.receiveTrade(chunk);
          // setTimeout(()=> next(), 2000);
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
  return backTesterData;
};
