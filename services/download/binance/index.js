const QueryStream = require('pg-query-stream');
const csvStringify = require('csv-stringify');

module.exports = (app) => {
  return async (inputs, req, res) => {
    const {symbol} = inputs;
    if (!symbol) return {success: false, message: 'invalid parameters. Need a symbol'};

    const tableNameResult = await app.pg.query(`
      select trade_table from currency_pairs
      where symbol=$[symbol]
      and exchange ='binance'
    `, {symbol});
    const tableName = tableNameResult[0].trade_table;
    const query = app.pgPromise.as.format('select * from $[tableName:name]', {tableName});

    const qs = new QueryStream(query);
    const stringifier = csvStringify(null, {header: true});

    res.setHeader('Content-disposition', `attachment; filename=binance_trades_${symbol}.csv`);
    res.set('Content-Type', 'text/csv');

    try{
      const stats = await app.pg.stream(qs, stream => {
        stream.pipe(stringifier).pipe(res);
      });
    } catch(err) {
      console.log('there was a problem streaming: ', err);
      return {success: false};
    }
  }
};