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
                wsDirs = Array.from(package_list_helper_1.workspacesOfDependencies(foundPkg.name));
            }
        }
        yield add(packages, wsDirs, to, dev);
    });
}
exports.addDependencyTo = addDependencyTo;
function add(packages, wsDirs, toDir, dev = false) {
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
        setImmediate(() => {
            for (const wsDir of wsDirs) {
                index_1.actionDispatcher.updateWorkspace({ dir: wsDir, isForce: false, createHook: false });
            }
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFkZC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hZGQtcGFja2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpRkFBMkQ7QUFDM0QsbUNBQTRDO0FBQzVDLHFFQUFnRTtBQUNoRSxvREFBcUM7QUFDckMsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixtQ0FBaUM7QUFDakMsb0RBQXVCO0FBQ3ZCLGtEQUEwQjtBQUMxQiw0REFBbUM7QUFDbkMsNEVBQTRFO0FBQzVFLGdEQUEySDtBQUMzSCxNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFFL0MsU0FBc0IsZUFBZSxDQUFDLFFBQWtCLEVBQUUsRUFBVyxFQUFFLEdBQUcsR0FBRyxLQUFLOztRQUNoRixJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsMENBQTBDLENBQUMsQ0FBQztTQUM3RDtRQUNELElBQUksTUFBTSxHQUFhLEVBQUUsQ0FBQztRQUMxQixJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDZCxJQUFJLHNCQUFjLEVBQUUsRUFBRTtnQkFDcEIsRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQzthQUNwQjtpQkFBTTtnQkFDTCxNQUFNLEVBQUUsR0FBRyxnQkFBUSxFQUFFLENBQUMsYUFBYSxDQUFDO2dCQUNwQyxJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUU7b0JBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyx3RkFBd0Y7d0JBQ3RHLHNGQUFzRjt3QkFDdEYsb0NBQW9DLENBQUMsQ0FBQztpQkFDekM7Z0JBQ0QsRUFBRSxHQUFHLG9CQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDdkI7WUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2pCO2FBQU07WUFDTCxNQUFN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Q0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLEVBQUU7WUFDTCxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNiO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyx1REFBdUQsT0FBTyxxQkFBcUIsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUM3RyxDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGFyc2UsIHtPYmplY3RBc3R9IGZyb20gJy4uL3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCByZXBsYWNlVGV4dCwge1JlcGxhY2VtZW50SW5mfSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCB7ZXhlfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgc3RyaXBBbnNpIGZyb20gJ3N0cmlwLWFuc2knO1xuaW1wb3J0IHt3b3Jrc3BhY2VzT2ZEZXBlbmRlbmNpZXN9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHthY3Rpb25EaXNwYXRjaGVyIGFzIHBrZ0Rpc3BhdGVyLCBpc0N3ZFdvcmtzcGFjZSwgZ2V0U3RhdGUsIHdvcmtzcGFjZURpciwgd29ya3NwYWNlS2V5fSBmcm9tICcuLi9wYWNrYWdlLW1nci9pbmRleCc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNsaS1hZGQtcGFja2FnZScpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkRGVwZW5kZW5jeVRvKHBhY2thZ2VzOiBzdHJpbmdbXSwgdG8/OiBzdHJpbmcsIGRldiA9IGZhbHNlKSB7XG4gIGlmIChwYWNrYWdlcy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0F0IGxlYXN0IHNwZWNpZnkgb25lIGRlcGVuZGVuY3kgYXJndW1lbnQnKTtcbiAgfVxuICBsZXQgd3NEaXJzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAodG8gPT0gbnVsbCkge1xuICAgIGlmIChpc0N3ZFdvcmtzcGFjZSgpKSB7XG4gICAgICB0byA9IHByb2Nlc3MuY3dkKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHdzID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICAgICAgaWYgKHdzID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyB3b3JrdHJlZSBzcGFjZSBpcyBmb3VuZCBmb3IgY3VycmVudCBkaXJlY3RvcnksIGFuZCBubyBcIi0tdG9cIiBvcHRpb24gaXMgc3BlY2lmaWVkLlxcbicgK1xuICAgICAgICAgICdFaXRoZXIgZXhlY3V0ZSB0aGlzIGNvbW1hbmQgd2l0aCBvcHRpb24gXCItLXRvIDxwa2cgbmFtZSB8IHBrZyBkaXIgfCB3b3JrdHJlZSBzcGFjZT5cIicgK1xuICAgICAgICAgICdvciBpbiBhIHdvcmtzdHJlZSBzcGFjZSBkaXJlY3RvcnkuJyk7XG4gICAgICB9XG4gICAgICB0byA9IHdvcmtzcGFjZURpcih3cyk7XG4gICAgfVxuICAgIHdzRGlycy5wdXNoKHRvKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCB0cnlXc0tleSA9IHdvcmtzcGFjZUtleSh0byk7XG4gICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXModHJ5V3NLZXkpKSB7XG4gICAgICB3c0RpcnMucHVzaChQYXRoLnJlc29sdmUodG8pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgW2ZvdW5kUGtnXSA9IGZpbmRQYWNrYWdlc0J5TmFtZXMoW3RvXSk7XG4gICAgICBpZiAoZm91bmRQa2cgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIG1hdGNoZWQgbGlua2VkIHBhY2thZ2Ugb3Igd29ya3RyZWUgc3BhY2UgaXMgZm91bmQgZm9yIG9wdGlvbiBcIi0tdG9cIicpO1xuICAgICAgfVxuICAgICAgdG8gPSBmb3VuZFBrZy5yZWFsUGF0aDtcbiAgICAgIHdzRGlycyA9IEFycmF5LmZyb20od29ya3NwYWNlc09mRGVwZW5kZW5jaWVzKGZvdW5kUGtnLm5hbWUpKTtcbiAgICB9XG4gIH1cbiAgYXdhaXQgYWRkKHBhY2thZ2VzLCB3c0RpcnMsIHRvLCBkZXYpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBhZGQocGFja2FnZXM6IHN0cmluZ1tdLCB3c0RpcnM6IHN0cmluZ1tdLCB0b0Rpcjogc3RyaW5nLCBkZXYgPSBmYWxzZSkge1xuICBjb25zdCB0YXJnZXRKc29uRmlsZSA9IFBhdGgucmVzb2x2ZSh0b0RpciwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCBwa2dKc29uU3RyID0gZnMucmVhZEZpbGVTeW5jKHRhcmdldEpzb25GaWxlLCAndXRmLTgnKTtcbiAgY29uc3Qgb2JqQXN0ID0gcGFyc2UocGtnSnNvblN0cik7XG4gIGNvbnN0IHBhdGNoZXM6IFJlcGxhY2VtZW50SW5mW10gPSBbXTtcblxuICBjb25zdCBkZXBzQXN0ID0gZGV2ID8gb2JqQXN0LnByb3BlcnRpZXMuZmluZChwcm9wID0+IHByb3AubmFtZS50ZXh0ID09PSAnXCJkZXZEZXBlbmRlbmNpZXNcIicpIDpcbiAgICBvYmpBc3QucHJvcGVydGllcy5maW5kKHByb3AgPT4gcHJvcC5uYW1lLnRleHQgPT09ICdcImRlcGVuZGVuY2llc1wiJyk7XG5cbiAgY29uc3QgZGVwc1NldCA9IGRlcHNBc3QgPT0gbnVsbCA/XG4gICAgbmV3IFNldDxzdHJpbmc+KCkgOlxuICAgIG5ldyBTZXQ8c3RyaW5nPigoZGVwc0FzdC52YWx1ZSBhcyBPYmplY3RBc3QpLnByb3BlcnRpZXMubWFwKHByb3AgPT4gcHJvcC5uYW1lLnRleHQuc2xpY2UoMSwgLTEpKSk7XG5cbiAgbG9nLmRlYnVnKCdleGlzdGluZzonLCBkZXBzU2V0KTtcbiAgY29uc3QgaW5wdXQgPSBwYWNrYWdlcy5tYXAocmF3TmFtZSA9PiB7XG4gICAgY29uc3QgbSA9IC9eKCg/OkBbXi9dK1xcLyk/W14vQF0rKSg/OkAoW15dKykpPyQvLmV4ZWMocmF3TmFtZSk7XG4gICAgaWYgKG0pIHtcbiAgICAgIHJldHVybiBbbVsxXSwgbVsyXV0gYXMgW25hbWU6IHN0cmluZywgdmVyOiBzdHJpbmcgfCB1bmRlZmluZWRdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcGFja2FnZSBuYW1lOiAke3Jhd05hbWV9LCB2YWxpZCBuYW1lIHNob3VsZCBiZSBsaWtlIFwiPHBrZyBuYW1lPltAPHZlcnNpb24+XVwiYCk7XG4gICAgfVxuICB9KTtcbiAgbGV0IGkgPSAwO1xuICBsZXQgbmV3TGluZXMgPSAnJztcbiAgY29uc3Qgc3JjUGtncyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhpbnB1dC5tYXAoaXRlbSA9PiBpdGVtWzBdKSkpO1xuXG4gIGF3YWl0IFByb21pc2UuYWxsKHNyY1BrZ3MubWFwKGFzeW5jIHBrZyA9PiB7XG4gICAgY29uc3QgaW5wdXRJdGVtID0gaW5wdXRbaSsrXTtcbiAgICBsZXQgdmVyc2lvbiA9IGlucHV0SXRlbVsxXTtcblxuICAgIGlmIChwa2cgPT0gbnVsbCB8fCAocGtnLmpzb24uZHIgPT0gbnVsbCAmJiBwa2cuanNvbi5wbGluayA9PSBudWxsKSkge1xuICAgICAgY29uc3QgbmFtZSA9IGlucHV0SXRlbVswXTtcbiAgICAgIGlmIChkZXBzU2V0LmhhcyhuYW1lKSkge1xuICAgICAgICBsb2cud2FybihgRm91bmQgZHVwbGljYXRlIGV4aXN0aW5nIGRlcGVuZGVuY3kgJHtjaGFsay5yZWQobmFtZSl9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh2ZXJzaW9uID09IG51bGwpIHtcbiAgICAgICAgdmVyc2lvbiA9IGF3YWl0IGZldGNoUmVtb3RlVmVyc2lvbihuYW1lKTtcbiAgICAgIH1cbiAgICAgIGxvZy5pbmZvKGBQYWNrYWdlICR7bmFtZX1AJHt2ZXJzaW9ufSBpcyBub3QgYSBsaW5rZWQgcGFja2FnZSwgYWRkIGFzIDNyZCBwYXJ0eSBkZXBlbmRlbmN5YCk7XG4gICAgICBuZXdMaW5lcyArPSBgICAgIFwiJHtuYW1lfVwiOiBcIiR7dmVyc2lvbn1cIixcXG5gO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZGVwc1NldC5oYXMocGtnLm5hbWUpKSB7XG4gICAgICAgIGxvZy53YXJuKGBEdXBsaWNhdGUgd2l0aCBleGlzdGluZyBkZXBlbmRlbmN5ICR7Y2hhbGsucmVkKHBrZy5uYW1lKX1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgbG9nLmluZm8oYEFkZCBwYWNrYWdlICR7Y2hhbGsuY3lhbihwa2cubmFtZSl9ICR7dmVyc2lvbiB8fCAnJ31gKTtcbiAgICAgIG5ld0xpbmVzICs9IGAgICAgXCIke3BrZy5uYW1lfVwiOiBcIiR7dmVyc2lvbiB8fCBwa2cuanNvbi52ZXJzaW9ufVwiLFxcbmA7XG4gICAgfVxuICB9KSk7XG4gIGlmIChuZXdMaW5lcy5sZW5ndGggPiAwKVxuICAgIG5ld0xpbmVzID0gbmV3TGluZXMuc2xpY2UoMCwgbmV3TGluZXMubGVuZ3RoIC0gMik7IC8vIHRyaW0gbGFzdCBjb21tYVxuICBsb2cuZGVidWcobmV3TGluZXMpO1xuXG4gIGlmIChkZXBzQXN0ID09IG51bGwpIHtcbiAgICBjb25zdCBsYXN0ID0gb2JqQXN0LnByb3BlcnRpZXNbb2JqQXN0LnByb3BlcnRpZXMubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgcG9zID0gbGFzdC52YWx1ZS5lbmQ7XG4gICAgcGF0Y2hlcy5wdXNoKHtzdGFydDogcG9zLCBlbmQ6IHBvcyxcbiAgICAgIHRleHQ6IGAsXFxuICBcIiR7ZGV2ID8gJ2RldkRlcGVuZGVuY2llcycgOiAnZGVwZW5kZW5jaWVzJ31cIjoge1xcbiR7bmV3TGluZXN9XFxuICB9YH0pO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHByb3BzID0gKGRlcHNBc3QudmFsdWUgYXMgT2JqZWN0QXN0KS5wcm9wZXJ0aWVzO1xuICAgIGxldCBzdGFydCA9IDA7XG4gICAgaWYgKHByb3BzLmxlbmd0aCA+IDApIHtcbiAgICAgIHN0YXJ0ID0gcHJvcHNbcHJvcHMubGVuZ3RoIC0gMV0udmFsdWUuZW5kO1xuICAgICAgbmV3TGluZXMgPSAnLFxcbicgKyBuZXdMaW5lcztcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhcnQgPSBkZXBzQXN0LnZhbHVlLmVuZCAtIDE7XG4gICAgfVxuXG4gICAgcGF0Y2hlcy5wdXNoKHtzdGFydCwgZW5kOiBzdGFydCwgdGV4dDogbmV3TGluZXN9KTtcbiAgfVxuXG4gIGNvbnN0IG5ld0pzb25UZXh0ID0gcmVwbGFjZVRleHQocGtnSnNvblN0ciwgcGF0Y2hlcyk7XG4gIGxvZy5pbmZvKGBXcml0ZSBmaWxlOiAke3RhcmdldEpzb25GaWxlfTpcXG5gICsgbmV3SnNvblRleHQpO1xuICBmcy53cml0ZUZpbGVTeW5jKHRhcmdldEpzb25GaWxlLCBuZXdKc29uVGV4dCk7XG5cbiAgc2V0SW1tZWRpYXRlKCgpID0+IHtcbiAgICBmb3IgKGNvbnN0IHdzRGlyIG9mIHdzRGlycykge1xuICAgICAgcGtnRGlzcGF0ZXIudXBkYXRlV29ya3NwYWNlKHtkaXI6IHdzRGlyLCBpc0ZvcmNlOiBmYWxzZSwgY3JlYXRlSG9vazogZmFsc2V9KTtcbiAgICB9XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaFJlbW90ZVZlcnNpb24ocGtnTmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IHRleHQgPSBzdHJpcEFuc2koYXdhaXQgZXhlKCducG0nLCAndmlldycsIHBrZ05hbWUsIHtzaWxlbnQ6IHRydWV9KS5wcm9taXNlKTtcbiAgY29uc3QgclBhdHRlcm4gPSBfLmVzY2FwZVJlZ0V4cChwa2dOYW1lKSArICdAKFxcXFxTKilcXFxccyc7XG4gIGNvbnN0IHBhdHRlcm4gPSBuZXcgUmVnRXhwKHJQYXR0ZXJuKTtcbiAgY29uc3QgbSA9IHBhdHRlcm4uZXhlYyh0ZXh0KTtcbiAgaWYgKG0pIHtcbiAgICByZXR1cm4gbVsxXTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBmZXRjaCBkZXBlbmRlbmN5IGxhdGVzdCB2ZXJzaW9uIChwYXR0ZXJuOiAke3BhdHRlcm59KSBmcm9tIG1lc3NhZ2U6XFxuICR7dGV4dH1gKTtcbn1cbiJdfQ==