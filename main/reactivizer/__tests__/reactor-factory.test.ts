/* eslint-disable no-console */
import * as rx from 'rxjs';
import {jest, describe, it, expect}  from '@jest/globals';
import {SingleActionFactory} from '../dist/index';
import {BaseReactorFactory} from '../dist/reactor-factory';
import {createSimpleIndentLogger} from '../dist/nodejs-utils';

interface BaseActions {
  msg1(greeting: string): SingleActionFactory;
  res1(hello: string): SingleActionFactory;
}
const tableForBase = ['res1'] as const;

const log = createSimpleIndentLogger(false, false, process.stdout);

const baseFac = new BaseReactorFactory<BaseActions, typeof tableForBase>({
  debug: true,
  tableFor: tableForBase,
  log
});
baseFac.interceptorByType(ac => rx.merge(
  ac.at.msg1.pipe(
    rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
  ),
  ac.ofOtherTypes()
)).defineReactor(service => {
  const {s, r} = service;
  r('msg1 -> res1', s.pt.msg1.pipe(
    rx.map(([m, g]) => {
      s.ft.res1('hey ' + g).dp(m);
    })
  ));
  s.ft.msg1('base factory service').dp();
});

interface DerivedActions {
  msg2(greeting: string): SingleActionFactory;
  res2(hello: string): SingleActionFactory;
}
const tableForDerived = ['res2'] as const;
const derivedFac = baseFac.forExtend<DerivedActions, typeof tableForDerived>({
  debug: true,
  log,
  tableFor: tableForDerived
}).interceptorByType(ac => rx.merge(
  ac.at.msg2.pipe(
    rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
  ),
  ac.ofOtherTypes()
)).defineReactor(svc => {
  const {s, r} = svc;
  r('msg2 -> res2', s.pt.msg2.pipe(
    rx.map(([m, msg]) => {
      s.ft.res2('derived got ' + msg).dp(m);
    })
  ));
});

interface DerivedActions2 {
  msg3(greeting: string): SingleActionFactory;
  res3(hello: string): SingleActionFactory;
}
const tableForDerived2 = ['res3'] as const;
const derivedFac2 = derivedFac.forExtend<DerivedActions2, typeof tableForDerived2>({
  debug: true, log,
  tableFor: tableForDerived2
}).interceptorForBaseByType(ac => rx.merge(
  ac.at.msg2.pipe(
    rx.tap(({p: [msg]}) => console.log('>>> in filter for', msg)),
    rx.filter(({p: [msg]}) => msg.length > 0)
  ),
  ac.ofOtherTypes()
)).interceptorByType(ac => rx.merge(
  ac.at.res3.pipe(
    rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
  ),
  ac.ofOtherTypes()
)).defineReactor(svc => {
  const {s} = svc;
  s.pt.msg3.pipe(
    rx.map(([m, msg]) => {
      s.ft.res3(msg).dp(m);
    })
  ).subscribe();
});

describe('reactor factory', () => {
  it.skip('Instance from base factory can work with filter', () => {
    const mock = jest.fn();

    const baseService = baseFac.create();
    const {r, s, table} = baseService;
    r('res1', table.l.res1.pipe(
      rx.map(([, msg]) => mock(msg))
    ));
    s.ft.msg1('bro').dp();
    s.ft.msg1('bro').dp();
    expect(mock.mock.calls.length).toBe(2);

    baseService.dispose();
  }, 2000);

  it.skip('Inheritance can work, filter can also work on derived service, filter from base service is respected', () => {
    const mock = jest.fn();
    const mock2 = jest.fn();
    // const mockFilter = jest.fn();

    // instantiate instance
    const derivedSvc = derivedFac.create({name: 'derivedSvc'});
    const {r, s, table} = derivedSvc;
    r('res1', table.l.res1.pipe(
      rx.map(([, msg]) => mock(msg))
    ));
    r('res2', table.l.res2.pipe(
      rx.map(([, msg]) => mock2(msg))
    ));

    s.ft.msg1('man').do(s.pt.res1).subscribe();
    s.ft.msg1('man').dp();
    s.ft.msg2('Jesus').dp();
    s.ft.msg2('Jesus').dp();
    s.ft.msg2('God').do(s.pt.res2).subscribe();
    expect(mock.mock.calls.length).toBe(2);
    // derivedSvc.log('filter', mockFilter.mock.calls.map(args => args[0]));
    // expect(mockFilter.mock.calls.length).toBe(3);
    expect(mock2.mock.calls.length).toBe(2);
    derivedSvc.dispose();
  }, 2000);

  it('2 levels inheritance', () => {
    const service = derivedFac2.create();
    const {s, table} = service;
    const mock1 = jest.fn();
    const mock2 = jest.fn();
    const mock3 = jest.fn();
    const mock4 = jest.fn();
    table.l.res1.subscribe(([, v]) => mock1(v));
    table.l.res2.subscribe(([, v]) => mock2(v));
    s.pt.msg2.subscribe(([, v]) => mock4(v));
    table.l.res3.subscribe(([, v]) => mock3(v));

    s.ft.msg1('supreme leader').dp();
    s.ft.msg1('supreme leader').dp();
    s.ft.msg3('from Mr Liu').dp();
    s.ft.msg3('from Mr Liu').dp();
    s.ft.msg3('from Mrs Liu').dp();
    s.ft.msg2('hello').dp();
    s.ft.msg2('').dp();
    service.log('>> mock1:', mock1.mock.calls.map(a => a[0]));
    expect(mock1.mock.calls.map(a => a[0])).toEqual([
      'hey base factory service',
      'hey supreme leader'
    ]);

    expect(mock3.mock.calls.map(a => a[0])).toEqual([
      'from Mr Liu',
      'from Mrs Liu'
    ]);
    expect(mock2.mock.calls.map(a => a[0])).toEqual(['derived got hello']);
    // derived service can recieve all messages which is intercepted for base service
    expect(mock4.mock.calls.map(a => a[0])).toEqual([
      'hello',
      ''
    ]);
  });
});
