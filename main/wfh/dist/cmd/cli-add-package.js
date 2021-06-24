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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFkZC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hZGQtcGFja2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpRkFBMkQ7QUFDM0QsbUNBQTRDO0FBQzVDLHFFQUFnRTtBQUNoRSxvREFBcUM7QUFDckMsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixtQ0FBaUM7QUFDakMsb0RBQXVCO0FBQ3ZCLGtEQUEwQjtBQUMxQiw0REFBbUM7QUFDbkMsd0NBQXVDO0FBQ3ZDLDRFQUE0RTtBQUM1RSxnREFBMkg7QUFDM0gsNEJBQTBCO0FBQzFCLE1BQU0sR0FBRyxHQUFHLGtCQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUUvQyxTQUFzQixlQUFlLENBQUMsUUFBa0IsRUFBRSxFQUFXLEVBQUUsR0FBRyxHQUFHLEtBQUs7O1FBQ2hGLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDekIsTUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO1NBQzdEO1FBQ0QsSUFBSSxNQUFNLEdBQWEsRUFBRSxDQUFDO1FBQzFCLElBQUksRUFBRSxJQUFJLElBQUksRUFBRTtZQUNkLElBQUksc0JBQWMsRUFBRSxFQUFFO2dCQUNwQixFQUFFLEdBQUcsZUFBUSxDQUFDLE9BQU8sQ0FBQzthQUN2QjtpQkFBTTtnQkFDTCxNQUFNLEVBQUUsR0FBRyxnQkFBUSxFQUFFLENBQUMsYUFBYSxDQUFDO2dCQUNwQyxJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUU7b0JBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyx3RkFBd0Y7d0JBQ3RHLHNGQUFzRjt3QkFDdEYsb0NBQW9DLENBQUMsQ0FBQztpQkFDekM7Z0JBQ0QsRUFBRSxHQUFHLG9CQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDdkI7WUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFD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QyxDQUFDO1FBQ2xGLE1BQU0sUUFBUSxHQUFHLGdCQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLFlBQVksQ0FBQztRQUN4RCxNQUFNLE9BQU8sR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxFQUFFO1lBQ0wsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDYjtRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsdURBQXVELFFBQVEscUJBQXFCLElBQUksRUFBRSxDQUFDLENBQUM7SUFDOUcsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBhcnNlLCB7T2JqZWN0QXN0fSBmcm9tICcuLi91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgcmVwbGFjZVRleHQsIHtSZXBsYWNlbWVudEluZn0gZnJvbSAnLi4vdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQge2V4ZX0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHN0cmlwQW5zaSBmcm9tICdzdHJpcC1hbnNpJztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IHt3b3Jrc3BhY2VzT2ZEZXBlbmRlbmNpZXN9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHthY3Rpb25EaXNwYXRjaGVyIGFzIHBrZ0Rpc3BhdGVyLCBpc0N3ZFdvcmtzcGFjZSwgZ2V0U3RhdGUsIHdvcmtzcGFjZURpciwgd29ya3NwYWNlS2V5fSBmcm9tICcuLi9wYWNrYWdlLW1nci9pbmRleCc7XG5pbXBvcnQgJy4uL2VkaXRvci1oZWxwZXInO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5jbGktYWRkLXBhY2thZ2UnKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkZERlcGVuZGVuY3lUbyhwYWNrYWdlczogc3RyaW5nW10sIHRvPzogc3RyaW5nLCBkZXYgPSBmYWxzZSkge1xuICBpZiAocGFja2FnZXMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdBdCBsZWFzdCBzcGVjaWZ5IG9uZSBkZXBlbmRlbmN5IGFyZ3VtZW50Jyk7XG4gIH1cbiAgbGV0IHdzRGlyczogc3RyaW5nW10gPSBbXTtcbiAgaWYgKHRvID09IG51bGwpIHtcbiAgICBpZiAoaXNDd2RXb3Jrc3BhY2UoKSkge1xuICAgICAgdG8gPSBwbGlua0Vudi53b3JrRGlyO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB3cyA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgICAgIGlmICh3cyA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gd29ya3RyZWUgc3BhY2UgaXMgZm91bmQgZm9yIGN1cnJlbnQgZGlyZWN0b3J5LCBhbmQgbm8gXCItLXRvXCIgb3B0aW9uIGlzIHNwZWNpZmllZC5cXG4nICtcbiAgICAgICAgICAnRWl0aGVyIGV4ZWN1dGUgdGhpcyBjb21tYW5kIHdpdGggb3B0aW9uIFwiLS10byA8cGtnIG5hbWUgfCBwa2cgZGlyIHwgd29ya3RyZWUgc3BhY2U+XCInICtcbiAgICAgICAgICAnb3IgaW4gYSB3b3Jrc3RyZWUgc3BhY2UgZGlyZWN0b3J5LicpO1xuICAgICAgfVxuICAgICAgdG8gPSB3b3Jrc3BhY2VEaXIod3MpO1xuICAgIH1cbiAgICB3c0RpcnMucHVzaCh0byk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgdHJ5V3NLZXkgPSB3b3Jrc3BhY2VLZXkodG8pO1xuICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHRyeVdzS2V5KSkge1xuICAgICAgd3NEaXJzLnB1c2goUGF0aC5yZXNvbHZlKHRvKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IFtmb3VuZFBrZ10gPSBmaW5kUGFja2FnZXNCeU5hbWVzKFt0b10pO1xuICAgICAgaWYgKGZvdW5kUGtnID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBtYXRjaGVkIGxpbmtlZCBwYWNrYWdlIG9yIHdvcmt0cmVlIHNwYWNlIGlzIGZvdW5kIGZvciBvcHRpb24gXCItLXRvXCInKTtcbiAgICAgIH1cbiAgICAgIHRvID0gZm91bmRQa2cucmVhbFBhdGg7XG4gICAgICBjb25zdCByb290RGlyID0gcGxpbmtFbnYucm9vdERpcjtcbiAgICAgIHdzRGlycyA9IEFycmF5LmZyb20od29ya3NwYWNlc09mRGVwZW5kZW5jaWVzKGZvdW5kUGtnLm5hbWUpKVxuICAgICAgICAubWFwKHdzID0+IFBhdGgucmVzb2x2ZShyb290RGlyLCB3cykpO1xuICAgIH1cbiAgfVxuICBhd2FpdCBhZGQocGFja2FnZXMsIHRvLCBkZXYpO1xuICBzZXRJbW1lZGlhdGUoKCkgPT4ge1xuICAgIGZvciAoY29uc3Qgd3NEaXIgb2Ygd3NEaXJzKSB7XG4gICAgICBwa2dEaXNwYXRlci51cGRhdGVXb3Jrc3BhY2Uoe2Rpcjogd3NEaXIsIGlzRm9yY2U6IGZhbHNlfSk7XG4gICAgfVxuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYWRkKHBhY2thZ2VzOiBzdHJpbmdbXSwgdG9EaXI6IHN0cmluZywgZGV2ID0gZmFsc2UpIHtcbiAgY29uc3QgdGFyZ2V0SnNvbkZpbGUgPSBQYXRoLnJlc29sdmUodG9EaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgY29uc3QgcGtnSnNvblN0ciA9IGZzLnJlYWRGaWxlU3luYyh0YXJnZXRKc29uRmlsZSwgJ3V0Zi04Jyk7XG4gIGNvbnN0IG9iakFzdCA9IHBhcnNlKHBrZ0pzb25TdHIpO1xuICBjb25zdCBwYXRjaGVzOiBSZXBsYWNlbWVudEluZltdID0gW107XG5cbiAgY29uc3QgZGVwc0FzdCA9IGRldiA/IG9iakFzdC5wcm9wZXJ0aWVzLmZpbmQocHJvcCA9PiBwcm9wLm5hbWUudGV4dCA9PT0gJ1wiZGV2RGVwZW5kZW5jaWVzXCInKSA6XG4gICAgb2JqQXN0LnByb3BlcnRpZXMuZmluZChwcm9wID0+IHByb3AubmFtZS50ZXh0ID09PSAnXCJkZXBlbmRlbmNpZXNcIicpO1xuXG4gIGNvbnN0IGRlcHNTZXQgPSBkZXBzQXN0ID09IG51bGwgP1xuICAgIG5ldyBTZXQ8c3RyaW5nPigpIDpcbiAgICBuZXcgU2V0PHN0cmluZz4oKGRlcHNBc3QudmFsdWUgYXMgT2JqZWN0QXN0KS5wcm9wZXJ0aWVzLm1hcChwcm9wID0+IHByb3AubmFtZS50ZXh0LnNsaWNlKDEsIC0xKSkpO1xuXG4gIGxvZy5kZWJ1ZygnZXhpc3Rpbmc6JywgZGVwc1NldCk7XG4gIGNvbnN0IGlucHV0ID0gcGFja2FnZXMubWFwKHJhd05hbWUgPT4ge1xuICAgIGNvbnN0IG0gPSAvXigoPzpAW14vXStcXC8pP1teL0BdKykoPzpAKFteXSspKT8kLy5leGVjKHJhd05hbWUpO1xuICAgIGlmIChtKSB7XG4gICAgICByZXR1cm4gW21bMV0sIG1bMl1dIGFzIFtuYW1lOiBzdHJpbmcsIHZlcjogc3RyaW5nIHwgdW5kZWZpbmVkXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHBhY2thZ2UgbmFtZTogJHtyYXdOYW1lfSwgdmFsaWQgbmFtZSBzaG91bGQgYmUgbGlrZSBcIjxwa2cgbmFtZT5bQDx2ZXJzaW9uPl1cImApO1xuICAgIH1cbiAgfSk7XG4gIGxldCBpID0gMDtcbiAgbGV0IG5ld0xpbmVzID0gJyc7XG4gIGNvbnN0IHNyY1BrZ3MgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoaW5wdXQubWFwKGl0ZW0gPT4gaXRlbVswXSkpKTtcblxuICBhd2FpdCBQcm9taXNlLmFsbChzcmNQa2dzLm1hcChhc3luYyBwa2cgPT4ge1xuICAgIGNvbnN0IGlucHV0SXRlbSA9IGlucHV0W2krK107XG4gICAgbGV0IHZlcnNpb24gPSBpbnB1dEl0ZW1bMV07XG5cbiAgICBpZiAocGtnID09IG51bGwgfHwgKHBrZy5qc29uLmRyID09IG51bGwgJiYgcGtnLmpzb24ucGxpbmsgPT0gbnVsbCkpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBpbnB1dEl0ZW1bMF07XG4gICAgICBpZiAoZGVwc1NldC5oYXMobmFtZSkpIHtcbiAgICAgICAgbG9nLndhcm4oYEZvdW5kIGR1cGxpY2F0ZSBleGlzdGluZyBkZXBlbmRlbmN5ICR7Y2hhbGsucmVkKG5hbWUpfWApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodmVyc2lvbiA9PSBudWxsKSB7XG4gICAgICAgIHZlcnNpb24gPSBhd2FpdCBmZXRjaFJlbW90ZVZlcnNpb24obmFtZSk7XG4gICAgICB9XG4gICAgICBsb2cuaW5mbyhgUGFja2FnZSAke25hbWV9QCR7dmVyc2lvbn0gaXMgbm90IGEgbGlua2VkIHBhY2thZ2UsIGFkZCBhcyAzcmQgcGFydHkgZGVwZW5kZW5jeWApO1xuICAgICAgbmV3TGluZXMgKz0gYCAgICBcIiR7bmFtZX1cIjogXCIke3ZlcnNpb259XCIsXFxuYDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGRlcHNTZXQuaGFzKHBrZy5uYW1lKSkge1xuICAgICAgICBsb2cud2FybihgRHVwbGljYXRlIHdpdGggZXhpc3RpbmcgZGVwZW5kZW5jeSAke2NoYWxrLnJlZChwa2cubmFtZSl9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGxvZy5pbmZvKGBBZGQgcGFja2FnZSAke2NoYWxrLmN5YW4ocGtnLm5hbWUpfSAke3ZlcnNpb24gfHwgJyd9YCk7XG4gICAgICBuZXdMaW5lcyArPSBgICAgIFwiJHtwa2cubmFtZX1cIjogXCIke3ZlcnNpb24gfHwgcGtnLmpzb24udmVyc2lvbiB9XCIsXFxuYDtcbiAgICB9XG4gIH0pKTtcbiAgaWYgKG5ld0xpbmVzLmxlbmd0aCA+IDApXG4gICAgbmV3TGluZXMgPSBuZXdMaW5lcy5zbGljZSgwLCBuZXdMaW5lcy5sZW5ndGggLSAyKTsgLy8gdHJpbSBsYXN0IGNvbW1hXG4gIGVsc2VcbiAgICByZXR1cm47XG4gIGxvZy5kZWJ1ZyhuZXdMaW5lcyk7XG5cbiAgaWYgKGRlcHNBc3QgPT0gbnVsbCkge1xuICAgIGNvbnN0IGxhc3QgPSBvYmpBc3QucHJvcGVydGllc1tvYmpBc3QucHJvcGVydGllcy5sZW5ndGggLSAxXTtcbiAgICBjb25zdCBwb3MgPSBsYXN0LnZhbHVlLmVuZDtcbiAgICBwYXRjaGVzLnB1c2goe3N0YXJ0OiBwb3MsIGVuZDogcG9zLFxuICAgICAgdGV4dDogYCxcXG4gIFwiJHtkZXYgPyAnZGV2RGVwZW5kZW5jaWVzJyA6ICdkZXBlbmRlbmNpZXMnfVwiOiB7XFxuJHtuZXdMaW5lc31cXG4gIH1gfSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcHJvcHMgPSAoZGVwc0FzdC52YWx1ZSBhcyBPYmplY3RBc3QpLnByb3BlcnRpZXM7XG4gICAgbGV0IHN0YXJ0ID0gMDtcbiAgICBpZiAocHJvcHMubGVuZ3RoID4gMCkge1xuICAgICAgc3RhcnQgPSBwcm9wc1twcm9wcy5sZW5ndGggLSAxXS52YWx1ZS5lbmQ7XG4gICAgICBuZXdMaW5lcyA9ICcsXFxuJyArIG5ld0xpbmVzO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGFydCA9IGRlcHNBc3QudmFsdWUuZW5kIC0gMTtcbiAgICB9XG5cbiAgICBwYXRjaGVzLnB1c2goe3N0YXJ0LCBlbmQ6IHN0YXJ0LCB0ZXh0OiBuZXdMaW5lc30pO1xuICB9XG5cbiAgY29uc3QgbmV3SnNvblRleHQgPSByZXBsYWNlVGV4dChwa2dKc29uU3RyLCBwYXRjaGVzKTtcbiAgbG9nLmluZm8oYFdyaXRlIGZpbGU6ICR7dGFyZ2V0SnNvbkZpbGV9OlxcbmAgKyBuZXdKc29uVGV4dCk7XG4gIGZzLndyaXRlRmlsZVN5bmModGFyZ2V0SnNvbkZpbGUsIG5ld0pzb25UZXh0KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hSZW1vdGVWZXJzaW9uKHBrZ05hbWU6IHN0cmluZykge1xuICBjb25zdCB0ZXh0ID0gc3RyaXBBbnNpKGF3YWl0IGV4ZSgnbnBtJywgJ3ZpZXcnLCBwa2dOYW1lLCB7c2lsZW50OiB0cnVlfSkucHJvbWlzZSk7XG4gIGNvbnN0IHJQYXR0ZXJuID0gXy5lc2NhcGVSZWdFeHAocGtnTmFtZSkgKyAnQChcXFxcUyopXFxcXHMnO1xuICBjb25zdCBwYXR0ZXJuID0gbmV3IFJlZ0V4cChyUGF0dGVybik7XG4gIGNvbnN0IG0gPSBwYXR0ZXJuLmV4ZWModGV4dCk7XG4gIGlmIChtKSB7XG4gICAgcmV0dXJuIG1bMV07XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZmV0Y2ggZGVwZW5kZW5jeSBsYXRlc3QgdmVyc2lvbiAocGF0dGVybjogJHtyUGF0dGVybn0pIGZyb20gbWVzc2FnZTpcXG4gJHt0ZXh0fWApO1xufVxuIl19