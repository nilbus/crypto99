module.exports = (app) => {
  return {
    make(message, history, position) {
      // run algorithm here
      const buy = {
        exchange:'support for exchange not needed for now',
        action: 'buy', // 'buy', 'sell', or 'hold'
        orderType: 'market',
        quantityUSD: 50,  // for market buy orders
        symbol: message.symbol,
        trade: message.data
      };

      const sell = {
        exchange:'support for exchange not needed for now',
        action: 'sell',
        orderType: 'market',
        symbol: message.symbol,
        trade: message.data,
        positionsToSell: [{quantityCoin: 50, thePosition: '{thePosition}'}] //quantity coin is for future support
      };

      return buy;
    }
  }
};