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
const dist_1 = require("../../../packages/thread-promise-pool/dist");
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
        for (const name of (0, utils_1.completePackageName)((0, package_mgr_1.getState)(), packages)) {
            if (name == null) {
                log.warn('Can not find package for name: ' + name);
                continue;
            }
            const pkg = (0, package_mgr_1.getState)().srcPackages.get(name);
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
        for (const pkg of (0, package_mgr_1.getState)().srcPackages.values()) {
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
        for (const pkg of (0, package_mgr_1.getPackagesOfProjects)(projects)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWxpbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBcUM7QUFFckMsZ0RBQXdCO0FBQ3hCLDZCQUE2QjtBQUM3QixvREFBNEI7QUFHNUIsZ0RBQStEO0FBQy9ELG1DQUE0QztBQUM1QyxxRUFBZ0U7QUFDaEUsNENBQW9CO0FBRXBCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFFL0MsTUFBTSxJQUFJLEdBQUcsWUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztBQUU5QixtQkFBOEIsUUFBa0IsRUFBRSxJQUFpQjs7UUFDakUsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzNDLENBQUM7Q0FBQTtBQUZELDRCQUVDO0FBR0QsU0FBUyxJQUFJLENBQUMsUUFBa0IsRUFBRSxRQUEyQixFQUFFLEdBQXVCO0lBQ3BGLElBQUksSUFBSSxHQUFpQixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDM0MsTUFBTSxNQUFNLEdBQW1DLEVBQUUsQ0FBQztJQUNsRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3ZCLE1BQU0sVUFBVSxHQUFHLElBQUksV0FBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN0QyxNQUFNLFNBQVMsR0FBbUIsRUFBRSxDQUFDO1FBQ3JDLEtBQUssTUFBTSxJQUFJLElBQUksSUFBQSwyQkFBbUIsRUFBQyxJQUFBLHNCQUFRLEdBQUUsRUFBRSxRQUFRLENBQUMsRUFBRTtZQUM1RCxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7Z0JBQ2hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUNBQWlDLEdBQUcsSUFBSSxDQUFDLENB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TUFBTSxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUMsQ0FBQyxDQUFDO1lBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDTDtRQUNELElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQy9CO0lBQ0QsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNwQixJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3JCLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNoRixNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7U0FDaEQ7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XG5cbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7TGludE9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Z2V0U3RhdGUsIGdldFBhY2thZ2VzT2ZQcm9qZWN0c30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtjb21wbGV0ZVBhY2thZ2VOYW1lfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7UG9vbH0gZnJvbSAnLi4vLi4vLi4vcGFja2FnZXMvdGhyZWFkLXByb21pc2UtcG9vbC9kaXN0JztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmNsaS1saW50Jyk7XG5cbmNvbnN0IGNwdXMgPSBvcy5jcHVzKCkubGVuZ3RoO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihwYWNrYWdlczogc3RyaW5nW10sIG9wdHM6IExpbnRPcHRpb25zKSB7XG4gIHJldHVybiBsaW50KHBhY2thZ2VzLCBvcHRzLnBqLCBvcHRzLmZpeCk7XG59XG5cblxuZnVuY3Rpb24gbGludChwYWNrYWdlczogc3RyaW5nW10sIHByb2plY3RzOiBMaW50T3B0aW9uc1sncGonXSwgZml4OiBMaW50T3B0aW9uc1snZml4J10pIHtcbiAgbGV0IHByb206IFByb21pc2U8YW55PiA9IFByb21pc2UucmVzb2x2ZSgpO1xuICBjb25zdCBlcnJvcnM6IHtwa2c6IHN0cmluZzsgZXJyb3I6IHN0cmluZ31bXSA9IFtdO1xuICBpZiAocGFja2FnZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHRocmVhZFBvb2wgPSBuZXcgUG9vbChjcHVzIC0gMSk7XG4gICAgY29uc3QgdGFza1Byb21zOiBQcm9taXNlPGFueT5bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBjb21wbGV0ZVBhY2thZ2VOYW1lKGdldFN0YXRlKCksIHBhY2thZ2VzKSkge1xuICAgICAgaWYgKG5hbWUgPT0gbnVsbCkge1xuICAgICAgICBsb2cud2FybignQ2FuIG5vdCBmaW5kIHBhY2thZ2UgZm9yIG5hbWU6ICcgKyBuYW1lKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBwa2cgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChuYW1lKSE7XG4gICAgICB0YXNrUHJvbXMucHVzaCh0aHJlYWRQb29sLnN1Ym1pdFByb2Nlc3Moe1xuICAgICAgICBmaWxlOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAndHNsaW50LXdvcmtlci5qcycpLFxuICAgICAgICBleHBvcnRGbjogJ2RlZmF1bHQnLFxuICAgICAgICBhcmdzOiBbcGtnLm5hbWUsIHBrZy5qc29uLCBwa2cucmVhbFBhdGgsIGZpeF1cbiAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIGVycm9ycy5wdXNoKHtwa2c6IHBrZy5uYW1lLCBlcnJvcjogZXJyLnRvU3RyaW5nKCl9KTtcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgcHJvbSA9IFByb21pc2UuYWxsKHRhc2tQcm9tcyk7XG4gIH0gZWxzZSBpZiAocGFja2FnZXMubGVuZ3RoID09PSAwICYmIChwcm9qZWN0cyA9PSBudWxsIHx8IHByb2plY3RzLmxlbmd0aCA9PT0gMCkpIHtcbiAgICBjb25zdCB0aHJlYWRQb29sID0gbmV3IFBvb2woY3B1cyAtIDEsIDAsIHtcbiAgICAgIC8vIHZlcmJvc2U6IHRydWVcbiAgICB9KTtcbiAgICBjb25zdCB0YXNrUHJvbXM6IFByb21pc2U8YW55PltdID0gW107XG4gICAgZm9yIChjb25zdCBwa2cgb2YgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy52YWx1ZXMoKSkge1xuICAgICAgdGFza1Byb21zLnB1c2godGhyZWFkUG9vbC5zdWJtaXRQcm9jZXNzKHtcbiAgICAgICAgZmlsZTogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3RzbGludC13b3JrZXIuanMnKSxcbiAgICAgICAgZXhwb3J0Rm46ICdkZWZhdWx0JyxcbiAgICAgICAgYXJnczogW3BrZy5uYW1lLCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoLCBmaXhdXG4gICAgICB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAgICBlcnJvcnMucHVzaCh7cGtnOiBwa2cubmFtZSwgZXJyb3I6IGVyci50b1N0cmluZygpfSk7XG4gICAgICB9KSk7XG4gICAgfVxuICAgIHByb20gPSBQcm9taXNlLmFsbCh0YXNrUHJvbXMpO1xuICB9IGVsc2UgaWYgKHByb2plY3RzICYmIHByb2plY3RzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCB0YXNrUHJvbXM6IFByb21pc2U8YW55PltdID0gW107XG4gICAgY29uc3QgdGhyZWFkUG9vbCA9IG5ldyBQb29sKGNwdXMgLSAxLCAwLCB7XG4gICAgICAvLyB2ZXJib3NlOiB0cnVlXG4gICAgfSk7XG4gICAgZm9yIChjb25zdCBwa2cgb2YgZ2V0UGFja2FnZXNPZlByb2plY3RzKHByb2plY3RzKSkge1xuICAgICAgdGFza1Byb21zLnB1c2godGhyZWFkUG9vbC5zdWJtaXRQcm9jZXNzKHtcbiAgICAgICAgZmlsZTogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3RzbGludC13b3JrZXIuanMnKSxcbiAgICAgICAgZXhwb3J0Rm46ICdkZWZhdWx0JyxcbiAgICAgICAgYXJnczogW3BrZy5uYW1lLCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoLCBmaXhdXG4gICAgICB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAgICBlcnJvcnMucHVzaCh7cGtnOiBwa2cubmFtZSwgZXJyb3I6IGVyci50b1N0cmluZygpfSk7XG4gICAgICB9KSk7XG4gICAgfVxuICAgIHByb20gPSBQcm9taXNlLmFsbCh0YXNrUHJvbXMpO1xuICB9XG4gIHJldHVybiBwcm9tLnRoZW4oKCkgPT4ge1xuICAgIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgZXJyb3JzLmZvckVhY2goZXJyb3IgPT4gbG9nLmVycm9yKCdQYWNrYWdlICcgKyBlcnJvci5wa2cgKyAnOlxcbicsIGVycm9yLmVycm9yKSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xpbnQgcmVzdWx0IGNvbnRhaW5zIGVycm9ycycpO1xuICAgIH1cbiAgfSk7XG59XG5cbiJdfQ==