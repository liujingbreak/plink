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
exports.replaceHtml = exports.randomNumStr = void 0;
const __api_1 = __importDefault(require("__api"));
const html_assets_resolver_1 = require("./html-assets-resolver");
const rxjs_1 = require("rxjs");
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
// const chalk = require('chalk');
const log = require('log4js').getLogger('ng-app-builder.ng-aot-assets');
exports.randomNumStr = (Math.random() + '').slice(2, 6);
function replaceHtml(filename, source) {
    return html_assets_resolver_1.replaceForHtml(source, filename, (uri) => {
        let text = uri;
        try {
            // log.warn('replaceHtml for ' + text + ', ' + filename);
            if (text.startsWith('~')) {
                try {
                    text = require.resolve(text.slice(1));
                }
                catch (ex) {
                    text = ex.message || 'Failed to resolve ' + text;
                }
            }
            else if (text.startsWith('npm://')) {
                try {
                    text = require.resolve(text.slice('npm://'.length));
                }
                catch (ex) {
                    text = ex.message || 'Failed to resolve ' + text;
                }
            }
            else {
                filename = fs.realpathSync(filename);
                const pk = __api_1.default.findPackageByFile(filename);
                if (pk == null)
                    return rxjs_1.of('resource not found: ' + text);
                const absPath = Path.resolve(Path.dirname(filename), text);
                text = pk.longName + '/' + Path.relative(pk.realPath, absPath).replace(/\\/g, '/');
            }
            // We can't replace to Assets URL here, because at this moment in AOT mode,
            // Webpack is not ready to run file-loader yet, we have to replace this `[drcp_...]`
            // placeholder with actual URL in ng-aot-assets-loader.ts later
            return rxjs_1.of(`[drcp_${exports.randomNumStr};${text}]`);
        }
        catch (ex) {
            log.error(`Failed to transform HTML ${uri} in ${filename}`);
            return rxjs_1.of(`Failed to transform HTML ${filename} (ex.message)`);
        }
    });
}
exports.replaceHtml = replaceHtml;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQXdCO0FBQ3hCLGlFQUF3RDtBQUN4RCwrQkFBb0M7QUFDcEMsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUU3QixrQ0FBa0M7QUFDbEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBQzNELFFBQUEsWUFBWSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFN0QsU0FBZ0IsV0FBVyxDQUFDLFFBQWdCLEVBQUUsTUFBYztJQUMxRCxPQUFPLHFDQUFjLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQzlDLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQztRQUNmLElBQUk7WUFDRix5REFBeUQ7WUFFekQsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUN4QixJQUFJO29CQUNGLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDdkM7Z0JBQUMsT0FBTyxFQUFFLEVBQUU7b0JBQ1gsSUFBSSxHQUFHLEVBQUUsQ0FBQyxPQUFPLElBQUksb0JBQW9CLEdBQUcsSUFBSSxDQUFDO2lCQUNsRDthQUNGO2lCQUFNLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDcEMsSUFBSTtvQkFDRixJQUFJLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2lCQUNyRDtnQkFBQyxPQUFPLEVBQUUsRUFBRTtvQkFDWCxJQUFJLEdBQUcsRUFBRSxDQUFDLE9BQU8sSUFBSSxvQkFBb0IsR0FBRyxJQUFJLENBQUM7aUJBQ2xEO2FBQ0Y7aUJBQU07Z0JBQ0wsUUFBUSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3JDLE1BQU0sRUFBRSxHQUFHLGVBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDM0MsSUFBSSxFQUFFLElBQUksSUFBSTtvQkFDWixPQUFPLFNBQUUsQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMzRCxJQUFJLEdBQUcsRUFBRSxDQUFDLFFBQVEsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDcEY7WUFDRCwyRUFBMkU7WUFDM0Usb0ZBQW9GO1lBQ3BGLCtEQUErRDtZQUMvRCxPQUFPLFNBQUUsQ0FBQyxTQUFTLG9CQUFZLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQztTQUM3QztRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsR0FBRyxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsR0FBRyxPQUFPLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDNUQsT0FBTyxTQUFFLENBQUMsNEJBQTRCLFFBQVEsZUFBZSxDQUFDLENBQUM7U0FDaEU7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFuQ0Qsa0NBbUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyByZXBsYWNlRm9ySHRtbCB9IGZyb20gJy4vaHRtbC1hc3NldHMtcmVzb2x2ZXInO1xuaW1wb3J0IHtvZiwgT2JzZXJ2YWJsZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuLy8gY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCduZy1hcHAtYnVpbGRlci5uZy1hb3QtYXNzZXRzJyk7XG5leHBvcnQgY29uc3QgcmFuZG9tTnVtU3RyID0gKE1hdGgucmFuZG9tKCkgKyAnJykuc2xpY2UoMiwgNik7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXBsYWNlSHRtbChmaWxlbmFtZTogc3RyaW5nLCBzb3VyY2U6IHN0cmluZyk6IE9ic2VydmFibGU8c3RyaW5nPiB7XG4gIHJldHVybiByZXBsYWNlRm9ySHRtbChzb3VyY2UsIGZpbGVuYW1lLCAodXJpKSA9PiB7XG4gICAgbGV0IHRleHQgPSB1cmk7XG4gICAgdHJ5IHtcbiAgICAgIC8vIGxvZy53YXJuKCdyZXBsYWNlSHRtbCBmb3IgJyArIHRleHQgKyAnLCAnICsgZmlsZW5hbWUpO1xuXG4gICAgICBpZiAodGV4dC5zdGFydHNXaXRoKCd+JykpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0ZXh0ID0gcmVxdWlyZS5yZXNvbHZlKHRleHQuc2xpY2UoMSkpO1xuICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgIHRleHQgPSBleC5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gcmVzb2x2ZSAnICsgdGV4dDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0ZXh0LnN0YXJ0c1dpdGgoJ25wbTovLycpKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdGV4dCA9IHJlcXVpcmUucmVzb2x2ZSh0ZXh0LnNsaWNlKCducG06Ly8nLmxlbmd0aCkpO1xuICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgIHRleHQgPSBleC5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gcmVzb2x2ZSAnICsgdGV4dDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZmlsZW5hbWUgPSBmcy5yZWFscGF0aFN5bmMoZmlsZW5hbWUpO1xuICAgICAgICBjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlbmFtZSk7XG4gICAgICAgIGlmIChwayA9PSBudWxsKVxuICAgICAgICAgIHJldHVybiBvZigncmVzb3VyY2Ugbm90IGZvdW5kOiAnICsgdGV4dCk7XG4gICAgICAgIGNvbnN0IGFic1BhdGggPSBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGZpbGVuYW1lKSwgdGV4dCk7XG4gICAgICAgIHRleHQgPSBway5sb25nTmFtZSArICcvJyArIFBhdGgucmVsYXRpdmUocGsucmVhbFBhdGgsIGFic1BhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIH1cbiAgICAgIC8vIFdlIGNhbid0IHJlcGxhY2UgdG8gQXNzZXRzIFVSTCBoZXJlLCBiZWNhdXNlIGF0IHRoaXMgbW9tZW50IGluIEFPVCBtb2RlLFxuICAgICAgLy8gV2VicGFjayBpcyBub3QgcmVhZHkgdG8gcnVuIGZpbGUtbG9hZGVyIHlldCwgd2UgaGF2ZSB0byByZXBsYWNlIHRoaXMgYFtkcmNwXy4uLl1gXG4gICAgICAvLyBwbGFjZWhvbGRlciB3aXRoIGFjdHVhbCBVUkwgaW4gbmctYW90LWFzc2V0cy1sb2FkZXIudHMgbGF0ZXJcbiAgICAgIHJldHVybiBvZihgW2RyY3BfJHtyYW5kb21OdW1TdHJ9OyR7dGV4dH1dYCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGxvZy5lcnJvcihgRmFpbGVkIHRvIHRyYW5zZm9ybSBIVE1MICR7dXJpfSBpbiAke2ZpbGVuYW1lfWApO1xuICAgICAgcmV0dXJuIG9mKGBGYWlsZWQgdG8gdHJhbnNmb3JtIEhUTUwgJHtmaWxlbmFtZX0gKGV4Lm1lc3NhZ2UpYCk7XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==