/**
  * The test approach of this file is attest Typescript compiler
  * has no error report to parsing the file content.
 **/
import {describe, it, expect}  from '@jest/globals';
import {SingleActionFactory, SimplexReactor, SimplexReactorMergeType, RxController2} from '../src';

interface TestActions {
  message1(): SingleActionFactory;
  message2(greeting: string): SingleActionFactory;
  message3<T>(greeting: string, foobar: T): SingleActionFactory;
  message4(a: string, b: number, c: boolean): SingleActionFactory;
}

interface TestResponse {
  reply1(...backMsg: string[]): SingleActionFactory;
  reply2(backMsg: string): SingleActionFactory;
  reply3(backMsg: string): SingleActionFactory;
  reply4(backMsg: number): SingleActionFactory;
}

const tableFor = ['message2'] as const;

const baseService = new SimplexReactor<TestActions & TestResponse, typeof tableFor>();
type BaseService = SimplexReactor<TestActions & TestResponse, typeof tableFor>;

interface ExtendActions extends TestActions {
  message5(a: number | null): SingleActionFactory;
}
const tableFor1 = ['message5'] as const;
interface ExtendActions2 extends ExtendActions {
  message6(a: number): SingleActionFactory;
}
const tableFor2 = ['message5', 'message6'] as const;
describe('Typescript compiler', () => {
  it('should not report any error on assignable SimplexReactor type casting', () => {
    const extendedService = baseService as SimplexReactorMergeType<BaseService, SimplexReactor<ExtendActions>>;

    function acceptDerivedTypeForBaseType<I extends TestActions & TestResponse, L extends typeof tableFor>(_base: SimplexReactor<I, L>) {}
    acceptDerivedTypeForBaseType(extendedService);

    const baseControl = new RxController2<TestActions>();
    const control = baseControl as unknown as RxController2<ExtendActions2>;
    const castToBase = control as RxController2<TestActions>;

    function acceptDerivedTypeForBaseType2(_accepted: SimplexReactor<ExtendActions, typeof tableFor1>) {}
    acceptDerivedTypeForBaseType2({} as SimplexReactor<ExtendActions2, typeof tableFor2>);
    expect(castToBase).not.toBeNull();
  });
});
