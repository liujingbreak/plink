import http from 'node:http';
import HttpProxy from 'http-proxy';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {compressedIncomingMsgToBuffer, compressResponse} from '@wfh/http-server/dist/utils';

type Response = Parameters<HttpProxy['web']>[1];

export type HttpProxyEventParams = {
  error: Parameters<HttpProxy.ErrorCallback>;
  start: Parameters<HttpProxy.StartCallback>;
  proxyReq: Parameters<HttpProxy.ProxyReqCallback>;
  proxyRes: Parameters<HttpProxy.ProxyResCallback>;
  proxyReqWs: Parameters<HttpProxy.ProxyReqWsCallback>;
  econnreset: Parameters<HttpProxy.EconnresetCallback>;
  end: Parameters<HttpProxy.EndCallback>;
  open: Parameters<HttpProxy.OpenCallback>;
  close: Parameters<HttpProxy.CloseCallback>;
};

const EVENTS = 'error,start,proxyReq,proxyRes,ProxyReqWs,econnreset,end,open,close'.split(',') as
  Array<keyof HttpProxyEventParams>;

export type HttpProxyEventObs = {
  [evt in keyof HttpProxyEventParams]: rx.Observable<{type: evt; payload: HttpProxyEventParams[evt]}>
};

export function httpProxyObservable(proxy: HttpProxy): HttpProxyEventObs {
  const obsObj = {} as HttpProxyEventObs;
  const createdSubjs = {} as typeof obsObj;

  for (const event of EVENTS) {
    Object.defineProperty(obsObj, event, {
      get() {
        const ob = createdSubjs[event];
        if (ob) {
          return ob;
        }

        const sub = rx.fromEventPattern<HttpProxyEventParams[typeof event]>(
          handler => proxy.on(event, handler),
          handler => proxy.off(event, handler)
        ).pipe(
          op.map(args => ({
            type: event,
            payload: args
          }))
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        createdSubjs[event] = sub as any;
        return sub;
      }
    });
  }
  return obsObj;
}

const REDIRECT_STATUS = new Map<number, number>([301, 302, 307, 308].map(code => [code, code]));
/**
 * e.g.
```
  rx.defer(() => {
    proxy.web(req, res, {timeout: 10000});
    return observeProxyResponse(proxy$, payload.res);
  })
```
 */
export function observeProxyResponse(httpProxy$: HttpProxyEventObs, res: Response,
  skipRedirectRes = true, maxWaitMsecond = 30000):
  HttpProxyEventObs['proxyRes'] {
  // Same as "race" which is deprecated in RxJS 7
  return httpProxy$.proxyRes.pipe(
    op.filter(event => event.payload[2] === res &&
        !(skipRedirectRes && REDIRECT_STATUS.has(event.payload[0].statusCode || 200))
    ),
    op.take(1),
    op.takeUntil(rx.merge(httpProxy$.econnreset, httpProxy$.error).pipe(
      op.filter(event => event.payload[2] === res),
      op.take(1),
      op.mergeMap(({payload: [err]}) => {
        return rx.throwError(err);
      })
    )),
    op.timeout(maxWaitMsecond)
  );
}

export function observeProxyResponseAndChange(
  httpProxy$: HttpProxyEventObs, res: Response, change: (origContent: Buffer) => Buffer | string | PromiseLike<Buffer | string>,
  skipRedirectRes = true) {
  return observeProxyResponse(httpProxy$, res, skipRedirectRes).pipe(
    op.mergeMap(async ({payload: [pRes]}) => {
      const content = await compressedIncomingMsgToBuffer(pRes);
      const changed = await Promise.resolve(change(content));
      for (const [header, value] of Object.entries(pRes.headers)) {
        if (header.toLowerCase() === 'content-length') {
          continue;
        }
        if (Array.isArray(value)) {
          for (const item of value) {
            res.setHeader(header, item);
          }
        } else if (value)
          res.setHeader(header, value);
      }
      await compressResponse(changed, res, pRes.headers['content-encoding']);
    })
  );
}

/**
 * You can use Http-proxy option `cookieDomainRewrite: {'*': ''}` at most of the time,
 * but when you want to `selfHandleResponse: true`, you'll need this function to help:
 *
 * `rewriteResponseSetCookieHeader(res.header['set-cookie'], res)`
*/
export function *clearSetCookieDomainOfProxyResponse(pRes: http.IncomingMessage) {
  const setCookieHeader = pRes.headers['set-cookie'];
  if (setCookieHeader != null)
    for (const value of setCookieHeader) {
      yield value.replace(/;\s*domain=[^;]+/ig, '');
    }
}

