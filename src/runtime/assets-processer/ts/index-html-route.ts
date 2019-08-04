import proxy from 'http-proxy-middleware';
import {NextFunction, Request} from 'express';
import api from '__api';
import _ from 'lodash';
const log = require('log4js').getLogger(api.packageName);

interface ReqWithNextCb extends Request {
  __goNext: NextFunction;
}
function proxyToDevServer() {
  const config: proxy.Config | undefined = api.config.get(api.packageName).indexHtmlProxy;
  if (config == null)
    return;
  config.changeOrigin = true;
  config.ws = true;

  config.onError = (err, req, res) => {
    if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
      log.warn('Can not connect to %s, farward to local static resource', config.target);
      return (req as ReqWithNextCb).__goNext();
    }
    log.warn(err);
    (req as ReqWithNextCb).__goNext(err);
  };

  const proxyHandler = proxy(config);
  api.use((req, res, next) => {
    (req as ReqWithNextCb).__goNext = next;
    proxyHandler(req, res, next);
  });
}

export default function resourcePathRewrite() {
  proxyToDevServer();
  const ruleObj: {[key: string]: string} = api.config.get(api.packageName).resourcePathRewrite;

  const rules: Array<{reg: RegExp, tmpl: _.TemplateExecutor}> = [];

  Object.keys(ruleObj).forEach(key => {
    rules.push({
      reg: new RegExp(key),
      tmpl: _.template(ruleObj[key] as string)
    });
  });

  api.use((req, res, next) => {
    if (req.method !== 'GET')
      return next();

    rules.some(({reg, tmpl}) => {
      const match = reg.exec(req.path);
      if (!match)
        return false;
      const origin = req.path;
      req.path = tmpl({match});
      log.info('rewrite path %s to %s', origin, req.path);
      return true;
    });
    next();
  });
}
