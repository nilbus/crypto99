module.exports = (app) => {
  const gaps = async(input) => {
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

  const tradeCount = async (input) => {
    const tableName = 'binance_trades_' + input.symbol;
    return await app.pg.query('select count(*) as trade_count from $[tableName:name]', {tableName});
  };

  const testQuery = async (input) => {
    let binanceResponse;
    try {
      binanceResponse = await apiClient.get('https://api.binance.com/api/v1/aggTrades')
        .set('X-MBX-APIKEY', 'PEf7fV9hkdHDFUUgQRtVaRvmppVpPEArd93guOUmtezWIDJsdIv487yYPQWl1KUF')
        //.query({ symbol: 'XRPBTC', startTime: 1509634919000, endTime: 1509635159000});
        //start id for ripple 1294
        .query({ symbol: input.symbol.replace('_', '').toUpperCase() || 'BTCUSDT', fromId: 1});
      console.log('binance response: ', binanceResponse.statusCode, binanceResponse.status, binanceResponse.statusType);
      const { statusCode, status, statusType } = binanceResponse;
      if (statusCode >= 400 || status >= 400 || statusType === 4 || statusCode !== 200 || status !== 200 || statusType !== 2) {
        throw new Error('status code was above 400');
      }
    } catch(err) {
      console.log('request to get transactions from binance failed at id: ', 'test', ' error: ', err);
    }
    return binanceResponse;
  };
};

//get all gap results
// order the list by number of id's in the gaps
// when a save is done, check and update the last sequential id


//expose fill usd gaps