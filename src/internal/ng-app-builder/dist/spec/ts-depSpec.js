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

//# sourceMappingURL=ts-depSpec.js.map
