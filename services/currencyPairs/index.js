const add = require('./add');

module.exports = function(app) {
  return {
    add: add(app)
  };
};