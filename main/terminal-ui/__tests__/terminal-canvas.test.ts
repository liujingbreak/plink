/* eslint-disable no-console */
// import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {describe, it, expect, jest}  from '@jest/globals';
import stripAnsi from 'strip-ansi';
import * as rx from 'rxjs';
// import chalk from 'chalk';
import {BaseReactorFactory, actionRelatedToAction} from '@wfh/reactivizer';
import {canvasFac, TerminalCanvasOptions, debugLineTrees, getTextDisplayUnits,
  CanvasFilterInput, CanvasFilterOutput} from '../src';

describe('TerminalCanvas', () => {
  it.skip('Single line, printing texts', () => {
    const service = testCanvasFac.create();
    service.config({
      debug: true,
      debugExcludeTypes: ['internalCache']
    });
    const {s} = service;
    // s.ft.setRootComponent(createFlexContainer()).dp();
    const mockFn = jest.fn();
    s.ft.setBounding(0, 0, 40, 9).dp();
    s.ft.addString(10, 0, 'abc').dp();
    s.ft.addString(15, 0, 'edf').dp();
    s.ft.addString(20, 0, 'hij').dp();
    s.ft.render().od(s.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn(x, text))
    ).subscribe();
    console.log(mockFn.mock.calls);
    expect(mockFn.mock.calls.length).toBe(3);

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

  it.skip('Single line, printing full-width characters', () => {
    const service = testCanvasFac.create();
    service.config({debug: true, debugExcludeTypes: ['internalCache']});
    const {s} = service;
    s.ft.setBounding(0, 0, 120, 20).dp();
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
    expect(mockFn2.mock.calls[0]).toEqual([12, 'XXXX']);

    s.ft.onClearLine(0, 0).dp();
    s.ft.addString(10, 0, '中文文字宽度占用长').dp();
    s.ft.addString(11, 0, 'wxyz').dp();
    const mockFn3 = jest.fn();
    s.ft.render().od(s.pt.onPrintText).pipe(
      rx.map(([, x, , text]) => mockFn3(x, text))
    ).subscribe();
    expect(mockFn3.mock.calls[0]).toEqual([10, ' wxyz 字宽度占用长']);
    service.dispose();
  });

  it.skip('print text in different style', () => {
    const service = testCanvasFac.create();
    service.config({debug: true, debugExcludeTypes: ['internalCache']});
    const {s} = service;
    s.ft.setBounding(0, 0, 300, 50).dp();

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
    expect(mockFn.mock.calls.length).toEqual(1);
    expect(stripAnsi(mockFn.mock.calls[0][1] as string))
      .toEqual('上12345 g');
    service.dispose();
  });

  it.skip('clearRect()', () => {
    const service = testCanvasFac.create();
    service.config({debug: true, debugExcludeTypes: ['internalCache']});
    const {s} = service;
    s.ft.setBounding(0, 0, 8, 20).dp();
    s.ft.addString(0, 0, 'ab上', ['red', 'strikethrough']).dp();
    s.ft.addString(6, 0, '中gh', ['cyan', 'inverse']).dp();
    s.ft.addString(3, 1, '3456').dp();
    s.ft.addString(2, 2, '23456').dp();
    // ab上  中gh
    //    3456
    //   23456
    // ++++++++++
    // 0123456789
    s.ft.clearRect(3, 0, 4, 5).dp();

    const mockFn = jest.fn();
    s.ft.render().od(s.pt.onPrintText).pipe(
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
  it.skip('clearRect() after rendered', () => {
    const service = testCanvasFac.create();
    service.config({debug: true, debugExcludeTypes: ['internalCache']});
    const {s, table} = service;
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
    s.ft.render().od(s.pt.onPrintText).pipe(
      rx.map(([, x, y, text]) => mockFn(x, y, stripAnsi(text)))
    ).subscribe();
    // eslint-disable-next-line no-console
    expect(mockFn.mock.calls.length).toEqual(4);
    expect(mockFn.mock.calls[0]).toEqual([2, 0, '  ']);
    expect(mockFn.mock.calls[1]).toEqual([6, 0, '  ']);
    expect(mockFn.mock.calls[2]).toEqual([3, 1, '    ']);
    expect(mockFn.mock.calls[3]).toEqual([3, 2, '    ']);

    s.ft.addString(0, 0, 'ab上  中gh').dp();
    s.ft.render().od(s.pt.onPrintText).pipe(
      rx.map(([, x, y, text]) => mockFn(x, y, stripAnsi(text)))
    ).subscribe();
    expect(mockFn.mock.calls[4]).toEqual([0, 0, 'ab上  中gh']);
    service.dispose();
  });
  it.skip('clearRect() after rendered and addString', () => {
    const service = testCanvasFac.create();
    service.config({debug: true, debugIncludeTypes: ['render', 'onPrintText', 'clearRect']});
    const {s, table} = service;
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
    s.ft.render().od(s.pt.onPrintText).pipe(
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
  it.skip('rendering filter', async () => {
    const service = testCanvasFac.create({
      debug: true,
      debugExcludeTypes: ['internalCache', 'onClearLine']});
    const mock = jest.fn();
    const {s, table} = service;
    s.ft.setBounding(0, 0, 20, 10).dp();

    const filterFac = new BaseReactorFactory<CanvasFilterInput & CanvasFilterOutput>({
      name: 'canvasFilter',
      debug: true
    });
    const filter1 = filterFac.create();
    filter1.r('onRenderForFilter', filter1.s.pt.onRenderForFilter.pipe(
      rx.map(([, x, y, units, style]) => mock(x, y, units, style))
    ));
    const filter2 = filterFac.create();

    s.ft.addRenderFilter([2, 1, 3, 2], filter1).dp();
    s.ft.addRenderFilter([8, 1, 3, 2], filter2).dp();

    for (let y = 0; y < 4; y++) {
      s.ft.addString(0, y, '0123456789').dp();
    }

    const [, , uncommited] = table.getData().internalCache;
    console.log('>> uncommited', uncommited?.length);
    s.pt.onPrintText.pipe(
      rx.map(([, x, y, text]) => console.log('++', x, y, stripAnsi(text)))
    ).subscribe();
    const [, lines] = await rx.firstValueFrom(s.ft.takeSnapshot().od(s.pt.didTakeSnapshot).pipe(
      rx.take(1)
    ));
    s.ft.render().dp();
    expect(mock.mock.calls.length).toEqual(2);
    expect(mock.mock.calls[0].slice(0, 3)).toEqual([2, 1, [...getTextDisplayUnits('234')]]);
    expect(mock.mock.calls[1].slice(0, 3)).toEqual([2, 2, [...getTextDisplayUnits('234')]]);
    expect([...lines].join('')).toEqual(
      '0123456789\n' +
      '01   567\n' +
      '01   567\n' +
      '0123456789\n');
    service.dispose();
  });
  it('rendering filter2', async () => {
    const service = testCanvasFac.create({
      debug: true,
      debugExcludeTypes: ['internalCache', 'onClearLine', 'addRenderFilter']});
    const {s} = service;
    s.ft.setBounding(0, 0, 20, 20).dp();
    s.ft.addString(1, 1, 'A').dp();
    s.ft.addString(1, 2, 'B').dp();
    s.ft.addString(1, 3, 'C').dp();
    s.ft.addString(1, 4, 'D').dp();
    s.ft.addString(4, 1, '4567890').dp();
    s.ft.addString(4, 2, '4567890').dp();
    s.ft.addString(4, 3, '4567890').dp();
    s.ft.addString(4, 4, '4567890').dp();
    s.ft.takeSnapshot().od(s.pt.didTakeSnapshot).pipe(
      rx.take(1),
      rx.map(([, lines]) => {
        console.log('prolines before filter\n', [...lines].join(''));
      })
    ).subscribe();
    const filterFac = new BaseReactorFactory<CanvasFilterInput & CanvasFilterOutput>({
      name: 'canvasFilter',
      debug: true
    });
    const filter1 = filterFac.create();
    const X = 'X'.codePointAt(0)!;
    filter1.r('onRenderForFilter', filter1.s.pt.onRenderForFilter.pipe(
      rx.map(([m, x, y, units, style]) => {
        s.ft.addDisplayUnits(x, y, units.map(u => u === 32 ? X : u), style, true).dp(m);
      })
    ));
    s.ft.addRenderFilter([0, 0, 10, 6], filter1).dp();
    const snapshot = await rx.firstValueFrom(
      s.ft.takeSnapshot().od(s.pt.didTakeSnapshot).pipe(
        rx.take(1),
        rx.map(([, lines]) => {
          return [...lines].join('');
        })
      ));
    console.log(snapshot);
    expect(snapshot).toBe(
      `XXXXXXXXXX
       XAXX4567890
       XBXX4567890
       XCXX4567890
       XDXX4567890
       XXXXXXXXXX\n`.replace(/^\s+/mg, ''));
    service.dispose();
  });
  it.skip('clearRect with filter', async () => {
    const service = testCanvasFac.create({
      debug: true,
      debugExcludeTypes: ['internalCache', 'onClearLine']});
    const mock = jest.fn();
    const {s} = service;
    s.ft.setBounding(0, 0, 20, 10).dp();
    s.ft.addString(0, 0, 'A1234567890').dp();
    s.ft.addString(0, 1, 'B1234567890').dp();
    s.ft.addString(0, 2, 'C1234567890').dp();
    s.ft.addString(0, 3, 'D1234567890').dp();
    const filterFac = new BaseReactorFactory<CanvasFilterInput & CanvasFilterOutput>({
      name: 'canvasFilter',
      debug: true
    });
    const filter = filterFac.create();
    const filterId = s.ft.addRenderFilter([2, 0, 5, 3], filter).dp();

    filter.r('onClearForFilter', filter.s.pt.onClearForFilter.pipe(
      actionRelatedToAction(filterId),
      rx.map(([m, x, y, w]) => {
        filter.s.ft.allowClear(false).dp(m);
        mock(x, y, w);
      })
    ));

    s.ft.clearRect(4, 1, 5, 2).dp();

    const [, lines] = await rx.firstValueFrom(
      s.ft.takeSnapshot()
        .od(s.pt.didTakeSnapshot));
    const str = [...lines].join('');
    expect(mock.mock.calls.length).toBe(2);
    console.log(str);
    expect(mock.mock.calls[0]).toEqual([4, 1, 3]);
    expect(mock.mock.calls[1]).toEqual([4, 2, 3]);
    expect(str).toEqual(
      'A1234567890\n' +
      'B123456  90\n' +
      'C123456  90\n' +
      'D1234567890\n'
    );
    s.ft.clearRect(0, 0, 11, 4).dp();
    const [, lines2] = await rx.firstValueFrom(
      s.ft.takeSnapshot()
        .od(s.pt.didTakeSnapshot));
    const str2 = [...lines2].join('');
    console.log(str2);
    expect(str2).toEqual(
      '  23456\n' +
      '  23456\n' +
      '  23456\n' +
      '\n');
  });
});

const testCanvasFac = canvasFac.forExtend()
  .interceptorForBaseByType(dis => rx.merge(
    dis.at.onPrintText.pipe(
      rx.map(({p: [x, y, text]}) => console.log('onPrintText', x, y, text)),
      rx.ignoreElements()
    ),
    dis.at.onClearLine.pipe(rx.ignoreElements()),
    dis.ofOtherTypes()
  )).defineReactor((init, opts?: TerminalCanvasOptions) => {
    init(opts);
  });
