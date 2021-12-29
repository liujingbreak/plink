import Path from 'path';
import stream from 'stream';
import { IncomingMessage } from 'http';
import fs from 'fs-extra';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import _ from 'lodash';
import {Request, Response, NextFunction} from 'express';
import api from '__plink';
import {logger, log4File, config} from '@wfh/plink';
import { createProxyMiddleware as proxy, Options as HpmOptions} from 'http-proxy-middleware';
import {createSlice, castByActionType} from '@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit';
import {defaultProxyOptions} from '../utils';
import {ProxyCacheState, CacheData} from './types';

const log = log4File(__filename);
const httpProxyLog = logger.getLogger(log.category + '#httpProxy');

export function createProxyWithCache(proxyPath: string, targetUrl: string, cacheRootDir: string,
                 opts: {manual: boolean} = {manual: false}) {
  const initialState: ProxyCacheState = {
    // proxyOptions: defaultProxyOptions(proxyPath, targetUrl),
    cacheDir: cacheRootDir,
    cacheByUri: new Map(),
    responseTransformer: [],
    cacheTransformer: []
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
    debug: config().cliOptions?.verbose,
    reducers: {
      configureProxy(s: ProxyCacheState, payload: HpmOptions) {
      },
      configTransformer(s: ProxyCacheState, payload: {
        remote?: ProxyCacheState['responseTransformer'];
        cached?: ProxyCacheState['cacheTransformer'];
      }) {
        if (payload.remote)
          s.responseTransformer = payload.remote;
        if (payload.cached)
          s.cacheTransformer = payload.cached;
      },
      hitCache(s: ProxyCacheState, payload: {key: string; req: Request; res: Response; next: NextFunction}) {},

      _addToCache(s: ProxyCacheState, payload: {
        key: string; reqHost: string | undefined;
        res: Response;
        data: {headers: CacheData['headers']; readable: IncomingMessage};
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
        if (payload.data.statusCode !== 304)
          s.cacheByUri.set(payload.key, payload.data);
      }
    }
  });

  cacheController.epic(action$ => {
    const defaultProxyOpt = defaultProxyOptions(proxyPath, targetUrl);

    const proxyError$ = new rx.Subject<Parameters<(typeof defaultProxyOpt)['onError']>>();
    const proxyRes$ = new rx.Subject<Parameters<(typeof defaultProxyOpt)['onProxyRes']>>();

    let proxyMiddleware$ = new rx.ReplaySubject<ReturnType<typeof proxy>>(1);
    const actions = castByActionType(cacheController.actions, action$);

    function changeCachedResponse(headers: CacheData['headers'], reqHost: string | undefined, body: Buffer) {
      if (reqHost && !reqHost.startsWith('http')) {
        // TODO: support case of HTTPS
        reqHost = 'http://' + reqHost;
      }
      const {cacheTransformer} = cacheController.getState();
      const transformers = _.flatten(cacheTransformer.map(entry => entry(headers, reqHost)));
      return transformBuffer(body, ...transformers).pipe(
        op.map(changedBody => ({
          headers: headers.map(item => item[0] === 'content-length' ?
                             [item[0], changedBody.length + ''] as [string, string] :
                             item),
          body: changedBody
        }))
      );
    }

    return rx.merge(
      actions.configureProxy.pipe(
        op.map(({payload: extraOpt}) => {
          proxyMiddleware$.next(proxy({
            ...defaultProxyOpt,
            followRedirects: true,
            ...extraOpt,
            onProxyRes(...args) {
              proxyRes$.next(args);
              defaultProxyOpt.onProxyRes(...args);
              if (extraOpt.onProxyRes)
                extraOpt.onProxyRes(...args);
            },
            onError(...args) {
              defaultProxyOpt.onError(...args);
              proxyError$.next(args);
              if (extraOpt.onError)
                extraOpt.onError(...args);
            }
          }));
        })
      ),
      actions.hitCache.pipe(
        op.mergeMap( ({payload}) => {
          const waitCacheAndSendRes = actions._gotCache.pipe(
            op.filter(action => action.payload.key === payload.key &&
              payload.res.writableEnded !== true), // In case it is of redirected request, HPM has done piping response (ignored "manual reponse" setting)
            op.take(1),
            op.map(({payload: {data}}) => {
              for (const entry of data.headers) {
                payload.res.setHeader(entry[0], entry[1]);
              }
              payload.res.status(data.statusCode);
              payload.res.end(data.body);
            })
          );
          const item = cacheController.getState().cacheByUri.get(payload.key);
          if (item == null) {
            cacheController.actionDispatcher._loadFromStorage(payload);
            return waitCacheAndSendRes;
          } else if (item === 'loading' || item === 'requesting') {
            return waitCacheAndSendRes;
          } else {
            httpProxyLog.info('hit cached', payload.key);
            return changeCachedResponse(item.headers, payload.req.headers.host, item.body).pipe(
              op.map(data => {
                sendRes(payload.res, item.statusCode, data.headers, data.body);
              })
            );
          }
        })
      ),
      actions._loadFromStorage.pipe(
        op.mergeMap(async ({payload}) => {
          const dir = Path.join(cacheController.getState().cacheDir, payload.key);
          const hFile = Path.join(dir, 'header.json');
          const bFile = Path.join(dir, 'body');
          if (fs.existsSync(hFile)) {
            httpProxyLog.info('load', payload.key);
            const [headersStr, body] = await Promise.all([
              fs.promises.readFile(hFile, 'utf-8'),
              fs.promises.readFile(bFile)
            ]);
            const {statusCode, headers} = JSON.parse(headersStr) as {statusCode: number; headers: [string, string | string[]][]};
            const data = await changeCachedResponse(headers, payload.req.headers.host, body).toPromise();
            cacheController.actionDispatcher._gotCache({key: payload.key, data: {
              statusCode,
              headers: data.headers,
              body: data.body
            }});
            // sendRes(payload.res, statusCode, headers, body);
          } else {
            log.info('No existing file for', payload.key);
            cacheController.actionDispatcher._requestRemote(payload);
          }
        })
      ),
      actions._requestRemote.pipe(
        op.mergeMap(({payload}) => rx.merge(
          rx.race(
            proxyRes$.pipe(
              op.filter(([proxyRes, origReq]) => origReq === payload.req),
              op.take(1),
              op.map(([proxyRes, origReq]) => {
                // log.warn('origReq host', origReq.headers.host);
                cacheController.actionDispatcher._addToCache({
                  key: payload.key, reqHost: origReq.headers.host,
                  res: payload.res,
                  data: {
                    headers: Object.entries(proxyRes.headers)
                    .filter(entry => entry[1] != null) as [string, string | string[]][],
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
          proxyMiddleware$.pipe(
            op.take(1),
            op.map(proxy => proxy(payload.req, payload.res, payload.next))
          )
        ))
      ),
      actions._addToCache.pipe(
        op.mergeMap(({payload: {key, reqHost, res, data}}) => {
          httpProxyLog.debug('cache size:', cacheController.getState().cacheByUri.size);
          const dir = Path.join(cacheController.getState().cacheDir, key);
          const file = Path.join(dir, 'body');
          const statusCode = data.readable.statusCode || 200;
          const {responseTransformer} = cacheController.getState();
          if (reqHost && !reqHost.startsWith('http')) {
            reqHost = 'http://' + reqHost;
          }
          return (statusCode === 200 ? pipeToBuffer(data.readable,
            ...(responseTransformer ?
                _.flatten(responseTransformer.map(entry => entry(data.headers, reqHost))) :
                []) ) :
            pipeToBuffer(data.readable)
          ).pipe(
            op.mergeMap(async buf => {
              // log.warn('content-length:', buf.length);
              const lengthHeaderIdx = data.headers.findIndex(row => row[0] === 'content-length');
              if (lengthHeaderIdx >= 0)
                data.headers[lengthHeaderIdx][1] = '' + buf.length;

              cacheController.actionDispatcher._gotCache({key, data: {
                statusCode,
                headers: data.headers,
                body: buf
              }});
              if (statusCode === 304) {
                log.warn('Version info is not recorded, due to response 304 from', res.req.url, ',\n you can remove existing npm/cache cache to avoid 304');
                return rx.EMPTY;
              }

              await fs.mkdirp(Path.dirname(file));
              await Promise.all([
                fs.promises.writeFile(file, buf),
                fs.promises.writeFile(
                  Path.join(dir, 'header.json'),
                    JSON.stringify({statusCode, headers: data.headers}, null, '  '),
                  'utf-8')
                ]);
              httpProxyLog.info('write response to file', Path.posix.relative(process.cwd(), file), 'size', buf.length);
            }),
            op.catchError((err, src) => {
              httpProxyLog.error('HTTP proxy cache error: failed to cache response', err);
              if (fs.existsSync(dir)) {
                return rx.defer(() => fs.remove(dir)).pipe(op.take(1),
                  op.ignoreElements() // for better TS type inference
                );
              }
              return rx.EMPTY;
            })
          );
        })
      )
    ).pipe(
      op.ignoreElements(),
      op.catchError((err, src) => {
        httpProxyLog.error('HTTP proxy cache error', err);
        return src;
      })
    );
  });

  return cacheController;
}

function pipeToBuffer(source: IncomingMessage, ...transformers: NodeJS.ReadWriteStream[]) {
  return new rx.Observable<Buffer>(sub => {
    const bodyBufs: Buffer[] = [];
    let completeBody: Buffer;
    if (source.complete) {
      sub.error(new Error('response is completed earlier'));
    } else {
      const streams: Array<stream.Readable | NodeJS.WritableStream | NodeJS.ReadWriteStream> = [
        source,
        ...transformers,
        new stream.Writable({
          write(chunk, enc, cb) {
            bodyBufs.push(chunk);
            cb();
          }
        })];
      stream.pipeline(streams,
        (err: NodeJS.ErrnoException | null) => {
          if (err) return sub.error(err);
          completeBody = Buffer.concat(bodyBufs);
          sub.next(completeBody);
          sub.complete();
        }
      );
    }
    return () => {
      // I am not sure if this is proper cancelling of a stream pipeline
      source.pause();
      source.destroy();
    };
  });
}

function transformBuffer(source: Buffer, ...transformers: NodeJS.ReadWriteStream[]) {
  return new rx.Observable<Buffer>(sub => {
    const inputStream = new stream.Readable({
      read(_size) {
        this.push(source);
        this.push(null);
      }
    });
    const bodyBufs: Buffer[] = [];
    let completeBody: Buffer;

    stream.pipeline([inputStream, ...transformers, new stream.Writable({
        write(chunk, enc, cb) {
          bodyBufs.push(chunk);
          cb();
        }
      })],
      (err: NodeJS.ErrnoException | null) => {
        if (err) return sub.error(err);
        completeBody = Buffer.concat(bodyBufs);
        sub.next(completeBody);
        sub.complete();
      }
    );
  });
}

function sendRes(res: Response, statusCode: number, headers: [string, string | string[]][], body: Buffer | stream.Readable) {
  res.status(statusCode);
  for (const [name, value] of headers) {
    res.setHeader(name, value);
  }
  if (Buffer.isBuffer(body))
    res.end(body);
  else
    stream.pipeline(body, res);
}

export function keyOfUri(method: string, path: string) {
  const url = new URL('http://f.com' + path);
  const key = method + url.pathname + (url.search ? '/' + _.trimStart(url.search, '?') : '');
  return key;
}
