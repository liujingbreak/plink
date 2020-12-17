"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log4js_1 = __importDefault(require("log4js"));
const path_1 = __importDefault(require("path"));
const gulp_1 = __importDefault(require("gulp"));
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = __importDefault(require("fs"));
const tslint = require('gulp-tslint');
const log = log4js_1.default.getLogger('plink.tslint-worker');
function tsLintPackageAsync(fullName, json, packagePath, fix) {
    let dir;
    // packagePath = fs.realpathSync(packagePath);
    log.info('TSlint Scan', packagePath);
    console.log('TSlint Scan', packagePath);
    if (fullName === '@wfh/plink')
        packagePath = packagePath + '/wfh';
    for (let pDir = packagePath; dir !== pDir; pDir = path_1.default.dirname(dir)) {
        dir = pDir;
        if (fs_1.default.existsSync(dir + '/tslint.json'))
            break;
    }
    const rcfile = path_1.default.resolve(dir, 'tslint.json');
    log.debug('Use', rcfile);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNsaW50LXdvcmtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL2NtZC90c2xpbnQtd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsb0RBQTRCO0FBQzVCLGdEQUF3QjtBQUN4QixnREFBd0I7QUFDeEIsb0RBQXVCO0FBQ3ZCLDRDQUFvQjtBQUNwQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFFdEMsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUdwRCxTQUF3QixrQkFBa0IsQ0FBQyxRQUFnQixFQUFFLElBQVMsRUFBRSxXQUFtQixFQUFFLEdBQVk7SUFDdkcsSUFBSSxHQUFHLENBQUM7SUFDUiw4Q0FBOEM7SUFDOUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDeEMsSUFBSSxRQUFRLEtBQUssWUFBWTtRQUMzQixXQUFXLEdBQUcsV0FBVyxHQUFHLE1BQU0sQ0FBQztJQUNyQyxLQUFLLElBQUksSUFBSSxHQUFHLFdBQVcsRUFBRSxHQUFHLEtBQUssSUFBSSxFQUFFLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ25FLEdBQUcsR0FBRyxJQUFJLENBQUM7UUFDWCxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxHQUFHLGNBQWMsQ0FBQztZQUNyQyxNQUFNO0tBQ1Q7SUFDRCxNQUFNLE1BQU0sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUNoRCxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN6QixNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUVyRCw0REFBNEQ7SUFDNUQsOEZBQThGO0lBQzlGLE9BQU8sSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDM0MsTUFBTSxTQUFTLEdBQUcsZ0JBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNwRCxNQUFNLE1BQU0sR0FBRyxjQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsWUFBWSxHQUFHLGdCQUFnQjtZQUN0RCxJQUFJLFdBQVcsZUFBZTtZQUM5QixJQUFJLFdBQVcsWUFBWTtZQUMzQixJQUFJLFdBQVcsSUFBSSxTQUFTLE9BQU87WUFDbkMsSUFBSSxZQUFZLFlBQVk7WUFDNUIsSUFBSSxXQUFXLElBQUksZ0JBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxRQUFRLENBQUMsT0FBTztZQUMvRCxJQUFJLFlBQVksb0JBQW9CLENBQUMsRUFBRSxFQUFDLElBQUksRUFBRSxXQUFXLEVBQUMsQ0FBQzthQUM1RCxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQzthQUMzRixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUNsQixzQkFBc0IsRUFBRSxJQUFJO1lBQzVCLGFBQWEsRUFBRSxJQUFJO1NBQ3BCLENBQUMsQ0FBQzthQUNGLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFVLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNoQixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ3BDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXBDRCxxQ0FvQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBndWxwIGZyb20gJ2d1bHAnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5jb25zdCB0c2xpbnQgPSByZXF1aXJlKCdndWxwLXRzbGludCcpO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay50c2xpbnQtd29ya2VyJyk7XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdHNMaW50UGFja2FnZUFzeW5jKGZ1bGxOYW1lOiBzdHJpbmcsIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZywgZml4OiBib29sZWFuKSB7XG4gIGxldCBkaXI7XG4gIC8vIHBhY2thZ2VQYXRoID0gZnMucmVhbHBhdGhTeW5jKHBhY2thZ2VQYXRoKTtcbiAgbG9nLmluZm8oJ1RTbGludCBTY2FuJywgcGFja2FnZVBhdGgpO1xuICBjb25zb2xlLmxvZygnVFNsaW50IFNjYW4nLCBwYWNrYWdlUGF0aCk7XG4gIGlmIChmdWxsTmFtZSA9PT0gJ0B3ZmgvcGxpbmsnKVxuICAgIHBhY2thZ2VQYXRoID0gcGFja2FnZVBhdGggKyAnL3dmaCc7XG4gIGZvciAobGV0IHBEaXIgPSBwYWNrYWdlUGF0aDsgZGlyICE9PSBwRGlyOyBwRGlyID0gUGF0aC5kaXJuYW1lKGRpcikpIHtcbiAgICBkaXIgPSBwRGlyO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGRpciArICcvdHNsaW50Lmpzb24nKSlcbiAgICAgIGJyZWFrO1xuICB9XG4gIGNvbnN0IHJjZmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICd0c2xpbnQuanNvbicpO1xuICBsb2cuZGVidWcoJ1VzZScsIHJjZmlsZSk7XG4gIGNvbnN0IHBhY2thZ2VQYXRoMCA9IHBhY2thZ2VQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuICAvLyBUT0RPOiB1c2UgcmVxdWlyZSgnLi4vLi4vZGlzdC91dGlscycpLmdldFRzRGlyc09mUGFja2FnZTtcbiAgLy8gVW5saWtlIEVTbGludCwgVFNMaW50IGZpeCBkb2VzIG5vdCB3cml0ZSBmaWxlIHRvIHN0cmVhbSwgYnV0IHVzZSBmcy53cml0ZUZpbGVTeW5jKCkgaW5zdGVhZFxuICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IHRzRGVzdERpciA9IF8uZ2V0KGpzb24sICdkci50cy5kZXN0JywgJ2Rpc3QnKTtcbiAgICBjb25zdCBzdHJlYW0gPSBndWxwLnNyYyhbcGFja2FnZVBhdGgwICsgJy8qKi8qLnt0cyx0c3h9JyxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aH0vKiovKi5zcGVjLnRzYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aH0vKiovKi5kLnRzYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aH0vJHt0c0Rlc3REaXJ9LyoqLypgLFxuICAgICAgYCEke3BhY2thZ2VQYXRoMH0vc3BlYy8qKi8qYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aH0vJHtfLmdldChqc29uLCAnZHIuYXNzZXRzRGlyJywgJ2Fzc2V0cycpfS8qKi8qYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aDB9L25vZGVfbW9kdWxlcy8qKi8qYF0sIHtiYXNlOiBwYWNrYWdlUGF0aH0pXG4gICAgLnBpcGUodHNsaW50KHt0c2xpbnQ6IHJlcXVpcmUoJ3RzbGludCcpLCBmb3JtYXR0ZXI6ICd2ZXJib3NlJywgY29uZmlndXJhdGlvbjogcmNmaWxlLCBmaXh9KSlcbiAgICAucGlwZSh0c2xpbnQucmVwb3J0KHtcbiAgICAgIHN1bW1hcml6ZUZhaWx1cmVPdXRwdXQ6IHRydWUsXG4gICAgICBhbGxvd1dhcm5pbmdzOiB0cnVlXG4gICAgfSkpXG4gICAgLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiByZWplY3QoZXJyKSk7XG4gICAgc3RyZWFtLnJlc3VtZSgpO1xuICAgIHN0cmVhbS5vbignZW5kJywgKCkgPT4gcmVzb2x2ZSgpKTtcbiAgfSk7XG59XG4iXX0=