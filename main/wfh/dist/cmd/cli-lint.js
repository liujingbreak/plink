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
            const pkg = package_mgr_1.getState().srcPackages[name];
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
        const pkgs = package_mgr_1.getPackagesOfProjects(projects);
        for (const pkg of pkgs) {
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
    log.info('TSlint Scan', path_1.default.relative(config_1.default().rootPath, packagePath));
    if (fullName === 'dr-comp-package')
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWxpbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNkJBQTZCO0FBQzdCLHdEQUEwQjtBQUMxQix1REFBK0I7QUFDL0IsK0RBQXNDO0FBQ3RDLG9EQUE0QjtBQUU1QixnREFBd0I7QUFDeEIsb0RBQXVCO0FBQ3ZCLGdEQUErRDtBQUMvRCxtQ0FBNEM7QUFFNUMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3RDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBRXpDLG1CQUE4QixRQUFrQixFQUFFLElBQWlCOztRQUNqRSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hCLG9CQUFTLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7UUFDcEIsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzNDLENBQUM7Q0FBQTtBQUpELDRCQUlDO0FBR0QsU0FBUyxJQUFJLENBQUMsUUFBa0IsRUFBRSxRQUEyQixFQUFFLEdBQXVCO0lBQ3BGLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM3QixNQUFNLE1BQU0sR0FBVSxFQUFFLENBQUM7SUFDekIsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUV2QixLQUFLLE1BQU0sSUFBSSxJQUFJLDJCQUFtQixDQUFDLHNCQUFRLEVBQUUsRUFBRSxRQUFRLENBQUMsRUFBRTtZQUM1RCxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7Z0JBQ2hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUNBQWlDLEdBQUcsSUFBSSxDQUFDLENBQUM7Z0JB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cEIsQ0FBQyxDQUFDO1lBQ0gsK0NBQStDO1lBQy9DLG9EQUFvRDtZQUNwRCxxQkFBcUI7WUFDckIsTUFBTTthQUNMLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFVLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE9BQU87UUFDUCxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUNwQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7TGludE9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IGd1bHAgZnJvbSAnZ3VscCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgZ2V0UGFja2FnZXNPZlByb2plY3RzfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge2NvbXBsZXRlUGFja2FnZU5hbWV9IGZyb20gJy4vdXRpbHMnO1xuXG5jb25zdCB0c2xpbnQgPSByZXF1aXJlKCdndWxwLXRzbGludCcpO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignd2ZoLmxpbnQnKTtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24ocGFja2FnZXM6IHN0cmluZ1tdLCBvcHRzOiBMaW50T3B0aW9ucykge1xuICBhd2FpdCBjb25maWcuaW5pdChvcHRzKTtcbiAgbG9nQ29uZmlnKGNvbmZpZygpKTtcbiAgcmV0dXJuIGxpbnQocGFja2FnZXMsIG9wdHMucGosIG9wdHMuZml4KTtcbn1cblxuXG5mdW5jdGlvbiBsaW50KHBhY2thZ2VzOiBzdHJpbmdbXSwgcHJvamVjdHM6IExpbnRPcHRpb25zWydwaiddLCBmaXg6IExpbnRPcHRpb25zWydmaXgnXSkge1xuICB2YXIgcHJvbSA9IFByb21pc2UucmVzb2x2ZSgpO1xuICBjb25zdCBlcnJvcnM6IGFueVtdID0gW107XG4gIGlmIChwYWNrYWdlcy5sZW5ndGggPiAwKSB7XG5cbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgY29tcGxldGVQYWNrYWdlTmFtZShnZXRTdGF0ZSgpLCBwYWNrYWdlcykpIHtcbiAgICAgIGlmIChuYW1lID09IG51bGwpIHtcbiAgICAgICAgbG9nLndhcm4oJ0NhbiBub3QgZmluZCBwYWNrYWdlIGZvciBuYW1lOiAnICsgbmFtZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgcGtnID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlc1tuYW1lXTtcbiAgICAgIHByb20gPSBwcm9tLmNhdGNoKGVyciA9PiBlcnJvcnMucHVzaChlcnIpKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICByZXR1cm4gX3RzTGludFBhY2thZ2VBc3luYyhwa2cubmFtZSwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCwgZml4KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSBlbHNlIGlmIChwYWNrYWdlcy5sZW5ndGggPT09IDAgJiYgKHByb2plY3RzID09IG51bGwgfHwgcHJvamVjdHMubGVuZ3RoID09PSAwKSkge1xuICAgIGZvciAoY29uc3QgcGtnIG9mIE9iamVjdC52YWx1ZXMoZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcykpIHtcbiAgICAgIHByb20gPSBwcm9tLmNhdGNoKGVyciA9PiBlcnJvcnMucHVzaChlcnIpKVxuICAgICAgLnRoZW4oKCkgPT4gX3RzTGludFBhY2thZ2VBc3luYyhwa2cubmFtZSwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCwgZml4KSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHByb2plY3RzICYmIHByb2plY3RzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBwa2dzID0gZ2V0UGFja2FnZXNPZlByb2plY3RzKHByb2plY3RzKTtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBwa2dzKSB7XG4gICAgICBwcm9tID0gcHJvbS5jYXRjaChlcnIgPT4gZXJyb3JzLnB1c2goZXJyKSlcbiAgICAgIC50aGVuKCgpID0+IF90c0xpbnRQYWNrYWdlQXN5bmMocGtnLm5hbWUsIHBrZy5qc29uLCBwa2cucmVhbFBhdGgsIGZpeCkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcHJvbS5jYXRjaChlcnIgPT4gZXJyb3JzLnB1c2goZXJyKSlcbiAgLnRoZW4oKCkgPT4ge1xuICAgIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgZXJyb3JzLmZvckVhY2goZXJyb3IgPT4gbG9nLmVycm9yKGVycm9yKSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xpbnQgcmVzdWx0IGNvbnRhaW5zIGVycm9ycycpO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIF90c0xpbnRQYWNrYWdlQXN5bmMoZnVsbE5hbWU6IHN0cmluZywganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nLCBmaXg6IGJvb2xlYW4pIHtcbiAgbGV0IGRpcjtcbiAgLy8gcGFja2FnZVBhdGggPSBmcy5yZWFscGF0aFN5bmMocGFja2FnZVBhdGgpO1xuICBsb2cuaW5mbygnVFNsaW50IFNjYW4nLCBQYXRoLnJlbGF0aXZlKGNvbmZpZygpLnJvb3RQYXRoLCBwYWNrYWdlUGF0aCkpO1xuICBpZiAoZnVsbE5hbWUgPT09ICdkci1jb21wLXBhY2thZ2UnKVxuICAgIHBhY2thZ2VQYXRoID0gcGFja2FnZVBhdGggKyAnL3dmaCc7XG4gIGZvciAobGV0IHBEaXIgPSBwYWNrYWdlUGF0aDsgZGlyICE9PSBwRGlyOyBwRGlyID0gUGF0aC5kaXJuYW1lKGRpcikpIHtcbiAgICBkaXIgPSBwRGlyO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGRpciArICcvdHNsaW50Lmpzb24nKSlcbiAgICAgIGJyZWFrO1xuICB9XG4gIGNvbnN0IHJjZmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICd0c2xpbnQuanNvbicpO1xuICBsb2cuZGVidWcoJ1VzZScsIHJjZmlsZSk7XG4gIGNvbnN0IHBhY2thZ2VQYXRoMCA9IHBhY2thZ2VQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuICAvLyBUT0RPOiB1c2UgcmVxdWlyZSgnLi4vLi4vZGlzdC91dGlscycpLmdldFRzRGlyc09mUGFja2FnZTtcbiAgLy8gVW5saWtlIEVTbGludCwgVFNMaW50IGZpeCBkb2VzIG5vdCB3cml0ZSBmaWxlIHRvIHN0cmVhbSwgYnV0IHVzZSBmcy53cml0ZUZpbGVTeW5jKCkgaW5zdGVhZFxuICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IHRzRGVzdERpciA9IF8uZ2V0KGpzb24sICdkci50cy5kZXN0JywgJ2Rpc3QnKTtcbiAgICBjb25zdCBzdHJlYW0gPSBndWxwLnNyYyhbcGFja2FnZVBhdGgwICsgJy8qKi8qLnt0cyx0c3h9JyxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aH0vKiovKi5zcGVjLnRzYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aH0vKiovKi5kLnRzYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aH0vJHt0c0Rlc3REaXJ9LyoqLypgLFxuICAgICAgYCEke3BhY2thZ2VQYXRoMH0vc3BlYy8qKi8qYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aH0vJHtfLmdldChqc29uLCAnZHIuYXNzZXRzRGlyJywgJ2Fzc2V0cycpfS8qKi8qYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aDB9L25vZGVfbW9kdWxlcy8qKi8qYF0sIHtiYXNlOiBwYWNrYWdlUGF0aH0pXG4gICAgLnBpcGUodHNsaW50KHt0c2xpbnQ6IHJlcXVpcmUoJ3RzbGludCcpLCBmb3JtYXR0ZXI6ICd2ZXJib3NlJywgY29uZmlndXJhdGlvbjogcmNmaWxlLCBmaXh9KSlcbiAgICAucGlwZSh0c2xpbnQucmVwb3J0KHtcbiAgICAgIHN1bW1hcml6ZUZhaWx1cmVPdXRwdXQ6IHRydWUsXG4gICAgICBhbGxvd1dhcm5pbmdzOiB0cnVlXG4gICAgfSkpXG4gICAgLy8gLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZSwgZW4sIG5leHQpIHtcbiAgICAvLyBcdGxvZy5pbmZvKFBhdGgucmVsYXRpdmUocGFja2FnZVBhdGgsIGZpbGUucGF0aCkpO1xuICAgIC8vIFx0bmV4dChudWxsLCBmaWxlKTtcbiAgICAvLyB9KSlcbiAgICAub24oJ2Vycm9yJywgKGVycjogRXJyb3IpID0+IHJlamVjdChlcnIpKTtcbiAgICAvLyBlbHNlXG4gICAgc3RyZWFtLnJlc3VtZSgpO1xuICAgIHN0cmVhbS5vbignZW5kJywgKCkgPT4gcmVzb2x2ZSgpKTtcbiAgfSk7XG59XG4iXX0=