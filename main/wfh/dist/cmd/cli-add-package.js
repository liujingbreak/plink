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
require("../editor-helper");
const log = (0, log4js_1.getLogger)('plink.cli-add-package');
function addDependencyTo(packages, to, dev = false) {
    return __awaiter(this, void 0, void 0, function* () {
        if (packages.length === 0) {
            throw new Error('At least specify one dependency argument');
        }
        let wsDirs = [];
        if (to == null) {
            if ((0, index_1.isCwdWorkspace)()) {
                to = misc_1.plinkEnv.workDir;
            }
            else {
                const ws = (0, index_1.getState)().currWorkspace;
                if (ws == null) {
                    throw new Error('No worktree space is found for current directory, and no "--to" option is specified.\n' +
                        'Either execute this command with option "--to <pkg name | pkg dir | worktree space>"' +
                        'or in a workstree space directory.');
                }
                to = (0, index_1.workspaceDir)(ws);
            }
            wsDirs.push(to);
        }
        else {
            const tryWsKey = (0, index_1.workspaceKey)(to);
            if ((0, index_1.getState)().workspaces.has(tryWsKey)) {
                wsDirs.push(path_1.default.resolve(to));
            }
            else {
                const [foundPkg] = (0, utils_1.findPackagesByNames)([to]);
                if (foundPkg == null) {
                    throw new Error('No matched linked package or worktree space is found for option "--to"');
                }
                to = foundPkg.realPath;
                const rootDir = misc_1.plinkEnv.rootDir;
                wsDirs = Array.from((0, package_list_helper_1.workspacesOfDependencies)(foundPkg.name))
                    .map(ws => path_1.default.resolve(rootDir, ws));
            }
        }
        yield add(packages, to, dev);
        setImmediate(() => {
            for (const wsDir of wsDirs) {
                index_1.actionDispatcher.updateWorkspace({ dir: wsDir, isForce: false });
            }
        });
    });
}
exports.addDependencyTo = addDependencyTo;
function add(packages, toDir, dev = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const targetJsonFile = path_1.default.resolve(toDir, 'package.json');
        const pkgJsonStr = fs_1.default.readFileSync(targetJsonFile, 'utf-8');
        const objAst = (0, json_sync_parser_1.default)(pkgJsonStr);
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
        const srcPkgs = Array.from((0, utils_1.findPackagesByNames)(input.map(item => item[0])));
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
        const newJsonText = (0, patch_text_1.default)(pkgJsonStr, patches);
        log.info(`Write file: ${targetJsonFile}:\n` + newJsonText);
        fs_1.default.writeFileSync(targetJsonFile, newJsonText);
    });
}
function fetchRemoteVersion(pkgName) {
    return __awaiter(this, void 0, void 0, function* () {
        const text = (0, strip_ansi_1.default)(yield (0, process_utils_1.exe)('npm', 'view', pkgName, { silent: true }).promise);
        const rPattern = lodash_1.default.escapeRegExp(pkgName) + '@(\\S*)\\s';
        const pattern = new RegExp(rPattern);
        const m = pattern.exec(text);
        if (m) {
            return m[1];
        }
        throw new Error(`Failed to fetch dependency latest version (pattern: ${rPattern}) from message:\n ${text}`);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFkZC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hZGQtcGFja2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpRkFBMkQ7QUFDM0QsbUNBQTRDO0FBQzVDLHFFQUFnRTtBQUNoRSxvREFBcUM7QUFDckMsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixtQ0FBaUM7QUFDakMsb0RBQXVCO0FBQ3ZCLGtEQUEwQjtBQUMxQiw0REFBbUM7QUFDbkMsd0NBQXVDO0FBQ3ZDLDRFQUE0RTtBQUM1RSxnREFBMkg7QUFDM0gsNEJBQTBCO0FBQzFCLE1BQU0sR0FBRyxHQUFHLElBQUEsa0JBQVMsRUFBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBRS9DLFNBQXNCLGVBQWUsQ0FBQyxRQUFrQixFQUFFLEVBQVcsRUFBRSxHQUFHLEdBQUcsS0FBSzs7UUFDaEYsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7U0FDN0Q7UUFDRCxJQUFJLE1BQU0sR0FBYSxFQUFFLENBQUM7UUFDMUIsSUFBSSxFQUFFLElBQUksSUFBSSxFQUFFO1lBQ2QsSUFBSSxJQUFBLHNCQUFjLEdBQUUsRUFBRTtnQkFDcEIsRUFBRSxHQUFHLGVBQVEsQ0FBQyxPQUFPLENBQUM7YUFDdkI7aUJBQU07Z0JBQ0wsTUFBTSxFQUFFLEdBQUcsSUFBQSxnQkFBUSxHQUFFLENBQUMsYUFBYSxDQUFDO2dCQUNwQyxJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUU7b0JBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyx3RkFBd0Y7d0JBQ3RHLHNGQUFzRjt3QkFDdEYsb0NBQW9DLENBQUMsQ0FBQztpQkFDekM7Z0JBQ0QsRUFBRSxHQUFHLElBQUEsb0JBQVksRUFBQyxFQUFFLENBQUMsQ0FBQzthQUN2QjtZQUNELE1BQU0sQ0FBQyxJQUFJ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RSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEYsTUFBTSxRQUFRLEdBQUcsZ0JBQUMsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsWUFBWSxDQUFDO1FBQ3hELE1BQU0sT0FBTyxHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLEVBQUU7WUFDTCxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNiO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyx1REFBdUQsUUFBUSxxQkFBcUIsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUM5RyxDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGFyc2UsIHtPYmplY3RBc3R9IGZyb20gJy4uL3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCByZXBsYWNlVGV4dCwge1JlcGxhY2VtZW50SW5mfSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCB7ZXhlfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgc3RyaXBBbnNpIGZyb20gJ3N0cmlwLWFuc2knO1xuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge3dvcmtzcGFjZXNPZkRlcGVuZGVuY2llc30gZnJvbSAnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQge2FjdGlvbkRpc3BhdGNoZXIgYXMgcGtnRGlzcGF0ZXIsIGlzQ3dkV29ya3NwYWNlLCBnZXRTdGF0ZSwgd29ya3NwYWNlRGlyLCB3b3Jrc3BhY2VLZXl9IGZyb20gJy4uL3BhY2thZ2UtbWdyL2luZGV4JztcbmltcG9ydCAnLi4vZWRpdG9yLWhlbHBlcic7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNsaS1hZGQtcGFja2FnZScpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkRGVwZW5kZW5jeVRvKHBhY2thZ2VzOiBzdHJpbmdbXSwgdG8/OiBzdHJpbmcsIGRldiA9IGZhbHNlKSB7XG4gIGlmIChwYWNrYWdlcy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0F0IGxlYXN0IHNwZWNpZnkgb25lIGRlcGVuZGVuY3kgYXJndW1lbnQnKTtcbiAgfVxuICBsZXQgd3NEaXJzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAodG8gPT0gbnVsbCkge1xuICAgIGlmIChpc0N3ZFdvcmtzcGFjZSgpKSB7XG4gICAgICB0byA9IHBsaW5rRW52LndvcmtEaXI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHdzID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICAgICAgaWYgKHdzID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyB3b3JrdHJlZSBzcGFjZSBpcyBmb3VuZCBmb3IgY3VycmVudCBkaXJlY3RvcnksIGFuZCBubyBcIi0tdG9cIiBvcHRpb24gaXMgc3BlY2lmaWVkLlxcbicgK1xuICAgICAgICAgICdFaXRoZXIgZXhlY3V0ZSB0aGlzIGNvbW1hbmQgd2l0aCBvcHRpb24gXCItLXRvIDxwa2cgbmFtZSB8IHBrZyBkaXIgfCB3b3JrdHJlZSBzcGFjZT5cIicgK1xuICAgICAgICAgICdvciBpbiBhIHdvcmtzdHJlZSBzcGFjZSBkaXJlY3RvcnkuJyk7XG4gICAgICB9XG4gICAgICB0byA9IHdvcmtzcGFjZURpcih3cyk7XG4gICAgfVxuICAgIHdzRGlycy5wdXNoKHRvKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCB0cnlXc0tleSA9IHdvcmtzcGFjZUtleSh0byk7XG4gICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXModHJ5V3NLZXkpKSB7XG4gICAgICB3c0RpcnMucHVzaChQYXRoLnJlc29sdmUodG8pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgW2ZvdW5kUGtnXSA9IGZpbmRQYWNrYWdlc0J5TmFtZXMoW3RvXSk7XG4gICAgICBpZiAoZm91bmRQa2cgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIG1hdGNoZWQgbGlua2VkIHBhY2thZ2Ugb3Igd29ya3RyZWUgc3BhY2UgaXMgZm91bmQgZm9yIG9wdGlvbiBcIi0tdG9cIicpO1xuICAgICAgfVxuICAgICAgdG8gPSBmb3VuZFBrZy5yZWFsUGF0aDtcbiAgICAgIGNvbnN0IHJvb3REaXIgPSBwbGlua0Vudi5yb290RGlyO1xuICAgICAgd3NEaXJzID0gQXJyYXkuZnJvbSh3b3Jrc3BhY2VzT2ZEZXBlbmRlbmNpZXMoZm91bmRQa2cubmFtZSkpXG4gICAgICAgIC5tYXAod3MgPT4gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdzKSk7XG4gICAgfVxuICB9XG4gIGF3YWl0IGFkZChwYWNrYWdlcywgdG8sIGRldik7XG4gIHNldEltbWVkaWF0ZSgoKSA9PiB7XG4gICAgZm9yIChjb25zdCB3c0RpciBvZiB3c0RpcnMpIHtcbiAgICAgIHBrZ0Rpc3BhdGVyLnVwZGF0ZVdvcmtzcGFjZSh7ZGlyOiB3c0RpciwgaXNGb3JjZTogZmFsc2V9KTtcbiAgICB9XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBhZGQocGFja2FnZXM6IHN0cmluZ1tdLCB0b0Rpcjogc3RyaW5nLCBkZXYgPSBmYWxzZSkge1xuICBjb25zdCB0YXJnZXRKc29uRmlsZSA9IFBhdGgucmVzb2x2ZSh0b0RpciwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCBwa2dKc29uU3RyID0gZnMucmVhZEZpbGVTeW5jKHRhcmdldEpzb25GaWxlLCAndXRmLTgnKTtcbiAgY29uc3Qgb2JqQXN0ID0gcGFyc2UocGtnSnNvblN0cik7XG4gIGNvbnN0IHBhdGNoZXM6IFJlcGxhY2VtZW50SW5mW10gPSBbXTtcblxuICBjb25zdCBkZXBzQXN0ID0gZGV2ID8gb2JqQXN0LnByb3BlcnRpZXMuZmluZChwcm9wID0+IHByb3AubmFtZS50ZXh0ID09PSAnXCJkZXZEZXBlbmRlbmNpZXNcIicpIDpcbiAgICBvYmpBc3QucHJvcGVydGllcy5maW5kKHByb3AgPT4gcHJvcC5uYW1lLnRleHQgPT09ICdcImRlcGVuZGVuY2llc1wiJyk7XG5cbiAgY29uc3QgZGVwc1NldCA9IGRlcHNBc3QgPT0gbnVsbCA/XG4gICAgbmV3IFNldDxzdHJpbmc+KCkgOlxuICAgIG5ldyBTZXQ8c3RyaW5nPigoZGVwc0FzdC52YWx1ZSBhcyBPYmplY3RBc3QpLnByb3BlcnRpZXMubWFwKHByb3AgPT4gcHJvcC5uYW1lLnRleHQuc2xpY2UoMSwgLTEpKSk7XG5cbiAgbG9nLmRlYnVnKCdleGlzdGluZzonLCBkZXBzU2V0KTtcbiAgY29uc3QgaW5wdXQgPSBwYWNrYWdlcy5tYXAocmF3TmFtZSA9PiB7XG4gICAgY29uc3QgbSA9IC9eKCg/OkBbXi9dK1xcLyk/W14vQF0rKSg/OkAoW15dKykpPyQvLmV4ZWMocmF3TmFtZSk7XG4gICAgaWYgKG0pIHtcbiAgICAgIHJldHVybiBbbVsxXSwgbVsyXV0gYXMgW25hbWU6IHN0cmluZywgdmVyOiBzdHJpbmcgfCB1bmRlZmluZWRdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcGFja2FnZSBuYW1lOiAke3Jhd05hbWV9LCB2YWxpZCBuYW1lIHNob3VsZCBiZSBsaWtlIFwiPHBrZyBuYW1lPltAPHZlcnNpb24+XVwiYCk7XG4gICAgfVxuICB9KTtcbiAgbGV0IGkgPSAwO1xuICBsZXQgbmV3TGluZXMgPSAnJztcbiAgY29uc3Qgc3JjUGtncyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhpbnB1dC5tYXAoaXRlbSA9PiBpdGVtWzBdKSkpO1xuXG4gIGF3YWl0IFByb21pc2UuYWxsKHNyY1BrZ3MubWFwKGFzeW5jIHBrZyA9PiB7XG4gICAgY29uc3QgaW5wdXRJdGVtID0gaW5wdXRbaSsrXTtcbiAgICBsZXQgdmVyc2lvbiA9IGlucHV0SXRlbVsxXTtcblxuICAgIGlmIChwa2cgPT0gbnVsbCB8fCAocGtnLmpzb24uZHIgPT0gbnVsbCAmJiBwa2cuanNvbi5wbGluayA9PSBudWxsKSkge1xuICAgICAgY29uc3QgbmFtZSA9IGlucHV0SXRlbVswXTtcbiAgICAgIGlmIChkZXBzU2V0LmhhcyhuYW1lKSkge1xuICAgICAgICBsb2cud2FybihgRm91bmQgZHVwbGljYXRlIGV4aXN0aW5nIGRlcGVuZGVuY3kgJHtjaGFsay5yZWQobmFtZSl9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh2ZXJzaW9uID09IG51bGwpIHtcbiAgICAgICAgdmVyc2lvbiA9IGF3YWl0IGZldGNoUmVtb3RlVmVyc2lvbihuYW1lKTtcbiAgICAgIH1cbiAgICAgIGxvZy5pbmZvKGBQYWNrYWdlICR7bmFtZX1AJHt2ZXJzaW9ufSBpcyBub3QgYSBsaW5rZWQgcGFja2FnZSwgYWRkIGFzIDNyZCBwYXJ0eSBkZXBlbmRlbmN5YCk7XG4gICAgICBuZXdMaW5lcyArPSBgICAgIFwiJHtuYW1lfVwiOiBcIiR7dmVyc2lvbn1cIixcXG5gO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZGVwc1NldC5oYXMocGtnLm5hbWUpKSB7XG4gICAgICAgIGxvZy53YXJuKGBEdXBsaWNhdGUgd2l0aCBleGlzdGluZyBkZXBlbmRlbmN5ICR7Y2hhbGsucmVkKHBrZy5uYW1lKX1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgbG9nLmluZm8oYEFkZCBwYWNrYWdlICR7Y2hhbGsuY3lhbihwa2cubmFtZSl9ICR7dmVyc2lvbiB8fCAnJ31gKTtcbiAgICAgIG5ld0xpbmVzICs9IGAgICAgXCIke3BrZy5uYW1lfVwiOiBcIiR7dmVyc2lvbiB8fCBwa2cuanNvbi52ZXJzaW9uIH1cIixcXG5gO1xuICAgIH1cbiAgfSkpO1xuICBpZiAobmV3TGluZXMubGVuZ3RoID4gMClcbiAgICBuZXdMaW5lcyA9IG5ld0xpbmVzLnNsaWNlKDAsIG5ld0xpbmVzLmxlbmd0aCAtIDIpOyAvLyB0cmltIGxhc3QgY29tbWFcbiAgZWxzZVxuICAgIHJldHVybjtcbiAgbG9nLmRlYnVnKG5ld0xpbmVzKTtcblxuICBpZiAoZGVwc0FzdCA9PSBudWxsKSB7XG4gICAgY29uc3QgbGFzdCA9IG9iakFzdC5wcm9wZXJ0aWVzW29iakFzdC5wcm9wZXJ0aWVzLmxlbmd0aCAtIDFdO1xuICAgIGNvbnN0IHBvcyA9IGxhc3QudmFsdWUuZW5kO1xuICAgIHBhdGNoZXMucHVzaCh7c3RhcnQ6IHBvcywgZW5kOiBwb3MsXG4gICAgICB0ZXh0OiBgLFxcbiAgXCIke2RldiA/ICdkZXZEZXBlbmRlbmNpZXMnIDogJ2RlcGVuZGVuY2llcyd9XCI6IHtcXG4ke25ld0xpbmVzfVxcbiAgfWB9KTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBwcm9wcyA9IChkZXBzQXN0LnZhbHVlIGFzIE9iamVjdEFzdCkucHJvcGVydGllcztcbiAgICBsZXQgc3RhcnQgPSAwO1xuICAgIGlmIChwcm9wcy5sZW5ndGggPiAwKSB7XG4gICAgICBzdGFydCA9IHByb3BzW3Byb3BzLmxlbmd0aCAtIDFdLnZhbHVlLmVuZDtcbiAgICAgIG5ld0xpbmVzID0gJyxcXG4nICsgbmV3TGluZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXJ0ID0gZGVwc0FzdC52YWx1ZS5lbmQgLSAxO1xuICAgIH1cblxuICAgIHBhdGNoZXMucHVzaCh7c3RhcnQsIGVuZDogc3RhcnQsIHRleHQ6IG5ld0xpbmVzfSk7XG4gIH1cblxuICBjb25zdCBuZXdKc29uVGV4dCA9IHJlcGxhY2VUZXh0KHBrZ0pzb25TdHIsIHBhdGNoZXMpO1xuICBsb2cuaW5mbyhgV3JpdGUgZmlsZTogJHt0YXJnZXRKc29uRmlsZX06XFxuYCArIG5ld0pzb25UZXh0KTtcbiAgZnMud3JpdGVGaWxlU3luYyh0YXJnZXRKc29uRmlsZSwgbmV3SnNvblRleHQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaFJlbW90ZVZlcnNpb24ocGtnTmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IHRleHQgPSBzdHJpcEFuc2koYXdhaXQgZXhlKCducG0nLCAndmlldycsIHBrZ05hbWUsIHtzaWxlbnQ6IHRydWV9KS5wcm9taXNlKTtcbiAgY29uc3QgclBhdHRlcm4gPSBfLmVzY2FwZVJlZ0V4cChwa2dOYW1lKSArICdAKFxcXFxTKilcXFxccyc7XG4gIGNvbnN0IHBhdHRlcm4gPSBuZXcgUmVnRXhwKHJQYXR0ZXJuKTtcbiAgY29uc3QgbSA9IHBhdHRlcm4uZXhlYyh0ZXh0KTtcbiAgaWYgKG0pIHtcbiAgICByZXR1cm4gbVsxXTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBmZXRjaCBkZXBlbmRlbmN5IGxhdGVzdCB2ZXJzaW9uIChwYXR0ZXJuOiAke3JQYXR0ZXJufSkgZnJvbSBtZXNzYWdlOlxcbiAke3RleHR9YCk7XG59XG4iXX0=