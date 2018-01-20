const apiClient = require('../../lib/apiClient');
const email = require('../emailer');

module.exports = function (app) {
  const emailer = email(app);

  const runBackfill = (inputs) => {
    console.log('inputs: ', inputs);
    let {symbol} = inputs;

    const backFiller = new Backfiller(symbol);
    backFiller.run();
    return {success: true};
  };
//Date.parse("Fri Jan 05 2018 10:01:59 GMT-0500 (EST)")
  // 1509548519000 <- Wed Nov 1 2017
  //1509635159000 <- 4 minutes later

  const Backfiller = class Backfill {
    constructor(symbol) {
      this.failCount = 0;
      this.startId = null;
      this.maxFailCount = 1;
      this.tableName = `binance_trades_${symbol}`;
      //symbol should come in as abc_def and binance wants it ABCDEF
      this.symbol = symbol.replace('_', '').toUpperCase();
    }

    async run() {
      await this.getStartId();
      this.intervalId = setInterval(this.getAndSaveTransactions.bind(this), 3000);
    }

    async getStartId() {
      //check this.startID first. That should be valid. If not, check database.
      // if nothing in db, query some endpoint at binance to find the first transaction to start with
      let result;
      try {
        result = await app.pg.query(`
          select binance_trade_id
          from $[tradeTable:name]
          order by binance_trade_id desc
          limit 1 
        `, {tradeTable: this.tableName});
      } catch(err) {
        console.log('error in getting latest trade from trades table:', err);
        this.recordError(err);
      }
      const proposedStartId = result[0] && result[0].binance_trade_id;
      if (proposedStartId) {
        console.log('retrieved start id: ', proposedStartId);
        this.startId = proposedStartId;
      } else {
        //query binance for the first trade id. for now use xrp default
        console.log('setting start trade id: ', 1);
        this.startId = 1;
        //1294

      }
    }

    async getAndSaveTransactions() {
      const binanceResponse = await this.getBinanceTrades();
      const values = this.formatTradeData(binanceResponse);

      if(values.length < 100) {
        clearInterval(this.intervalId);
        emailer.send({subject: this.symbol + ' finished', message: this.symbol + ' currency pair data importing is up to date'});
      }

      await this.saveTradeData(values);
    }

    async getBinanceTrades() {
      let binanceResponse;
      try {
        console.log('getting trades, starting from and including id: ', this.startId);
        binanceResponse = await apiClient.get('https://api.binance.com/api/v1/aggTrades')
          .set('X-MBX-APIKEY', 'PEf7fV9hkdHDFUUgQRtVaRvmppVpPEArd93guOUmtezWIDJsdIv487yYPQWl1KUF')
          //.query({ symbol: 'XRPBTC', startTime: 1509634919000, endTime: 1509635159000});
          //start id for ripple 1294
          .query({ symbol: this.symbol, fromId: this.startId});
        console.log('binance response: ', binanceResponse.statusCode, binanceResponse.status, binanceResponse.statusType);
        const { statusCode, status, statusType } = binanceResponse;
        if (statusCode >= 400 || status >= 400 || statusType === 4 || statusCode !== 200 || status !== 200 || statusType !== 2) {
          throw new Error('status code was above 400');
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
      const values = binanceResponse.body.map((trade, index) => ({
        binance_trade_id: trade.a,
        price: parseFloat(trade.p),
        quantity: parseFloat(trade.q),
        trade_time: app.pgPromise.as.date(new Date(trade.T), false),
        buyer_was_maker: trade.m,
        was_best_match: trade.M
      }));

      values.shift(); //remove the fromId, because it already exists in the db
      return values;
    }

    async saveTradeData(values) {
      const columns = ['binance_trade_id', 'price', 'quantity', 'trade_time', 'buyer_was_maker', 'was_best_match'];
      const tableName = this.tableName;
      let query = app.pgPromise.helpers.insert(values, columns, tableName);
      query += ' returning binance_trade_id';

      try {
        const result = await app.pg.any(query);
        const latestTrade = result[result.length - 1];
        this.startId = latestTrade.binance_trade_id;
        console.log('saved ', result.length, ' trades from binance');
      } catch (err) {
        console.log('something went wrong saving the trades received from binance', err);
        this.failCount += 1;
        if (this.failCount >= this.maxFailCount) clearInterval(this.intervalId);
        this.recordError(err);
      }
    }

    recordError(error) {
      emailer.send({subject: 'Binance Importer Error', message: error.stack});
    }
  };

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

  return {
    runBackfill,
    tradeCount,
    testQuery
  };
};

//[{"a":1294,"p":"0.00002731","q":"231.00000000","f":1312,"l":1312,"T":1509634925284,"m":false,"M":true,"datePretty":"11-2-2017"},
// {"a":1295,"p":"0.00002731","q":"3001.00000000","f":1313,"l":1313,"T":1509634946709,"m":false,"M":true,"datePretty":"11-2-2017"}
