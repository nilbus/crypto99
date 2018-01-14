const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const db = require('./db');
const routeMgmt = require('./lib/routeManagement');
const importers = require('./services/importers');
const emailer = require('./services/emailer');

const app = express();
// adds the pg and pgp object to app
db(app);
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

routeMgmt(app);
app.mount('/importers', importers(app));
app.mount('/emailer', emailer(app));

app.use(express.static(__dirname + '/react-app/build'));

// app.get('/', function (req, res) {
//   res.sendFile(__dirname + '/react-app/build/index.html');
// });

const port = process.env.PORT || 7001;
app.listen(port, () => console.log('server listening on port ', port));
