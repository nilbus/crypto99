const EventEmitter = require('events');

module.exports = class TradeEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.messageHistory = [];
    this.usdMessageHistory = [];
  }

  newTrade(message) {
    //if this message was received by another socket connection, don't emit it a second time
    let found = this.messageHistory.find(old => old.data.a === message.data.a);
    if (message.symbol === 'btc_usdt') found = this.usdMessageHistory.find(old => old.data.a === message.data.a);
    if(found) return;

    if (message.symbol !== 'btc_usdt') {
      const shouldCancelEvent = this.addUSDPriceToMessage(message);
      if (shouldCancelEvent) return;
    }

    this.emit('aggTrade', message);

    if (message.symbol === 'btc_usdt') {
      this.handleUSDHistory(message);
    } else {
      this.handleMessageHistory(message);
    }
  }

  addUSDPriceToMessage(message) {
    if (!this.usdMessageHistory.length) {
      console.log('usd history doesnt have any trades. Canceling event for this trade: ',
        message.symbol, 'id: ', message.data.a);
      return true;
    }
    const lastUSDTrade = this.usdMessageHistory[this.usdMessageHistory.length - 1];
    if (Math.abs(lastUSDTrade.data.T - message.data.T) > 30000) throw(30);
    message.data.btc_usdt = lastUSDTrade.price;
    return false;
  }

  handleMessageHistory(message) {
    this.messageHistory.push(message);
    const thirtySecondsAgo = message.data.T - 30000;
    this.messageHistory = this.messageHistory.filter(messageOld => messageOld.data.T > thirtySecondsAgo);
  }

  handleUSDHistory(message) {
    this.usdMessageHistory.push(message);
    this.usdMessageHistory.sort((a, b) => (a.data.a - b.data.a));
    const someTimeAgo = Date.now() - 30000;
    this.usdMessageHistory = this.usdMessageHistory.filter(messageHist => messageHist.data.T > someTimeAgo);
  }
};