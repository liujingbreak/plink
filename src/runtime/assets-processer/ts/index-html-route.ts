import proxy from 'http-proxy-middleware';
import {NextFunction, Request} from 'express';
import api from '__api';
import _ from 'lodash';
import Url from 'url';
const log = require('log4js').getLogger(api.packageName);

interface ReqWithNextCb extends Request {
  __goNext: NextFunction;
}
export function proxyToDevServer() {
  const config: proxy.Config | undefined = api.config.get(api.packageName).indexHtmlProxy;
  if (config == null)
    return;
  config.changeOrigin = true;
  config.ws = true;

  config.onError = (err, req, res) => {
    if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
      log.warn('Can not connect to %s%s, farward to local static resource', config.target, req.url);
      if ((req as any).__goNext)
        return (req as ReqWithNextCb).__goNext();
      return;
    }
    log.warn(err);
    if ((req as any).__goNext)
      (req as ReqWithNextCb).__goNext(err);
  };

  const proxyHandler = proxy(config);
  api.use((req, res, next) => {
    (req as ReqWithNextCb).__goNext = next;
    proxyHandler(req, res, next);
  });
}

export function fallbackIndexHtml() {
  const ruleObj: {[key: string]: string} = api.config.get(api.packageName).fallbackIndexHtml;

  const rules: Array<{reg: RegExp, tmpl: _.TemplateExecutor}> = [];

  Object.keys(ruleObj).forEach(key => {
    rules.push({
      reg: new RegExp(key),
      tmpl: _.template(ruleObj[key] as string)
    });
  });

  api.use('/', (req, res, next) => {
    if (req.method !== 'GET')
      return next();

    rules.some(({reg, tmpl}) => {
      const orig = req.url;
      const match = reg.exec(req.url);
      if (!match)
        return false;
      // Reference to https://github.com/kapouer/express-urlrewrite/blob/master/index.js#L45
      req.url = req.originalUrl = tmpl({match});
      log.debug('rewrite url %s to %s', orig, req.url);
      req.query = Url.parse(req.url, true, true).query;
      return true;
    });
    next();
  });
}
