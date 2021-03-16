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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFkZC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hZGQtcGFja2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpRkFBMkQ7QUFDM0QsbUNBQTRDO0FBQzVDLHFFQUFnRTtBQUNoRSxvREFBcUM7QUFDckMsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixtQ0FBaUM7QUFDakMsb0RBQXVCO0FBQ3ZCLGtEQUEwQjtBQUMxQiw0REFBbUM7QUFDbkMsd0NBQXlDO0FBQ3pDLDRFQUE0RTtBQUM1RSxnREFBMkg7QUFDM0gsTUFBTSxHQUFHLEdBQUcsa0JBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBRS9DLFNBQXNCLGVBQWUsQ0FBQyxRQUFrQixFQUFFLEVBQVcsRUFBRSxHQUFHLEdBQUcsS0FBSzs7UUFDaEYsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7U0FDN0Q7UUFDRCxJQUFJLE1BQU0sR0FBYSxFQUFFLENBQUM7UUFDMUIsSUFBSSxFQUFFLElBQUksSUFBSSxFQUFFO1lBQ2QsSUFBSSxzQkFBYyxFQUFFLEVBQUU7Z0JBQ3BCLEVBQUUsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7YUFDcEI7aUJBQU07Z0JBQ0wsTUFBTSxFQUFFLEdBQUcsZ0JBQVEsRUFBRSxDQUFDLGFBQWEsQ0FBQztnQkFDcEMsSUFBSSxFQUFFLElBQUksSUFBSSxFQUFFO29CQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsd0ZBQXdGO3dCQUN0RyxzRkFBc0Y7d0JBQ3RGLG9DQUFvQyxDQUFDLENBQUM7aUJBQ3pDO2dCQUNELEVBQUUsR0FBRyxvQkFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3ZCO1lBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNqQjth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T0FBTyxDQUFDLENBQUM7UUFDbEYsTUFBTSxRQUFRLEdBQUcsZ0JBQUMsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsWUFBWSxDQUFDO1FBQ3hELE1BQU0sT0FBTyxHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLEVBQUU7WUFDTCxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNiO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyx1REFBdUQsT0FBTyxxQkFBcUIsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUM3RyxDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGFyc2UsIHtPYmplY3RBc3R9IGZyb20gJy4uL3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCByZXBsYWNlVGV4dCwge1JlcGxhY2VtZW50SW5mfSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCB7ZXhlfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgc3RyaXBBbnNpIGZyb20gJ3N0cmlwLWFuc2knO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB7d29ya3NwYWNlc09mRGVwZW5kZW5jaWVzfSBmcm9tICcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7YWN0aW9uRGlzcGF0Y2hlciBhcyBwa2dEaXNwYXRlciwgaXNDd2RXb3Jrc3BhY2UsIGdldFN0YXRlLCB3b3Jrc3BhY2VEaXIsIHdvcmtzcGFjZUtleX0gZnJvbSAnLi4vcGFja2FnZS1tZ3IvaW5kZXgnO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5jbGktYWRkLXBhY2thZ2UnKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkZERlcGVuZGVuY3lUbyhwYWNrYWdlczogc3RyaW5nW10sIHRvPzogc3RyaW5nLCBkZXYgPSBmYWxzZSkge1xuICBpZiAocGFja2FnZXMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdBdCBsZWFzdCBzcGVjaWZ5IG9uZSBkZXBlbmRlbmN5IGFyZ3VtZW50Jyk7XG4gIH1cbiAgbGV0IHdzRGlyczogc3RyaW5nW10gPSBbXTtcbiAgaWYgKHRvID09IG51bGwpIHtcbiAgICBpZiAoaXNDd2RXb3Jrc3BhY2UoKSkge1xuICAgICAgdG8gPSBwcm9jZXNzLmN3ZCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB3cyA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgICAgIGlmICh3cyA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gd29ya3RyZWUgc3BhY2UgaXMgZm91bmQgZm9yIGN1cnJlbnQgZGlyZWN0b3J5LCBhbmQgbm8gXCItLXRvXCIgb3B0aW9uIGlzIHNwZWNpZmllZC5cXG4nICtcbiAgICAgICAgICAnRWl0aGVyIGV4ZWN1dGUgdGhpcyBjb21tYW5kIHdpdGggb3B0aW9uIFwiLS10byA8cGtnIG5hbWUgfCBwa2cgZGlyIHwgd29ya3RyZWUgc3BhY2U+XCInICtcbiAgICAgICAgICAnb3IgaW4gYSB3b3Jrc3RyZWUgc3BhY2UgZGlyZWN0b3J5LicpO1xuICAgICAgfVxuICAgICAgdG8gPSB3b3Jrc3BhY2VEaXIod3MpO1xuICAgIH1cbiAgICB3c0RpcnMucHVzaCh0byk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgdHJ5V3NLZXkgPSB3b3Jrc3BhY2VLZXkodG8pO1xuICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHRyeVdzS2V5KSkge1xuICAgICAgd3NEaXJzLnB1c2goUGF0aC5yZXNvbHZlKHRvKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IFtmb3VuZFBrZ10gPSBmaW5kUGFja2FnZXNCeU5hbWVzKFt0b10pO1xuICAgICAgaWYgKGZvdW5kUGtnID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBtYXRjaGVkIGxpbmtlZCBwYWNrYWdlIG9yIHdvcmt0cmVlIHNwYWNlIGlzIGZvdW5kIGZvciBvcHRpb24gXCItLXRvXCInKTtcbiAgICAgIH1cbiAgICAgIHRvID0gZm91bmRQa2cucmVhbFBhdGg7XG4gICAgICBjb25zdCByb290RGlyID0gZ2V0Um9vdERpcigpO1xuICAgICAgd3NEaXJzID0gQXJyYXkuZnJvbSh3b3Jrc3BhY2VzT2ZEZXBlbmRlbmNpZXMoZm91bmRQa2cubmFtZSkpXG4gICAgICAgIC5tYXAod3MgPT4gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdzKSk7XG4gICAgfVxuICB9XG4gIGF3YWl0IGFkZChwYWNrYWdlcywgdG8sIGRldik7XG4gIHNldEltbWVkaWF0ZSgoKSA9PiB7XG4gICAgZm9yIChjb25zdCB3c0RpciBvZiB3c0RpcnMpIHtcbiAgICAgIHBrZ0Rpc3BhdGVyLnVwZGF0ZVdvcmtzcGFjZSh7ZGlyOiB3c0RpciwgaXNGb3JjZTogZmFsc2UsIGNyZWF0ZUhvb2s6IGZhbHNlfSk7XG4gICAgfVxuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYWRkKHBhY2thZ2VzOiBzdHJpbmdbXSwgdG9EaXI6IHN0cmluZywgZGV2ID0gZmFsc2UpIHtcbiAgY29uc3QgdGFyZ2V0SnNvbkZpbGUgPSBQYXRoLnJlc29sdmUodG9EaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgY29uc3QgcGtnSnNvblN0ciA9IGZzLnJlYWRGaWxlU3luYyh0YXJnZXRKc29uRmlsZSwgJ3V0Zi04Jyk7XG4gIGNvbnN0IG9iakFzdCA9IHBhcnNlKHBrZ0pzb25TdHIpO1xuICBjb25zdCBwYXRjaGVzOiBSZXBsYWNlbWVudEluZltdID0gW107XG5cbiAgY29uc3QgZGVwc0FzdCA9IGRldiA/IG9iakFzdC5wcm9wZXJ0aWVzLmZpbmQocHJvcCA9PiBwcm9wLm5hbWUudGV4dCA9PT0gJ1wiZGV2RGVwZW5kZW5jaWVzXCInKSA6XG4gICAgb2JqQXN0LnByb3BlcnRpZXMuZmluZChwcm9wID0+IHByb3AubmFtZS50ZXh0ID09PSAnXCJkZXBlbmRlbmNpZXNcIicpO1xuXG4gIGNvbnN0IGRlcHNTZXQgPSBkZXBzQXN0ID09IG51bGwgP1xuICAgIG5ldyBTZXQ8c3RyaW5nPigpIDpcbiAgICBuZXcgU2V0PHN0cmluZz4oKGRlcHNBc3QudmFsdWUgYXMgT2JqZWN0QXN0KS5wcm9wZXJ0aWVzLm1hcChwcm9wID0+IHByb3AubmFtZS50ZXh0LnNsaWNlKDEsIC0xKSkpO1xuXG4gIGxvZy5kZWJ1ZygnZXhpc3Rpbmc6JywgZGVwc1NldCk7XG4gIGNvbnN0IGlucHV0ID0gcGFja2FnZXMubWFwKHJhd05hbWUgPT4ge1xuICAgIGNvbnN0IG0gPSAvXigoPzpAW14vXStcXC8pP1teL0BdKykoPzpAKFteXSspKT8kLy5leGVjKHJhd05hbWUpO1xuICAgIGlmIChtKSB7XG4gICAgICByZXR1cm4gW21bMV0sIG1bMl1dIGFzIFtuYW1lOiBzdHJpbmcsIHZlcjogc3RyaW5nIHwgdW5kZWZpbmVkXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHBhY2thZ2UgbmFtZTogJHtyYXdOYW1lfSwgdmFsaWQgbmFtZSBzaG91bGQgYmUgbGlrZSBcIjxwa2cgbmFtZT5bQDx2ZXJzaW9uPl1cImApO1xuICAgIH1cbiAgfSk7XG4gIGxldCBpID0gMDtcbiAgbGV0IG5ld0xpbmVzID0gJyc7XG4gIGNvbnN0IHNyY1BrZ3MgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoaW5wdXQubWFwKGl0ZW0gPT4gaXRlbVswXSkpKTtcblxuICBhd2FpdCBQcm9taXNlLmFsbChzcmNQa2dzLm1hcChhc3luYyBwa2cgPT4ge1xuICAgIGNvbnN0IGlucHV0SXRlbSA9IGlucHV0W2krK107XG4gICAgbGV0IHZlcnNpb24gPSBpbnB1dEl0ZW1bMV07XG5cbiAgICBpZiAocGtnID09IG51bGwgfHwgKHBrZy5qc29uLmRyID09IG51bGwgJiYgcGtnLmpzb24ucGxpbmsgPT0gbnVsbCkpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBpbnB1dEl0ZW1bMF07XG4gICAgICBpZiAoZGVwc1NldC5oYXMobmFtZSkpIHtcbiAgICAgICAgbG9nLndhcm4oYEZvdW5kIGR1cGxpY2F0ZSBleGlzdGluZyBkZXBlbmRlbmN5ICR7Y2hhbGsucmVkKG5hbWUpfWApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodmVyc2lvbiA9PSBudWxsKSB7XG4gICAgICAgIHZlcnNpb24gPSBhd2FpdCBmZXRjaFJlbW90ZVZlcnNpb24obmFtZSk7XG4gICAgICB9XG4gICAgICBsb2cuaW5mbyhgUGFja2FnZSAke25hbWV9QCR7dmVyc2lvbn0gaXMgbm90IGEgbGlua2VkIHBhY2thZ2UsIGFkZCBhcyAzcmQgcGFydHkgZGVwZW5kZW5jeWApO1xuICAgICAgbmV3TGluZXMgKz0gYCAgICBcIiR7bmFtZX1cIjogXCIke3ZlcnNpb259XCIsXFxuYDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGRlcHNTZXQuaGFzKHBrZy5uYW1lKSkge1xuICAgICAgICBsb2cud2FybihgRHVwbGljYXRlIHdpdGggZXhpc3RpbmcgZGVwZW5kZW5jeSAke2NoYWxrLnJlZChwa2cubmFtZSl9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGxvZy5pbmZvKGBBZGQgcGFja2FnZSAke2NoYWxrLmN5YW4ocGtnLm5hbWUpfSAke3ZlcnNpb24gfHwgJyd9YCk7XG4gICAgICBuZXdMaW5lcyArPSBgICAgIFwiJHtwa2cubmFtZX1cIjogXCIke3ZlcnNpb24gfHwgcGtnLmpzb24udmVyc2lvbn1cIixcXG5gO1xuICAgIH1cbiAgfSkpO1xuICBpZiAobmV3TGluZXMubGVuZ3RoID4gMClcbiAgICBuZXdMaW5lcyA9IG5ld0xpbmVzLnNsaWNlKDAsIG5ld0xpbmVzLmxlbmd0aCAtIDIpOyAvLyB0cmltIGxhc3QgY29tbWFcbiAgZWxzZVxuICAgIHJldHVybjtcbiAgbG9nLmRlYnVnKG5ld0xpbmVzKTtcblxuICBpZiAoZGVwc0FzdCA9PSBudWxsKSB7XG4gICAgY29uc3QgbGFzdCA9IG9iakFzdC5wcm9wZXJ0aWVzW29iakFzdC5wcm9wZXJ0aWVzLmxlbmd0aCAtIDFdO1xuICAgIGNvbnN0IHBvcyA9IGxhc3QudmFsdWUuZW5kO1xuICAgIHBhdGNoZXMucHVzaCh7c3RhcnQ6IHBvcywgZW5kOiBwb3MsXG4gICAgICB0ZXh0OiBgLFxcbiAgXCIke2RldiA/ICdkZXZEZXBlbmRlbmNpZXMnIDogJ2RlcGVuZGVuY2llcyd9XCI6IHtcXG4ke25ld0xpbmVzfVxcbiAgfWB9KTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBwcm9wcyA9IChkZXBzQXN0LnZhbHVlIGFzIE9iamVjdEFzdCkucHJvcGVydGllcztcbiAgICBsZXQgc3RhcnQgPSAwO1xuICAgIGlmIChwcm9wcy5sZW5ndGggPiAwKSB7XG4gICAgICBzdGFydCA9IHByb3BzW3Byb3BzLmxlbmd0aCAtIDFdLnZhbHVlLmVuZDtcbiAgICAgIG5ld0xpbmVzID0gJyxcXG4nICsgbmV3TGluZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXJ0ID0gZGVwc0FzdC52YWx1ZS5lbmQgLSAxO1xuICAgIH1cblxuICAgIHBhdGNoZXMucHVzaCh7c3RhcnQsIGVuZDogc3RhcnQsIHRleHQ6IG5ld0xpbmVzfSk7XG4gIH1cblxuICBjb25zdCBuZXdKc29uVGV4dCA9IHJlcGxhY2VUZXh0KHBrZ0pzb25TdHIsIHBhdGNoZXMpO1xuICBsb2cuaW5mbyhgV3JpdGUgZmlsZTogJHt0YXJnZXRKc29uRmlsZX06XFxuYCArIG5ld0pzb25UZXh0KTtcbiAgZnMud3JpdGVGaWxlU3luYyh0YXJnZXRKc29uRmlsZSwgbmV3SnNvblRleHQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaFJlbW90ZVZlcnNpb24ocGtnTmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IHRleHQgPSBzdHJpcEFuc2koYXdhaXQgZXhlKCducG0nLCAndmlldycsIHBrZ05hbWUsIHtzaWxlbnQ6IHRydWV9KS5wcm9taXNlKTtcbiAgY29uc3QgclBhdHRlcm4gPSBfLmVzY2FwZVJlZ0V4cChwa2dOYW1lKSArICdAKFxcXFxTKilcXFxccyc7XG4gIGNvbnN0IHBhdHRlcm4gPSBuZXcgUmVnRXhwKHJQYXR0ZXJuKTtcbiAgY29uc3QgbSA9IHBhdHRlcm4uZXhlYyh0ZXh0KTtcbiAgaWYgKG0pIHtcbiAgICByZXR1cm4gbVsxXTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBmZXRjaCBkZXBlbmRlbmN5IGxhdGVzdCB2ZXJzaW9uIChwYXR0ZXJuOiAke3BhdHRlcm59KSBmcm9tIG1lc3NhZ2U6XFxuICR7dGV4dH1gKTtcbn1cbiJdfQ==