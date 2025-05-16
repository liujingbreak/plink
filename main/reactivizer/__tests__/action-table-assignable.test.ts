import {ActionTable, RxController2, SingleActionFactory} from '../src/index';

interface SampleInterf {
  func1(a: number): SingleActionFactory;
}

const tableFor = ['func1'] as const;

const s = new RxController2<SampleInterf>();
const table = new ActionTable<SampleInterf, typeof tableFor>(s, tableFor);

class MimicTable<I, L extends keyof I> {
  l: I = {} as any;
}

function acceptMimicTable<I extends SampleInterf, L extends 'func1' = 'func1'>(table: MimicTable<I, L>) {

}

const mt = new MimicTable<SampleInterf, (typeof tableFor)[number]>();
mt.l.func1(0);

export function acceptTable<I extends SampleInterf, L extends 'func1'>(table: ActionTable<I, L[]>) {
}
