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
const os_1 = __importDefault(require("os"));
const config_1 = __importDefault(require("../config"));
const path_1 = __importDefault(require("path"));
const log_config_1 = __importDefault(require("../log-config"));
const glob_1 = __importDefault(require("glob"));
const lodash_1 = __importDefault(require("lodash"));
// import log4js from 'log4js';
const dist_1 = require("../../../thread-promise-pool/dist");
// const log = log4js.getLogger('wfh.analyse');
const cpus = os_1.default.cpus().length;
function default_1(packages, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opts);
        log_config_1.default(config_1.default());
        if (opts.file) {
            const results = yield analyseFiles(opts.file);
            // tslint:disable-next-line: no-console
            console.log('Dependencies:\n', results);
        }
    });
}
exports.default = default_1;
function analyseFiles(files) {
    return __awaiter(this, void 0, void 0, function* () {
        const matchDones = files.map(pattern => new Promise((resolve, reject) => {
            glob_1.default(pattern, { nodir: true }, (err, matches) => {
                if (err) {
                    return reject(err);
                }
                resolve(matches);
            });
        }));
        files = lodash_1.default.flatten((yield Promise.all(matchDones)))
            // .map(file => {
            //   console.log(file);
            //   return file;
            // })
            .filter(f => /\.[jt]sx?$/.test(f));
        const threadPool = new dist_1.Pool(cpus - 1, 0, {
            // initializer: {file: 'source-map-support/register'},
            verbose: false
        });
        return yield threadPool.submitProcess({
            file: path_1.default.resolve(__dirname, 'cli-analyse-worker.js'),
            exportFn: 'dfsTraverseFiles',
            args: [files]
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5emUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWFuYWx5emUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0Q0FBb0I7QUFDcEIsdURBQStCO0FBQy9CLGdEQUF3QjtBQUN4QiwrREFBc0M7QUFDdEMsZ0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUN2QiwrQkFBK0I7QUFDL0IsNERBQXVEO0FBRXZELCtDQUErQztBQUMvQyxNQUFNLElBQUksR0FBRyxZQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO0FBRTlCLG1CQUE4QixRQUFrQixFQUFFLElBQW9COztRQUNwRSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hCLG9CQUFTLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7UUFDcEIsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ2IsTUFBTSxPQUFPLEdBQUcsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlDLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ3pDO0lBQ0gsQ0FBQztDQUFBO0FBUkQsNEJBUUM7QUFFRCxTQUFlLFlBQVksQ0FBQyxLQUFlOztRQUN6QyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxPQUFPLENBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDaEYsY0FBSSxDQUFDLE9BQU8sRUFBRSxFQUFDLEtBQUssRUFBRSxJQUFJLEVBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtnQkFDNUMsSUFBSSxHQUFHLEVBQUU7b0JBQ1AsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ3BCO2dCQUNELE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuQixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixLQUFLLEdBQUcsZ0JBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUNsRCxpQkFBaUI7WUFDakIsdUJBQXVCO1lBQ3ZCLGlCQUFpQjtZQUNqQixLQUFLO2FBQ0osTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sVUFBVSxHQUFHLElBQUksV0FBSSxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3ZDLHNEQUFzRDtZQUN0RCxPQUFPLEVBQUUsS0FBSztTQUNmLENBQUMsQ0FBQztRQUVILE9BQU8sTUFBTSxVQUFVLENBQUMsYUFBYSxDQUFXO1lBQzlDLElBQUksRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQztZQUN0RCxRQUFRLEVBQUUsa0JBQWtCO1lBQzVCLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQztTQUNkLENBQUMsQ0FBQztJQUVMLENBQUM7Q0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QW5hbHl6ZU9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCBnbG9iIGZyb20gJ2dsb2InO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbi8vIGltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7UG9vbH0gZnJvbSAnLi4vLi4vLi4vdGhyZWFkLXByb21pc2UtcG9vbC9kaXN0JztcblxuLy8gY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignd2ZoLmFuYWx5c2UnKTtcbmNvbnN0IGNwdXMgPSBvcy5jcHVzKCkubGVuZ3RoO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihwYWNrYWdlczogc3RyaW5nW10sIG9wdHM6IEFuYWx5emVPcHRpb25zKSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdHMpO1xuICBsb2dDb25maWcoY29uZmlnKCkpO1xuICBpZiAob3B0cy5maWxlKSB7XG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IGFuYWx5c2VGaWxlcyhvcHRzLmZpbGUpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdEZXBlbmRlbmNpZXM6XFxuJywgcmVzdWx0cyk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gYW5hbHlzZUZpbGVzKGZpbGVzOiBzdHJpbmdbXSkge1xuICBjb25zdCBtYXRjaERvbmVzID0gZmlsZXMubWFwKHBhdHRlcm4gPT4gbmV3IFByb21pc2U8c3RyaW5nW10+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBnbG9iKHBhdHRlcm4sIHtub2RpcjogdHJ1ZX0sIChlcnIsIG1hdGNoZXMpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZShtYXRjaGVzKTtcbiAgICB9KTtcbiAgfSkpO1xuICBmaWxlcyA9IF8uZmxhdHRlbigoYXdhaXQgUHJvbWlzZS5hbGwobWF0Y2hEb25lcykpKVxuICAvLyAubWFwKGZpbGUgPT4ge1xuICAvLyAgIGNvbnNvbGUubG9nKGZpbGUpO1xuICAvLyAgIHJldHVybiBmaWxlO1xuICAvLyB9KVxuICAuZmlsdGVyKGYgPT4gL1xcLltqdF1zeD8kLy50ZXN0KGYpKTtcbiAgY29uc3QgdGhyZWFkUG9vbCA9IG5ldyBQb29sKGNwdXMgLSAxLCAwLCB7XG4gICAgLy8gaW5pdGlhbGl6ZXI6IHtmaWxlOiAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJ30sXG4gICAgdmVyYm9zZTogZmFsc2VcbiAgfSk7XG5cbiAgcmV0dXJuIGF3YWl0IHRocmVhZFBvb2wuc3VibWl0UHJvY2VzczxzdHJpbmdbXT4oe1xuICAgIGZpbGU6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdjbGktYW5hbHlzZS13b3JrZXIuanMnKSxcbiAgICBleHBvcnRGbjogJ2Rmc1RyYXZlcnNlRmlsZXMnLFxuICAgIGFyZ3M6IFtmaWxlc11cbiAgfSk7XG5cbn1cbiJdfQ==