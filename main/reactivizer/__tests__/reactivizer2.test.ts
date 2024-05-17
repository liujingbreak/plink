import * as rx from 'rxjs';
import {describe, it, expect, jest}  from '@jest/globals';
import {SingleActionFactory, ReactorComposite2, actionRelatedToActionRelatives} from '../dist';
// import inspector from 'inspector';
// inspector.open(9222, '0.0.0.0', true);

const inputTableFor = ['message3'] as const;

describe('reactivizer2', () => {
  it('Basic RxController2 operations dp, do should work correctly', async () => {
    const composite = new ReactorComposite2<BaseActions, BaseResponse, typeof inputTableFor>({
      name: 'reactorComposite2 #1',
      inputTableFor,
      debug: true
    });
    const {i, o, r} = composite;
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

    const [, ...msg3] = await rx.firstValueFrom(composite.inputTable.l.message3);
    expect(mockFn.mock.calls[0]).toEqual(['reply1 recieved']);
    expect(mockFn.mock.calls[1]).toEqual(['hello', 'world']);
    expect(mockFn.mock.calls[2]).toEqual(['message2']);
    expect(mockFn.mock.calls[3]).toEqual(['reply2']);
    expect(msg3).toEqual(['message3', 'done']);
  }, 10000);

  it('Error handling', async () => {
    const composite = new ReactorComposite2<BaseActions, BaseResponse>({
      name: 'reactorComposite2 #2',
      debug: true
    });
    const {i, o, r} = composite;
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
    const composite = new ReactorComposite2<BaseActions, BaseResponse>({
      name: 'reactorComposite2 #3',
      debug: true
    });

    composite.r('message2', composite.i.pt.message2.pipe(
      rx.tap(([m, greeting]) => composite.o.ft.reply2(greeting).dp(m))
    ));

    const msg = await rx.firstValueFrom(composite.i.ft.message2('hello do()').do(composite.o.pt.reply2));
    expect(msg[1]).toBe('hello do()');
    const msgDdo = await rx.firstValueFrom(composite.i.ft.message2('hello ddo()').ddo(composite.o.pt.reply2));
    expect(msgDdo[1]).toBe('hello ddo()');

    const mock = jest.fn();
    composite.r('message3', composite.i.pt.message3.pipe(
      rx.tap(([, ...params]) => mock(...params))
    ));
    const dispatcher = composite.i.createDispatchers();
    dispatcher.message3('message3 data', 'data2');

    expect(mock.mock.calls[0]).toEqual(['message3 data', 'data2']);
  }, 10000);

  it('actionRelatedToActionRelatives', () => {
    const service = new ReactorComposite2<BaseActions, BaseResponse>();
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
    const service = new ReactorComposite2<BaseActions, BaseResponse>({debug: true});
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
});

interface BaseActions {
  message1(): SingleActionFactory;
  message2(greeting: string): SingleActionFactory;
  message3<T>(greeting: string, foobar: T): SingleActionFactory;
}

interface BaseResponse {
  reply1(...backMsg: string[]): SingleActionFactory;
  reply2(backMsg: string): SingleActionFactory;
  reply3(backMsg: string): SingleActionFactory;
}

// interface MoreActions extends BaseActions {
//   message4(): SingleActionFactory;
// }

// function testAcceptExtendedComposite<R extends ReactorComposite2<BaseActions, BaseResponse>['i']>(r: R) {
//   return r;
// }

// testAcceptExtendedComposite(new ReactorComposite2<MoreActions, BaseResponse>().i);
