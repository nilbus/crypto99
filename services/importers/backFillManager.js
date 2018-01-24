module.exports = (app) => {
  return async(input) => {
    let symbolResult = await app.pg.query(`
      select symbol, last_sequential_trade_id from currency_pairs
    `);
    const allGaps = [];
    console.log('result: ', symbolResult);
    symbolResult = symbolResult.filter(result => result.symbol === 'btc_usdt');
    for (let i = 0; i < symbolResult.length; i++) {
      let symbol = symbolResult[i].symbol;
      const lastSequentialTradeId = symbolResult[i].last_sequential_trade_id;
      console.log('querying for id gaps. symbol: ', symbol);
      const symbolGaps = await app.pg.query(`
      with trades as (
        select binance_trade_id from binance_trades_btc_usdt
        where binance_trade_id > 0
        order by binance_trade_id asc
      )
      select start, stop from (
        select m.binance_trade_id + 1 as start,
          (select min(binance_trade_id) - 1 from binance_trades_btc_usdt as x where x.binance_trade_id > m.binance_trade_id) as stop
        from binance_trades_btc_usdt as m
          left outer join binance_trades_btc_usdt as r on m.binance_trade_id = r.binance_trade_id - 1
        where r.binance_trade_id is null
      ) as x
      where stop is not null;
    `, {currencyTable: 'binance_trades_' + symbol, lastSequentialTradeId: 0});

      const numTradesInGap = symbolGaps.reduce((num, gap) => (num + (gap.stop - gap.start)), 0);
      allGaps.push({numTradesInGap, symbolGaps});
      console.log('all gaps updated: ', allGaps);
    }

    allGaps.sort((a, b) => (a.numTradesInGap - b.numTradesInGap));
    console.log('returning allGaps: ', allGaps);

    return allGaps;
  }
};

//get all gap results
// order the list by number of id's in the gaps
// when a save is done, check and update the last sequential id


//expose fill usd gaps