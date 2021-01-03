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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFuYWx5c2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWFuYWx5c2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0Q0FBb0I7QUFDcEIsdURBQStCO0FBQy9CLGdEQUF3QjtBQUN4QiwrREFBc0M7QUFDdEMsZ0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUN2QiwrQkFBK0I7QUFDL0IsNERBQXVEO0FBRXZELCtDQUErQztBQUMvQyxNQUFNLElBQUksR0FBRyxZQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO0FBRTlCLG1CQUE4QixRQUFrQixFQUFFLElBQW9COztRQUNwRSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hCLG9CQUFTLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7UUFDcEIsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ2IsTUFBTSxPQUFPLEdBQUcsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlDLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ3pDO0lBQ0gsQ0FBQztDQUFBO0FBUkQsNEJBUUM7QUFFRCxTQUFlLFlBQVksQ0FBQyxLQUFlOztRQUN6QyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxPQUFPLENBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDaEYsY0FBSSxDQUFDLE9BQU8sRUFBRSxFQUFDLEtBQUssRUFBRSxJQUFJLEVBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtnQkFDNUMsSUFBSSxHQUFHLEVBQUU7b0JBQ1AsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ3BCO2dCQUNELE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuQixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixLQUFLLEdBQUcsZ0JBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzthQUNqRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxXQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDdkMsc0RBQXNEO1lBQ3RELE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsT0FBTyxNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQVc7WUFDOUMsSUFBSSxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHVCQUF1QixDQUFDO1lBQ3RELFFBQVEsRUFBRSxrQkFBa0I7WUFDNUIsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDO1NBQ2QsQ0FBQyxDQUFDO0lBRUwsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtBbmFseXNlT3B0aW9uc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4uL2xvZy1jb25maWcnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtQb29sfSBmcm9tICcuLi8uLi8uLi90aHJlYWQtcHJvbWlzZS1wb29sL2Rpc3QnO1xuXG4vLyBjb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCd3ZmguYW5hbHlzZScpO1xuY29uc3QgY3B1cyA9IG9zLmNwdXMoKS5sZW5ndGg7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKHBhY2thZ2VzOiBzdHJpbmdbXSwgb3B0czogQW5hbHlzZU9wdGlvbnMpIHtcbiAgYXdhaXQgY29uZmlnLmluaXQob3B0cyk7XG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gIGlmIChvcHRzLmZpbGUpIHtcbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgYW5hbHlzZUZpbGVzKG9wdHMuZmlsZSk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ0RlcGVuZGVuY2llczpcXG4nLCByZXN1bHRzKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBhbmFseXNlRmlsZXMoZmlsZXM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IG1hdGNoRG9uZXMgPSBmaWxlcy5tYXAocGF0dGVybiA9PiBuZXcgUHJvbWlzZTxzdHJpbmdbXT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGdsb2IocGF0dGVybiwge25vZGlyOiB0cnVlfSwgKGVyciwgbWF0Y2hlcykgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICB9XG4gICAgICByZXNvbHZlKG1hdGNoZXMpO1xuICAgIH0pO1xuICB9KSk7XG4gIGZpbGVzID0gXy5mbGF0dGVuKChhd2FpdCBQcm9taXNlLmFsbChtYXRjaERvbmVzKSkpXG4gIC5maWx0ZXIoZiA9PiAvXFwuW2p0XXN4PyQvLnRlc3QoZikpO1xuICBjb25zdCB0aHJlYWRQb29sID0gbmV3IFBvb2woY3B1cyAtIDEsIDAsIHtcbiAgICAvLyBpbml0aWFsaXplcjoge2ZpbGU6ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInfSxcbiAgICB2ZXJib3NlOiBmYWxzZVxuICB9KTtcblxuICByZXR1cm4gYXdhaXQgdGhyZWFkUG9vbC5zdWJtaXRQcm9jZXNzPHN0cmluZ1tdPih7XG4gICAgZmlsZTogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2NsaS1hbmFseXNlLXdvcmtlci5qcycpLFxuICAgIGV4cG9ydEZuOiAnZGZzVHJhdmVyc2VGaWxlcycsXG4gICAgYXJnczogW2ZpbGVzXVxuICB9KTtcblxufVxuIl19