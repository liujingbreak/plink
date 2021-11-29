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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const plink_1 = require("@wfh/plink");
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const log = (0, plink_1.log4File)(__filename);
/**
 * see ../../fix-postcss-values-parser/README.md
 */
async function patch(workspaceDirs) {
    const targets = [
        'node_modules/react-scripts/node_modules/postcss-preset-env/node_modules/postcss-values-parser/package.json',
        'node_modules/react-scripts/node_modules/postcss-values-parser/package.json',
        'node_modules/postcss-values-parser/package.json'
    ];
    return rx.from(workspaceDirs).pipe(op.mergeMap(async (ws) => {
        const found = targets.find(target => {
            return fs_1.default.existsSync(path_1.default.resolve(ws, target));
        });
        if (found) {
            const jsonFile = path_1.default.resolve(ws, found);
            const pkJson = JSON.parse(await fs_1.default.promises.readFile(jsonFile, 'utf-8'));
            if (pkJson.version === '2.0.1') {
                const targetFile = path_1.default.resolve(path_1.default.dirname(jsonFile), 'lib/parser.js');
                log.info('Patch postcss-values-parser@2.0.1 ' + targetFile);
                await fs_1.default.promises.copyFile(path_1.default.resolve(__dirname, '../fix-postcss-values-parser/parser.js'), targetFile);
            }
            else {
                log.info(`Installed postcss-values-parser version is ${pkJson.version}, not 2.0.1, skip patching.`);
            }
        }
    })).toPromise();
}
exports.default = patch;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml4LXBvc3Rjc3MtdmFsdWVzLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpeC1wb3N0Y3NzLXZhbHVlcy1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixzQ0FBc0M7QUFDdEMseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFFakM7O0dBRUc7QUFDWSxLQUFLLFVBQVUsS0FBSyxDQUFDLGFBQStCO0lBQ2pFLE1BQU0sT0FBTyxHQUFHO1FBQ2QsNEdBQTRHO1FBQzVHLDRFQUE0RTtRQUM1RSxpREFBaUQ7S0FDbEQsQ0FBQztJQUNGLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQ2hDLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFDLEVBQUUsRUFBQyxFQUFFO1FBQ3JCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDbEMsT0FBTyxZQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDakQsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLEtBQUssRUFBRTtZQUNULE1BQU0sUUFBUSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3pDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxZQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQXNCLENBQUM7WUFDOUYsSUFBSSxNQUFNLENBQUMsT0FBTyxLQUFLLE9BQU8sRUFBRTtnQkFDOUIsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFDO2dCQUN6RSxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxHQUFHLFVBQVUsQ0FBQyxDQUFDO2dCQUM1RCxNQUFNLFlBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHdDQUF3QyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7YUFDM0c7aUJBQU07Z0JBQ0wsR0FBRyxDQUFDLElBQUksQ0FBQyw4Q0FBOEMsTUFBTSxDQUFDLE9BQU8sNkJBQTZCLENBQUMsQ0FBQzthQUNyRztTQUNGO0lBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNoQixDQUFDO0FBeEJELHdCQXdCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGxvZzRGaWxlIH0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuXG4vKipcbiAqIHNlZSAuLi8uLi9maXgtcG9zdGNzcy12YWx1ZXMtcGFyc2VyL1JFQURNRS5tZFxuICovXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBwYXRjaCh3b3Jrc3BhY2VEaXJzOiBJdGVyYWJsZTxzdHJpbmc+KSB7XG4gIGNvbnN0IHRhcmdldHMgPSBbXG4gICAgJ25vZGVfbW9kdWxlcy9yZWFjdC1zY3JpcHRzL25vZGVfbW9kdWxlcy9wb3N0Y3NzLXByZXNldC1lbnYvbm9kZV9tb2R1bGVzL3Bvc3Rjc3MtdmFsdWVzLXBhcnNlci9wYWNrYWdlLmpzb24nLFxuICAgICdub2RlX21vZHVsZXMvcmVhY3Qtc2NyaXB0cy9ub2RlX21vZHVsZXMvcG9zdGNzcy12YWx1ZXMtcGFyc2VyL3BhY2thZ2UuanNvbicsXG4gICAgJ25vZGVfbW9kdWxlcy9wb3N0Y3NzLXZhbHVlcy1wYXJzZXIvcGFja2FnZS5qc29uJ1xuICBdO1xuICByZXR1cm4gcnguZnJvbSh3b3Jrc3BhY2VEaXJzKS5waXBlKFxuICAgIG9wLm1lcmdlTWFwKGFzeW5jIHdzID0+IHtcbiAgICAgIGNvbnN0IGZvdW5kID0gdGFyZ2V0cy5maW5kKHRhcmdldCA9PiB7XG4gICAgICAgIHJldHVybiBmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZSh3cywgdGFyZ2V0KSk7XG4gICAgICB9KTtcbiAgICAgIGlmIChmb3VuZCkge1xuICAgICAgICBjb25zdCBqc29uRmlsZSA9IFBhdGgucmVzb2x2ZSh3cywgZm91bmQpO1xuICAgICAgICBjb25zdCBwa0pzb24gPSBKU09OLnBhcnNlKGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGpzb25GaWxlLCAndXRmLTgnKSkgYXMge3ZlcnNpb246IHN0cmluZ307XG4gICAgICAgIGlmIChwa0pzb24udmVyc2lvbiA9PT0gJzIuMC4xJykge1xuICAgICAgICAgIGNvbnN0IHRhcmdldEZpbGUgPSBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGpzb25GaWxlKSwgJ2xpYi9wYXJzZXIuanMnKTtcbiAgICAgICAgICBsb2cuaW5mbygnUGF0Y2ggcG9zdGNzcy12YWx1ZXMtcGFyc2VyQDIuMC4xICcgKyB0YXJnZXRGaWxlKTtcbiAgICAgICAgICBhd2FpdCBmcy5wcm9taXNlcy5jb3B5RmlsZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vZml4LXBvc3Rjc3MtdmFsdWVzLXBhcnNlci9wYXJzZXIuanMnKSwgdGFyZ2V0RmlsZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nLmluZm8oYEluc3RhbGxlZCBwb3N0Y3NzLXZhbHVlcy1wYXJzZXIgdmVyc2lvbiBpcyAke3BrSnNvbi52ZXJzaW9ufSwgbm90IDIuMC4xLCBza2lwIHBhdGNoaW5nLmApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgKS50b1Byb21pc2UoKTtcbn1cbiJdfQ==