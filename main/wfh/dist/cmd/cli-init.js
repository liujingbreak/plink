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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2Q0FBNkM7QUFDN0Msa0RBQTBCO0FBQzFCLDhDQUEyRTtBQUMzRSx1REFBK0I7QUFDL0IsZ0RBQXdCO0FBQ3hCLHlDQUF5QztBQUN6QyxnREFBaUY7QUFHakYsbUJBQThCLEdBQTJCLEVBQUUsU0FBa0I7O1FBQzNFLE1BQU0sZ0JBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFdkIsTUFBTSxJQUFJLEdBQUcsc0JBQVEsRUFBRSxDQUFDLElBQUksQ0FDMUIsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUN2QixnQ0FBb0IsRUFBRSxFQUN0QixnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUNQLG9CQUFRLENBQUMsQ0FBQyxDQUFDLEVBQ1gsZUFBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQ1QsOEJBQThCO2dCQUM5QixNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsZUFBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksZUFBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEdBQUcsQ0FBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDOUgsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7UUFFZCxJQUFJLFNBQVMsRUFBRTtZQUNiLDhCQUFPLENBQUMsYUFBYSxDQUFDLEVBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO1NBQzlDO2FBQU07WUFDTCw4QkFBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMzQjtRQUNELE1BQU0sSUFBSSxDQUFDO1FBQ1gsZUFBZSxFQUFFLENBQUM7SUFDcEIsQ0FBQztDQUFBO0FBdkJELDRCQXVCQztBQUVELFNBQVMsZUFBZTtJQUN0QixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxlQUFLLENBQUMsV0FBVyxDQUFDLGdEQUFnRCxDQUFDLENBQUMsQ0FBQztJQUN4RixLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxzQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDN0QsTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDeEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ2pDLElBQUksRUFBRSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQ3BDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNoQyxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLGtCQUFrQixFQUFFO1lBQzlDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztTQUN0QztRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3BDLElBQUksRUFBRSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNoQyxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLHFCQUFxQixFQUFFO1lBQ2pELE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztTQUN0QztRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDakI7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGUgbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIG1hcCwgdGFrZSwgdGFrZUxhc3QgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQgeyBhY3Rpb25EaXNwYXRjaGVyIGFzIGFjdGlvbnMsIGdldFN0b3JlLCBnZXRTdGF0ZSB9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCAqIGFzIG9wdGlvbnMgZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKG9wdDogb3B0aW9ucy5Jbml0Q21kT3B0aW9ucywgd29ya3NwYWNlPzogc3RyaW5nKSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdCk7XG5cbiAgY29uc3QgZG9uZSA9IGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIHRha2UoMiksXG4gICAgdGFrZUxhc3QoMSksXG4gICAgbWFwKHNyY1BhY2thZ2VzID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAnICoqKiBMaW5rZWQgcGFja2FnZXMgKioqXFxuXFxuJyArXG4gICAgICAgIE9iamVjdC52YWx1ZXMoc3JjUGFja2FnZXMhKS5tYXAocGsgPT4gYCR7Y2hhbGsuY3lhbihway5uYW1lKX1AJHtjaGFsay5ncmVlbihway5qc29uLnZlcnNpb24pfSAgKCR7cGsucmVhbFBhdGh9KWAgKS5qb2luKCdcXG4nKVxuICAgICAgKTtcbiAgICB9KVxuICApLnRvUHJvbWlzZSgpO1xuXG4gIGlmICh3b3Jrc3BhY2UpIHtcbiAgICBhY3Rpb25zLmluaXRXb3Jrc3BhY2Uoe2Rpcjogd29ya3NwYWNlLCBvcHR9KTtcbiAgfSBlbHNlIHtcbiAgICBhY3Rpb25zLmluaXRSb290RGlyKG51bGwpO1xuICB9XG4gIGF3YWl0IGRvbmU7XG4gIHByaW50V29ya3NwYWNlcygpO1xufVxuXG5mdW5jdGlvbiBwcmludFdvcmtzcGFjZXMoKSB7XG4gIGNvbnNvbGUubG9nKCdcXG4nICsgY2hhbGsuZ3JlZW5CcmlnaHQoJ1dvcmtzcGFjZSBkaXJlY3RvcmllcyBhbmQgbGlua2VkIGRlcGVuZGVuY2llczonKSk7XG4gIGZvciAoY29uc3QgW2Rpciwgd3NdIG9mIE9iamVjdC5lbnRyaWVzKGdldFN0YXRlKCkud29ya3NwYWNlcykpIHtcbiAgICBjb25zdCByZWxkaXIgPSBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGRpcik7XG4gICAgY29uc29sZS5sb2cocmVsZGlyID8gcmVsZGlyICsgJy8nIDogJyhyb290IGRpcmVjdG9yeSknKTtcbiAgICBjb25zb2xlLmxvZygnICB8LSBkZXBlbmRlbmNpZXMnKTtcbiAgICBpZiAod3MubGlua2VkRGVwZW5kZW5jaWVzLmxlbmd0aCA9PT0gMClcbiAgICAgIGNvbnNvbGUubG9nKCcgIHwgICAgKEVtcHR5KScpO1xuICAgIGZvciAoY29uc3QgW2RlcCwgdmVyXSBvZiB3cy5saW5rZWREZXBlbmRlbmNpZXMpIHtcbiAgICAgIGNvbnNvbGUubG9nKGAgIHwgIHwtICR7ZGVwfSAke3Zlcn1gKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coJyAgfCcpO1xuICAgIGNvbnNvbGUubG9nKCcgIHwtIGRldkRlcGVuZGVuY2llcycpO1xuICAgIGlmICh3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubGVuZ3RoID09PSAwKVxuICAgICAgY29uc29sZS5sb2coJyAgICAgICAoRW1wdHkpJyk7XG4gICAgZm9yIChjb25zdCBbZGVwLCB2ZXJdIG9mIHdzLmxpbmtlZERldkRlcGVuZGVuY2llcykge1xuICAgICAgY29uc29sZS5sb2coYCAgICAgfC0gJHtkZXB9ICR7dmVyfWApO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygnJyk7XG4gIH1cbn1cbiJdfQ==