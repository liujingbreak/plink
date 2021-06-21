"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
// import log4js from 'log4js';
const path_1 = __importDefault(require("path"));
const gulp_1 = __importDefault(require("gulp"));
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = __importDefault(require("fs"));
const tslint = require('gulp-tslint');
// const log = log4js.getLogger('plink.tslint-worker');
function tsLintPackageAsync(fullName, json, packagePath, fix) {
    let dir;
    // packagePath = fs.realpathSync(packagePath);
    // eslint-disable-next-line no-console
    console.log('TSlint Scan', packagePath);
    if (fullName === '@wfh/plink')
        packagePath = packagePath + '/wfh';
    for (let pDir = packagePath; dir !== pDir; pDir = path_1.default.dirname(dir)) {
        dir = pDir;
        if (fs_1.default.existsSync(dir + '/tslint.json'))
            break;
    }
    const rcfile = path_1.default.resolve(dir, 'tslint.json');
    // eslint-disable-next-line no-console
    console.log('Use', rcfile);
    const packagePath0 = packagePath.replace(/\\/g, '/');
    // TODO: use require('../../dist/utils').getTsDirsOfPackage;
    // Unlike ESlint, TSLint fix does not write file to stream, but use fs.writeFileSync() instead
    return new Promise((resolve, reject) => {
        const tsDestDir = lodash_1.default.get(json, 'dr.ts.dest', 'dist');
        const stream = gulp_1.default.src([packagePath0 + '/**/*.{ts,tsx}',
            `!${packagePath}/**/*.spec.ts`,
            `!${packagePath}/**/*.d.ts`,
            `!${packagePath}/${tsDestDir}/**/*`,
            `!${packagePath0}/spec/**/*`,
            `!${packagePath}/${lodash_1.default.get(json, 'dr.assetsDir', 'assets')}/**/*`,
            `!${packagePath0}/node_modules/**/*`], { base: packagePath })
            .pipe(tslint({ tslint: require('tslint'), formatter: 'verbose', configuration: rcfile, fix }))
            .pipe(tslint.report({
            summarizeFailureOutput: true,
            allowWarnings: true
        }))
            .on('error', (err) => reject(err));
        stream.resume();
        stream.on('end', () => resolve());
    });
}
exports.default = tsLintPackageAsync;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNsaW50LXdvcmtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL2NtZC90c2xpbnQtd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsdUNBQXFDO0FBQ3JDLCtCQUErQjtBQUMvQixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUN2Qiw0Q0FBb0I7QUFDcEIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBRXRDLHVEQUF1RDtBQUd2RCxTQUF3QixrQkFBa0IsQ0FBQyxRQUFnQixFQUFFLElBQVMsRUFBRSxXQUFtQixFQUFFLEdBQVk7SUFDdkcsSUFBSSxHQUFHLENBQUM7SUFDUiw4Q0FBOEM7SUFDOUMsc0NBQXNDO0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBRXhDLElBQUksUUFBUSxLQUFLLFlBQVk7UUFDM0IsV0FBVyxHQUFHLFdBQVcsR0FBRyxNQUFNLENBQUM7SUFDckMsS0FBSyxJQUFJLElBQUksR0FBRyxXQUFXLEVBQUUsR0FBRyxLQUFLLElBQUksRUFBRSxJQUFJLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNuRSxHQUFHLEdBQUcsSUFBSSxDQUFDO1FBQ1gsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsR0FBRyxjQUFjLENBQUM7WUFDckMsTUFBTTtLQUNUO0lBQ0QsTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDaEQsc0NBQXNDO0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzNCLE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBRXJELDREQUE0RDtJQUM1RCw4RkFBOEY7SUFDOUYsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUMzQyxNQUFNLFNBQVMsR0FBRyxnQkFBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3BELE1BQU0sTUFBTSxHQUFHLGNBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCO1lBQ3RELElBQUksV0FBVyxlQUFlO1lBQzlCLElBQUksV0FBVyxZQUFZO1lBQzNCLElBQUksV0FBVyxJQUFJLFNBQVMsT0FBTztZQUNuQyxJQUFJLFlBQVksWUFBWTtZQUM1QixJQUFJLFdBQVcsSUFBSSxnQkFBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLFFBQVEsQ0FBQyxPQUFPO1lBQy9ELElBQUksWUFBWSxvQkFBb0IsQ0FBQyxFQUFFLEVBQUMsSUFBSSxFQUFFLFdBQVcsRUFBQyxDQUFDO2FBQzVELElBQUksQ0FBQyxNQUFNLENBQUMsRUFBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO2FBQzNGLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2xCLHNCQUFzQixFQUFFLElBQUk7WUFDNUIsYUFBYSxFQUFFLElBQUk7U0FDcEIsQ0FBQyxDQUFDO2FBQ0YsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQVUsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFMUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDcEMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBdkNELHFDQXVDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcbi8vIGltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGd1bHAgZnJvbSAnZ3VscCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmNvbnN0IHRzbGludCA9IHJlcXVpcmUoJ2d1bHAtdHNsaW50Jyk7XG5cbi8vIGNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnRzbGludC13b3JrZXInKTtcblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0c0xpbnRQYWNrYWdlQXN5bmMoZnVsbE5hbWU6IHN0cmluZywganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nLCBmaXg6IGJvb2xlYW4pIHtcbiAgbGV0IGRpcjtcbiAgLy8gcGFja2FnZVBhdGggPSBmcy5yZWFscGF0aFN5bmMocGFja2FnZVBhdGgpO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnVFNsaW50IFNjYW4nLCBwYWNrYWdlUGF0aCk7XG5cbiAgaWYgKGZ1bGxOYW1lID09PSAnQHdmaC9wbGluaycpXG4gICAgcGFja2FnZVBhdGggPSBwYWNrYWdlUGF0aCArICcvd2ZoJztcbiAgZm9yIChsZXQgcERpciA9IHBhY2thZ2VQYXRoOyBkaXIgIT09IHBEaXI7IHBEaXIgPSBQYXRoLmRpcm5hbWUoZGlyKSkge1xuICAgIGRpciA9IHBEaXI7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZGlyICsgJy90c2xpbnQuanNvbicpKVxuICAgICAgYnJlYWs7XG4gIH1cbiAgY29uc3QgcmNmaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3RzbGludC5qc29uJyk7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdVc2UnLCByY2ZpbGUpO1xuICBjb25zdCBwYWNrYWdlUGF0aDAgPSBwYWNrYWdlUGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgLy8gVE9ETzogdXNlIHJlcXVpcmUoJy4uLy4uL2Rpc3QvdXRpbHMnKS5nZXRUc0RpcnNPZlBhY2thZ2U7XG4gIC8vIFVubGlrZSBFU2xpbnQsIFRTTGludCBmaXggZG9lcyBub3Qgd3JpdGUgZmlsZSB0byBzdHJlYW0sIGJ1dCB1c2UgZnMud3JpdGVGaWxlU3luYygpIGluc3RlYWRcbiAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCB0c0Rlc3REaXIgPSBfLmdldChqc29uLCAnZHIudHMuZGVzdCcsICdkaXN0Jyk7XG4gICAgY29uc3Qgc3RyZWFtID0gZ3VscC5zcmMoW3BhY2thZ2VQYXRoMCArICcvKiovKi57dHMsdHN4fScsXG4gICAgICBgISR7cGFja2FnZVBhdGh9LyoqLyouc3BlYy50c2AsXG4gICAgICBgISR7cGFja2FnZVBhdGh9LyoqLyouZC50c2AsXG4gICAgICBgISR7cGFja2FnZVBhdGh9LyR7dHNEZXN0RGlyfS8qKi8qYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aDB9L3NwZWMvKiovKmAsXG4gICAgICBgISR7cGFja2FnZVBhdGh9LyR7Xy5nZXQoanNvbiwgJ2RyLmFzc2V0c0RpcicsICdhc3NldHMnKX0vKiovKmAsXG4gICAgICBgISR7cGFja2FnZVBhdGgwfS9ub2RlX21vZHVsZXMvKiovKmBdLCB7YmFzZTogcGFja2FnZVBhdGh9KVxuICAgIC5waXBlKHRzbGludCh7dHNsaW50OiByZXF1aXJlKCd0c2xpbnQnKSwgZm9ybWF0dGVyOiAndmVyYm9zZScsIGNvbmZpZ3VyYXRpb246IHJjZmlsZSwgZml4fSkpXG4gICAgLnBpcGUodHNsaW50LnJlcG9ydCh7XG4gICAgICBzdW1tYXJpemVGYWlsdXJlT3V0cHV0OiB0cnVlLFxuICAgICAgYWxsb3dXYXJuaW5nczogdHJ1ZVxuICAgIH0pKVxuICAgIC5vbignZXJyb3InLCAoZXJyOiBFcnJvcikgPT4gcmVqZWN0KGVycikpO1xuXG4gICAgc3RyZWFtLnJlc3VtZSgpO1xuICAgIHN0cmVhbS5vbignZW5kJywgKCkgPT4gcmVzb2x2ZSgpKTtcbiAgfSk7XG59XG4iXX0=