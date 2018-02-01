module.exports = (app) => {
  let history = {};

  const createHistory = async ({live, startTime, symbol}) => {
    const now = live ? Date.now() : startTime;
    console.log('retrieving trade history for backtest');
    const query  = app.pgPromise.as.format(`
      select * from $[tradeTable:name]
      where trade_time > timestamptz $[now] - interval '1 hour'
      and trade_time < $[now]
      order by binance_trade_id asc
    `, {now, tradeTable: 'binance_trades_' + symbol});
    console.log('history query: ', query);
    try {
      history.trades = await app.pg.query(query);
    } catch(err) { console.log('error getting trade history: ', err)}

    console.log('history first and last trades: ', history.trades[0], history.trades[history.trades.length - 1]);
    history.trades = history.trades.map(trade => {
      trade.trade_time = Date.parse(trade.trade_time);
      return {
        symbol,
        data: trade
      };
    });
    history.symbol = symbol;
    return history;
  };

  const handleMessage = (message) => {
    if (!history.trades) throw('history has not been created yet');
    history.trades.push(message);
    const date = new Date(message.data.trade_time);
    const daysAgo = date.setDate(date.getDate() - 3);
    history.trades = history.trades.filter(messageOld => messageOld.data.trade_time > daysAgo);
  };

  return {
    createHistory,
    handleMessage
  };
};