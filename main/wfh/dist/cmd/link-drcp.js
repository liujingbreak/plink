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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const symlinks_1 = require("../utils/symlinks");
const os_1 = __importDefault(require("os"));
const pkJson = require('../../../package.json');
const isWin32 = os_1.default.platform().indexOf('win32') >= 0;
function default_1() {
    symlinks_1.linkDrcp();
    const peerDeps = Object.keys(pkJson.peerDependencies || []);
    let drcpHome = Path.relative(process.cwd(), Path.resolve(__dirname, '../../..')).replace(/\\/g, '/');
    if (drcpHome.length === 0)
        drcpHome = '.';
    else if (!drcpHome.startsWith('.'))
        drcpHome = './' + drcpHome;
    if (peerDeps.length > 0) {
        const tsconfigDrcp = {
            extends: `${drcpHome}/wfh/tsconfig-base.json`,
            compilerOptions: {
                baseUrl: '.',
                paths: {},
                typeRoots: [`${drcpHome}/node_modules/@types`]
            }
        };
        for (const dep of peerDeps) {
            tsconfigDrcp.compilerOptions.paths[dep] = ['node_modules/' + dep];
            tsconfigDrcp.compilerOptions.paths[dep + '/*'] = ['node_modules/' + dep + '/*'];
        }
        fs.writeFileSync('tsconfig-drcp.json', JSON.stringify(tsconfigDrcp, null, '  '));
        fs.writeFileSync('tsc-drcp.sh', './node_modules/dr-comp-package/node_modules/.bin/tsc -p tsconfig-drcp.json $*');
        if (isWin32) {
            fs.writeFileSync('tsc-drcp.bat', '.\\node_modules\\dr-comp-package\\node_modules\\.bin\\tsc -p tsconfig-drcp.json %*');
        }
        else {
            fs.chmodSync('tsc-drcp.sh', 0o777);
        }
    }
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluay1kcmNwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2xpbmstZHJjcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLGdEQUEyQztBQUMzQyw0Q0FBb0I7QUFDcEIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFDaEQsTUFBTSxPQUFPLEdBQUcsWUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFcEQ7SUFDRSxtQkFBUSxFQUFFLENBQUM7SUFFWCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUU1RCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDckcsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUM7UUFDdkIsUUFBUSxHQUFHLEdBQUcsQ0FBQztTQUNaLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztRQUNoQyxRQUFRLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQztJQUU3QixJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3ZCLE1BQU0sWUFBWSxHQUFHO1lBQ25CLE9BQU8sRUFBRSxHQUFHLFFBQVEseUJBQXlCO1lBQzdDLGVBQWUsRUFBRTtnQkFDZixPQUFPLEVBQUUsR0FBRztnQkFDWixLQUFLLEVBQUUsRUFDTjtnQkFDRCxTQUFTLEVBQUUsQ0FBQyxHQUFHLFFBQVEsc0JBQXNCLENBQUM7YUFDL0M7U0FDRixDQUFDO1FBQ0YsS0FBSyxNQUFNLEdBQUcsSUFBSSxRQUFRLEVBQUU7WUFDMUIsWUFBWSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDbEUsWUFBWSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQztTQUNqRjtRQUVELEVBQUUsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDakYsRUFBRSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQzVCLCtFQUErRSxDQUFDLENBQUM7UUFDbkYsSUFBSSxPQUFPLEVBQUU7WUFDWCxFQUFFLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFDN0Isb0ZBQW9GLENBQUMsQ0FBQztTQUN6RjthQUFNO1lBQ0wsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDcEM7S0FDRjtBQUNILENBQUM7QUFwQ0QsNEJBb0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7bGlua0RyY3B9IGZyb20gJy4uL3V0aWxzL3N5bWxpbmtzJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5jb25zdCBwa0pzb24gPSByZXF1aXJlKCcuLi8uLi8uLi9wYWNrYWdlLmpzb24nKTtcbmNvbnN0IGlzV2luMzIgPSBvcy5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIGxpbmtEcmNwKCk7XG5cbiAgY29uc3QgcGVlckRlcHMgPSBPYmplY3Qua2V5cyhwa0pzb24ucGVlckRlcGVuZGVuY2llcyB8fCBbXSk7XG5cbiAgbGV0IGRyY3BIb21lID0gUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vLi4nKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBpZiAoZHJjcEhvbWUubGVuZ3RoID09PSAwKVxuICAgIGRyY3BIb21lID0gJy4nO1xuICBlbHNlIGlmICghZHJjcEhvbWUuc3RhcnRzV2l0aCgnLicpKVxuICAgIGRyY3BIb21lID0gJy4vJyArIGRyY3BIb21lO1xuXG4gIGlmIChwZWVyRGVwcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgdHNjb25maWdEcmNwID0ge1xuICAgICAgZXh0ZW5kczogYCR7ZHJjcEhvbWV9L3dmaC90c2NvbmZpZy1iYXNlLmpzb25gLFxuICAgICAgY29tcGlsZXJPcHRpb25zOiB7XG4gICAgICAgIGJhc2VVcmw6ICcuJyxcbiAgICAgICAgcGF0aHM6IHtcbiAgICAgICAgfSxcbiAgICAgICAgdHlwZVJvb3RzOiBbYCR7ZHJjcEhvbWV9L25vZGVfbW9kdWxlcy9AdHlwZXNgXVxuICAgICAgfVxuICAgIH07XG4gICAgZm9yIChjb25zdCBkZXAgb2YgcGVlckRlcHMpIHtcbiAgICAgIHRzY29uZmlnRHJjcC5jb21waWxlck9wdGlvbnMucGF0aHNbZGVwXSA9IFsnbm9kZV9tb2R1bGVzLycgKyBkZXBdO1xuICAgICAgdHNjb25maWdEcmNwLmNvbXBpbGVyT3B0aW9ucy5wYXRoc1tkZXAgKyAnLyonXSA9IFsnbm9kZV9tb2R1bGVzLycgKyBkZXAgKyAnLyonXTtcbiAgICB9XG5cbiAgICBmcy53cml0ZUZpbGVTeW5jKCd0c2NvbmZpZy1kcmNwLmpzb24nLCBKU09OLnN0cmluZ2lmeSh0c2NvbmZpZ0RyY3AsIG51bGwsICcgICcpKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKCd0c2MtZHJjcC5zaCcsXG4gICAgICAnLi9ub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL25vZGVfbW9kdWxlcy8uYmluL3RzYyAtcCB0c2NvbmZpZy1kcmNwLmpzb24gJConKTtcbiAgICBpZiAoaXNXaW4zMikge1xuICAgICAgZnMud3JpdGVGaWxlU3luYygndHNjLWRyY3AuYmF0JyxcbiAgICAgICAgJy5cXFxcbm9kZV9tb2R1bGVzXFxcXGRyLWNvbXAtcGFja2FnZVxcXFxub2RlX21vZHVsZXNcXFxcLmJpblxcXFx0c2MgLXAgdHNjb25maWctZHJjcC5qc29uICUqJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZzLmNobW9kU3luYygndHNjLWRyY3Auc2gnLCAwbzc3Nyk7XG4gICAgfVxuICB9XG59XG4iXX0=