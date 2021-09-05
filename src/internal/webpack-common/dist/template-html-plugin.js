"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformHtml = void 0;
/* eslint-disable  max-classes-per-file */
/**
 * For create-react-app, allow lodash template to be used in any "index.html" file before it goes to html-webpack-plugin.
 *
 * html-webpack-plugin natually supports template engine like lodash.tempalte, but unfortunately the one in CRA's is not
 * working due to some special configuration from CRA.
 *
 * Support lodash template variable "_config" which is a json carries all Plink's configuration properties
 */
const _ = __importStar(require("lodash"));
const html_webpack_plugin_1 = __importDefault(require("html-webpack-plugin"));
const plink_1 = require("@wfh/plink");
const __plink_1 = __importDefault(require("__plink"));
class TemplateHtmlPlugin {
    constructor() {
        this.htmlWebpackPlugin = html_webpack_plugin_1.default;
    }
    apply(compiler) {
        compiler.hooks.compilation.tap('PlinkTemplateHtmlPlugin', compilation => {
            this.htmlWebpackPlugin
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUtaHRtbC1wbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZW1wbGF0ZS1odG1sLXBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMENBQTBDO0FBQzFDOzs7Ozs7O0dBT0c7QUFDSCwwQ0FBNEI7QUFHNUIsOEVBQXFEO0FBQ3JELHNDQUFrQztBQUNsQyxzREFBMEI7QUFPMUIsTUFBcUIsa0JBQWtCO0lBQXZDO1FBQ1Usc0JBQWlCLEdBQThCLDZCQUFrQixDQUFDO0lBZTVFLENBQUM7SUFiQyxLQUFLLENBQUMsUUFBa0I7UUFDdEIsUUFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLFdBQVcsQ0FBQyxFQUFFO1lBQ3RFLElBQUksQ0FBQyxpQkFBaUI7aUJBQ25CLFFBQVEsQ0FBQyxXQUFXLENBQUM7aUJBQ3JCLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsRUFBRTtnQkFDNUQsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDaEMsT0FBTyxFQUFFLElBQUEsY0FBTSxHQUFFO29CQUNqQixLQUFLLEVBQUUsaUJBQUc7aUJBQ1gsQ0FBQyxDQUFDO2dCQUNILE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWhCRCxxQ0FnQkM7QUFFRCxTQUFnQixhQUFhLENBQWEsSUFBWTtJQUNwRCxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRWpDLElBQUksR0FBRyxPQUFPLENBQUM7UUFDYixPQUFPLEVBQUUsSUFBQSxjQUFNLEdBQUU7UUFDakIsT0FBTztLQUNSLENBQUMsQ0FBQztJQUVILE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQVRELHNDQVNDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgIG1heC1jbGFzc2VzLXBlci1maWxlICovXG4vKipcbiAqIEZvciBjcmVhdGUtcmVhY3QtYXBwLCBhbGxvdyBsb2Rhc2ggdGVtcGxhdGUgdG8gYmUgdXNlZCBpbiBhbnkgXCJpbmRleC5odG1sXCIgZmlsZSBiZWZvcmUgaXQgZ29lcyB0byBodG1sLXdlYnBhY2stcGx1Z2luLlxuICogXG4gKiBodG1sLXdlYnBhY2stcGx1Z2luIG5hdHVhbGx5IHN1cHBvcnRzIHRlbXBsYXRlIGVuZ2luZSBsaWtlIGxvZGFzaC50ZW1wYWx0ZSwgYnV0IHVuZm9ydHVuYXRlbHkgdGhlIG9uZSBpbiBDUkEncyBpcyBub3RcbiAqIHdvcmtpbmcgZHVlIHRvIHNvbWUgc3BlY2lhbCBjb25maWd1cmF0aW9uIGZyb20gQ1JBLiBcbiAqIFxuICogU3VwcG9ydCBsb2Rhc2ggdGVtcGxhdGUgdmFyaWFibGUgXCJfY29uZmlnXCIgd2hpY2ggaXMgYSBqc29uIGNhcnJpZXMgYWxsIFBsaW5rJ3MgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzIFxuICovXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG4vLyBpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQ29tcGlsZXIgfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCBfSHRtbFdlYnBhY2tQbHVnaW4gZnJvbSAnaHRtbC13ZWJwYWNrLXBsdWdpbic7XG5pbXBvcnQge2NvbmZpZ30gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgYXBpIGZyb20gJ19fcGxpbmsnO1xuLy8gY29uc3QgeyBSYXdTb3VyY2UgfSA9IHJlcXVpcmUoJ3dlYnBhY2stc291cmNlcycpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlSHRtbFBsdWdpbk9wdGlvbnMge1xuICBodG1sRmlsZTogc3RyaW5nO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZW1wbGF0ZUh0bWxQbHVnaW4ge1xuICBwcml2YXRlIGh0bWxXZWJwYWNrUGx1Z2luOiB0eXBlb2YgX0h0bWxXZWJwYWNrUGx1Z2luID0gX0h0bWxXZWJwYWNrUGx1Z2luO1xuXG4gIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgIGNvbXBpbGVyLmhvb2tzLmNvbXBpbGF0aW9uLnRhcCgnUGxpbmtUZW1wbGF0ZUh0bWxQbHVnaW4nLCBjb21waWxhdGlvbiA9PiB7XG4gICAgICB0aGlzLmh0bWxXZWJwYWNrUGx1Z2luXG4gICAgICAgIC5nZXRIb29rcyhjb21waWxhdGlvbilcbiAgICAgICAgLmFmdGVyVGVtcGxhdGVFeGVjdXRpb24udGFwKCdQbGlua1RlbXBsYXRlSHRtbFBsdWdpbicsIGRhdGEgPT4ge1xuICAgICAgICAgIGRhdGEuaHRtbCA9IF8udGVtcGxhdGUoZGF0YS5odG1sKSh7XG4gICAgICAgICAgICBfY29uZmlnOiBjb25maWcoKSxcbiAgICAgICAgICAgIF9fYXBpOiBhcGlcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZm9ybUh0bWwodGhpczogdm9pZCwgaHRtbDogc3RyaW5nKSB7XG4gIGNvbnN0IGNvbXBpbGUgPSBfLnRlbXBsYXRlKGh0bWwpO1xuXG4gIGh0bWwgPSBjb21waWxlKHtcbiAgICBfY29uZmlnOiBjb25maWcoKSxcbiAgICByZXF1aXJlXG4gIH0pO1xuXG4gIHJldHVybiBodG1sO1xufVxuIl19