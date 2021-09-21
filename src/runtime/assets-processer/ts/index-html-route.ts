import {createProxyMiddleware as proxy, Options} from 'http-proxy-middleware';
import express from '@wfh/express-app/dist/express';
import _ from 'lodash';
// import Url from 'url';
import {log4File, config as plinkConfig, ExtensionContext} from '@wfh/plink';
import {getSetting} from '../isom/assets-processer-setting';
const log = log4File(__filename);
interface ReqWithNextCb extends express.Request {
  __goNext: express.NextFunction;
}
export function proxyToDevServer(api: ExtensionContext) {
  // const hpmLog = log4js.getLogger('assets-process.index-html-route.proxy');
  let setting: Options | undefined = getSetting().proxyToDevServer;
  if (setting == null)
    return;

  const config: Options = _.cloneDeep(setting);
  config.changeOrigin = true;
  config.ws = true;
  config.logProvider = () => log;
  const plinkSetting = plinkConfig();
  config.logLevel = plinkSetting.devMode || plinkSetting.cliOptions?.verbose ? 'debug' : 'info';
  config.onError = (err, req, res) => {
    if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
      log.info('Can not connect to %s%s, farward to local static resource', config.target, req.url);
      if ((req as ReqWithNextCb).__goNext)
        return (req as ReqWithNextCb).__goNext();
      return;
    }
    log.warn(err);
    if ((req as ReqWithNextCb).__goNext)
      (req as ReqWithNextCb).__goNext(err);
  };

  const proxyHandler = proxy('/', config);
  api.expressAppSet((app, express) => {
    app.use((req, res, next) => {
      (req as ReqWithNextCb).__goNext = next;
      proxyHandler(req, res, next);
    });
  });
}

export function fallbackIndexHtml(api: ExtensionContext) {
  const ruleObj: {[key: string]: string} = getSetting().fallbackIndexHtml;

  const rules: Array<{reg: RegExp; tmpl: _.TemplateExecutor}> = [];

  Object.keys(ruleObj).forEach(key => {
    rules.push({
      reg: new RegExp(key),
      tmpl: _.template(ruleObj[key] )
    });
  });

  api.use('/', (req, res, next) => {
    if (req.method !== 'GET')
      return next();
    log.debug(req.url);
    rules.some(({reg, tmpl}) => {
      const orig = req.url;
      const match = reg.exec(req.url);
      if (!match)
        return false;
      // Reference to https://github.com/kapouer/express-urlrewrite/blob/master/index.js#L45
      req.url = req.originalUrl = tmpl({match});
      log.info('rewrite url %s to %s', orig, req.url);
      // const qpSetting: string | undefined = api.expressApp.get('query parser');

      return true;
    });
    next();
  });
}
