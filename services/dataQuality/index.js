const dataScanner = require('./dataScanner');
const dataQualityManager = require('./dataQualityManager');

module.exports = (app) => {

  return {
   dataScanner: dataScanner(app),
   dataQualityManager: dataQualityManager(app)
  }
};