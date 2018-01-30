module.exports = (app) => {
  let history = {};

  const createHistory = async ({live, startTime}) => {
    const now = live ? Date.now() : startTime;

    history.trades = await app.pg.query(`
      select * from $[tradeTable]
      where trade_time > $[now]::date - interval '3 days'
      and trade_time < $[now]::date
    `, {now});

    return history;
  };

  const handleMessage = (message) => {
    if (!history.trades) throw('history has not been created yet');
    const date = new Date(message.data.T);
    const daysAgo = date.setDate(date.getDate() - 3);
    history.trades = history.trades.filter(messageOld => messageOld.data.T > daysAgo);
  };

  return {
    createHistory,
    handleMessage
  }
};