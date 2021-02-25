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
    cacheControlMaxAge: {
        [key: string]: string | null;
    };
    fallbackIndexHtml: {
        [key: string]: string;
    };
    httpProxy: {
        [proxyPath: string]: string;
    };
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
    indexHtmlProxy?: {
        [target: string]: string;
    };
}
/**
 * Plink run this funtion to get package level setting value
 */
export declare function defaultSetting(): AssetsProcesserSetting;
/**
 * The return setting value is merged with files specified by command line options --prop and -c
 * @return setting of current package
 */
export declare function getSetting(): AssetsProcesserSetting;
