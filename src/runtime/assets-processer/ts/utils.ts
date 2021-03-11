import {Request, Response, NextFunction} from 'express';
import {getLogger} from 'log4js';
import api from '__api';
import * as Url from 'url';
import _ from 'lodash';
import { createProxyMiddleware as proxy} from 'http-proxy-middleware';

const logTime = getLogger(api.packageName + '.timestamp');

/**
 * Middleware for printing each response process duration time to log
 * @param req 
 * @param res 
 * @param next 
 */
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

/**
 * This function uses http-proxy-middleware internally.
 * 
 * Create and use an HTTP request proxy for specific request path
 * @param proxyPath 
 * @param targetUrl 
 */
export function setupHttpProxy(proxyPath: string, apiUrl: string,
  opts: {/** Bypass CORS restrict on target server */ deleteOrigin?: boolean} = {}) {

  proxyPath = _.trimEnd(proxyPath, '/');
  apiUrl = _.trimEnd(apiUrl, '/');
  const { protocol, host, pathname } = Url.parse(apiUrl, false, true);

  const patPath = new RegExp('^' + proxyPath + '/');
  const hpmLog = getLogger('HPM.' + proxyPath);
  api.expressAppSet(app => {
    app.use(proxyPath,
      proxy({
        // tslint:disable-next-line: max-line-length
        target: protocol + '//' + host,
        changeOrigin: true,
        ws: false,
        cookieDomainRewrite: { '*': '' },
        pathRewrite: (path, req) => {
          const ret = path && path.replace(patPath, pathname == null ? '/' : pathname + '/');
          // log.info(`proxy to path: ${req.method} ${protocol + '//' + host}${ret}, req.url = ${req.url}`);
          return ret;
        },
        logLevel: 'debug',
        logProvider: provider => hpmLog,
        proxyTimeout: 10000,
        onProxyReq(proxyReq, req, res) {
          if (opts.deleteOrigin)
            proxyReq.removeHeader('Origin'); // Bypass CORS restrict on target server
          hpmLog.info(`Proxy request to ${proxyReq.protocol}//${proxyReq.host}${proxyReq.path} method: ${proxyReq.method}, ${JSON.stringify(proxyReq.getHeaders(), null, '  ')}`);
          const referer = proxyReq.getHeader('referer');
          if (referer) {
            proxyReq.setHeader('referer', `${protocol}//${host}${Url.parse(referer as string).pathname}`);
          }
          // if (api.config().devMode)
          //   hpmLog.info('on proxy request headers: ', JSON.stringify(proxyReq.getHeaders(), null, '  '));
        },
        onProxyRes(incoming) {
          incoming.headers['Access-Control-Allow-Origin'] = '*';
          hpmLog.info('Proxy recieve ' + incoming.statusCode + '\n');
          if (api.config().devMode)
            hpmLog.info('Proxy recieve ' + incoming.statusCode + '\n', JSON.stringify(incoming.headers, null, '  '));
        }
      })
    );
  });
}

