import {Request, Response, NextFunction} from 'express';
import {getLogger} from 'log4js';
import api from '__api';
import * as Url from 'url';
import _ from 'lodash';
import proxy from 'http-proxy-middleware';
const hpmLog = getLogger(api.packageName + '.commandProxy');

const logTime = getLogger(api.packageName + '.timestamp');

export function createResponseTimestamp(req: Request, res: Response, next: NextFunction) {
  const date = new Date();
  const startTime = date.getTime();

  const end = res.end;

  function print() {
    const now = new Date().getTime();
    logTime.info(`request: ${req.method} ${req.originalUrl} | status: ${res.statusCode}, [response duration: ${now - startTime}ms` +
      `] (since ${date.toLocaleTimeString()} ${startTime}) [${req.header('user-agent')}]`);
  }

  res.end = function(chunk?: any, encoding?: string | (() => void), cb?: () => void) {
    const argv = Array.prototype.slice.call(arguments, 0);
    const lastArg = arguments[arguments.length - 1];
    if (typeof lastArg === 'function') {
      const originCb = arguments[arguments.length - 1];
      argv[argv.length - 1] = () => {
        originCb();
        print();
      };
    } else if (argv.length === 0) {
      argv.push(null, print);
    } else if (argv.length === 1) {
      argv.push(print);
    }
    const ret = end.apply(res, argv);
    return ret;
  };

  next();
}


export function commandProxy(proxyPath: string, targetUrl: string) {
  proxyPath = _.trimEnd(proxyPath, '/');
  targetUrl = _.trimEnd(targetUrl, '/');
  const {protocol, host, pathname} = Url.parse(targetUrl, false, true);

  const patPath = new RegExp(`^${proxyPath}/`);

  // http proxy middleware must be used without any body-parser middleware, so `api.expressAppSet` can put it above other
  // middlewares
  api.expressAppSet(app => {
    app.use(proxyPath, proxy({
      // tslint:disable-next-line: max-line-length
      target: protocol + '//' + host,
      changeOrigin: true,
      ws: false,
      cookieDomainRewrite: {'*': ''},
      pathRewrite: (path, req) => {
        const ret = path.replace(patPath, pathname == null ? '' : pathname );
        hpmLog.info(`proxy to path: ${protocol + '//' + host}${ret}, req.url = ${req.url}`);
        return ret;
      },
      logLevel: 'debug',
      logProvider: provider => hpmLog,
      proxyTimeout: 15000
      // onProxyReq(proxyReq, req, res) {
      //   const referer = proxyReq.getHeader('referer');
      //   if (referer) {
      //     proxyReq.setHeader('referer', `${protocol}//${host}${Url.parse(referer as string).pathname}`);
      //   }
      // },
      // onProxyRes(incoming) {
      //   log.info('Proxy recieve ' + incoming.statusCode + '\n');
      // }
    }));
  });
}

