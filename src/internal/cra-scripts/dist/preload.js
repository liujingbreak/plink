"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable: no-console
const utils_1 = require("./utils");
utils_1.drawPuppy('Loading my poo...');
require('source-map-support/register');
const module_1 = tslib_1.__importDefault(require("module"));
const path_1 = require("path");
poo();
utils_1.saveCmdArgToEnv();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvcHJlbG9hZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsbUNBQW1EO0FBRW5ELGlCQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUMvQixPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUV2Qyw0REFBNEI7QUFDNUIsK0JBQXlCO0FBRXpCLEdBQUcsRUFBRSxDQUFDO0FBRU4sdUJBQWUsRUFBRSxDQUFDO0FBRWxCLFNBQVMsR0FBRztJQUNWLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUV0RSw4REFBOEQ7SUFFOUQsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLFVBQUcsZUFBZSxVQUFHLGdCQUFnQixVQUFHLEVBQUUsQ0FBQztJQUN2RSxNQUFNLGlCQUFpQixHQUFHLEdBQUcsVUFBRyxlQUFlLFVBQUcsa0JBQWtCLFVBQUcsRUFBRSxDQUFDO0lBRTFFLE1BQU0sUUFBUSxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztJQUMxQyxnREFBZ0Q7SUFDaEQsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLFVBQXVCLE1BQU07UUFDdEQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNoRCxRQUFRLE1BQU0sRUFBRTtnQkFDZCxLQUFLLDBCQUEwQjtvQkFDN0IsTUFBTSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztvQkFDN0Msc0NBQXNDO29CQUN0QyxNQUFNO2dCQUVSLEtBQUssbUNBQW1DO29CQUN0QyxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO29CQUN2RCxNQUFNO2dCQUVSO29CQUNFLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsRUFBRTt3QkFDcEMsT0FBTyxZQUFZLENBQUM7cUJBQ3JCO2dCQUNELHlHQUF5RztnQkFDekcsNEJBQTRCO2dCQUM1Qix1REFBdUQ7Z0JBQ3ZELG1DQUFtQztnQkFDbkMsTUFBTTtnQkFDTixxQkFBcUI7Z0JBQ3JCLElBQUk7YUFDUDtTQUNGO2FBQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN4RCxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEVBQUU7Z0JBQ3BDLE9BQU8sWUFBWSxDQUFDO2FBQ3JCO1NBQ0Y7UUFDRCxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3JDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLFlBQVk7SUFDbkIsc0JBQXNCO0lBQ3RCLGlCQUFTLENBQUMsMkJBQTJCLENBQUMsQ0FBQztBQUN6QyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvZGlzdC9wcmVsb2FkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCB7ZHJhd1B1cHB5LCBzYXZlQ21kQXJnVG9FbnZ9IGZyb20gJy4vdXRpbHMnO1xuXG5kcmF3UHVwcHkoJ0xvYWRpbmcgbXkgcG9vLi4uJyk7XG5yZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInKTtcblxuaW1wb3J0IE1vZHVsZSBmcm9tICdtb2R1bGUnO1xuaW1wb3J0IHtzZXB9IGZyb20gJ3BhdGgnO1xuXG5wb28oKTtcblxuc2F2ZUNtZEFyZ1RvRW52KCk7XG5cbmZ1bmN0aW9uIHBvbygpIHtcbiAgcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL2Jpbi9ub2RlUGF0aCcpLnNldENvbnRleHRQYXRoKHByb2Nlc3MuY3dkKCkpO1xuXG4gIC8vIG9yaWdDbGVhckNvbnNvbGUgPSByZXF1aXJlKCdyZWFjdC1kZXYtdXRpbHMvY2xlYXJDb25zb2xlJyk7XG5cbiAgY29uc3QgcmVhY3RTY3JpcHRzUGF0aCA9IGAke3NlcH1ub2RlX21vZHVsZXMke3NlcH1yZWFjdC1zY3JpcHRzJHtzZXB9YDtcbiAgY29uc3QgcmVhY3REZXZVdGlsc1BhdGggPSBgJHtzZXB9bm9kZV9tb2R1bGVzJHtzZXB9cmVhY3QtZGV2LXV0aWxzJHtzZXB9YDtcblxuICBjb25zdCBzdXBlclJlcSA9IE1vZHVsZS5wcm90b3R5cGUucmVxdWlyZTtcbiAgLy8gVE9ETzogU2hvdWxkIHVzZSByZXF1aXJlLWluamVjdG9yIG5ldyB2ZXJzaW9uXG4gIE1vZHVsZS5wcm90b3R5cGUucmVxdWlyZSA9IGZ1bmN0aW9uKHRoaXM6IE1vZHVsZSwgdGFyZ2V0KSB7XG4gICAgaWYgKHRoaXMuZmlsZW5hbWUuaW5kZXhPZihyZWFjdFNjcmlwdHNQYXRoKSA+PSAwKSB7XG4gICAgICBzd2l0Y2ggKHRhcmdldCkge1xuICAgICAgICBjYXNlICcuLi9jb25maWcvd2VicGFjay5jb25maWcnOlxuICAgICAgICAgIHRhcmdldCA9IHJlcXVpcmUucmVzb2x2ZSgnLi93ZWJwYWNrLmNvbmZpZycpO1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuZmlsZW5hbWUsIHRhcmdldCk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAnLi4vY29uZmlnL3dlYnBhY2tEZXZTZXJ2ZXIuY29uZmlnJzpcbiAgICAgICAgICB0YXJnZXQgPSByZXF1aXJlLnJlc29sdmUoJy4vd2VicGFjay5kZXZzZXJ2ZXIuY29uZmlnJyk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBpZiAodGFyZ2V0LmVuZHNXaXRoKCcvY2xlYXJDb25zb2xlJykpIHtcbiAgICAgICAgICAgIHJldHVybiBjbGVhckNvbnNvbGU7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGVsc2UgaWYgKHRhcmdldC5lbmRzV2l0aCgnL3BhdGhzJykgJiYgcmVzb2x2ZSh0aGlzLCB0YXJnZXQpLmVuZHNXaXRoKCcvcmVhY3Qtc2NyaXB0cy9jb25maWcvcGF0aHMnKSkge1xuICAgICAgICAgIC8vICAgaWYgKGNyYVBhdGhzID09IG51bGwpIHtcbiAgICAgICAgICAvLyAgICAgY29uc3Qgb3JpZ0V4cG9ydHMgPSBzdXBlclJlcS5jYWxsKHRoaXMsIHRhcmdldCk7XG4gICAgICAgICAgLy8gICAgIG9yaWdFeHBvcnRzLmFwcFNyYy5wdXNoKCcnKTtcbiAgICAgICAgICAvLyAgIH1cbiAgICAgICAgICAvLyAgIHJldHVybiBjcmFQYXRocztcbiAgICAgICAgICAvLyB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLmZpbGVuYW1lLmluZGV4T2YocmVhY3REZXZVdGlsc1BhdGgpID49IDApIHtcbiAgICAgIGlmICh0YXJnZXQuZW5kc1dpdGgoJy9jbGVhckNvbnNvbGUnKSkge1xuICAgICAgICByZXR1cm4gY2xlYXJDb25zb2xlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3VwZXJSZXEuY2FsbCh0aGlzLCB0YXJnZXQpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBjbGVhckNvbnNvbGUoKSB7XG4gIC8vIG9yaWdDbGVhckNvbnNvbGUoKTtcbiAgZHJhd1B1cHB5KCdwb29lZCBvbiBjcmVhdGUtcmVhY3QtYXBwJyk7XG59XG4iXX0=
