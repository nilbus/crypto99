const dataScanner = require('./dataScanner');

module.exports = (app) => {
  const scanData = dataScanner(app);

};