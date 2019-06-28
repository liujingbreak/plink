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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1hb3QtYXNzZXRzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDBEQUF3QjtBQUN4QixpRUFBd0Q7QUFDeEQsK0JBQXdCO0FBQ3hCLCtDQUF5QjtBQUN6QixtREFBNkI7QUFFN0Isa0NBQWtDO0FBQ2xDLDJFQUEyRTtBQUM5RCxRQUFBLFlBQVksR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBRTdELFNBQWdCLFdBQVcsQ0FBQyxRQUFnQixFQUFFLE1BQWM7SUFDMUQsSUFBSSxNQUFjLENBQUM7SUFDbkIscUNBQWMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDeEMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3hCLFFBQVEsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sRUFBRSxHQUFHLGVBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMzQyxJQUFJLEVBQUUsSUFBSSxJQUFJO2dCQUNaLE9BQU8sU0FBRSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxDQUFDO1lBQzNDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMzRCxJQUFJLEdBQUcsRUFBRSxDQUFDLFFBQVEsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDM0Y7UUFDRCw0REFBNEQ7UUFDNUQsT0FBTyxTQUFFLENBQUMsU0FBUyxvQkFBWSxJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7SUFDOUMsQ0FBQyxDQUFDO1NBQ0QsU0FBUyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRSxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUEsQ0FBQyxDQUFDLENBQUM7SUFDdkMsT0FBTyxNQUFPLENBQUM7QUFDakIsQ0FBQztBQWhCRCxrQ0FnQkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctYW90LWFzc2V0cy9pbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgcmVwbGFjZUZvckh0bWwgfSBmcm9tICcuL2h0bWwtYXNzZXRzLXJlc29sdmVyJztcbmltcG9ydCB7b2Z9IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbi8vIGNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignbmctYXBwLWJ1aWxkZXIubmctYW90LWFzc2V0cycpO1xuZXhwb3J0IGNvbnN0IHJhbmRvbU51bVN0ciA9IChNYXRoLnJhbmRvbSgpICsgJycpLnNsaWNlKDIsIDYpO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVwbGFjZUh0bWwoZmlsZW5hbWU6IHN0cmluZywgc291cmNlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgcmVzdWx0OiBzdHJpbmc7XG4gIHJlcGxhY2VGb3JIdG1sKHNvdXJjZSwgZmlsZW5hbWUsICh0ZXh0KSA9PiB7XG4gICAgaWYgKHRleHQuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICBmaWxlbmFtZSA9IGZzLnJlYWxwYXRoU3luYyhmaWxlbmFtZSk7XG4gICAgICBjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlbmFtZSk7XG4gICAgICBpZiAocGsgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIG9mKCdyZXNvdXJjZSBub3QgZm91bmQ6ICcgKyB0ZXh0KTtcbiAgICAgIGNvbnN0IGFic1BhdGggPSBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGZpbGVuYW1lKSwgdGV4dCk7XG4gICAgICB0ZXh0ID0gcGsubG9uZ05hbWUgKyAnLycgKyBQYXRoLnJlbGF0aXZlKHBrLnJlYWxQYWNrYWdlUGF0aCwgYWJzUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyhmaWxlbmFtZSArIGBbZHJjcF8ke3JhbmRvbU51bVN0cn0ke3RleHR9X11gKTtcbiAgICByZXR1cm4gb2YoYFtkcmNwXyR7cmFuZG9tTnVtU3RyfTske3RleHR9XWApO1xuICB9KVxuICAuc3Vic2NyaWJlKCh0ZXh0KSA9PiB7cmVzdWx0ID0gdGV4dDt9KTtcbiAgcmV0dXJuIHJlc3VsdCE7XG59XG4iXX0=
