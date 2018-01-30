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
const dataQuality = require('./services/dataQuality');
const systemEvents = require('./services/systemEvents');
const app = express();
// adds the pg and pgp object to app
db(app);
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
routeMgmt(app);
app.systemEvents = systemEvents(app);

const DataQualityMgr = dataQuality(app).DataQualityManager;
const dataQualityMgr = new DataQualityMgr();
dataQualityMgr.listenForSavedData();

const startUpSequence = async () => {

  const dataStreamsAPI = dataStreams(app);
  const importersAPI = importers(app);

  const nodeEnv = process.env.NODE_ENV === 'production';
  if (nodeEnv) {
    await dataStreamsAPI.binance.initiateSocket({symbols: ['btc_usdt'], name: 'usdWS'});
    await dataStreamsAPI.binance.initiateSocket({name: 'allWS'});
    importersAPI.binance.runBackfill({symbol: 'btc_usdt', startupQueue: ['xrp_btc', 'neo_usdt', 'eth_btc']});
  }

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

startUpSequence();
