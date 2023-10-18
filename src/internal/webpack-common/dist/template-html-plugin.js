"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformHtml = void 0;
const tslib_1 = require("tslib");
/* eslint-disable  max-classes-per-file */
/**
 * For create-react-app, allow lodash template to be used in any "index.html" file before it goes to html-webpack-plugin.
 *
 * html-webpack-plugin natually supports template engine like lodash.tempalte, but unfortunately the one in CRA's is not
 * working due to some special configuration from CRA.
 *
 * Support lodash template variable "_config" which is a json carries all Plink's configuration properties
 */
const _ = tslib_1.__importStar(require("lodash"));
const html_webpack_plugin_1 = tslib_1.__importDefault(require("html-webpack-plugin"));
const plink_1 = require("@wfh/plink");
const __plink_1 = tslib_1.__importDefault(require("__plink"));
class TemplateHtmlPlugin {
    apply(compiler) {
        compiler.hooks.compilation.tap('PlinkTemplateHtmlPlugin', compilation => {
            html_webpack_plugin_1.default
                .getHooks(compilation)
                .afterTemplateExecution.tap('PlinkTemplateHtmlPlugin', data => {
                data.html = _.template(data.html)({
                    _config: (0, plink_1.config)(),
                    __api: __plink_1.default
                });
                return data;
            });
        });
    }
}
exports.default = TemplateHtmlPlugin;
function transformHtml(html) {
    const compile = _.template(html);
    html = compile({
        _config: (0, plink_1.config)(),
        require
    });
    return html;
}
exports.transformHtml = transformHtml;
//# sourceMappingURL=template-html-plugin.js.map