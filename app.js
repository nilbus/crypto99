const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const db = require('./db');
const routeMgmt = require('./lib/routeManagement');
const importers = require('./services/importers');
const emailer = require('./services/emailer');
const currencyPairs = require('./services/currencyPairs');
const download = require('./services/download');
const dataStreams = require('./services/liveDataStreams');
const dataScanner = require('./services/status/dataScanner');
const app = express();
// adds the pg and pgp object to app
db(app);
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
routeMgmt(app);

dataScanner(app)({symbol: 'btc_usdt'});

const startUpSequence = async () => {

  const dataStreamsAPI = dataStreams(app);
  const importersAPI = importers(app);

  const nodeEnv = process.NODE_ENV === 'production';
  if (nodeEnv || true) await dataStreamsAPI.binance.initiateSocket({symbols: ['btc_usdt'], name: 'usdWS'});
  //slight delay for usd history to build a bit so new trades can be saved with usd data
  setTimeout(() => {
    dataStreamsAPI.binance.initiateSocket({name: 'allWS'});
    importersAPI.binance.runBackfill({symbol: 'btc_usdt'});
  }, 2000);

  app.mount('/importers', importersAPI);

  app.mount('/currencyPairs', currencyPairs(app));
  app.mount('/download', download(app));

  app.use(express.static(__dirname + '/react-app/build'));

// app.get('/', function (req, res) {
//   res.sendFile(__dirname + '/react-app/build/index.html');
// });

  const port = process.env.PORT || 7001;
  app.listen(port, () => console.log('server listening on port ', port));
};

//startUpSequence();
