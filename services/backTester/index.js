const backTesterData = require('./backTesterData');

module.exports = function(app) {
  return {
    backTesterData: backTesterData(app)
  };
};
