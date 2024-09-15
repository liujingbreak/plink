/**
  * The test approach of this file is attest Typescript compiler
  * has no error report to parsing the file content.
 **/
import {describe, it, expect}  from '@jest/globals';
import {SingleActionFactory, SimplexReactor, RxController2} from '../src';

interface TestResponse {
  action1(...backMsg: string[]): SingleActionFactory;
  // reply2(backMsg: string): SingleActionFactory;
  // reply3(backMsg: string): SingleActionFactory;
  // reply4(backMsg: number): SingleActionFactory;
}

const tableFor = ['action1'] as const;

const baseService = new SimplexReactor<TestResponse, typeof tableFor>();
type BaseService = SimplexReactor<TestResponse, typeof tableFor>;
function acceptDerivedTypeForBaseType<I, L extends Array<keyof I>>(base: SimplexReactor<TestResponse & I, readonly (L[number] | (typeof tableFor)[number])[]>) {
}

interface ExtendActions {
  message5(a: number | null): SingleActionFactory;
}
const tableFor1 = ['message5'] as const;
interface ExtendActions2 extends ExtendActions {
  message6(a: number): SingleActionFactory;
}
type FeatureService = SimplexReactor<ExtendActions, typeof tableFor1>;

function acceptBaseType(base: BaseService) {
  // base.table.l.message2.subscribe();
}
function acceptFeatureService(f: FeatureService) {}
const tableFor2 = ['message5', 'message6'] as const;
describe('Typescript compiler', () => {
  it.skip('should not report any error on assignable SimplexReactor type casting', () => {
    const extendedService = baseService.config<ExtendActions, typeof tableFor1>({name: 'test', tableFor: tableFor1});
    const extendedWithoutTable = baseService.config<ExtendActions>({name: 'test2'});

    acceptDerivedTypeForBaseType(extendedService);
    acceptFeatureService(extendedService);

    acceptBaseType(extendedService.b);
    acceptBaseType(extendedWithoutTable.b);
    const baseControl = new RxController2<TestActions>();
    const control = baseControl as unknown as RxController2<ExtendActions2>;
    const castToBase = control as RxController2<TestActions>;

    function acceptDerivedTypeForBaseType2(accepted: SimplexReactor<ExtendActions, typeof tableFor1>) {
      accepted.table.l.message5.subscribe();
    }
    acceptDerivedTypeForBaseType2({} as SimplexReactor<ExtendActions2, (typeof tableFor2>);
    expect(castToBase).not.toBeNull();
  });
});
