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
const config_1 = __importDefault(require("../config"));
const log4js_1 = __importDefault(require("log4js"));
const package_mgr_1 = require("../package-mgr");
const utils_1 = require("./utils");
const dist_1 = require("../../../thread-promise-pool/dist");
const os_1 = __importDefault(require("os"));
const tslint_worker_1 = __importDefault(require("./tslint-worker"));
const log = log4js_1.default.getLogger('plink.cli-lint');
const cpus = os_1.default.cpus().length;
function default_1(packages, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opts);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWxpbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBcUM7QUFFckMsZ0RBQXdCO0FBQ3hCLDZCQUE2QjtBQUM3Qix1REFBK0I7QUFDL0Isb0RBQTRCO0FBRzVCLGdEQUErRDtBQUMvRCxtQ0FBNEM7QUFDNUMsNERBQXVEO0FBQ3ZELDRDQUFvQjtBQUNwQixvRUFBaUQ7QUFFakQsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUUvQyxNQUFNLElBQUksR0FBRyxZQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO0FBRTlCLG1CQUE4QixRQUFrQixFQUFFLElBQWlCOztRQUNqRSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQyxDQUFDO0NBQUE7QUFIRCw0QkFHQztBQUdELFNBQVMsSUFBSSxDQUFDLFFBQWtCLEVBQUUsUUFBMkIsRUFBRSxHQUF1QjtJQUNwRixJQUFJLElBQUksR0FBaUIsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzNDLE1BQU0sTUFBTSxHQUFVLEVBQUUsQ0FBQztJQUN6QixJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3ZCLEtBQUssTUFBTSxJQUFJLElBQUksMkJBQW1CLENBQUMsc0JBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1lBQzVELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtnQkFDaEIsR0FBRyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsR0FBRyxJQUFJLENBQUMsQ0FBQztnQkFDbkQsU0FBUzthQUNWO1lBQ0QsTUFBTSxHQUFHLEdBQUcsc0JBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUM7WUFDOUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUN6QyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNULE9BQU8sdUJBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbkUsQ0FBQyxDQUFDLENBQUM7U0FDSjtLQUNGO1NBQU0sSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRTtRQUMvRSxNQUFNLFVBQVUsR0FBRyxJQUFJLFdBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUN2QyxpQkFBaUI7WUFDakIsV0FBVyxFQUFFLEVBQUMsSUFBSSxFQUFFLDZCQUE2QixFQUFDO1NBQ25ELENBQUMsQ0FBQztRQUNILE1BQU0sU0FBUyxHQUFtQixFQUFFLENBQUM7UUFDckMsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLHNCQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUN2RCxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7Z0JBQy9CLElBQUksRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQztnQkFDakQsUUFBUSxFQUFFLFNBQVM7Z0JBQ25CLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQzthQUM5QyxDQUFDLENBQUMsQ0FBQztTQUNMO1FBQ0QsSUFBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDL0I7U0FBTSxJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUMxQyxNQUFNLFNBQVMsR0FBbUIsRUFBRSxDQUFDO1FBQ3JDLE1BQU0sVUFBVSxHQUFHLElBQUksV0FBSSxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3ZDLGlCQUFpQjtZQUNqQixXQUFXLEVBQUUsRUFBQyxJQUFJLEVBQUUsNkJBQTZCLEVBQUM7U0FDbkQsQ0FBQyxDQUFDO1FBQ0gsS0FBSyxNQUFNLEdBQUcsSUFBSSxtQ0FBcUIsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNqRCxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7Z0JBQy9CLElBQUksRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQztnQkFDakQsUUFBUSxFQUFFLFNBQVM7Z0JBQ25CLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQzthQUM5QyxDQUFDLENBQUMsQ0FBQztTQUNMO1FBQ0QsSUFBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDL0I7SUFDRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3pDLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDVCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3JCLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDMUMsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1NBQ2hEO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xuXG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge0xpbnRPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2dldFN0YXRlLCBnZXRQYWNrYWdlc09mUHJvamVjdHN9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7Y29tcGxldGVQYWNrYWdlTmFtZX0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge1Bvb2x9IGZyb20gJy4uLy4uLy4uL3RocmVhZC1wcm9taXNlLXBvb2wvZGlzdCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHRzTGludFBhY2thZ2VBc3luYyBmcm9tICcuL3RzbGludC13b3JrZXInO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5jbGktbGludCcpO1xuXG5jb25zdCBjcHVzID0gb3MuY3B1cygpLmxlbmd0aDtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24ocGFja2FnZXM6IHN0cmluZ1tdLCBvcHRzOiBMaW50T3B0aW9ucykge1xuICBhd2FpdCBjb25maWcuaW5pdChvcHRzKTtcbiAgcmV0dXJuIGxpbnQocGFja2FnZXMsIG9wdHMucGosIG9wdHMuZml4KTtcbn1cblxuXG5mdW5jdGlvbiBsaW50KHBhY2thZ2VzOiBzdHJpbmdbXSwgcHJvamVjdHM6IExpbnRPcHRpb25zWydwaiddLCBmaXg6IExpbnRPcHRpb25zWydmaXgnXSkge1xuICBsZXQgcHJvbTogUHJvbWlzZTxhbnk+ID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIGNvbnN0IGVycm9yczogYW55W10gPSBbXTtcbiAgaWYgKHBhY2thZ2VzLmxlbmd0aCA+IDApIHtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgY29tcGxldGVQYWNrYWdlTmFtZShnZXRTdGF0ZSgpLCBwYWNrYWdlcykpIHtcbiAgICAgIGlmIChuYW1lID09IG51bGwpIHtcbiAgICAgICAgbG9nLndhcm4oJ0NhbiBub3QgZmluZCBwYWNrYWdlIGZvciBuYW1lOiAnICsgbmFtZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgcGtnID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQobmFtZSkhO1xuICAgICAgcHJvbSA9IHByb20uY2F0Y2goZXJyID0+IGVycm9ycy5wdXNoKGVycikpXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIHJldHVybiB0c0xpbnRQYWNrYWdlQXN5bmMocGtnLm5hbWUsIHBrZy5qc29uLCBwa2cucmVhbFBhdGgsIGZpeCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0gZWxzZSBpZiAocGFja2FnZXMubGVuZ3RoID09PSAwICYmIChwcm9qZWN0cyA9PSBudWxsIHx8IHByb2plY3RzLmxlbmd0aCA9PT0gMCkpIHtcbiAgICBjb25zdCB0aHJlYWRQb29sID0gbmV3IFBvb2woY3B1cyAtIDEsIDAsIHtcbiAgICAgIC8vIHZlcmJvc2U6IHRydWUsXG4gICAgICBpbml0aWFsaXplcjoge2ZpbGU6ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInfVxuICAgIH0pO1xuICAgIGNvbnN0IHRhc2tQcm9tczogUHJvbWlzZTxhbnk+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBPYmplY3QudmFsdWVzKGdldFN0YXRlKCkuc3JjUGFja2FnZXMpKSB7XG4gICAgICB0YXNrUHJvbXMucHVzaCh0aHJlYWRQb29sLnN1Ym1pdCh7XG4gICAgICAgIGZpbGU6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICd0c2xpbnQtd29ya2VyLmpzJyksXG4gICAgICAgIGV4cG9ydEZuOiAnZGVmYXVsdCcsXG4gICAgICAgIGFyZ3M6IFtwa2cubmFtZSwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCwgZml4XVxuICAgICAgfSkpO1xuICAgIH1cbiAgICBwcm9tID0gUHJvbWlzZS5hbGwodGFza1Byb21zKTtcbiAgfSBlbHNlIGlmIChwcm9qZWN0cyAmJiBwcm9qZWN0cy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgdGFza1Byb21zOiBQcm9taXNlPGFueT5bXSA9IFtdO1xuICAgIGNvbnN0IHRocmVhZFBvb2wgPSBuZXcgUG9vbChjcHVzIC0gMSwgMCwge1xuICAgICAgLy8gdmVyYm9zZTogdHJ1ZSxcbiAgICAgIGluaXRpYWxpemVyOiB7ZmlsZTogJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcid9XG4gICAgfSk7XG4gICAgZm9yIChjb25zdCBwa2cgb2YgZ2V0UGFja2FnZXNPZlByb2plY3RzKHByb2plY3RzKSkge1xuICAgICAgdGFza1Byb21zLnB1c2godGhyZWFkUG9vbC5zdWJtaXQoe1xuICAgICAgICBmaWxlOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAndHNsaW50LXdvcmtlci5qcycpLFxuICAgICAgICBleHBvcnRGbjogJ2RlZmF1bHQnLFxuICAgICAgICBhcmdzOiBbcGtnLm5hbWUsIHBrZy5qc29uLCBwa2cucmVhbFBhdGgsIGZpeF1cbiAgICAgIH0pKTtcbiAgICB9XG4gICAgcHJvbSA9IFByb21pc2UuYWxsKHRhc2tQcm9tcyk7XG4gIH1cbiAgcmV0dXJuIHByb20uY2F0Y2goZXJyID0+IGVycm9ycy5wdXNoKGVycikpXG4gIC50aGVuKCgpID0+IHtcbiAgICBpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgIGVycm9ycy5mb3JFYWNoKGVycm9yID0+IGxvZy5lcnJvcihlcnJvcikpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdMaW50IHJlc3VsdCBjb250YWlucyBlcnJvcnMnKTtcbiAgICB9XG4gIH0pO1xufVxuXG4iXX0=