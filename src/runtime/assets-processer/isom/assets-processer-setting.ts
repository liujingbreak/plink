import {config} from '@wfh/plink';

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
  fallbackIndexHtml: {[key: string]: string};
  httpProxy: {[proxyPath: string]: string};
  fetchMailServer: {
    imap: string;
    smtp: string;
    user: string;
    loginSecret: string;
  } | null;
  /** Setting this value to true will enable serving Index HTML page for static resource under:
   *  <root dir>/dist/static.
   * 
   * You may also assign a different value to Plink property "staticDir" to change static resource directory,
   * e.g. By command line option `--prop staticDir=<dir>`
   */
  serveIndex: boolean;
  requireToken: boolean;
  /** Fallback index html proxy setting */
  indexHtmlProxy?: {[target: string]: string};
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
    fallbackIndexHtml: {'^/[^/?#]+': '<%=match[0]%>/index.html'},
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
      indexHtmlProxy: {
        target: 'http://localhost:4200'
      }
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
  // tslint:disable:no-string-literal
  return config()['@wfh/assets-processer']!;
}
