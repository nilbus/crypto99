const Router = require('express').Router;

module.exports = (app) => {
  app.mount = function(basePath, service) {
    let api = service;
    if (typeof service === 'function') api = service(app);

    //assuming the transport is express. Need to support socket.io
    Object.keys(api).forEach((property) => {
      const totalPath = `${basePath}/${property}`;
      const method = api[property];
      if (typeof method === 'function') {
        console.log('creating route: ', totalPath);
        app.all(totalPath, async (req, res) => {
          try{
            const results = await method({...req.body, ...req.params, ...req.query}, req, res);
            res.send(results);
          } catch (err) {
            console.log('error caught in route manager', err);
            res.sendStatus(500)
          }

        });
      } else if (typeof method === 'object') {
        app.mount(totalPath, method);
      }
    });

  }
};