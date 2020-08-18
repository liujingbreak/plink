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
    fs.writeFileSync('tsc-drcp.sh', './node_modules/dr-comp-package/node_modules/.bin/tsc -p tsconfig-drcp.json $*');
    if (isWin32) {
        fs.writeFileSync('tsc-drcp.bat', '.\\node_modules\\dr-comp-package\\node_modules\\.bin\\tsc -p tsconfig-drcp.json %*');
    }
    else {
        fs.chmodSync('tsc-drcp.sh', 0o777);
    }
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluay1kcmNwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2xpbmstZHJjcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLGdEQUEyQztBQUMzQyw0Q0FBb0I7QUFDcEIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFDaEQsTUFBTSxPQUFPLEdBQUcsWUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFcEQ7SUFDRSxtQkFBUSxFQUFFLENBQUM7SUFFWCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUU1RCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDckcsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUM7UUFDdkIsUUFBUSxHQUFHLEdBQUcsQ0FBQztTQUNaLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztRQUNoQyxRQUFRLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQztJQUU3QixNQUFNLFlBQVksR0FBRztRQUNuQixPQUFPLEVBQUUsR0FBRyxRQUFRLHlCQUF5QjtRQUM3QyxlQUFlLEVBQUU7WUFDZixPQUFPLEVBQUUsR0FBRztZQUNaLEtBQUssRUFBRSxFQUNOO1lBQ0QsU0FBUyxFQUFFLENBQUMsR0FBRyxRQUFRLHNCQUFzQixDQUFDO1NBQy9DO0tBQ0YsQ0FBQztJQUNGLEtBQUssTUFBTSxHQUFHLElBQUksUUFBUSxFQUFFO1FBQzFCLFlBQVksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ2xFLFlBQVksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUM7S0FDakY7SUFFRCxFQUFFLENBQUMsYUFBYSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2pGLEVBQUUsQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUM1QiwrRUFBK0UsQ0FBQyxDQUFDO0lBQ25GLElBQUksT0FBTyxFQUFFO1FBQ1gsRUFBRSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQzdCLG9GQUFvRixDQUFDLENBQUM7S0FDekY7U0FBTTtRQUNMLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ3BDO0FBQ0gsQ0FBQztBQWxDRCw0QkFrQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtsaW5rRHJjcH0gZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmNvbnN0IHBrSnNvbiA9IHJlcXVpcmUoJy4uLy4uLy4uL3BhY2thZ2UuanNvbicpO1xuY29uc3QgaXNXaW4zMiA9IG9zLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgbGlua0RyY3AoKTtcblxuICBjb25zdCBwZWVyRGVwcyA9IE9iamVjdC5rZXlzKHBrSnNvbi5wZWVyRGVwZW5kZW5jaWVzIHx8IFtdKTtcblxuICBsZXQgZHJjcEhvbWUgPSBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi8uLicpKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIGlmIChkcmNwSG9tZS5sZW5ndGggPT09IDApXG4gICAgZHJjcEhvbWUgPSAnLic7XG4gIGVsc2UgaWYgKCFkcmNwSG9tZS5zdGFydHNXaXRoKCcuJykpXG4gICAgZHJjcEhvbWUgPSAnLi8nICsgZHJjcEhvbWU7XG5cbiAgY29uc3QgdHNjb25maWdEcmNwID0ge1xuICAgIGV4dGVuZHM6IGAke2RyY3BIb21lfS93ZmgvdHNjb25maWctYmFzZS5qc29uYCxcbiAgICBjb21waWxlck9wdGlvbnM6IHtcbiAgICAgIGJhc2VVcmw6ICcuJyxcbiAgICAgIHBhdGhzOiB7XG4gICAgICB9LFxuICAgICAgdHlwZVJvb3RzOiBbYCR7ZHJjcEhvbWV9L25vZGVfbW9kdWxlcy9AdHlwZXNgXVxuICAgIH1cbiAgfTtcbiAgZm9yIChjb25zdCBkZXAgb2YgcGVlckRlcHMpIHtcbiAgICB0c2NvbmZpZ0RyY3AuY29tcGlsZXJPcHRpb25zLnBhdGhzW2RlcF0gPSBbJ25vZGVfbW9kdWxlcy8nICsgZGVwXTtcbiAgICB0c2NvbmZpZ0RyY3AuY29tcGlsZXJPcHRpb25zLnBhdGhzW2RlcCArICcvKiddID0gWydub2RlX21vZHVsZXMvJyArIGRlcCArICcvKiddO1xuICB9XG5cbiAgZnMud3JpdGVGaWxlU3luYygndHNjb25maWctZHJjcC5qc29uJywgSlNPTi5zdHJpbmdpZnkodHNjb25maWdEcmNwLCBudWxsLCAnICAnKSk7XG4gIGZzLndyaXRlRmlsZVN5bmMoJ3RzYy1kcmNwLnNoJyxcbiAgICAnLi9ub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL25vZGVfbW9kdWxlcy8uYmluL3RzYyAtcCB0c2NvbmZpZy1kcmNwLmpzb24gJConKTtcbiAgaWYgKGlzV2luMzIpIHtcbiAgICBmcy53cml0ZUZpbGVTeW5jKCd0c2MtZHJjcC5iYXQnLFxuICAgICAgJy5cXFxcbm9kZV9tb2R1bGVzXFxcXGRyLWNvbXAtcGFja2FnZVxcXFxub2RlX21vZHVsZXNcXFxcLmJpblxcXFx0c2MgLXAgdHNjb25maWctZHJjcC5qc29uICUqJyk7XG4gIH0gZWxzZSB7XG4gICAgZnMuY2htb2RTeW5jKCd0c2MtZHJjcC5zaCcsIDBvNzc3KTtcbiAgfVxufVxuIl19