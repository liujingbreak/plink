"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:no-console
const ts_dep_1 = tslib_1.__importDefault(require("../ts-dep"));
const ts_compiler_1 = require("dr-comp-package/wfh/dist/ts-compiler");
const path_1 = tslib_1.__importDefault(require("path"));
describe('ts-dep', () => {
    xit('When preserveSymlinks = false, walkForDependencies() should can list dependencies', () => {
        const file = path_1.default.resolve('projects/credit-appl/src/app/app.module.ts');
        const co = ts_compiler_1.readTsConfig('tsconfig.json');
        co.preserveSymlinks = false;
        const graph = new ts_dep_1.default(co);
        graph.walkForDependencies(file);
        console.log(graph.walked);
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
        console.log(graph.walked);
        // expect(Array.from(graph.walked.values())
        //   .every(file => file.indexOf('node_modules') >= 0)
        // ).toBe(true);
    });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL3RzLWRlcFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLCtEQUE4QjtBQUM5QixzRUFBa0U7QUFDbEUsd0RBQXdCO0FBRXhCLFFBQVEsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO0lBQ3RCLEdBQUcsQ0FBQyxtRkFBbUYsRUFBRSxHQUFHLEVBQUU7UUFDNUYsTUFBTSxJQUFJLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sRUFBRSxHQUFHLDBCQUFZLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDekMsRUFBRSxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQztRQUM1QixNQUFNLEtBQUssR0FBRyxJQUFJLGdCQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDNUIsS0FBSyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWhDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFCLDJDQUEyQztJQUM3QyxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxrRkFBa0YsRUFBRSxHQUFHLEVBQUU7UUFDMUYsTUFBTSxJQUFJLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sRUFBRSxHQUFHLDBCQUFZLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDekMsRUFBRSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztRQUMzQixFQUFFLENBQUMsS0FBSyxHQUFHLEVBQ1YsQ0FBQztRQUVGLE1BQU0sWUFBWSxHQUFHO1lBQ25CO2dCQUNFLE9BQU8sRUFBRSxxQ0FBcUM7Z0JBQzlDLElBQUksRUFBRSwrQ0FBK0M7YUFDdEQ7WUFDRDtnQkFDRSxPQUFPLEVBQUUsaURBQWlEO2dCQUMxRCxJQUFJLEVBQUUsa0RBQWtEO2FBQ3pEO1lBQ0Q7Z0JBQ0UsT0FBTyxFQUFFLG9FQUFvRTtnQkFDN0UsSUFBSSxFQUFFLHFFQUFxRTthQUM1RTtZQUNEO2dCQUNFLE9BQU8sRUFBRSxrRUFBa0U7Z0JBQzNFLElBQUksRUFBRSxtRUFBbUU7YUFDMUU7U0FDRixDQUFDO1FBQ0YsTUFBTSxLQUFLLEdBQUcsSUFBSSxnQkFBSyxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUMxQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUIsMkNBQTJDO1FBQzNDLHNEQUFzRDtRQUN0RCxnQkFBZ0I7SUFDbEIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9zcGVjL3RzLWRlcFNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG5pbXBvcnQgR3JhcGggZnJvbSAnLi4vdHMtZGVwJztcbmltcG9ydCB7cmVhZFRzQ29uZmlnfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdHMtY29tcGlsZXInO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5cbmRlc2NyaWJlKCd0cy1kZXAnLCAoKSA9PiB7XG4gIHhpdCgnV2hlbiBwcmVzZXJ2ZVN5bWxpbmtzID0gZmFsc2UsIHdhbGtGb3JEZXBlbmRlbmNpZXMoKSBzaG91bGQgY2FuIGxpc3QgZGVwZW5kZW5jaWVzJywgKCkgPT4ge1xuICAgIGNvbnN0IGZpbGUgPSBQYXRoLnJlc29sdmUoJ3Byb2plY3RzL2NyZWRpdC1hcHBsL3NyYy9hcHAvYXBwLm1vZHVsZS50cycpO1xuICAgIGNvbnN0IGNvID0gcmVhZFRzQ29uZmlnKCd0c2NvbmZpZy5qc29uJyk7XG4gICAgY28ucHJlc2VydmVTeW1saW5rcyA9IGZhbHNlO1xuICAgIGNvbnN0IGdyYXBoID0gbmV3IEdyYXBoKGNvKTtcbiAgICBncmFwaC53YWxrRm9yRGVwZW5kZW5jaWVzKGZpbGUpO1xuXG4gICAgY29uc29sZS5sb2coZ3JhcGgud2Fsa2VkKTtcbiAgICAvLyBleHBlY3QoZ3JhcGgudW5yZXNvbHZlZC5sZW5ndGgpLnRvQmUoMCk7XG4gIH0pO1xuXG4gIGl0KCdXaGVuIHByZXNlcnZlU3ltbGlua3MgPSB0cnVlLCB3YWxrRm9yRGVwZW5kZW5jaWVzKCkgc2hvdWxkIGNhbiBsaXN0IGRlcGVuZGVuY2llcycsICgpID0+IHtcbiAgICBjb25zdCBmaWxlID0gUGF0aC5yZXNvbHZlKCdwcm9qZWN0cy9jcmVkaXQtYXBwbC9zcmMvYXBwL2FwcC5tb2R1bGUudHMnKTtcbiAgICBjb25zdCBjbyA9IHJlYWRUc0NvbmZpZygndHNjb25maWcuanNvbicpO1xuICAgIGNvLnByZXNlcnZlU3ltbGlua3MgPSB0cnVlO1xuICAgIGNvLnBhdGhzID0ge1xuICAgIH07XG5cbiAgICBjb25zdCByZXBsYWNlbWVudHMgPSBbXG4gICAgICB7XG4gICAgICAgIHJlcGxhY2U6ICdub2RlX21vZHVsZXMvQGJrL2Vudi9lbnZpcm9ubWVudC50cycsXG4gICAgICAgIHdpdGg6ICdub2RlX21vZHVsZXMvQGJrL2Vudi9lbnZpcm9ubWVudC5kZXYtcHJveHkudHMnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICByZXBsYWNlOiAncHJvamVjdHMvY3JlZGl0LWFwcGwvc3JjL2FwcC9wcm9qZWN0LW1vZHVsZXMudHMnLFxuICAgICAgICB3aXRoOiAnbm9kZV9tb2R1bGVzL0Biay9ieWotbG9hbi9hcHAvcHJvamVjdC1tb2R1bGVzLnRzJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcmVwbGFjZTogJ25vZGVfbW9kdWxlc1xcXFxAYmtcXFxcbW9kdWxlLWNvcmVcXFxcaHR0cC1tb2NrXFxcXG1vY2stZGlzYWJsZS5zZXJ2aWNlLnRzJyxcbiAgICAgICAgd2l0aDogJ25vZGVfbW9kdWxlc1xcXFxAYmtcXFxcbW9kdWxlLWNvcmVcXFxcaHR0cC1tb2NrXFxcXG1vY2stcmVzcG9uc2Uuc2VydmljZS50cydcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHJlcGxhY2U6ICdwcm9qZWN0c1xcXFxtb2R1bGVzXFxcXGFwcFxcXFxjb3JlXFxcXGh0dHAtbW9ja1xcXFxtb2NrLWRpc2FibGUuc2VydmljZS50cycsXG4gICAgICAgIHdpdGg6ICdwcm9qZWN0c1xcXFxtb2R1bGVzXFxcXGFwcFxcXFxjb3JlXFxcXGh0dHAtbW9ja1xcXFxtb2NrLXJlc3BvbnNlLnNlcnZpY2UudHMnXG4gICAgICB9XG4gICAgXTtcbiAgICBjb25zdCBncmFwaCA9IG5ldyBHcmFwaChjbywgcmVwbGFjZW1lbnRzKTtcbiAgICBncmFwaC53YWxrRm9yRGVwZW5kZW5jaWVzKGZpbGUpO1xuXG4gICAgY29uc29sZS5sb2coZ3JhcGgud2Fsa2VkKTtcbiAgICAvLyBleHBlY3QoQXJyYXkuZnJvbShncmFwaC53YWxrZWQudmFsdWVzKCkpXG4gICAgLy8gICAuZXZlcnkoZmlsZSA9PiBmaWxlLmluZGV4T2YoJ25vZGVfbW9kdWxlcycpID49IDApXG4gICAgLy8gKS50b0JlKHRydWUpO1xuICB9KTtcbn0pO1xuIl19
