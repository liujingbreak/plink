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
const config_1 = __importDefault(require("../config"));
const log_config_1 = __importDefault(require("../log-config"));
const log4js_1 = __importDefault(require("log4js"));
const package_mgr_1 = require("../package-mgr");
const utils_1 = require("./utils");
const dist_1 = require("../../../thread-promise-pool/dist");
const os_1 = __importDefault(require("os"));
const tslint_worker_1 = __importDefault(require("./tslint-worker"));
const log = log4js_1.default.getLogger('wfh.lint');
const cpus = os_1.default.cpus().length;
function default_1(packages, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opts);
        log_config_1.default(config_1.default());
        return lint(packages, opts.pj, opts.fix);
    });
}
exports.default = default_1;
function lint(packages, projects, fix) {
    let prom = Promise.resolve();
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
                return tslint_worker_1.default(pkg.name, pkg.json, pkg.realPath, fix);
            });
        }
    }
    else if (packages.length === 0 && (projects == null || projects.length === 0)) {
        const threadPool = new dist_1.Pool(cpus - 1, 0, {
            // verbose: true,
            initializer: { file: 'source-map-support/register' }
        });
        const taskProms = [];
        for (const pkg of Object.values(package_mgr_1.getState().srcPackages)) {
            taskProms.push(threadPool.submit({
                file: path_1.default.resolve(__dirname, 'tslint-worker.js'),
                exportFn: 'default',
                args: [pkg.name, pkg.json, pkg.realPath, fix]
            }));
        }
        prom = Promise.all(taskProms);
    }
    else if (projects && projects.length > 0) {
        const taskProms = [];
        const threadPool = new dist_1.Pool(cpus - 1, 0, {
            // verbose: true,
            initializer: { file: 'source-map-support/register' }
        });
        for (const pkg of package_mgr_1.getPackagesOfProjects(projects)) {
            taskProms.push(threadPool.submit({
                file: path_1.default.resolve(__dirname, 'tslint-worker.js'),
                exportFn: 'default',
                args: [pkg.name, pkg.json, pkg.realPath, fix]
            }));
        }
        prom = Promise.all(taskProms);
    }
    return prom.catch(err => errors.push(err))
        .then(() => {
        if (errors.length > 0) {
            errors.forEach(error => log.error(error));
            throw new Error('Lint result contains errors');
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWxpbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNkJBQTZCO0FBQzdCLHVEQUErQjtBQUMvQiwrREFBc0M7QUFDdEMsb0RBQTRCO0FBRzVCLGdEQUErRDtBQUMvRCxtQ0FBNEM7QUFDNUMsNERBQXVEO0FBQ3ZELDRDQUFvQjtBQUNwQixvRUFBaUQ7QUFFakQsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFekMsTUFBTSxJQUFJLEdBQUcsWUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztBQUU5QixtQkFBOEIsUUFBa0IsRUFBRSxJQUFpQjs7UUFDakUsTUFBTSxnQkFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QixvQkFBUyxDQUFDLGdCQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQyxDQUFDO0NBQUE7QUFKRCw0QkFJQztBQUdELFNBQVMsSUFBSSxDQUFDLFFBQWtCLEVBQUUsUUFBMkIsRUFBRSxHQUF1QjtJQUNwRixJQUFJLElBQUksR0FBaUIsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzNDLE1BQU0sTUFBTSxHQUFVLEVBQUUsQ0FBQztJQUN6QixJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3ZCLEtBQUssTUFBTSxJQUFJLElBQUksMkJBQW1CLENBQUMsc0JBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1lBQzVELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtnQkFDaEIsR0FBRyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsR0FBRyxJQUFJLENB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WUFDMUMsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1NBQ2hEO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7TGludE9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Z2V0U3RhdGUsIGdldFBhY2thZ2VzT2ZQcm9qZWN0c30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtjb21wbGV0ZVBhY2thZ2VOYW1lfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7UG9vbH0gZnJvbSAnLi4vLi4vLi4vdGhyZWFkLXByb21pc2UtcG9vbC9kaXN0JztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgdHNMaW50UGFja2FnZUFzeW5jIGZyb20gJy4vdHNsaW50LXdvcmtlcic7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3dmaC5saW50Jyk7XG5cbmNvbnN0IGNwdXMgPSBvcy5jcHVzKCkubGVuZ3RoO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihwYWNrYWdlczogc3RyaW5nW10sIG9wdHM6IExpbnRPcHRpb25zKSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdHMpO1xuICBsb2dDb25maWcoY29uZmlnKCkpO1xuICByZXR1cm4gbGludChwYWNrYWdlcywgb3B0cy5waiwgb3B0cy5maXgpO1xufVxuXG5cbmZ1bmN0aW9uIGxpbnQocGFja2FnZXM6IHN0cmluZ1tdLCBwcm9qZWN0czogTGludE9wdGlvbnNbJ3BqJ10sIGZpeDogTGludE9wdGlvbnNbJ2ZpeCddKSB7XG4gIGxldCBwcm9tOiBQcm9taXNlPGFueT4gPSBQcm9taXNlLnJlc29sdmUoKTtcbiAgY29uc3QgZXJyb3JzOiBhbnlbXSA9IFtdO1xuICBpZiAocGFja2FnZXMubGVuZ3RoID4gMCkge1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBjb21wbGV0ZVBhY2thZ2VOYW1lKGdldFN0YXRlKCksIHBhY2thZ2VzKSkge1xuICAgICAgaWYgKG5hbWUgPT0gbnVsbCkge1xuICAgICAgICBsb2cud2FybignQ2FuIG5vdCBmaW5kIHBhY2thZ2UgZm9yIG5hbWU6ICcgKyBuYW1lKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBwa2cgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChuYW1lKSE7XG4gICAgICBwcm9tID0gcHJvbS5jYXRjaChlcnIgPT4gZXJyb3JzLnB1c2goZXJyKSlcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIHRzTGludFBhY2thZ2VBc3luYyhwa2cubmFtZSwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCwgZml4KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSBlbHNlIGlmIChwYWNrYWdlcy5sZW5ndGggPT09IDAgJiYgKHByb2plY3RzID09IG51bGwgfHwgcHJvamVjdHMubGVuZ3RoID09PSAwKSkge1xuICAgIGNvbnN0IHRocmVhZFBvb2wgPSBuZXcgUG9vbChjcHVzIC0gMSwgMCwge1xuICAgICAgLy8gdmVyYm9zZTogdHJ1ZSxcbiAgICAgIGluaXRpYWxpemVyOiB7ZmlsZTogJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcid9XG4gICAgfSk7XG4gICAgY29uc3QgdGFza1Byb21zOiBQcm9taXNlPGFueT5bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgcGtnIG9mIE9iamVjdC52YWx1ZXMoZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcykpIHtcbiAgICAgIHRhc2tQcm9tcy5wdXNoKHRocmVhZFBvb2wuc3VibWl0KHtcbiAgICAgICAgZmlsZTogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3RzbGludC13b3JrZXIuanMnKSxcbiAgICAgICAgZXhwb3J0Rm46ICdkZWZhdWx0JyxcbiAgICAgICAgYXJnczogW3BrZy5uYW1lLCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoLCBmaXhdXG4gICAgICB9KSk7XG4gICAgfVxuICAgIHByb20gPSBQcm9taXNlLmFsbCh0YXNrUHJvbXMpO1xuICB9IGVsc2UgaWYgKHByb2plY3RzICYmIHByb2plY3RzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCB0YXNrUHJvbXM6IFByb21pc2U8YW55PltdID0gW107XG4gICAgY29uc3QgdGhyZWFkUG9vbCA9IG5ldyBQb29sKGNwdXMgLSAxLCAwLCB7XG4gICAgICAvLyB2ZXJib3NlOiB0cnVlLFxuICAgICAgaW5pdGlhbGl6ZXI6IHtmaWxlOiAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJ31cbiAgICB9KTtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBnZXRQYWNrYWdlc09mUHJvamVjdHMocHJvamVjdHMpKSB7XG4gICAgICB0YXNrUHJvbXMucHVzaCh0aHJlYWRQb29sLnN1Ym1pdCh7XG4gICAgICAgIGZpbGU6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICd0c2xpbnQtd29ya2VyLmpzJyksXG4gICAgICAgIGV4cG9ydEZuOiAnZGVmYXVsdCcsXG4gICAgICAgIGFyZ3M6IFtwa2cubmFtZSwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCwgZml4XVxuICAgICAgfSkpO1xuICAgIH1cbiAgICBwcm9tID0gUHJvbWlzZS5hbGwodGFza1Byb21zKTtcbiAgfVxuICByZXR1cm4gcHJvbS5jYXRjaChlcnIgPT4gZXJyb3JzLnB1c2goZXJyKSlcbiAgLnRoZW4oKCkgPT4ge1xuICAgIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgZXJyb3JzLmZvckVhY2goZXJyb3IgPT4gbG9nLmVycm9yKGVycm9yKSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xpbnQgcmVzdWx0IGNvbnRhaW5zIGVycm9ycycpO1xuICAgIH1cbiAgfSk7XG59XG5cbiJdfQ==