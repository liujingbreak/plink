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
exports.add = void 0;
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
const index_1 = require("../package-mgr/index");
const log = log4js_1.getLogger('plink.cli-add-package');
function add(packages, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const workspaceJsonFile = path_1.default.resolve(process.cwd(), 'package.json');
        const pkgJsonStr = fs_1.default.readFileSync(workspaceJsonFile, 'utf-8');
        const objAst = json_sync_parser_1.default(pkgJsonStr);
        const patches = [];
        const depsAst = opts.dev ? objAst.properties.find(prop => prop.name.text === '"devDependencies"') :
            objAst.properties.find(prop => prop.name.text === '"dependencies"');
        const depsSet = depsAst == null ?
            new Set() :
            new Set(depsAst.value.properties.map(prop => prop.name.text.slice(1, -1)));
        log.debug('existing:', depsSet);
        const input = packages.map(rawName => {
            const m = /^((?:@[^/]+\/)?[^/@]+)(?:@([^]+))?$/.exec(rawName);
            if (m)
                return [m[1], m[2]];
            else {
                throw new Error(`Invalid package name: ${rawName}, valid name should be like "<pkg name>[@<version>]"`);
            }
        });
        let i = 0;
        let newLines = '';
        yield Promise.all(Array.from(utils_1.findPackagesByNames(input.map(item => item[0])))
            .map((pkg) => __awaiter(this, void 0, void 0, function* () {
            const inputItem = input[i++];
            let version = inputItem[1];
            log.warn(pkg);
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
            patches.push({ start: pos, end: pos, text: `,\n  "${opts.dev ? 'devDependencies' : 'dependencies'}": {\n${newLines}\n  }` });
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
        log.info(`Write file: ${workspaceJsonFile}:\n` + newJsonText);
        fs_1.default.writeFileSync(workspaceJsonFile, newJsonText);
        setImmediate(() => index_1.actionDispatcher.updateWorkspace({ dir: process.cwd(), isForce: false, createHook: false }));
    });
}
exports.add = add;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFkZC1wYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1hZGQtcGFja2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpRkFBMkQ7QUFDM0QsbUNBQTRDO0FBQzVDLHFFQUFnRTtBQUNoRSxvREFBcUM7QUFDckMsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixtQ0FBaUM7QUFDakMsb0RBQXVCO0FBQ3ZCLGtEQUEwQjtBQUMxQiw0REFBbUM7QUFDbkMsZ0RBQXFFO0FBQ3JFLE1BQU0sR0FBRyxHQUFHLGtCQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUUvQyxTQUFzQixHQUFHLENBQUMsUUFBa0IsRUFBRSxJQUFnQzs7UUFDNUUsTUFBTSxpQkFBaUIsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUN0RSxNQUFNLFVBQVUsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9ELE1BQU0sTUFBTSxHQUFHLDBCQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDakMsTUFBTSxPQUFPLEdBQXFCLEVBQUUsQ0FBQztRQUVyQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLG1CQUFtQixDQUFDLENBQUMsQ0FBQztZQUNqRyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLGdCQUFnQixDQUFDLENBQUM7UUFFdEUsTUFBTSxPQUFPLEdBQUcsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDO1lBQy9CLElBQUksR0FBRyxFQUFVLENBQUMsQ0FBQztZQUNuQixJQUFJLEdBQUcsQ0FBVSxPQUFPLENBQUMsS0FBbUIsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVwRyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNoQyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ2pDLE1BQU0sQ0FBQyxHQUFHLHFDQUFxQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM5RCxJQUFJLENBQUM7Z0JBQ0gsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQTRDLENBQUM7aUJBQzVEO2dCQUNILE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLE9BQU8sc0RBQXNELENBQUMsQ0FBQzthQUN6RztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ1YsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLDJCQUFtQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzFFLEdBQUcsQ0FBQyxDQUFNLEdBQUcsRUFBQyxFQUFFO1lBQ2pCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzdCLElBQUksT0FBTyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2QsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxFQUFFO2dCQUNsRSxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDckIsR0FBRyxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsZUFBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ25FLE9BQU87aUJBQ1I7Z0JBQ0QsSUFBSSxPQUFPLElBQUksSUFBSSxFQUFFO29CQUNuQixPQUFPLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDMUM7Z0JBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxPQUFPLHVEQUF1RCxDQUFDLENBQUM7Z0JBQzVGLFFBQVEsSUFBSSxRQUFRLElBQUksT0FBTyxPQUFPLE1BQU0sQ0FBQzthQUM5QztpQkFBTTtnQkFDTCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUN6QixHQUFHLENBQUMsSUFBSSxDQUFDLHNDQUFzQyxlQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3RFLE9BQU87aUJBQ1I7Z0JBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLGVBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNqRSxRQUFRLElBQUksUUFBUSxHQUFHLENBQUMsSUFBSSxPQUFPLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sTUFBTSxDQUFDO2FBQ3RFO1FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDckIsUUFBUSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0I7UUFDdkUsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVwQixJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDbkIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM3RCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztZQUMzQixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxTQUFTLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxjQUFjLFNBQVMsUUFBUSxPQUFPLEVBQUMsQ0FBQyxDQUFBO1NBQzNIO2FBQU07WUFDTCxNQUFNLEtBQUssR0FBSSxPQUFPLENBQUMsS0FBbUIsQ0FBQyxVQUFVLENBQUM7WUFDdEQsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQ2QsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDcEIsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7Z0JBQzFDLFFBQVEsR0FBRyxLQUFLLEdBQUcsUUFBUSxDQUFDO2FBQzdCO2lCQUFNO2dCQUNMLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7YUFDL0I7WUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBQyxDQUFDLENBQUM7U0FDbkQ7UUFFRCxNQUFNLFdBQVcsR0FBRyxvQkFBVyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyRCxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsaUJBQWlCLEtBQUssR0FBRyxXQUFXLENBQUMsQ0FBQztRQUM5RCxZQUFFLENBQUMsYUFBYSxDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2pELFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FDaEIsd0JBQVcsQ0FBQyxlQUFlLENBQUMsRUFBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQ3JGLENBQUM7SUFDSixDQUFDO0NBQUE7QUE1RUQsa0JBNEVDO0FBRUQsU0FBZSxrQkFBa0IsQ0FBQyxPQUFlOztRQUMvQyxNQUFNLElBQUksR0FBRyxvQkFBUyxDQUFDLE1BQU0sbUJBQUcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xGLE1BQU0sUUFBUSxHQUFHLGdCQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLFlBQVksQ0FBQztRQUN4RCxNQUFNLE9BQU8sR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxFQUFFO1lBQ0wsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDYjtRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsdURBQXVELE9BQU8scUJBQXFCLElBQUksRUFBRSxDQUFDLENBQUM7SUFDN0csQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBhcnNlLCB7T2JqZWN0QXN0fSBmcm9tICcuLi91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgcmVwbGFjZVRleHQsIHtSZXBsYWNlbWVudEluZn0gZnJvbSAnLi4vdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQge2V4ZX0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHN0cmlwQW5zaSBmcm9tICdzdHJpcC1hbnNpJztcbmltcG9ydCB7YWN0aW9uRGlzcGF0Y2hlciBhcyBwa2dEaXNwYXRlcn0gZnJvbSAnLi4vcGFja2FnZS1tZ3IvaW5kZXgnO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5jbGktYWRkLXBhY2thZ2UnKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkZChwYWNrYWdlczogc3RyaW5nW10sIG9wdHM6IHtkZXY6IGJvb2xlYW4gfCB1bmRlZmluZWR9KSB7XG4gIGNvbnN0IHdvcmtzcGFjZUpzb25GaWxlID0gUGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdwYWNrYWdlLmpzb24nKTtcbiAgY29uc3QgcGtnSnNvblN0ciA9IGZzLnJlYWRGaWxlU3luYyh3b3Jrc3BhY2VKc29uRmlsZSwgJ3V0Zi04Jyk7XG4gIGNvbnN0IG9iakFzdCA9IHBhcnNlKHBrZ0pzb25TdHIpO1xuICBjb25zdCBwYXRjaGVzOiBSZXBsYWNlbWVudEluZltdID0gW107XG4gIFxuICBjb25zdCBkZXBzQXN0ID0gb3B0cy5kZXYgPyBvYmpBc3QucHJvcGVydGllcy5maW5kKHByb3AgPT4gcHJvcC5uYW1lLnRleHQgPT09ICdcImRldkRlcGVuZGVuY2llc1wiJykgOlxuICAgIG9iakFzdC5wcm9wZXJ0aWVzLmZpbmQocHJvcCA9PiBwcm9wLm5hbWUudGV4dCA9PT0gJ1wiZGVwZW5kZW5jaWVzXCInKTtcblxuICBjb25zdCBkZXBzU2V0ID0gZGVwc0FzdCA9PSBudWxsID9cbiAgICBuZXcgU2V0PHN0cmluZz4oKSA6XG4gICAgbmV3IFNldDxzdHJpbmc+KChkZXBzQXN0LnZhbHVlIGFzIE9iamVjdEFzdCkucHJvcGVydGllcy5tYXAocHJvcCA9PiBwcm9wLm5hbWUudGV4dC5zbGljZSgxLCAtMSkpKTtcblxuICBsb2cuZGVidWcoJ2V4aXN0aW5nOicsIGRlcHNTZXQpO1xuICBjb25zdCBpbnB1dCA9IHBhY2thZ2VzLm1hcChyYXdOYW1lID0+IHtcbiAgICAgIGNvbnN0IG0gPSAvXigoPzpAW14vXStcXC8pP1teL0BdKykoPzpAKFteXSspKT8kLy5leGVjKHJhd05hbWUpO1xuICAgICAgaWYgKG0pXG4gICAgICAgIHJldHVybiBbbVsxXSwgbVsyXV0gYXMgW25hbWU6IHN0cmluZywgdmVyOiBzdHJpbmcgfCB1bmRlZmluZWRdO1xuICAgICAgZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBwYWNrYWdlIG5hbWU6ICR7cmF3TmFtZX0sIHZhbGlkIG5hbWUgc2hvdWxkIGJlIGxpa2UgXCI8cGtnIG5hbWU+W0A8dmVyc2lvbj5dXCJgKTtcbiAgICAgIH1cbiAgfSk7XG4gIGxldCBpID0gMDtcbiAgbGV0IG5ld0xpbmVzID0gJyc7XG4gIGF3YWl0IFByb21pc2UuYWxsKEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhpbnB1dC5tYXAoaXRlbSA9PiBpdGVtWzBdKSkpXG4gICAgLm1hcChhc3luYyBwa2cgPT4ge1xuICAgIGNvbnN0IGlucHV0SXRlbSA9IGlucHV0W2krK107XG4gICAgbGV0IHZlcnNpb24gPSBpbnB1dEl0ZW1bMV07XG4gICAgbG9nLndhcm4ocGtnKTtcbiAgICBpZiAocGtnID09IG51bGwgfHwgKHBrZy5qc29uLmRyID09IG51bGwgJiYgcGtnLmpzb24ucGxpbmsgPT0gbnVsbCkpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBpbnB1dEl0ZW1bMF07XG4gICAgICBpZiAoZGVwc1NldC5oYXMobmFtZSkpIHtcbiAgICAgICAgbG9nLndhcm4oYEZvdW5kIGR1cGxpY2F0ZSBleGlzdGluZyBkZXBlbmRlbmN5ICR7Y2hhbGsucmVkKG5hbWUpfWApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodmVyc2lvbiA9PSBudWxsKSB7XG4gICAgICAgIHZlcnNpb24gPSBhd2FpdCBmZXRjaFJlbW90ZVZlcnNpb24obmFtZSk7XG4gICAgICB9XG4gICAgICBsb2cuaW5mbyhgUGFja2FnZSAke25hbWV9QCR7dmVyc2lvbn0gaXMgbm90IGEgbGlua2VkIHBhY2thZ2UsIGFkZCBhcyAzcmQgcGFydHkgZGVwZW5kZW5jeWApO1xuICAgICAgbmV3TGluZXMgKz0gYCAgICBcIiR7bmFtZX1cIjogXCIke3ZlcnNpb259XCIsXFxuYDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGRlcHNTZXQuaGFzKHBrZy5uYW1lKSkge1xuICAgICAgICBsb2cud2FybihgRHVwbGljYXRlIHdpdGggZXhpc3RpbmcgZGVwZW5kZW5jeSAke2NoYWxrLnJlZChwa2cubmFtZSl9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGxvZy5pbmZvKGBBZGQgcGFja2FnZSAke2NoYWxrLmN5YW4ocGtnLm5hbWUpfSAke3ZlcnNpb24gfHwgJyd9YCk7XG4gICAgICBuZXdMaW5lcyArPSBgICAgIFwiJHtwa2cubmFtZX1cIjogXCIke3ZlcnNpb24gfHwgcGtnLmpzb24udmVyc2lvbn1cIixcXG5gO1xuICAgIH1cbiAgfSkpO1xuICBpZiAobmV3TGluZXMubGVuZ3RoID4gMClcbiAgICBuZXdMaW5lcyA9IG5ld0xpbmVzLnNsaWNlKDAsIG5ld0xpbmVzLmxlbmd0aCAtIDIpOyAvLyB0cmltIGxhc3QgY29tbWFcbiAgbG9nLmRlYnVnKG5ld0xpbmVzKTtcblxuICBpZiAoZGVwc0FzdCA9PSBudWxsKSB7XG4gICAgY29uc3QgbGFzdCA9IG9iakFzdC5wcm9wZXJ0aWVzW29iakFzdC5wcm9wZXJ0aWVzLmxlbmd0aCAtIDFdO1xuICAgIGNvbnN0IHBvcyA9IGxhc3QudmFsdWUuZW5kO1xuICAgIHBhdGNoZXMucHVzaCh7c3RhcnQ6IHBvcywgZW5kOiBwb3MsIHRleHQ6IGAsXFxuICBcIiR7b3B0cy5kZXYgPyAnZGV2RGVwZW5kZW5jaWVzJyA6ICdkZXBlbmRlbmNpZXMnfVwiOiB7XFxuJHtuZXdMaW5lc31cXG4gIH1gfSlcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBwcm9wcyA9IChkZXBzQXN0LnZhbHVlIGFzIE9iamVjdEFzdCkucHJvcGVydGllcztcbiAgICBsZXQgc3RhcnQgPSAwO1xuICAgIGlmIChwcm9wcy5sZW5ndGggPiAwKSB7XG4gICAgICBzdGFydCA9IHByb3BzW3Byb3BzLmxlbmd0aCAtIDFdLnZhbHVlLmVuZDtcbiAgICAgIG5ld0xpbmVzID0gJyxcXG4nICsgbmV3TGluZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXJ0ID0gZGVwc0FzdC52YWx1ZS5lbmQgLSAxO1xuICAgIH1cblxuICAgIHBhdGNoZXMucHVzaCh7c3RhcnQsIGVuZDogc3RhcnQsIHRleHQ6IG5ld0xpbmVzfSk7XG4gIH1cblxuICBjb25zdCBuZXdKc29uVGV4dCA9IHJlcGxhY2VUZXh0KHBrZ0pzb25TdHIsIHBhdGNoZXMpO1xuICBsb2cuaW5mbyhgV3JpdGUgZmlsZTogJHt3b3Jrc3BhY2VKc29uRmlsZX06XFxuYCArIG5ld0pzb25UZXh0KTtcbiAgZnMud3JpdGVGaWxlU3luYyh3b3Jrc3BhY2VKc29uRmlsZSwgbmV3SnNvblRleHQpO1xuICBzZXRJbW1lZGlhdGUoKCkgPT5cbiAgICBwa2dEaXNwYXRlci51cGRhdGVXb3Jrc3BhY2Uoe2RpcjogcHJvY2Vzcy5jd2QoKSwgaXNGb3JjZTogZmFsc2UsIGNyZWF0ZUhvb2s6IGZhbHNlfSlcbiAgKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hSZW1vdGVWZXJzaW9uKHBrZ05hbWU6IHN0cmluZykge1xuICBjb25zdCB0ZXh0ID0gc3RyaXBBbnNpKGF3YWl0IGV4ZSgnbnBtJywgJ3ZpZXcnLCBwa2dOYW1lLCB7c2lsZW50OiB0cnVlfSkucHJvbWlzZSk7XG4gIGNvbnN0IHJQYXR0ZXJuID0gXy5lc2NhcGVSZWdFeHAocGtnTmFtZSkgKyAnQChcXFxcUyopXFxcXHMnO1xuICBjb25zdCBwYXR0ZXJuID0gbmV3IFJlZ0V4cChyUGF0dGVybik7XG4gIGNvbnN0IG0gPSBwYXR0ZXJuLmV4ZWModGV4dCk7XG4gIGlmIChtKSB7XG4gICAgcmV0dXJuIG1bMV07XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZmV0Y2ggZGVwZW5kZW5jeSBsYXRlc3QgdmVyc2lvbiAocGF0dGVybjogJHtwYXR0ZXJufSkgZnJvbSBtZXNzYWdlOlxcbiAke3RleHR9YCk7XG59XG4iXX0=