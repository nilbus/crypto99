const Events = require('events');

module.exports = (app) => {
  class SystemEvents extends Events {
    constructor() {
      super();
    }

    subscribe(serviceName, eventName, fn) {
      if (app[serviceName]) this.registerEvent(serviceName, eventName, fn);

      else this.on(serviceName + 'Ready', this.registerEvent.bind(this, serviceName, eventName, fn));
    }

    registerEvent(serviceName, eventName, fn) {
      app[serviceName].on(eventName, fn);
    }
  }

  return new SystemEvents();
};