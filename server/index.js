/* eslint consistent-return:0 */

const express = require('express');
const logger = require('./logger');

const argv = require('minimist')(process.argv.slice(2));
const setup = require('./middlewares/frontendMiddleware');
const isDev = process.env.NODE_ENV !== 'production';
const ngrok = (isDev && process.env.ENABLE_TUNNEL) || argv.tunnel ? require('ngrok') : false;
const resolve = require('path').resolve;
const proxy = require('http-proxy-middleware');
const dataMutate = require('./middlewares/dataMutate');
const app = express();
const appInfluxdb = express();
const bodyParser = require('body-parser');
const config = require('./config.json');

let controllerBackend = config.controllerBackend;
if (process.env.FISSION_CONTROLLER !== undefined) {
  controllerBackend = process.env.FISSION_CONTROLLER;
}

let routerBackend = config.routerBackend;
if (process.env.FISSION_ROUTER !== undefined) {
  routerBackend = process.env.FISSION_ROUTER;
}

let k8sBackend = config.k8sBackend;
if (process.env.FISSION_K8S !== undefined) {
  k8sBackend = process.env.FISSION_K8S;
}

let influxdbBackend = config.influxdbBackend;
if (process.env.FISSION_LOGDB !== undefined) {
  influxdbBackend = process.env.FISSION_LOGDB;
}


app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({
  limit: '100000kb'
}))

// restream parsed body before proxying
let restream = function(proxyReq, req, res, options) {
  if (req.body) {
      let bodyData = JSON.stringify(req.body);
      // incase if content-type is application/x-www-form-urlencoded -> we need to change to application/json
      proxyReq.setHeader('Content-Type','application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      // stream the content
      proxyReq.write(bodyData);
  }
}
// Setup proxy for fission APIs
app.use(dataMutate);
app.use('/proxy/controller', proxy({ target: `http://${controllerBackend}`, pathRewrite: { '^/proxy/controller': '' }, changeOrigin: true, onProxyReq: restream }));
app.use('/proxy/router', proxy({ target: `http://${routerBackend}`, pathRewrite: { '^/proxy/router': '' }, changeOrigin: true}));
app.use('/proxy/tpr/benchmark', proxy({
  target: `http://${k8sBackend}`,
  pathRewrite: { '^/proxy/tpr/benchmark': '/apis/benchmark.fission.io/v1/namespaces/fission-benchmark' },
  changeOrigin: true
}));
appInfluxdb.use('', proxy({ target: `http://${influxdbBackend}`, changeOrigin: true, onProxyReq: restream }));

// In production we need to pass these values in instead of relying on webpack
setup(app, {
  outputPath: resolve(process.cwd(), 'build'),
  publicPath: '/',
});
setup(appInfluxdb, {
  outputPath: resolve(process.cwd(), 'build'),
  publicPath: '/',
});


// get the intended host and port number, use localhost and port 3000 if not provided
const customHost = argv.host || process.env.HOST;
const host = customHost || null; // Let http.Server use its default IPv6/4 host
const prettyHost = customHost || 'localhost';

const port = argv.port || process.env.PORT || 3000;

// Start your app.
app.listen(port, host, (err) => {
  if (err) {
    return logger.error(err.message);
  }

  // Connect to ngrok in dev mode
  if (ngrok) {
    ngrok.connect(port, (innerErr, url) => {
      if (innerErr) {
        return logger.error(innerErr);
      }

      logger.appStarted(port, prettyHost, url);
    });
  } else {
    logger.appStarted(port, prettyHost);
  }
});

appInfluxdb.listen(31315, host, (err) => {
  if (err) {
    return logger.error(err.message);
  }

  logger.appStarted(31315, prettyHost);
});
