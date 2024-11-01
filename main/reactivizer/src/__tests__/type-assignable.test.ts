/**
  * The test approach of this file is attest Typescript compiler
  * has no error report to parsing the file content.
 **/
import {describe, it}  from '@jest/globals';
import {SingleActionFactory, SimplexReactor} from '../index';

interface TestResponse {
  action1(...backMsg: string[]): SingleActionFactory;
  // reply2(backMsg: string): SingleActionFactory;
  // reply3(backMsg: string): SingleActionFactory;
  // reply4(backMsg: number): SingleActionFactory;
}

const tableFor = ['action1'] as const;

const baseService = new SimplexReactor<TestResponse, typeof tableFor>();
type BaseService = SimplexReactor<TestResponse, typeof tableFor>;
function acceptDerivedTypeForBaseType(base: BaseService) {
  base.table.l.action1.subscribe();
}

interface ExtendActions {
  message4(b: boolean): SingleActionFactory;
  message5(a: number | null): SingleActionFactory;
}
const tableFor1 = ['message5'] as const;
interface ExtendActions2 extends ExtendActions {
  message6(a: number): SingleActionFactory;
}
type FeatureService = SimplexReactor<ExtendActions, typeof tableFor1>;

function acceptBaseType(base: BaseService) {
  base.table.l.action1.subscribe();
}
function acceptFeatureService(f: FeatureService) {
  f.s.pt.message5.subscribe();
  f.s.ft.message4(false).dp();
  f.table.l.message5.subscribe();
}
const tableFor2 = ['message5', 'message6'] as const;
describe('Typescript compiler', () => {
  it.skip('should not report any error on assignable SimplexReactor type casting', () => {
    const extendedService = baseService.config<ExtendActions, typeof tableFor1>({name: 'test', tableFor: tableFor1});
    const extendedWithoutTable = baseService.config<ExtendActions>({name: 'test2'});

    acceptDerivedTypeForBaseType(extendedService);
    acceptFeatureService(extendedService);

    acceptBaseType(extendedService);
    acceptBaseType(extendedWithoutTable);

    function acceptDerivedTypeForBaseType2(accepted: SimplexReactor<ExtendActions, typeof tableFor1>) {
      accepted.table.l.message5.subscribe();
    }
    acceptDerivedTypeForBaseType2({} as SimplexReactor<ExtendActions2, (typeof tableFor2)>);
  });
});
