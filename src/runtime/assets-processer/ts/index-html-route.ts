import {createProxyMiddleware as proxy, Options} from 'http-proxy-middleware';
import {NextFunction, Request} from 'express';
import api from '__api';
import _ from 'lodash';
// import Url from 'url';
import log4js from 'log4js';
const log = log4js.getLogger(api.packageName);
import {getSetting} from '../isom/assets-processer-setting';
interface ReqWithNextCb extends Request {
  __goNext: NextFunction;
}
export function proxyToDevServer() {
  // const hpmLog = log4js.getLogger('assets-process.index-html-route.proxy');
  let setting: Options | undefined = getSetting().proxyToDevServer;
  if (setting == null)
    return;
  const config: Options = _.cloneDeep(setting);
  config.changeOrigin = true;
  config.ws = true;
  // config.logProvider = () => hpmLog;
  config.logLevel = 'info';
  config.onError = (err, req, res) => {
    if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
      log.info('Can not connect to %s%s, farward to local static resource', config.target, req.url);
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
  const ruleObj: {[key: string]: string} = getSetting().fallbackIndexHtml;

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
      // const qpSetting: string | undefined = api.expressApp.get('query parser');

      return true;
    });
    next();
  });
}
