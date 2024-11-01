"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
  * The test approach of this file is attest Typescript compiler
  * has no error report to parsing the file content.
 **/
const globals_1 = require("@jest/globals");
const index_1 = require("../index");
const tableFor = ['action1'];
const baseService = new index_1.SimplexReactor();
function acceptDerivedTypeForBaseType(base) {
    base.table.l.action1.subscribe();
}
const tableFor1 = ['message5'];
function acceptBaseType(base) {
    base.table.l.action1.subscribe();
}
function acceptFeatureService(f) {
    f.s.pt.message5.subscribe();
    f.s.ft.message4(false).dp();
    f.table.l.message5.subscribe();
}
const tableFor2 = ['message5', 'message6'];
(0, globals_1.describe)('Typescript compiler', () => {
    globals_1.it.skip('should not report any error on assignable SimplexReactor type casting', () => {
        const extendedService = baseService.config({ name: 'test', tableFor: tableFor1 });
        const extendedWithoutTable = baseService.config({ name: 'test2' });
        acceptDerivedTypeForBaseType(extendedService);
        acceptFeatureService(extendedService);
        acceptBaseType(extendedService);
        acceptBaseType(extendedWithoutTable);
        function acceptDerivedTypeForBaseType2(accepted) {
            accepted.table.l.message5.subscribe();
        }
        acceptDerivedTypeForBaseType2({});
    });
});
//# sourceMappingURL=type-assignable.test.js.map