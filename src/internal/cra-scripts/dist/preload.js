"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable: no-console
const utils_1 = require("./utils");
// import Path from 'path';
utils_1.drawPuppy('Loading my poo...');
require('source-map-support/register');
// import Injector from 'require-injector';
const module_1 = tslib_1.__importDefault(require("module"));
const path_1 = require("path");
// let origClearConsole: () => void;
poo();
function poo() {
    require('dr-comp-package/bin/nodePath').setContextPath(process.cwd());
    // origClearConsole = require('react-dev-utils/clearConsole');
    const reactScriptsPath = `${path_1.sep}node_modules${path_1.sep}react-scripts${path_1.sep}`;
    const reactDevUtilsPath = `${path_1.sep}node_modules${path_1.sep}react-dev-utils${path_1.sep}`;
    const superReq = module_1.default.prototype.require;
    // TODO: Should use require-injector new version
    module_1.default.prototype.require = function (target) {
        if (this.filename.indexOf(reactScriptsPath) >= 0) {
            switch (target) {
                case '../config/webpack.config':
                    target = require.resolve('./webpack.config');
                    // console.log(this.filename, target);
                    break;
                case '../config/webpackDevServer.config':
                    target = require.resolve('./webpack.devserver.config');
                    break;
                default:
                    if (target.endsWith('/clearConsole')) {
                        return clearConsole;
                    }
                // else if (target.endsWith('/paths') && resolve(this, target).endsWith('/react-scripts/config/paths')) {
                //   if (craPaths == null) {
                //     const origExports = superReq.call(this, target);
                //     origExports.appSrc.push('');
                //   }
                //   return craPaths;
                // }
            }
        }
        else if (this.filename.indexOf(reactDevUtilsPath) >= 0) {
            if (target.endsWith('/clearConsole')) {
                return clearConsole;
            }
        }
        return superReq.call(this, target);
    };
}
function clearConsole() {
    // origClearConsole();
    utils_1.drawPuppy('pooed on create-react-app');
}
// function resolve(module: Module, target: string) {
//   return Path.resolve(Path.dirname(module.filename), target).replace(/\\/g, '/');
// }

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvcHJlbG9hZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsbUNBQWtDO0FBQ2xDLDJCQUEyQjtBQUUzQixpQkFBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDL0IsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7QUFFdkMsMkNBQTJDO0FBQzNDLDREQUE0QjtBQUM1QiwrQkFBeUI7QUFDekIsb0NBQW9DO0FBQ3BDLEdBQUcsRUFBRSxDQUFDO0FBRU4sU0FBUyxHQUFHO0lBRVYsT0FBTyxDQUFDLDhCQUE4QixDQUFDLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBRXRFLDhEQUE4RDtJQUU5RCxNQUFNLGdCQUFnQixHQUFHLEdBQUcsVUFBRyxlQUFlLFVBQUcsZ0JBQWdCLFVBQUcsRUFBRSxDQUFDO0lBQ3ZFLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxVQUFHLGVBQWUsVUFBRyxrQkFBa0IsVUFBRyxFQUFFLENBQUM7SUFFMUUsTUFBTSxRQUFRLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDO0lBQzFDLGdEQUFnRDtJQUNoRCxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsVUFBdUIsTUFBTTtRQUN0RCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2hELFFBQVEsTUFBTSxFQUFFO2dCQUNkLEtBQUssMEJBQTBCO29CQUM3QixNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO29CQUM3QyxzQ0FBc0M7b0JBQ3RDLE1BQU07Z0JBRVIsS0FBSyxtQ0FBbUM7b0JBQ3RDLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7b0JBQ3ZELE1BQU07Z0JBRVI7b0JBQ0UsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFO3dCQUNwQyxPQUFPLFlBQVksQ0FBQztxQkFDckI7Z0JBQ0QseUdBQXlHO2dCQUN6Ryw0QkFBNEI7Z0JBQzVCLHVEQUF1RDtnQkFDdkQsbUNBQW1DO2dCQUNuQyxNQUFNO2dCQUNOLHFCQUFxQjtnQkFDckIsSUFBSTthQUNQO1NBQ0Y7YUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3hELElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsRUFBRTtnQkFDcEMsT0FBTyxZQUFZLENBQUM7YUFDckI7U0FDRjtRQUNELE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDckMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsWUFBWTtJQUNuQixzQkFBc0I7SUFDdEIsaUJBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQ3pDLENBQUM7QUFDRCxxREFBcUQ7QUFDckQsb0ZBQW9GO0FBQ3BGLElBQUkiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9jcmEtc2NyaXB0cy9kaXN0L3ByZWxvYWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuaW1wb3J0IHtkcmF3UHVwcHl9IGZyb20gJy4vdXRpbHMnO1xuLy8gaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5cbmRyYXdQdXBweSgnTG9hZGluZyBteSBwb28uLi4nKTtcbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpO1xuXG4vLyBpbXBvcnQgSW5qZWN0b3IgZnJvbSAncmVxdWlyZS1pbmplY3Rvcic7XG5pbXBvcnQgTW9kdWxlIGZyb20gJ21vZHVsZSc7XG5pbXBvcnQge3NlcH0gZnJvbSAncGF0aCc7XG4vLyBsZXQgb3JpZ0NsZWFyQ29uc29sZTogKCkgPT4gdm9pZDtcbnBvbygpO1xuXG5mdW5jdGlvbiBwb28oKSB7XG5cbiAgcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL2Jpbi9ub2RlUGF0aCcpLnNldENvbnRleHRQYXRoKHByb2Nlc3MuY3dkKCkpO1xuXG4gIC8vIG9yaWdDbGVhckNvbnNvbGUgPSByZXF1aXJlKCdyZWFjdC1kZXYtdXRpbHMvY2xlYXJDb25zb2xlJyk7XG5cbiAgY29uc3QgcmVhY3RTY3JpcHRzUGF0aCA9IGAke3NlcH1ub2RlX21vZHVsZXMke3NlcH1yZWFjdC1zY3JpcHRzJHtzZXB9YDtcbiAgY29uc3QgcmVhY3REZXZVdGlsc1BhdGggPSBgJHtzZXB9bm9kZV9tb2R1bGVzJHtzZXB9cmVhY3QtZGV2LXV0aWxzJHtzZXB9YDtcblxuICBjb25zdCBzdXBlclJlcSA9IE1vZHVsZS5wcm90b3R5cGUucmVxdWlyZTtcbiAgLy8gVE9ETzogU2hvdWxkIHVzZSByZXF1aXJlLWluamVjdG9yIG5ldyB2ZXJzaW9uXG4gIE1vZHVsZS5wcm90b3R5cGUucmVxdWlyZSA9IGZ1bmN0aW9uKHRoaXM6IE1vZHVsZSwgdGFyZ2V0KSB7XG4gICAgaWYgKHRoaXMuZmlsZW5hbWUuaW5kZXhPZihyZWFjdFNjcmlwdHNQYXRoKSA+PSAwKSB7XG4gICAgICBzd2l0Y2ggKHRhcmdldCkge1xuICAgICAgICBjYXNlICcuLi9jb25maWcvd2VicGFjay5jb25maWcnOlxuICAgICAgICAgIHRhcmdldCA9IHJlcXVpcmUucmVzb2x2ZSgnLi93ZWJwYWNrLmNvbmZpZycpO1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuZmlsZW5hbWUsIHRhcmdldCk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAnLi4vY29uZmlnL3dlYnBhY2tEZXZTZXJ2ZXIuY29uZmlnJzpcbiAgICAgICAgICB0YXJnZXQgPSByZXF1aXJlLnJlc29sdmUoJy4vd2VicGFjay5kZXZzZXJ2ZXIuY29uZmlnJyk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBpZiAodGFyZ2V0LmVuZHNXaXRoKCcvY2xlYXJDb25zb2xlJykpIHtcbiAgICAgICAgICAgIHJldHVybiBjbGVhckNvbnNvbGU7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGVsc2UgaWYgKHRhcmdldC5lbmRzV2l0aCgnL3BhdGhzJykgJiYgcmVzb2x2ZSh0aGlzLCB0YXJnZXQpLmVuZHNXaXRoKCcvcmVhY3Qtc2NyaXB0cy9jb25maWcvcGF0aHMnKSkge1xuICAgICAgICAgIC8vICAgaWYgKGNyYVBhdGhzID09IG51bGwpIHtcbiAgICAgICAgICAvLyAgICAgY29uc3Qgb3JpZ0V4cG9ydHMgPSBzdXBlclJlcS5jYWxsKHRoaXMsIHRhcmdldCk7XG4gICAgICAgICAgLy8gICAgIG9yaWdFeHBvcnRzLmFwcFNyYy5wdXNoKCcnKTtcbiAgICAgICAgICAvLyAgIH1cbiAgICAgICAgICAvLyAgIHJldHVybiBjcmFQYXRocztcbiAgICAgICAgICAvLyB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLmZpbGVuYW1lLmluZGV4T2YocmVhY3REZXZVdGlsc1BhdGgpID49IDApIHtcbiAgICAgIGlmICh0YXJnZXQuZW5kc1dpdGgoJy9jbGVhckNvbnNvbGUnKSkge1xuICAgICAgICByZXR1cm4gY2xlYXJDb25zb2xlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3VwZXJSZXEuY2FsbCh0aGlzLCB0YXJnZXQpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBjbGVhckNvbnNvbGUoKSB7XG4gIC8vIG9yaWdDbGVhckNvbnNvbGUoKTtcbiAgZHJhd1B1cHB5KCdwb29lZCBvbiBjcmVhdGUtcmVhY3QtYXBwJyk7XG59XG4vLyBmdW5jdGlvbiByZXNvbHZlKG1vZHVsZTogTW9kdWxlLCB0YXJnZXQ6IHN0cmluZykge1xuLy8gICByZXR1cm4gUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShtb2R1bGUuZmlsZW5hbWUpLCB0YXJnZXQpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbi8vIH1cbiJdfQ==
