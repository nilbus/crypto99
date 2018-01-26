module.exports = (app) => {

  const dataScanner = async (inputs) => {
    // @params symbol: String
    console.log('in scanner');
    const {symbol} = inputs;
    const tradesTable = 'binance_trades_' + symbol;

    const mostCurrent = await app.pg.query(`
      select binance_trade_id
      from $[tradesTable:name]
      order by binance_trade_id desc
      limit 1
    `, {tradesTable});

    const mostCurrentTradeId = mostCurrent[0].binance_trade_id;

    const lastSequential = await app.pg.query(`
      select last_sequential_trade_id
      from currency_pairs
      where symbol = $[symbol]
    `, {symbol});

    let lastSequentialTradeId = lastSequential[0].last_sequential_trade_id;

    while(lastSequentialTradeId < mostCurrentTradeId){

      const endRange = lastSequentialTradeId + 100000;
      const idRange = await app.pg.query(`
        select binance_trade_id from $[tradesTable:name]
        where binance_trade_id between $[lastSequentialTradeId] and $[endRange]
        order by binance_trade_id asc
      `, {tradesTable, lastSequentialTradeId, endRange});

      const tradeGapStartId = findTradeGap(idRange.map(trade => trade.binance_trade_id));
      console.log('DATA SCANNER find trade gap result: ', tradeGapStartId);
      if (tradeGapStartId) {
        try{
          await saveLastSequentialId(symbol, tradeGapStartId);
        } catch(err) {
          console.log('DATA SCANNER could not update last seq trade id: ', err);
          return {lastSequentialTradeId};
        }
        return {lastSequentialTradeId: tradeGapStartId};
      }


      lastSequentialTradeId = endRange;
      await saveLastSequentialId(symbol, Math.min(lastSequentialTradeId, mostCurrentTradeId))
    }

    return {lastSequentialTradeId: mostCurrentTradeId};
  };


  const saveLastSequentialId = async(symbol, tradeId) => {
    console.log('DATA SCANNER save new sequential trade Id: ', tradeId);
    await app.pg.query(`
      update currency_pairs
      set last_sequential_trade_id = $[tradeId]
      where symbol = $[symbol]
    `, {tradeId, symbol});

    app.systemEvents.emit('dataQuality/dataScanner_savedLastSequentialId', symbol, tradeId);
  };

  const findTradeGap = (idList) => {
    for (let i = 1; i < idList.length; i++) {
      if (idList[i] - idList[i - 1] !== 1) return idList[i -1];
    }
    return false;
  };

  return dataScanner;
};