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
// import logConfig from '../log-config';
const package_mgr_1 = require("../package-mgr");
function default_1(opt, workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opt);
        const done = package_mgr_1.getStore().pipe(operators_1.map(s => s.srcPackages), operators_1.distinctUntilChanged(), operators_1.take(2), operators_1.takeLast(1), operators_1.map(srcPackages => {
            console.log(' *** Linked packages ***\n\n' +
                Object.values(srcPackages).map(pk => `${chalk_1.default.cyan(pk.name)}@${chalk_1.default.green(pk.json.version)}  (${pk.realPath})`).join('\n'));
        })).toPromise();
        if (workspace) {
            package_mgr_1.actionDispatcher.initWorkspace({ dir: workspace, opt });
        }
        else {
            package_mgr_1.actionDispatcher.initRootDir(null);
        }
        yield done;
        printWorkspaces();
    });
}
exports.default = default_1;
function printWorkspaces() {
    console.log('\n' + chalk_1.default.greenBright('Workspace directories and linked dependencies:'));
    for (const [dir, ws] of Object.entries(package_mgr_1.getState().workspaces)) {
        const reldir = path_1.default.relative(process.cwd(), dir);
        console.log(reldir ? reldir + '/' : '(root directory)');
        console.log('  |- dependencies');
        if (ws.linkedDependencies.length === 0)
            console.log('  |    (Empty)');
        for (const [dep, ver] of ws.linkedDependencies) {
            console.log(`  |  |- ${dep} ${ver}`);
        }
        console.log('  |');
        console.log('  |- devDependencies');
        if (ws.linkedDevDependencies.length === 0)
            console.log('       (Empty)');
        for (const [dep, ver] of ws.linkedDevDependencies) {
            console.log(`     |- ${dep} ${ver}`);
        }
        console.log('');
    }
}
exports.printWorkspaces = printWorkspaces;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTZDO0FBQzdDLGtEQUEwQjtBQUMxQiw4Q0FBMkU7QUFDM0UsdURBQStCO0FBQy9CLGdEQUF3QjtBQUN4Qix5Q0FBeUM7QUFDekMsZ0RBQWlGO0FBR2pGLG1CQUE4QixHQUEyQixFQUFFLFNBQWtCOztRQUMzRSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRXZCLE1BQU0sSUFBSSxHQUFHLHNCQUFRLEVBQUUsQ0FBQyxJQUFJLENBQzFCLGVBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFDdkIsZ0NBQW9CLEVBQUUsRUFDdEIsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFDUCxvQkFBUSxDQUFDLENBQUMsQ0FBQyxFQUNYLGVBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUNoQixPQUFPLENBQUMsR0FBRyxDQUNULDhCQUE4QjtnQkFDOUIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLGVBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLGVBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxHQUFHLENBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQzlILENBQUM7UUFDSixDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRWQsSUFBSSxTQUFTLEVBQUU7WUFDYiw4QkFBTyxDQUFDLGFBQWEsQ0FBQyxFQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQztTQUM5QzthQUFNO1lBQ0wsOEJBQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDM0I7UUFDRCxNQUFNLElBQUksQ0FBQztRQUNYLGVBQWUsRUFBRSxDQUFDO0lBQ3BCLENBQUM7Q0FBQTtBQXZCRCw0QkF1QkM7QUFFRCxTQUFnQixlQUFlO0lBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLGVBQUssQ0FBQyxXQUFXLENBQUMsZ0RBQWdELENBQUMsQ0FBQyxDQUFDO0lBQ3hGLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUM3RCxNQUFNLE1BQU0sR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN4RCxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDakMsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDcEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2hDLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsa0JBQWtCLEVBQUU7WUFDOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQ3RDO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuQixPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDcEMsSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2hDLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMscUJBQXFCLEVBQUU7WUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQ3RDO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNqQjtBQUNILENBQUM7QUFwQkQsMENBb0JDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGUgbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIG1hcCwgdGFrZSwgdGFrZUxhc3QgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQgeyBhY3Rpb25EaXNwYXRjaGVyIGFzIGFjdGlvbnMsIGdldFN0b3JlLCBnZXRTdGF0ZSB9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCAqIGFzIG9wdGlvbnMgZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKG9wdDogb3B0aW9ucy5Jbml0Q21kT3B0aW9ucywgd29ya3NwYWNlPzogc3RyaW5nKSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdCk7XG5cbiAgY29uc3QgZG9uZSA9IGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIHRha2UoMiksXG4gICAgdGFrZUxhc3QoMSksXG4gICAgbWFwKHNyY1BhY2thZ2VzID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAnICoqKiBMaW5rZWQgcGFja2FnZXMgKioqXFxuXFxuJyArXG4gICAgICAgIE9iamVjdC52YWx1ZXMoc3JjUGFja2FnZXMhKS5tYXAocGsgPT4gYCR7Y2hhbGsuY3lhbihway5uYW1lKX1AJHtjaGFsay5ncmVlbihway5qc29uLnZlcnNpb24pfSAgKCR7cGsucmVhbFBhdGh9KWAgKS5qb2luKCdcXG4nKVxuICAgICAgKTtcbiAgICB9KVxuICApLnRvUHJvbWlzZSgpO1xuXG4gIGlmICh3b3Jrc3BhY2UpIHtcbiAgICBhY3Rpb25zLmluaXRXb3Jrc3BhY2Uoe2Rpcjogd29ya3NwYWNlLCBvcHR9KTtcbiAgfSBlbHNlIHtcbiAgICBhY3Rpb25zLmluaXRSb290RGlyKG51bGwpO1xuICB9XG4gIGF3YWl0IGRvbmU7XG4gIHByaW50V29ya3NwYWNlcygpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRXb3Jrc3BhY2VzKCkge1xuICBjb25zb2xlLmxvZygnXFxuJyArIGNoYWxrLmdyZWVuQnJpZ2h0KCdXb3Jrc3BhY2UgZGlyZWN0b3JpZXMgYW5kIGxpbmtlZCBkZXBlbmRlbmNpZXM6JykpO1xuICBmb3IgKGNvbnN0IFtkaXIsIHdzXSBvZiBPYmplY3QuZW50cmllcyhnZXRTdGF0ZSgpLndvcmtzcGFjZXMpKSB7XG4gICAgY29uc3QgcmVsZGlyID0gUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBkaXIpO1xuICAgIGNvbnNvbGUubG9nKHJlbGRpciA/IHJlbGRpciArICcvJyA6ICcocm9vdCBkaXJlY3RvcnkpJyk7XG4gICAgY29uc29sZS5sb2coJyAgfC0gZGVwZW5kZW5jaWVzJyk7XG4gICAgaWYgKHdzLmxpbmtlZERlcGVuZGVuY2llcy5sZW5ndGggPT09IDApXG4gICAgICBjb25zb2xlLmxvZygnICB8ICAgIChFbXB0eSknKTtcbiAgICBmb3IgKGNvbnN0IFtkZXAsIHZlcl0gb2Ygd3MubGlua2VkRGVwZW5kZW5jaWVzKSB7XG4gICAgICBjb25zb2xlLmxvZyhgICB8ICB8LSAke2RlcH0gJHt2ZXJ9YCk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCcgIHwnKTtcbiAgICBjb25zb2xlLmxvZygnICB8LSBkZXZEZXBlbmRlbmNpZXMnKTtcbiAgICBpZiAod3MubGlua2VkRGV2RGVwZW5kZW5jaWVzLmxlbmd0aCA9PT0gMClcbiAgICAgIGNvbnNvbGUubG9nKCcgICAgICAgKEVtcHR5KScpO1xuICAgIGZvciAoY29uc3QgW2RlcCwgdmVyXSBvZiB3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgIGNvbnNvbGUubG9nKGAgICAgIHwtICR7ZGVwfSAke3Zlcn1gKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coJycpO1xuICB9XG59XG4iXX0=