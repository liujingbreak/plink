"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetting = exports.defaultSetting = void 0;
const plink_1 = require("@wfh/plink");
/**
 * Plink run this funtion to get package level setting value
 */
const defaultSetting = (cliOptions) => {
    const defaultValue = {
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
        fallbackIndexHtml: { '^/[^/?#.]+': '<%=match[0]%>/index.html' },
        httpProxy: {},
        httpProxyWithCache: {},
        fetchMailServer: null,
        serveIndex: false,
        requireToken: false
    };
    if ((0, plink_1.config)().devMode || cliOptions.env === 'local') {
        const devValue = {
            fetchRetry: 0,
            fetchLogErrPerTimes: 1,
            fetchIntervalSec: 60,
            cacheControlMaxAge: {},
            fetchMailServer: null,
            proxyToDevServer: { target: 'http://localhost:4200' }
        };
        return Object.assign(defaultValue, devValue);
    }
    return defaultValue;
};
exports.defaultSetting = defaultSetting;
/**
 * The return setting value is merged with files specified by command line options --prop and -c
 * @return setting of current package
 */
function getSetting() {
    /* eslint-disable dot-notation,@typescript-eslint/dot-notation */
    return (0, plink_1.config)()['@wfh/assets-processer'];
}
exports.getSetting = getSetting;
//# sourceMappingURL=assets-processer-setting.js.map