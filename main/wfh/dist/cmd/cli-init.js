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
exports.printWorkspaces = void 0;
// tslint:disable: no-console max-line-length
const chalk_1 = __importDefault(require("chalk"));
const operators_1 = require("rxjs/operators");
const config_1 = __importDefault(require("../config"));
const path_1 = __importDefault(require("path"));
const package_mgr_1 = require("../package-mgr");
const package_utils_1 = require("../package-utils");
const misc_1 = require("../utils/misc");
function default_1(opt, workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opt);
        const cwd = process.cwd();
        package_mgr_1.getStore().pipe(operators_1.map(s => s.srcPackages), operators_1.distinctUntilChanged(), operators_1.take(2), operators_1.takeLast(1), operators_1.map(srcPackages => {
            const paks = Array.from(srcPackages.values());
            const maxWidth = paks.reduce((maxWidth, pk) => {
                const width = pk.name.length + pk.json.version.length + 1;
                return width > maxWidth ? width : maxWidth;
            }, 0);
            console.log(`\n${chalk_1.default.greenBright('Linked packages')}\n` +
                paks.map(pk => {
                    const width = pk.name.length + pk.json.version.length + 1;
                    return `  ${chalk_1.default.cyan(pk.name)}@${chalk_1.default.green(pk.json.version)}${' '.repeat(maxWidth - width)}` +
                        ` ${path_1.default.relative(cwd, pk.realPath)}`;
                }).join('\n'));
            printWorkspaces();
        })).toPromise();
        if (workspace) {
            package_mgr_1.actionDispatcher.updateWorkspace({ dir: workspace, isForce: opt.force });
        }
        else {
            package_mgr_1.actionDispatcher.initRootDir(null);
        }
    });
}
exports.default = default_1;
function printWorkspaces() {
    console.log('\n' + chalk_1.default.greenBright('Workspace directories and linked dependencies:'));
    for (const reldir of package_mgr_1.getState().workspaces.keys()) {
        console.log(reldir ? reldir + '/' : '(root directory)');
        console.log('  |- dependencies');
        for (const { name: dep, json: { version: ver }, isInstalled } of package_utils_1.packages4Workspace(path_1.default.resolve(misc_1.getRootDir(), reldir))) {
            console.log(`  |  |- ${dep}  v${ver}  ${isInstalled ? '' : '(linked)'}`);
        }
        // if (ws.linkedDependencies.length === 0)
        //   console.log('  |    (Empty)');
        // for (const [dep, ver] of ws.linkedDependencies) {
        //   console.log(`  |  |- ${dep} ${ver}`);
        // }
        // console.log('  |');
        // console.log('  |- devDependencies');
        // if (ws.linkedDevDependencies.length === 0)
        //   console.log('       (Empty)');
        // for (const [dep, ver] of ws.linkedDevDependencies) {
        //   console.log(`     |- ${dep} ${ver}`);
        // }
        console.log('');
    }
}
exports.printWorkspaces = printWorkspaces;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTZDO0FBQzdDLGtEQUEwQjtBQUMxQiw4Q0FBMkU7QUFDM0UsdURBQStCO0FBQy9CLGdEQUF3QjtBQUN4QixnREFBaUY7QUFFakYsb0RBQW9EO0FBQ3BELHdDQUF5QztBQUV6QyxtQkFBOEIsR0FBMkIsRUFBRSxTQUFrQjs7UUFDM0UsTUFBTSxnQkFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUV2QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDMUIsc0JBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQ3ZCLGdDQUFvQixFQUFFLEVBQ3RCLGdCQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1Asb0JBQVEsQ0FBQyxDQUFDLENBQUMsRUFDWCxlQUFHLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDaEIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUM5QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFO2dCQUM1QyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO2dCQUMxRCxPQUFPLEtBQUssR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1lBQzdDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVOLE9BQU8sQ0FBQyxHQUFHLENBQ1QsS0FBSyxlQUFLLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLElBQUk7Z0JBQzdDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7b0JBQ1osTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztvQkFDMUQsT0FBTyxLQUFLLGVBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLGVBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsRUFBRTt3QkFDOUYsSUFBSSxjQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDMUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUNkLENBQUM7WUFDRixlQUFlLEVBQUUsQ0FBQztRQUNwQixDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRWQsSUFBSSxTQUFTLEVBQUU7WUFDYiw4QkFBTyxDQUFDLGVBQWUsQ0FBQyxFQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDO1NBQy9EO2FBQU07WUFDTCw4QkFBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMzQjtJQUNILENBQUM7Q0FBQTtBQWpDRCw0QkFpQ0M7QUFFRCxTQUFnQixlQUFlO0lBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLGVBQUssQ0FBQyxXQUFXLENBQUMsZ0RBQWdELENBQUMsQ0FBQyxDQUFDO0lBQ3hGLEtBQUssTUFBTSxNQUFNLElBQUksc0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN4RCxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDakMsS0FBSyxNQUFNLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBQyxPQUFPLEVBQUUsR0FBRyxFQUFDLEVBQUUsV0FBVyxFQUFDLElBQUksa0NBQWtCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBVSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRTtZQUNuSCxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxNQUFNLEdBQUcsS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztTQUMxRTtRQUNELDBDQUEwQztRQUMxQyxtQ0FBbUM7UUFDbkMsb0RBQW9EO1FBQ3BELDBDQUEwQztRQUMxQyxJQUFJO1FBQ0osc0JBQXNCO1FBQ3RCLHVDQUF1QztRQUN2Qyw2Q0FBNkM7UUFDN0MsbUNBQW1DO1FBQ25DLHVEQUF1RDtRQUN2RCwwQ0FBMEM7UUFDMUMsSUFBSTtRQUNKLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDakI7QUFDSCxDQUFDO0FBdEJELDBDQXNCQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlIG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBtYXAsIHRha2UsIHRha2VMYXN0IH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBhY3Rpb25EaXNwYXRjaGVyIGFzIGFjdGlvbnMsIGdldFN0b3JlLCBnZXRTdGF0ZSB9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCAqIGFzIG9wdGlvbnMgZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZX0gZnJvbSAnLi4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihvcHQ6IG9wdGlvbnMuSW5pdENtZE9wdGlvbnMsIHdvcmtzcGFjZT86IHN0cmluZykge1xuICBhd2FpdCBjb25maWcuaW5pdChvcHQpO1xuXG4gIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIHRha2UoMiksXG4gICAgdGFrZUxhc3QoMSksXG4gICAgbWFwKHNyY1BhY2thZ2VzID0+IHtcbiAgICAgIGNvbnN0IHBha3MgPSBBcnJheS5mcm9tKHNyY1BhY2thZ2VzLnZhbHVlcygpKTtcbiAgICAgIGNvbnN0IG1heFdpZHRoID0gcGFrcy5yZWR1Y2UoKG1heFdpZHRoLCBwaykgPT4ge1xuICAgICAgICBjb25zdCB3aWR0aCA9IHBrLm5hbWUubGVuZ3RoICsgcGsuanNvbi52ZXJzaW9uLmxlbmd0aCArIDE7XG4gICAgICAgIHJldHVybiB3aWR0aCA+IG1heFdpZHRoID8gd2lkdGggOiBtYXhXaWR0aDtcbiAgICAgIH0sIDApO1xuXG4gICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgYFxcbiR7Y2hhbGsuZ3JlZW5CcmlnaHQoJ0xpbmtlZCBwYWNrYWdlcycpfVxcbmAgK1xuICAgICAgICBwYWtzLm1hcChwayA9PiB7XG4gICAgICAgICAgY29uc3Qgd2lkdGggPSBway5uYW1lLmxlbmd0aCArIHBrLmpzb24udmVyc2lvbi5sZW5ndGggKyAxO1xuICAgICAgICAgIHJldHVybiBgICAke2NoYWxrLmN5YW4ocGsubmFtZSl9QCR7Y2hhbGsuZ3JlZW4ocGsuanNvbi52ZXJzaW9uKX0keycgJy5yZXBlYXQobWF4V2lkdGggLSB3aWR0aCl9YCArXG4gICAgICAgICAgICBgICR7UGF0aC5yZWxhdGl2ZShjd2QsIHBrLnJlYWxQYXRoKX1gO1xuICAgICAgICB9KS5qb2luKCdcXG4nKVxuICAgICAgKTtcbiAgICAgIHByaW50V29ya3NwYWNlcygpO1xuICAgIH0pXG4gICkudG9Qcm9taXNlKCk7XG5cbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIGFjdGlvbnMudXBkYXRlV29ya3NwYWNlKHtkaXI6IHdvcmtzcGFjZSwgaXNGb3JjZTogb3B0LmZvcmNlfSk7XG4gIH0gZWxzZSB7XG4gICAgYWN0aW9ucy5pbml0Um9vdERpcihudWxsKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRXb3Jrc3BhY2VzKCkge1xuICBjb25zb2xlLmxvZygnXFxuJyArIGNoYWxrLmdyZWVuQnJpZ2h0KCdXb3Jrc3BhY2UgZGlyZWN0b3JpZXMgYW5kIGxpbmtlZCBkZXBlbmRlbmNpZXM6JykpO1xuICBmb3IgKGNvbnN0IHJlbGRpciBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKSB7XG4gICAgY29uc29sZS5sb2cocmVsZGlyID8gcmVsZGlyICsgJy8nIDogJyhyb290IGRpcmVjdG9yeSknKTtcbiAgICBjb25zb2xlLmxvZygnICB8LSBkZXBlbmRlbmNpZXMnKTtcbiAgICBmb3IgKGNvbnN0IHtuYW1lOiBkZXAsIGpzb246IHt2ZXJzaW9uOiB2ZXJ9LCBpc0luc3RhbGxlZH0gb2YgcGFja2FnZXM0V29ya3NwYWNlKFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHJlbGRpcikpKSB7XG4gICAgICBjb25zb2xlLmxvZyhgICB8ICB8LSAke2RlcH0gIHYke3Zlcn0gICR7aXNJbnN0YWxsZWQgPyAnJyA6ICcobGlua2VkKSd9YCk7XG4gICAgfVxuICAgIC8vIGlmICh3cy5saW5rZWREZXBlbmRlbmNpZXMubGVuZ3RoID09PSAwKVxuICAgIC8vICAgY29uc29sZS5sb2coJyAgfCAgICAoRW1wdHkpJyk7XG4gICAgLy8gZm9yIChjb25zdCBbZGVwLCB2ZXJdIG9mIHdzLmxpbmtlZERlcGVuZGVuY2llcykge1xuICAgIC8vICAgY29uc29sZS5sb2coYCAgfCAgfC0gJHtkZXB9ICR7dmVyfWApO1xuICAgIC8vIH1cbiAgICAvLyBjb25zb2xlLmxvZygnICB8Jyk7XG4gICAgLy8gY29uc29sZS5sb2coJyAgfC0gZGV2RGVwZW5kZW5jaWVzJyk7XG4gICAgLy8gaWYgKHdzLmxpbmtlZERldkRlcGVuZGVuY2llcy5sZW5ndGggPT09IDApXG4gICAgLy8gICBjb25zb2xlLmxvZygnICAgICAgIChFbXB0eSknKTtcbiAgICAvLyBmb3IgKGNvbnN0IFtkZXAsIHZlcl0gb2Ygd3MubGlua2VkRGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgLy8gICBjb25zb2xlLmxvZyhgICAgICB8LSAke2RlcH0gJHt2ZXJ9YCk7XG4gICAgLy8gfVxuICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgfVxufVxuIl19