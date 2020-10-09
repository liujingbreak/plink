"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-console
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9zcGVjL3RzLWRlcFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsdURBQThCO0FBQzlCLGlFQUE2RDtBQUM3RCxnREFBd0I7QUFFeEIsUUFBUSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7SUFDdEIsR0FBRyxDQUFDLG1GQUFtRixFQUFFLEdBQUcsRUFBRTtRQUM1RixNQUFNLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7UUFDeEUsTUFBTSxFQUFFLEdBQUcsMEJBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUN6QyxFQUFFLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1FBQzVCLE1BQU0sS0FBSyxHQUFHLElBQUksZ0JBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM1QixLQUFLLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDOUIsMkNBQTJDO0lBQzdDLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLGtGQUFrRixFQUFFLEdBQUcsRUFBRTtRQUMxRixNQUFNLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7UUFDeEUsTUFBTSxFQUFFLEdBQUcsMEJBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUN6QyxFQUFFLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO1FBQzNCLEVBQUUsQ0FBQyxLQUFLLEdBQUcsRUFDVixDQUFDO1FBRUYsTUFBTSxZQUFZLEdBQUc7WUFDbkI7Z0JBQ0UsT0FBTyxFQUFFLHFDQUFxQztnQkFDOUMsSUFBSSxFQUFFLCtDQUErQzthQUN0RDtZQUNEO2dCQUNFLE9BQU8sRUFBRSxpREFBaUQ7Z0JBQzFELElBQUksRUFBRSxrREFBa0Q7YUFDekQ7WUFDRDtnQkFDRSxPQUFPLEVBQUUsb0VBQW9FO2dCQUM3RSxJQUFJLEVBQUUscUVBQXFFO2FBQzVFO1lBQ0Q7Z0JBQ0UsT0FBTyxFQUFFLGtFQUFrRTtnQkFDM0UsSUFBSSxFQUFFLG1FQUFtRTthQUMxRTtTQUNGLENBQUM7UUFDRixNQUFNLEtBQUssR0FBRyxJQUFJLGdCQUFLLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQzFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVoQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM5QiwyQ0FBMkM7UUFDM0Msc0RBQXNEO1FBQ3RELGdCQUFnQjtJQUNsQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6ImRpc3Qvc3BlYy90cy1kZXBTcGVjLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
