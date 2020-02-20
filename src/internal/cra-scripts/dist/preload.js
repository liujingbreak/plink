"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable: no-console
/**
 * Do not actually import entity other than "type" from here
 * Because we have not set node path yet.
 */
require('dr-comp-package/bin/nodePath').setContextPath(process.cwd());
const utils_1 = require("./utils");
const utils_2 = require("./utils");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const hack_webpack_api_1 = require("./hack-webpack-api");
utils_1.drawPuppy('Loading my poo...');
require('source-map-support/register');
const module_1 = tslib_1.__importDefault(require("module"));
const path_2 = require("path");
poo();
utils_1.saveCmdArgToEnv();
function poo() {
    const getPathsFactory = require('./cra-scripts-paths').default;
    const getCraPaths = getPathsFactory();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvcHJlbG9hZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0I7OztHQUdHO0FBQ0gsT0FBTyxDQUFDLDhCQUE4QixDQUFDLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBQ3RFLG1DQUFtRDtBQUVuRCxtQ0FBc0M7QUFDdEMsd0RBQXdCO0FBQ3hCLGdFQUEwQjtBQUMxQix5REFBd0Q7QUFFeEQsaUJBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQy9CLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0FBRXZDLDREQUE0QjtBQUM1QiwrQkFBMkM7QUFFM0MsR0FBRyxFQUFFLENBQUM7QUFFTix1QkFBZSxFQUFFLENBQUM7QUFFbEIsU0FBUyxHQUFHO0lBRVYsTUFBTSxlQUFlLEdBQTRCLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUV4RixNQUFNLFdBQVcsR0FBRyxlQUFlLEVBQUUsQ0FBQztJQUV0QyxNQUFNLGdCQUFnQixHQUFHLEdBQUcsVUFBRyxlQUFlLFVBQUcsZ0JBQWdCLFVBQUcsRUFBRSxDQUFDO0lBQ3ZFLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxVQUFHLGVBQWUsVUFBRyxrQkFBa0IsVUFBRyxFQUFFLENBQUM7SUFDMUUsTUFBTSxnQkFBZ0IsR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxlQUFlLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBRTNGLE1BQU0sUUFBUSxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztJQUUxQyxnREFBZ0Q7SUFDaEQsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLFVBQXVCLE1BQU07UUFDdEQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNoRCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUU7Z0JBQzVDLElBQUksTUFBTSxLQUFLLFVBQVUsSUFBSSxxQkFBYSxFQUFFLENBQUMsU0FBUyxLQUFLLEtBQUssRUFBRTtvQkFDaEUsMkJBQTJCO29CQUMzQixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLGtCQUFFLEVBQUU7d0JBQzNCLFFBQVEsQ0FBQyxHQUFXOzRCQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFDO3dCQUM1QyxDQUFDO3FCQUNGLENBQUMsQ0FBQztpQkFDSjtnQkFDRCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7b0JBQ3hCLE9BQU8sdUNBQW9CLEVBQUUsQ0FBQztpQkFDL0I7YUFDRjtZQUNELFFBQVEsTUFBTSxFQUFFO2dCQUNkLEtBQUssMEJBQTBCO29CQUM3QixNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO29CQUM3QyxzQ0FBc0M7b0JBQ3RDLE1BQU07Z0JBRVIsS0FBSyxtQ0FBbUM7b0JBQ3RDLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7b0JBQ3ZELE1BQU07Z0JBRVI7b0JBQ0UsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFO3dCQUNwQyxPQUFPLFlBQVksQ0FBQztxQkFDckI7eUJBQU0sSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQzt3QkFDbEMsMENBQTBDLENBQUMsSUFBSSxDQUM3QyxjQUFPLENBQUMsY0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFO3dCQUM1Qyw0RkFBNEY7d0JBQzVGLE9BQU8sV0FBVyxFQUFFLENBQUM7cUJBQ3RCO2FBQ0o7U0FDRjthQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDeEQsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUNwQyxPQUFPLFlBQVksQ0FBQzthQUNyQjtTQUNGO1FBQ0QsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNyQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBSUQsU0FBUyxZQUFZO0lBQ25CLHNCQUFzQjtJQUN0QixpQkFBUyxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFDekMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL2NyYS1zY3JpcHRzL2Rpc3QvcHJlbG9hZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG4vKipcbiAqIERvIG5vdCBhY3R1YWxseSBpbXBvcnQgZW50aXR5IG90aGVyIHRoYW4gXCJ0eXBlXCIgZnJvbSBoZXJlXG4gKiBCZWNhdXNlIHdlIGhhdmUgbm90IHNldCBub2RlIHBhdGggeWV0LlxuICovXG5yZXF1aXJlKCdkci1jb21wLXBhY2thZ2UvYmluL25vZGVQYXRoJykuc2V0Q29udGV4dFBhdGgocHJvY2Vzcy5jd2QoKSk7XG5pbXBvcnQge2RyYXdQdXBweSwgc2F2ZUNtZEFyZ1RvRW52fSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBfZ2V0UGF0aHNGYWN0b3J5IGZyb20gJy4vY3JhLXNjcmlwdHMtcGF0aHMnO1xuaW1wb3J0IHtnZXRDbWRPcHRpb25zfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7aGFja1dlYnBhY2s0Q29tcGlsZXJ9IGZyb20gJy4vaGFjay13ZWJwYWNrLWFwaSc7XG5cbmRyYXdQdXBweSgnTG9hZGluZyBteSBwb28uLi4nKTtcbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpO1xuXG5pbXBvcnQgTW9kdWxlIGZyb20gJ21vZHVsZSc7XG5pbXBvcnQge3NlcCwgcmVzb2x2ZSwgZGlybmFtZX0gZnJvbSAncGF0aCc7XG5cbnBvbygpO1xuXG5zYXZlQ21kQXJnVG9FbnYoKTtcblxuZnVuY3Rpb24gcG9vKCkge1xuXG4gIGNvbnN0IGdldFBhdGhzRmFjdG9yeTogdHlwZW9mIF9nZXRQYXRoc0ZhY3RvcnkgPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJykuZGVmYXVsdDtcblxuICBjb25zdCBnZXRDcmFQYXRocyA9IGdldFBhdGhzRmFjdG9yeSgpO1xuXG4gIGNvbnN0IHJlYWN0U2NyaXB0c1BhdGggPSBgJHtzZXB9bm9kZV9tb2R1bGVzJHtzZXB9cmVhY3Qtc2NyaXB0cyR7c2VwfWA7XG4gIGNvbnN0IHJlYWN0RGV2VXRpbHNQYXRoID0gYCR7c2VwfW5vZGVfbW9kdWxlcyR7c2VwfXJlYWN0LWRldi11dGlscyR7c2VwfWA7XG4gIGNvbnN0IGJ1aWxkU2NyaXB0c1BhdGggPSBQYXRoLmpvaW4oJ25vZGVfbW9kdWxlcycsICdyZWFjdC1zY3JpcHRzJywgJ3NjcmlwdHMnLCAnYnVpbGQuanMnKTtcblxuICBjb25zdCBzdXBlclJlcSA9IE1vZHVsZS5wcm90b3R5cGUucmVxdWlyZTtcblxuICAvLyBUT0RPOiBTaG91bGQgdXNlIHJlcXVpcmUtaW5qZWN0b3IgbmV3IHZlcnNpb25cbiAgTW9kdWxlLnByb3RvdHlwZS5yZXF1aXJlID0gZnVuY3Rpb24odGhpczogTW9kdWxlLCB0YXJnZXQpIHtcbiAgICBpZiAodGhpcy5maWxlbmFtZS5pbmRleE9mKHJlYWN0U2NyaXB0c1BhdGgpID49IDApIHtcbiAgICAgIGlmICh0aGlzLmZpbGVuYW1lLmVuZHNXaXRoKGJ1aWxkU2NyaXB0c1BhdGgpKSB7XG4gICAgICAgIGlmICh0YXJnZXQgPT09ICdmcy1leHRyYScgJiYgZ2V0Q21kT3B0aW9ucygpLmJ1aWxkVHlwZSA9PT0gJ2xpYicpIHtcbiAgICAgICAgICAvLyBEaXNhYmxlIGNvcHkgcHVibGljIHBhdGhcbiAgICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgZnMsIHtcbiAgICAgICAgICAgIGNvcHlTeW5jKHNyYzogc3RyaW5nKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbcHJlcGxvYWRdIHNraXAgY29weSAnLCBzcmMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0YXJnZXQgPT09ICd3ZWJwYWNrJykge1xuICAgICAgICAgIHJldHVybiBoYWNrV2VicGFjazRDb21waWxlcigpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzd2l0Y2ggKHRhcmdldCkge1xuICAgICAgICBjYXNlICcuLi9jb25maWcvd2VicGFjay5jb25maWcnOlxuICAgICAgICAgIHRhcmdldCA9IHJlcXVpcmUucmVzb2x2ZSgnLi93ZWJwYWNrLmNvbmZpZycpO1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuZmlsZW5hbWUsIHRhcmdldCk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAnLi4vY29uZmlnL3dlYnBhY2tEZXZTZXJ2ZXIuY29uZmlnJzpcbiAgICAgICAgICB0YXJnZXQgPSByZXF1aXJlLnJlc29sdmUoJy4vd2VicGFjay5kZXZzZXJ2ZXIuY29uZmlnJyk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBpZiAodGFyZ2V0LmVuZHNXaXRoKCcvY2xlYXJDb25zb2xlJykpIHtcbiAgICAgICAgICAgIHJldHVybiBjbGVhckNvbnNvbGU7XG4gICAgICAgICAgfSBlbHNlIGlmICh0YXJnZXQuZW5kc1dpdGgoJy9wYXRocycpICYmXG4gICAgICAgICAgICAvW1xcXFwvXXJlYWN0LXNjcmlwdHNbXFxcXC9dY29uZmlnW1xcXFwvXXBhdGhzJC8udGVzdChcbiAgICAgICAgICAgICAgcmVzb2x2ZShkaXJuYW1lKHRoaXMuZmlsZW5hbWUpLCB0YXJnZXQpKSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYFtwcmVsb2FkXSBzb3VyY2U6ICR7dGhpcy5maWxlbmFtZX0sXFxuICB0YXJnZXQ6IHJlYWN0LXNjcmlwdHMvY29uZmlnL3BhdGhzYCk7XG4gICAgICAgICAgICByZXR1cm4gZ2V0Q3JhUGF0aHMoKTtcbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLmZpbGVuYW1lLmluZGV4T2YocmVhY3REZXZVdGlsc1BhdGgpID49IDApIHtcbiAgICAgIGlmICh0YXJnZXQuZW5kc1dpdGgoJy9jbGVhckNvbnNvbGUnKSkge1xuICAgICAgICByZXR1cm4gY2xlYXJDb25zb2xlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3VwZXJSZXEuY2FsbCh0aGlzLCB0YXJnZXQpO1xuICB9O1xufVxuXG5cblxuZnVuY3Rpb24gY2xlYXJDb25zb2xlKCkge1xuICAvLyBvcmlnQ2xlYXJDb25zb2xlKCk7XG4gIGRyYXdQdXBweSgncG9vZWQgb24gY3JlYXRlLXJlYWN0LWFwcCcpO1xufVxuIl19
