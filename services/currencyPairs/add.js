module.exports = (app) => {
  const add = async (inputs) => {
    /* @params
     * symbol: String!
     * exchange: String!
     */
    const { symbol, exchange } = inputs;

    if (!validateSymbol(symbol)) {
      return {success: false, message: 'invalid symbol name'};
    }
    const result = app.pg.query(`
        select currency_pair_id from currency_pairs where symbol=$[symbol]
      `, {symbol});
    if (result[0]) return { success: false, message: 'currency pair ' + symbol + ' already exists' };

    let currencyPairId;
    try {
      currencyPairId = await app.pg.tx('add-currency-pair-transaction', function * (transaction) {
        const tradeTable = 'binance_trades_' + symbol;
        yield transaction.none(`
          create table $[tradeTable:name] (
            binance_trade_id integer unique primary key,
            price numeric,
            quantity numeric,
            trade_time timestamp with time zone,
            buyer_was_maker boolean,
            was_best_match boolean
          )
        `, {tradeTable});

        const result = yield transaction.one(`
          insert into currency_pairs (symbol, trade_table, exchange)
          values ($[symbol], $[tradeTable], $[exchange])
          returning currency_pair_id
        `, {symbol, tradeTable, exchange});

        currencyPairId = result[0].currency_pair_id;
      });

    } catch(err) {
      console.log('could not add symbol: ' + symbol, 'error: ', err);
      return {success: false, message: 'could not add symbol: ' + symbol};
    }

    return {currencyPairId};
  };

  const validateSymbol = (symbol) => {
    return /^\w+_\w+$/.test(symbol);
  };

  return add;
};