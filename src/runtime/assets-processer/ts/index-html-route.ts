import proxy, {ServerOptions} from 'http-proxy';
import _ from 'lodash';
// import Url from 'url';
import {log4File, ExtensionContext} from '@wfh/plink';
import {getSetting} from '../isom/assets-processer-setting';
import {createBufferForHttpProxy} from './utils';
const log = log4File(__filename);

export function proxyToDevServer(api: ExtensionContext) {
  // const hpmLog = log4js.getLogger('assets-process.index-html-route.proxy');
  const setting = getSetting().proxyToDevServer as ServerOptions | undefined;
  if (setting == null)
    return;

  const config: ServerOptions = _.cloneDeep(setting);
  config.changeOrigin = true;
  config.ws = true;
  const proxyHanlder = proxy.createProxyServer(config);
  api.use((req, res, next) => {
    const body = createBufferForHttpProxy(req);
    proxyHanlder.web(req, res, {
      buffer: body?.readable,
      headers: body ? {'content-length': body?.length + '' || '0'} : {}
    }, next);
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
