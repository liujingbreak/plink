import {describe, it, expect, jest}  from '@jest/globals';
// import {formatToConcise} from '@wfh/reactivizer/dist/nodejs-utils';
import * as rx from 'rxjs';
// import {actionRelatedToAction} from '@wfh/reactivizer';
import {createTerminalCanvas} from '../src/plink2/terminal-ui/terminal-canvas';
import {createTextWidget} from '../src/plink2/terminal-ui/terminal-text';

describe('TerminalCanvas', () => {
  it('Single line, printing texts', () => {
    const service = createTerminalCanvas();
    service.config({
      debug: true
      // log(...arg) {
      //   process.stderr.write(formatToConcise(...arg));
      //   process.stderr.write('\n');
      // }
    });
    const {s} = service;
    const mockFn = jest.fn();
    s.ft.setTop(0).dp();
    const root = createTextWidget();
    s.ft.setRootWidget(root.s.ft).dp();
    s.ft.addString(10, 0, 'abc').dp();
    s.ft.addString(15, 0, 'edf').dp();
    s.ft.addString(20, 0, 'hij').dp();
    s.ft.render().od(s.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn(x, text))
    ).subscribe();
    expect(mockFn.mock.calls.length).toBe(3);

    // --- try printing some overlap text
    const mockFn1 = jest.fn();
    s.ft.addString(9, 0, 'xyz').dp();
    s.ft.render().od(s.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn1(x, text))
    ).subscribe();
    expect(mockFn1.mock.calls.length).toBe(3);
    expect(mockFn1.mock.calls[0]).toEqual([9, 'xyzc']);

    // --- try printing some overlap text whose position overlaps the space between exiting texts
    const mockFn2 = jest.fn();
    s.ft.addString(12, 0, '1234567890123').dp();
    s.ft.render().od(s.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn2(x, text))
    ).subscribe();
    expect(mockFn2.mock.calls.length).toBe(1);
    expect(mockFn2.mock.calls[0]).toEqual([9, 'xyz1234567890123']);

    // --- try printing overlap text at the tail of existing text
    s.ft.clearLines(0, 0).dp();
    const mockFn3 = jest.fn();
    s.ft.addString(10, 0, 'abc').dp();
    s.ft.addString(15, 0, 'edf').dp();
    s.ft.addString(20, 0, 'hij').dp();
    s.ft.addString(21, 0, 'XXXX').dp();
    s.ft.render().od(s.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn3(x, text))
    ).subscribe();
    expect(mockFn3.mock.calls.length).toBe(3);
    expect(mockFn3.mock.calls[2]).toEqual([20, 'hXXXX']);

    service.dispose();
  });

  it('Single line, printing full-width characters', () => {
    const service = createTerminalCanvas();
    service.config({debug: true});
    const {s} = service;
    s.ft.setAlwaysRerenderAll(true).dp();
    s.ft.setTop(0).dp();
    const root = createTextWidget();
    s.ft.setRootWidget(root.s.ft).dp();
    // Chinese characters overrides ASCII text
    const mockFn = jest.fn();
    s.ft.addString(10, 0, 'abc').dp();
    s.ft.addString(15, 0, 'edf').dp();
    s.ft.addString(11, 0, '中文').dp();
    s.ft.render().od(s.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn(x, text))
    ).subscribe();
    expect(mockFn.mock.calls.length).toBe(1);
    expect(mockFn.mock.calls[0]).toEqual([10, 'a中文edf']);

    // ASCII text overrides Chinese characters
    const mockFn2 = jest.fn();
    s.ft.addString(12, 0, 'XXXX').dp();
    s.ft.render().od(s.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn2(x, text))
    ).subscribe();
    expect(mockFn2.mock.calls.length).toBe(1);
    expect(mockFn2.mock.calls[0]).toEqual([10, 'a XXXXdf']);

    s.ft.clearLines(0, 0).dp();
    s.ft.addString(10, 0, '中文文字宽度占用长').dp();
    s.ft.addString(11, 0, 'wxyz').dp();
    const mockFn3 = jest.fn();
    s.ft.render().od(s.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn3(x, text))
    ).subscribe();
    expect(mockFn3.mock.calls[0]).toEqual([10, ' wxyz 字宽度占用长']);
    service.dispose();
  });

  it('print text in different style', () => {
    const service = createTerminalCanvas();
    service.config({debug: true});
    const {s} = service;
    s.ft.setTop(0).dp();
    const root = createTextWidget();
    s.ft.setRootWidget(root.s.ft).dp();

    s.ft.addString(0, 0, '上c', ['red', 'strikethrough']).dp();
    s.ft.addString(6, 0, '中g', ['cyan', 'inverse']).dp();
    s.ft.addString(2, 0, '12345').dp();
    // 上c   中g
    //   12345
    // 0123456789
    const mockFn = jest.fn();
    s.ft.render().od(s.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn(x, text))
    ).subscribe();
    // eslint-disable-next-line no-console
    mockFn.mock.calls.forEach(([, text]) => console.log(text));
    expect(mockFn.mock.calls.length).toEqual(3);
    expect(mockFn.mock.calls[2][0]).toEqual(8);
    service.dispose();
  });
});
