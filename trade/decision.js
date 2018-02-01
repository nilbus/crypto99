module.exports = (app) => {
  return {
    make(message, history, position) {
      // run algorithm here\
      const hold ={
        action: 'hold'
      };

      const buy = {
        exchange:'support for exchange not needed for now',
        action: 'buy', // 'buy', 'sell', or 'hold'
        orderType: 'market',
        quantityUSD: 50,  // for market buy orders
        symbol: message.symbol,
        trade: message.data
      };

      const earliestPosition = position.openPositions[0];
      const sell = {
        exchange:'support for exchange not needed for now',
        action: 'sell',
        orderType: 'market',
        symbol: message.symbol,
        trade: message.data,
        positionsToSell: [{quantityCoin: 50, thePosition: earliestPosition}] //quantity coin is for future support
      };

      const rand = Math.random() * 100;

      if (rand > 95 && earliestPosition) return sell;
      if (rand < 5 && !earliestPosition) return buy;
      return hold;

    }
  }
};