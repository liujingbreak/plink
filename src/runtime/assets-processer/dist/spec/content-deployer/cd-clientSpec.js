"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cd_client_1 = require("../../content-deployer/cd-client");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
// import Path from 'path';
jasmine.DEFAULT_TIMEOUT_INTERVAL = 5 * 60 * 1000;
describe('cd-client', () => {
    xit('toLines pipe operator should work', () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        yield rxjs_1.of(Buffer.from('\nabcd'), Buffer.from('efg\n123'), Buffer.from('4\n'), rxjs_1.asyncScheduler)
            .pipe(cd_client_1.toLines, 
        // tslint:disable-next-line: no-console
        operators_1.tap(line => console.log(JSON.stringify(line))), operators_1.reduce((acc, value) => {
            acc.push(value);
            return acc;
        }, []), operators_1.tap(all => expect(all).toEqual(['', 'abcdefg', '1234']))).toPromise();
    }));
    xit('sendAppZip should work', () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        yield cd_client_1.sendAppZip({
            url: 'http://localhost:14333/_install',
            file: 'install-local/testapp',
            numOfConc: 2,
            numOfNode: 1
        }, '/Users/liujing/bk/webui-static.zip');
        // tslint:disable-next-line: no-console
        console.log('-----------');
    }));
});

//# sourceMappingURL=cd-clientSpec.js.map
