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
exports.replaceHtml = replaceHtml;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1hb3QtYXNzZXRzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDBEQUF3QjtBQUN4QixpRUFBd0Q7QUFDeEQsK0JBQW9DO0FBQ3BDLCtDQUF5QjtBQUN6QixtREFBNkI7QUFFN0Isa0NBQWtDO0FBQ2xDLDJFQUEyRTtBQUM5RCxRQUFBLFlBQVksR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBRTdELFNBQWdCLFdBQVcsQ0FBQyxRQUFnQixFQUFFLE1BQWM7SUFDMUQsT0FBTyxxQ0FBYyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUMvQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDeEIsUUFBUSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDckMsTUFBTSxFQUFFLEdBQUcsZUFBRyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzNDLElBQUksRUFBRSxJQUFJLElBQUk7Z0JBQ1osT0FBTyxTQUFFLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDM0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzNELElBQUksR0FBRyxFQUFFLENBQUMsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMxRiwyRUFBMkU7WUFDM0Usb0ZBQW9GO1lBQ3BGLCtEQUErRDtZQUMvRCxPQUFPLFNBQUUsQ0FBQyxTQUFTLG9CQUFZLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQztTQUM3QztRQUNELE9BQU8sU0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQWhCRCxrQ0FnQkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctYW90LWFzc2V0cy9pbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgcmVwbGFjZUZvckh0bWwgfSBmcm9tICcuL2h0bWwtYXNzZXRzLXJlc29sdmVyJztcbmltcG9ydCB7b2YsIE9ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbi8vIGNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignbmctYXBwLWJ1aWxkZXIubmctYW90LWFzc2V0cycpO1xuZXhwb3J0IGNvbnN0IHJhbmRvbU51bVN0ciA9IChNYXRoLnJhbmRvbSgpICsgJycpLnNsaWNlKDIsIDYpO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVwbGFjZUh0bWwoZmlsZW5hbWU6IHN0cmluZywgc291cmNlOiBzdHJpbmcpOiBPYnNlcnZhYmxlPHN0cmluZz4ge1xuICByZXR1cm4gcmVwbGFjZUZvckh0bWwoc291cmNlLCBmaWxlbmFtZSwgKHRleHQpID0+IHtcbiAgICBpZiAodGV4dC5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgIGZpbGVuYW1lID0gZnMucmVhbHBhdGhTeW5jKGZpbGVuYW1lKTtcbiAgICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGVuYW1lKTtcbiAgICAgIGlmIChwayA9PSBudWxsKVxuICAgICAgICByZXR1cm4gb2YoJ3Jlc291cmNlIG5vdCBmb3VuZDogJyArIHRleHQpO1xuICAgICAgY29uc3QgYWJzUGF0aCA9IFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoZmlsZW5hbWUpLCB0ZXh0KTtcbiAgICAgIHRleHQgPSBway5sb25nTmFtZSArICcvJyArIFBhdGgucmVsYXRpdmUocGsucmVhbFBhY2thZ2VQYXRoLCBhYnNQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAvLyBXZSBjYW4ndCByZXBsYWNlIHRvIEFzc2V0cyBVUkwgaGVyZSwgYmVjYXVzZSBhdCB0aGlzIG1vbWVudCBpbiBBT1QgbW9kZSxcbiAgICAgIC8vIFdlYnBhY2sgaXMgbm90IHJlYWR5IHRvIHJ1biBmaWxlLWxvYWRlciB5ZXQsIHdlIGhhdmUgdG8gcmVwbGFjZSB0aGlzIGBbZHJjcF8uLi5dYFxuICAgICAgLy8gcGxhY2Vob2xkZXIgd2l0aCBhY3R1YWwgVVJMIGluIG5nLWFvdC1hc3NldHMtbG9hZGVyLnRzIGxhdGVyXG4gICAgICByZXR1cm4gb2YoYFtkcmNwXyR7cmFuZG9tTnVtU3RyfTske3RleHR9XWApO1xuICAgIH1cbiAgICByZXR1cm4gb2YodGV4dCk7XG4gIH0pO1xufVxuIl19
