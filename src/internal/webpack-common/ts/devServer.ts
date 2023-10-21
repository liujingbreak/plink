import {Configuration} from 'webpack-dev-server';
import {log4File, config as plinkConfig} from '@wfh/plink';
import {getSetting as getAssetsSetting} from '@wfh/assets-processer/isom/assets-processer-setting';
import {createStaticRoute} from '@wfh/assets-processer/dist/static-middleware';

const log = log4File(__filename);

/**
 * Avoid process exit when encountering Error like ERR_HTTP_HEADERS_SENT
 * Allow CORS
 * @param webpackConfig 
 */
export default function(webpackConfig: {devServer: Configuration}) {
  if (!webpackConfig.devServer) {
    return;
  }
  const devServer = webpackConfig.devServer;
  const origin = webpackConfig.devServer.onBeforeSetupMiddleware;
  devServer.host = '0.0.0.0';

  devServer.onBeforeSetupMiddleware = function(devServer) {
    // To elimiate HMR web socket issue:
    //   Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
    // at ServerResponse.setHeader (_http_outgoing.js:470:11)
    // at Array.write (/Users/liujing/bk/credit-appl/node_modules/finalhandler/index.js:285:9)
    // at listener (/Users/liujing/bk/credit-appl/node_modules/on-finished/index.js:169:15)
    // at onFinish (/Users/liujing/bk/credit-appl/node_modules/on-finished/index.js:100:5)
    // at callback (/Users/liujing/bk/credit-appl/node_modules/ee-first/index.js:55:10)

    devServer.app!.use((req, res, next) => {
      const old = res.setHeader;
      // const oldEnd = res.end;
      res.setHeader = function(...args) {
        try {
          return old.apply(res, args);
        } catch (e) {
          if ((e as any).code === 'ERR_HTTP_HEADERS_SENT') {
            log.warn('Cannot set headers after they are sent to the client');
          } else {
            throw e;
          }
        }
        return res;
      };
      next();
    });

    if (origin)
      origin.call(this, devServer);
    const staticHandler = createStaticRoute(plinkConfig.resolve('staticDir'), getAssetsSetting().cacheControlMaxAge);
    devServer.app!.use((req, res, next) => {
      if (req.url.indexOf('/dll/') >= 0) {
        log.debug('DLL resource request:', req.url);
        staticHandler(req, res, next);
      } else {
        next();
      }
    });
  };
  devServer.compress = true;
  if (devServer.headers == null)
    devServer.headers = {};
  // CORS enablement
  (devServer.headers as Record<string, any>)['Access-Control-Allow-Origin'] = '*';
  (devServer.headers as Record<string, any>)['Access-Control-Allow-Headers'] = '*';
  (devServer.static as any).watch = false;

}
