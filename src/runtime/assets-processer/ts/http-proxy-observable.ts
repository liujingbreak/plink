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
  skipRedirectRes = true):
  HttpProxyEventObs['proxyRes'] {
  // Same as "race" which is deprecated in RxJS 7
  return rx.merge(
    httpProxy$.proxyRes.pipe(
      op.filter(event => event.payload[2] === res &&
        !(skipRedirectRes && REDIRECT_STATUS.has(event.payload[0].statusCode || 200))
      ),
      op.take(1)
    ),
    rx.merge(httpProxy$.econnreset, httpProxy$.error).pipe(
      op.filter(event => event.payload[2] === res),
      op.take(1),
      op.mergeMap(({payload: [err]}) => {
        return rx.throwError(err);
      })
    )
  ).pipe(
    op.take(1)
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

