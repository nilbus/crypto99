const add = require('./add');

module.exports = function(app) {
  const list = async (input) => {
    try{
      return await app.pg.query(`
        select * from currency_pairs
        where symbol != 'btc_usdt'
      `);

    }catch(err) {
      console.log('err: ', err);
      return {success: false};
    }
  };

  return {
    add: add(app),
    list
  };
};