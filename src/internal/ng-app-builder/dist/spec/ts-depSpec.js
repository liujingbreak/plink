"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const ts_dep_1 = __importDefault(require("../ts-dep"));
const ts_compiler_1 = require("@wfh/plink/wfh/dist/ts-compiler");
const path_1 = __importDefault(require("path"));
describe('ts-dep', () => {
    xit('When preserveSymlinks = false, walkForDependencies() should can list dependencies', () => {
        const file = path_1.default.resolve('projects/credit-appl/src/app/app.module.ts');
        const co = ts_compiler_1.readTsConfig('tsconfig.json');
        co.preserveSymlinks = false;
        const graph = new ts_dep_1.default(co);
        graph.walkForDependencies(file);
        console.log(graph.requestMap);
        // expect(graph.unresolved.length).toBe(0);
    });
    it('When preserveSymlinks = true, walkForDependencies() should can list dependencies', () => {
        const file = path_1.default.resolve('projects/credit-appl/src/app/app.module.ts');
        const co = ts_compiler_1.readTsConfig('tsconfig.json');
        co.preserveSymlinks = true;
        co.paths = {};
        const replacements = [
            {
                replace: 'node_modules/@bk/env/environment.ts',
                with: 'node_modules/@bk/env/environment.dev-proxy.ts'
            },
            {
                replace: 'projects/credit-appl/src/app/project-modules.ts',
                with: 'node_modules/@bk/byj-loan/app/project-modules.ts'
            },
            {
                replace: 'node_modules\\@bk\\module-core\\http-mock\\mock-disable.service.ts',
                with: 'node_modules\\@bk\\module-core\\http-mock\\mock-response.service.ts'
            },
            {
                replace: 'projects\\modules\\app\\core\\http-mock\\mock-disable.service.ts',
                with: 'projects\\modules\\app\\core\\http-mock\\mock-response.service.ts'
            }
        ];
        const graph = new ts_dep_1.default(co, replacements);
        graph.walkForDependencies(file);
        console.log(graph.requestMap);
        // expect(Array.from(graph.walked.values())
        //   .every(file => file.indexOf('node_modules') >= 0)
        // ).toBe(true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtZGVwU3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRzLWRlcFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IsdURBQThCO0FBQzlCLGlFQUE2RDtBQUM3RCxnREFBd0I7QUFFeEIsUUFBUSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7SUFDdEIsR0FBRyxDQUFDLG1GQUFtRixFQUFFLEdBQUcsRUFBRTtRQUM1RixNQUFNLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7UUFDeEUsTUFBTSxFQUFFLEdBQUcsMEJBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUN6QyxFQUFFLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1FBQzVCLE1BQU0sS0FBSyxHQUFHLElBQUksZ0JBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM1QixLQUFLLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDOUIsMkNBQTJDO0lBQzdDLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLGtGQUFrRixFQUFFLEdBQUcsRUFBRTtRQUMxRixNQUFNLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7UUFDeEUsTUFBTSxFQUFFLEdBQUcsMEJBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUN6QyxFQUFFLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO1FBQzNCLEVBQUUsQ0FBQyxLQUFLLEdBQUcsRUFDVixDQUFDO1FBRUYsTUFBTSxZQUFZLEdBQUc7WUFDbkI7Z0JBQ0UsT0FBTyxFQUFFLHFDQUFxQztnQkFDOUMsSUFBSSxFQUFFLCtDQUErQzthQUN0RDtZQUNEO2dCQUNFLE9BQU8sRUFBRSxpREFBaUQ7Z0JBQzFELElBQUksRUFBRSxrREFBa0Q7YUFDekQ7WUFDRDtnQkFDRSxPQUFPLEVBQUUsb0VBQW9FO2dCQUM3RSxJQUFJLEVBQUUscUVBQXFFO2FBQzVFO1lBQ0Q7Z0JBQ0UsT0FBTyxFQUFFLGtFQUFrRTtnQkFDM0UsSUFBSSxFQUFFLG1FQUFtRTthQUMxRTtTQUNGLENBQUM7UUFDRixNQUFNLEtBQUssR0FBRyxJQUFJLGdCQUFLLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQzFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVoQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM5QiwyQ0FBMkM7UUFDM0Msc0RBQXNEO1FBQ3RELGdCQUFnQjtJQUNsQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IEdyYXBoIGZyb20gJy4uL3RzLWRlcCc7XG5pbXBvcnQge3JlYWRUc0NvbmZpZ30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jb21waWxlcic7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxuZGVzY3JpYmUoJ3RzLWRlcCcsICgpID0+IHtcbiAgeGl0KCdXaGVuIHByZXNlcnZlU3ltbGlua3MgPSBmYWxzZSwgd2Fsa0ZvckRlcGVuZGVuY2llcygpIHNob3VsZCBjYW4gbGlzdCBkZXBlbmRlbmNpZXMnLCAoKSA9PiB7XG4gICAgY29uc3QgZmlsZSA9IFBhdGgucmVzb2x2ZSgncHJvamVjdHMvY3JlZGl0LWFwcGwvc3JjL2FwcC9hcHAubW9kdWxlLnRzJyk7XG4gICAgY29uc3QgY28gPSByZWFkVHNDb25maWcoJ3RzY29uZmlnLmpzb24nKTtcbiAgICBjby5wcmVzZXJ2ZVN5bWxpbmtzID0gZmFsc2U7XG4gICAgY29uc3QgZ3JhcGggPSBuZXcgR3JhcGgoY28pO1xuICAgIGdyYXBoLndhbGtGb3JEZXBlbmRlbmNpZXMoZmlsZSk7XG5cbiAgICBjb25zb2xlLmxvZyhncmFwaC5yZXF1ZXN0TWFwKTtcbiAgICAvLyBleHBlY3QoZ3JhcGgudW5yZXNvbHZlZC5sZW5ndGgpLnRvQmUoMCk7XG4gIH0pO1xuXG4gIGl0KCdXaGVuIHByZXNlcnZlU3ltbGlua3MgPSB0cnVlLCB3YWxrRm9yRGVwZW5kZW5jaWVzKCkgc2hvdWxkIGNhbiBsaXN0IGRlcGVuZGVuY2llcycsICgpID0+IHtcbiAgICBjb25zdCBmaWxlID0gUGF0aC5yZXNvbHZlKCdwcm9qZWN0cy9jcmVkaXQtYXBwbC9zcmMvYXBwL2FwcC5tb2R1bGUudHMnKTtcbiAgICBjb25zdCBjbyA9IHJlYWRUc0NvbmZpZygndHNjb25maWcuanNvbicpO1xuICAgIGNvLnByZXNlcnZlU3ltbGlua3MgPSB0cnVlO1xuICAgIGNvLnBhdGhzID0ge1xuICAgIH07XG5cbiAgICBjb25zdCByZXBsYWNlbWVudHMgPSBbXG4gICAgICB7XG4gICAgICAgIHJlcGxhY2U6ICdub2RlX21vZHVsZXMvQGJrL2Vudi9lbnZpcm9ubWVudC50cycsXG4gICAgICAgIHdpdGg6ICdub2RlX21vZHVsZXMvQGJrL2Vudi9lbnZpcm9ubWVudC5kZXYtcHJveHkudHMnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICByZXBsYWNlOiAncHJvamVjdHMvY3JlZGl0LWFwcGwvc3JjL2FwcC9wcm9qZWN0LW1vZHVsZXMudHMnLFxuICAgICAgICB3aXRoOiAnbm9kZV9tb2R1bGVzL0Biay9ieWotbG9hbi9hcHAvcHJvamVjdC1tb2R1bGVzLnRzJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcmVwbGFjZTogJ25vZGVfbW9kdWxlc1xcXFxAYmtcXFxcbW9kdWxlLWNvcmVcXFxcaHR0cC1tb2NrXFxcXG1vY2stZGlzYWJsZS5zZXJ2aWNlLnRzJyxcbiAgICAgICAgd2l0aDogJ25vZGVfbW9kdWxlc1xcXFxAYmtcXFxcbW9kdWxlLWNvcmVcXFxcaHR0cC1tb2NrXFxcXG1vY2stcmVzcG9uc2Uuc2VydmljZS50cydcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHJlcGxhY2U6ICdwcm9qZWN0c1xcXFxtb2R1bGVzXFxcXGFwcFxcXFxjb3JlXFxcXGh0dHAtbW9ja1xcXFxtb2NrLWRpc2FibGUuc2VydmljZS50cycsXG4gICAgICAgIHdpdGg6ICdwcm9qZWN0c1xcXFxtb2R1bGVzXFxcXGFwcFxcXFxjb3JlXFxcXGh0dHAtbW9ja1xcXFxtb2NrLXJlc3BvbnNlLnNlcnZpY2UudHMnXG4gICAgICB9XG4gICAgXTtcbiAgICBjb25zdCBncmFwaCA9IG5ldyBHcmFwaChjbywgcmVwbGFjZW1lbnRzKTtcbiAgICBncmFwaC53YWxrRm9yRGVwZW5kZW5jaWVzKGZpbGUpO1xuXG4gICAgY29uc29sZS5sb2coZ3JhcGgucmVxdWVzdE1hcCk7XG4gICAgLy8gZXhwZWN0KEFycmF5LmZyb20oZ3JhcGgud2Fsa2VkLnZhbHVlcygpKVxuICAgIC8vICAgLmV2ZXJ5KGZpbGUgPT4gZmlsZS5pbmRleE9mKCdub2RlX21vZHVsZXMnKSA+PSAwKVxuICAgIC8vICkudG9CZSh0cnVlKTtcbiAgfSk7XG59KTtcbiJdfQ==