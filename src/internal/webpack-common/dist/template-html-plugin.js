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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformHtml = void 0;
/* tslint:disable max-classes-per-file */
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
                    _config: plink_1.config(),
                    __api: __plink_1.default
                });
                return data;
            });
        });
    }
}
exports.default = TemplateHtmlPlugin;
function transformHtml(html) {
    return __awaiter(this, void 0, void 0, function* () {
        const compile = _.template(html);
        html = compile({
            _config: plink_1.config(),
            require
        });
        return html;
    });
}
exports.transformHtml = transformHtml;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUtaHRtbC1wbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZW1wbGF0ZS1odG1sLXBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseUNBQXlDO0FBQ3pDOzs7Ozs7O0dBT0c7QUFDSCwwQ0FBNEI7QUFHNUIsOEVBQXFEO0FBQ3JELHNDQUFrQztBQUNsQyxzREFBMEI7QUFRMUIsTUFBcUIsa0JBQWtCO0lBR3JDO1FBRlEsc0JBQWlCLEdBQThCLDZCQUFrQixDQUFDO0lBRzFFLENBQUM7SUFFRCxLQUFLLENBQUMsUUFBa0I7UUFDdEIsUUFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLFdBQVcsQ0FBQyxFQUFFO1lBQ3RFLElBQUksQ0FBQyxpQkFBaUI7aUJBQ25CLFFBQVEsQ0FBQyxXQUFXLENBQUM7aUJBQ3JCLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsRUFBRTtnQkFDNUQsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDaEMsT0FBTyxFQUFFLGNBQU0sRUFBRTtvQkFDakIsS0FBSyxFQUFFLGlCQUFHO2lCQUNYLENBQUMsQ0FBQztnQkFDSCxPQUFPLElBQUksQ0FBQztZQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFuQkQscUNBbUJDO0FBRUQsU0FBc0IsYUFBYSxDQUFhLElBQVk7O1FBQzFELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFakMsSUFBSSxHQUFHLE9BQU8sQ0FBQztZQUNiLE9BQU8sRUFBRSxjQUFNLEVBQUU7WUFDakIsT0FBTztTQUNSLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUFBO0FBVEQsc0NBU0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtY2xhc3Nlcy1wZXItZmlsZSAqL1xuLyoqXG4gKiBGb3IgY3JlYXRlLXJlYWN0LWFwcCwgYWxsb3cgbG9kYXNoIHRlbXBsYXRlIHRvIGJlIHVzZWQgaW4gYW55IFwiaW5kZXguaHRtbFwiIGZpbGUgYmVmb3JlIGl0IGdvZXMgdG8gaHRtbC13ZWJwYWNrLXBsdWdpbi5cbiAqIFxuICogaHRtbC13ZWJwYWNrLXBsdWdpbiBuYXR1YWxseSBzdXBwb3J0cyB0ZW1wbGF0ZSBlbmdpbmUgbGlrZSBsb2Rhc2gudGVtcGFsdGUsIGJ1dCB1bmZvcnR1bmF0ZWx5IHRoZSBvbmUgaW4gQ1JBJ3MgaXMgbm90XG4gKiB3b3JraW5nIGR1ZSB0byBzb21lIHNwZWNpYWwgY29uZmlndXJhdGlvbiBmcm9tIENSQS4gXG4gKiBcbiAqIFN1cHBvcnQgbG9kYXNoIHRlbXBsYXRlIHZhcmlhYmxlIFwiX2NvbmZpZ1wiIHdoaWNoIGlzIGEganNvbiBjYXJyaWVzIGFsbCBQbGluaydzIGNvbmZpZ3VyYXRpb24gcHJvcGVydGllcyBcbiAqL1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IENvbXBpbGVyIH0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgX0h0bWxXZWJwYWNrUGx1Z2luIGZyb20gJ2h0bWwtd2VicGFjay1wbHVnaW4nO1xuaW1wb3J0IHtjb25maWd9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IGFwaSBmcm9tICdfX3BsaW5rJztcbi8vIGNvbnN0IHsgUmF3U291cmNlIH0gPSByZXF1aXJlKCd3ZWJwYWNrLXNvdXJjZXMnKTtcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnRlbXBsYXRlLWh0bWwtcGx1Z2luJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVIdG1sUGx1Z2luT3B0aW9ucyB7XG4gIGh0bWxGaWxlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRlbXBsYXRlSHRtbFBsdWdpbiB7XG4gIHByaXZhdGUgaHRtbFdlYnBhY2tQbHVnaW46IHR5cGVvZiBfSHRtbFdlYnBhY2tQbHVnaW4gPSBfSHRtbFdlYnBhY2tQbHVnaW47XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gIH1cblxuICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICBjb21waWxlci5ob29rcy5jb21waWxhdGlvbi50YXAoJ1BsaW5rVGVtcGxhdGVIdG1sUGx1Z2luJywgY29tcGlsYXRpb24gPT4ge1xuICAgICAgdGhpcy5odG1sV2VicGFja1BsdWdpblxuICAgICAgICAuZ2V0SG9va3MoY29tcGlsYXRpb24pXG4gICAgICAgIC5hZnRlclRlbXBsYXRlRXhlY3V0aW9uLnRhcCgnUGxpbmtUZW1wbGF0ZUh0bWxQbHVnaW4nLCBkYXRhID0+IHtcbiAgICAgICAgICBkYXRhLmh0bWwgPSBfLnRlbXBsYXRlKGRhdGEuaHRtbCkoe1xuICAgICAgICAgICAgX2NvbmZpZzogY29uZmlnKCksXG4gICAgICAgICAgICBfX2FwaTogYXBpXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0cmFuc2Zvcm1IdG1sKHRoaXM6IHZvaWQsIGh0bWw6IHN0cmluZykge1xuICBjb25zdCBjb21waWxlID0gXy50ZW1wbGF0ZShodG1sKTtcblxuICBodG1sID0gY29tcGlsZSh7XG4gICAgX2NvbmZpZzogY29uZmlnKCksXG4gICAgcmVxdWlyZVxuICB9KTtcblxuICByZXR1cm4gaHRtbDtcbn1cbiJdfQ==