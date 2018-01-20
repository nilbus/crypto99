module.exports = (app) => {

  class SaveAggTradeStream {
    constructor() {
      this.queue = [];
    }

    timer() {
      setInterval(this.saveQueuedMessages.bind(this), 30000);
      setInterval(() => console.log('save data queue length: ', this.queue.length), 5000);
    }

    async saveQueuedMessages() {
      if (!this.queue.length) return;
      const messages = this.queue;
      this.queue = [];
      let data = this.separateCurrencies(messages);

      const batch = [];
      for (let i = 0; i < data.currencyList.length; i++) {
        const symbol = data.currencyList[i];
        const values = this.formatTradeData(data[symbol]);
        const columns = ['binance_trade_id', 'price', 'quantity', 'trade_time', 'buyer_was_maker', 'was_best_match', 'usd_price'];
        const tableName = 'binance_trades_' + symbol;
        let query = app.pgPromise.helpers.insert(values, columns, tableName);
        query += ' on conflict do nothing';

        batch.push(app.pg.any(query))
      }

      try {
        await db.tx(t1 => {
          return this.batch(batch);
        });
      } catch(err) {
        console.log('did not save aggTrade streamed data: ', err);
      }


    }

    formatTradeData(messageList) {
      return messageList.map((message) => {
        const trade = message.data;
        return {
          binance_trade_id: trade.a,
          price: parseFloat(trade.p),
          quantity: parseFloat(trade.q),
          trade_time: app.pgPromise.as.date(new Date(trade.T), false),
          buyer_was_maker: trade.m,
          was_best_match: trade.M,
          usd_price: null
        }
      });
    }

    separateCurrencies(messages) {
      // formats a list of messages from different currencies into:
      //{currencyList: [], xrp_btc: [message], ...}
      return messages.reduce((obj, message) => {
        const symbol = message.symbol;
        if (!obj[symbol]) {
          obj[symbol] = [];
          obj.currencyList.push(symbol)
        }
        obj[symbol].push(message);
        return obj;
      }, {currencyList: []});
    }

    handleAggTradeMessage(message) {
      this.queue.push(message);
    }

    listen() {
      this.timer();
      app.tradeEvents.on('aggTrade', this.handleAggTradeMessage.bind(this));
    }
  }

  return new SaveAggTradeStream();
};