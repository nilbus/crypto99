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
    constructor(options, history, decision, position) {
      const {priceChangeFilterPct, symbol} = options;

      this.symbol = symbol;
      this.priceChangeFilterPct = priceChangeFilterPct;
      this.lastAnalyzedPrice = 0;
      this.handleMessage = this.handleMessage.bind(this);

      this.history = history;
      this.decision = decision;
      this.position = position;
    }

    handleMessage(message) {
      const symbol = message.symbol;
      const trade = formatTrade(message.data);
      //ignore trades that don't change enough. todo: Override if it's been over 5 seconds or so
      const priceDiff = Math.abs(((trade.priceUSD - this.lastAnalyzedPrice) / this.lastAnalyzedPrice));
      //console.log('price diff since last decision: ', priceDiff);
      if ( priceDiff < this.priceChangeFilterPct) return;
      if (this.symbol !== symbol) return;

      this.lastAnalyzedPrice = trade.priceUSD;
      const theDecision = this.decision.make(message, this.history, this.position.getPosition());

      if (theDecision.action === 'hold') return;
      this.position.processDecision(theDecision);
      console.log('the decision is: ', theDecision.action);
    }

  }

};