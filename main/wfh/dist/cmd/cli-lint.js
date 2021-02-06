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
require("source-map-support/register");
const path_1 = __importDefault(require("path"));
// import chalk from 'chalk';
const log4js_1 = __importDefault(require("log4js"));
const package_mgr_1 = require("../package-mgr");
const utils_1 = require("./utils");
const dist_1 = require("../../../thread-promise-pool/dist");
const os_1 = __importDefault(require("os"));
const log = log4js_1.default.getLogger('plink.cli-lint');
const cpus = os_1.default.cpus().length;
function default_1(packages, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        return lint(packages, opts.pj, opts.fix);
    });
}
exports.default = default_1;
function lint(packages, projects, fix) {
    let prom = Promise.resolve();
    const errors = [];
    if (packages.length > 0) {
        const threadPool = new dist_1.Pool(cpus - 1);
        const taskProms = [];
        for (const name of utils_1.completePackageName(package_mgr_1.getState(), packages)) {
            if (name == null) {
                log.warn('Can not find package for name: ' + name);
                continue;
            }
            const pkg = package_mgr_1.getState().srcPackages.get(name);
            taskProms.push(threadPool.submitProcess({
                file: path_1.default.resolve(__dirname, 'tslint-worker.js'),
                exportFn: 'default',
                args: [pkg.name, pkg.json, pkg.realPath, fix]
            }).catch(err => {
                errors.push({ pkg: pkg.name, error: err.toString() });
            }));
        }
        prom = Promise.all(taskProms);
    }
    else if (packages.length === 0 && (projects == null || projects.length === 0)) {
        const threadPool = new dist_1.Pool(cpus - 1, 0, {
        // verbose: true
        });
        const taskProms = [];
        for (const pkg of package_mgr_1.getState().srcPackages.values()) {
            taskProms.push(threadPool.submitProcess({
                file: path_1.default.resolve(__dirname, 'tslint-worker.js'),
                exportFn: 'default',
                args: [pkg.name, pkg.json, pkg.realPath, fix]
            }).catch(err => {
                errors.push({ pkg: pkg.name, error: err.toString() });
            }));
        }
        prom = Promise.all(taskProms);
    }
    else if (projects && projects.length > 0) {
        const taskProms = [];
        const threadPool = new dist_1.Pool(cpus - 1, 0, {
        // verbose: true
        });
        for (const pkg of package_mgr_1.getPackagesOfProjects(projects)) {
            taskProms.push(threadPool.submitProcess({
                file: path_1.default.resolve(__dirname, 'tslint-worker.js'),
                exportFn: 'default',
                args: [pkg.name, pkg.json, pkg.realPath, fix]
            }).catch(err => {
                errors.push({ pkg: pkg.name, error: err.toString() });
            }));
        }
        prom = Promise.all(taskProms);
    }
    return prom.then(() => {
        if (errors.length > 0) {
            errors.forEach(error => log.error('Package ' + error.pkg + ':\n', error.error));
            throw new Error('Lint result contains errors');
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWxpbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBcUM7QUFFckMsZ0RBQXdCO0FBQ3hCLDZCQUE2QjtBQUM3QixvREFBNEI7QUFHNUIsZ0RBQStEO0FBQy9ELG1DQUE0QztBQUM1Qyw0REFBdUQ7QUFDdkQsNENBQW9CO0FBRXBCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFFL0MsTUFBTSxJQUFJLEdBQUcsWUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztBQUU5QixtQkFBOEIsUUFBa0IsRUFBRSxJQUFpQjs7UUFDakUsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzNDLENBQUM7Q0FBQTtBQUZELDRCQUVDO0FBR0QsU0FBUyxJQUFJLENBQUMsUUFBa0IsRUFBRSxRQUEyQixFQUFFLEdBQXVCO0lBQ3BGLElBQUksSUFBSSxHQUFpQixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDM0MsTUFBTSxNQUFNLEdBQW1DLEVBQUUsQ0FBQztJQUNsRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3ZCLE1BQU0sVUFBVSxHQUFHLElBQUksV0FBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN0QyxNQUFNLFNBQVMsR0FBbUIsRUFBRSxDQUFDO1FBQ3JDLEtBQUssTUFBTSxJQUFJLElBQUksMkJBQW1CLENBQUMsc0JBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1lBQzVELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtnQkFDaEIsR0FBRyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsR0FBRyxJQUFJLENBQUMsQ0FBQztnQkFDbkQs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R0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBQyxDQUFDLENBQUM7WUFDdEQsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNMO1FBQ0QsSUFBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDL0I7SUFDRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1FBQ3BCLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDckIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ2hGLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQztTQUNoRDtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcblxuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtMaW50T3B0aW9uc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgZ2V0UGFja2FnZXNPZlByb2plY3RzfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge2NvbXBsZXRlUGFja2FnZU5hbWV9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtQb29sfSBmcm9tICcuLi8uLi8uLi90aHJlYWQtcHJvbWlzZS1wb29sL2Rpc3QnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuY2xpLWxpbnQnKTtcblxuY29uc3QgY3B1cyA9IG9zLmNwdXMoKS5sZW5ndGg7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKHBhY2thZ2VzOiBzdHJpbmdbXSwgb3B0czogTGludE9wdGlvbnMpIHtcbiAgcmV0dXJuIGxpbnQocGFja2FnZXMsIG9wdHMucGosIG9wdHMuZml4KTtcbn1cblxuXG5mdW5jdGlvbiBsaW50KHBhY2thZ2VzOiBzdHJpbmdbXSwgcHJvamVjdHM6IExpbnRPcHRpb25zWydwaiddLCBmaXg6IExpbnRPcHRpb25zWydmaXgnXSkge1xuICBsZXQgcHJvbTogUHJvbWlzZTxhbnk+ID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIGNvbnN0IGVycm9yczoge3BrZzogc3RyaW5nOyBlcnJvcjogc3RyaW5nfVtdID0gW107XG4gIGlmIChwYWNrYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgdGhyZWFkUG9vbCA9IG5ldyBQb29sKGNwdXMgLSAxKTtcbiAgICBjb25zdCB0YXNrUHJvbXM6IFByb21pc2U8YW55PltdID0gW107XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGNvbXBsZXRlUGFja2FnZU5hbWUoZ2V0U3RhdGUoKSwgcGFja2FnZXMpKSB7XG4gICAgICBpZiAobmFtZSA9PSBudWxsKSB7XG4gICAgICAgIGxvZy53YXJuKCdDYW4gbm90IGZpbmQgcGFja2FnZSBmb3IgbmFtZTogJyArIG5hbWUpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBrZyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KG5hbWUpITtcbiAgICAgIHRhc2tQcm9tcy5wdXNoKHRocmVhZFBvb2wuc3VibWl0UHJvY2Vzcyh7XG4gICAgICAgIGZpbGU6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICd0c2xpbnQtd29ya2VyLmpzJyksXG4gICAgICAgIGV4cG9ydEZuOiAnZGVmYXVsdCcsXG4gICAgICAgIGFyZ3M6IFtwa2cubmFtZSwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCwgZml4XVxuICAgICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgZXJyb3JzLnB1c2goe3BrZzogcGtnLm5hbWUsIGVycm9yOiBlcnIudG9TdHJpbmcoKX0pO1xuICAgICAgfSkpO1xuICAgIH1cbiAgICBwcm9tID0gUHJvbWlzZS5hbGwodGFza1Byb21zKTtcbiAgfSBlbHNlIGlmIChwYWNrYWdlcy5sZW5ndGggPT09IDAgJiYgKHByb2plY3RzID09IG51bGwgfHwgcHJvamVjdHMubGVuZ3RoID09PSAwKSkge1xuICAgIGNvbnN0IHRocmVhZFBvb2wgPSBuZXcgUG9vbChjcHVzIC0gMSwgMCwge1xuICAgICAgLy8gdmVyYm9zZTogdHJ1ZVxuICAgIH0pO1xuICAgIGNvbnN0IHRhc2tQcm9tczogUHJvbWlzZTxhbnk+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLnZhbHVlcygpKSB7XG4gICAgICB0YXNrUHJvbXMucHVzaCh0aHJlYWRQb29sLnN1Ym1pdFByb2Nlc3Moe1xuICAgICAgICBmaWxlOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAndHNsaW50LXdvcmtlci5qcycpLFxuICAgICAgICBleHBvcnRGbjogJ2RlZmF1bHQnLFxuICAgICAgICBhcmdzOiBbcGtnLm5hbWUsIHBrZy5qc29uLCBwa2cucmVhbFBhdGgsIGZpeF1cbiAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIGVycm9ycy5wdXNoKHtwa2c6IHBrZy5uYW1lLCBlcnJvcjogZXJyLnRvU3RyaW5nKCl9KTtcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgcHJvbSA9IFByb21pc2UuYWxsKHRhc2tQcm9tcyk7XG4gIH0gZWxzZSBpZiAocHJvamVjdHMgJiYgcHJvamVjdHMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHRhc2tQcm9tczogUHJvbWlzZTxhbnk+W10gPSBbXTtcbiAgICBjb25zdCB0aHJlYWRQb29sID0gbmV3IFBvb2woY3B1cyAtIDEsIDAsIHtcbiAgICAgIC8vIHZlcmJvc2U6IHRydWVcbiAgICB9KTtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBnZXRQYWNrYWdlc09mUHJvamVjdHMocHJvamVjdHMpKSB7XG4gICAgICB0YXNrUHJvbXMucHVzaCh0aHJlYWRQb29sLnN1Ym1pdFByb2Nlc3Moe1xuICAgICAgICBmaWxlOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAndHNsaW50LXdvcmtlci5qcycpLFxuICAgICAgICBleHBvcnRGbjogJ2RlZmF1bHQnLFxuICAgICAgICBhcmdzOiBbcGtnLm5hbWUsIHBrZy5qc29uLCBwa2cucmVhbFBhdGgsIGZpeF1cbiAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIGVycm9ycy5wdXNoKHtwa2c6IHBrZy5uYW1lLCBlcnJvcjogZXJyLnRvU3RyaW5nKCl9KTtcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgcHJvbSA9IFByb21pc2UuYWxsKHRhc2tQcm9tcyk7XG4gIH1cbiAgcmV0dXJuIHByb20udGhlbigoKSA9PiB7XG4gICAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICBlcnJvcnMuZm9yRWFjaChlcnJvciA9PiBsb2cuZXJyb3IoJ1BhY2thZ2UgJyArIGVycm9yLnBrZyArICc6XFxuJywgZXJyb3IuZXJyb3IpKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTGludCByZXN1bHQgY29udGFpbnMgZXJyb3JzJyk7XG4gICAgfVxuICB9KTtcbn1cblxuIl19