/* eslint-disable array-bracket-newline */
/* eslint-disable no-console */
// import util from 'node:util';
import * as rx from 'rxjs';
import {describe, it, expect, jest}  from '@jest/globals';
import {ActionDispenser, SimplexReactorOptions} from '../dist/index';
import {formatToConcise} from '../dist/nodejs-utils';
import {SingleActionFactory, RxController2, ReactorComposite2, actionRelatedToActionRelatives, SimplexReactor,
  pairActionToActionStream} from '../dist';
// import inspector from 'inspector';
// inspector.open(9222, '0.0.0.0', true);

const inputTableFor = ['message3', 'message1'] as const;
const stdoutLogger: SimplexReactorOptions<any, any>['log'] = (...msgs) => {
  process.stdout.write(formatToConcise(...msgs));
  process.stdout.write('\n');
};
type TestGroupBy = {
  foobar1(key: string, v: number): SingleActionFactory;
  foobar2(key: string, v: string): SingleActionFactory;
};

describe('reactivizer2', () => {
  describe('RxController2', () => {
    it('Basic RxController2 operations dp, do should work correctly', async () => {
      const composite = new SimplexReactor<TestActions & TestResponse, typeof inputTableFor>({
        name: 'reactorComposite2 #1',
        tableFor: inputTableFor,
        debug: true
      });
      const {s: i, s: o, r} = composite;
      const mockFn = jest.fn();
      r('message1 -> reply1', i.pt.message1.pipe(
        rx.tap(([m]) => {
          mockFn('reply1 recieved');
          o.ft.reply1('hello', 'world').dp(m);
        })
      ));

      r('reply1 -> message2 | reply2 -> ', o.pt.reply1.pipe(
        rx.mergeMap(([m, ...msg]) => {
          mockFn(...msg);
          return i.ft.message2('message2').do(o.pt.reply2, m);
        }),
        rx.tap(([, msg]) => mockFn(msg))
      ));

      r('message2 -> reply2, message3', i.pt.message2.pipe(
        rx.tap(([m, msg]) => {
          mockFn(msg);
          o.ft.reply2('reply2').dp(m);
          i.ft.message3('message3', 'done').dp();
        })
      ));

      // const done = rx.firstValueFrom(i.pt.message3);
      i.ft.message1().dp();

      const [, ...msg3] = await rx.firstValueFrom(composite.table.l.message3);
      expect(mockFn.mock.calls[0]).toEqual(['reply1 recieved']);
      expect(mockFn.mock.calls[1]).toEqual(['hello', 'world']);
      expect(mockFn.mock.calls[2]).toEqual(['message2']);
      expect(mockFn.mock.calls[3]).toEqual(['reply2']);
      expect(msg3).toEqual(['message3', 'done']);
    }, 10000);

    it('Error handling', async () => {
      const composite = new SimplexReactor<TestActions & TestResponse>({
        name: 'reactorComposite2 #2',
        debug: true
      });
      const {s: i, s: o, r} = composite;
      const mockFn = jest.fn();

      r('message1 -> error', i.pt.message1.pipe(
        rx.mergeMap(([m]) => new rx.Observable(fluxSink => {
          fluxSink.error('I am a fake error');
        }).pipe(
          composite.catchErrorFor(m)
        ))
      ));

      const done = rx.firstValueFrom(i.ft.message1().do(o.at.reply1).pipe(
        rx.catchError(err => {
          mockFn(err);
          return rx.of(1);
        })
      ));

      await done;
      expect(mockFn.mock.calls[0][0]).toBe('I am a fake error');
    }, 10000);

    it('control2\'s  do(), ddo(), createDispatcherFor()', async () => {
      const composite = new SimplexReactor<TestActions & TestResponse>({
        name: 'reactorComposite2 #3',
        debug: true
      });

      composite.r('message2', composite.s.pt.message2.pipe(
        rx.tap(([m, greeting]) => composite.s.ft.reply2(greeting).dp(m))
      ));

      const msg = await rx.firstValueFrom(composite.s.ft.message2('hello do()').do(composite.s.pt.reply2));
      expect(msg[1]).toBe('hello do()');
      const msgDdo = await rx.firstValueFrom(composite.s.ft.message2('hello ddo()').od(composite.s.pt.reply2));
      expect(msgDdo[1]).toBe('hello ddo()');

      const mock = jest.fn();
      composite.r('message3', composite.s.pt.message3.pipe(
        rx.tap(([, ...params]) => mock(...params))
      ));
      const dispatcher = composite.s.createDispatchers();
      dispatcher.message3('message3 data', 'data2');

      expect(mock.mock.calls[0]).toEqual(['message3 data', 'data2']);
    }, 10000);

    it('SingleActionFactory.od()', async () => {
      const service = new ReactorComposite2<TestActions, TestResponse>({name: 'case .od()', debug: true});
      const {i, o, r} = service;
      r('message1 -> reply1, reply2, reply4', i.pt.message1.pipe(
        rx.map(([m]) => {
          o.ft.reply1('1').dp(m);
          o.ft.reply2('2').dp(m);
          o.ft.reply4(4).dp(m);
        })
      ));

      const [o4, o2, o1] = i.ft.message1().od(o.pt.reply4, o.pt.reply2, o.pt.reply1);
      const [[, v4], [, v2], [, v1]] = await rx.firstValueFrom(rx.zip(o4, o2, o1));
      expect(v4).toBe(4);
      expect(v2).toBe('2');
      expect(v1).toBe('1');
    });
    it('groupControllerBy, core.actionSubscribed$', () => {
      const s = new RxController2<TestGroupBy>({name: 'test.groupControllerBy', debug: true});

      const jestFn1 = jest.fn();
      const jestFn2 = jest.fn();
      const jestGroupedFn = jest.fn();
      const jestCoreSubFn = jest.fn();

      s.groupControllerBy(act => act.p[0], key => ({name: 'grouped-' + key, debug: true})).pipe(
        rx.mergeMap(([ctl, ctlByKeyMap]) => {
          jestGroupedFn(ctl, ctlByKeyMap);
          ctl.action$.subscribe(v => console.log(v));

          ctl.actionSubscribed$.pipe(
            rx.tap(jestCoreSubFn)
          ).subscribe();

          ctl.actionUnsubscribed$.pipe().subscribe(() => console.log('unsubscribe grouped controller'));

          return rx.merge(
            ctl.pt.foobar1.pipe(
              rx.tap(([, k, v]) => jestFn1(ctl.key, k, v))
            ),
            ctl.pt.foobar2.pipe(
              rx.tap(([, k, v]) => jestFn2(ctl.key, k, v))
            )
          );
        })
      ).subscribe();

      s.ft.foobar1('aaa', 1).dp();
      s.ft.foobar2('aaa', 'x').dp();
      s.ft.foobar1('bbb', 2).dp();
      s.ft.foobar1('aaa', 3).dp();
      s.ft.foobar2('bbb', 'y').dp();
      expect(jestCoreSubFn.mock.calls.length).toBe(2);
      expect(jestGroupedFn.mock.calls.length).toBe(2);
      expect((jestGroupedFn.mock.calls[0][0] as any).key).toBe('aaa');
      expect((jestGroupedFn.mock.calls[1][0] as any).key).toBe('bbb');
      expect((jestGroupedFn.mock.calls[1][1] as Map<string, any>).size).toBe(2);
      expect((jestGroupedFn.mock.calls[1][1] as Map<string, any>).get('aaa')).toBe(jestGroupedFn.mock.calls[0][0]);
      expect((jestGroupedFn.mock.calls[1][1] as Map<string, any>).get('bbb')).toBe(jestGroupedFn.mock.calls[1][0]);

      expect(jestFn1.mock.calls.length).toBe(3);
      expect(jestFn2.mock.calls.length).toBe(2);
      expect(jestFn1.mock.calls[0]).toEqual(['aaa', 'aaa', 1]);
      expect(jestFn2.mock.calls[0]).toEqual(['aaa', 'aaa', 'x']);
      expect(jestFn1.mock.calls[1]).toEqual(['bbb', 'bbb', 2]);
      expect(jestFn1.mock.calls[2]).toEqual(['aaa', 'aaa', 3]);
      expect(jestFn2.mock.calls[1]).toEqual(['bbb', 'bbb', 'y']);
    });
    it('subForTypes', () => {
      const control = new RxController2<TestActions>();
      const sub = control.subForTypes(['message3', 'message4'] as const);
      const mock = jest.fn();
      sub.action$.subscribe(action => mock(action.t));

      control.ft.message1().dp();
      control.ft.message2('2').dp();
      control.ft.message3('a', 'b').dp();
      control.ft.message4('a', 3, true).dp();
      control.ft.message1().dp();

      expect(mock.mock.calls.length).toBe(2);
      expect(mock.mock.calls[0][0]).toEqual('message3');
      expect(mock.mock.calls[1][0]).toEqual('message4');
    });
  });

  describe('operators', () => {
    it('actionRelatedToActionRelatives', () => {
      const service = new ReactorComposite2<TestActions, TestResponse>();
      const {i, o, r} = service;
      r('message1 -> reply1, reply2', i.pt.message1.pipe(
        rx.tap(([m]) => {
          o.ft.reply1('hello', 'world').dp(m);
          o.ft.reply2('world2').dp(m);
        })
      ));

      const mock = jest.fn();
      r('reply1', o.pt.reply1.pipe(
        rx.tap(([, a, b]) => mock('reply1', a, b)),
        rx.mergeMap(([m]) => o.pt.reply2.pipe(
          actionRelatedToActionRelatives(m),
          rx.map(([, msg]) => mock(msg))
        ))
      ));

      o.ft.reply2('yes').dp();
      i.ft.message1().dp();
      console.log(mock.mock.calls);
      expect(mock.mock.calls[1][0]).toBe('world2');
      expect(mock.mock.calls.length).toBe(2);

      service.config({debug: true});
      i.ft.message1().dp();
      expect(mock.mock.calls[3][0]).toBe('world2');
      expect(mock.mock.calls.length).toBe(4);
    });

    it('actionRelatedToActionRelatives in case of mutliple action relatives', () => {
      const service = new ReactorComposite2<TestActions, TestResponse>({debug: true});
      const {i, o, r} = service;
      r('message1 -> reply1, reply2', i.pt.message1.pipe(
        rx.withLatestFrom(i.pt.message2),
        rx.tap(([[m], [m2]]) => {
          o.ft.reply1('hello', 'world').dp(m, m2);
          o.ft.reply2('world2').dp(m, m2);
        })
      ));

      const mock = jest.fn();
      r('reply1', o.pt.reply1.pipe(
        rx.mergeMap(([m]) => o.pt.reply2.pipe(
          actionRelatedToActionRelatives(m),
          rx.map(([, msg]) => mock(msg))
        ))
      ));

      o.ft.reply2('yes').dp();
      i.ft.message2('message2').dp();
      i.ft.message1().dp();
      expect(mock.mock.calls[0][0]).toBe('world2');
      expect(mock.mock.calls.length).toBe(1);
    });

    it('simplexReactor.actionRelatedToAction()', async () => {
      const reactor = new SimplexReactor<TestActions & TestResponse>();
      const {s, r} = reactor;
      const mockFn = jest.fn();
      const mockFnError = jest.fn();
      const done = rx.firstValueFrom(s.pt.reply1.pipe(
        rx.filter(([, msg]) => msg === 'done')
      ));
      r('message1', s.pt.message1.pipe(
        rx.mergeMap(([m]) => {
          return s.pt.reply1.pipe(
            reactor.actionRelatedToAction(m),
            rx.tap(([, msg]) => mockFn(msg)),
            rx.catchError(err => {
              mockFnError(err);
              return rx.EMPTY;
            })
          );
        })
      ));
      r('message1 -> reply1', s.pt.message1.pipe(
        rx.map(([m]) => {
          s.ft.reply1('this is reply1').dp();
          s.ft.reply1('this is reply1 in context').dp(m);
          s.ft.reply1('this is reply1').dp();
          void Promise.resolve().then(() => {
            s.ft.reply1('this is reply1 in context again').dp(m);
            reactor.dispatchErrorFor(new Error('test'), m);
            s.ft.reply1('done').dp();
          });
        })
      ));
      s.ft.message1().dp();
      await done;
      expect(mockFn.mock.calls[0][0]).toBe('this is reply1 in context');
      expect(mockFn.mock.calls.length).toBe(2);
      expect(mockFn.mock.calls[1][0]).toBe('this is reply1 in context again');
      expect(mockFnError.mock.calls.length).toBe(1);
    });

    it('pairActionToActionStream can deal with synchronously recursive actions within a single context', () => {
      const reactor = new SimplexReactor<TestActions & TestResponse>({
        name: 'pairActionToActionStreamTest',
        debug: true,
        log: stdoutLogger
      });
      const {r, s} = reactor;
      r('message1 -> reply1', s.pt.message1.pipe(
        rx.map(([m]) => {
          s.ft.reply1('this is reply1 not within context').dp();
          s.ft.reply1('this is reply1 within context').re(m).dp();
          for (let i = 0; i < 15; i++) {
            s.ft.reply1('this is reply1 not within context again').dp();
          }
        })
      ));
      r('reply1 -> message2', s.pt.reply1.pipe(
        rx.map(([m]) => {
          s.ft.message2('this is message2 not within context').dp();
          s.ft.message2('this is message2 within context').re(m).dp();
          for (let i = 0; i < 5; i++) {
            s.ft.message2('this is message2 not within context again').dp();
          }
        })
      ));
      const mockFn = jest.fn();
      s.ft.message1().od(s.pt.reply1).pipe(
        rx.tap(([, msg]) => mockFn(msg)),
        pairActionToActionStream(s.pt.message2, 6),
        rx.mergeMap(msg2$ => msg2$),
        rx.map(([, msg]) => {mockFn(msg); })
      ).subscribe();
      expect(mockFn.mock.calls.length).toBe(2);
      expect(mockFn.mock.calls[0][0]).toBe('this is reply1 within context');
      expect(mockFn.mock.calls[1][0]).toBe('this is message2 within context');
    });
  });

  describe('simplexReactor', () => {
    it('base actions', async () => {
      const s = new SimplexReactor<TestActions & TestResponse>({
        name: 'test simplex',
        debug: true,
        log: stdoutLogger
      });
      s.s.pt.message2.subscribe(a => console.log(a));
      s.r('test simplexReactor', s.s.pt.message2.pipe(
        rx.map(([m, words]) => {
          console.log('inside reactor');
          s.s.ft.reply2(words + ' recieved').dp(m);
        })
      ));

      const [, reply] = await rx.firstValueFrom(s.s.ft.message2('world').od(s.s.pt.reply2));
      expect(reply).toBe('world recieved');
      s.dispose();
      await new Promise(resolve => setImmediate(resolve));
    }, 9000);
  });
  describe('forkController', () => {
    it('forked controller\'s reactor should recieve message earlier, base controller can recieve action from prependController later', () => {
      const service = new SimplexReactor<TestActions & TestResponse>({
        name: 'prepend',
        debug: true,
        log: stdoutLogger
      });
      const {s, r} = service;
      const mockfn = jest.fn();
      const pre = s.forkController();
      const pre2 = pre.forkController();
      r('base got message1', s.pt.message1.pipe(
        rx.map(() => mockfn('base->base'))
      ));
      r('base got message2', s.pt.message2.pipe(
        rx.map(() => mockfn('pre->base'))
      ));
      r('base got message3', s.pt.message3.pipe(
        rx.map(() => mockfn('pre2->base'))
      ));
      r('pre.message1', pre.pt.message1.pipe(
        rx.map(() => mockfn('base->pre'))
      ));
      r('pre.message2', pre.pt.message2.pipe(
        rx.map(() => mockfn('pre->pre'))
      ));
      r('pre.message3', pre.pt.message3.pipe(
        rx.map(() => mockfn('pre2->pre'))
      ));
      r('pre2.message1', pre2.pt.message1.pipe(
        rx.map(() => mockfn('base->pre2'))
      ));
      r('pre2.message2', pre2.pt.message2.pipe(
        rx.map(() => mockfn('pre->pre2'))
      ));
      r('pre2 got message3', pre2.pt.message3.pipe(
        rx.map(() => mockfn('pre2->pre2'))
      ));
      s.ft.message1().dp();
      pre.ft.message2('').dp();
      pre2.ft.message3('hello', 1).dp();
      expect(mockfn.mock.calls.length).toBe(9);
      expect(mockfn.mock.calls.map(args => args[0])).toEqual([
        'base->pre2', 'base->pre', 'base->base',
        'pre->pre2', 'pre->pre', 'pre->base',
        'pre2->pre2', 'pre2->pre', 'pre2->base',
      ]);
      service.dispose();
    });

    it('both controllers should recieve messages through base\'s interceptors', () => {
      const service = new SimplexReactor<TestActions & TestResponse>({
        name: 'prepend',
        debug: true,
        log: stdoutLogger
      });
      const {s, r} = service;
      // base controller has a interceptor which only allows message2 to go through
      s.prependInterceptor(a$ => {
        return a$.pipe(
          s.ofType('message2')
        );
      });
      const mockfn = jest.fn();
      const pre = s.prependController();
      r('base.message1', s.pt.message1.pipe(
        rx.map(([, by]) => mockfn(by + '-message1->base'))
      ));
      r('base.message2', s.pt.message2.pipe(
        rx.map(([, , by]) => mockfn(by + '-message2->base'))
      ));
      r('pre.message1', pre.pt.message1.pipe(
        rx.map(([, by]) => mockfn(by + '-message1->pre'))
      ));
      r('pre.message2', pre.pt.message2.pipe(
        rx.map(([, , by]) => mockfn(by + '-message2->pre'))
      ));
      s.ft.message1('base').dp();
      s.ft.message2('', 'base').dp();
      pre.ft.message1('pre').dp();
      pre.ft.message2('', 'pre').dp();
      expect(mockfn.mock.calls.length).toBe(4);
      expect(mockfn.mock.calls.map(args => args[0])).toEqual([
        'base-message2->pre', 'base-message2->base', 'pre-message2->pre', 'pre-message2->base'
      ]);
      service.dispose();
    });

    it('appendInterceptorToSrc() only impacts source controllers\' reactor,', () => {
      const service = new SimplexReactor<TestActions & TestResponse>({
        name: 'forked-intercepted',
        debug: true,
        log: stdoutLogger
      });
      const {s, r} = service;
      const mockfn = jest.fn();
      const pre = s.forkController();
      const pre2 = pre.forkController();
      // A later added interceptor will be inserted before prependController in pipe line, which will block action emitted from
      pre2.appendInterceptorToSrc(a$ => {
        const dispenser = ActionDispenser.ofAction$<typeof pre>(a$);
        return rx.merge(
          rx.merge(dispenser.at.message1, dispenser.at.message2).pipe(
            rx.map(a => console.log('action is blocked', a.t)),
            rx.ignoreElements()),
          dispenser.ofOtherTypes()
        );
      });
      r('base got message1', s.pt.message1.pipe(
        rx.map(() => mockfn('base->base'))
      ));
      r('base got message2', s.pt.message2.pipe(
        rx.map(() => mockfn('pre->base'))
      ));
      r('base got message3', s.pt.message3.pipe(
        rx.map(() => mockfn('pre2->base'))
      ));
      r('pre got message1', pre.pt.message1.pipe(
        rx.map(() => mockfn('base->pre'))
      ));
      r('pre got message2', pre.pt.message2.pipe(
        rx.map(() => mockfn('pre->pre'))
      ));
      r('pre got message3', pre.pt.message3.pipe(
        rx.map(() => mockfn('pre2->pre'))
      ));
      r('pre2 got message1', pre2.pt.message1.pipe(
        rx.map(() => mockfn('base->pre2'))
      ));
      r('pre2 got message2', pre2.pt.message2.pipe(
        rx.map(() => mockfn('pre->pre2'))
      ));
      r('pre2 got message3', pre2.pt.message3.pipe(
        rx.map(() => mockfn('pre2->pre2'))
      ));

      s.ft.message1().dp();
      pre.ft.message2('').dp();
      pre2.ft.message3('hello', 1).dp();
      const calls = mockfn.mock.calls.map(args => args[0]);
      console.log('mock called', calls);
      expect(mockfn.mock.calls.length).toBe(5);
      expect(calls).toEqual(['base->pre2', 'pre->pre2', 'pre2->pre2',
        'pre2->pre', 'pre2->base']);
      service.dispose();
    });

    it('preendInterceptor() impacts all controllers including source controllers', () => {
      const service = new SimplexReactor<TestActions & TestResponse>({
        name: 'forked-intercepted',
        debug: true,
        log: stdoutLogger
      });
      const {s, r} = service;
      const mockfn = jest.fn();
      const pre = s.forkController();
      const pre2 = pre.forkController();
      // A later added interceptor will be inserted before prependController in pipe line, which will block action emitted from
      pre2.prependInterceptor(a$ => {
        const dispenser = ActionDispenser.ofAction$<typeof pre>(a$);
        return rx.merge(
          rx.merge(dispenser.at.message1, dispenser.at.message2).pipe(
            rx.map(a => console.log('action is blocked', a.t)),
            rx.ignoreElements()),
          dispenser.ofOtherTypes()
        );
      });
      r('base got message1', s.pt.message1.pipe(
        rx.map(() => mockfn('base->base'))
      ));
      r('base got message2', s.pt.message2.pipe(
        rx.map(() => mockfn('pre->base'))
      ));
      r('base got message3', s.pt.message3.pipe(
        rx.map(() => mockfn('pre2->base'))
      ));
      r('pre got message1', pre.pt.message1.pipe(
        rx.map(() => mockfn('base->pre'))
      ));
      r('pre got message2', pre.pt.message2.pipe(
        rx.map(() => mockfn('pre->pre'))
      ));
      r('pre got message3', pre.pt.message3.pipe(
        rx.map(() => mockfn('pre2->pre'))
      ));
      r('pre2 got message1', pre2.pt.message1.pipe(
        rx.map(() => mockfn('base->pre2'))
      ));
      r('pre2 got message2', pre2.pt.message2.pipe(
        rx.map(() => mockfn('pre->pre2'))
      ));
      r('pre2 got message3', pre2.pt.message3.pipe(
        rx.map(() => mockfn('pre2->pre2'))
      ));

      s.ft.message1().dp();
      pre.ft.message2('').dp();
      pre2.ft.message3('hello', 1).dp();
      const calls = mockfn.mock.calls.map(args => args[0]);
      console.log('mock called', calls);
      expect(mockfn.mock.calls.length).toBe(3);
      expect(calls).toEqual(['pre2->pre2', 'pre2->pre',
        'pre2->base']);
      service.dispose();
    });
  });
});

interface TestActions {
  message1(byWhom?: string): SingleActionFactory;
  message2(greeting: string, byWhom?: string): SingleActionFactory;
  message3<T>(greeting: string, foobar: T): SingleActionFactory;
  message4(a: string, b: number, c: boolean): SingleActionFactory;
}

interface TestResponse {
  reply1(...backMsg: string[]): SingleActionFactory;
  reply2(backMsg: string): SingleActionFactory;
  reply3(backMsg: string): SingleActionFactory;
  reply4(backMsg: number): SingleActionFactory;
}
