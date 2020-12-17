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
const dist_1 = require("@wfh/thread-promise-pool/dist");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWxpbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNkJBQTZCO0FBQzdCLHVEQUErQjtBQUMvQiwrREFBc0M7QUFDdEMsb0RBQTRCO0FBRzVCLGdEQUErRDtBQUMvRCxtQ0FBNEM7QUFDNUMsd0RBQW1EO0FBQ25ELDRDQUFvQjtBQUNwQixvRUFBaUQ7QUFFakQsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFekMsTUFBTSxJQUFJLEdBQUcsWUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztBQUU5QixtQkFBOEIsUUFBa0IsRUFBRSxJQUFpQjs7UUFDakUsTUFBTSxnQkFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QixvQkFBUyxDQUFDLGdCQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQyxDQUFDO0NBQUE7QUFKRCw0QkFJQztBQUdELFNBQVMsSUFBSSxDQUFDLFFBQWtCLEVBQUUsUUFBMkIsRUFBRSxHQUF1QjtJQUNwRixJQUFJLElBQUksR0FBaUIsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzNDLE1BQU0sTUFBTSxHQUFVLEVBQUUsQ0FBQztJQUN6QixJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3ZCLEtBQUssTUFBTSxJQUFJLElBQUksMkJBQW1CLENBQUMsc0JBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1lBQzVELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtnQkFDaEIsR0FBRyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsR0FBRyxJQUFJLENB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WUFDMUMsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1NBQ2hEO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7TGludE9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Z2V0U3RhdGUsIGdldFBhY2thZ2VzT2ZQcm9qZWN0c30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtjb21wbGV0ZVBhY2thZ2VOYW1lfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7UG9vbH0gZnJvbSAnQHdmaC90aHJlYWQtcHJvbWlzZS1wb29sL2Rpc3QnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCB0c0xpbnRQYWNrYWdlQXN5bmMgZnJvbSAnLi90c2xpbnQtd29ya2VyJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignd2ZoLmxpbnQnKTtcblxuY29uc3QgY3B1cyA9IG9zLmNwdXMoKS5sZW5ndGg7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKHBhY2thZ2VzOiBzdHJpbmdbXSwgb3B0czogTGludE9wdGlvbnMpIHtcbiAgYXdhaXQgY29uZmlnLmluaXQob3B0cyk7XG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gIHJldHVybiBsaW50KHBhY2thZ2VzLCBvcHRzLnBqLCBvcHRzLmZpeCk7XG59XG5cblxuZnVuY3Rpb24gbGludChwYWNrYWdlczogc3RyaW5nW10sIHByb2plY3RzOiBMaW50T3B0aW9uc1sncGonXSwgZml4OiBMaW50T3B0aW9uc1snZml4J10pIHtcbiAgbGV0IHByb206IFByb21pc2U8YW55PiA9IFByb21pc2UucmVzb2x2ZSgpO1xuICBjb25zdCBlcnJvcnM6IGFueVtdID0gW107XG4gIGlmIChwYWNrYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGNvbXBsZXRlUGFja2FnZU5hbWUoZ2V0U3RhdGUoKSwgcGFja2FnZXMpKSB7XG4gICAgICBpZiAobmFtZSA9PSBudWxsKSB7XG4gICAgICAgIGxvZy53YXJuKCdDYW4gbm90IGZpbmQgcGFja2FnZSBmb3IgbmFtZTogJyArIG5hbWUpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBrZyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KG5hbWUpITtcbiAgICAgIHByb20gPSBwcm9tLmNhdGNoKGVyciA9PiBlcnJvcnMucHVzaChlcnIpKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICByZXR1cm4gdHNMaW50UGFja2FnZUFzeW5jKHBrZy5uYW1lLCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoLCBmaXgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHBhY2thZ2VzLmxlbmd0aCA9PT0gMCAmJiAocHJvamVjdHMgPT0gbnVsbCB8fCBwcm9qZWN0cy5sZW5ndGggPT09IDApKSB7XG4gICAgY29uc3QgdGhyZWFkUG9vbCA9IG5ldyBQb29sKGNwdXMgLSAxLCAwLCB7XG4gICAgICAvLyB2ZXJib3NlOiB0cnVlLFxuICAgICAgaW5pdGlhbGl6ZXI6IHtmaWxlOiAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJ31cbiAgICB9KTtcbiAgICBjb25zdCB0YXNrUHJvbXM6IFByb21pc2U8YW55PltdID0gW107XG4gICAgZm9yIChjb25zdCBwa2cgb2YgT2JqZWN0LnZhbHVlcyhnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzKSkge1xuICAgICAgdGFza1Byb21zLnB1c2godGhyZWFkUG9vbC5zdWJtaXQoe1xuICAgICAgICBmaWxlOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAndHNsaW50LXdvcmtlci5qcycpLFxuICAgICAgICBleHBvcnRGbjogJ2RlZmF1bHQnLFxuICAgICAgICBhcmdzOiBbcGtnLm5hbWUsIHBrZy5qc29uLCBwa2cucmVhbFBhdGgsIGZpeF1cbiAgICAgIH0pKTtcbiAgICB9XG4gICAgcHJvbSA9IFByb21pc2UuYWxsKHRhc2tQcm9tcyk7XG4gIH0gZWxzZSBpZiAocHJvamVjdHMgJiYgcHJvamVjdHMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHRhc2tQcm9tczogUHJvbWlzZTxhbnk+W10gPSBbXTtcbiAgICBjb25zdCB0aHJlYWRQb29sID0gbmV3IFBvb2woY3B1cyAtIDEsIDAsIHtcbiAgICAgIC8vIHZlcmJvc2U6IHRydWUsXG4gICAgICBpbml0aWFsaXplcjoge2ZpbGU6ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInfVxuICAgIH0pO1xuICAgIGZvciAoY29uc3QgcGtnIG9mIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0cykpIHtcbiAgICAgIHRhc2tQcm9tcy5wdXNoKHRocmVhZFBvb2wuc3VibWl0KHtcbiAgICAgICAgZmlsZTogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3RzbGludC13b3JrZXIuanMnKSxcbiAgICAgICAgZXhwb3J0Rm46ICdkZWZhdWx0JyxcbiAgICAgICAgYXJnczogW3BrZy5uYW1lLCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoLCBmaXhdXG4gICAgICB9KSk7XG4gICAgfVxuICAgIHByb20gPSBQcm9taXNlLmFsbCh0YXNrUHJvbXMpO1xuICB9XG4gIHJldHVybiBwcm9tLmNhdGNoKGVyciA9PiBlcnJvcnMucHVzaChlcnIpKVxuICAudGhlbigoKSA9PiB7XG4gICAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICBlcnJvcnMuZm9yRWFjaChlcnJvciA9PiBsb2cuZXJyb3IoZXJyb3IpKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTGludCByZXN1bHQgY29udGFpbnMgZXJyb3JzJyk7XG4gICAgfVxuICB9KTtcbn1cblxuIl19