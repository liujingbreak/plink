"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.poo = void 0;
// tslint:disable: no-console
/**
 * Do not actually import entity other than "type" from here
 * Because we have not set node path yet.
 */
const utils_1 = require("./utils");
const utils_2 = require("./utils");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const hack_webpack_api_1 = require("./hack-webpack-api");
const path_2 = require("path");
const loaderHooks_1 = require("@wfh/plink/wfh/dist/loaderHooks");
const hack_fork_ts_checker_1 = require("./hack-fork-ts-checker");
// Avoid child process require us!
const deleteExecArgIdx = [];
for (let i = 0, l = process.execArgv.length; i < l; i++) {
    if (i < l - 1 && /^(?:\-r|\-\-require)$/.test(process.execArgv[i]) &&
        /^@wfh\/cra\-scripts($|\/)/.test(process.execArgv[i + 1])) {
        deleteExecArgIdx.push(i);
    }
}
deleteExecArgIdx.reduce((offset, deleteIdx) => {
    process.execArgv.splice(deleteIdx + offset, 2);
    return offset + 2;
}, 0);
function poo() {
    let getCraPaths = require('./cra-scripts-paths').default;
    const reactScriptsPath = path_1.default.resolve('node_modules/react-scripts');
    // const reactDevUtilsPath = Path.resolve('node_modules/react-dev-utils');
    const buildScriptsPath = path_1.default.resolve('node_modules', 'react-scripts', 'scripts', 'build.js');
    const reactWebpackCfg = path_1.default.resolve('node_modules/react-scripts/config/webpack.config.js');
    const reactWebpackDevServerCfg = path_1.default.resolve('node_modules/react-scripts/config/webpackDevServer.config.js');
    const clearConsole = path_1.default.resolve('node_modules/react-dev-utils/clearConsole.js');
    const craPaths = path_1.default.resolve('node_modules/react-scripts/config/paths.js');
    const craPackagesPathPrefix = path_1.default.resolve('node_modules/react-');
    // Disable @pmmmwh/react-refresh-webpack-plugin, since it excludes our node_modules
    // from HMR
    process.env.FAST_REFRESH = 'false';
    loaderHooks_1.hookCommonJsRequire((filename, target, req, resolve) => {
        if (filename.startsWith(reactScriptsPath + path_2.sep)) {
            if (filename === buildScriptsPath) {
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
            switch (resolve(target)) {
                case reactWebpackCfg:
                    return require('./webpack.config');
                case reactWebpackDevServerCfg:
                    return require('./webpack.devserver.config');
                case clearConsole:
                    return noClearConsole;
                case craPaths:
                    return getCraPaths();
                default:
            }
            if (target === 'react-dev-utils/openBrowser') {
                return require('./cra-open-browser').default;
            }
        }
        else if (filename.startsWith(craPackagesPathPrefix)) {
            switch (resolve(target)) {
                case craPaths:
                    return getCraPaths();
                case clearConsole:
                    return noClearConsole;
                default:
            }
        }
    });
    hack_fork_ts_checker_1.register();
}
exports.poo = poo;
function noClearConsole() {
    // origClearConsole();
    utils_1.drawPuppy('pooed on create-react-app');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlbG9hZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByZWxvYWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCOzs7R0FHRztBQUNILG1DQUFrQztBQUVsQyxtQ0FBc0M7QUFDdEMsZ0RBQXdCO0FBQ3hCLHdEQUEwQjtBQUMxQix5REFBd0Q7QUFDeEQsK0JBQXlCO0FBQ3pCLGlFQUFvRTtBQUNwRSxpRUFBeUU7QUFDekUsa0NBQWtDO0FBQ2xDLE1BQU0sZ0JBQWdCLEdBQWEsRUFBRSxDQUFDO0FBQ3RDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0lBQ3ZELElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksdUJBQXVCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEUsMkJBQTJCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDekQsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzFCO0NBQ0Y7QUFDRCxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7SUFDNUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvQyxPQUFPLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBRU4sU0FBZ0IsR0FBRztJQUNqQixJQUFJLFdBQVcsR0FBa0IsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUMsT0FBTyxDQUFDO0lBRXhFLE1BQU0sZ0JBQWdCLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0lBQ3BFLDBFQUEwRTtJQUMxRSxNQUFNLGdCQUFnQixHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFFOUYsTUFBTSxlQUFlLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO0lBQzVGLE1BQU0sd0JBQXdCLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO0lBQzlHLE1BQU0sWUFBWSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsOENBQThDLENBQUMsQ0FBQztJQUNsRixNQUFNLFFBQVEsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7SUFFNUUsTUFBTSxxQkFBcUIsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFFbEUsbUZBQW1GO0lBQ25GLFdBQVc7SUFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUM7SUFFbkMsaUNBQW1CLENBQUMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUNyRCxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEdBQUcsVUFBRyxDQUFDLEVBQUU7WUFDL0MsSUFBSSxRQUFRLEtBQUssZ0JBQWdCLEVBQUU7Z0JBQ2pDLElBQUksTUFBTSxLQUFLLFVBQVUsSUFBSSxxQkFBYSxFQUFFLENBQUMsU0FBUyxLQUFLLEtBQUssRUFBRTtvQkFDaEUsMkJBQTJCO29CQUMzQixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLGtCQUFFLEVBQUU7d0JBQzNCLFFBQVEsQ0FBQyxHQUFXOzRCQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFDO3dCQUM1QyxDQUFDO3FCQUNGLENBQUMsQ0FBQztpQkFDSjtnQkFDRCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7b0JBQ3hCLE9BQU8sdUNBQW9CLEVBQUUsQ0FBQztpQkFDL0I7YUFDRjtZQUNELFFBQVEsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUN2QixLQUFLLGVBQWU7b0JBQ2xCLE9BQU8sT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0JBQ3JDLEtBQUssd0JBQXdCO29CQUMzQixPQUFPLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO2dCQUMvQyxLQUFLLFlBQVk7b0JBQ2YsT0FBTyxjQUFjLENBQUM7Z0JBQ3hCLEtBQUssUUFBUTtvQkFDWCxPQUFPLFdBQVcsRUFBRSxDQUFDO2dCQUN2QixRQUFRO2FBQ1Q7WUFDRCxJQUFJLE1BQU0sS0FBSyw2QkFBNkIsRUFBRTtnQkFDNUMsT0FBTyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLENBQUM7YUFDOUM7U0FDRjthQUFNLElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFO1lBQ3JELFFBQVEsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUN2QixLQUFLLFFBQVE7b0JBQ1gsT0FBTyxXQUFXLEVBQUUsQ0FBQztnQkFDdkIsS0FBSyxZQUFZO29CQUNmLE9BQU8sY0FBYyxDQUFDO2dCQUN4QixRQUFRO2FBQ1Q7U0FDRjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsK0JBQXFCLEVBQUUsQ0FBQztBQUMxQixDQUFDO0FBM0RELGtCQTJEQztBQUlELFNBQVMsY0FBYztJQUNyQixzQkFBc0I7SUFDdEIsaUJBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQ3pDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuLyoqXG4gKiBEbyBub3QgYWN0dWFsbHkgaW1wb3J0IGVudGl0eSBvdGhlciB0aGFuIFwidHlwZVwiIGZyb20gaGVyZVxuICogQmVjYXVzZSB3ZSBoYXZlIG5vdCBzZXQgbm9kZSBwYXRoIHlldC5cbiAqL1xuaW1wb3J0IHtkcmF3UHVwcHl9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IF9wYXRocyBmcm9tICcuL2NyYS1zY3JpcHRzLXBhdGhzJztcbmltcG9ydCB7Z2V0Q21kT3B0aW9uc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge2hhY2tXZWJwYWNrNENvbXBpbGVyfSBmcm9tICcuL2hhY2std2VicGFjay1hcGknO1xuaW1wb3J0IHtzZXB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtob29rQ29tbW9uSnNSZXF1aXJlfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2xvYWRlckhvb2tzJztcbmltcG9ydCB7cmVnaXN0ZXIgYXMgcmVnaXN0ZXJGb3JrVHNDaGVja2VyfSBmcm9tICcuL2hhY2stZm9yay10cy1jaGVja2VyJztcbi8vIEF2b2lkIGNoaWxkIHByb2Nlc3MgcmVxdWlyZSB1cyFcbmNvbnN0IGRlbGV0ZUV4ZWNBcmdJZHg6IG51bWJlcltdID0gW107XG5mb3IgKGxldCBpID0gMCwgbCA9IHByb2Nlc3MuZXhlY0FyZ3YubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gIGlmIChpIDwgbCAtIDEgJiYgL14oPzpcXC1yfFxcLVxcLXJlcXVpcmUpJC8udGVzdChwcm9jZXNzLmV4ZWNBcmd2W2ldKSAmJlxuICAvXkB3ZmhcXC9jcmFcXC1zY3JpcHRzKCR8XFwvKS8udGVzdChwcm9jZXNzLmV4ZWNBcmd2W2kgKyAxXSkpIHtcbiAgICBkZWxldGVFeGVjQXJnSWR4LnB1c2goaSk7XG4gIH1cbn1cbmRlbGV0ZUV4ZWNBcmdJZHgucmVkdWNlKChvZmZzZXQsIGRlbGV0ZUlkeCkgPT4ge1xuICBwcm9jZXNzLmV4ZWNBcmd2LnNwbGljZShkZWxldGVJZHggKyBvZmZzZXQsIDIpO1xuICByZXR1cm4gb2Zmc2V0ICsgMjtcbn0sIDApO1xuXG5leHBvcnQgZnVuY3Rpb24gcG9vKCkge1xuICBsZXQgZ2V0Q3JhUGF0aHM6IHR5cGVvZiBfcGF0aHMgPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJykuZGVmYXVsdDtcblxuICBjb25zdCByZWFjdFNjcmlwdHNQYXRoID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3Qtc2NyaXB0cycpO1xuICAvLyBjb25zdCByZWFjdERldlV0aWxzUGF0aCA9IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LWRldi11dGlscycpO1xuICBjb25zdCBidWlsZFNjcmlwdHNQYXRoID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAncmVhY3Qtc2NyaXB0cycsICdzY3JpcHRzJywgJ2J1aWxkLmpzJyk7XG5cbiAgY29uc3QgcmVhY3RXZWJwYWNrQ2ZnID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3Qtc2NyaXB0cy9jb25maWcvd2VicGFjay5jb25maWcuanMnKTtcbiAgY29uc3QgcmVhY3RXZWJwYWNrRGV2U2VydmVyQ2ZnID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3Qtc2NyaXB0cy9jb25maWcvd2VicGFja0RldlNlcnZlci5jb25maWcuanMnKTtcbiAgY29uc3QgY2xlYXJDb25zb2xlID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3QtZGV2LXV0aWxzL2NsZWFyQ29uc29sZS5qcycpO1xuICBjb25zdCBjcmFQYXRocyA9IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LXNjcmlwdHMvY29uZmlnL3BhdGhzLmpzJyk7XG5cbiAgY29uc3QgY3JhUGFja2FnZXNQYXRoUHJlZml4ID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3QtJyk7XG5cbiAgLy8gRGlzYWJsZSBAcG1tbXdoL3JlYWN0LXJlZnJlc2gtd2VicGFjay1wbHVnaW4sIHNpbmNlIGl0IGV4Y2x1ZGVzIG91ciBub2RlX21vZHVsZXNcbiAgLy8gZnJvbSBITVJcbiAgcHJvY2Vzcy5lbnYuRkFTVF9SRUZSRVNIID0gJ2ZhbHNlJztcblxuICBob29rQ29tbW9uSnNSZXF1aXJlKChmaWxlbmFtZSwgdGFyZ2V0LCByZXEsIHJlc29sdmUpID0+IHtcbiAgICBpZiAoZmlsZW5hbWUuc3RhcnRzV2l0aChyZWFjdFNjcmlwdHNQYXRoICsgc2VwKSkge1xuICAgICAgaWYgKGZpbGVuYW1lID09PSBidWlsZFNjcmlwdHNQYXRoKSB7XG4gICAgICAgIGlmICh0YXJnZXQgPT09ICdmcy1leHRyYScgJiYgZ2V0Q21kT3B0aW9ucygpLmJ1aWxkVHlwZSA9PT0gJ2xpYicpIHtcbiAgICAgICAgICAvLyBEaXNhYmxlIGNvcHkgcHVibGljIHBhdGhcbiAgICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgZnMsIHtcbiAgICAgICAgICAgIGNvcHlTeW5jKHNyYzogc3RyaW5nKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbcHJlcGxvYWRdIHNraXAgY29weSAnLCBzcmMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0YXJnZXQgPT09ICd3ZWJwYWNrJykge1xuICAgICAgICAgIHJldHVybiBoYWNrV2VicGFjazRDb21waWxlcigpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzd2l0Y2ggKHJlc29sdmUodGFyZ2V0KSkge1xuICAgICAgICBjYXNlIHJlYWN0V2VicGFja0NmZzpcbiAgICAgICAgICByZXR1cm4gcmVxdWlyZSgnLi93ZWJwYWNrLmNvbmZpZycpO1xuICAgICAgICBjYXNlIHJlYWN0V2VicGFja0RldlNlcnZlckNmZzpcbiAgICAgICAgICByZXR1cm4gcmVxdWlyZSgnLi93ZWJwYWNrLmRldnNlcnZlci5jb25maWcnKTtcbiAgICAgICAgY2FzZSBjbGVhckNvbnNvbGU6XG4gICAgICAgICAgcmV0dXJuIG5vQ2xlYXJDb25zb2xlO1xuICAgICAgICBjYXNlIGNyYVBhdGhzOlxuICAgICAgICAgIHJldHVybiBnZXRDcmFQYXRocygpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgfVxuICAgICAgaWYgKHRhcmdldCA9PT0gJ3JlYWN0LWRldi11dGlscy9vcGVuQnJvd3NlcicpIHtcbiAgICAgICAgcmV0dXJuIHJlcXVpcmUoJy4vY3JhLW9wZW4tYnJvd3NlcicpLmRlZmF1bHQ7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChmaWxlbmFtZS5zdGFydHNXaXRoKGNyYVBhY2thZ2VzUGF0aFByZWZpeCkpIHtcbiAgICAgIHN3aXRjaCAocmVzb2x2ZSh0YXJnZXQpKSB7XG4gICAgICAgIGNhc2UgY3JhUGF0aHM6XG4gICAgICAgICAgcmV0dXJuIGdldENyYVBhdGhzKCk7XG4gICAgICAgIGNhc2UgY2xlYXJDb25zb2xlOlxuICAgICAgICAgIHJldHVybiBub0NsZWFyQ29uc29sZTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJlZ2lzdGVyRm9ya1RzQ2hlY2tlcigpO1xufVxuXG5cblxuZnVuY3Rpb24gbm9DbGVhckNvbnNvbGUoKSB7XG4gIC8vIG9yaWdDbGVhckNvbnNvbGUoKTtcbiAgZHJhd1B1cHB5KCdwb29lZCBvbiBjcmVhdGUtcmVhY3QtYXBwJyk7XG59XG4iXX0=