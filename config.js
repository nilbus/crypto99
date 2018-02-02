const os = require('os');
if(os.hostname() == 'spark.local'){ // mcdev env
  module.exports = {
    postgres: {
      connectionString: 'postgres://127.0.0.1:5432/crypto',
      connectionObject: {
        host: '127.0.0.1',
        database: 'crypto',
        user: 'postgres',
        port: 5432,
        password: 'password',
        max: 20,  //max and min pool connections
        min: 1,
        ssl: false
      }
    }
  };
}else{
  module.exports = {
    postgres: {
      connectionString: 'postgres://ubcek98rdetpbo:pca4ce03d645cacd0aadf3483ffd5912dd3c1cff142c6260d048f814317afe3b8@ec2-50-16-154-189.compute-1.amazonaws.com:5432/d22v30bg3h32pp',
      connectionObject: {
        host: 'ec2-50-16-154-189.compute-1.amazonaws.com',
        database: 'd22v30bg3h32pp',
        user: 'ubcek98rdetpbo',
        port: 5432,
        password: 'pca4ce03d645cacd0aadf3483ffd5912dd3c1cff142c6260d048f814317afe3b8',
        max: 20,  //max and min pool connections
        min: 1,
        ssl: true
      }
    }
  };
}
