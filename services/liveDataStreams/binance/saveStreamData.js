module.exports = (app) => {

  class SaveAggTradeStream {
    constructor() {
      this.queue = [];
    }

    timer() {
      setInterval(this.save.bind(this), 30000);
    }

    async save() {
      if (!this.queue.length) return;
      const messages = this.queue;
      this.queue = [];
      await app.pg.query(`
        
      `);
    }

    handleAggTradeMessage(message) {
      this.queue.push(message);
    }
  }

  const saveAggTradeStream = new SaveAggTradeStream();
  saveAggTradeStream.timer();

  return (input) => {
    app.tradeEvents.on('aggTrade', saveAggTradeStream.handleAggTradeMessage);
  }
};