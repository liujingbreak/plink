/* eslint-disable no-console */
import {ActionDispenser} from '@wfh/reactivizer';
// import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {describe, it, expect, jest}  from '@jest/globals';
import stripAnsi from 'strip-ansi';
import * as rx from 'rxjs';
// import chalk from 'chalk';
// import {actionRelatedToAction} from '@wfh/reactivizer';
import {createTerminalCanvas, TerminalCanvas} from '../src';

describe('TerminalCanvas', () => {
  it('Single line, printing texts', () => {
    const service = createTerminalCanvas();
    service.config({
      debug: true
    });
    interceptPrint(service);
    const s = service.s.prependController();
    const mockFn = jest.fn();
    s.ft.setBounding(0, 0, 40, 8).dp();
    // const root = createTextWidget();
    // root.config({debug: true});
    // s.ft.setRootWidget(root).dp();
    s.ft.addString(10, 0, 'abc').dp();
    s.ft.addString(15, 0, 'edf').dp();
    s.ft.addString(20, 0, 'hij').dp();
    s.ft.render().od(s.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn(x, text))
    ).subscribe();
    console.log(mockFn.mock.calls);
    expect(mockFn.mock.calls.length).toBe(1);

    // --- try printing some overlap text
    const mockFn1 = jest.fn();
    s.ft.addString(9, 0, 'xyz').dp();
    s.ft.render().od(s.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn1(x, text))
    ).subscribe();
    console.log(mockFn.mock.calls);
    expect(mockFn1.mock.calls.length).toBe(1);
    expect(mockFn1.mock.calls[0]).toEqual([9, 'xyz']);

    // --- try printing some overlap text whose position overlaps the space between exiting texts
    const mockFn2 = jest.fn();
    s.ft.addString(12, 0, '1234567890123').dp();
    s.ft.render().od(s.pt.onPrintText).pipe(
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
    s.ft.render().od(s.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn3(x, text))
    ).subscribe();
    console.log(mockFn3.mock.calls);
    expect(mockFn3.mock.calls.length).toBe(1);
    expect(mockFn3.mock.calls[0]).toEqual([9, ' abc  edf  hXXXX']);

    service.dispose();
  });

  it('Single line, printing full-width characters', () => {
    const service = createTerminalCanvas();
    service.config({debug: true});
    const {s} = service;
    interceptPrint(service);
    const prepended = s.prependController();
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

  it('print text in different style', () => {
    const service = createTerminalCanvas();
    service.config({debug: true});
    const {s} = service;
    interceptPrint(service);
    const prepended = s.prependController();
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
    expect(stripAnsi(mockFn.mock.calls[0][1] as string)).toEqual(stripAnsi('上12345 g'));
    service.dispose();
  });

  it('clearRect() from text lines', () => {
    const service = createTerminalCanvas();
    service.config({debug: true});
    const {s} = service;
    interceptPrint(service);
    const prepended = s.prependController();
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
    expect(mockFn.mock.calls[0][1]).toEqual('ab     gh');
    expect(mockFn.mock.calls[1][1]).toEqual('    ');
    expect(mockFn.mock.calls[2][1]).toEqual('2    ');
    service.dispose();
  });
});

function interceptPrint(service: TerminalCanvas) {
  service.s.interceptor$.next(a$ => {
    const dis = ActionDispenser.ofAction$<typeof service>(a$);
    return rx.merge(
      dis.at.onPrintText.pipe(rx.ignoreElements()),
      dis.ofOtherTypes()
    );
  });
}
