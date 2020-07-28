"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const packageUtils = __importStar(require("../package-utils"));
require("../package-mgr");
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
    // var eslint = require('gulp-eslint');
    // let program = tslint.Linter.createPrograme('');
    var prom = Promise.resolve();
    const errors = [];
    // const getPackDirs = require('../../dist/utils').getTsDirsOfPackage;
    if (packages && packages.length > 0) {
        packageUtils.lookForPackages(packages, (fullName, entryPath, parsedName, json, packagePath) => {
            if (json.dr && json.dr.noLint === true) {
                log.info('skip ' + fullName);
                return;
            }
            packagePath = fs_extra_1.default.realpathSync(packagePath);
            prom = prom.catch(err => errors.push(err))
                // .then(() => {
                // 	log.info('Checking ', packagePath);
                // 	return _lintPackageAsync(eslint, fullName, json, packagePath, getPackDirs(json), argv.fix);
                // })
                // .catch(err => errors.push(err))
                .then(() => {
                return _tsLintPackageAsync(fullName, json, packagePath, fix);
            });
        });
    }
    else {
        packageUtils.findAllPackages((fullName, entryPath, parsedName, json, packagePath) => {
            if (json.dr && json.dr.noLint === true) {
                log.info('skip ' + fullName);
                return;
            }
            packagePath = fs_extra_1.default.realpathSync(packagePath);
            prom = prom.catch(err => errors.push(err))
                // .then(() => {
                // 	log.info('Checking ', packagePath);
                // 	return _lintPackageAsync(eslint, fullName, json, packagePath, getPackDirs(json), argv.fix);
                // })
                // .catch(err => errors.push(err))
                .then(() => {
                return _tsLintPackageAsync(fullName, json, packagePath, fix);
            });
        }, 'src', projects);
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
    log.debug('TSlint Scan', packagePath);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWxpbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLDZCQUE2QjtBQUM3Qix3REFBMEI7QUFDMUIsdURBQStCO0FBQy9CLCtEQUFzQztBQUN0QyxvREFBNEI7QUFFNUIsZ0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUN2QiwrREFBaUQ7QUFDakQsMEJBQXdCO0FBRXhCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUN0QyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUV6QyxtQkFBOEIsUUFBa0IsRUFBRSxJQUFpQjs7UUFDakUsTUFBTSxnQkFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QixvQkFBUyxDQUFDLGdCQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQyxDQUFDO0NBQUE7QUFKRCw0QkFJQztBQUdELFNBQVMsSUFBSSxDQUFDLFFBQWtCLEVBQUUsUUFBMkIsRUFBRSxHQUF1QjtJQUNwRix1Q0FBdUM7SUFDdkMsa0RBQWtEO0lBQ2xELElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM3QixNQUFNLE1BQU0sR0FBVSxFQUFFLENBQUM7SUFDekIsc0VBQXNFO0lBQ3RFLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ25DLFlBQVksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFB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WUFDcEQscUJBQXFCO1lBQ3JCLE1BQU07YUFDTCxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBVSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMxQyxPQUFPO1FBQ1AsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDcEMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge0xpbnRPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCBndWxwIGZyb20gJ2d1bHAnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIHBhY2thZ2VVdGlscyBmcm9tICcuLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCAnLi4vcGFja2FnZS1tZ3InO1xuXG5jb25zdCB0c2xpbnQgPSByZXF1aXJlKCdndWxwLXRzbGludCcpO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignd2ZoLmxpbnQnKTtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24ocGFja2FnZXM6IHN0cmluZ1tdLCBvcHRzOiBMaW50T3B0aW9ucykge1xuICBhd2FpdCBjb25maWcuaW5pdChvcHRzKTtcbiAgbG9nQ29uZmlnKGNvbmZpZygpKTtcbiAgcmV0dXJuIGxpbnQocGFja2FnZXMsIG9wdHMucGosIG9wdHMuZml4KTtcbn1cblxuXG5mdW5jdGlvbiBsaW50KHBhY2thZ2VzOiBzdHJpbmdbXSwgcHJvamVjdHM6IExpbnRPcHRpb25zWydwaiddLCBmaXg6IExpbnRPcHRpb25zWydmaXgnXSkge1xuICAvLyB2YXIgZXNsaW50ID0gcmVxdWlyZSgnZ3VscC1lc2xpbnQnKTtcbiAgLy8gbGV0IHByb2dyYW0gPSB0c2xpbnQuTGludGVyLmNyZWF0ZVByb2dyYW1lKCcnKTtcbiAgdmFyIHByb20gPSBQcm9taXNlLnJlc29sdmUoKTtcbiAgY29uc3QgZXJyb3JzOiBhbnlbXSA9IFtdO1xuICAvLyBjb25zdCBnZXRQYWNrRGlycyA9IHJlcXVpcmUoJy4uLy4uL2Rpc3QvdXRpbHMnKS5nZXRUc0RpcnNPZlBhY2thZ2U7XG4gIGlmIChwYWNrYWdlcyAmJiBwYWNrYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgcGFja2FnZVV0aWxzLmxvb2tGb3JQYWNrYWdlcyhwYWNrYWdlcywgKGZ1bGxOYW1lLCBlbnRyeVBhdGgsIHBhcnNlZE5hbWUsIGpzb24sIHBhY2thZ2VQYXRoKSA9PiB7XG4gICAgICBpZiAoanNvbi5kciAmJiBqc29uLmRyLm5vTGludCA9PT0gdHJ1ZSkge1xuICAgICAgICBsb2cuaW5mbygnc2tpcCAnICsgZnVsbE5hbWUpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBwYWNrYWdlUGF0aCA9IGZzLnJlYWxwYXRoU3luYyhwYWNrYWdlUGF0aCk7XG4gICAgICBwcm9tID0gcHJvbS5jYXRjaChlcnIgPT4gZXJyb3JzLnB1c2goZXJyKSlcbiAgICAgIC8vIC50aGVuKCgpID0+IHtcbiAgICAgIC8vIFx0bG9nLmluZm8oJ0NoZWNraW5nICcsIHBhY2thZ2VQYXRoKTtcbiAgICAgIC8vIFx0cmV0dXJuIF9saW50UGFja2FnZUFzeW5jKGVzbGludCwgZnVsbE5hbWUsIGpzb24sIHBhY2thZ2VQYXRoLCBnZXRQYWNrRGlycyhqc29uKSwgYXJndi5maXgpO1xuICAgICAgLy8gfSlcbiAgICAgIC8vIC5jYXRjaChlcnIgPT4gZXJyb3JzLnB1c2goZXJyKSlcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIF90c0xpbnRQYWNrYWdlQXN5bmMoZnVsbE5hbWUsIGpzb24sIHBhY2thZ2VQYXRoLCBmaXgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcygoZnVsbE5hbWUsIGVudHJ5UGF0aCwgcGFyc2VkTmFtZSwganNvbiwgcGFja2FnZVBhdGgpID0+IHtcbiAgICAgIGlmIChqc29uLmRyICYmIGpzb24uZHIubm9MaW50ID09PSB0cnVlKSB7XG4gICAgICAgIGxvZy5pbmZvKCdza2lwICcgKyBmdWxsTmFtZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHBhY2thZ2VQYXRoID0gZnMucmVhbHBhdGhTeW5jKHBhY2thZ2VQYXRoKTtcbiAgICAgIHByb20gPSBwcm9tLmNhdGNoKGVyciA9PiBlcnJvcnMucHVzaChlcnIpKVxuICAgICAgLy8gLnRoZW4oKCkgPT4ge1xuICAgICAgLy8gXHRsb2cuaW5mbygnQ2hlY2tpbmcgJywgcGFja2FnZVBhdGgpO1xuICAgICAgLy8gXHRyZXR1cm4gX2xpbnRQYWNrYWdlQXN5bmMoZXNsaW50LCBmdWxsTmFtZSwganNvbiwgcGFja2FnZVBhdGgsIGdldFBhY2tEaXJzKGpzb24pLCBhcmd2LmZpeCk7XG4gICAgICAvLyB9KVxuICAgICAgLy8gLmNhdGNoKGVyciA9PiBlcnJvcnMucHVzaChlcnIpKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICByZXR1cm4gX3RzTGludFBhY2thZ2VBc3luYyhmdWxsTmFtZSwganNvbiwgcGFja2FnZVBhdGgsIGZpeCk7XG4gICAgICB9KTtcbiAgICB9LCAnc3JjJywgcHJvamVjdHMpO1xuICB9XG4gIHJldHVybiBwcm9tLmNhdGNoKGVyciA9PiBlcnJvcnMucHVzaChlcnIpKVxuICAudGhlbigoKSA9PiB7XG4gICAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICBlcnJvcnMuZm9yRWFjaChlcnJvciA9PiBsb2cuZXJyb3IoZXJyb3IpKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTGludCByZXN1bHQgY29udGFpbnMgZXJyb3JzJyk7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gX3RzTGludFBhY2thZ2VBc3luYyhmdWxsTmFtZTogc3RyaW5nLCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcsIGZpeDogYm9vbGVhbikge1xuICBsZXQgZGlyO1xuICAvLyBwYWNrYWdlUGF0aCA9IGZzLnJlYWxwYXRoU3luYyhwYWNrYWdlUGF0aCk7XG4gIGxvZy5kZWJ1ZygnVFNsaW50IFNjYW4nLCBwYWNrYWdlUGF0aCk7XG4gIGlmIChmdWxsTmFtZSA9PT0gJ2RyLWNvbXAtcGFja2FnZScpXG4gICAgcGFja2FnZVBhdGggPSBwYWNrYWdlUGF0aCArICcvd2ZoJztcbiAgZm9yIChsZXQgcERpciA9IHBhY2thZ2VQYXRoOyBkaXIgIT09IHBEaXI7IHBEaXIgPSBQYXRoLmRpcm5hbWUoZGlyKSkge1xuICAgIGRpciA9IHBEaXI7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZGlyICsgJy90c2xpbnQuanNvbicpKVxuICAgICAgYnJlYWs7XG4gIH1cbiAgY29uc3QgcmNmaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3RzbGludC5qc29uJyk7XG4gIGxvZy5kZWJ1ZygnVXNlJywgcmNmaWxlKTtcbiAgY29uc3QgcGFja2FnZVBhdGgwID0gcGFja2FnZVBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gIC8vIFRPRE86IHVzZSByZXF1aXJlKCcuLi8uLi9kaXN0L3V0aWxzJykuZ2V0VHNEaXJzT2ZQYWNrYWdlO1xuICAvLyBVbmxpa2UgRVNsaW50LCBUU0xpbnQgZml4IGRvZXMgbm90IHdyaXRlIGZpbGUgdG8gc3RyZWFtLCBidXQgdXNlIGZzLndyaXRlRmlsZVN5bmMoKSBpbnN0ZWFkXG4gIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgdHNEZXN0RGlyID0gXy5nZXQoanNvbiwgJ2RyLnRzLmRlc3QnLCAnZGlzdCcpO1xuICAgIGNvbnN0IHN0cmVhbSA9IGd1bHAuc3JjKFtwYWNrYWdlUGF0aDAgKyAnLyoqLyoue3RzLHRzeH0nLFxuICAgICAgYCEke3BhY2thZ2VQYXRofS8qKi8qLnNwZWMudHNgLFxuICAgICAgYCEke3BhY2thZ2VQYXRofS8qKi8qLmQudHNgLFxuICAgICAgYCEke3BhY2thZ2VQYXRofS8ke3RzRGVzdERpcn0vKiovKmAsXG4gICAgICBgISR7cGFja2FnZVBhdGgwfS9zcGVjLyoqLypgLFxuICAgICAgYCEke3BhY2thZ2VQYXRofS8ke18uZ2V0KGpzb24sICdkci5hc3NldHNEaXInLCAnYXNzZXRzJyl9LyoqLypgLFxuICAgICAgYCEke3BhY2thZ2VQYXRoMH0vbm9kZV9tb2R1bGVzLyoqLypgXSwge2Jhc2U6IHBhY2thZ2VQYXRofSlcbiAgICAucGlwZSh0c2xpbnQoe3RzbGludDogcmVxdWlyZSgndHNsaW50JyksIGZvcm1hdHRlcjogJ3ZlcmJvc2UnLCBjb25maWd1cmF0aW9uOiByY2ZpbGUsIGZpeH0pKVxuICAgIC5waXBlKHRzbGludC5yZXBvcnQoe1xuICAgICAgc3VtbWFyaXplRmFpbHVyZU91dHB1dDogdHJ1ZSxcbiAgICAgIGFsbG93V2FybmluZ3M6IHRydWVcbiAgICB9KSlcbiAgICAvLyAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlLCBlbiwgbmV4dCkge1xuICAgIC8vIFx0bG9nLmluZm8oUGF0aC5yZWxhdGl2ZShwYWNrYWdlUGF0aCwgZmlsZS5wYXRoKSk7XG4gICAgLy8gXHRuZXh0KG51bGwsIGZpbGUpO1xuICAgIC8vIH0pKVxuICAgIC5vbignZXJyb3InLCAoZXJyOiBFcnJvcikgPT4gcmVqZWN0KGVycikpO1xuICAgIC8vIGVsc2VcbiAgICBzdHJlYW0ucmVzdW1lKCk7XG4gICAgc3RyZWFtLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKCkpO1xuICB9KTtcbn1cbiJdfQ==