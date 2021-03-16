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
exports.addDependencyTo = void 0;
const json_sync_parser_1 = __importDefault(require("../utils/json-sync-parser"));
const utils_1 = require("./utils");
const patch_text_1 = __importDefault(require("../utils/patch-text"));
const process_utils_1 = require("../process-utils");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const log4js_1 = require("log4js");
const lodash_1 = __importDefault(require("lodash"));
const chalk_1 = __importDefault(require("chalk"));
const strip_ansi_1 = __importDefault(require("strip-ansi"));
const misc_1 = require("../utils/misc");
const package_list_helper_1 = require("../package-mgr/package-list-helper");
const index_1 = require("../package-mgr/index");
const log = log4js_1.getLogger('plink.cli-add-package');
function addDependencyTo(packages, to, dev = false) {
    return __awaiter(this, void 0, void 0, function* () {
        if (packages.length === 0) {
            throw new Error('At least specify one dependency argument');
        }
        let wsDirs = [];
        if (to == null) {
            if (index_1.isCwdWorkspace()) {
                to = process.cwd();
            }
            else {
                const ws = index_1.getState().currWorkspace;
                if (ws == null) {
                    throw new Error('No worktree space is found for current directory, and no "--to" option is specified.\n' +
                        'Either execute this command with option "--to <pkg name | pkg dir | worktree space>"' +
                        'or in a workstree space directory.');
                }
                to = index_1.workspaceDir(ws);
            }
            wsDirs.push(to);
        }
        else {
            console.log(to);
            const tryWsKey = index_1.workspaceKey(to);
            if (index_1.getState().workspaces.has(tryWsKey)) {
                wsDirs.push(path_1.default.resolve(to));
            }
            else {
                const [foundPkg] = utils_1.findPackagesByNames([to]);
                if (foundPkg == null) {
                    throw new Error('No matched linked package or worktree space is found for option "--to"');
                }
                to = foundPkg.realPath;
                const rootDir = misc_1.getRootDir();
                wsDirs = Array.from(package_list_helper_1.workspacesOfDependencies(foundPkg.name))
                    .map(ws => path_1.default.resolve(rootDir, ws));
            }
            console.log('wsDirs', wsDirs);
        }
        yield add(packages, to, dev);
        setImmediate(() => {
            for (const wsDir of wsDirs) {
                index_1.actionDispatcher.updateWorkspace({ dir: wsDir, isForce: false, createHook: false });
            }
        });
    });
}
exports.addDependencyTo = addDependencyTo;
function add(packages, toDir, dev = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const targetJsonFile = path_1.default.resolve(toDir, 'package.json');
        const pkgJsonStr = fs_1.default.readFileSync(targetJsonFile, 'utf-8');
        const objAst = json_sync_parser_1.default(pkgJsonStr);
        const patches = [];
        const depsAst = dev ? objAst.properties.find(prop => prop.name.text === '"devDependencies"') :
            objAst.properties.find(prop => prop.name.text === '"dependencies"');
        const depsSet = depsAst == null ?
            new Set() :
            new Set(depsAst.value.properties.map(prop => prop.name.text.slice(1, -1)));
        log.debug('existing:', depsSet);
        const input = packages.map(rawName => {
            const m = /^((?:@[^/]+\/)?[^/@]+)(?:@([^]+))?$/.exec(rawName);
            if (m) {
                return [m[1], m[2]];
            }
            else {
                throw new Error(`Invalid package name: ${rawName}, valid name should be like "<pkg name>[@<version>]"`);
            }
        });
        let i = 0;
        let newLines = '';
        const srcPkgs = Array.from(utils_1.findPackagesByNames(input.map(item => item[0])));
        yield Promise.all(srcPkgs.map((pkg) => __awaiter(this, void 0, void 0, function* () {
            const inputItem = input[i++];
            let version = inputItem[1];
            if (pkg == null || (pkg.json.dr == null && pkg.json.plink == null)) {
                const name = inputItem[0];
                if (depsSet.has(name)) {
                    log.warn(`Found duplicate existing dependency ${chalk_1.default.red(name)}`);
                    return;
                }
                if (version == null) {
                    version = yield fetchRemoteVersion(name);
                }
                log.info(`Package ${name}@${version} is not a linked package, add as 3rd party dependency`);
                newLines += `    "${name}": "${version}",\n`;
            }
            else {
                if (depsSet.has(pkg.name)) {
                    log.warn(`Duplicate with existing dependency ${chalk_1.default.red(pkg.name)}`);
                    return;
                }
                log.info(`Add package ${chalk_1.default.cyan(pkg.name)} ${version || ''}`);
                newLines += `    "${pkg.name}": "${version || pkg.json.version}",\n`;
            }
        })));
        if (newLines.length > 0)
            newLines = newLines.slice(0, newLines.length - 2); // trim last comma
        else
            return;
        log.debug(newLines);
        if (depsAst == null) {
            const last = objAst.properties[objAst.properties.length - 1];
            const pos = last.value.end;
            patches.push({ start: pos, end: pos,
                text: `,\n  "${dev ? 'devDependencies' : 'dependencies'}": {\n${newLines}\n  }` });
        }
        else {
            const props = depsAst.value.properties;
            let start = 0;
            if (props.length > 0) {
                start = props[props.length - 1].value.end;
                newLines = ',\n' + newLines;
            }
            else {
                start = depsAst.value.end - 1;
            }
            patches.push({ start, end: start, text: newLines });
        }
        const newJsonText = patch_text_1.default(pkgJsonStr, patches);
        log.info(`Write file: ${targetJsonFile}:\n` + newJsonText);
        fs_1.default.writeFileSync(targetJsonFile, newJsonText);
    });
}
function fetchRemoteVersion(pkgName) {
    return __awaiter(this, void 0, void 0, function* () {
        const text = strip_ansi_1.default(yield process_utils_1.exe('npm', 'view', pkgName, { silent: true }).promise);
        const rPattern = lodash_1.default.escapeRegExp(pkgName) + '@(\\S*)\\s';
        const pattern = new RegExp(rPattern);
        const m = pattern.exec(text);
        if (m) {
            return m[1];
        }
        throw new Error(`Failed to fetch dependency latest version (pattern: ${pattern}) from message:\n ${text}`);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFkZC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hZGQtcGFja2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpRkFBMkQ7QUFDM0QsbUNBQTRDO0FBQzVDLHFFQUFnRTtBQUNoRSxvREFBcUM7QUFDckMsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixtQ0FBaUM7QUFDakMsb0RBQXVCO0FBQ3ZCLGtEQUEwQjtBQUMxQiw0REFBbUM7QUFDbkMsd0NBQXlDO0FBQ3pDLDRFQUE0RTtBQUM1RSxnREFBMkg7QUFDM0gsTUFBTSxHQUFHLEdBQUcsa0JBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBRS9DLFNBQXNCLGVBQWUsQ0FBQyxRQUFrQixFQUFFLEVBQVcsRUFBRSxHQUFHLEdBQUcsS0FBSzs7UUFDaEYsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7U0FDN0Q7UUFDRCxJQUFJLE1BQU0sR0FBYSxFQUFFLENBQUM7UUFDMUIsSUFBSSxFQUFFLElBQUksSUFBSSxFQUFFO1lBQ2QsSUFBSSxzQkFBYyxFQUFFLEVBQUU7Z0JBQ3BCLEVBQUUsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7YUFDcEI7aUJBQU07Z0JBQ0wsTUFBTSxFQUFFLEdBQUcsZ0JBQVEsRUFBRSxDQUFDLGFBQWEsQ0FBQztnQkFDcEMsSUFBSSxFQUFFLElBQUksSUFBSSxFQUFFO29CQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsd0ZBQXdGO3dCQUN0RyxzRkFBc0Y7d0JBQ3RGLG9DQUFvQyxDQUFDLENBQUM7aUJBQ3pDO2dCQUNELEVBQUUsR0FBRyxvQkFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3ZCO1lBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNqQjth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b0JBQVMsQ0FBQyxNQUFNLG1CQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsRixNQUFNLFFBQVEsR0FBRyxnQkFBQyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxZQUFZLENBQUM7UUFDeEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsRUFBRTtZQUNMLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2I7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLHVEQUF1RCxPQUFPLHFCQUFxQixJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzdHLENBQUM7Q0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwYXJzZSwge09iamVjdEFzdH0gZnJvbSAnLi4vdXRpbHMvanNvbi1zeW5jLXBhcnNlcic7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHJlcGxhY2VUZXh0LCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IHtleGV9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBzdHJpcEFuc2kgZnJvbSAnc3RyaXAtYW5zaSc7XG5pbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IHt3b3Jrc3BhY2VzT2ZEZXBlbmRlbmNpZXN9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHthY3Rpb25EaXNwYXRjaGVyIGFzIHBrZ0Rpc3BhdGVyLCBpc0N3ZFdvcmtzcGFjZSwgZ2V0U3RhdGUsIHdvcmtzcGFjZURpciwgd29ya3NwYWNlS2V5fSBmcm9tICcuLi9wYWNrYWdlLW1nci9pbmRleCc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNsaS1hZGQtcGFja2FnZScpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkRGVwZW5kZW5jeVRvKHBhY2thZ2VzOiBzdHJpbmdbXSwgdG8/OiBzdHJpbmcsIGRldiA9IGZhbHNlKSB7XG4gIGlmIChwYWNrYWdlcy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0F0IGxlYXN0IHNwZWNpZnkgb25lIGRlcGVuZGVuY3kgYXJndW1lbnQnKTtcbiAgfVxuICBsZXQgd3NEaXJzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAodG8gPT0gbnVsbCkge1xuICAgIGlmIChpc0N3ZFdvcmtzcGFjZSgpKSB7XG4gICAgICB0byA9IHByb2Nlc3MuY3dkKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHdzID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICAgICAgaWYgKHdzID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyB3b3JrdHJlZSBzcGFjZSBpcyBmb3VuZCBmb3IgY3VycmVudCBkaXJlY3RvcnksIGFuZCBubyBcIi0tdG9cIiBvcHRpb24gaXMgc3BlY2lmaWVkLlxcbicgK1xuICAgICAgICAgICdFaXRoZXIgZXhlY3V0ZSB0aGlzIGNvbW1hbmQgd2l0aCBvcHRpb24gXCItLXRvIDxwa2cgbmFtZSB8IHBrZyBkaXIgfCB3b3JrdHJlZSBzcGFjZT5cIicgK1xuICAgICAgICAgICdvciBpbiBhIHdvcmtzdHJlZSBzcGFjZSBkaXJlY3RvcnkuJyk7XG4gICAgICB9XG4gICAgICB0byA9IHdvcmtzcGFjZURpcih3cyk7XG4gICAgfVxuICAgIHdzRGlycy5wdXNoKHRvKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zb2xlLmxvZyh0byk7XG4gICAgY29uc3QgdHJ5V3NLZXkgPSB3b3Jrc3BhY2VLZXkodG8pO1xuICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHRyeVdzS2V5KSkge1xuICAgICAgd3NEaXJzLnB1c2goUGF0aC5yZXNvbHZlKHRvKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IFtmb3VuZFBrZ10gPSBmaW5kUGFja2FnZXNCeU5hbWVzKFt0b10pO1xuICAgICAgaWYgKGZvdW5kUGtnID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBtYXRjaGVkIGxpbmtlZCBwYWNrYWdlIG9yIHdvcmt0cmVlIHNwYWNlIGlzIGZvdW5kIGZvciBvcHRpb24gXCItLXRvXCInKTtcbiAgICAgIH1cbiAgICAgIHRvID0gZm91bmRQa2cucmVhbFBhdGg7XG4gICAgICBjb25zdCByb290RGlyID0gZ2V0Um9vdERpcigpO1xuICAgICAgd3NEaXJzID0gQXJyYXkuZnJvbSh3b3Jrc3BhY2VzT2ZEZXBlbmRlbmNpZXMoZm91bmRQa2cubmFtZSkpXG4gICAgICAgIC5tYXAod3MgPT4gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdzKSk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCd3c0RpcnMnLCB3c0RpcnMpO1xuICB9XG4gIGF3YWl0IGFkZChwYWNrYWdlcywgdG8sIGRldik7XG4gIHNldEltbWVkaWF0ZSgoKSA9PiB7XG4gICAgZm9yIChjb25zdCB3c0RpciBvZiB3c0RpcnMpIHtcbiAgICAgIHBrZ0Rpc3BhdGVyLnVwZGF0ZVdvcmtzcGFjZSh7ZGlyOiB3c0RpciwgaXNGb3JjZTogZmFsc2UsIGNyZWF0ZUhvb2s6IGZhbHNlfSk7XG4gICAgfVxuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYWRkKHBhY2thZ2VzOiBzdHJpbmdbXSwgdG9EaXI6IHN0cmluZywgZGV2ID0gZmFsc2UpIHtcbiAgY29uc3QgdGFyZ2V0SnNvbkZpbGUgPSBQYXRoLnJlc29sdmUodG9EaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgY29uc3QgcGtnSnNvblN0ciA9IGZzLnJlYWRGaWxlU3luYyh0YXJnZXRKc29uRmlsZSwgJ3V0Zi04Jyk7XG4gIGNvbnN0IG9iakFzdCA9IHBhcnNlKHBrZ0pzb25TdHIpO1xuICBjb25zdCBwYXRjaGVzOiBSZXBsYWNlbWVudEluZltdID0gW107XG5cbiAgY29uc3QgZGVwc0FzdCA9IGRldiA/IG9iakFzdC5wcm9wZXJ0aWVzLmZpbmQocHJvcCA9PiBwcm9wLm5hbWUudGV4dCA9PT0gJ1wiZGV2RGVwZW5kZW5jaWVzXCInKSA6XG4gICAgb2JqQXN0LnByb3BlcnRpZXMuZmluZChwcm9wID0+IHByb3AubmFtZS50ZXh0ID09PSAnXCJkZXBlbmRlbmNpZXNcIicpO1xuXG4gIGNvbnN0IGRlcHNTZXQgPSBkZXBzQXN0ID09IG51bGwgP1xuICAgIG5ldyBTZXQ8c3RyaW5nPigpIDpcbiAgICBuZXcgU2V0PHN0cmluZz4oKGRlcHNBc3QudmFsdWUgYXMgT2JqZWN0QXN0KS5wcm9wZXJ0aWVzLm1hcChwcm9wID0+IHByb3AubmFtZS50ZXh0LnNsaWNlKDEsIC0xKSkpO1xuXG4gIGxvZy5kZWJ1ZygnZXhpc3Rpbmc6JywgZGVwc1NldCk7XG4gIGNvbnN0IGlucHV0ID0gcGFja2FnZXMubWFwKHJhd05hbWUgPT4ge1xuICAgIGNvbnN0IG0gPSAvXigoPzpAW14vXStcXC8pP1teL0BdKykoPzpAKFteXSspKT8kLy5leGVjKHJhd05hbWUpO1xuICAgIGlmIChtKSB7XG4gICAgICByZXR1cm4gW21bMV0sIG1bMl1dIGFzIFtuYW1lOiBzdHJpbmcsIHZlcjogc3RyaW5nIHwgdW5kZWZpbmVkXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHBhY2thZ2UgbmFtZTogJHtyYXdOYW1lfSwgdmFsaWQgbmFtZSBzaG91bGQgYmUgbGlrZSBcIjxwa2cgbmFtZT5bQDx2ZXJzaW9uPl1cImApO1xuICAgIH1cbiAgfSk7XG4gIGxldCBpID0gMDtcbiAgbGV0IG5ld0xpbmVzID0gJyc7XG4gIGNvbnN0IHNyY1BrZ3MgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoaW5wdXQubWFwKGl0ZW0gPT4gaXRlbVswXSkpKTtcblxuICBhd2FpdCBQcm9taXNlLmFsbChzcmNQa2dzLm1hcChhc3luYyBwa2cgPT4ge1xuICAgIGNvbnN0IGlucHV0SXRlbSA9IGlucHV0W2krK107XG4gICAgbGV0IHZlcnNpb24gPSBpbnB1dEl0ZW1bMV07XG5cbiAgICBpZiAocGtnID09IG51bGwgfHwgKHBrZy5qc29uLmRyID09IG51bGwgJiYgcGtnLmpzb24ucGxpbmsgPT0gbnVsbCkpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBpbnB1dEl0ZW1bMF07XG4gICAgICBpZiAoZGVwc1NldC5oYXMobmFtZSkpIHtcbiAgICAgICAgbG9nLndhcm4oYEZvdW5kIGR1cGxpY2F0ZSBleGlzdGluZyBkZXBlbmRlbmN5ICR7Y2hhbGsucmVkKG5hbWUpfWApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodmVyc2lvbiA9PSBudWxsKSB7XG4gICAgICAgIHZlcnNpb24gPSBhd2FpdCBmZXRjaFJlbW90ZVZlcnNpb24obmFtZSk7XG4gICAgICB9XG4gICAgICBsb2cuaW5mbyhgUGFja2FnZSAke25hbWV9QCR7dmVyc2lvbn0gaXMgbm90IGEgbGlua2VkIHBhY2thZ2UsIGFkZCBhcyAzcmQgcGFydHkgZGVwZW5kZW5jeWApO1xuICAgICAgbmV3TGluZXMgKz0gYCAgICBcIiR7bmFtZX1cIjogXCIke3ZlcnNpb259XCIsXFxuYDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGRlcHNTZXQuaGFzKHBrZy5uYW1lKSkge1xuICAgICAgICBsb2cud2FybihgRHVwbGljYXRlIHdpdGggZXhpc3RpbmcgZGVwZW5kZW5jeSAke2NoYWxrLnJlZChwa2cubmFtZSl9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGxvZy5pbmZvKGBBZGQgcGFja2FnZSAke2NoYWxrLmN5YW4ocGtnLm5hbWUpfSAke3ZlcnNpb24gfHwgJyd9YCk7XG4gICAgICBuZXdMaW5lcyArPSBgICAgIFwiJHtwa2cubmFtZX1cIjogXCIke3ZlcnNpb24gfHwgcGtnLmpzb24udmVyc2lvbn1cIixcXG5gO1xuICAgIH1cbiAgfSkpO1xuICBpZiAobmV3TGluZXMubGVuZ3RoID4gMClcbiAgICBuZXdMaW5lcyA9IG5ld0xpbmVzLnNsaWNlKDAsIG5ld0xpbmVzLmxlbmd0aCAtIDIpOyAvLyB0cmltIGxhc3QgY29tbWFcbiAgZWxzZVxuICAgIHJldHVybjtcbiAgbG9nLmRlYnVnKG5ld0xpbmVzKTtcblxuICBpZiAoZGVwc0FzdCA9PSBudWxsKSB7XG4gICAgY29uc3QgbGFzdCA9IG9iakFzdC5wcm9wZXJ0aWVzW29iakFzdC5wcm9wZXJ0aWVzLmxlbmd0aCAtIDFdO1xuICAgIGNvbnN0IHBvcyA9IGxhc3QudmFsdWUuZW5kO1xuICAgIHBhdGNoZXMucHVzaCh7c3RhcnQ6IHBvcywgZW5kOiBwb3MsXG4gICAgICB0ZXh0OiBgLFxcbiAgXCIke2RldiA/ICdkZXZEZXBlbmRlbmNpZXMnIDogJ2RlcGVuZGVuY2llcyd9XCI6IHtcXG4ke25ld0xpbmVzfVxcbiAgfWB9KTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBwcm9wcyA9IChkZXBzQXN0LnZhbHVlIGFzIE9iamVjdEFzdCkucHJvcGVydGllcztcbiAgICBsZXQgc3RhcnQgPSAwO1xuICAgIGlmIChwcm9wcy5sZW5ndGggPiAwKSB7XG4gICAgICBzdGFydCA9IHByb3BzW3Byb3BzLmxlbmd0aCAtIDFdLnZhbHVlLmVuZDtcbiAgICAgIG5ld0xpbmVzID0gJyxcXG4nICsgbmV3TGluZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXJ0ID0gZGVwc0FzdC52YWx1ZS5lbmQgLSAxO1xuICAgIH1cblxuICAgIHBhdGNoZXMucHVzaCh7c3RhcnQsIGVuZDogc3RhcnQsIHRleHQ6IG5ld0xpbmVzfSk7XG4gIH1cblxuICBjb25zdCBuZXdKc29uVGV4dCA9IHJlcGxhY2VUZXh0KHBrZ0pzb25TdHIsIHBhdGNoZXMpO1xuICBsb2cuaW5mbyhgV3JpdGUgZmlsZTogJHt0YXJnZXRKc29uRmlsZX06XFxuYCArIG5ld0pzb25UZXh0KTtcbiAgZnMud3JpdGVGaWxlU3luYyh0YXJnZXRKc29uRmlsZSwgbmV3SnNvblRleHQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaFJlbW90ZVZlcnNpb24ocGtnTmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IHRleHQgPSBzdHJpcEFuc2koYXdhaXQgZXhlKCducG0nLCAndmlldycsIHBrZ05hbWUsIHtzaWxlbnQ6IHRydWV9KS5wcm9taXNlKTtcbiAgY29uc3QgclBhdHRlcm4gPSBfLmVzY2FwZVJlZ0V4cChwa2dOYW1lKSArICdAKFxcXFxTKilcXFxccyc7XG4gIGNvbnN0IHBhdHRlcm4gPSBuZXcgUmVnRXhwKHJQYXR0ZXJuKTtcbiAgY29uc3QgbSA9IHBhdHRlcm4uZXhlYyh0ZXh0KTtcbiAgaWYgKG0pIHtcbiAgICByZXR1cm4gbVsxXTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBmZXRjaCBkZXBlbmRlbmN5IGxhdGVzdCB2ZXJzaW9uIChwYXR0ZXJuOiAke3BhdHRlcm59KSBmcm9tIG1lc3NhZ2U6XFxuICR7dGV4dH1gKTtcbn1cbiJdfQ==