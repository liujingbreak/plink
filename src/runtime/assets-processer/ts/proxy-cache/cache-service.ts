import Path from 'path';
import { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs-extra';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import _ from 'lodash';
import {Request, Response, NextFunction} from 'express';
import {ServerOptions, createProxyServer} from 'http-proxy';
import api from '__plink';
import {log4File, config} from '@wfh/plink';
// import { createProxyMiddleware as proxy} from 'http-proxy-middleware';
import {createSlice, castByActionType} from '@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit';
import {createReplayReadableFactory} from '../utils';
import {httpProxyObservable, observeProxyResponse} from '../http-proxy-observable';
import {ProxyCacheState, CacheData} from './types';


const httpProxyLog = log4File(__filename);

export function createProxyWithCache(proxyPath: string, serverOptions: ServerOptions, cacheRootDir: string,
                 opts: {manual: boolean; memCacheLength?: number} = {manual: false}) {
  const defaultProxy = createProxyServer({
    changeOrigin: true,
    ws: false,
    secure: false,
    cookieDomainRewrite: { '*': '' },
    followRedirects: true,
    proxyTimeout: 20000,
    timeout: 10000,
    ...serverOptions
  });
  const initialState: ProxyCacheState = {
    proxy: defaultProxy,
    proxy$: httpProxyObservable(defaultProxy),
    cacheDir: cacheRootDir,
    cacheByUri: new Map(),
    memCacheLength: opts.memCacheLength == null ? Number.MAX_VALUE : opts.memCacheLength
  };

  if (!opts.manual) {
    api.expressAppSet(app => {
      app.use(proxyPath, (req, res, next) => {
        const key = keyOfUri(req.method, req.url);
        cacheController.actionDispatcher.hitCache({key, req, res, next});
      });
    });
  }
  const cacheController = createSlice({
    initialState,
    name: `HTTP-proxy-cache-${proxyPath}` ,
    debugActionOnly: config().cliOptions?.verbose,
    reducers: {
      configTransformer(s: ProxyCacheState, payload: {
        remote?: ProxyCacheState['responseTransformer'];
        cached?: ProxyCacheState['cacheTransformer'];
      }) {
        if (payload.remote)
          s.responseTransformer = payload.remote;
        if (payload.cached)
          s.cacheTransformer = payload.cached;
      },
      hitCache(s: ProxyCacheState, payload: {
        key: string; req: Request; res: Response; next: NextFunction;
        /** override remote target */
        target?: string;
      }) {},

      _requestRemoteDone(s: ProxyCacheState, payload: {
        key: string; reqHost: string | undefined;
        res: ServerResponse;
        data: {headers: CacheData['headers']; readable: IncomingMessage};
      }) {},

      _loadFromStorage(s: ProxyCacheState, payload: {key: string; req: Request; res: Response;
                       next: NextFunction;
        target?: string; }) {
        s.cacheByUri.set(payload.key, 'loading');
      },

      _requestRemote(s: ProxyCacheState, payload: {key: string; req: Request; res: Response; next: NextFunction;
        target?: string; }) {
        s.cacheByUri.set(payload.key, 'requesting');
      },
      _savingFile(s: ProxyCacheState, payload: {
        key: string;
        res: ServerResponse;
        data: CacheData;
      }) {
        s.cacheByUri.set(payload.key, 'saving');
      },
      _done(s: ProxyCacheState, payload: {
        key: string;
        res: ServerResponse;
        data: CacheData;
      }) {
        s.cacheByUri.delete(payload.key);
        // if (payload.data.statusCode !== 304) {
        //   if (s.cacheByUri.size >= s.memCacheLength) {
        //     // TODO: improve for LRU algorigthm
        //     s.cacheByUri.delete(payload.key);
        //     return;
        //   }
        //   s.cacheByUri.set(payload.key, payload.data);
        // }
      },
      _clean(s: ProxyCacheState, key: string) {
        s.cacheByUri.delete(key);
      }
    }
  });

  cacheController.epic(action$ => {
    const actions = castByActionType(cacheController.actions, action$);

    async function requestingRemote(
      key: string, reqHost: string | undefined,
      proxyRes: IncomingMessage,
      res: ServerResponse,
      headers: [string, string | string[]][]) {

      httpProxyLog.debug('cache size:', cacheController.getState().cacheByUri.size);
      const dir = Path.join(cacheController.getState().cacheDir, key);
      const file = Path.join(dir, 'body');
      const statusCode = proxyRes.statusCode || 200;
      const {responseTransformer} = cacheController.getState();
      if (statusCode === 304) {
        cacheController.actionDispatcher._done({key, res, data: {
            statusCode, headers, body: createReplayReadableFactory(proxyRes)
          }
        });
        httpProxyLog.warn('Version info is not recorded, due to response 304 from', res.req.url, ',\n you can remove existing npm/cache cache to avoid 304');
        return;
      }
      if (statusCode !== 200) {
        httpProxyLog.error(`Response code is ${statusCode} for request:`, res.req.url);
        return;
      }

      if (responseTransformer == null) {
        const doneMkdir = fs.mkdirp(dir);
        const readableFac = createReplayReadableFactory(proxyRes, undefined,
          {debugInfo: key, expectLen: parseInt(proxyRes.headers['content-length'] as string, 10)});
         // cacheController.actionDispatcher._done({key, data: {
         //       statusCode, headers, body: () => proxyRes
         //     }, res
         //   });
        cacheController.actionDispatcher._savingFile({key, data: {
            statusCode, headers, body: readableFac
          }, res
        });
        await doneMkdir;
        void fs.promises.writeFile(
          Path.join(dir, 'header.json'),
            JSON.stringify({statusCode, headers}, null, '  '),
          'utf-8');

        try {
          await new Promise((resolve, reject) => readableFac()
            .pipe(fs.createWriteStream(file))
            .on('finish', resolve)
            .on('error', reject));

          cacheController.actionDispatcher._done({key, data: {
              statusCode, headers, body: readableFac
            }, res
          });

          httpProxyLog.info(`response is written to (length: ${headers.find(item => item[0] === 'content-length')![1] as string})`,
            Path.posix.relative(process.cwd(), file));
        } catch (e) {
          httpProxyLog.error('Failed to write cache file ' +
            Path.posix.relative(process.cwd(), file), e);
        }

        return;
      }
      if (reqHost && !reqHost.startsWith('http')) {
        reqHost = 'http://' + reqHost;
      }

      const {readable: transformed, length} = await responseTransformer(headers, reqHost, proxyRes);
      const lengthHeaderIdx = headers.findIndex(row => row[0] === 'content-length');
      if (lengthHeaderIdx >= 0)
        headers[lengthHeaderIdx][1] = '' + length;

      cacheController.actionDispatcher._savingFile({key, res, data: {
          statusCode, headers, body: transformed
      } });

      await fs.mkdirp(dir);
      void fs.promises.writeFile(
        Path.join(dir, 'header.json'),
        JSON.stringify({statusCode, headers}, null, '  '),
        'utf-8');
      await new Promise((resolve, reject) => transformed()
        .on('end', resolve)
        .pipe(fs.createWriteStream(file))
        .on('error', reject));

      cacheController.actionDispatcher._done({key, res, data: {
          statusCode, headers, body: transformed
      } });
      httpProxyLog.info('write response to file', Path.posix.relative(process.cwd(), file), 'size', length);
    }

    return rx.merge(
      actions.hitCache.pipe(
        op.mergeMap( ({payload}) => {
          const waitCacheAndSendRes = rx.race(actions._done, actions._savingFile).pipe(
            op.filter(action => action.payload.key === payload.key), // In case it is of redirected request, HPM has done piping response (ignored "manual reponse" setting)
            op.take(1),
            op.mergeMap(({payload: {key, res, data}}) => {
              if (res.writableEnded) {
                throw new Error('Response is ended early, why?');
              }
              for (const entry of data.headers) {
                res.setHeader(entry[0], entry[1]);
              }
              res.statusCode = data.statusCode;
              httpProxyLog.info('reply to', payload.key);
              const pipeEvent$ = new rx.Subject<string>();
              res.on('finish', () => {
                pipeEvent$.next('finish');
              })
              .on('close', () => {
                pipeEvent$.next('close');
              })
              .on('error', err => pipeEvent$.error(err));

              data.body().pipe(res);
              return pipeEvent$.pipe(
                op.filter(event => event === 'finish' || event === 'close'),
                op.tap(event => {
                  if (event === 'close')
                    httpProxyLog.error('Response connection is closed early');
                }),
                op.take(1),
                op.mapTo(key),
                op.timeout(120000),
                op.catchError(err => {
                  if (!res.headersSent) {
                    res.statusCode = 500;
                    res.end();
                  } else {
                    res.end();
                  }
                  return rx.EMPTY;
                })
              );
            }),
            op.map(key => httpProxyLog.info(`replied: ${key}`))
          );
          const item = cacheController.getState().cacheByUri.get(payload.key);
          httpProxyLog.info('hitCache for ' + payload.key);
          if (item == null) {
            cacheController.actionDispatcher._loadFromStorage(payload);
            return waitCacheAndSendRes;
          } else if (item === 'loading' || item === 'requesting' || item === 'saving') {
            return waitCacheAndSendRes;
          } else {
            httpProxyLog.info('hit cached', payload.key);
            const transformer = cacheController.getState().cacheTransformer;
            if (transformer == null) {
              for (const entry of item.headers) {
                payload.res.setHeader(entry[0], entry[1]);
              }
              payload.res.status(item.statusCode);
              return new rx.Observable<void>(sub => {
                item.body()
                .on('end', () => {sub.next(); sub.complete(); })
                .pipe(payload.res);
              });
            }

            return rx.from(transformer(item.headers, payload.req.headers.host, item.body())).pipe(
              op.take(1),
              op.mergeMap(({readable, length}) => {
                const lengthHeaderIdx = item.headers.findIndex(row => row[0] === 'content-length');
                if (lengthHeaderIdx >= 0)
                  item.headers[lengthHeaderIdx][1] = '' + length;
                for (const entry of item.headers) {
                  payload.res.setHeader(entry[0], entry[1]);
                }
                payload.res.status(item.statusCode);
                return new rx.Observable<void>(sub => {
                  readable().on('end', () => sub.complete())
                    .pipe(payload.res)
                    .on('error', err => sub.error(err));
                });
              })
            );
          }
        }),
        op.catchError(err => {
          httpProxyLog.error('Failed to write response', err);
          return rx.EMPTY;
        })
      ),
      actions._loadFromStorage.pipe(
        op.mergeMap(async ({payload}) => {
          try {
            const dir = Path.join(cacheController.getState().cacheDir, payload.key);
            const hFile = Path.join(dir, 'header.json');
            const bFile = Path.join(dir, 'body');
            if (fs.existsSync(hFile)) {
              httpProxyLog.info('load', payload.key);
              const transformer = cacheController.getState().cacheTransformer;
              if (transformer == null) {
                const headersStr = await fs.promises.readFile(hFile, 'utf-8');
                const {statusCode, headers} = JSON.parse(headersStr) as {statusCode: number; headers: [string, string | string[]][]};

                cacheController.actionDispatcher._done({key: payload.key, res: payload.res,
                  data: {
                    statusCode,
                    headers,
                    body: () => fs.createReadStream(bFile)
                  }});
                return;
              }

              const headersStr = await fs.promises.readFile(hFile, 'utf-8');
              const {statusCode, headers} = JSON.parse(headersStr) as {statusCode: number; headers: [string, string | string[]][]};
              const {readable, length} = await transformer(headers, payload.req.headers.host, fs.createReadStream(bFile));
              const lengthHeaderIdx = headers.findIndex(row => row[0] === 'content-length');
              if (lengthHeaderIdx >= 0)
                headers[lengthHeaderIdx][1] = '' + length;

              cacheController.actionDispatcher._done({key: payload.key,
                res: payload.res,
                data: {
                  statusCode,
                  headers,
                  body: readable
                }});
            } else {
              httpProxyLog.info('No existing file for', payload.key);
              cacheController.actionDispatcher._requestRemote(payload);
            }
          } catch (ex) {
            httpProxyLog.error('Failed to save cache for: ' + payload.key, ex);
            cacheController.actionDispatcher._clean(payload.key);
          }
        })
      ),
      actions._requestRemote.pipe(
        // wait for proxy being created
        // op.mergeMap(action => cacheController.getStore().pipe(
        //   op.map(s => s.proxy),
        //   op.distinctUntilChanged(),
        //   op.filter(proxy => proxy != null),
        //   op.mapTo({proxy, payload: action.payload})
        // )),
        op.mergeMap(({payload}) => {

          const proxyOpts: ServerOptions = {};
          if (payload.target) {
            proxyOpts.target = payload.target;
            // proxyOpts.ignorePath = true;
          }
          return rx.defer(() => {
            cacheController.getState().proxy.web(payload.req, payload.res, proxyOpts);
            return observeProxyResponse(cacheController.getState().proxy$, payload.res);
          }).pipe(
            op.mergeMap(({payload: [proxyRes, _req, res]}) => {
              return requestingRemote(payload.key, payload.req.headers.host, proxyRes, res,
                Object.entries(proxyRes.headers).filter(entry => entry[1] != null) as [string, string | string[]][]);
            }),
            op.catchError(err => {
              httpProxyLog.warn(`Retry "${payload.req.url}"`, err);
              return rx.timer(1000).pipe(
                op.mapTo(rx.throwError(err))
              );
            }),
            op.retry(3)
          );
        })
      )
    ).pipe(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      op.ignoreElements(),
      op.catchError((err, src) => {
        httpProxyLog.error('HTTP proxy cache error', err);
        return src;
      })
    );
  });

  return cacheController;
}

export function keyOfUri(method: string, path: string) {
  const url = new URL('http://f.com' + path);
  const key = method + url.pathname + (url.search ? '/' + _.trimStart(url.search, '?') : '');
  return key;
}