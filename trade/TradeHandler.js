module.exports = (app) => {

  const formatTrade = (trade) => {
    Object.keys(trade).forEach(key => {
      switch(key) {
        case 'p': trade.price = trade.p;
          break;
        case 'a': trade.binance_trade_id = trade.a;
          break;
        case 'q': trade.quantity = trade.q;
          break;
        case 'T': trade.trade_time = trade.T;
          break;
        case 'm': trade.buyer_was_maker = trade.m;
          break;
        case 'M': trade.was_best_match = trade.M;
          break;
      }
    });
    return trade;
  };

  return class TradeHandler {
    constructor(options) {
      const {priceChangeFilterPct, symbol} = options;

      this.symbol = symbol;
      this.priceChangeFilterPct = priceChangeFilterPct;
      this.lastAnalyzedPrice = 0;
      this.handleMessage = this.handleMessage.bind(this);
    }

    handleMessage(message) {
      const symbol = message.symbol;
      const trade = formatTrade(message.data);
      //ignore trades that don't change enough. todo: Override if it's been over 5 seconds
      if (Math.abs(trade.price / this.lastAnalyzedPrice) < this.priceChangeFilterPct) return;
      if (this.symbol !== symbol) return;

    }

  }

};