"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTEXT_KEY = exports.defaultColorTheme = exports.colorThemeFac = void 0;
exports.queryThemeForComponent = queryThemeForComponent;
exports.querySchemeForComponent = querySchemeForComponent;
/**
 * Before you get start to configure color theme, you can get some knowledge of Google Material color system
 *
 * Color roles:
 * https://m3.material.io/styles/color/roles
 *
 * Online Material theme builder
 * https://material-foundation.github.io/material-theme-builder
 *
 * Material components (web) docs
 * https://github.com/material-components/material-web/blob/main/docs
 *
 * Material color utilities library:
 * https://github.com/material-foundation/material-color-utilities/tree/main/typescript
 *
 * `npm i @material/material-color-utilities`
 */
const rx = __importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const tableFor = ['loadColors', 'setScheme'];
exports.colorThemeFac = new reactivizer_1.BaseReactorFactory({
    name: 'theme',
    tableFor
}).defineReactor((init, opts) => {
    const service = init(opts);
    const { ft } = service;
    ft.loadColors(require('../../res/default-theme.json')).dp();
    ft.setScheme('light').dp();
});
exports.defaultColorTheme = exports.colorThemeFac.create();
exports.CONTEXT_KEY = '__colorTheme';
/**
* The returned observable contains defaultColorTheme if current component does not have AppContext,
* if always synchronously emit ColorTheme immediately when it is subscribed, late on it keeps observing
* new changes.
**/
function queryThemeForComponent(c) {
    const ctx$ = c.ft.queryContext(exports.CONTEXT_KEY).od(c.pt.onContextChange).pipe(rx.filter(([, , v]) => v != null), rx.map(([, , v]) => v), rx.share());
    return rx.concat(rx.merge(ctx$, rx.of(exports.defaultColorTheme)).pipe(rx.take(1)), ctx$);
}
function querySchemeForComponent(c) {
    return queryThemeForComponent(c).pipe(rx.switchMap(theme => rx.combineLatest([
        theme.latest.setScheme,
        theme.latest.loadColors
    ]).pipe(rx.map(([[m, key], [m2, colors]]) => [colors.schemes[key], m, m2]), rx.filter(([v]) => v != null))), rx.share());
}
//# sourceMappingURL=color-theme.js.map