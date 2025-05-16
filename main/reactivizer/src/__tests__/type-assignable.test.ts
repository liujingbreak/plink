/* eslint-disable @typescript-eslint/no-unused-vars */
/**
  * The test approach of this file is attest Typescript compiler
  * has no error report to parsing the file content.
 **/
import {describe, it} from '@jest/globals';
import {SingleActionFactory, SimplexReactor, CoreOptions} from '../index';

interface TestInput {
  action1(...backMsg: string[]): SingleActionFactory;
}
interface TestEvents extends TestInput {
  onEvent(): SingleActionFactory;
}

const tableFor = ['action1'] as const;

const baseService = new SimplexReactor<TestEvents, typeof tableFor>();
type BaseService = SimplexReactor<TestEvents, typeof tableFor>;

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
function acceptDerivedTypeForBaseType(base: BaseService) {
  base.table.l.action1.subscribe();
}
function acceptFeatureService(f: FeatureService) {
  f.s.pt.message5.subscribe();
  f.s.ft.message4(false).dp();
  f.table.l.message5.subscribe();
}
function accepSimplexReactor(sr: SimplexReactor<any, any>) {
  return sr;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
function acceptBaseOptions(_opt: CoreOptions<TestInput>) {}

const tableFor2 = ['message5', 'message6'] as const;
describe('Typescript compiler', () => {
  it.skip('should not report any error on assignable SimplexReactor type casting', () => {
    const extendedService = baseService.config<ExtendActions, typeof tableFor1>({name: 'test', tableFor: tableFor1}).toExtend();
    const extendedWithoutTable = baseService.config({name: 'test2'}).toExtend<ExtendActions>();

    acceptDerivedTypeForBaseType(extendedService);
    acceptFeatureService(extendedService);
    accepSimplexReactor(baseService);
    accepSimplexReactor(extendedService);

    acceptBaseType(extendedService);
    acceptBaseType(extendedWithoutTable);
    const extendedOpts = {
      debug: true
    } as CoreOptions<TestInput & ExtendActions>;
    acceptBaseOptions(extendedOpts as CoreOptions<TestInput>);

    function acceptDerivedTypeForBaseType2(accepted: SimplexReactor<ExtendActions, typeof tableFor1>) {
      accepted.table.l.message5.subscribe();
    }
    acceptDerivedTypeForBaseType2({} as SimplexReactor<ExtendActions2, (typeof tableFor2)>);
  });

  it.skip('SimplexReactor.toExtend() should work on types', () => {
    const base = new SimplexReactor<TestInput>();
    const extended = base.toExtend<TestEvents, typeof tableFor>();
    const extended2 = extended.toExtend<ExtendActions, typeof tableFor1>();

    function acceptBase(b: SimplexReactor<TestInput>) {
      return b;
    }
    acceptBase(base);
    acceptBase(extended);
    acceptBase(extended2);
  });
});
