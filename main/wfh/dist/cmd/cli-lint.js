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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWxpbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNkJBQTZCO0FBQzdCLHdEQUEwQjtBQUMxQix1REFBK0I7QUFDL0IsK0RBQXNDO0FBQ3RDLG9EQUE0QjtBQUU1QixnREFBd0I7QUFDeEIsb0RBQXVCO0FBQ3ZCLGdEQUErRDtBQUMvRCxtQ0FBNEM7QUFFNUMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3RDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBRXpDLG1CQUE4QixRQUFrQixFQUFFLElBQWlCOztRQUNqRSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hCLG9CQUFTLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7UUFDcEIsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzNDLENBQUM7Q0FBQTtBQUpELDRCQUlDO0FBR0QsU0FBUyxJQUFJLENBQUMsUUFBa0IsRUFBRSxRQUEyQixFQUFFLEdBQXVCO0lBQ3BGLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM3QixNQUFNLE1BQU0sR0FBVSxFQUFFLENBQUM7SUFDekIsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUV2QixLQUFLLE1BQU0sSUFBSSxJQUFJLDJCQUFtQixDQUFDLHNCQUFRLEVBQUUsRUFBRSxRQUFRLENBQUMsRUFBRTtZQUM1RCxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7Z0JBQ2hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUNBQWlDLEdBQUcsSUFBSSxDQUFDLENBQUM7Z0JB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Q0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFVLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE9BQU87UUFDUCxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUNwQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7TGludE9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IGd1bHAgZnJvbSAnZ3VscCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgZ2V0UGFja2FnZXNPZlByb2plY3RzfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge2NvbXBsZXRlUGFja2FnZU5hbWV9IGZyb20gJy4vdXRpbHMnO1xuXG5jb25zdCB0c2xpbnQgPSByZXF1aXJlKCdndWxwLXRzbGludCcpO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignd2ZoLmxpbnQnKTtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24ocGFja2FnZXM6IHN0cmluZ1tdLCBvcHRzOiBMaW50T3B0aW9ucykge1xuICBhd2FpdCBjb25maWcuaW5pdChvcHRzKTtcbiAgbG9nQ29uZmlnKGNvbmZpZygpKTtcbiAgcmV0dXJuIGxpbnQocGFja2FnZXMsIG9wdHMucGosIG9wdHMuZml4KTtcbn1cblxuXG5mdW5jdGlvbiBsaW50KHBhY2thZ2VzOiBzdHJpbmdbXSwgcHJvamVjdHM6IExpbnRPcHRpb25zWydwaiddLCBmaXg6IExpbnRPcHRpb25zWydmaXgnXSkge1xuICB2YXIgcHJvbSA9IFByb21pc2UucmVzb2x2ZSgpO1xuICBjb25zdCBlcnJvcnM6IGFueVtdID0gW107XG4gIGlmIChwYWNrYWdlcy5sZW5ndGggPiAwKSB7XG5cbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgY29tcGxldGVQYWNrYWdlTmFtZShnZXRTdGF0ZSgpLCBwYWNrYWdlcykpIHtcbiAgICAgIGlmIChuYW1lID09IG51bGwpIHtcbiAgICAgICAgbG9nLndhcm4oJ0NhbiBub3QgZmluZCBwYWNrYWdlIGZvciBuYW1lOiAnICsgbmFtZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgcGtnID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQobmFtZSkhO1xuICAgICAgcHJvbSA9IHByb20uY2F0Y2goZXJyID0+IGVycm9ycy5wdXNoKGVycikpXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIHJldHVybiBfdHNMaW50UGFja2FnZUFzeW5jKHBrZy5uYW1lLCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoLCBmaXgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHBhY2thZ2VzLmxlbmd0aCA9PT0gMCAmJiAocHJvamVjdHMgPT0gbnVsbCB8fCBwcm9qZWN0cy5sZW5ndGggPT09IDApKSB7XG4gICAgZm9yIChjb25zdCBwa2cgb2YgT2JqZWN0LnZhbHVlcyhnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzKSkge1xuICAgICAgcHJvbSA9IHByb20uY2F0Y2goZXJyID0+IGVycm9ycy5wdXNoKGVycikpXG4gICAgICAudGhlbigoKSA9PiBfdHNMaW50UGFja2FnZUFzeW5jKHBrZy5uYW1lLCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoLCBmaXgpKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAocHJvamVjdHMgJiYgcHJvamVjdHMubGVuZ3RoID4gMCkge1xuICAgIGZvciAoY29uc3QgcGtnIG9mIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0cykpIHtcbiAgICAgIHByb20gPSBwcm9tLmNhdGNoKGVyciA9PiBlcnJvcnMucHVzaChlcnIpKVxuICAgICAgLnRoZW4oKCkgPT4gX3RzTGludFBhY2thZ2VBc3luYyhwa2cubmFtZSwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCwgZml4KSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBwcm9tLmNhdGNoKGVyciA9PiBlcnJvcnMucHVzaChlcnIpKVxuICAudGhlbigoKSA9PiB7XG4gICAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICBlcnJvcnMuZm9yRWFjaChlcnJvciA9PiBsb2cuZXJyb3IoZXJyb3IpKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTGludCByZXN1bHQgY29udGFpbnMgZXJyb3JzJyk7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gX3RzTGludFBhY2thZ2VBc3luYyhmdWxsTmFtZTogc3RyaW5nLCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcsIGZpeDogYm9vbGVhbikge1xuICBsZXQgZGlyO1xuICAvLyBwYWNrYWdlUGF0aCA9IGZzLnJlYWxwYXRoU3luYyhwYWNrYWdlUGF0aCk7XG4gIGxvZy5pbmZvKCdUU2xpbnQgU2NhbicsIHBhY2thZ2VQYXRoKTtcbiAgaWYgKGZ1bGxOYW1lID09PSAnZHItY29tcC1wYWNrYWdlJylcbiAgICBwYWNrYWdlUGF0aCA9IHBhY2thZ2VQYXRoICsgJy93ZmgnO1xuICBmb3IgKGxldCBwRGlyID0gcGFja2FnZVBhdGg7IGRpciAhPT0gcERpcjsgcERpciA9IFBhdGguZGlybmFtZShkaXIpKSB7XG4gICAgZGlyID0gcERpcjtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhkaXIgKyAnL3RzbGludC5qc29uJykpXG4gICAgICBicmVhaztcbiAgfVxuICBjb25zdCByY2ZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAndHNsaW50Lmpzb24nKTtcbiAgbG9nLmRlYnVnKCdVc2UnLCByY2ZpbGUpO1xuICBjb25zdCBwYWNrYWdlUGF0aDAgPSBwYWNrYWdlUGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgLy8gVE9ETzogdXNlIHJlcXVpcmUoJy4uLy4uL2Rpc3QvdXRpbHMnKS5nZXRUc0RpcnNPZlBhY2thZ2U7XG4gIC8vIFVubGlrZSBFU2xpbnQsIFRTTGludCBmaXggZG9lcyBub3Qgd3JpdGUgZmlsZSB0byBzdHJlYW0sIGJ1dCB1c2UgZnMud3JpdGVGaWxlU3luYygpIGluc3RlYWRcbiAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCB0c0Rlc3REaXIgPSBfLmdldChqc29uLCAnZHIudHMuZGVzdCcsICdkaXN0Jyk7XG4gICAgY29uc3Qgc3RyZWFtID0gZ3VscC5zcmMoW3BhY2thZ2VQYXRoMCArICcvKiovKi57dHMsdHN4fScsXG4gICAgICBgISR7cGFja2FnZVBhdGh9LyoqLyouc3BlYy50c2AsXG4gICAgICBgISR7cGFja2FnZVBhdGh9LyoqLyouZC50c2AsXG4gICAgICBgISR7cGFja2FnZVBhdGh9LyR7dHNEZXN0RGlyfS8qKi8qYCxcbiAgICAgIGAhJHtwYWNrYWdlUGF0aDB9L3NwZWMvKiovKmAsXG4gICAgICBgISR7cGFja2FnZVBhdGh9LyR7Xy5nZXQoanNvbiwgJ2RyLmFzc2V0c0RpcicsICdhc3NldHMnKX0vKiovKmAsXG4gICAgICBgISR7cGFja2FnZVBhdGgwfS9ub2RlX21vZHVsZXMvKiovKmBdLCB7YmFzZTogcGFja2FnZVBhdGh9KVxuICAgIC5waXBlKHRzbGludCh7dHNsaW50OiByZXF1aXJlKCd0c2xpbnQnKSwgZm9ybWF0dGVyOiAndmVyYm9zZScsIGNvbmZpZ3VyYXRpb246IHJjZmlsZSwgZml4fSkpXG4gICAgLnBpcGUodHNsaW50LnJlcG9ydCh7XG4gICAgICBzdW1tYXJpemVGYWlsdXJlT3V0cHV0OiB0cnVlLFxuICAgICAgYWxsb3dXYXJuaW5nczogdHJ1ZVxuICAgIH0pKVxuICAgIC8vIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGUsIGVuLCBuZXh0KSB7XG4gICAgLy8gXHRsb2cuaW5mbyhQYXRoLnJlbGF0aXZlKHBhY2thZ2VQYXRoLCBmaWxlLnBhdGgpKTtcbiAgICAvLyBcdG5leHQobnVsbCwgZmlsZSk7XG4gICAgLy8gfSkpXG4gICAgLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiByZWplY3QoZXJyKSk7XG4gICAgLy8gZWxzZVxuICAgIHN0cmVhbS5yZXN1bWUoKTtcbiAgICBzdHJlYW0ub24oJ2VuZCcsICgpID0+IHJlc29sdmUoKSk7XG4gIH0pO1xufVxuIl19