import stream from 'stream';
import Path from 'path';
import {Request, Response, NextFunction} from 'express';
import api from '__api';
import _ from 'lodash';
import {readCompressedResponse} from '@wfh/http-server/dist/utils';
import {logger, log4File} from '@wfh/plink';
import {createSlice, castByActionType} from '@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit';
import fs from 'fs-extra';

import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import inspector from 'inspector';
import { createProxyMiddleware as proxy, Options as ProxyOptions} from 'http-proxy-middleware';

inspector.open(9222, 'localhost', true);
const logTime = logger.getLogger(api.packageName + '.timestamp');
const log = log4File(__filename);
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

function defaultProxyOptions(proxyPath: string, targetUrl: string) {
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

type ProxyCacheState = {
  cacheDir: string;
  cacheByUri: Map<string, CacheData | 'loading' | 'requesting'>;
  error?: Error;
};

type CacheData = {
  headers: [string, string | string[]][];
  body: Buffer;
};

export function createProxyWithCache(proxyPath: string, targetUrl: string, cacheRootDir: string) {
  debugger;
  const initialState: ProxyCacheState = {
    cacheDir: cacheRootDir,
    cacheByUri: new Map()
  };

  api.expressAppSet(app => {
    app.use(proxyPath, (req, res, next) => {
      const key = keyOfUri(req.method, req.url);
      cacheService.actionDispatcher.hitCache({key, req, res, next});
    });
  });

  const cacheService = createSlice({
    initialState,
    name: proxyPath,
    reducers: {
      hitCache(s: ProxyCacheState, payload: {key: string; req: Request; res: Response; next: NextFunction}) {},

      _addToCache(s: ProxyCacheState, payload: {
        key: string;
        data: {headers: CacheData['headers']; readable: stream.Readable};
      }) {},

      _loadFromStorage(s: ProxyCacheState, payload: {key: string; req: Request; res: Response; next: NextFunction}) {
        s.cacheByUri.set(payload.key, 'loading');
      },

      _requestRemote(s: ProxyCacheState, payload: {key: string; req: Request; res: Response; next: NextFunction}) {
        s.cacheByUri.set(payload.key, 'requesting');
      },
      _gotCache(s: ProxyCacheState, payload: {
        key: string;
        data: CacheData;
      }) {
        // s.cacheByUri.set(payload.key, payload.data);
        s.cacheByUri.delete(payload.key);
      }
    }
  });

  cacheService.epic(action$ => {
    const proxyOpt = defaultProxyOptions(proxyPath, targetUrl);

    const proxyError$ = new rx.Subject<Parameters<(typeof proxyOpt)['onError']>>();
    const proxyRes$ = new rx.Subject<Parameters<(typeof proxyOpt)['onProxyRes']>>();

    const proxyMiddleware = proxy({
      ...proxyOpt,
      onProxyRes(...args) {
        proxyRes$.next(args);
        proxyOpt.onProxyRes(...args);
      },
      onError(...args) {
        proxyOpt.onError(...args);
        proxyError$.next(args);
      }
    });
    const actions = castByActionType(cacheService.actions, action$);

    return rx.merge(
      actions.hitCache.pipe(
        op.mergeMap( ({payload}) => {
          const item = cacheService.getState().cacheByUri.get(payload.key);
          if (item == null) {
            cacheService.actionDispatcher._loadFromStorage(payload);
            return rx.EMPTY;
          } else if (item === 'loading' || item === 'requesting') {
            return actions._gotCache.pipe(
              op.filter(action => action.payload.key === payload.key),
              op.take(1),
              op.map(({payload: {data}}) => {
                for (const entry of data.headers) {
                  payload.res.setHeader(entry[0], entry[1]);
                }
                payload.res.end(data.body);
              })
            );
          } else {
            sendRes(payload.res, item.headers, item.body);
            return rx.EMPTY;
          }
        })
      ),
      actions._loadFromStorage.pipe(
        op.map(async ({payload}) => {
          const hFile = Path.resolve(cacheService.getState().cacheDir, payload.key, payload.key + '.header.json');
          const bFile = Path.resolve(cacheService.getState().cacheDir, payload.key, payload.key + '.body');
          if (fs.existsSync(hFile)) {
            const [headersStr, body] = await Promise.all([
              fs.promises.readFile(hFile, 'utf-8'),
              fs.promises.readFile(bFile)
            ]);
            const headers = JSON.parse(headersStr) as [string, string | string[]][];
            cacheService.actionDispatcher._gotCache({key: payload.key, data: {
              headers,
              body
            }});
            sendRes(payload.res, headers, body);
          } else {
            cacheService.actionDispatcher._requestRemote(payload);
          }
        })
      ),
      actions._requestRemote.pipe(
        op.mergeMap(({payload}) => rx.merge(
          rx.race(
            proxyRes$.pipe(
              op.filter(([proxyRes, origReq]) => origReq === payload.req),
              op.take(1),
              op.map(([proxyRes]) => {
                cacheService.actionDispatcher._addToCache({
                  key: payload.key,
                  data: {
                    headers: Object.entries(proxyRes.headers).filter(entry => entry[1] != null) as [string, string | string[]][],
                    readable: proxyRes
                  }
                });
              })
            ),
            proxyError$.pipe(
              op.filter(([err, origReq]) => origReq === payload.req),
              op.take(1),
              op.map(() => {})
            )
          ),
          rx.defer(() => proxyMiddleware(payload.req, payload.res, payload.next)).pipe(
            op.ignoreElements()
          )
        ))
      ),
      actions._addToCache.pipe(
        op.mergeMap(async ({payload: {key, data}}) => {
          log.info('cache size:', cacheService.getState().cacheByUri.size);
          const dir = Path.resolve(cacheService.getState().cacheDir, key);
          await fs.mkdirp(dir);
          const fileWriter = fs.createWriteStream(Path.join(dir, key + '.body'), {flags: 'w'});
          const bodyBufs: Buffer[] = [];
          let completeBody: Buffer;
          await Promise.all([
            new Promise<void>((resolve, reject) => {
              stream.pipeline(
                data.readable,
                new stream.Transform({
                  transform(chunk, enc) {
                    bodyBufs.push(chunk);
                    this.push(chunk);
                  },
                  flush(cb) {
                    completeBody = Buffer.concat(bodyBufs);
                    cacheService.actionDispatcher._gotCache({key, data: {
                      headers: data.headers,
                      body: completeBody
                    }});
                    cb();
                  }
                }),
                fileWriter,
                err => {
                  if (err) return reject(err);
                  resolve();
                }
              );
            }),
            fs.promises.writeFile(
              Path.join(dir, key + '.header.json'),
              JSON.stringify(data.headers, null, '  '),
              'utf-8')
          ]);
        })
      )
    ).pipe(
      op.ignoreElements(),
      op.catchError((err, src) => src)
    );
  });
}

function sendRes(res: Response, headers: [string, string | string[]][], body: Buffer | stream.Readable) {
  for (const [name, value] of headers) {
    res.setHeader(name, value);
  }
  if (Buffer.isBuffer(body))
    res.end(body);
  else
    stream.pipeline(body, res);
}

function keyOfUri(method: string, uri: string) {
  const url = new URL(method + ':/' + uri);
  const key = method + '/' + url.pathname + (url.search ? '/' + _.trimStart(url.search, '?') : '');
  return key;
}

export const testable = {
  keyOfUri
};
