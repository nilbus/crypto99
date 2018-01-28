const apiClient = require('../../lib/apiClient');
const email = require('../emailer');

module.exports = function (app) {
  const emailer = email(app);

  const runBackfill = (inputs) => {
    // @params symbol: String
    let {symbol} = inputs;

    const backFiller = new Backfiller(symbol);
    backFiller.run();
    return {success: true};
  };

  const stop = (inputs) => {
    app.stopBackfill();
    return {success: true};
  };

  const Backfiller = class Backfill {

    constructor(symbol) {
      this.failCount = 0;
      this.maxFailCount = 1;
      this.saveFailCount = 0;
      this.maxSaveFailCount = 15;
      this.startId = null;
      this.lastSequentialTradeId = 0;

      this.tableName = `binance_trades_${symbol}`;
      this.symbol = symbol;
      //symbol should come in as abc_def and binance wants it ABCDEF
      this.symbolForRequest = symbol.replace('_', '').toUpperCase();
    }

    async run() {
      app.systemEvents.on('dataQuality/dataScanner_savedLastSequentialId', this.onNewLastSequentialId.bind(this));
      await this.getStartId();
      this.intervalId = setInterval(this.getAndSaveTransactions.bind(this), 3000);
      app.stopBackfill = this.stop.bind(this);
    }

    stop() {
      clearInterval(this.intervalId);
    }

    onNewLastSequentialId(symbol, tradeId) {
      console.log('IMPORTER: receieved new trade id from the scanner');
      if (symbol === this.symbol) this.lastSequentialTradeId = tradeId;
    }

    async getStartId() {
      //check this.startID first. That should be valid. If not, check database.
      // if nothing in db, query some endpoint at binance to find the first transaction to start with
      let result;
      try {
        result = await app.pg.query(`
          select last_sequential_trade_id 
          from currency_pairs 
          where symbol = $[symbol]
        `, {symbol: this.symbol});
      } catch(err) {
        console.log('error in getting start ID for the binance importer:', err);
        clearInterval(this.intervalId);
        this.recordError(err);
      }
      const proposedStartId = result[0] && result[0].last_sequential_trade_id;

      this.startId = proposedStartId || 1;
      console.log('starting with id: ', this.startId, 'for binance importer');
    }

    async getAndSaveTransactions() {
      const binanceResponse = await this.getBinanceTrades();
      const values = this.formatTradeData(binanceResponse);

      if(values.length < 400) {
        clearInterval(this.intervalId);
        if (this.symbol === 'btc_usdt') this.updateUSDStatus();
        emailer.send({subject: this.symbol + ' finished', message: this.symbol + ' currency pair data importing is up to date'});
      }

      await this.saveTradeData(values);
    }

    updateUSDStatus() {
      console.log('need to write query to update usd btc status');
    }

    async getBinanceTrades() {
      let binanceResponse;
      try {
        console.log('getting trades, starting from and including id: ', this.startId);
        binanceResponse = await apiClient.get('https://api.binance.com/api/v1/aggTrades')
          .set('X-MBX-APIKEY', 'PEf7fV9hkdHDFUUgQRtVaRvmppVpPEArd93guOUmtezWIDJsdIv487yYPQWl1KUF')
          .query({ symbol: this.symbolForRequest, fromId: this.startId});

        const { statusCode, status, statusType } = binanceResponse;
        if (statusCode >= 400 || status >= 400 || statusType === 4 || statusCode !== 200 || status !== 200 || statusType !== 2) {
          console.log('binance response: ', binanceResponse);
          throw new Error('status code was above 400. Response: ');
        }
      } catch(err) {
        console.log('request to get transactions from binance failed at id: ', this.startId, ' error: ', err);
        this.failCount += 1;
        if (this.failCount >= this.maxFailCount) clearInterval(this.intervalId);

        this.recordError(err);
      }
      return binanceResponse;
    }

    formatTradeData(binanceResponse) {
      return binanceResponse.body.map((trade, index) => ({
        binance_trade_id: trade.a,
        price: parseFloat(trade.p),
        quantity: parseFloat(trade.q),
        trade_time: app.pgPromise.as.date(new Date(trade.T), false),
        buyer_was_maker: trade.m,
        was_best_match: trade.M
      }));
    }

    async saveTradeData(values) {

      try {

        let result;
        if (this.symbol === 'btc_usdt') {
          result = await this.saveUsdtTrades(values)
        } else {
          result = await this.saveNonUsdtTrades(values);
        }

        this.startId = values.reduce((num, trade) => Math.max(num, trade.binance_trade_id, this.lastSequentialTradeId), this.startId);
        console.log('IMPORTERS: ', this.symbol, 'saved ', result.length, ' trades. Total response from binance: ', values.length);
        app.systemEvents.emit('importers/binance_saveTradeData', this.symbol, values);
      } catch (err) {
        console.log('something went wrong saving the trades received from binance', err);
        this.saveFailCount += 1;
        if (this.saveFailCount >= this.maxSaveFailCount) clearInterval(this.intervalId);
        this.recordError(err);
      }
    }

    async saveUsdtTrades (values) {
      const columns = ['binance_trade_id', 'price', 'quantity', 'trade_time', 'buyer_was_maker', 'was_best_match'];
      const tableName = this.tableName;
      let query = app.pgPromise.helpers.insert(values, columns, tableName);
      query += ' ON conflict DO nothing returning binance_trade_id';
      return await app.pg.any(query);
    }

    async saveNonUsdtTrades (values) {
      if (this.symbol === 'btc_usdt') return;

        const columns = ['binance_trade_id', 'price', 'quantity', 'trade_time', 'buyer_was_maker', 'was_best_match'];
        const dateCastedValues = values.map(row => {
          return {...row, trade_time: row.trade_time.replace(/'/g, '') + '::date'};
        });
        let sqlValues = app.pgPromise.helpers.values(dateCastedValues, columns);
        //the single quote should not include the cast syntax
        sqlValues = sqlValues.replace(/::date'/g, '\'::date');

        const query =`
        with x_btc as (
          select * from ( VALUES  $[sqlValues:raw])
              as values_table (binance_trade_id, price, quantity, trade_time, buyer_was_maker, was_best_match)
        )
        INSERT INTO $[tableName:name] (binance_trade_id, price, quantity, trade_time, buyer_was_maker, was_best_match, btc_usdt)
        SELECT binance_trade_id, price, quantity, trade_time, buyer_was_maker, was_best_match, btc_usdt
        FROM (
            select * from x_btc
            JOIN LATERAL (
              SELECT price as btc_usdt
              FROM binance_trades_btc_usdt AS btc_usd_inner
              WHERE x_btc.trade_time > btc_usd_inner.trade_time
              ORDER BY btc_usd_inner.trade_time DESC
              LIMIT 1
            ) AS x_btc_usd_table ON true 
        )as some_name
        ON conflict DO nothing returning binance_trade_id, btc_usdt
      `;

      const testQuery =`
        with x_btc as (
          select * from ( VALUES  $[sqlValues:raw])
              as values_table (binance_trade_id, price, quantity, trade_time, buyer_was_maker, was_best_match)
        )
        
        SELECT binance_trade_id, price, quantity, trade_time, trade_time_USD,buyer_was_maker, was_best_match, btc_usdt, 
        trade_time - trade_time_USD AS time_diff
        FROM (
            select * from x_btc
            left JOIN LATERAL (
              SELECT price as btc_usdt, trade_time as trade_time_USD
              FROM binance_trades_btc_usdt AS btc_usd_inner
              WHERE x_btc.trade_time > btc_usd_inner.trade_time
              ORDER BY btc_usd_inner.trade_time DESC
              LIMIT 1
            ) AS x_btc_usd_table ON true 
        )as some_name
     
      `;

      const variables = {sqlValues, tableName: this.tableName};
       return await app.pg.query(query, variables);
    };

    recordError(error) {
      emailer.send({subject: 'Binance Importer Error', message: error.stack});
    }
  };


  return {
    runBackfill,
    stop
  };
};
