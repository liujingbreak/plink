"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable: no-console
/**
 * Do not actually import entity other than "type" from here
 * Because we have not set node path yet.
 */
const utils_1 = require("./utils");
utils_1.drawPuppy('Loading my poo...');
require('source-map-support/register');
const module_1 = tslib_1.__importDefault(require("module"));
const path_1 = require("path");
poo();
utils_1.saveCmdArgToEnv();
function poo() {
    require('dr-comp-package/bin/nodePath').setContextPath(process.cwd());
    const getPathsFactory = require('./cra-scripts-paths').default;
    const getCraPaths = getPathsFactory();
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
                    else if (target.endsWith('/paths') &&
                        /[\\/]react-scripts[\\/]config[\\/]paths$/.test(path_1.resolve(path_1.dirname(this.filename), target))) {
                        console.log(`[preload] source: ${this.filename},\n  target: react-scripts/config/paths`);
                        return getCraPaths();
                    }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvcHJlbG9hZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0I7OztHQUdHO0FBQ0gsbUNBQW1EO0FBR25ELGlCQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUMvQixPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUV2Qyw0REFBNEI7QUFDNUIsK0JBQTJDO0FBRTNDLEdBQUcsRUFBRSxDQUFDO0FBRU4sdUJBQWUsRUFBRSxDQUFDO0FBRWxCLFNBQVMsR0FBRztJQUNWLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUN0RSxNQUFNLGVBQWUsR0FBNEIsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ3hGLE1BQU0sV0FBVyxHQUFHLGVBQWUsRUFBRSxDQUFDO0lBRXRDLE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxVQUFHLGVBQWUsVUFBRyxnQkFBZ0IsVUFBRyxFQUFFLENBQUM7SUFDdkUsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLFVBQUcsZUFBZSxVQUFHLGtCQUFrQixVQUFHLEVBQUUsQ0FBQztJQUUxRSxNQUFNLFFBQVEsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7SUFFMUMsZ0RBQWdEO0lBQ2hELGdCQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxVQUF1QixNQUFNO1FBQ3RELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDaEQsUUFBUSxNQUFNLEVBQUU7Z0JBQ2QsS0FBSywwQkFBMEI7b0JBQzdCLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7b0JBQzdDLHNDQUFzQztvQkFDdEMsTUFBTTtnQkFFUixLQUFLLG1DQUFtQztvQkFDdEMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQztvQkFDdkQsTUFBTTtnQkFFUjtvQkFDRSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEVBQUU7d0JBQ3BDLE9BQU8sWUFBWSxDQUFDO3FCQUNyQjt5QkFBTSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO3dCQUNsQywwQ0FBMEMsQ0FBQyxJQUFJLENBQzdDLGNBQU8sQ0FBQyxjQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUU7d0JBQzVDLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLElBQUksQ0FBQyxRQUFRLHlDQUF5QyxDQUFDLENBQUM7d0JBQ3pGLE9BQU8sV0FBVyxFQUFFLENBQUM7cUJBQ3RCO2FBQ0o7U0FDRjthQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDeEQsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUNwQyxPQUFPLFlBQVksQ0FBQzthQUNyQjtTQUNGO1FBQ0QsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNyQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxZQUFZO0lBQ25CLHNCQUFzQjtJQUN0QixpQkFBUyxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFDekMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL2NyYS1zY3JpcHRzL2Rpc3QvcHJlbG9hZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG4vKipcbiAqIERvIG5vdCBhY3R1YWxseSBpbXBvcnQgZW50aXR5IG90aGVyIHRoYW4gXCJ0eXBlXCIgZnJvbSBoZXJlXG4gKiBCZWNhdXNlIHdlIGhhdmUgbm90IHNldCBub2RlIHBhdGggeWV0LlxuICovXG5pbXBvcnQge2RyYXdQdXBweSwgc2F2ZUNtZEFyZ1RvRW52fSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBfZ2V0UGF0aHNGYWN0b3J5IGZyb20gJy4vY3JhLXNjcmlwdHMtcGF0aHMnO1xuXG5kcmF3UHVwcHkoJ0xvYWRpbmcgbXkgcG9vLi4uJyk7XG5yZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInKTtcblxuaW1wb3J0IE1vZHVsZSBmcm9tICdtb2R1bGUnO1xuaW1wb3J0IHtzZXAsIHJlc29sdmUsIGRpcm5hbWV9IGZyb20gJ3BhdGgnO1xuXG5wb28oKTtcblxuc2F2ZUNtZEFyZ1RvRW52KCk7XG5cbmZ1bmN0aW9uIHBvbygpIHtcbiAgcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL2Jpbi9ub2RlUGF0aCcpLnNldENvbnRleHRQYXRoKHByb2Nlc3MuY3dkKCkpO1xuICBjb25zdCBnZXRQYXRoc0ZhY3Rvcnk6IHR5cGVvZiBfZ2V0UGF0aHNGYWN0b3J5ID0gcmVxdWlyZSgnLi9jcmEtc2NyaXB0cy1wYXRocycpLmRlZmF1bHQ7XG4gIGNvbnN0IGdldENyYVBhdGhzID0gZ2V0UGF0aHNGYWN0b3J5KCk7XG5cbiAgY29uc3QgcmVhY3RTY3JpcHRzUGF0aCA9IGAke3NlcH1ub2RlX21vZHVsZXMke3NlcH1yZWFjdC1zY3JpcHRzJHtzZXB9YDtcbiAgY29uc3QgcmVhY3REZXZVdGlsc1BhdGggPSBgJHtzZXB9bm9kZV9tb2R1bGVzJHtzZXB9cmVhY3QtZGV2LXV0aWxzJHtzZXB9YDtcblxuICBjb25zdCBzdXBlclJlcSA9IE1vZHVsZS5wcm90b3R5cGUucmVxdWlyZTtcblxuICAvLyBUT0RPOiBTaG91bGQgdXNlIHJlcXVpcmUtaW5qZWN0b3IgbmV3IHZlcnNpb25cbiAgTW9kdWxlLnByb3RvdHlwZS5yZXF1aXJlID0gZnVuY3Rpb24odGhpczogTW9kdWxlLCB0YXJnZXQpIHtcbiAgICBpZiAodGhpcy5maWxlbmFtZS5pbmRleE9mKHJlYWN0U2NyaXB0c1BhdGgpID49IDApIHtcbiAgICAgIHN3aXRjaCAodGFyZ2V0KSB7XG4gICAgICAgIGNhc2UgJy4uL2NvbmZpZy93ZWJwYWNrLmNvbmZpZyc6XG4gICAgICAgICAgdGFyZ2V0ID0gcmVxdWlyZS5yZXNvbHZlKCcuL3dlYnBhY2suY29uZmlnJyk7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2codGhpcy5maWxlbmFtZSwgdGFyZ2V0KTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICcuLi9jb25maWcvd2VicGFja0RldlNlcnZlci5jb25maWcnOlxuICAgICAgICAgIHRhcmdldCA9IHJlcXVpcmUucmVzb2x2ZSgnLi93ZWJwYWNrLmRldnNlcnZlci5jb25maWcnKTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGlmICh0YXJnZXQuZW5kc1dpdGgoJy9jbGVhckNvbnNvbGUnKSkge1xuICAgICAgICAgICAgcmV0dXJuIGNsZWFyQ29uc29sZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHRhcmdldC5lbmRzV2l0aCgnL3BhdGhzJykgJiZcbiAgICAgICAgICAgIC9bXFxcXC9dcmVhY3Qtc2NyaXB0c1tcXFxcL11jb25maWdbXFxcXC9dcGF0aHMkLy50ZXN0KFxuICAgICAgICAgICAgICByZXNvbHZlKGRpcm5hbWUodGhpcy5maWxlbmFtZSksIHRhcmdldCkpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ByZWxvYWRdIHNvdXJjZTogJHt0aGlzLmZpbGVuYW1lfSxcXG4gIHRhcmdldDogcmVhY3Qtc2NyaXB0cy9jb25maWcvcGF0aHNgKTtcbiAgICAgICAgICAgIHJldHVybiBnZXRDcmFQYXRocygpO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMuZmlsZW5hbWUuaW5kZXhPZihyZWFjdERldlV0aWxzUGF0aCkgPj0gMCkge1xuICAgICAgaWYgKHRhcmdldC5lbmRzV2l0aCgnL2NsZWFyQ29uc29sZScpKSB7XG4gICAgICAgIHJldHVybiBjbGVhckNvbnNvbGU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdXBlclJlcS5jYWxsKHRoaXMsIHRhcmdldCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNsZWFyQ29uc29sZSgpIHtcbiAgLy8gb3JpZ0NsZWFyQ29uc29sZSgpO1xuICBkcmF3UHVwcHkoJ3Bvb2VkIG9uIGNyZWF0ZS1yZWFjdC1hcHAnKTtcbn1cbiJdfQ==
