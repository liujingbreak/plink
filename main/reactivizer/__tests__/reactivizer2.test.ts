/* eslint-disable no-console */
// import util from 'node:util';
import * as rx from 'rxjs';
import {describe, it, expect, jest}  from '@jest/globals';
import {SingleActionFactory, ReactorComposite2, actionRelatedToActionRelatives, SimplexReactor, pairActionToActionStream} from '../src';
// import inspector from 'inspector';
// inspector.open(9222, '0.0.0.0', true);

const inputTableFor = ['message3', 'message1'] as const;

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
          return i.ft.message2('message2').do(o.at.reply2, m);
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

    it('pairActionToActionStream can deal with synchronously recursive actions within a single context', () => {
      const reactor = new SimplexReactor<TestActions & TestResponse>({name: 'pairActionToActionStreamTest', debug: true});
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
        debug: true
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
});

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
