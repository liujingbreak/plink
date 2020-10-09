"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
// import chalk from 'chalk';
const fs_extra_1 = __importDefault(require("fs-extra"));
const config_1 = __importDefault(require("../config"));
const log_config_1 = __importDefault(require("../log-config"));
const log4js_1 = __importDefault(require("log4js"));
const gulp_1 = __importDefault(require("gulp"));
const lodash_1 = __importDefault(require("lodash"));
const package_mgr_1 = require("../package-mgr");
const utils_1 = require("./utils");
const tslint = require('gulp-tslint');
const log = log4js_1.default.getLogger('wfh.lint');
function default_1(packages, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opts);
        log_config_1.default(config_1.default());
        return lint(packages, opts.pj, opts.fix);
    });
}
exports.default = default_1;
function lint(packages, projects, fix) {
    var prom = Promise.resolve();
    const errors = [];
    if (packages.length > 0) {
        for (const name of utils_1.completePackageName(package_mgr_1.getState(), packages)) {
            if (name == null) {
                log.warn('Can not find package for name: ' + name);
                continue;
            }
            const pkg = package_mgr_1.getState().srcPackages.get(name);
            prom = prom.catch(err => errors.push(err))
                .then(() => {
                return _tsLintPackageAsync(pkg.name, pkg.json, pkg.realPath, fix);
            });
        }
    }
    else if (packages.length === 0 && (projects == null || projects.length === 0)) {
        for (const pkg of Object.values(package_mgr_1.getState().srcPackages)) {
            prom = prom.catch(err => errors.push(err))
                .then(() => _tsLintPackageAsync(pkg.name, pkg.json, pkg.realPath, fix));
        }
    }
    else if (projects && projects.length > 0) {
        for (const pkg of package_mgr_1.getPackagesOfProjects(projects)) {
            prom = prom.catch(err => errors.push(err))
                .then(() => _tsLintPackageAsync(pkg.name, pkg.json, pkg.realPath, fix));
        }
    }
    return prom.catch(err => errors.push(err))
        .then(() => {
        if (errors.length > 0) {
            errors.forEach(error => log.error(error));
            throw new Error('Lint result contains errors');
        }
    });
}
function _tsLintPackageAsync(fullName, json, packagePath, fix) {
    let dir;
    // packagePath = fs.realpathSync(packagePath);
    log.info('TSlint Scan', packagePath);
    if (fullName === '@wfh/plink')
        packagePath = packagePath + '/wfh';
    for (let pDir = packagePath; dir !== pDir; pDir = path_1.default.dirname(dir)) {
        dir = pDir;
        if (fs_extra_1.default.existsSync(dir + '/tslint.json'))
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
            // .pipe(through.obj(function(file, en, next) {
            // 	log.info(Path.relative(packagePath, file.path));
            // 	next(null, file);
            // }))
            .on('error', (err) => reject(err));
        // else
        stream.resume();
        stream.on('end', () => resolve());
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWxpbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNkJBQTZCO0FBQzdCLHdEQUEwQjtBQUMxQix1REFBK0I7QUFDL0IsK0RBQXNDO0FBQ3RDLG9EQUE0QjtBQUU1QixnREFBd0I7QUFDeEIsb0RBQXVCO0FBQ3ZCLGdEQUErRDtBQUMvRCxtQ0FBNEM7QUFFNUMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3RDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBRXpDLG1CQUE4QixRQUFrQixFQUFFLElBQWlCOztRQUNqRSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hCLG9CQUFTLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7UUFDcEIsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzNDLENBQUM7Q0FBQTtBQUpELDRCQUlDO0FBR0QsU0FBUyxJQUFJLENBQUMsUUFBa0IsRUFBRSxRQUEyQixFQUFFLEdBQXVCO0lBQ3BGLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM3QixNQUFNLE1BQU0sR0FBVSxFQUFFLENBQUM7SUFDekIsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUV2QixLQUFLLE1BQU0sSUFBSSxJQUFJLDJCQUFtQixDQUFDLHNCQUFRLEVBQUUsRUFBRSxRQUFRLENBQUMsRUFBRTtZQUM1RCxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7Z0JBQ2hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUNBQWlDLEdBQUcsSUFBSSxDQUFDLENBQUM7Z0JB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QUMsT0FBTyxFQUFFLENBQUMsR0FBVSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMxQyxPQUFPO1FBQ1AsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDcEMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge0xpbnRPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCBndWxwIGZyb20gJ2d1bHAnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Z2V0U3RhdGUsIGdldFBhY2thZ2VzT2ZQcm9qZWN0c30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtjb21wbGV0ZVBhY2thZ2VOYW1lfSBmcm9tICcuL3V0aWxzJztcblxuY29uc3QgdHNsaW50ID0gcmVxdWlyZSgnZ3VscC10c2xpbnQnKTtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3dmaC5saW50Jyk7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKHBhY2thZ2VzOiBzdHJpbmdbXSwgb3B0czogTGludE9wdGlvbnMpIHtcbiAgYXdhaXQgY29uZmlnLmluaXQob3B0cyk7XG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gIHJldHVybiBsaW50KHBhY2thZ2VzLCBvcHRzLnBqLCBvcHRzLmZpeCk7XG59XG5cblxuZnVuY3Rpb24gbGludChwYWNrYWdlczogc3RyaW5nW10sIHByb2plY3RzOiBMaW50T3B0aW9uc1sncGonXSwgZml4OiBMaW50T3B0aW9uc1snZml4J10pIHtcbiAgdmFyIHByb20gPSBQcm9taXNlLnJlc29sdmUoKTtcbiAgY29uc3QgZXJyb3JzOiBhbnlbXSA9IFtdO1xuICBpZiAocGFja2FnZXMubGVuZ3RoID4gMCkge1xuXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGNvbXBsZXRlUGFja2FnZU5hbWUoZ2V0U3RhdGUoKSwgcGFja2FnZXMpKSB7XG4gICAgICBpZiAobmFtZSA9PSBudWxsKSB7XG4gICAgICAgIGxvZy53YXJuKCdDYW4gbm90IGZpbmQgcGFja2FnZSBmb3IgbmFtZTogJyArIG5hbWUpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBrZyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KG5hbWUpITtcbiAgICAgIHByb20gPSBwcm9tLmNhdGNoKGVyciA9PiBlcnJvcnMucHVzaChlcnIpKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICByZXR1cm4gX3RzTGludFBhY2thZ2VBc3luYyhwa2cubmFtZSwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCwgZml4KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSBlbHNlIGlmIChwYWNrYWdlcy5sZW5ndGggPT09IDAgJiYgKHByb2plY3RzID09IG51bGwgfHwgcHJvamVjdHMubGVuZ3RoID09PSAwKSkge1xuICAgIGZvciAoY29uc3QgcGtnIG9mIE9iamVjdC52YWx1ZXMoZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcykpIHtcbiAgICAgIHByb20gPSBwcm9tLmNhdGNoKGVyciA9PiBlcnJvcnMucHVzaChlcnIpKVxuICAgICAgLnRoZW4oKCkgPT4gX3RzTGludFBhY2thZ2VBc3luYyhwa2cubmFtZSwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCwgZml4KSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHByb2plY3RzICYmIHByb2plY3RzLmxlbmd0aCA+IDApIHtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBnZXRQYWNrYWdlc09mUHJvamVjdHMocHJvamVjdHMpKSB7XG4gICAgICBwcm9tID0gcHJvbS5jYXRjaChlcnIgPT4gZXJyb3JzLnB1c2goZXJyKSlcbiAgICAgIC50aGVuKCgpID0+IF90c0xpbnRQYWNrYWdlQXN5bmMocGtnLm5hbWUsIHBrZy5qc29uLCBwa2cucmVhbFBhdGgsIGZpeCkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcHJvbS5jYXRjaChlcnIgPT4gZXJyb3JzLnB1c2goZXJyKSlcbiAgLnRoZW4oKCkgPT4ge1xuICAgIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgZXJyb3JzLmZvckVhY2goZXJyb3IgPT4gbG9nLmVycm9yKGVycm9yKSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xpbnQgcmVzdWx0IGNvbnRhaW5zIGVycm9ycycpO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIF90c0xpbnRQYWNrYWdlQXN5bmMoZnVsbE5hbWU6IHN0cmluZywganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nLCBmaXg6IGJvb2xlYW4pIHtcbiAgbGV0IGRpcjtcbiAgLy8gcGFja2FnZVBhdGggPSBmcy5yZWFscGF0aFN5bmMocGFja2FnZVBhdGgpO1xuICBsb2cuaW5mbygnVFNsaW50IFNjYW4nLCBwYWNrYWdlUGF0aCk7XG4gIGlmIChmdWxsTmFtZSA9PT0gJ0B3ZmgvcGxpbmsnKVxuICAgIHBhY2thZ2VQYXRoID0gcGFja2FnZVBhdGggKyAnL3dmaCc7XG4gIGZvciAobGV0IHBEaXIgPSBwYWNrYWdlUGF0aDsgZGlyICE9PSBwRGlyOyBwRGlyID0gUGF0aC5kaXJuYW1lKGRpcikpIHtcbiAgICBkaXIgPSBwRGlyO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGRpciArICcvdHNsaW50Lmpzb24nKSlcbiAgICAgIGJyZWFrO1xuICB9XG4gIGNvbnN0IHJjZmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICd0c2xpbnQuanNvbicpO1xuICBsb2cuZGVidWcoJ1VzZScsIHJjZmlsZSk7XG4gIGNvbnN0IHBhY2thZ2VQYXRoMCA9IHBhY2thZ2VQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuICAvLyBUT0RPOiB1c2UgcmVxdWlyZSgnLi4vLi4vZGlzdC91dGlscycpLmdldFRzRGlyc09mUGFja2FnZTtcbiAgLy8gVW5saWtlIEVTbGludCwgVFNMaW50IGZpeCBkb2VzIG5vdCB3cml0ZSBmaWxlIHRvIHN0cmVhbSwgYnV0IHVzZSBmcy53cml0ZUZpbGVTeW5jKCkgaW5zdGVhZFxuICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IHRzRGVzdERpciA9IF8uZ2V0KGpzb24sICdkci50cy5kZXN0JywgJ2Rpc3QnKTtcbiAgICBjb25zdCBzdHJlYW0gPSBndWxwLnNyYyhbcGFja2FnZVBhdGgwICsgJy8qKi8qLnt0cyx0c3h9JyxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aH0vKiovKi5zcGVjLnRzYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aH0vKiovKi5kLnRzYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aH0vJHt0c0Rlc3REaXJ9LyoqLypgLFxuICAgICAgYCEke3BhY2thZ2VQYXRoMH0vc3BlYy8qKi8qYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aH0vJHtfLmdldChqc29uLCAnZHIuYXNzZXRzRGlyJywgJ2Fzc2V0cycpfS8qKi8qYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aDB9L25vZGVfbW9kdWxlcy8qKi8qYF0sIHtiYXNlOiBwYWNrYWdlUGF0aH0pXG4gICAgLnBpcGUodHNsaW50KHt0c2xpbnQ6IHJlcXVpcmUoJ3RzbGludCcpLCBmb3JtYXR0ZXI6ICd2ZXJib3NlJywgY29uZmlndXJhdGlvbjogcmNmaWxlLCBmaXh9KSlcbiAgICAucGlwZSh0c2xpbnQucmVwb3J0KHtcbiAgICAgIHN1bW1hcml6ZUZhaWx1cmVPdXRwdXQ6IHRydWUsXG4gICAgICBhbGxvd1dhcm5pbmdzOiB0cnVlXG4gICAgfSkpXG4gICAgLy8gLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZSwgZW4sIG5leHQpIHtcbiAgICAvLyBcdGxvZy5pbmZvKFBhdGgucmVsYXRpdmUocGFja2FnZVBhdGgsIGZpbGUucGF0aCkpO1xuICAgIC8vIFx0bmV4dChudWxsLCBmaWxlKTtcbiAgICAvLyB9KSlcbiAgICAub24oJ2Vycm9yJywgKGVycjogRXJyb3IpID0+IHJlamVjdChlcnIpKTtcbiAgICAvLyBlbHNlXG4gICAgc3RyZWFtLnJlc3VtZSgpO1xuICAgIHN0cmVhbS5vbignZW5kJywgKCkgPT4gcmVzb2x2ZSgpKTtcbiAgfSk7XG59XG4iXX0=