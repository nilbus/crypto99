module.exports = (app) => {

  return {
    position: {
      transactions: [],
      openPositions: [],
      balanceCoin: 0,
      balanceUSD: 10000,
      initialBalanceUSD: 10000
    },

    processDecision(theDecision) {
      this[theDecision.action](theDecision);
    },

    getPosition() {
      return this.position;
    },

    buy(theDecision) {
      this.position.balanceUSD -= theDecision.quantityUSD;
      const coinsBought = theDecision.quantityUSD / theDecision.trade.price;
      this.position.balanceCoin += coinsBought;
      theDecision.executedPrice = theDecision.trade.price;
      theDecision.coinsBought = coinsBought;
      this.position.transactions.push(theDecision);
      this.openPositions.push(theDecision);
    },

    sell(theDecision) {
      theDecision.positionsToSell.forEach(({thePosition}) => {

        this.position.balanceCoin -= thePosition.coinsBought;
        this.position.balanceUSD += (thePosition.coinsBought * theDecision.trade.price);

        this.position.openPositions = this.position.openPositions
          .filter(pos => pos.trade.binance_trade_id !== thePosition.trade.binance_trade_id);

        const transaction = {
          ...theDecision,
          positionsToSell: undefined,
          coinsSold: thePosition.coinsBought
        };

        this.position.transactions.push(transaction);

      });
    }
  }
};