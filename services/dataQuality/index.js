const dataScanner = require('./dataScanner');
const DataQualityManager = require('./dataQualityManager');

module.exports = (app) => {

  return {
   dataScanner: dataScanner(app),
   DataQualityManager: DataQualityManager(app)
  }
};