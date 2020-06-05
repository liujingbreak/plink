"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const _fs = __importStar(require("fs-extra"));
const utils_1 = require("./utils");
const config = require('../lib/config');
const { parse } = require('comment-json');
function writeTsconfig4Editor() {
    const tsjson = {
        extends: null
    };
    // ------- Write tsconfig.json for Visual Code Editor --------
    let srcDirCount = 0;
    const root = process.cwd(); // api.config().rootPath;
    const packageToRealPath = [];
    require('dr-comp-package/wfh/lib/packageMgr/packageUtils')
        .findAllPackages((name, entryPath, parsedName, json, packagePath) => {
        const realDir = _fs.realpathSync(packagePath);
        // Path.relative(root, realDir).replace(/\\/g, '/');
        packageToRealPath.push([name, realDir]);
    }, 'src');
    const recipeManager = require('dr-comp-package/wfh/dist/recipe-manager');
    for (const proj of config().projectList) {
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
        for (const [name, realPath] of packageToRealPath) {
            const realDir = path_1.default.relative(proj, realPath).replace(/\\/g, '/');
            pathMapping[name] = [realDir];
            pathMapping[name + '/*'] = [realDir + '/*'];
        }
        const drcpDir = path_1.default.relative(root, _fs.realpathSync('node_modules/dr-comp-package')).replace(/\\/g, '/');
        pathMapping['dr-comp-package'] = [drcpDir];
        pathMapping['dr-comp-package/*'] = [drcpDir + '/*'];
        // pathMapping['*'] = ['node_modules/*', 'node_modules/@types/*'];
        tsjson.compilerOptions = {
            rootDir: './',
            baseUrl: root,
            // noResolve: true, // Do not add this, VC will not be able to understand rxjs module
            paths: pathMapping,
            skipLibCheck: false,
            jsx: 'preserve',
            // typeRoots: [
            //   Path.join(root, 'node_modules/@types'),
            //   Path.join(root, 'node_modules/@dr-types'),
            //   Path.join(Path.dirname(require.resolve('dr-comp-package/package.json')), '/wfh/types')
            // ],
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
            console.log('[editor-helper] Write tsconfig.json to ' + proj);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLDhDQUFnQztBQUNoQyxtQ0FBb0M7QUFFcEMsTUFBTSxNQUFNLEdBQWUsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBRXBELE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFFeEMsU0FBZ0Isb0JBQW9CO0lBQ2xDLE1BQU0sTUFBTSxHQUFRO1FBQ2xCLE9BQU8sRUFBRSxJQUFJO0tBQ2QsQ0FBQztJQUNGLDhEQUE4RDtJQUU5RCxJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUM7SUFDcEIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMseUJBQXlCO0lBRXJELE1BQU0saUJBQWlCLEdBQTRCLEVBQUUsQ0FBQztJQUN0RCxPQUFPLENBQUMsaURBQWlELENBQUM7U0FDekQsZUFBZSxDQUFDLENBQUMsSUFBWSxFQUFFLFNBQWlCLEVBQUUsVUFBa0IsRUFBRSxJQUFTLEVBQUUsV0FBbUIsRUFBRSxFQUFFO1FBQ3ZHLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUMsb0RBQW9EO1FBQ3BELGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUVWLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO0lBRXpFLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxFQUFFLENBQUMsV0FBVyxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxPQUFPLEdB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QVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDckU7S0FDRjtJQUdELElBQUksV0FBVyxHQUFHLENBQUMsRUFBRTtRQUNuQix1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsR0FBRyxpQkFBUyxDQUFDLHdHQUF3RztZQUNwSiwyREFBMkQ7WUFDM0QsaUZBQWlGLENBQUMsQ0FBQyxDQUFDO0tBQ3JGO0FBQ0gsQ0FBQztBQXZHRCxvREF1R0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF9mcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgeyBib3hTdHJpbmcgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7RHJjcENvbmZpZ30gZnJvbSAnLi9jb25maWctaGFuZGxlcic7XG5jb25zdCBjb25maWc6IERyY3BDb25maWcgPSByZXF1aXJlKCcuLi9saWIvY29uZmlnJyk7XG5cbmNvbnN0IHtwYXJzZX0gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlVHNjb25maWc0RWRpdG9yKCkge1xuICBjb25zdCB0c2pzb246IGFueSA9IHtcbiAgICBleHRlbmRzOiBudWxsXG4gIH07XG4gIC8vIC0tLS0tLS0gV3JpdGUgdHNjb25maWcuanNvbiBmb3IgVmlzdWFsIENvZGUgRWRpdG9yIC0tLS0tLS0tXG5cbiAgbGV0IHNyY0RpckNvdW50ID0gMDtcbiAgY29uc3Qgcm9vdCA9IHByb2Nlc3MuY3dkKCk7IC8vIGFwaS5jb25maWcoKS5yb290UGF0aDtcblxuICBjb25zdCBwYWNrYWdlVG9SZWFsUGF0aDogQXJyYXk8W3N0cmluZywgc3RyaW5nXT4gPSBbXTtcbiAgcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKVxuICAuZmluZEFsbFBhY2thZ2VzKChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiBzdHJpbmcsIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHJlYWxEaXIgPSBfZnMucmVhbHBhdGhTeW5jKHBhY2thZ2VQYXRoKTtcbiAgICAvLyBQYXRoLnJlbGF0aXZlKHJvb3QsIHJlYWxEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYWNrYWdlVG9SZWFsUGF0aC5wdXNoKFtuYW1lLCByZWFsRGlyXSk7XG4gIH0sICdzcmMnKTtcblxuICBjb25zdCByZWNpcGVNYW5hZ2VyID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3JlY2lwZS1tYW5hZ2VyJyk7XG5cbiAgZm9yIChjb25zdCBwcm9qIG9mIGNvbmZpZygpLnByb2plY3RMaXN0KSB7XG4gICAgdHNqc29uLmluY2x1ZGUgPSBbXTtcbiAgICB0c2pzb24uZXh0ZW5kcyA9IFBhdGgucmVsYXRpdmUocHJvaiwgcmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL3RzY29uZmlnLmpzb24nKSk7XG4gICAgaWYgKCFQYXRoLmlzQWJzb2x1dGUodHNqc29uLmV4dGVuZHMpICYmICF0c2pzb24uZXh0ZW5kcy5zdGFydHNXaXRoKCcuLicpKSB7XG4gICAgICB0c2pzb24uZXh0ZW5kcyA9ICcuLycgKyB0c2pzb24uZXh0ZW5kcztcbiAgICB9XG4gICAgdHNqc29uLmV4dGVuZHMgPSB0c2pzb24uZXh0ZW5kcy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcmVjaXBlTWFuYWdlci5lYWNoUmVjaXBlU3JjKHByb2osIChzcmNEaXI6IHN0cmluZykgPT4ge1xuICAgICAgbGV0IGluY2x1ZGVEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgaWYgKGluY2x1ZGVEaXIgJiYgaW5jbHVkZURpciAhPT0gJy8nKVxuICAgICAgICBpbmNsdWRlRGlyICs9ICcvJztcbiAgICAgIHRzanNvbi5pbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzJyk7XG4gICAgICB0c2pzb24uaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50c3gnKTtcbiAgICAgIHNyY0RpckNvdW50Kys7XG4gICAgfSk7XG5cbiAgICBjb25zdCBwYXRoTWFwcGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSA9IHt9O1xuICAgIGZvciAoY29uc3QgW25hbWUsIHJlYWxQYXRoXSBvZiBwYWNrYWdlVG9SZWFsUGF0aCkge1xuICAgICAgY29uc3QgcmVhbERpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgcmVhbFBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIHBhdGhNYXBwaW5nW25hbWVdID0gW3JlYWxEaXJdO1xuICAgICAgcGF0aE1hcHBpbmdbbmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcbiAgICB9XG5cbiAgICBjb25zdCBkcmNwRGlyID0gUGF0aC5yZWxhdGl2ZShyb290LCBfZnMucmVhbHBhdGhTeW5jKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlJ10gPSBbZHJjcERpcl07XG4gICAgcGF0aE1hcHBpbmdbJ2RyLWNvbXAtcGFja2FnZS8qJ10gPSBbZHJjcERpciArICcvKiddO1xuICAgIC8vIHBhdGhNYXBwaW5nWycqJ10gPSBbJ25vZGVfbW9kdWxlcy8qJywgJ25vZGVfbW9kdWxlcy9AdHlwZXMvKiddO1xuXG4gICAgdHNqc29uLmNvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICAgIHJvb3REaXI6ICcuLycsXG4gICAgICBiYXNlVXJsOiByb290LFxuICAgICAgLy8gbm9SZXNvbHZlOiB0cnVlLCAvLyBEbyBub3QgYWRkIHRoaXMsIFZDIHdpbGwgbm90IGJlIGFibGUgdG8gdW5kZXJzdGFuZCByeGpzIG1vZHVsZVxuICAgICAgcGF0aHM6IHBhdGhNYXBwaW5nLFxuICAgICAgc2tpcExpYkNoZWNrOiBmYWxzZSxcbiAgICAgIGpzeDogJ3ByZXNlcnZlJyxcbiAgICAgIC8vIHR5cGVSb290czogW1xuICAgICAgLy8gICBQYXRoLmpvaW4ocm9vdCwgJ25vZGVfbW9kdWxlcy9AdHlwZXMnKSxcbiAgICAgIC8vICAgUGF0aC5qb2luKHJvb3QsICdub2RlX21vZHVsZXMvQGRyLXR5cGVzJyksXG4gICAgICAvLyAgIFBhdGguam9pbihQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2UvcGFja2FnZS5qc29uJykpLCAnL3dmaC90eXBlcycpXG4gICAgICAvLyBdLFxuICAgICAgbm9JbXBsaWNpdEFueTogdHJ1ZSxcbiAgICAgIHRhcmdldDogJ2VzMjAxNScsXG4gICAgICBtb2R1bGU6ICdjb21tb25qcydcbiAgICB9O1xuICAgIGNvbnN0IHRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qLCAndHNjb25maWcuanNvbicpO1xuICAgIGlmIChfZnMuZXhpc3RzU3luYyh0c2NvbmZpZ0ZpbGUpKSB7XG4gICAgICBjb25zdCBleGlzdGluZyA9IF9mcy5yZWFkRmlsZVN5bmModHNjb25maWdGaWxlLCAndXRmOCcpO1xuICAgICAgY29uc3QgZXhpc3RpbmdKc29uID0gcGFyc2UoZXhpc3RpbmcpO1xuICAgICAgY29uc3QgY28gPSBleGlzdGluZ0pzb24uY29tcGlsZXJPcHRpb25zO1xuICAgICAgaWYgKCFjby5qc3gpIHtcbiAgICAgICAgY28uanN4ID0gJ3ByZXNlcnZlJztcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5ld0NvID0gdHNqc29uLmNvbXBpbGVyT3B0aW9ucztcbiAgICAgIGNvLnR5cGVSb290cyA9IG5ld0NvLnR5cGVSb290cztcbiAgICAgIGNvLmJhc2VVcmwgPSBuZXdDby5iYXNlVXJsO1xuICAgICAgY28ucGF0aHMgPSBuZXdDby5wYXRocztcbiAgICAgIGNvLnJvb3REaXIgPSBuZXdDby5yb290RGlyO1xuXG4gICAgICBleGlzdGluZ0pzb24uZXh0ZW5kcyA9IHRzanNvbi5leHRlbmRzO1xuICAgICAgZXhpc3RpbmdKc29uLmluY2x1ZGUgPSB0c2pzb24uaW5jbHVkZTtcblxuICAgICAgY29uc3QgbmV3SnNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJyk7XG4gICAgICBpZiAobmV3SnNvblN0ciAhPT0gZXhpc3RpbmcpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKCdbZWRpdG9yLWhlbHBlcl0gV3JpdGUgdHNjb25maWcuanNvbiB0byAnICsgcHJvaik7XG4gICAgICAgIF9mcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coYFtlZGl0b3ItaGVscGVyXSAke3RzY29uZmlnRmlsZX0gaXMgbm90IGNoYW5nZWQuYCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ1tlZGl0b3ItaGVscGVyXSBXcml0ZSB0c2NvbmZpZy5qc29uIHRvICcgKyBwcm9qKTtcbiAgICAgIF9mcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKSk7XG4gICAgfVxuICB9XG5cblxuICBpZiAoc3JjRGlyQ291bnQgPiAwKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1tlZGl0b3ItaGVscGVyXVxcbicgKyBib3hTdHJpbmcoJ1RvIGJlIGZyaWVuZGx5IHRvIHlvdXIgZWRpdG9yLCB3ZSBqdXN0IGFkZGVkIHRzY29uZmlnLmpzb24gZmlsZSB0byBlYWNoIG9mIHlvdXIgcHJvamVjdCBkaXJlY3RvcmllcyxcXG4nICtcbiAgICAnQnV0IHBsZWFzZSBhZGQgXCJ0c2NvbmZpZy5qc29uXCIgdG8geW91ciAuZ2l0aW5nb3JlIGZpbGUsXFxuJyArXG4gICAgJ3NpbmNlIHRoZXNlIHRzY29uZmlnLmpzb24gYXJlIGdlbmVyYXRlZCBiYXNlZCBvbiB5b3VyIGxvY2FsIHdvcmtzcGFjZSBsb2NhdGlvbi4nKSk7XG4gIH1cbn1cbiJdfQ==