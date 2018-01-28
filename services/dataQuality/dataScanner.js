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

      const idRange = await app.pg.query(`
        select binance_trade_id from $[tradesTable:name]
        where binance_trade_id between $[startRange] and $[endRange]
        order by binance_trade_id asc
      `, {tradesTable, startRange: lastSequentialTradeId - 2, endRange: lastSequentialTradeId + 50000});

      let tradeGapStartId = findTradeGap(idRange.map(trade => trade.binance_trade_id));
      console.log('DATA SCANNER: is trade gap?: ', tradeGapStartId);

      // If there is a trade gap, save the start of the gap
      if (tradeGapStartId) {
        tradeGapStartId -= 2; //minus 2 for safety
        try{
          await saveLastSequentialId(symbol, tradeGapStartId);
          return {lastSequentialTradeId: tradeGapStartId};
        } catch(err) {
          console.log('DATA SCANNER: could not update last seq trade id: ', err);
          return {lastSequentialTradeId};
        }
      }

      const lastIdFromQuery = idRange[idRange.length - 1] && idRange[idRange.length - 1].binance_trade_id;
      lastSequentialTradeId =  lastIdFromQuery || lastSequentialTradeId;
      await saveLastSequentialId(symbol, Math.min(lastSequentialTradeId, mostCurrentTradeId))
    }

    return {lastSequentialTradeId: mostCurrentTradeId};
  };


  const saveLastSequentialId = async(symbol, tradeId) => {
    await app.pg.query(`
      update currency_pairs
      set last_sequential_trade_id = $[tradeId]
      where symbol = $[symbol]
    `, {tradeId, symbol});
    console.log('DATA SCANNER: saved new last_sequential_trade_id: ', tradeId);
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