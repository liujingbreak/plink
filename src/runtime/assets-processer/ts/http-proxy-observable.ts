import HttpProxy from 'http-proxy';
import * as rx from 'rxjs';
// import * as op from 'rxjs/operators';

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

export function httpProxyObservable(proxy: HttpProxy) {
  const obsObj = {} as {[evt in keyof HttpProxyEventParams]: rx.Observable<{type: evt; payload: HttpProxyEventParams[evt]}>};
  const createdSubjs = {} as typeof obsObj;

  for (const event of EVENTS) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    obsObj[event] = new rx.Observable<{type: keyof HttpProxyEventParams;
      payload: HttpProxyEventParams[keyof HttpProxyEventParams]; }>(sub => {
      const handler = (...args: HttpProxyEventParams[typeof event]) => {
        sub.next({type: event, payload: args});
      };
      proxy.on(event, handler);
      return () => proxy.off(event, handler as (...a: any[]) => void);
    }) as any;
    Object.defineProperty(obsObj, event, {
      get() {
        let ob = createdSubjs[event];
        if (ob)
          return ob;
        const sub = new rx.Subject<{type: keyof HttpProxyEventParams;
          payload: HttpProxyEventParams[keyof HttpProxyEventParams]; }>();

        const handler = (...args: HttpProxyEventParams[typeof event]) => {
          sub.next({type: event, payload: args});
        };
        proxy.on(event, handler);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        createdSubjs[event] = sub.asObservable() as any;
        return sub;
      }
    });
  }
  return obsObj;
}

