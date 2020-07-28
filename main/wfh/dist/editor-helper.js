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
exports.writeTsconfig4Editor = void 0;
const path_1 = __importDefault(require("path"));
const _fs = __importStar(require("fs-extra"));
const utils_1 = require("./utils");
const package_mgr_1 = require("./package-mgr");
const { parse } = require('comment-json');
function writeTsconfig4Editor(projectDirs) {
    const tsjson = {
        extends: null
    };
    // ------- Write tsconfig.json for Visual Code Editor --------
    let srcDirCount = 0;
    const root = utils_1.getRootDir();
    const recipeManager = require('./recipe-manager');
    for (const proj of projectDirs) {
        tsjson.include = [];
        tsjson.extends = path_1.default.relative(proj, require.resolve('dr-comp-package/wfh/tsconfig.json'));
        if (!path_1.default.isAbsolute(tsjson.extends) && !tsjson.extends.startsWith('..')) {
            tsjson.extends = './' + tsjson.extends;
        }
        tsjson.extends = tsjson.extends.replace(/\\/g, '/');
        recipeManager.eachRecipeSrc(proj, (srcDir) => {
            let includeDir = path_1.default.relative(proj, srcDir).replace(/\\/g, '/');
            if (includeDir && includeDir !== '/')
                includeDir += '/';
            tsjson.include.push(includeDir + '**/*.ts');
            tsjson.include.push(includeDir + '**/*.tsx');
            srcDirCount++;
        });
        const pathMapping = {};
        for (const [name, { realPath }] of Object.entries(package_mgr_1.getState().srcPackages || {})) {
            const realDir = path_1.default.relative(proj, realPath).replace(/\\/g, '/');
            pathMapping[name] = [realDir];
            pathMapping[name + '/*'] = [realDir + '/*'];
        }
        const drcpDir = path_1.default.relative(root, _fs.realpathSync('node_modules/dr-comp-package')).replace(/\\/g, '/');
        pathMapping['dr-comp-package'] = [drcpDir];
        pathMapping['dr-comp-package/*'] = [drcpDir + '/*'];
        // pathMapping['*'] = ['node_modules/*', 'node_modules/@types/*'];
        tsjson.compilerOptions = {
            rootDir: '../',
            baseUrl: root,
            // noResolve: true, // Do not add this, VC will not be able to understand rxjs module
            paths: pathMapping,
            skipLibCheck: false,
            jsx: 'preserve',
            typeRoots: [
                path_1.default.join(root, 'node_modules/@types')
                // Path.join(root, 'node_modules/@dr-types')
            ],
            noImplicitAny: true,
            target: 'es2015',
            module: 'commonjs'
        };
        const tsconfigFile = path_1.default.resolve(proj, 'tsconfig.json');
        if (_fs.existsSync(tsconfigFile)) {
            const existing = _fs.readFileSync(tsconfigFile, 'utf8');
            const existingJson = parse(existing);
            const co = existingJson.compilerOptions;
            if (!co.jsx) {
                co.jsx = 'preserve';
            }
            const newCo = tsjson.compilerOptions;
            co.typeRoots = newCo.typeRoots;
            co.baseUrl = newCo.baseUrl;
            co.paths = newCo.paths;
            co.rootDir = newCo.rootDir;
            existingJson.extends = tsjson.extends;
            existingJson.include = tsjson.include;
            const newJsonStr = JSON.stringify(existingJson, null, '  ');
            if (newJsonStr !== existing) {
                // tslint:disable-next-line: no-console
                console.log('[editor-helper] Write tsconfig.json to ' + proj);
                _fs.writeFileSync(tsconfigFile, JSON.stringify(existingJson, null, '  '));
            }
            else {
                // tslint:disable-next-line: no-console
                console.log(`[editor-helper] ${tsconfigFile} is not changed.`);
            }
        }
        else {
            // tslint:disable-next-line: no-console
            console.log('[editor-helper] Create tsconfig.json to ' + proj);
            _fs.writeFileSync(tsconfigFile, JSON.stringify(tsjson, null, '  '));
        }
    }
    if (srcDirCount > 0) {
        // tslint:disable-next-line: no-console
        console.log('[editor-helper]\n' + utils_1.boxString('To be friendly to your editor, we just added tsconfig.json file to each of your project directories,\n' +
            'But please add "tsconfig.json" to your .gitingore file,\n' +
            'since these tsconfig.json are generated based on your local workspace location.'));
    }
}
exports.writeTsconfig4Editor = writeTsconfig4Editor;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUN4Qiw4Q0FBZ0M7QUFDaEMsbUNBQWdEO0FBRWhELCtDQUF1QztBQUV2QyxNQUFNLEVBQUMsS0FBSyxFQUFDLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBRXhDLFNBQWdCLG9CQUFvQixDQUFDLFdBQXFCO0lBQ3hELE1BQU0sTUFBTSxHQUFRO1FBQ2xCLE9BQU8sRUFBRSxJQUFJO0tBQ2QsQ0FBQztJQUNGLDhEQUE4RDtJQUU5RCxJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUM7SUFDcEIsTUFBTSxJQUFJLEdBQUcsa0JBQVUsRUFBRSxDQUFDO0lBRzFCLE1BQU0sYUFBYSxHQUFpQixPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUVoRSxLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVcsRUFBRTtRQUM5QixNQUFNLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNwQixNQUFNLENBQUMsT0FBTyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxDQUFDO1FBQzNGLElBQUksQ0FBQyxjQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3hFLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7U0FDeEM7UUFDRCxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNwRCxhQUFhLENBQUMsYUFB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ICdwYXRoJztcbmltcG9ydCAqIGFzIF9mcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgeyBib3hTdHJpbmcsIGdldFJvb3REaXIgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCAqIGFzIF9yZWNwIGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuaW1wb3J0IHtnZXRTdGF0ZX0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5cbmNvbnN0IHtwYXJzZX0gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlVHNjb25maWc0RWRpdG9yKHByb2plY3REaXJzOiBzdHJpbmdbXSkge1xuICBjb25zdCB0c2pzb246IGFueSA9IHtcbiAgICBleHRlbmRzOiBudWxsXG4gIH07XG4gIC8vIC0tLS0tLS0gV3JpdGUgdHNjb25maWcuanNvbiBmb3IgVmlzdWFsIENvZGUgRWRpdG9yIC0tLS0tLS0tXG5cbiAgbGV0IHNyY0RpckNvdW50ID0gMDtcbiAgY29uc3Qgcm9vdCA9IGdldFJvb3REaXIoKTtcblxuXG4gIGNvbnN0IHJlY2lwZU1hbmFnZXI6IHR5cGVvZiBfcmVjcCA9IHJlcXVpcmUoJy4vcmVjaXBlLW1hbmFnZXInKTtcblxuICBmb3IgKGNvbnN0IHByb2ogb2YgcHJvamVjdERpcnMpIHtcbiAgICB0c2pzb24uaW5jbHVkZSA9IFtdO1xuICAgIHRzanNvbi5leHRlbmRzID0gUGF0aC5yZWxhdGl2ZShwcm9qLCByZXF1aXJlLnJlc29sdmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvdHNjb25maWcuanNvbicpKTtcbiAgICBpZiAoIVBhdGguaXNBYnNvbHV0ZSh0c2pzb24uZXh0ZW5kcykgJiYgIXRzanNvbi5leHRlbmRzLnN0YXJ0c1dpdGgoJy4uJykpIHtcbiAgICAgIHRzanNvbi5leHRlbmRzID0gJy4vJyArIHRzanNvbi5leHRlbmRzO1xuICAgIH1cbiAgICB0c2pzb24uZXh0ZW5kcyA9IHRzanNvbi5leHRlbmRzLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICByZWNpcGVNYW5hZ2VyLmVhY2hSZWNpcGVTcmMocHJvaiwgKHNyY0Rpcjogc3RyaW5nKSA9PiB7XG4gICAgICBsZXQgaW5jbHVkZURpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBpZiAoaW5jbHVkZURpciAmJiBpbmNsdWRlRGlyICE9PSAnLycpXG4gICAgICAgIGluY2x1ZGVEaXIgKz0gJy8nO1xuICAgICAgdHNqc29uLmluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHMnKTtcbiAgICAgIHRzanNvbi5pbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzeCcpO1xuICAgICAgc3JjRGlyQ291bnQrKztcbiAgICB9KTtcblxuICAgIGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG4gICAgZm9yIChjb25zdCBbbmFtZSwge3JlYWxQYXRofV0gb2YgT2JqZWN0LmVudHJpZXMoZ2V0U3RhdGUoKSEuc3JjUGFja2FnZXMgfHwge30pKSB7XG4gICAgICBjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCByZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgcGF0aE1hcHBpbmdbbmFtZV0gPSBbcmVhbERpcl07XG4gICAgICBwYXRoTWFwcGluZ1tuYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuICAgIH1cblxuICAgIGNvbnN0IGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKHJvb3QsIF9mcy5yZWFscGF0aFN5bmMoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhdGhNYXBwaW5nWydkci1jb21wLXBhY2thZ2UnXSA9IFtkcmNwRGlyXTtcbiAgICBwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG4gICAgLy8gcGF0aE1hcHBpbmdbJyonXSA9IFsnbm9kZV9tb2R1bGVzLyonLCAnbm9kZV9tb2R1bGVzL0B0eXBlcy8qJ107XG5cbiAgICB0c2pzb24uY29tcGlsZXJPcHRpb25zID0ge1xuICAgICAgcm9vdERpcjogJy4uLycsXG4gICAgICBiYXNlVXJsOiByb290LFxuICAgICAgLy8gbm9SZXNvbHZlOiB0cnVlLCAvLyBEbyBub3QgYWRkIHRoaXMsIFZDIHdpbGwgbm90IGJlIGFibGUgdG8gdW5kZXJzdGFuZCByeGpzIG1vZHVsZVxuICAgICAgcGF0aHM6IHBhdGhNYXBwaW5nLFxuICAgICAgc2tpcExpYkNoZWNrOiBmYWxzZSxcbiAgICAgIGpzeDogJ3ByZXNlcnZlJyxcbiAgICAgIHR5cGVSb290czogW1xuICAgICAgICBQYXRoLmpvaW4ocm9vdCwgJ25vZGVfbW9kdWxlcy9AdHlwZXMnKVxuICAgICAgICAvLyBQYXRoLmpvaW4ocm9vdCwgJ25vZGVfbW9kdWxlcy9AZHItdHlwZXMnKVxuICAgICAgXSxcbiAgICAgIG5vSW1wbGljaXRBbnk6IHRydWUsXG4gICAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgICAgbW9kdWxlOiAnY29tbW9uanMnXG4gICAgfTtcbiAgICBjb25zdCB0c2NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUocHJvaiwgJ3RzY29uZmlnLmpzb24nKTtcbiAgICBpZiAoX2ZzLmV4aXN0c1N5bmModHNjb25maWdGaWxlKSkge1xuICAgICAgY29uc3QgZXhpc3RpbmcgPSBfZnMucmVhZEZpbGVTeW5jKHRzY29uZmlnRmlsZSwgJ3V0ZjgnKTtcbiAgICAgIGNvbnN0IGV4aXN0aW5nSnNvbiA9IHBhcnNlKGV4aXN0aW5nKTtcbiAgICAgIGNvbnN0IGNvID0gZXhpc3RpbmdKc29uLmNvbXBpbGVyT3B0aW9ucztcbiAgICAgIGlmICghY28uanN4KSB7XG4gICAgICAgIGNvLmpzeCA9ICdwcmVzZXJ2ZSc7XG4gICAgICB9XG4gICAgICBjb25zdCBuZXdDbyA9IHRzanNvbi5jb21waWxlck9wdGlvbnM7XG4gICAgICBjby50eXBlUm9vdHMgPSBuZXdDby50eXBlUm9vdHM7XG4gICAgICBjby5iYXNlVXJsID0gbmV3Q28uYmFzZVVybDtcbiAgICAgIGNvLnBhdGhzID0gbmV3Q28ucGF0aHM7XG4gICAgICBjby5yb290RGlyID0gbmV3Q28ucm9vdERpcjtcblxuICAgICAgZXhpc3RpbmdKc29uLmV4dGVuZHMgPSB0c2pzb24uZXh0ZW5kcztcbiAgICAgIGV4aXN0aW5nSnNvbi5pbmNsdWRlID0gdHNqc29uLmluY2x1ZGU7XG5cbiAgICAgIGNvbnN0IG5ld0pzb25TdHIgPSBKU09OLnN0cmluZ2lmeShleGlzdGluZ0pzb24sIG51bGwsICcgICcpO1xuICAgICAgaWYgKG5ld0pzb25TdHIgIT09IGV4aXN0aW5nKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZygnW2VkaXRvci1oZWxwZXJdIFdyaXRlIHRzY29uZmlnLmpzb24gdG8gJyArIHByb2opO1xuICAgICAgICBfZnMud3JpdGVGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsIEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKGBbZWRpdG9yLWhlbHBlcl0gJHt0c2NvbmZpZ0ZpbGV9IGlzIG5vdCBjaGFuZ2VkLmApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKCdbZWRpdG9yLWhlbHBlcl0gQ3JlYXRlIHRzY29uZmlnLmpzb24gdG8gJyArIHByb2opO1xuICAgICAgX2ZzLndyaXRlRmlsZVN5bmModHNjb25maWdGaWxlLCBKU09OLnN0cmluZ2lmeSh0c2pzb24sIG51bGwsICcgICcpKTtcbiAgICB9XG4gIH1cblxuXG4gIGlmIChzcmNEaXJDb3VudCA+IDApIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnW2VkaXRvci1oZWxwZXJdXFxuJyArIGJveFN0cmluZygnVG8gYmUgZnJpZW5kbHkgdG8geW91ciBlZGl0b3IsIHdlIGp1c3QgYWRkZWQgdHNjb25maWcuanNvbiBmaWxlIHRvIGVhY2ggb2YgeW91ciBwcm9qZWN0IGRpcmVjdG9yaWVzLFxcbicgK1xuICAgICdCdXQgcGxlYXNlIGFkZCBcInRzY29uZmlnLmpzb25cIiB0byB5b3VyIC5naXRpbmdvcmUgZmlsZSxcXG4nICtcbiAgICAnc2luY2UgdGhlc2UgdHNjb25maWcuanNvbiBhcmUgZ2VuZXJhdGVkIGJhc2VkIG9uIHlvdXIgbG9jYWwgd29ya3NwYWNlIGxvY2F0aW9uLicpKTtcbiAgfVxufVxuIl19