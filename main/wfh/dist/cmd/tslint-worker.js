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
    // tslint:disable-next-line: no-console
    console.log('TSlint Scan', packagePath);
    if (fullName === '@wfh/plink')
        packagePath = packagePath + '/wfh';
    for (let pDir = packagePath; dir !== pDir; pDir = path_1.default.dirname(dir)) {
        dir = pDir;
        if (fs_1.default.existsSync(dir + '/tslint.json'))
            break;
    }
    const rcfile = path_1.default.resolve(dir, 'tslint.json');
    // tslint:disable-next-line: no-console
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNsaW50LXdvcmtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL2NtZC90c2xpbnQtd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsdUNBQXFDO0FBQ3JDLCtCQUErQjtBQUMvQixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUN2Qiw0Q0FBb0I7QUFDcEIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBRXRDLHVEQUF1RDtBQUd2RCxTQUF3QixrQkFBa0IsQ0FBQyxRQUFnQixFQUFFLElBQVMsRUFBRSxXQUFtQixFQUFFLEdBQVk7SUFDdkcsSUFBSSxHQUFHLENBQUM7SUFDUiw4Q0FBOEM7SUFDOUMsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBRXhDLElBQUksUUFBUSxLQUFLLFlBQVk7UUFDM0IsV0FBVyxHQUFHLFdBQVcsR0FBRyxNQUFNLENBQUM7SUFDckMsS0FBSyxJQUFJLElBQUksR0FBRyxXQUFXLEVBQUUsR0FBRyxLQUFLLElBQUksRUFBRSxJQUFJLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNuRSxHQUFHLEdBQUcsSUFBSSxDQUFDO1FBQ1gsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsR0FBRyxjQUFjLENBQUM7WUFDckMsTUFBTTtLQUNUO0lBQ0QsTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDaEQsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzNCLE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBRXJELDREQUE0RDtJQUM1RCw4RkFBOEY7SUFDOUYsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUMzQyxNQUFNLFNBQVMsR0FBRyxnQkFBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3BELE1BQU0sTUFBTSxHQUFHLGNBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCO1lBQ3RELElBQUksV0FBVyxlQUFlO1lBQzlCLElBQUksV0FBVyxZQUFZO1lBQzNCLElBQUksV0FBVyxJQUFJLFNBQVMsT0FBTztZQUNuQyxJQUFJLFlBQVksWUFBWTtZQUM1QixJQUFJLFdBQVcsSUFBSSxnQkFBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLFFBQVEsQ0FBQyxPQUFPO1lBQy9ELElBQUksWUFBWSxvQkFBb0IsQ0FBQyxFQUFFLEVBQUMsSUFBSSxFQUFFLFdBQVcsRUFBQyxDQUFDO2FBQzVELElBQUksQ0FBQyxNQUFNLENBQUMsRUFBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO2FBQzNGLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2xCLHNCQUFzQixFQUFFLElBQUk7WUFDNUIsYUFBYSxFQUFFLElBQUk7U0FDcEIsQ0FBQyxDQUFDO2FBQ0YsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQVUsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFMUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDcEMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBdkNELHFDQXVDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcbi8vIGltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGd1bHAgZnJvbSAnZ3VscCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmNvbnN0IHRzbGludCA9IHJlcXVpcmUoJ2d1bHAtdHNsaW50Jyk7XG5cbi8vIGNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnRzbGludC13b3JrZXInKTtcblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0c0xpbnRQYWNrYWdlQXN5bmMoZnVsbE5hbWU6IHN0cmluZywganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nLCBmaXg6IGJvb2xlYW4pIHtcbiAgbGV0IGRpcjtcbiAgLy8gcGFja2FnZVBhdGggPSBmcy5yZWFscGF0aFN5bmMocGFja2FnZVBhdGgpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ1RTbGludCBTY2FuJywgcGFja2FnZVBhdGgpO1xuXG4gIGlmIChmdWxsTmFtZSA9PT0gJ0B3ZmgvcGxpbmsnKVxuICAgIHBhY2thZ2VQYXRoID0gcGFja2FnZVBhdGggKyAnL3dmaCc7XG4gIGZvciAobGV0IHBEaXIgPSBwYWNrYWdlUGF0aDsgZGlyICE9PSBwRGlyOyBwRGlyID0gUGF0aC5kaXJuYW1lKGRpcikpIHtcbiAgICBkaXIgPSBwRGlyO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGRpciArICcvdHNsaW50Lmpzb24nKSlcbiAgICAgIGJyZWFrO1xuICB9XG4gIGNvbnN0IHJjZmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICd0c2xpbnQuanNvbicpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ1VzZScsIHJjZmlsZSk7XG4gIGNvbnN0IHBhY2thZ2VQYXRoMCA9IHBhY2thZ2VQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuICAvLyBUT0RPOiB1c2UgcmVxdWlyZSgnLi4vLi4vZGlzdC91dGlscycpLmdldFRzRGlyc09mUGFja2FnZTtcbiAgLy8gVW5saWtlIEVTbGludCwgVFNMaW50IGZpeCBkb2VzIG5vdCB3cml0ZSBmaWxlIHRvIHN0cmVhbSwgYnV0IHVzZSBmcy53cml0ZUZpbGVTeW5jKCkgaW5zdGVhZFxuICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IHRzRGVzdERpciA9IF8uZ2V0KGpzb24sICdkci50cy5kZXN0JywgJ2Rpc3QnKTtcbiAgICBjb25zdCBzdHJlYW0gPSBndWxwLnNyYyhbcGFja2FnZVBhdGgwICsgJy8qKi8qLnt0cyx0c3h9JyxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aH0vKiovKi5zcGVjLnRzYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aH0vKiovKi5kLnRzYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aH0vJHt0c0Rlc3REaXJ9LyoqLypgLFxuICAgICAgYCEke3BhY2thZ2VQYXRoMH0vc3BlYy8qKi8qYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aH0vJHtfLmdldChqc29uLCAnZHIuYXNzZXRzRGlyJywgJ2Fzc2V0cycpfS8qKi8qYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aDB9L25vZGVfbW9kdWxlcy8qKi8qYF0sIHtiYXNlOiBwYWNrYWdlUGF0aH0pXG4gICAgLnBpcGUodHNsaW50KHt0c2xpbnQ6IHJlcXVpcmUoJ3RzbGludCcpLCBmb3JtYXR0ZXI6ICd2ZXJib3NlJywgY29uZmlndXJhdGlvbjogcmNmaWxlLCBmaXh9KSlcbiAgICAucGlwZSh0c2xpbnQucmVwb3J0KHtcbiAgICAgIHN1bW1hcml6ZUZhaWx1cmVPdXRwdXQ6IHRydWUsXG4gICAgICBhbGxvd1dhcm5pbmdzOiB0cnVlXG4gICAgfSkpXG4gICAgLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiByZWplY3QoZXJyKSk7XG5cbiAgICBzdHJlYW0ucmVzdW1lKCk7XG4gICAgc3RyZWFtLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKCkpO1xuICB9KTtcbn1cbiJdfQ==