"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const html_assets_resolver_1 = require("./html-assets-resolver");
const rxjs_1 = require("rxjs");
const fs = tslib_1.__importStar(require("fs"));
const Path = tslib_1.__importStar(require("path"));
// const chalk = require('chalk');
// const log = require('log4js').getLogger('ng-app-builder.ng-aot-assets');
exports.randomNumStr = (Math.random() + '').slice(2, 6);
function replaceHtml(filename, source) {
    let result;
    html_assets_resolver_1.replaceForHtml(source, filename, (text) => {
        if (text.startsWith('.')) {
            filename = fs.realpathSync(filename);
            const pk = __api_1.default.findPackageByFile(filename);
            if (pk == null)
                return rxjs_1.of('resource not found: ' + text);
            const absPath = Path.resolve(Path.dirname(filename), text);
            text = pk.longName + '/' + Path.relative(pk.realPackagePath, absPath).replace(/\\/g, '/');
        }
        // console.log(filename + `[drcp_${randomNumStr}${text}_]`);
        return rxjs_1.of(`[drcp_${exports.randomNumStr};${text}]`);
    })
        .subscribe((text) => { result = text; });
    return result;
}
exports.replaceHtml = replaceHtml;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1hb3QtYXNzZXRzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDBEQUF3QjtBQUN4QixpRUFBd0Q7QUFDeEQsK0JBQXdCO0FBQ3hCLCtDQUF5QjtBQUN6QixtREFBNkI7QUFFN0Isa0NBQWtDO0FBQ2xDLDJFQUEyRTtBQUM5RCxRQUFBLFlBQVksR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBRTdELFNBQWdCLFdBQVcsQ0FBQyxRQUFnQixFQUFFLE1BQWM7SUFDM0QsSUFBSSxNQUFjLENBQUM7SUFDbkIscUNBQWMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDekMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3pCLFFBQVEsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sRUFBRSxHQUFHLGVBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMzQyxJQUFJLEVBQUUsSUFBSSxJQUFJO2dCQUNiLE9BQU8sU0FBRSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxDQUFDO1lBQzFDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMzRCxJQUFJLEdBQUcsRUFBRSxDQUFDLFFBQVEsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDMUY7UUFDRCw0REFBNEQ7UUFDNUQsT0FBTyxTQUFFLENBQUMsU0FBUyxvQkFBWSxJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7SUFDN0MsQ0FBQyxDQUFDO1NBQ0QsU0FBUyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRSxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUEsQ0FBQyxDQUFDLENBQUM7SUFDdkMsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBaEJELGtDQWdCQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy1hb3QtYXNzZXRzL2luZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyByZXBsYWNlRm9ySHRtbCB9IGZyb20gJy4vaHRtbC1hc3NldHMtcmVzb2x2ZXInO1xuaW1wb3J0IHtvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuLy8gY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuLy8gY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCduZy1hcHAtYnVpbGRlci5uZy1hb3QtYXNzZXRzJyk7XG5leHBvcnQgY29uc3QgcmFuZG9tTnVtU3RyID0gKE1hdGgucmFuZG9tKCkgKyAnJykuc2xpY2UoMiwgNik7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXBsYWNlSHRtbChmaWxlbmFtZTogc3RyaW5nLCBzb3VyY2U6IHN0cmluZyk6IHN0cmluZyB7XG5cdGxldCByZXN1bHQ6IHN0cmluZztcblx0cmVwbGFjZUZvckh0bWwoc291cmNlLCBmaWxlbmFtZSwgKHRleHQpID0+IHtcblx0XHRpZiAodGV4dC5zdGFydHNXaXRoKCcuJykpIHtcblx0XHRcdGZpbGVuYW1lID0gZnMucmVhbHBhdGhTeW5jKGZpbGVuYW1lKTtcblx0XHRcdGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGVuYW1lKTtcblx0XHRcdGlmIChwayA9PSBudWxsKVxuXHRcdFx0XHRyZXR1cm4gb2YoJ3Jlc291cmNlIG5vdCBmb3VuZDogJyArIHRleHQpO1xuXHRcdFx0Y29uc3QgYWJzUGF0aCA9IFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoZmlsZW5hbWUpLCB0ZXh0KTtcblx0XHRcdHRleHQgPSBway5sb25nTmFtZSArICcvJyArIFBhdGgucmVsYXRpdmUocGsucmVhbFBhY2thZ2VQYXRoLCBhYnNQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0fVxuXHRcdC8vIGNvbnNvbGUubG9nKGZpbGVuYW1lICsgYFtkcmNwXyR7cmFuZG9tTnVtU3RyfSR7dGV4dH1fXWApO1xuXHRcdHJldHVybiBvZihgW2RyY3BfJHtyYW5kb21OdW1TdHJ9OyR7dGV4dH1dYCk7XG5cdH0pXG5cdC5zdWJzY3JpYmUoKHRleHQpID0+IHtyZXN1bHQgPSB0ZXh0O30pO1xuXHRyZXR1cm4gcmVzdWx0O1xufVxuIl19
