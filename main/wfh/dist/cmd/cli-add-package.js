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
const log = log4js_1.getLogger('plink.cli-add-package');
function addDependencyTo(packages, to, dev = false) {
    return __awaiter(this, void 0, void 0, function* () {
        if (packages.length === 0) {
            throw new Error('At least specify one dependency argument');
        }
        let wsDirs = [];
        if (to == null) {
            if (index_1.isCwdWorkspace()) {
                to = misc_1.plinkEnv.workDir;
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
                const rootDir = misc_1.plinkEnv.rootDir;
                wsDirs = Array.from(package_list_helper_1.workspacesOfDependencies(foundPkg.name))
                    .map(ws => path_1.default.resolve(rootDir, ws));
            }
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
        throw new Error(`Failed to fetch dependency latest version (pattern: ${rPattern}) from message:\n ${text}`);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFkZC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hZGQtcGFja2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpRkFBMkQ7QUFDM0QsbUNBQTRDO0FBQzVDLHFFQUFnRTtBQUNoRSxvREFBcUM7QUFDckMsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixtQ0FBaUM7QUFDakMsb0RBQXVCO0FBQ3ZCLGtEQUEwQjtBQUMxQiw0REFBbUM7QUFDbkMsd0NBQXVDO0FBQ3ZDLDRFQUE0RTtBQUM1RSxnREFBMkg7QUFDM0gsNEJBQTBCO0FBQzFCLE1BQU0sR0FBRyxHQUFHLGtCQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUUvQyxTQUFzQixlQUFlLENBQUMsUUFBa0IsRUFBRSxFQUFXLEVBQUUsR0FBRyxHQUFHLEtBQUs7O1FBQ2hGLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDekIsTUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO1NBQzdEO1FBQ0QsSUFBSSxNQUFNLEdBQWEsRUFBRSxDQUFDO1FBQzFCLElBQUksRUFBRSxJQUFJLElBQUksRUFBRTtZQUNkLElBQUksc0JBQWMsRUFBRSxFQUFFO2dCQUNwQixFQUFFLEdBQUcsZUFBUSxDQUFDLE9BQU8sQ0FBQzthQUN2QjtpQkFBTTtnQkFDTCxNQUFNLEVBQUUsR0FBRyxnQkFBUSxFQUFFLENBQUMsYUFBYSxDQUFDO2dCQUNwQyxJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUU7b0JBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyx3RkFBd0Y7d0JBQ3RHLHNGQUFzRjt3QkFDdEYsb0NBQW9DLENBQUMsQ0FBQztpQkFDekM7Z0JBQ0QsRUFBRSxHQUFHLG9CQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDdkI7WUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFD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QUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xGLE1BQU0sUUFBUSxHQUFHLGdCQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLFlBQVksQ0FBQztRQUN4RCxNQUFNLE9BQU8sR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxFQUFFO1lBQ0wsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDYjtRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsdURBQXVELFFBQVEscUJBQXFCLElBQUksRUFBRSxDQUFDLENBQUM7SUFDOUcsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBhcnNlLCB7T2JqZWN0QXN0fSBmcm9tICcuLi91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgcmVwbGFjZVRleHQsIHtSZXBsYWNlbWVudEluZn0gZnJvbSAnLi4vdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQge2V4ZX0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHN0cmlwQW5zaSBmcm9tICdzdHJpcC1hbnNpJztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IHt3b3Jrc3BhY2VzT2ZEZXBlbmRlbmNpZXN9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHthY3Rpb25EaXNwYXRjaGVyIGFzIHBrZ0Rpc3BhdGVyLCBpc0N3ZFdvcmtzcGFjZSwgZ2V0U3RhdGUsIHdvcmtzcGFjZURpciwgd29ya3NwYWNlS2V5fSBmcm9tICcuLi9wYWNrYWdlLW1nci9pbmRleCc7XG5pbXBvcnQgJy4uL2VkaXRvci1oZWxwZXInO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5jbGktYWRkLXBhY2thZ2UnKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkZERlcGVuZGVuY3lUbyhwYWNrYWdlczogc3RyaW5nW10sIHRvPzogc3RyaW5nLCBkZXYgPSBmYWxzZSkge1xuICBpZiAocGFja2FnZXMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdBdCBsZWFzdCBzcGVjaWZ5IG9uZSBkZXBlbmRlbmN5IGFyZ3VtZW50Jyk7XG4gIH1cbiAgbGV0IHdzRGlyczogc3RyaW5nW10gPSBbXTtcbiAgaWYgKHRvID09IG51bGwpIHtcbiAgICBpZiAoaXNDd2RXb3Jrc3BhY2UoKSkge1xuICAgICAgdG8gPSBwbGlua0Vudi53b3JrRGlyO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB3cyA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgICAgIGlmICh3cyA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gd29ya3RyZWUgc3BhY2UgaXMgZm91bmQgZm9yIGN1cnJlbnQgZGlyZWN0b3J5LCBhbmQgbm8gXCItLXRvXCIgb3B0aW9uIGlzIHNwZWNpZmllZC5cXG4nICtcbiAgICAgICAgICAnRWl0aGVyIGV4ZWN1dGUgdGhpcyBjb21tYW5kIHdpdGggb3B0aW9uIFwiLS10byA8cGtnIG5hbWUgfCBwa2cgZGlyIHwgd29ya3RyZWUgc3BhY2U+XCInICtcbiAgICAgICAgICAnb3IgaW4gYSB3b3Jrc3RyZWUgc3BhY2UgZGlyZWN0b3J5LicpO1xuICAgICAgfVxuICAgICAgdG8gPSB3b3Jrc3BhY2VEaXIod3MpO1xuICAgIH1cbiAgICB3c0RpcnMucHVzaCh0byk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgdHJ5V3NLZXkgPSB3b3Jrc3BhY2VLZXkodG8pO1xuICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHRyeVdzS2V5KSkge1xuICAgICAgd3NEaXJzLnB1c2goUGF0aC5yZXNvbHZlKHRvKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IFtmb3VuZFBrZ10gPSBmaW5kUGFja2FnZXNCeU5hbWVzKFt0b10pO1xuICAgICAgaWYgKGZvdW5kUGtnID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBtYXRjaGVkIGxpbmtlZCBwYWNrYWdlIG9yIHdvcmt0cmVlIHNwYWNlIGlzIGZvdW5kIGZvciBvcHRpb24gXCItLXRvXCInKTtcbiAgICAgIH1cbiAgICAgIHRvID0gZm91bmRQa2cucmVhbFBhdGg7XG4gICAgICBjb25zdCByb290RGlyID0gcGxpbmtFbnYucm9vdERpcjtcbiAgICAgIHdzRGlycyA9IEFycmF5LmZyb20od29ya3NwYWNlc09mRGVwZW5kZW5jaWVzKGZvdW5kUGtnLm5hbWUpKVxuICAgICAgICAubWFwKHdzID0+IFBhdGgucmVzb2x2ZShyb290RGlyLCB3cykpO1xuICAgIH1cbiAgfVxuICBhd2FpdCBhZGQocGFja2FnZXMsIHRvLCBkZXYpO1xuICBzZXRJbW1lZGlhdGUoKCkgPT4ge1xuICAgIGZvciAoY29uc3Qgd3NEaXIgb2Ygd3NEaXJzKSB7XG4gICAgICBwa2dEaXNwYXRlci51cGRhdGVXb3Jrc3BhY2Uoe2Rpcjogd3NEaXIsIGlzRm9yY2U6IGZhbHNlLCBjcmVhdGVIb29rOiBmYWxzZX0pO1xuICAgIH1cbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGFkZChwYWNrYWdlczogc3RyaW5nW10sIHRvRGlyOiBzdHJpbmcsIGRldiA9IGZhbHNlKSB7XG4gIGNvbnN0IHRhcmdldEpzb25GaWxlID0gUGF0aC5yZXNvbHZlKHRvRGlyLCAncGFja2FnZS5qc29uJyk7XG4gIGNvbnN0IHBrZ0pzb25TdHIgPSBmcy5yZWFkRmlsZVN5bmModGFyZ2V0SnNvbkZpbGUsICd1dGYtOCcpO1xuICBjb25zdCBvYmpBc3QgPSBwYXJzZShwa2dKc29uU3RyKTtcbiAgY29uc3QgcGF0Y2hlczogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuXG4gIGNvbnN0IGRlcHNBc3QgPSBkZXYgPyBvYmpBc3QucHJvcGVydGllcy5maW5kKHByb3AgPT4gcHJvcC5uYW1lLnRleHQgPT09ICdcImRldkRlcGVuZGVuY2llc1wiJykgOlxuICAgIG9iakFzdC5wcm9wZXJ0aWVzLmZpbmQocHJvcCA9PiBwcm9wLm5hbWUudGV4dCA9PT0gJ1wiZGVwZW5kZW5jaWVzXCInKTtcblxuICBjb25zdCBkZXBzU2V0ID0gZGVwc0FzdCA9PSBudWxsID9cbiAgICBuZXcgU2V0PHN0cmluZz4oKSA6XG4gICAgbmV3IFNldDxzdHJpbmc+KChkZXBzQXN0LnZhbHVlIGFzIE9iamVjdEFzdCkucHJvcGVydGllcy5tYXAocHJvcCA9PiBwcm9wLm5hbWUudGV4dC5zbGljZSgxLCAtMSkpKTtcblxuICBsb2cuZGVidWcoJ2V4aXN0aW5nOicsIGRlcHNTZXQpO1xuICBjb25zdCBpbnB1dCA9IHBhY2thZ2VzLm1hcChyYXdOYW1lID0+IHtcbiAgICBjb25zdCBtID0gL14oKD86QFteL10rXFwvKT9bXi9AXSspKD86QChbXl0rKSk/JC8uZXhlYyhyYXdOYW1lKTtcbiAgICBpZiAobSkge1xuICAgICAgcmV0dXJuIFttWzFdLCBtWzJdXSBhcyBbbmFtZTogc3RyaW5nLCB2ZXI6IHN0cmluZyB8IHVuZGVmaW5lZF07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBwYWNrYWdlIG5hbWU6ICR7cmF3TmFtZX0sIHZhbGlkIG5hbWUgc2hvdWxkIGJlIGxpa2UgXCI8cGtnIG5hbWU+W0A8dmVyc2lvbj5dXCJgKTtcbiAgICB9XG4gIH0pO1xuICBsZXQgaSA9IDA7XG4gIGxldCBuZXdMaW5lcyA9ICcnO1xuICBjb25zdCBzcmNQa2dzID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKGlucHV0Lm1hcChpdGVtID0+IGl0ZW1bMF0pKSk7XG5cbiAgYXdhaXQgUHJvbWlzZS5hbGwoc3JjUGtncy5tYXAoYXN5bmMgcGtnID0+IHtcbiAgICBjb25zdCBpbnB1dEl0ZW0gPSBpbnB1dFtpKytdO1xuICAgIGxldCB2ZXJzaW9uID0gaW5wdXRJdGVtWzFdO1xuXG4gICAgaWYgKHBrZyA9PSBudWxsIHx8IChwa2cuanNvbi5kciA9PSBudWxsICYmIHBrZy5qc29uLnBsaW5rID09IG51bGwpKSB7XG4gICAgICBjb25zdCBuYW1lID0gaW5wdXRJdGVtWzBdO1xuICAgICAgaWYgKGRlcHNTZXQuaGFzKG5hbWUpKSB7XG4gICAgICAgIGxvZy53YXJuKGBGb3VuZCBkdXBsaWNhdGUgZXhpc3RpbmcgZGVwZW5kZW5jeSAke2NoYWxrLnJlZChuYW1lKX1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHZlcnNpb24gPT0gbnVsbCkge1xuICAgICAgICB2ZXJzaW9uID0gYXdhaXQgZmV0Y2hSZW1vdGVWZXJzaW9uKG5hbWUpO1xuICAgICAgfVxuICAgICAgbG9nLmluZm8oYFBhY2thZ2UgJHtuYW1lfUAke3ZlcnNpb259IGlzIG5vdCBhIGxpbmtlZCBwYWNrYWdlLCBhZGQgYXMgM3JkIHBhcnR5IGRlcGVuZGVuY3lgKTtcbiAgICAgIG5ld0xpbmVzICs9IGAgICAgXCIke25hbWV9XCI6IFwiJHt2ZXJzaW9ufVwiLFxcbmA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChkZXBzU2V0Lmhhcyhwa2cubmFtZSkpIHtcbiAgICAgICAgbG9nLndhcm4oYER1cGxpY2F0ZSB3aXRoIGV4aXN0aW5nIGRlcGVuZGVuY3kgJHtjaGFsay5yZWQocGtnLm5hbWUpfWApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBsb2cuaW5mbyhgQWRkIHBhY2thZ2UgJHtjaGFsay5jeWFuKHBrZy5uYW1lKX0gJHt2ZXJzaW9uIHx8ICcnfWApO1xuICAgICAgbmV3TGluZXMgKz0gYCAgICBcIiR7cGtnLm5hbWV9XCI6IFwiJHt2ZXJzaW9uIHx8IHBrZy5qc29uLnZlcnNpb24gYXMgc3RyaW5nfVwiLFxcbmA7XG4gICAgfVxuICB9KSk7XG4gIGlmIChuZXdMaW5lcy5sZW5ndGggPiAwKVxuICAgIG5ld0xpbmVzID0gbmV3TGluZXMuc2xpY2UoMCwgbmV3TGluZXMubGVuZ3RoIC0gMik7IC8vIHRyaW0gbGFzdCBjb21tYVxuICBlbHNlXG4gICAgcmV0dXJuO1xuICBsb2cuZGVidWcobmV3TGluZXMpO1xuXG4gIGlmIChkZXBzQXN0ID09IG51bGwpIHtcbiAgICBjb25zdCBsYXN0ID0gb2JqQXN0LnByb3BlcnRpZXNbb2JqQXN0LnByb3BlcnRpZXMubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgcG9zID0gbGFzdC52YWx1ZS5lbmQ7XG4gICAgcGF0Y2hlcy5wdXNoKHtzdGFydDogcG9zLCBlbmQ6IHBvcyxcbiAgICAgIHRleHQ6IGAsXFxuICBcIiR7ZGV2ID8gJ2RldkRlcGVuZGVuY2llcycgOiAnZGVwZW5kZW5jaWVzJ31cIjoge1xcbiR7bmV3TGluZXN9XFxuICB9YH0pO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHByb3BzID0gKGRlcHNBc3QudmFsdWUgYXMgT2JqZWN0QXN0KS5wcm9wZXJ0aWVzO1xuICAgIGxldCBzdGFydCA9IDA7XG4gICAgaWYgKHByb3BzLmxlbmd0aCA+IDApIHtcbiAgICAgIHN0YXJ0ID0gcHJvcHNbcHJvcHMubGVuZ3RoIC0gMV0udmFsdWUuZW5kO1xuICAgICAgbmV3TGluZXMgPSAnLFxcbicgKyBuZXdMaW5lcztcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhcnQgPSBkZXBzQXN0LnZhbHVlLmVuZCAtIDE7XG4gICAgfVxuXG4gICAgcGF0Y2hlcy5wdXNoKHtzdGFydCwgZW5kOiBzdGFydCwgdGV4dDogbmV3TGluZXN9KTtcbiAgfVxuXG4gIGNvbnN0IG5ld0pzb25UZXh0ID0gcmVwbGFjZVRleHQocGtnSnNvblN0ciwgcGF0Y2hlcyk7XG4gIGxvZy5pbmZvKGBXcml0ZSBmaWxlOiAke3RhcmdldEpzb25GaWxlfTpcXG5gICsgbmV3SnNvblRleHQpO1xuICBmcy53cml0ZUZpbGVTeW5jKHRhcmdldEpzb25GaWxlLCBuZXdKc29uVGV4dCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoUmVtb3RlVmVyc2lvbihwa2dOYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgdGV4dCA9IHN0cmlwQW5zaShhd2FpdCBleGUoJ25wbScsICd2aWV3JywgcGtnTmFtZSwge3NpbGVudDogdHJ1ZX0pLnByb21pc2UpO1xuICBjb25zdCByUGF0dGVybiA9IF8uZXNjYXBlUmVnRXhwKHBrZ05hbWUpICsgJ0AoXFxcXFMqKVxcXFxzJztcbiAgY29uc3QgcGF0dGVybiA9IG5ldyBSZWdFeHAoclBhdHRlcm4pO1xuICBjb25zdCBtID0gcGF0dGVybi5leGVjKHRleHQpO1xuICBpZiAobSkge1xuICAgIHJldHVybiBtWzFdO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGZldGNoIGRlcGVuZGVuY3kgbGF0ZXN0IHZlcnNpb24gKHBhdHRlcm46ICR7clBhdHRlcm59KSBmcm9tIG1lc3NhZ2U6XFxuICR7dGV4dH1gKTtcbn1cbiJdfQ==