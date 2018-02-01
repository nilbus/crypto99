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
      const coinsBought = (theDecision.quantityUSD / theDecision.trade.priceUSD);
      this.position.balanceCoin += coinsBought;
      theDecision.executedPrice = theDecision.trade.priceUSD;
      theDecision.coinsBought = coinsBought;
      this.position.transactions.push(theDecision);
      this.position.openPositions.push(theDecision);
    },

    sell(theDecision) {
      theDecision.positionsToSell.forEach(({thePosition}) => {

        const transaction = {
          ...theDecision,
          positionsToSell: undefined,
          coinsSold: thePosition.coinsBought
        };

        const dollarsFromSale = (transaction.coinsSold * theDecision.trade.priceUSD) * (1 - 0.0025); // <--Fees

        this.position.balanceCoin -= transaction.coinsSold;
        this.position.balanceUSD += dollarsFromSale;

        this.position.openPositions = this.position.openPositions
          .filter(pos => pos.trade.binance_trade_id !== thePosition.trade.binance_trade_id);

        //calculate change for position
        transaction.positionYield = (dollarsFromSale - thePosition.quantityUSD) / thePosition.quantityUSD;
        transaction.balanceCoin = this.position.balanceCoin;
        transaction.balanceUSD = this.position.balanceUSD;

        this.position.transactions.push(transaction);

      });
    }
  }
};