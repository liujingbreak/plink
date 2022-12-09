/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import stream from 'stream';
import {ClientRequest, IncomingMessage} from 'http';
import * as querystring from 'querystring';
import {Request, Response, NextFunction} from 'express';
import _ from 'lodash';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
// import {readCompressedResponse} from '@wfh/http-server/dist/utils';
import {logger, exitHooks, config, log4File, ExtensionContext} from '@wfh/plink';
import ProxyServer, {ServerOptions} from 'http-proxy';
import * as _runner from '@wfh/plink/wfh/dist/package-runner';
import {httpProxyObservable, observeProxyResponse} from './http-proxy-observable';

const pkgLog = log4File(__filename);
const logTime = logger.getLogger(pkgLog.name + '.timestamp');
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

  res.end = function(_chunk?: any, _encoding?: string | (() => void), _cb?: () => void) {
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
    const ret = end.apply(res, argv as any);
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
  } = {}) {

  proxyPath = _.trimEnd(proxyPath, '/');
  targetUrl = _.trimEnd(targetUrl, '/');

  const defaultOpt = defaultProxyOptions(proxyPath, targetUrl);
  const api = require('__api') as ExtensionContext;
  const proxyServer = new ProxyServer(defaultOpt);
  const obs = httpProxyObservable(proxyServer);
  if (opts.deleteOrigin) {
    obs.proxyReq.pipe(
      op.map(({payload: [pReq, req, res]}) => {
        pReq.removeHeader('Origin');
      })
    ).subscribe();
  }
  obs.proxyRes.pipe(
    op.map(({payload: [pRes, req, res]}) => {
      if (pRes.headers['access-control-allow-origin'] || res.hasHeader('Access-Control-Allow-Origin')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
    })
  ).subscribe();
  proxyServer.on('error', (err, _req, _res, targetOrSocket) => log.error('proxy error', err, targetOrSocket));
  proxyServer.on('econnreset', (_pReq, _req, _res, target) => log.error('proxy connection reset', target.toString()));
  api.expressAppSet(app => {
    app.use(proxyPath, (req, res, next) => {
      log.warn('handle proxy path', proxyPath);
      observeProxyResponse(obs, res).pipe(
        op.map(({payload: [proxyRes]}) => {
          if (proxyRes.statusCode === 404) {
            next();
          }
        })
      ).subscribe();
      proxyServer.web(req, res);
    });
  });
}

/*
 * This interface is not exposed by http-proxy-middleware, it is used when option "followRedirect"
 * is enabled, most likely this is behavior of http-proxy
 */
interface RedirectableRequest {
  _currentRequest: ClientRequest;
}

export function isRedirectableRequest(req: unknown): req is RedirectableRequest {
  return (req as RedirectableRequest)._currentRequest != null;
}

/**
 * Options of http-proxy-middleware
 */
export function defaultProxyOptions(proxyPath: string, targetUrl: string) {
  proxyPath = _.trimEnd(proxyPath, '/');
  targetUrl = _.trimEnd(targetUrl, '/');

  // const patPath = new RegExp('^' + _.escapeRegExp(proxyPath) + '(/|$)');
  // const hpmLog = logger.getLogger('HPM.' + targetUrl);

  const proxyMidOpt: ServerOptions = {
    // eslint-disable-next-line max-len
    target: targetUrl,
    changeOrigin: true,
    ws: false,
    secure: false,
    cookieDomainRewrite: {'*': ''},
    // pathRewrite: (path, _req) => {
    //   // hpmLog.warn('patPath=', patPath, 'path=', path);
    //   const ret = path && path.replace(patPath, _.trimEnd(pathname, '/') + '/');
    //   // hpmLog.info(`proxy to path: ${req.method} ${protocol + '//' + host}${ret}, req.url = ${req.url}`);
    //   return ret;
    // },
    proxyTimeout: 10000
    // onProxyReq(proxyReq, req, _res, ..._rest) {
    //   // This proxyReq could be "RedirectRequest" if option "followRedirect" is on
    //   if (isRedirectableRequest(proxyReq)) {
    //     hpmLog.warn(`Redirect request to ${protocol}//${host}${proxyReq._currentRequest.path} method: ${req.method || 'uknown'}, ${JSON.stringify(
    //       proxyReq._currentRequest.getHeaders(), null, '  ')}`);
    //   } else {
    //     proxyReq.removeHeader('Origin'); // Bypass CORS restrict on target server
    //     const referer = proxyReq.getHeader('referer');
    //     if (typeof referer === 'string') {
    //       proxyReq.setHeader('referer', `${protocol}//${host}${new URL(referer).pathname}`);
    //     }
    //     hpmLog.info(`Proxy request to ${protocol}//${host}${proxyReq.path} method: ${req.method || 'uknown'}, ${JSON.stringify(
    //       proxyReq.getHeaders(), null, '  ')}`);
    //   }
    // },
    // onProxyRes(incoming, req, _res) {
    //   incoming.headers['Access-Control-Allow-Origin'] = '*';
    //   if (config().devMode) {
    //     hpmLog.info(`Proxy recieve ${req.url || ''}, status: ${incoming.statusCode!}\n`,
    //       JSON.stringify(incoming.headers, null, '  '));
    //   } else {
    //     hpmLog.info(`Proxy recieve ${req.url || ''}, status: ${incoming.statusCode!}`);
    //   }
    //   if (config().devMode) {

    //     const ct = incoming.headers['content-type'];
    //     hpmLog.info(`Response ${req.url || ''} headers:\n`, incoming.headers);
    //     const isText = (ct && /\b(json|text)\b/i.test(ct));
    //     if (isText) {
    //       if (!incoming.complete) {
    //         const bufs = [] as string[];
    //         void readCompressedResponse(incoming, new stream.Writable({
    //           write(chunk: Buffer | string, _enc, cb) {
    //             bufs.push(Buffer.isBuffer(chunk) ? chunk.toString() : chunk);
    //             cb();
    //           },
    //           final(_cb) {
    //             hpmLog.info(`Response ${req.url || ''} text body:\n`, bufs.join(''));
    //           }
    //         }));
    //       } else if ((incoming as {body?: Buffer | string}).body) {
    //         hpmLog.info(`Response ${req.url || ''} text body:\n`, (incoming as {body?: Buffer | string}).toString());
    //       }
    //     }
    //   }
    // },
    // onError(err, _req, _res) {
    //   hpmLog.warn(err);
    // }
  };
  return proxyMidOpt;
}

/** Options of http-proxy
 */
export function defaultHttpProxyOptions(target?: string): ServerOptions {
  return {
    target,
    changeOrigin: true,
    ws: false,
    secure: false,
    cookieDomainRewrite: {'*': ''},
    proxyTimeout: 10000
  };
}

const log = logger.getLogger(pkgLog.name + '.createReplayReadableFactory');

export function createReplayReadableFactory(
  readable: NodeJS.ReadableStream, transforms?: NodeJS.ReadWriteStream[],
  opts?: {debugInfo?: string; expectLen?: number}
) {
  const buf$ = new rx.ReplaySubject<Buffer>();
  let cacheBufLen = 0;
  const cacheWriter = new stream.Writable({
    write(chunk: Buffer, _enc, cb) {
      cacheBufLen += chunk.length;
      // log.warn('cache updated:', cacheBufLen);
      buf$.next(chunk);
      cb();
    },
    final(cb) {
      buf$.complete();
      if (cacheBufLen === 0 || (opts?.expectLen != null && opts?.expectLen > cacheBufLen )) {
        log.error((opts?.debugInfo || '') + `, cache completed length is ${cacheBufLen} which is less than expected ${opts!.expectLen!}`);
        cb(new Error('Cache length does not meet expected length'));
      }
      cb();
    }
  });

  let caching = false;
  // let readerCount = 0;

  return () => {
    // readerCount++;
    // let bufferLengthSum = 0;
    // const readerId = readerCount;
    const readCall$ = new rx.Subject<stream.Readable>();
    const readableStream = new stream.Readable({
      read(_size) {
        readCall$.next(this);
        if (!caching) {
          caching = true;
          const streams = [readable,
            ...(transforms || []), cacheWriter] as Array<NodeJS.ReadableStream | NodeJS.WritableStream | NodeJS.ReadWriteStream>;
          // To workaround NodeJS 16 bug
          streams.reduce(
            (prev, curr) => (prev as NodeJS.ReadableStream)
              .pipe(curr as NodeJS.ReadWriteStream))
            .on('error', err => log.error(err));
        }
      }
    });

    rx.zip(readCall$, buf$)
      .pipe(
        op.map(([readable, buf], _idx) => {
          readable.push(buf);
          // bufferLengthSum += buf.length;
          // log.debug(`reader: ${readerId}, reads (${idx}) ${bufferLengthSum}`);
        }),
        op.finalize(() => {
          readableStream.push(null);
        })
      ).subscribe();

    return readableStream;
  };
}

/**
 * This is not working for POST request according to my experience in Node 16.3.0, due to
 * by the time node-http-proxy emits event "proxyReq", `req.pipe(proxyReq)` has already
 * been executed, meaning the proxyReq has "end" itself as reacting to req.complete: true 
 * or end event.
 *
 * Fix proxied body if bodyParser is involved.
 * Copied from https://github.com/chimurai/http-proxy-middleware/blob/master/src/handlers/fix-request-body.ts
 */
export function fixRequestBody(proxyReq: ClientRequest, req: IncomingMessage): void {
  const requestBody = (req as Request).body;

  if (!requestBody || !Object.keys(requestBody).length) {
    return;
  }

  const contentType = proxyReq.getHeader('Content-Type') as string | undefined;
  const writeBody = (bodyData: string) => {
    if (proxyReq.headersSent) {
      log.error('proxy request header is sent earlier than the moment of fixRequestBody()!');
    } else {
      // deepcode ignore ContentLengthInCode: bodyParser fix
      const len = Buffer.byteLength(bodyData);
      proxyReq.setHeader('Content-Length', len);
      log.info('fix proxy body', contentType, len);
      proxyReq.write(bodyData);
    }
  };

  if (contentType?.includes('application/json')) {
    writeBody(JSON.stringify(requestBody));
  } else if (contentType?.includes('application/x-www-form-urlencoded')) {
    writeBody(querystring.stringify(requestBody));
  }
}

export function createBufferForHttpProxy(req: IncomingMessage, replaceBody?: any) {
  const contentType = req.headers['content-type'];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const body = replaceBody != null ? replaceBody : (req as any).body;
  if (body == null)
    return undefined;

  if (contentType?.includes('application/json')) {
    const buf = Buffer.from(JSON.stringify(body));
    return {
      readable: new stream.Readable({
        read() {
          this.push(buf);
          this.push(null);
        }
      }),
      length: buf.length
    };
  } else if (contentType?.includes('application/x-www-form-urlencoded')) {
    const buf = Buffer.from(querystring.stringify(body));
    return {
      readable: new stream.Readable({
        read() {
          this.push(buf);
          this.push(null);
        }
      }),
      length: buf.length
    };
  } else if (Buffer.isBuffer(body)) {
    return {
      readable: new stream.Readable({
        read() {
          this.push(body);
          this.push(null);
        }
      }),
      length: body.length
    };
  }
}

export function testHttpProxyServer() {
  const {runServer} = require('@wfh/plink/wfh/dist/package-runner') as typeof _runner;
  const shutdown = runServer().shutdown;
  config.change(setting => {
    setting['@wfh/assets-processer'].httpProxy = {'/takeMeToPing': 'http://localhost:14333/ping'};
  });
  exitHooks.push(shutdown);
}

