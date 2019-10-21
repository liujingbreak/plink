"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const html_assets_resolver_1 = require("./html-assets-resolver");
const rxjs_1 = require("rxjs");
const fs = tslib_1.__importStar(require("fs"));
const Path = tslib_1.__importStar(require("path"));
// const chalk = require('chalk');
const log = require('log4js').getLogger('ng-app-builder.ng-aot-assets');
exports.randomNumStr = (Math.random() + '').slice(2, 6);
function replaceHtml(filename, source) {
    try {
        return html_assets_resolver_1.replaceForHtml(source, filename, (text) => {
            if (text.startsWith('.')) {
                filename = fs.realpathSync(filename);
                const pk = __api_1.default.findPackageByFile(filename);
                if (pk == null)
                    return rxjs_1.of('resource not found: ' + text);
                const absPath = Path.resolve(Path.dirname(filename), text);
                text = pk.longName + '/' + Path.relative(pk.realPackagePath, absPath).replace(/\\/g, '/');
                // We can't replace to Assets URL here, because at this moment in AOT mode,
                // Webpack is not ready to run file-loader yet, we have to replace this `[drcp_...]`
                // placeholder with actual URL in ng-aot-assets-loader.ts later
                return rxjs_1.of(`[drcp_${exports.randomNumStr};${text}]`);
            }
            return rxjs_1.of(text);
        });
    }
    catch (ex) {
        log.error(`Failed to transform HTML ${filename}`, ex);
        return rxjs_1.throwError(ex);
    }
}
exports.replaceHtml = replaceHtml;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1hb3QtYXNzZXRzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDBEQUF3QjtBQUN4QixpRUFBd0Q7QUFDeEQsK0JBQWdEO0FBQ2hELCtDQUF5QjtBQUN6QixtREFBNkI7QUFFN0Isa0NBQWtDO0FBQ2xDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQUMzRCxRQUFBLFlBQVksR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBRTdELFNBQWdCLFdBQVcsQ0FBQyxRQUFnQixFQUFFLE1BQWM7SUFDMUQsSUFBSTtRQUNGLE9BQU8scUNBQWMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDL0MsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUN4QixRQUFRLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDckMsTUFBTSxFQUFFLEdBQUcsZUFBRyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMzQyxJQUFJLEVBQUUsSUFBSSxJQUFJO29CQUNaLE9BQU8sU0FBRSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzNELElBQUksR0FBRyxFQUFFLENBQUMsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDMUYsMkVBQTJFO2dCQUMzRSxvRkFBb0Y7Z0JBQ3BGLCtEQUErRDtnQkFDL0QsT0FBTyxTQUFFLENBQUMsU0FBUyxvQkFBWSxJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7YUFDN0M7WUFDRCxPQUFPLFNBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQixDQUFDLENBQUMsQ0FBQztLQUNKO0lBQUMsT0FBTyxFQUFFLEVBQUU7UUFDWCxHQUFHLENBQUMsS0FBSyxDQUFDLDRCQUE0QixRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN0RCxPQUFPLGlCQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDdkI7QUFDSCxDQUFDO0FBckJELGtDQXFCQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy1hb3QtYXNzZXRzL2luZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyByZXBsYWNlRm9ySHRtbCB9IGZyb20gJy4vaHRtbC1hc3NldHMtcmVzb2x2ZXInO1xuaW1wb3J0IHtvZiwgT2JzZXJ2YWJsZSwgdGhyb3dFcnJvcn0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuLy8gY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCduZy1hcHAtYnVpbGRlci5uZy1hb3QtYXNzZXRzJyk7XG5leHBvcnQgY29uc3QgcmFuZG9tTnVtU3RyID0gKE1hdGgucmFuZG9tKCkgKyAnJykuc2xpY2UoMiwgNik7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXBsYWNlSHRtbChmaWxlbmFtZTogc3RyaW5nLCBzb3VyY2U6IHN0cmluZyk6IE9ic2VydmFibGU8c3RyaW5nPiB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHJlcGxhY2VGb3JIdG1sKHNvdXJjZSwgZmlsZW5hbWUsICh0ZXh0KSA9PiB7XG4gICAgICBpZiAodGV4dC5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgZmlsZW5hbWUgPSBmcy5yZWFscGF0aFN5bmMoZmlsZW5hbWUpO1xuICAgICAgICBjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlbmFtZSk7XG4gICAgICAgIGlmIChwayA9PSBudWxsKVxuICAgICAgICAgIHJldHVybiBvZigncmVzb3VyY2Ugbm90IGZvdW5kOiAnICsgdGV4dCk7XG4gICAgICAgIGNvbnN0IGFic1BhdGggPSBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGZpbGVuYW1lKSwgdGV4dCk7XG4gICAgICAgIHRleHQgPSBway5sb25nTmFtZSArICcvJyArIFBhdGgucmVsYXRpdmUocGsucmVhbFBhY2thZ2VQYXRoLCBhYnNQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIC8vIFdlIGNhbid0IHJlcGxhY2UgdG8gQXNzZXRzIFVSTCBoZXJlLCBiZWNhdXNlIGF0IHRoaXMgbW9tZW50IGluIEFPVCBtb2RlLFxuICAgICAgICAvLyBXZWJwYWNrIGlzIG5vdCByZWFkeSB0byBydW4gZmlsZS1sb2FkZXIgeWV0LCB3ZSBoYXZlIHRvIHJlcGxhY2UgdGhpcyBgW2RyY3BfLi4uXWBcbiAgICAgICAgLy8gcGxhY2Vob2xkZXIgd2l0aCBhY3R1YWwgVVJMIGluIG5nLWFvdC1hc3NldHMtbG9hZGVyLnRzIGxhdGVyXG4gICAgICAgIHJldHVybiBvZihgW2RyY3BfJHtyYW5kb21OdW1TdHJ9OyR7dGV4dH1dYCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gb2YodGV4dCk7XG4gICAgfSk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgbG9nLmVycm9yKGBGYWlsZWQgdG8gdHJhbnNmb3JtIEhUTUwgJHtmaWxlbmFtZX1gLCBleCk7XG4gICAgcmV0dXJuIHRocm93RXJyb3IoZXgpO1xuICB9XG59XG4iXX0=
