/* eslint-disable no-console */
import {ActionDispenser} from '@wfh/reactivizer';
// import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {describe, it, expect, jest}  from '@jest/globals';
import stripAnsi from 'strip-ansi';
import * as rx from 'rxjs';
// import chalk from 'chalk';
// import {actionRelatedToAction} from '@wfh/reactivizer';
import {createTerminalCanvas, TerminalCanvas, debugLineTrees} from '../src';

describe('TerminalCanvas', () => {
  it.skip('Single line, printing texts', () => {
    const service = createTerminalCanvas();
    service.config({
      debug: true,
      debugExcludeTypes: ['internalCache']
    });
    const {s} = service;
    // s.ft.setRootComponent(createFlexContainer()).dp();
    const p = s.forkController();
    service.s.appendInterceptor(a$ => {
      const dis = ActionDispenser.ofAction$<typeof service>(a$);
      return rx.merge(
        dis.at.onPrintText.pipe(rx.ignoreElements()),
        dis.ofOtherTypes()
      );
    });
    const mockFn = jest.fn();
    s.ft.setBounding(0, 0, 40, 9).dp();
    s.ft.addString(10, 0, 'abc').dp();
    s.ft.addString(15, 0, 'edf').dp();
    s.ft.addString(20, 0, 'hij').dp();
    s.ft.render().od(p.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn(x, text))
    ).subscribe();
    console.log(mockFn.mock.calls);
    expect(mockFn.mock.calls.length).toBe(3);

    // --- try printing some overlap text
    const mockFn1 = jest.fn();
    s.ft.addString(9, 0, 'xyz').dp();
    s.ft.render().od(p.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn1(x, text))
    ).subscribe();
    console.log(mockFn.mock.calls);
    expect(mockFn1.mock.calls.length).toBe(1);
    expect(mockFn1.mock.calls[0]).toEqual([9, 'xyz']);

    // --- try printing some overlap text whose position overlaps the space between exiting texts
    const mockFn2 = jest.fn();
    s.ft.addString(12, 0, '1234567890123').dp();
    s.ft.render().od(p.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn2(x, text))
    ).subscribe();
    expect(mockFn2.mock.calls.length).toBe(1);
    expect(mockFn2.mock.calls[0]).toEqual([12, '1234567890123']);

    // // --- try printing overlap text at the tail of existing text
    s.ft.clearRect(0, 0, 30, 1).dp();
    const mockFn3 = jest.fn();
    s.ft.addString(10, 0, 'abc').dp();
    s.ft.addString(15, 0, 'edf').dp();
    s.ft.addString(20, 0, 'hij').dp();
    s.ft.addString(21, 0, 'XXXX').dp();
    s.ft.render().od(p.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn3(x, text))
    ).subscribe();
    console.log(mockFn3.mock.calls);
    expect(mockFn3.mock.calls.length).toBe(1);
    expect(mockFn3.mock.calls[0]).toEqual([9, ' abc  edf  hXXXX']);

    service.dispose();
  });

  it.skip('Single line, printing full-width characters', () => {
    const service = createTerminalCanvas();
    service.config({debug: true, debugExcludeTypes: ['internalCache']});
    const {s} = service;
    const prepended = s.forkController();
    interceptPrint(service);
    s.ft.setBounding(0, 0, 120, 20).dp();
    // Chinese characters overrides ASCII text
    const mockFn = jest.fn();
    s.ft.addString(10, 0, 'abc').dp();
    s.ft.addString(15, 0, 'edf').dp();
    s.ft.addString(11, 0, '中文').dp();
    s.ft.render().od(prepended.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn(x, text))
    ).subscribe();
    expect(mockFn.mock.calls.length).toBe(1);
    expect(mockFn.mock.calls[0]).toEqual([10, 'a中文edf']);

    // ASCII text overrides Chinese characters
    const mockFn2 = jest.fn();
    s.ft.addString(12, 0, 'XXXX').dp();
    s.ft.render().od(prepended.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn2(x, text))
    ).subscribe();
    expect(mockFn2.mock.calls.length).toBe(1);
    expect(mockFn2.mock.calls[0]).toEqual([12, 'XXXX']);

    s.ft.onClearLine(0, 0).dp();
    s.ft.addString(10, 0, '中文文字宽度占用长').dp();
    s.ft.addString(11, 0, 'wxyz').dp();
    const mockFn3 = jest.fn();
    s.ft.render().od(prepended.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn3(x, text))
    ).subscribe();
    expect(mockFn3.mock.calls[0]).toEqual([10, ' wxyz 字宽度占用长']);
    service.dispose();
  });

  it.skip('print text in different style', () => {
    const service = createTerminalCanvas();
    service.config({debug: true, debugExcludeTypes: ['internalCache']});
    const {s} = service;
    const prepended = s.forkController();
    interceptPrint(service);
    s.ft.setBounding(0, 0, 300, 50).dp();

    s.ft.addString(0, 0, '上c', ['red', 'strikethrough']).dp();
    s.ft.addString(6, 0, '中g', ['cyan', 'inverse']).dp();
    s.ft.addString(2, 0, '12345').dp();
    // 上c   中g
    //   12345
    // 0123456789
    const mockFn = jest.fn();
    s.ft.render().od(prepended.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn(x, text))
    ).subscribe();
    // eslint-disable-next-line no-console
    mockFn.mock.calls.forEach(([, text]) => console.log(text));
    expect(mockFn.mock.calls.length).toEqual(1);
    expect(stripAnsi(mockFn.mock.calls[0][1] as string))
      .toEqual('上12345 g');
    service.dispose();
  });

  it.skip('clearRect()', () => {
    const service = createTerminalCanvas();
    service.config({debug: true, debugExcludeTypes: ['internalCache']});
    const {s} = service;
    const prepended = s.forkController();
    interceptPrint(service);
    s.ft.setBounding(0, 0, 200, 80).dp();
    s.ft.addString(0, 0, 'ab上', ['red', 'strikethrough']).dp();
    s.ft.addString(6, 0, '中gh', ['cyan', 'inverse']).dp();
    s.ft.addString(3, 1, '3456').dp();
    s.ft.addString(2, 2, '23456').dp();
    // ab上  中gh
    //    3456
    //   23456
    // 0123456789
    s.ft.clearRect(3, 0, 4, 5).dp();

    const mockFn = jest.fn();
    s.ft.render().od(prepended.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn(x, stripAnsi(text)))
    ).subscribe();
    // eslint-disable-next-line no-console
    mockFn.mock.calls.forEach(([, text]) => console.log(text));
    expect(mockFn.mock.calls.length).toEqual(3);
    expect(mockFn.mock.calls[0]).toEqual([0, 'ab']);
    expect(mockFn.mock.calls[1]).toEqual([8, 'gh']);
    expect(mockFn.mock.calls[2]).toEqual([2, '2']);
    service.dispose();
  });
  it('clearRect() after rendered', () => {
    const service = createTerminalCanvas();
    service.config({debug: true, debugExcludeTypes: ['internalCache']});
    const {s, table} = service;
    const prepended = s.forkController();
    interceptPrint(service);
    s.ft.setBounding(0, 0, 200, 80).dp();
    s.ft.addString(0, 0, 'ab上', ['red', 'strikethrough']).dp();
    s.ft.addString(6, 0, '中gh', ['cyan', 'inverse']).dp();
    s.ft.addString(3, 1, '3456').dp();
    s.ft.addString(2, 2, '23456').dp();
    // ab上  中gh
    //    3456
    //   23456
    // 0123456789
    s.ft.render().dp();
    let [lines, proLines, uncommited] = table.getData().internalCache;
    console.log('uncommited', debugLineTrees(uncommited!));
    console.log('lines', debugLineTrees(lines!));
    console.log('proLines', debugLineTrees(proLines!));

    s.ft.clearRect(3, 0, 4, 5).dp();

    [lines, proLines, uncommited] = table.getData().internalCache;
    console.log('2 uncommited', debugLineTrees(uncommited!));
    console.log('2 lines', debugLineTrees(lines!));
    console.log('2 proLines', debugLineTrees(proLines!));
    const mockFn = jest.fn();
    s.ft.render().od(prepended.pt.onPrintText).pipe(
      rx.map(([, x, y, text]) => mockFn(x, y, stripAnsi(text)))
    ).subscribe();
    // eslint-disable-next-line no-console
    expect(mockFn.mock.calls.length).toEqual(4);
    expect(mockFn.mock.calls[0]).toEqual([2, 0, '  ']);
    expect(mockFn.mock.calls[1]).toEqual([6, 0, '  ']);
    expect(mockFn.mock.calls[2]).toEqual([3, 1, '    ']);
    expect(mockFn.mock.calls[3]).toEqual([3, 2, '    ']);

    s.ft.addString(0, 0, 'ab上  中gh').dp();
    s.ft.render().od(prepended.pt.onPrintText).pipe(
      rx.map(([, x, y, text]) => mockFn(x, y, stripAnsi(text)))
    ).subscribe();
    expect(mockFn.mock.calls[4]).toEqual([0, 0, 'ab上  中gh']);
    service.dispose();
  });
  it('clearRect() after rendered and addString', () => {
    const service = createTerminalCanvas();
    service.config({debug: true, debugIncludeTypes: ['render', 'onPrintText', 'clearRect']});
    const {s, table} = service;
    const prepended = s.forkController();
    interceptPrint(service);
    s.ft.setBounding(0, 0, 200, 80).dp();
    s.ft.addString(0, 0, 'ab上', ['red', 'strikethrough']).dp();
    s.ft.addString(6, 0, '中gh', ['cyan', 'inverse']).dp();
    s.ft.addString(3, 1, '3456').dp();
    s.ft.addString(2, 2, '23456').dp();
    // ab上  中gh
    //    3456
    //   23456
    //  覆盖
    // 0123456789
    s.ft.render().dp();
    s.ft.addString(1, 0, '覆盖').dp();
    let [lines, proLines, uncommited] = table.getData().internalCache;
    console.log('uncommited', debugLineTrees(uncommited!));
    console.log('lines', debugLineTrees(lines!));
    console.log('proLines', debugLineTrees(proLines!));

    s.ft.clearRect(3, 0, 4, 5).dp();

    [lines, proLines, uncommited] = table.getData().internalCache;
    console.log('after uncommited', debugLineTrees(uncommited!));
    console.log('after lines', debugLineTrees(lines!));
    console.log('after proLines', debugLineTrees(proLines!));

    const mockFn = jest.fn();
    s.ft.render().od(prepended.pt.onPrintText).pipe(
      rx.map(([, x, y, text]) => mockFn(x, y, stripAnsi(text)))
    ).subscribe();
    // eslint-disable-next-line no-console
    expect(mockFn.mock.calls.length).toEqual(4);
    expect(mockFn.mock.calls[0]).toEqual([1, 0, '覆 ']);
    expect(mockFn.mock.calls[1]).toEqual([6, 0, '  ']);
    expect(mockFn.mock.calls[2]).toEqual([3, 1, '    ']);
    expect(mockFn.mock.calls[3]).toEqual([3, 2, '    ']);
    service.dispose();
  });
});

function interceptPrint(service: TerminalCanvas) {
  service.s.appendInterceptor(a$ => {
    const dis = ActionDispenser.ofAction$<typeof service>(a$);
    return rx.merge(
      dis.at.onPrintText.pipe(rx.ignoreElements()),
      dis.ofOtherTypes()
    );
  });
}
