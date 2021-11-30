import stream from 'stream';
import {Request, Response, NextFunction} from 'express';
import api from '__plink';
import _ from 'lodash';
import {readCompressedResponse} from '@wfh/http-server/dist/utils';
import {logger} from '@wfh/plink';

// import inspector from 'inspector';
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
    /** Bypass CORS restrict on target server, default is true */
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

  const defaultOpt = defaultProxyOptions(proxyPath, targetUrl);

  const proxyMidOpt: ProxyOptions = {
    ...defaultOpt,
    onProxyReq(...args) {
      const origHeader = args[0].getHeader('Origin');
      defaultOpt.onProxyReq(...args);

      if (opts.deleteOrigin === false) {
        // Recover removed header "Origin"
        args[0].setHeader('Origin', origHeader as string);
      }
      if (opts.onProxyReq)
        opts.onProxyReq(...args);
    },
    onProxyRes(...args) {
      if (opts.onProxyRes)
        opts.onProxyRes(...args);
      defaultOpt.onProxyRes(...args);
    },
    onError(...args) {
      defaultOpt.onError(...args);
      if (opts.onError)
        opts.onError(...args);
    }
  };


  api.expressAppSet(app => {
    app.use(proxyPath, proxy(proxyMidOpt));
  });
}

export function defaultProxyOptions(proxyPath: string, targetUrl: string) {
  proxyPath = _.trimEnd(proxyPath, '/');
  targetUrl = _.trimEnd(targetUrl, '/');
  const { protocol, host, pathname } = new URL(targetUrl);

  const patPath = new RegExp('^' + _.escapeRegExp(proxyPath) + '(/|$)');
  const hpmLog = logger.getLogger('HPM.' + proxyPath);

  const proxyMidOpt: ProxyOptions &  {[K in 'pathRewrite' | 'onProxyReq' | 'onProxyRes' | 'onError']: NonNullable<ProxyOptions[K]>} = {
    // eslint-disable-next-line max-len
    target: protocol + '//' + host,
    changeOrigin: true,
    ws: false,
    secure: false,
    cookieDomainRewrite: { '*': '' },
    pathRewrite: (path, req) => {
      // hpmLog.warn('patPath=', patPath, 'path=', path);
      const ret = path && path.replace(patPath, _.trimEnd(pathname, '/') + '/');
      // hpmLog.info(`proxy to path: ${req.method} ${protocol + '//' + host}${ret}, req.url = ${req.url}`);
      return ret;
    },
    logLevel: 'debug',
    logProvider: provider => hpmLog,
    proxyTimeout: 10000,
    onProxyReq(proxyReq, req, res, ...rest) {
      // if (opts.deleteOrigin)
      proxyReq.removeHeader('Origin'); // Bypass CORS restrict on target server
      const referer = proxyReq.getHeader('referer');
      if (typeof referer === 'string') {
        proxyReq.setHeader('referer', `${protocol}//${host}${new URL(referer).pathname}`);
      }
      hpmLog.info(`Proxy request to ${protocol}//${host}${proxyReq.path} method: ${req.method || 'uknown'}, ${JSON.stringify(proxyReq.getHeaders(), null, '  ')}`);
    },
    onProxyRes(incoming, req, res) {
      incoming.headers['Access-Control-Allow-Origin'] = '*';
      if (api.config().devMode) {
        hpmLog.info(`Proxy recieve ${req.url || ''}, status: ${incoming.statusCode!}\n`,
          JSON.stringify(incoming.headers, null, '  '));
      } else {
        hpmLog.info(`Proxy recieve ${req.url || ''}, status: ${incoming.statusCode!}`);
      }
      if (api.config().devMode) {

        const ct = incoming.headers['content-type'];
        hpmLog.info(`Response ${req.url || ''} headers:\n`, incoming.headers);
        const isText = (ct && /\b(json|text)\b/i.test(ct));
        if (isText) {
          if (!incoming.complete) {
            const bufs = [] as string[];
            void readCompressedResponse(incoming, new stream.Writable({
              write(chunk: Buffer | string, enc, cb) {
                bufs.push(Buffer.isBuffer(chunk) ? chunk.toString() : chunk);
                cb();
              },
              final(cb) {
                hpmLog.info(`Response ${req.url || ''} text body:\n`, bufs.join(''));
              }
            }));
          } else if ((incoming as {body?: Buffer | string}).body) {
            hpmLog.info(`Response ${req.url || ''} text body:\n`, (incoming as {body?: Buffer | string}).toString());
          }
        }
      }
    },
    onError(err, req, res) {
      hpmLog.warn(err);
    }
  };
  return proxyMidOpt;
}
