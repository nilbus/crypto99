const dataScanner = require('./dataScanner');

module.exports = (app) => {
  const scanData = dataScanner(app);

  return class DataQualityManager {

    constructor() {
      this.lastKnownSequentialTradeIds = {};
      this.inProgress = {};
    }

    async importersBinanceSaveTrade(symbol, values) {

      if (!this.lastKnownSequentialTradeIds[symbol]) {
        this.lastKnownSequentialTradeIds[symbol] = await this.getLastSequentialTradeId(symbol);
      }

      const lastRetreivedId = values[values.length - 1].binance_trade_id;
      console.log('DQ: will scan rows after ', 10000 - (lastRetreivedId - this.lastKnownSequentialTradeIds[symbol]), 'more trades are saved. scanner is in progress: ', this.inProgress[symbol] );
      if ((lastRetreivedId - this.lastKnownSequentialTradeIds[symbol]) > 4000 && !this.inProgress[symbol]) {
        this.inProgress[symbol] = true;
        console.log('about to scan data:');
        const scanResult = await scanData({symbol});
        this.lastKnownSequentialTradeIds[symbol] = scanResult.lastSequentialTradeId;
        console.log("scan data came back: ", this.lastKnownSequentialTradeIds[symbol]);
        this.inProgress[symbol] = false;
      }

    }

    async getLastSequentialTradeId(symbol) {
      try {
        const lastSequential = await app.pg.query(`
          select last_sequential_trade_id
          from currency_pairs
          where symbol = $[symbol]
        `, {symbol});
        console.log('DQ: last_sequential_trade_id from db ', symbol,': ', lastSequential);
        return (lastSequential[0].last_sequential_trade_id || 1);
      } catch (err) {
        console.log('could not get last trade id in data quality manager');
        return 1;
      }
    }

    listenForSavedData() {
      console.log('listen to importers/binance_saveTradeData');
      app.systemEvents.on('importers/binance_saveTradeData', this.importersBinanceSaveTrade.bind(this));
    }

  };

};