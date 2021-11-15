import {Request, Response, NextFunction} from 'express';
import stream from 'stream';
import api from '__api';
import _ from 'lodash';
import {config, logger} from '@wfh/plink';
// import inspector from 'inspector';
// import fs from 'fs';
import { createProxyMiddleware as proxy, Options as ProxyOptions} from 'http-proxy-middleware';

// inspector.open(9222, 'localhost', true);
const logTime = logger.getLogger(api.packageName + '.timestamp');

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
      `] (since ${date.toLocaleTimeString()} ${startTime}) [${req.header('user-agent')!}]`);
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
 * Be aware with command line option "--verbose", once enable "verbose", this function will
 * read (pipe) remote server response body into a string buffer for any message with content-type is "text" or "json" based
 * Create and use an HTTP request proxy for specific request path
 * @param proxyPath 
 * @param targetUrl 
 */
export function setupHttpProxy(proxyPath: string, targetUrl: string,
  opts: {
    /** Bypass CORS restrict on target server */
    deleteOrigin?: boolean;
    pathRewrite?: ProxyOptions['pathRewrite'];
    onProxyReq?: ProxyOptions['onProxyReq'];
    onProxyRes?: ProxyOptions['onProxyRes'];
    onError?: ProxyOptions['onError'];
    buffer?: ProxyOptions['buffer'];
    selfHandleResponse?: ProxyOptions['selfHandleResponse'];
    proxyTimeout?: ProxyOptions['proxyTimeout'];
  } = {}) {

  proxyPath = _.trimEnd(proxyPath, '/');
  targetUrl = _.trimEnd(targetUrl, '/');
  const { protocol, host, pathname } = new URL(targetUrl);

  const patPath = new RegExp('^' + _.escapeRegExp(proxyPath) + '(/|$)');
  const hpmLog = logger.getLogger('HPM.' + proxyPath);
  const proxyMidOpt: ProxyOptions = {
    // eslint-disable-next-line max-len
    target: protocol + '//' + host,
    changeOrigin: true,
    ws: false,
    secure: false,
    cookieDomainRewrite: { '*': '' },
    pathRewrite: opts.pathRewrite ?  opts.pathRewrite : (path, req) => {
      // hpmLog.warn('patPath=', patPath, 'path=', path);
      const ret = path && path.replace(patPath, _.trimEnd(pathname, '/') + '/');
      // hpmLog.info(`proxy to path: ${req.method} ${protocol + '//' + host}${ret}, req.url = ${req.url}`);
      return ret;
    },
    logLevel: 'debug',
    logProvider: provider => hpmLog,
    proxyTimeout: opts.proxyTimeout != null ? opts.proxyTimeout : 10000,
    onProxyReq(proxyReq, req, res) {
      if (opts.deleteOrigin)
        proxyReq.removeHeader('Origin'); // Bypass CORS restrict on target server
      const referer = proxyReq.getHeader('referer');
      if (referer) {
        proxyReq.setHeader('referer', `${protocol}//${host}${new URL(referer as string).pathname}`);
      }
      if (opts.onProxyReq) {
        opts.onProxyReq(proxyReq, req, res);
      }
      hpmLog.info(`Proxy request to ${protocol}//${host}${proxyReq.path} method: ${req.method}, ${JSON.stringify(proxyReq.getHeaders(), null, '  ')}`);
      // if (api.config().devMode)
      //   hpmLog.info('on proxy request headers: ', JSON.stringify(proxyReq.getHeaders(), null, '  '));
    },
    onProxyRes(incoming, req, res) {
      incoming.headers['Access-Control-Allow-Origin'] = '*';
      if (api.config().devMode) {
        hpmLog.info(`Proxy recieve ${req.url}, status: ${incoming.statusCode!}\n`,
          JSON.stringify(incoming.headers, null, '  '));
      } else {
        hpmLog.info(`Proxy recieve ${req.url}, status: ${incoming.statusCode!}`);
      }
      if (api.config().devMode || config().cliOptions?.verbose) {

        const ct = incoming.headers['content-type'];
        hpmLog.info(`Response ${req.url} headers:\n`, incoming.rawHeaders);
        const isText = (ct && /\b(json|text)\b/i.test(ct));
        if (isText) {
          const bufs = [] as string[];
          incoming.pipe(new stream.Writable({
            write(chunk: Buffer, enc, cb) {
              bufs.push((chunk.toString()));
              cb();
            },
            final(cb) {
              hpmLog.info(`Response ${req.url} text body:\n`, bufs.join(''));
            }
          }));
        }
      }
      if (opts.onProxyRes) {
        opts.onProxyRes(incoming, req, res);
      }
    },
    onError(err, req, res) {
      hpmLog.warn(err);
      if (opts.onError) {
        opts.onError(err, req, res);
      }
    }
  };
  api.expressAppSet(app => {
    app.use(proxyPath, proxy(proxyMidOpt));
  });
}

// export function proxyAndRecordResponse(proxyPath: string, targetUrl: string) {
//   setupHttpProxy(proxyPath, targetUrl, {
//     deleteOrigin: true,
//     onProxyRes(incoming, req, res) {
//       const filePath = req.url;
//       incoming.pipe();
//     }
//   });
// }
