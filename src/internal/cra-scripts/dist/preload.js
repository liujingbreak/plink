"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.poo = void 0;
/* eslint-disable no-console */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlbG9hZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByZWxvYWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsK0JBQStCO0FBQy9COzs7R0FHRztBQUNILG1DQUFrQztBQUVsQyxtQ0FBc0M7QUFDdEMsZ0RBQXdCO0FBQ3hCLHdEQUEwQjtBQUMxQix5REFBd0Q7QUFDeEQsK0JBQXlCO0FBQ3pCLGlFQUFvRTtBQUNwRSxpRUFBeUU7QUFDekUsa0NBQWtDO0FBQ2xDLE1BQU0sZ0JBQWdCLEdBQWEsRUFBRSxDQUFDO0FBQ3RDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0lBQ3ZELElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksdUJBQXVCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEUsMkJBQTJCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDekQsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzFCO0NBQ0Y7QUFDRCxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7SUFDNUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvQyxPQUFPLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBRU4sU0FBZ0IsR0FBRztJQUNqQixJQUFJLFdBQVcsR0FBa0IsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUMsT0FBTyxDQUFDO0lBRXhFLE1BQU0sZ0JBQWdCLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0lBQ3BFLDBFQUEwRTtJQUMxRSxNQUFNLGdCQUFnQixHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFFOUYsTUFBTSxlQUFlLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO0lBQzVGLE1BQU0sd0JBQXdCLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO0lBQzlHLE1BQU0sWUFBWSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsOENBQThDLENBQUMsQ0FBQztJQUNsRixNQUFNLFFBQVEsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7SUFFNUUsTUFBTSxxQkFBcUIsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFFbEUsbUZBQW1GO0lBQ25GLFdBQVc7SUFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUM7SUFFbkMsaUNBQW1CLENBQUMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUNyRCxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEdBQUcsVUFBRyxDQUFDLEVBQUU7WUFDL0MsSUFBSSxRQUFRLEtBQUssZ0JBQWdCLEVBQUU7Z0JBQ2pDLElBQUksTUFBTSxLQUFLLFVBQVUsSUFBSSxxQkFBYSxFQUFFLENBQUMsU0FBUyxLQUFLLEtBQUssRUFBRTtvQkFDaEUsMkJBQTJCO29CQUMzQixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLGtCQUFFLEVBQUU7d0JBQzNCLFFBQVEsQ0FBQyxHQUFXOzRCQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFDO3dCQUM1QyxDQUFDO3FCQUNGLENBQUMsQ0FBQztpQkFDSjtnQkFDRCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7b0JBQ3hCLE9BQU8sdUNBQW9CLEVBQUUsQ0FBQztpQkFDL0I7YUFDRjtZQUNELFFBQVEsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUN2QixLQUFLLGVBQWU7b0JBQ2xCLE9BQU8sT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0JBQ3JDLEtBQUssd0JBQXdCO29CQUMzQixPQUFPLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO2dCQUMvQyxLQUFLLFlBQVk7b0JBQ2YsT0FBTyxjQUFjLENBQUM7Z0JBQ3hCLEtBQUssUUFBUTtvQkFDWCxPQUFPLFdBQVcsRUFBRSxDQUFDO2dCQUN2QixRQUFRO2FBQ1Q7WUFDRCxJQUFJLE1BQU0sS0FBSyw2QkFBNkIsRUFBRTtnQkFDNUMsT0FBTyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLENBQUM7YUFDOUM7U0FDRjthQUFNLElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFO1lBQ3JELFFBQVEsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUN2QixLQUFLLFFBQVE7b0JBQ1gsT0FBTyxXQUFXLEVBQUUsQ0FBQztnQkFDdkIsS0FBSyxZQUFZO29CQUNmLE9BQU8sY0FBYyxDQUFDO2dCQUN4QixRQUFRO2FBQ1Q7U0FDRjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsK0JBQXFCLEVBQUUsQ0FBQztBQUMxQixDQUFDO0FBM0RELGtCQTJEQztBQUlELFNBQVMsY0FBYztJQUNyQixzQkFBc0I7SUFDdEIsaUJBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQ3pDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG4vKipcbiAqIERvIG5vdCBhY3R1YWxseSBpbXBvcnQgZW50aXR5IG90aGVyIHRoYW4gXCJ0eXBlXCIgZnJvbSBoZXJlXG4gKiBCZWNhdXNlIHdlIGhhdmUgbm90IHNldCBub2RlIHBhdGggeWV0LlxuICovXG5pbXBvcnQge2RyYXdQdXBweX0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgX3BhdGhzIGZyb20gJy4vY3JhLXNjcmlwdHMtcGF0aHMnO1xuaW1wb3J0IHtnZXRDbWRPcHRpb25zfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7aGFja1dlYnBhY2s0Q29tcGlsZXJ9IGZyb20gJy4vaGFjay13ZWJwYWNrLWFwaSc7XG5pbXBvcnQge3NlcH0gZnJvbSAncGF0aCc7XG5pbXBvcnQge2hvb2tDb21tb25Kc1JlcXVpcmV9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvbG9hZGVySG9va3MnO1xuaW1wb3J0IHtyZWdpc3RlciBhcyByZWdpc3RlckZvcmtUc0NoZWNrZXJ9IGZyb20gJy4vaGFjay1mb3JrLXRzLWNoZWNrZXInO1xuLy8gQXZvaWQgY2hpbGQgcHJvY2VzcyByZXF1aXJlIHVzIVxuY29uc3QgZGVsZXRlRXhlY0FyZ0lkeDogbnVtYmVyW10gPSBbXTtcbmZvciAobGV0IGkgPSAwLCBsID0gcHJvY2Vzcy5leGVjQXJndi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgaWYgKGkgPCBsIC0gMSAmJiAvXig/OlxcLXJ8XFwtXFwtcmVxdWlyZSkkLy50ZXN0KHByb2Nlc3MuZXhlY0FyZ3ZbaV0pICYmXG4gIC9eQHdmaFxcL2NyYVxcLXNjcmlwdHMoJHxcXC8pLy50ZXN0KHByb2Nlc3MuZXhlY0FyZ3ZbaSArIDFdKSkge1xuICAgIGRlbGV0ZUV4ZWNBcmdJZHgucHVzaChpKTtcbiAgfVxufVxuZGVsZXRlRXhlY0FyZ0lkeC5yZWR1Y2UoKG9mZnNldCwgZGVsZXRlSWR4KSA9PiB7XG4gIHByb2Nlc3MuZXhlY0FyZ3Yuc3BsaWNlKGRlbGV0ZUlkeCArIG9mZnNldCwgMik7XG4gIHJldHVybiBvZmZzZXQgKyAyO1xufSwgMCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBwb28oKSB7XG4gIGxldCBnZXRDcmFQYXRoczogdHlwZW9mIF9wYXRocyA9IHJlcXVpcmUoJy4vY3JhLXNjcmlwdHMtcGF0aHMnKS5kZWZhdWx0O1xuXG4gIGNvbnN0IHJlYWN0U2NyaXB0c1BhdGggPSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1zY3JpcHRzJyk7XG4gIC8vIGNvbnN0IHJlYWN0RGV2VXRpbHNQYXRoID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3QtZGV2LXV0aWxzJyk7XG4gIGNvbnN0IGJ1aWxkU2NyaXB0c1BhdGggPSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdyZWFjdC1zY3JpcHRzJywgJ3NjcmlwdHMnLCAnYnVpbGQuanMnKTtcblxuICBjb25zdCByZWFjdFdlYnBhY2tDZmcgPSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1zY3JpcHRzL2NvbmZpZy93ZWJwYWNrLmNvbmZpZy5qcycpO1xuICBjb25zdCByZWFjdFdlYnBhY2tEZXZTZXJ2ZXJDZmcgPSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1zY3JpcHRzL2NvbmZpZy93ZWJwYWNrRGV2U2VydmVyLmNvbmZpZy5qcycpO1xuICBjb25zdCBjbGVhckNvbnNvbGUgPSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1kZXYtdXRpbHMvY2xlYXJDb25zb2xlLmpzJyk7XG4gIGNvbnN0IGNyYVBhdGhzID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3Qtc2NyaXB0cy9jb25maWcvcGF0aHMuanMnKTtcblxuICBjb25zdCBjcmFQYWNrYWdlc1BhdGhQcmVmaXggPSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC0nKTtcblxuICAvLyBEaXNhYmxlIEBwbW1td2gvcmVhY3QtcmVmcmVzaC13ZWJwYWNrLXBsdWdpbiwgc2luY2UgaXQgZXhjbHVkZXMgb3VyIG5vZGVfbW9kdWxlc1xuICAvLyBmcm9tIEhNUlxuICBwcm9jZXNzLmVudi5GQVNUX1JFRlJFU0ggPSAnZmFsc2UnO1xuXG4gIGhvb2tDb21tb25Kc1JlcXVpcmUoKGZpbGVuYW1lLCB0YXJnZXQsIHJlcSwgcmVzb2x2ZSkgPT4ge1xuICAgIGlmIChmaWxlbmFtZS5zdGFydHNXaXRoKHJlYWN0U2NyaXB0c1BhdGggKyBzZXApKSB7XG4gICAgICBpZiAoZmlsZW5hbWUgPT09IGJ1aWxkU2NyaXB0c1BhdGgpIHtcbiAgICAgICAgaWYgKHRhcmdldCA9PT0gJ2ZzLWV4dHJhJyAmJiBnZXRDbWRPcHRpb25zKCkuYnVpbGRUeXBlID09PSAnbGliJykge1xuICAgICAgICAgIC8vIERpc2FibGUgY29weSBwdWJsaWMgcGF0aFxuICAgICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBmcywge1xuICAgICAgICAgICAgY29weVN5bmMoc3JjOiBzdHJpbmcpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1twcmVwbG9hZF0gc2tpcCBjb3B5ICcsIHNyYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRhcmdldCA9PT0gJ3dlYnBhY2snKSB7XG4gICAgICAgICAgcmV0dXJuIGhhY2tXZWJwYWNrNENvbXBpbGVyKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHN3aXRjaCAocmVzb2x2ZSh0YXJnZXQpKSB7XG4gICAgICAgIGNhc2UgcmVhY3RXZWJwYWNrQ2ZnOlxuICAgICAgICAgIHJldHVybiByZXF1aXJlKCcuL3dlYnBhY2suY29uZmlnJyk7XG4gICAgICAgIGNhc2UgcmVhY3RXZWJwYWNrRGV2U2VydmVyQ2ZnOlxuICAgICAgICAgIHJldHVybiByZXF1aXJlKCcuL3dlYnBhY2suZGV2c2VydmVyLmNvbmZpZycpO1xuICAgICAgICBjYXNlIGNsZWFyQ29uc29sZTpcbiAgICAgICAgICByZXR1cm4gbm9DbGVhckNvbnNvbGU7XG4gICAgICAgIGNhc2UgY3JhUGF0aHM6XG4gICAgICAgICAgcmV0dXJuIGdldENyYVBhdGhzKCk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICB9XG4gICAgICBpZiAodGFyZ2V0ID09PSAncmVhY3QtZGV2LXV0aWxzL29wZW5Ccm93c2VyJykge1xuICAgICAgICByZXR1cm4gcmVxdWlyZSgnLi9jcmEtb3Blbi1icm93c2VyJykuZGVmYXVsdDtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGZpbGVuYW1lLnN0YXJ0c1dpdGgoY3JhUGFja2FnZXNQYXRoUHJlZml4KSkge1xuICAgICAgc3dpdGNoIChyZXNvbHZlKHRhcmdldCkpIHtcbiAgICAgICAgY2FzZSBjcmFQYXRoczpcbiAgICAgICAgICByZXR1cm4gZ2V0Q3JhUGF0aHMoKTtcbiAgICAgICAgY2FzZSBjbGVhckNvbnNvbGU6XG4gICAgICAgICAgcmV0dXJuIG5vQ2xlYXJDb25zb2xlO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcmVnaXN0ZXJGb3JrVHNDaGVja2VyKCk7XG59XG5cblxuXG5mdW5jdGlvbiBub0NsZWFyQ29uc29sZSgpIHtcbiAgLy8gb3JpZ0NsZWFyQ29uc29sZSgpO1xuICBkcmF3UHVwcHkoJ3Bvb2VkIG9uIGNyZWF0ZS1yZWFjdC1hcHAnKTtcbn1cbiJdfQ==