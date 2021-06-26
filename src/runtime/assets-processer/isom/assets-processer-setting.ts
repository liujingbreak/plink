import {config} from '@wfh/plink';
import {Options} from 'http-proxy-middleware';
/**
 * Package setting type
 */
export interface AssetsProcesserSetting {
  /** @deprecated */
  fetchUrl: string | null;
  /** @deprecated */
  fetchRetry: number;
  /** @deprecated */
  downloadMode: 'fork';
  /** @deprecated */
  fetchLogErrPerTimes: number;
  /** @deprecated */
  fetchIntervalSec: number;
  /** Response maxAge header value against different media type file */
  cacheControlMaxAge: {[key: string]: string | null};
  /** For HTML 5 history based client side route, serving index.html for 
   * specific path.
   * 
   * Key is a RegExp string, value is target path.
   * e.g.  {'^/[^/?#.]+': '<%=match[0]%>/index.html'}
   * 
   * In case user access "/hellow?uid=123", the actual Express.js
   * `request.path` will be change to "/index.html", `request.query` will be kept
   */
  fallbackIndexHtml: {[key: string]: string};
  httpProxy: {[proxyPath: string]: string};
  fetchMailServer: {
    imap: string;
    smtp: string;
    user: string;
    loginSecret: string;
    env?: string;
  } | null;
  /** Setting this value to true will enable serving Index HTML page for static resource under:
   *  <root dir>/dist/static.
   * 
   * You may also assign a different value to Plink property "staticDir" to change static resource directory,
   * e.g. By command line option `--prop staticDir=<dir>`
   */
  serveIndex: boolean;
  requireToken: boolean;
  /** 
   * @type import('http-proxy-middleware').Config
   * Proxy request to another dev server, if proxy got an error response, then fallback request to
   * local static file resource
   * e.g. {target: http://localhsot:3000} for create-react-app dev server,
   * {target: http://localhost:4200} for Angular dev server
   * 
   * Default value is {target: 'http://localhost:4200'} when "--dev" mode is on.
   * 
   * ChangeOrigin and ws (websocket) will be enabled, since devServer mostly like will
   * enable Webpack HMR through websocket.
  */
  proxyToDevServer?: Options;
}

/**
 * Plink run this funtion to get package level setting value
 */
export function defaultSetting(): AssetsProcesserSetting {
  const defaultValue: AssetsProcesserSetting = {
    fetchUrl: null,
    fetchRetry: 5,
    downloadMode: 'fork',
    fetchLogErrPerTimes: 20,
    fetchIntervalSec: 90,
    cacheControlMaxAge: {
      js: '365 days',
      css: '365 days',
      less: '365 days',
      html: null,
      png: '365 days',
      jpg: '365 days',
      jpeg: '365 days',
      gif: '365 days',
      svg: '365 days',
      eot: '365 days',
      ttf: '365 days',
      woff: '365 days',
      woff2: '365 days'
    },
    fallbackIndexHtml: {'^/[^/?#.]+': '<%=match[0]%>/index.html'},
    httpProxy: {},
    fetchMailServer: null,
    serveIndex: false,
    requireToken: false
  };

  if (config().devMode || config().cliOptions!.env === 'local') {
    const devValue: Partial<AssetsProcesserSetting> = {
      fetchRetry: 0,
      fetchLogErrPerTimes: 1,
      fetchIntervalSec: 60,
      cacheControlMaxAge: {},
      fetchMailServer: null,
      proxyToDevServer: {target: 'http://localhost:4200'}
    };
    return Object.assign(defaultValue, devValue);
  }
  return defaultValue;
}

/**
 * The return setting value is merged with files specified by command line options --prop and -c
 * @return setting of current package
 */
export function getSetting(): AssetsProcesserSetting {
  /* eslint-disable dot-notation,@typescript-eslint/dot-notation */
  return config()['@wfh/assets-processer']!;
}
