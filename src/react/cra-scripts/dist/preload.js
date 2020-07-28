"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable: no-console
/**
 * Do not actually import entity other than "type" from here
 * Because we have not set node path yet.
 */
require('dr-comp-package/bin/nodePath').setContextPath(process.cwd());
require('source-map-support/register');
const utils_1 = require("./utils");
const utils_2 = require("./utils");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const hack_webpack_api_1 = require("./hack-webpack-api");
const module_1 = tslib_1.__importDefault(require("module"));
const path_2 = require("path");
utils_1.drawPuppy('Loading my poo...');
utils_1.saveCmdArgToEnv();
poo();
function poo() {
    const getCraPaths = require('./cra-scripts-paths').default;
    const reactScriptsPath = `${path_2.sep}node_modules${path_2.sep}react-scripts${path_2.sep}`;
    const reactDevUtilsPath = `${path_2.sep}node_modules${path_2.sep}react-dev-utils${path_2.sep}`;
    const buildScriptsPath = path_1.default.join('node_modules', 'react-scripts', 'scripts', 'build.js');
    const superReq = module_1.default.prototype.require;
    // TODO: Should use require-injector new version
    module_1.default.prototype.require = function (target) {
        if (this.filename.indexOf(reactScriptsPath) >= 0) {
            if (this.filename.endsWith(buildScriptsPath)) {
                if (target === 'fs-extra' && utils_2.getCmdOptions().buildType === 'lib') {
                    // Disable copy public path
                    return Object.assign({}, fs_extra_1.default, {
                        copySync(src) {
                            console.log('[prepload] skip copy ', src);
                        }
                    });
                }
                if (target === 'webpack') {
                    return hack_webpack_api_1.hackWebpack4Compiler();
                }
            }
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
                        /[\\/]react-scripts[\\/]config[\\/]paths$/.test(path_2.resolve(path_2.dirname(this.filename), target))) {
                        // console.log(`[preload] source: ${this.filename},\n  target: react-scripts/config/paths`);
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
require(path_1.default.resolve('node_modules/react-scripts/bin/react-scripts.js'));

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvcHJlbG9hZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0I7OztHQUdHO0FBQ0gsT0FBTyxDQUFDLDhCQUE4QixDQUFDLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBQ3RFLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0FBQ3ZDLG1DQUFtRDtBQUVuRCxtQ0FBc0M7QUFDdEMsd0RBQXdCO0FBQ3hCLGdFQUEwQjtBQUMxQix5REFBd0Q7QUFJeEQsNERBQTRCO0FBQzVCLCtCQUEyQztBQUUzQyxpQkFBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDL0IsdUJBQWUsRUFBRSxDQUFDO0FBQ2xCLEdBQUcsRUFBRSxDQUFDO0FBRU4sU0FBUyxHQUFHO0lBQ1YsTUFBTSxXQUFXLEdBQWtCLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUMxRSxNQUFNLGdCQUFnQixHQUFHLEdBQUcsVUFBRyxlQUFlLFVBQUcsZ0JBQWdCLFVBQUcsRUFBRSxDQUFDO0lBQ3ZFLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxVQUFHLGVBQWUsVUFBRyxrQkFBa0IsVUFBRyxFQUFFLENBQUM7SUFDMUUsTUFBTSxnQkFBZ0IsR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxlQUFlLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBRTNGLE1BQU0sUUFBUSxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztJQUMxQyxnREFBZ0Q7SUFDaEQsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLFVBQXVCLE1BQU07UUFDdEQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNoRCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUU7Z0JBQzVDLElBQUksTUFBTSxLQUFLLFVBQVUsSUFBSSxxQkFBYSxFQUFFLENBQUMsU0FBUyxLQUFLLEtBQUssRUFBRTtvQkFDaEUsMkJBQTJCO29CQUMzQixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLGtCQUFFLEVBQUU7d0JBQzNCLFFBQVEsQ0FBQyxHQUFXOzRCQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFDO3dCQUM1QyxDQUFDO3FCQUNGLENBQUMsQ0FBQztpQkFDSjtnQkFDRCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7b0JBQ3hCLE9BQU8sdUNBQW9CLEVBQUUsQ0FBQztpQkFDL0I7YUFDRjtZQUNELFFBQVEsTUFBTSxFQUFFO2dCQUNkLEtBQUssMEJBQTBCO29CQUM3QixNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO29CQUM3QyxzQ0FBc0M7b0JBQ3RDLE1BQU07Z0JBRVIsS0FBSyxtQ0FBbUM7b0JBQ3RDLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7b0JBQ3ZELE1BQU07Z0JBRVI7b0JBQ0UsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFO3dCQUNwQyxPQUFPLFlBQVksQ0FBQztxQkFDckI7eUJBQU0sSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQzt3QkFDbEMsMENBQTBDLENBQUMsSUFBSSxDQUM3QyxjQUFPLENBQUMsY0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFO3dCQUM1Qyw0RkFBNEY7d0JBQzVGLE9BQU8sV0FBVyxFQUFFLENBQUM7cUJBQ3RCO2FBQ0o7U0FDRjthQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDeEQsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUNwQyxPQUFPLFlBQVksQ0FBQzthQUNyQjtTQUNGO1FBQ0QsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNyQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBSUQsU0FBUyxZQUFZO0lBQ25CLHNCQUFzQjtJQUN0QixpQkFBUyxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFDekMsQ0FBQztBQUVELE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGlEQUFpRCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL2NyYS1zY3JpcHRzL2Rpc3QvcHJlbG9hZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG4vKipcbiAqIERvIG5vdCBhY3R1YWxseSBpbXBvcnQgZW50aXR5IG90aGVyIHRoYW4gXCJ0eXBlXCIgZnJvbSBoZXJlXG4gKiBCZWNhdXNlIHdlIGhhdmUgbm90IHNldCBub2RlIHBhdGggeWV0LlxuICovXG5yZXF1aXJlKCdkci1jb21wLXBhY2thZ2UvYmluL25vZGVQYXRoJykuc2V0Q29udGV4dFBhdGgocHJvY2Vzcy5jd2QoKSk7XG5yZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInKTtcbmltcG9ydCB7ZHJhd1B1cHB5LCBzYXZlQ21kQXJnVG9FbnZ9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IF9wYXRocyBmcm9tICcuL2NyYS1zY3JpcHRzLXBhdGhzJztcbmltcG9ydCB7Z2V0Q21kT3B0aW9uc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge2hhY2tXZWJwYWNrNENvbXBpbGVyfSBmcm9tICcuL2hhY2std2VicGFjay1hcGknO1xuXG5cblxuaW1wb3J0IE1vZHVsZSBmcm9tICdtb2R1bGUnO1xuaW1wb3J0IHtzZXAsIHJlc29sdmUsIGRpcm5hbWV9IGZyb20gJ3BhdGgnO1xuXG5kcmF3UHVwcHkoJ0xvYWRpbmcgbXkgcG9vLi4uJyk7XG5zYXZlQ21kQXJnVG9FbnYoKTtcbnBvbygpO1xuXG5mdW5jdGlvbiBwb28oKSB7XG4gIGNvbnN0IGdldENyYVBhdGhzOiB0eXBlb2YgX3BhdGhzID0gcmVxdWlyZSgnLi9jcmEtc2NyaXB0cy1wYXRocycpLmRlZmF1bHQ7XG4gIGNvbnN0IHJlYWN0U2NyaXB0c1BhdGggPSBgJHtzZXB9bm9kZV9tb2R1bGVzJHtzZXB9cmVhY3Qtc2NyaXB0cyR7c2VwfWA7XG4gIGNvbnN0IHJlYWN0RGV2VXRpbHNQYXRoID0gYCR7c2VwfW5vZGVfbW9kdWxlcyR7c2VwfXJlYWN0LWRldi11dGlscyR7c2VwfWA7XG4gIGNvbnN0IGJ1aWxkU2NyaXB0c1BhdGggPSBQYXRoLmpvaW4oJ25vZGVfbW9kdWxlcycsICdyZWFjdC1zY3JpcHRzJywgJ3NjcmlwdHMnLCAnYnVpbGQuanMnKTtcblxuICBjb25zdCBzdXBlclJlcSA9IE1vZHVsZS5wcm90b3R5cGUucmVxdWlyZTtcbiAgLy8gVE9ETzogU2hvdWxkIHVzZSByZXF1aXJlLWluamVjdG9yIG5ldyB2ZXJzaW9uXG4gIE1vZHVsZS5wcm90b3R5cGUucmVxdWlyZSA9IGZ1bmN0aW9uKHRoaXM6IE1vZHVsZSwgdGFyZ2V0KSB7XG4gICAgaWYgKHRoaXMuZmlsZW5hbWUuaW5kZXhPZihyZWFjdFNjcmlwdHNQYXRoKSA+PSAwKSB7XG4gICAgICBpZiAodGhpcy5maWxlbmFtZS5lbmRzV2l0aChidWlsZFNjcmlwdHNQYXRoKSkge1xuICAgICAgICBpZiAodGFyZ2V0ID09PSAnZnMtZXh0cmEnICYmIGdldENtZE9wdGlvbnMoKS5idWlsZFR5cGUgPT09ICdsaWInKSB7XG4gICAgICAgICAgLy8gRGlzYWJsZSBjb3B5IHB1YmxpYyBwYXRoXG4gICAgICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIGZzLCB7XG4gICAgICAgICAgICBjb3B5U3luYyhzcmM6IHN0cmluZykge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW3ByZXBsb2FkXSBza2lwIGNvcHkgJywgc3JjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGFyZ2V0ID09PSAnd2VicGFjaycpIHtcbiAgICAgICAgICByZXR1cm4gaGFja1dlYnBhY2s0Q29tcGlsZXIoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc3dpdGNoICh0YXJnZXQpIHtcbiAgICAgICAgY2FzZSAnLi4vY29uZmlnL3dlYnBhY2suY29uZmlnJzpcbiAgICAgICAgICB0YXJnZXQgPSByZXF1aXJlLnJlc29sdmUoJy4vd2VicGFjay5jb25maWcnKTtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmZpbGVuYW1lLCB0YXJnZXQpO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJy4uL2NvbmZpZy93ZWJwYWNrRGV2U2VydmVyLmNvbmZpZyc6XG4gICAgICAgICAgdGFyZ2V0ID0gcmVxdWlyZS5yZXNvbHZlKCcuL3dlYnBhY2suZGV2c2VydmVyLmNvbmZpZycpO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaWYgKHRhcmdldC5lbmRzV2l0aCgnL2NsZWFyQ29uc29sZScpKSB7XG4gICAgICAgICAgICByZXR1cm4gY2xlYXJDb25zb2xlO1xuICAgICAgICAgIH0gZWxzZSBpZiAodGFyZ2V0LmVuZHNXaXRoKCcvcGF0aHMnKSAmJlxuICAgICAgICAgICAgL1tcXFxcL11yZWFjdC1zY3JpcHRzW1xcXFwvXWNvbmZpZ1tcXFxcL11wYXRocyQvLnRlc3QoXG4gICAgICAgICAgICAgIHJlc29sdmUoZGlybmFtZSh0aGlzLmZpbGVuYW1lKSwgdGFyZ2V0KSkpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGBbcHJlbG9hZF0gc291cmNlOiAke3RoaXMuZmlsZW5hbWV9LFxcbiAgdGFyZ2V0OiByZWFjdC1zY3JpcHRzL2NvbmZpZy9wYXRoc2ApO1xuICAgICAgICAgICAgcmV0dXJuIGdldENyYVBhdGhzKCk7XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5maWxlbmFtZS5pbmRleE9mKHJlYWN0RGV2VXRpbHNQYXRoKSA+PSAwKSB7XG4gICAgICBpZiAodGFyZ2V0LmVuZHNXaXRoKCcvY2xlYXJDb25zb2xlJykpIHtcbiAgICAgICAgcmV0dXJuIGNsZWFyQ29uc29sZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyUmVxLmNhbGwodGhpcywgdGFyZ2V0KTtcbiAgfTtcbn1cblxuXG5cbmZ1bmN0aW9uIGNsZWFyQ29uc29sZSgpIHtcbiAgLy8gb3JpZ0NsZWFyQ29uc29sZSgpO1xuICBkcmF3UHVwcHkoJ3Bvb2VkIG9uIGNyZWF0ZS1yZWFjdC1hcHAnKTtcbn1cblxucmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1zY3JpcHRzL2Jpbi9yZWFjdC1zY3JpcHRzLmpzJykpO1xuIl19
