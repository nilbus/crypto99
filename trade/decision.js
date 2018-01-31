module.exports = (app) => {
  return {
    make(message, history, position) {
      // run algorithm here
      return {action: 'buy'};
    }
  }
};