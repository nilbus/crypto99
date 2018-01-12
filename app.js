const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const db = require('./db');
const routeMgmt = require('./lib/routeManagement');
const importers = require('./services/importers');

const app = express();
// adds the pg and pgp object to app
db(app);
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

routeMgmt(app);
app.mount('/importers', importers(app));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('server listening on port ', port));
