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
    const getPaths = require('./cra-scripts-paths').default;
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
                        path_1.resolve(path_1.dirname(this.filename), target).endsWith('/react-scripts/config/paths')) {
                        console.log(`[preload] source: ${this.filename},\n  target: react-scripts/config/paths`);
                        return getPaths();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvcHJlbG9hZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0I7OztHQUdHO0FBQ0gsbUNBQW1EO0FBR25ELGlCQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUMvQixPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUV2Qyw0REFBNEI7QUFDNUIsK0JBQTJDO0FBRTNDLEdBQUcsRUFBRSxDQUFDO0FBRU4sdUJBQWUsRUFBRSxDQUFDO0FBRWxCLFNBQVMsR0FBRztJQUNWLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUN0RSxNQUFNLFFBQVEsR0FBcUIsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUMsT0FBTyxDQUFDO0lBRTFFLE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxVQUFHLGVBQWUsVUFBRyxnQkFBZ0IsVUFBRyxFQUFFLENBQUM7SUFDdkUsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLFVBQUcsZUFBZSxVQUFHLGtCQUFrQixVQUFHLEVBQUUsQ0FBQztJQUUxRSxNQUFNLFFBQVEsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7SUFFMUMsZ0RBQWdEO0lBQ2hELGdCQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxVQUF1QixNQUFNO1FBQ3RELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDaEQsUUFBUSxNQUFNLEVBQUU7Z0JBQ2QsS0FBSywwQkFBMEI7b0JBQzdCLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7b0JBQzdDLHNDQUFzQztvQkFDdEMsTUFBTTtnQkFFUixLQUFLLG1DQUFtQztvQkFDdEMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQztvQkFDdkQsTUFBTTtnQkFFUjtvQkFDRSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEVBQUU7d0JBQ3BDLE9BQU8sWUFBWSxDQUFDO3FCQUNyQjt5QkFBTSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO3dCQUNsQyxjQUFPLENBQUMsY0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLENBQUMsRUFBRTt3QkFDakYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLFFBQVEseUNBQXlDLENBQUMsQ0FBQzt3QkFDekYsT0FBTyxRQUFRLEVBQUUsQ0FBQztxQkFDbkI7YUFDSjtTQUNGO2FBQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN4RCxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEVBQUU7Z0JBQ3BDLE9BQU8sWUFBWSxDQUFDO2FBQ3JCO1NBQ0Y7UUFDRCxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3JDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLFlBQVk7SUFDbkIsc0JBQXNCO0lBQ3RCLGlCQUFTLENBQUMsMkJBQTJCLENBQUMsQ0FBQztBQUN6QyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvZGlzdC9wcmVsb2FkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbi8qKlxuICogRG8gbm90IGFjdHVhbGx5IGltcG9ydCBlbnRpdHkgb3RoZXIgdGhhbiBcInR5cGVcIiBmcm9tIGhlcmVcbiAqIEJlY2F1c2Ugd2UgaGF2ZSBub3Qgc2V0IG5vZGUgcGF0aCB5ZXQuXG4gKi9cbmltcG9ydCB7ZHJhd1B1cHB5LCBzYXZlQ21kQXJnVG9FbnZ9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IF9nZXRQYXRocyBmcm9tICcuL2NyYS1zY3JpcHRzLXBhdGhzJztcblxuZHJhd1B1cHB5KCdMb2FkaW5nIG15IHBvby4uLicpO1xucmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJyk7XG5cbmltcG9ydCBNb2R1bGUgZnJvbSAnbW9kdWxlJztcbmltcG9ydCB7c2VwLCByZXNvbHZlLCBkaXJuYW1lfSBmcm9tICdwYXRoJztcblxucG9vKCk7XG5cbnNhdmVDbWRBcmdUb0VudigpO1xuXG5mdW5jdGlvbiBwb28oKSB7XG4gIHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS9iaW4vbm9kZVBhdGgnKS5zZXRDb250ZXh0UGF0aChwcm9jZXNzLmN3ZCgpKTtcbiAgY29uc3QgZ2V0UGF0aHM6IHR5cGVvZiBfZ2V0UGF0aHMgPSByZXF1aXJlKCcuL2NyYS1zY3JpcHRzLXBhdGhzJykuZGVmYXVsdDtcblxuICBjb25zdCByZWFjdFNjcmlwdHNQYXRoID0gYCR7c2VwfW5vZGVfbW9kdWxlcyR7c2VwfXJlYWN0LXNjcmlwdHMke3NlcH1gO1xuICBjb25zdCByZWFjdERldlV0aWxzUGF0aCA9IGAke3NlcH1ub2RlX21vZHVsZXMke3NlcH1yZWFjdC1kZXYtdXRpbHMke3NlcH1gO1xuXG4gIGNvbnN0IHN1cGVyUmVxID0gTW9kdWxlLnByb3RvdHlwZS5yZXF1aXJlO1xuXG4gIC8vIFRPRE86IFNob3VsZCB1c2UgcmVxdWlyZS1pbmplY3RvciBuZXcgdmVyc2lvblxuICBNb2R1bGUucHJvdG90eXBlLnJlcXVpcmUgPSBmdW5jdGlvbih0aGlzOiBNb2R1bGUsIHRhcmdldCkge1xuICAgIGlmICh0aGlzLmZpbGVuYW1lLmluZGV4T2YocmVhY3RTY3JpcHRzUGF0aCkgPj0gMCkge1xuICAgICAgc3dpdGNoICh0YXJnZXQpIHtcbiAgICAgICAgY2FzZSAnLi4vY29uZmlnL3dlYnBhY2suY29uZmlnJzpcbiAgICAgICAgICB0YXJnZXQgPSByZXF1aXJlLnJlc29sdmUoJy4vd2VicGFjay5jb25maWcnKTtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmZpbGVuYW1lLCB0YXJnZXQpO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJy4uL2NvbmZpZy93ZWJwYWNrRGV2U2VydmVyLmNvbmZpZyc6XG4gICAgICAgICAgdGFyZ2V0ID0gcmVxdWlyZS5yZXNvbHZlKCcuL3dlYnBhY2suZGV2c2VydmVyLmNvbmZpZycpO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaWYgKHRhcmdldC5lbmRzV2l0aCgnL2NsZWFyQ29uc29sZScpKSB7XG4gICAgICAgICAgICByZXR1cm4gY2xlYXJDb25zb2xlO1xuICAgICAgICAgIH0gZWxzZSBpZiAodGFyZ2V0LmVuZHNXaXRoKCcvcGF0aHMnKSAmJlxuICAgICAgICAgICAgcmVzb2x2ZShkaXJuYW1lKHRoaXMuZmlsZW5hbWUpLCB0YXJnZXQpLmVuZHNXaXRoKCcvcmVhY3Qtc2NyaXB0cy9jb25maWcvcGF0aHMnKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtwcmVsb2FkXSBzb3VyY2U6ICR7dGhpcy5maWxlbmFtZX0sXFxuICB0YXJnZXQ6IHJlYWN0LXNjcmlwdHMvY29uZmlnL3BhdGhzYCk7XG4gICAgICAgICAgICByZXR1cm4gZ2V0UGF0aHMoKTtcbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLmZpbGVuYW1lLmluZGV4T2YocmVhY3REZXZVdGlsc1BhdGgpID49IDApIHtcbiAgICAgIGlmICh0YXJnZXQuZW5kc1dpdGgoJy9jbGVhckNvbnNvbGUnKSkge1xuICAgICAgICByZXR1cm4gY2xlYXJDb25zb2xlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3VwZXJSZXEuY2FsbCh0aGlzLCB0YXJnZXQpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBjbGVhckNvbnNvbGUoKSB7XG4gIC8vIG9yaWdDbGVhckNvbnNvbGUoKTtcbiAgZHJhd1B1cHB5KCdwb29lZCBvbiBjcmVhdGUtcmVhY3QtYXBwJyk7XG59XG4iXX0=
