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
const __api_1 = __importDefault(require("__api"));
const html_webpack_plugin_1 = __importDefault(require("html-webpack-plugin"));
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
                    _config: __api_1.default.config(),
                    __api: __api_1.default
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
            _config: __api_1.default.config(),
            require
        });
        return html;
    });
}
exports.transformHtml = transformHtml;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUtaHRtbC1wbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZW1wbGF0ZS1odG1sLXBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseUNBQXlDO0FBQ3pDOzs7Ozs7O0dBT0c7QUFDSCwwQ0FBNEI7QUFHNUIsa0RBQXdCO0FBQ3hCLDhFQUFxRDtBQVFyRCxNQUFxQixrQkFBa0I7SUFHckM7UUFGUSxzQkFBaUIsR0FBOEIsNkJBQWtCLENBQUM7SUFHMUUsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFrQjtRQUN0QixRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsV0FBVyxDQUFDLEVBQUU7WUFDdEUsSUFBSSxDQUFDLGlCQUFpQjtpQkFDbkIsUUFBUSxDQUFDLFdBQVcsQ0FBQztpQkFDckIsc0JBQXNCLENBQUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLElBQUksQ0FBQyxFQUFFO2dCQUM1RCxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNoQyxPQUFPLEVBQUUsZUFBRyxDQUFDLE1BQU0sRUFBRTtvQkFDckIsS0FBSyxFQUFFLGVBQUc7aUJBQ1gsQ0FBQyxDQUFDO2dCQUNILE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQW5CRCxxQ0FtQkM7QUFFRCxTQUFzQixhQUFhLENBQWEsSUFBWTs7UUFDMUQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVqQyxJQUFJLEdBQUcsT0FBTyxDQUFDO1lBQ2IsT0FBTyxFQUFFLGVBQUcsQ0FBQyxNQUFNLEVBQUU7WUFDckIsT0FBTztTQUNSLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUFBO0FBVEQsc0NBU0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtY2xhc3Nlcy1wZXItZmlsZSAqL1xuLyoqXG4gKiBGb3IgY3JlYXRlLXJlYWN0LWFwcCwgYWxsb3cgbG9kYXNoIHRlbXBsYXRlIHRvIGJlIHVzZWQgaW4gYW55IFwiaW5kZXguaHRtbFwiIGZpbGUgYmVmb3JlIGl0IGdvZXMgdG8gaHRtbC13ZWJwYWNrLXBsdWdpbi5cbiAqIFxuICogaHRtbC13ZWJwYWNrLXBsdWdpbiBuYXR1YWxseSBzdXBwb3J0cyB0ZW1wbGF0ZSBlbmdpbmUgbGlrZSBsb2Rhc2gudGVtcGFsdGUsIGJ1dCB1bmZvcnR1bmF0ZWx5IHRoZSBvbmUgaW4gQ1JBJ3MgaXMgbm90XG4gKiB3b3JraW5nIGR1ZSB0byBzb21lIHNwZWNpYWwgY29uZmlndXJhdGlvbiBmcm9tIENSQS4gXG4gKiBcbiAqIFN1cHBvcnQgbG9kYXNoIHRlbXBsYXRlIHZhcmlhYmxlIFwiX2NvbmZpZ1wiIHdoaWNoIGlzIGEganNvbiBjYXJyaWVzIGFsbCBQbGluaydzIGNvbmZpZ3VyYXRpb24gcHJvcGVydGllcyBcbiAqL1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IENvbXBpbGVyIH0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBfSHRtbFdlYnBhY2tQbHVnaW4gZnJvbSAnaHRtbC13ZWJwYWNrLXBsdWdpbic7XG4vLyBjb25zdCB7IFJhd1NvdXJjZSB9ID0gcmVxdWlyZSgnd2VicGFjay1zb3VyY2VzJyk7XG4vLyBjb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy50ZW1wbGF0ZS1odG1sLXBsdWdpbicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlSHRtbFBsdWdpbk9wdGlvbnMge1xuICBodG1sRmlsZTogc3RyaW5nO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZW1wbGF0ZUh0bWxQbHVnaW4ge1xuICBwcml2YXRlIGh0bWxXZWJwYWNrUGx1Z2luOiB0eXBlb2YgX0h0bWxXZWJwYWNrUGx1Z2luID0gX0h0bWxXZWJwYWNrUGx1Z2luO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICB9XG5cbiAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgY29tcGlsZXIuaG9va3MuY29tcGlsYXRpb24udGFwKCdQbGlua1RlbXBsYXRlSHRtbFBsdWdpbicsIGNvbXBpbGF0aW9uID0+IHtcbiAgICAgIHRoaXMuaHRtbFdlYnBhY2tQbHVnaW5cbiAgICAgICAgLmdldEhvb2tzKGNvbXBpbGF0aW9uKVxuICAgICAgICAuYWZ0ZXJUZW1wbGF0ZUV4ZWN1dGlvbi50YXAoJ1BsaW5rVGVtcGxhdGVIdG1sUGx1Z2luJywgZGF0YSA9PiB7XG4gICAgICAgICAgZGF0YS5odG1sID0gXy50ZW1wbGF0ZShkYXRhLmh0bWwpKHtcbiAgICAgICAgICAgIF9jb25maWc6IGFwaS5jb25maWcoKSxcbiAgICAgICAgICAgIF9fYXBpOiBhcGlcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRyYW5zZm9ybUh0bWwodGhpczogdm9pZCwgaHRtbDogc3RyaW5nKSB7XG4gIGNvbnN0IGNvbXBpbGUgPSBfLnRlbXBsYXRlKGh0bWwpO1xuXG4gIGh0bWwgPSBjb21waWxlKHtcbiAgICBfY29uZmlnOiBhcGkuY29uZmlnKCksXG4gICAgcmVxdWlyZVxuICB9KTtcblxuICByZXR1cm4gaHRtbDtcbn1cbiJdfQ==