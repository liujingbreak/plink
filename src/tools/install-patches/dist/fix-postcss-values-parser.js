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
        }
    })).toPromise();
}
exports.default = patch;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml4LXBvc3Rjc3MtdmFsdWVzLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpeC1wb3N0Y3NzLXZhbHVlcy1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixzQ0FBc0M7QUFDdEMseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFFakM7O0dBRUc7QUFDWSxLQUFLLFVBQVUsS0FBSyxDQUFDLGFBQStCO0lBQ2pFLE1BQU0sT0FBTyxHQUFHO1FBQ2QsNEdBQTRHO1FBQzVHLDRFQUE0RTtRQUM1RSxpREFBaUQ7S0FDbEQsQ0FBQztJQUNGLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQ2hDLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFDLEVBQUUsRUFBQyxFQUFFO1FBQ3JCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDbEMsT0FBTyxZQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDakQsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLEtBQUssRUFBRTtZQUNULE1BQU0sUUFBUSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3pDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxZQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQXNCLENBQUM7WUFDOUYsSUFBSSxNQUFNLENBQUMsT0FBTyxLQUFLLE9BQU8sRUFBRTtnQkFDOUIsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFDO2dCQUN6RSxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxHQUFHLFVBQVUsQ0FBQyxDQUFDO2dCQUM1RCxNQUFNLFlBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHdDQUF3QyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7YUFDM0c7U0FDRjtJQUNILENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7QUFDaEIsQ0FBQztBQXRCRCx3QkFzQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBsb2c0RmlsZSB9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxuLyoqXG4gKiBzZWUgLi4vLi4vZml4LXBvc3Rjc3MtdmFsdWVzLXBhcnNlci9SRUFETUUubWRcbiAqL1xuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gcGF0Y2god29ya3NwYWNlRGlyczogSXRlcmFibGU8c3RyaW5nPikge1xuICBjb25zdCB0YXJnZXRzID0gW1xuICAgICdub2RlX21vZHVsZXMvcmVhY3Qtc2NyaXB0cy9ub2RlX21vZHVsZXMvcG9zdGNzcy1wcmVzZXQtZW52L25vZGVfbW9kdWxlcy9wb3N0Y3NzLXZhbHVlcy1wYXJzZXIvcGFja2FnZS5qc29uJyxcbiAgICAnbm9kZV9tb2R1bGVzL3JlYWN0LXNjcmlwdHMvbm9kZV9tb2R1bGVzL3Bvc3Rjc3MtdmFsdWVzLXBhcnNlci9wYWNrYWdlLmpzb24nLFxuICAgICdub2RlX21vZHVsZXMvcG9zdGNzcy12YWx1ZXMtcGFyc2VyL3BhY2thZ2UuanNvbidcbiAgXTtcbiAgcmV0dXJuIHJ4LmZyb20od29ya3NwYWNlRGlycykucGlwZShcbiAgICBvcC5tZXJnZU1hcChhc3luYyB3cyA9PiB7XG4gICAgICBjb25zdCBmb3VuZCA9IHRhcmdldHMuZmluZCh0YXJnZXQgPT4ge1xuICAgICAgICByZXR1cm4gZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUod3MsIHRhcmdldCkpO1xuICAgICAgfSk7XG4gICAgICBpZiAoZm91bmQpIHtcbiAgICAgICAgY29uc3QganNvbkZpbGUgPSBQYXRoLnJlc29sdmUod3MsIGZvdW5kKTtcbiAgICAgICAgY29uc3QgcGtKc29uID0gSlNPTi5wYXJzZShhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShqc29uRmlsZSwgJ3V0Zi04JykpIGFzIHt2ZXJzaW9uOiBzdHJpbmd9O1xuICAgICAgICBpZiAocGtKc29uLnZlcnNpb24gPT09ICcyLjAuMScpIHtcbiAgICAgICAgICBjb25zdCB0YXJnZXRGaWxlID0gUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShqc29uRmlsZSksICdsaWIvcGFyc2VyLmpzJyk7XG4gICAgICAgICAgbG9nLmluZm8oJ1BhdGNoIHBvc3Rjc3MtdmFsdWVzLXBhcnNlckAyLjAuMSAnICsgdGFyZ2V0RmlsZSk7XG4gICAgICAgICAgYXdhaXQgZnMucHJvbWlzZXMuY29weUZpbGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL2ZpeC1wb3N0Y3NzLXZhbHVlcy1wYXJzZXIvcGFyc2VyLmpzJyksIHRhcmdldEZpbGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgKS50b1Byb21pc2UoKTtcbn1cbiJdfQ==