/* eslint-disable no-console */
import * as rx from 'rxjs';
import {jest, describe, it, expect} from '@jest/globals';
import {SingleActionFactory} from '../src/index';
import {CreateOptsOfFac, BaseReactorFactory, SimplexReactorOfFac} from '../src/reactor-factory';
import {conciseConsoleLogger} from '../src/nodejs-utils';

interface BaseActions {
  msg1(greeting: string): SingleActionFactory;
  res1(hello: string): SingleActionFactory;

  msgX(v: string): SingleActionFactory;
  onMsgX(reciever: string): SingleActionFactory;
}
const tableForBase = ['res1', 'msgX'] as const;

const log = conciseConsoleLogger;

const baseFac = new BaseReactorFactory<BaseActions, typeof tableForBase>({
  name: 'base',
  debug: true,
  tableFor: tableForBase,
  log
}).interceptorByType(ac => rx.merge(
  ac.at.msg1.pipe(
    rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
  ),
  ac.ofOtherTypes()
)).defineReactor((ctx, greeting: string) => {
  const service = ctx.init(ctx.setting);
  const {pt, ft, r, table} = service;
  r('msg1 -> res1', pt.msg1.pipe(
    rx.map(([m, g]) => {
      ft.res1('hey ' + g).dp(m);
    })
  ));

  r('msgX', pt.msgX.pipe(
    rx.map(([m]) => {
      ft.onMsgX('base').dp(m);
    })
  ));
  r('table.l.msgX', table.l.msgX.pipe(
    rx.map(([m]) => {
      ft.onMsgX('base table').dp(m);
    })
  ));
  ft.msg1('base factory service' + greeting).dp();
});

interface DerivedActions {
  msg2(greeting: string): SingleActionFactory;
  res2(hello: string): SingleActionFactory;
}
const tableForDerived = ['res2'] as const;
const derivedFac = baseFac.forExtend<DerivedActions, typeof tableForDerived>({
  name: 'derived',
  debug: true,
  log,
  tableFor: tableForDerived
}).interceptorByType(ac => rx.merge(
  ac.at.msg2.pipe(
    rx.tap(({p: [msg]}) => {console.log('>>> in filter for', msg);}),
    rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
  ),
  ac.ofOtherTypes()
)).interceptorForBaseByType(ad => rx.merge(
  ad.at.msgX.pipe(
    rx.tap(x => {
      console.log('>>> interceptorByType for', x);
    })
  ),
  ad.ofOtherTypes()
)).defineReactor(({init, setting}) => {
  const {ft, pt, r, table} = init(setting, '');
  r('msgX', pt.msgX.pipe(
    rx.map(([m]) => {
      ft.onMsgX('deri').dp(m);
    })
  ));
  r('table.l.msgX', table.l.msgX.pipe(
    rx.map(([m]) => {
      ft.onMsgX('deri table').dp(m);
    })
  ));
  r('msg2 -> res2', pt.msg2.pipe(
    rx.map(([m, msg]) => {
      ft.res2('derived got ' + msg).dp(m);
    })
  ));
});

interface DerivedActions2 {
  msg3(greeting: string): SingleActionFactory;
  res3(hello: string): SingleActionFactory;
}
const tableForDerived2 = ['res3'] as const;
const derivedFac2 = derivedFac.forExtend<DerivedActions2, typeof tableForDerived2>({
  name: 'derived2',
  debug: true, log,
  tableFor: tableForDerived2
}).interceptorForBaseByType(ac => rx.merge(
  ac.at.msg2.pipe(
    rx.filter(({p: [msg]}) => msg.length > 0)
  ),
  ac.ofOtherTypes()
)).interceptorByType(ac => rx.merge(
  ac.at.res3.pipe(
    rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
  ),
  ac.ofOtherTypes()
)).defineReactor(({init}) => {
  const {pt, ft} = init();
  pt.msg3.pipe(
    rx.map(([m, msg]) => {
      ft.res3(msg).dp(m);
    })
  ).subscribe();
});

// test type inference of "SimplexReactorOfFac<...>"
export type BaseSimplexReactor = SimplexReactorOfFac<typeof baseFac>;
export type DerivedSimplexReactor = SimplexReactorOfFac<typeof derivedFac>;
export type DerivedSimplexReactor2 = SimplexReactorOfFac<typeof derivedFac2>;
export type OptsOfDerivedFac2 = CreateOptsOfFac<typeof derivedFac2>;

interface CornerCaseBaseFacActions {
  msg1(g: string): SingleActionFactory;
  res1(g: string): SingleActionFactory;
}
const cornerBaseFac = new BaseReactorFactory<CornerCaseBaseFacActions>({
  name: 'base', debug: true, log
}).interceptor(a$ => a$).defineReactor(({init: service}) => {
  const {pt, ft, r} = service();
  r('msg1', pt.msg1.pipe(
    rx.map(([m, g]) => ft.res1('from base:' + g).dp(m))
  ));
});
interface CornerDerivedAction1 {
  res2(msg: string): SingleActionFactory;
}
const cornerDerivedFac1 = cornerBaseFac.forExtend<CornerDerivedAction1>({name: 'derivedFromBase-1'}).defineReactor(({init}) => {
  const {r, ft, pt} = init();
  r('msg1 -> res2', pt.msg1.pipe(
    rx.map(([m, g]) => ft.res2('from derived1:' + g).dp(m))
  ));
});
interface CornerDerivedAction2 {
  res3(msg: string): SingleActionFactory;
}
const cornerDerivedFac2 = cornerBaseFac.forExtend<CornerDerivedAction2>({name: 'derivedFromBase-2'}).defineReactor(({init}) => {
  const {r, pt, ft} = init();
  r('msg1 -> res3', pt.msg1.pipe(
    rx.map(([m, g]) => ft.res3('from derived2:' + g).dp(m))
  ));
});
describe('reactor factory', () => {
  describe('base cases', () => {
    it.skip('Instance from base factory can work with filter', () => {
      const mock = jest.fn();
      const mock2 = jest.fn();

      const baseService = baseFac.create('initParam');
      const {r, pt, ft, table} = baseService;
      r('res1', table.l.res1.pipe(
        rx.map(([, msg]) => mock(msg))
      ));
      expect(baseService.s.pt).toBe(pt);
      r('res1', pt.res1.pipe(
        rx.map(([, msg]) => mock2(msg))
      ));
      ft.msg1('bro').dp();
      ft.msg1('bro').dp();
      expect(mock.mock.calls.length).toBe(2);
      expect(mock2.mock.calls.length).toBe(1);
      expect(mock2.mock.calls[0][0]).toBe('hey bro');
      baseService.dispose();
    }, 2000);

    it.skip('Inheritance can work, filter can also work on derived service, filter from base service is respected', () => {
      const mock = jest.fn();
      const mock2 = jest.fn();
      const testOrder = jest.fn();

      // instantiate instance
      const derivedSvc = derivedFac.create();
      const {r, ft, pt, table, p} = derivedSvc;
      r('post res1', p.pt.msgX.pipe(
        rx.map(() => {
          testOrder('postBase');
        })
      ));
      r('post res1', pt.msgX.pipe(
        rx.map(() => {
          testOrder('normal');
        })
      ));
      r('res1', table.l.res1.pipe(
        rx.map(([, msg]) => {
          mock(msg);
        })
      ));
      r('res2', table.l.res2.pipe(
        rx.map(([, msg]) => mock2(msg))
      ));

      ft.msgX('').dp();
      ft.msg1('man').do(pt.res1).subscribe();
      ft.msg1('man').dp();
      ft.msg2('Jesus').dp();
      ft.msg2('Jesus').dp();
      ft.msg2('God').do(pt.res2).subscribe();
      expect(mock.mock.calls.length).toBe(2);
      expect(mock2.mock.calls.length).toBe(2);
      expect(testOrder.mock.calls.map(([x]) => x))
        .toEqual(['normal', 'postBase']);
      derivedSvc.dispose();
    }, 2000);

    it.skip('2 levels inheritance', () => {
      const service = derivedFac2.setting({name: 'derived-of-derived', debug: true}).create();
      const {s, ft, pt, table} = service;
      const mock1 = jest.fn();
      const mock2 = jest.fn();
      const mock3 = jest.fn();
      const mock4 = jest.fn();
      table.l.res1.subscribe(([, v]) => mock1(v));
      table.l.res2.subscribe(([, v]) => mock2(v));
      pt.msg2.subscribe(([, v]) => mock4(v));
      expect(s.pt === pt).toBe(true);
      table.l.res3.subscribe(([, v]) => mock3(v));

      ft.msg1('supreme leader').dp();
      ft.msg1('supreme leader').dp();
      ft.msg3('from Mr Liu').dp();
      ft.msg3('from Mr Liu').dp();
      ft.msg3('from Mrs Liu').dp();
      ft.msg2('hello').dp();
      ft.msg2('').dp();
      service.log('>> mock1:', mock1.mock.calls.map(a => a[0]));
      expect(s.logPrefix.startsWith('derived-of-derived')).toBeTruthy();
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
      service.dispose();
    });

    it('inherited reactor and table should recieve messages earlier', () => {
      const mock = jest.fn();
      const derivedSvc = derivedFac.setting({name: 'derived', debug: true}).create();
      const {r, ft, pt} = derivedSvc;
      r('onMsgX', pt.onMsgX.pipe(
        rx.map(([, who]) => mock(who))
      ));
      ft.msgX('').dp();
      const seq = mock.mock.calls.map(m => m[0]);
      console.log(seq);
      expect(seq).toEqual(['deri table', 'deri', 'base table', 'base']);
    });
  });

  describe.skip('corner cases', () => {
    it('2 independent services which is derived from same base factory should not interfere on each other', () => {
      const svc1 = cornerDerivedFac1.create();
      const svc2 = cornerDerivedFac2.create();
      const mock1 = jest.fn();
      const mock2 = jest.fn();
      // res2 is not supposed to be dispatched
      svc1.pt.res2.subscribe(() => mock1());
      svc2.pt.res3.subscribe(() => mock2());
      svc2.ft.msg1('expecting res3').dp();
      expect(mock1.mock.calls.length).toBe(0);
      expect(mock2.mock.calls.length).toBe(1);
      svc1.dispose();
      svc2.dispose();
    });
  });
});
