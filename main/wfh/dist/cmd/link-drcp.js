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
    if (isWin32) {
        // tslint:disable-next-line: max-line-length
        fs.writeFileSync('tsc-drcp.bat', '.\\node_modules\\dr-comp-package\\node_modules\\.bin\\tsc -p tsconfig-drcp.json %*');
    }
    else {
        fs.writeFileSync('tsc-drcp.sh', './node_modules/dr-comp-package/node_modules/.bin/tsc -p tsconfig-drcp.json $*');
        fs.chmodSync('tsc-drcp.sh', 0o777);
    }
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluay1kcmNwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2xpbmstZHJjcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLGdEQUEyQztBQUMzQyw0Q0FBb0I7QUFDcEIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFDaEQsTUFBTSxPQUFPLEdBQUcsWUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFcEQ7SUFDRSxtQkFBUSxFQUFFLENBQUM7SUFFWCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUU1RCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDckcsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUM7UUFDdkIsUUFBUSxHQUFHLEdBQUcsQ0FBQztTQUNaLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztRQUNoQyxRQUFRLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQztJQUU3QixNQUFNLFlBQVksR0FBRztRQUNuQixPQUFPLEVBQUUsR0FBRyxRQUFRLHlCQUF5QjtRQUM3QyxlQUFlLEVBQUU7WUFDZixPQUFPLEVBQUUsR0FBRztZQUNaLEtBQUssRUFBRSxFQUNOO1lBQ0QsU0FBUyxFQUFFLENBQUMsR0FBRyxRQUFRLHNCQUFzQixDQUFDO1NBQy9DO0tBQ0YsQ0FBQztJQUNGLEtBQUssTUFBTSxHQUFHLElBQUksUUFBUSxFQUFFO1FBQzFCLFlBQVksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ2xFLFlBQVksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUM7S0FDakY7SUFFRCxFQUFFLENBQUMsYUFBYSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRWpGLElBQUksT0FBTyxFQUFFO1FBQ1gsNENBQTRDO1FBQzVDLEVBQUUsQ0FBQyxhQUFhLENBQUMsY0FBYyxFQUFFLG9GQUFvRixDQUFDLENBQUM7S0FDeEg7U0FBTTtRQUNMLEVBQUUsQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLCtFQUErRSxDQUFDLENBQUM7UUFDakgsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDcEM7QUFDSCxDQUFDO0FBbENELDRCQWtDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQge2xpbmtEcmNwfSBmcm9tICcuLi91dGlscy9zeW1saW5rcyc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuY29uc3QgcGtKc29uID0gcmVxdWlyZSgnLi4vLi4vLi4vcGFja2FnZS5qc29uJyk7XG5jb25zdCBpc1dpbjMyID0gb3MucGxhdGZvcm0oKS5pbmRleE9mKCd3aW4zMicpID49IDA7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICBsaW5rRHJjcCgpO1xuXG4gIGNvbnN0IHBlZXJEZXBzID0gT2JqZWN0LmtleXMocGtKc29uLnBlZXJEZXBlbmRlbmNpZXMgfHwgW10pO1xuXG4gIGxldCBkcmNwSG9tZSA9IFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uLy4uJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgaWYgKGRyY3BIb21lLmxlbmd0aCA9PT0gMClcbiAgICBkcmNwSG9tZSA9ICcuJztcbiAgZWxzZSBpZiAoIWRyY3BIb21lLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICBkcmNwSG9tZSA9ICcuLycgKyBkcmNwSG9tZTtcblxuICBjb25zdCB0c2NvbmZpZ0RyY3AgPSB7XG4gICAgZXh0ZW5kczogYCR7ZHJjcEhvbWV9L3dmaC90c2NvbmZpZy1iYXNlLmpzb25gLFxuICAgIGNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgYmFzZVVybDogJy4nLFxuICAgICAgcGF0aHM6IHtcbiAgICAgIH0sXG4gICAgICB0eXBlUm9vdHM6IFtgJHtkcmNwSG9tZX0vbm9kZV9tb2R1bGVzL0B0eXBlc2BdXG4gICAgfVxuICB9O1xuICBmb3IgKGNvbnN0IGRlcCBvZiBwZWVyRGVwcykge1xuICAgIHRzY29uZmlnRHJjcC5jb21waWxlck9wdGlvbnMucGF0aHNbZGVwXSA9IFsnbm9kZV9tb2R1bGVzLycgKyBkZXBdO1xuICAgIHRzY29uZmlnRHJjcC5jb21waWxlck9wdGlvbnMucGF0aHNbZGVwICsgJy8qJ10gPSBbJ25vZGVfbW9kdWxlcy8nICsgZGVwICsgJy8qJ107XG4gIH1cblxuICBmcy53cml0ZUZpbGVTeW5jKCd0c2NvbmZpZy1kcmNwLmpzb24nLCBKU09OLnN0cmluZ2lmeSh0c2NvbmZpZ0RyY3AsIG51bGwsICcgICcpKTtcblxuICBpZiAoaXNXaW4zMikge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgZnMud3JpdGVGaWxlU3luYygndHNjLWRyY3AuYmF0JywgJy5cXFxcbm9kZV9tb2R1bGVzXFxcXGRyLWNvbXAtcGFja2FnZVxcXFxub2RlX21vZHVsZXNcXFxcLmJpblxcXFx0c2MgLXAgdHNjb25maWctZHJjcC5qc29uICUqJyk7XG4gIH0gZWxzZSB7XG4gICAgZnMud3JpdGVGaWxlU3luYygndHNjLWRyY3Auc2gnLCAnLi9ub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL25vZGVfbW9kdWxlcy8uYmluL3RzYyAtcCB0c2NvbmZpZy1kcmNwLmpzb24gJConKTtcbiAgICBmcy5jaG1vZFN5bmMoJ3RzYy1kcmNwLnNoJywgMG83NzcpO1xuICB9XG59XG4iXX0=