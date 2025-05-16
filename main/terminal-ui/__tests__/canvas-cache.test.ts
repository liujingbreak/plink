import {describe, it, expect, jest} from '@jest/globals';
import {canvasCacheFac} from '../src/core/canvas-cache.js';
import {getTextDisplayUnits} from '../src/core/canvas.js';

describe('canvas-cache', () => {
  it('add', () => {
    const service = canvasCacheFac.setting(
      {name: 'cache', debug: true}).create();
    const {s} = service;
    s.ft.add(0, 1, [...getTextDisplayUnits('abc')], []).dp();
    s.ft.add(5, 1, [...getTextDisplayUnits('efg')], []).dp();
    s.ft.add(10, 1, [...getTextDisplayUnits('中文')], []).dp();
    const mock = jest.fn();
    s.ft.fetchLines(true).od(s.pt.didFetchLines).subscribe(([, lines]) => {
      const text = [...lines].join('');
      // eslint-disable-next-line no-console
      console.log(text);
    });
    s.ft.add(1, 1, [...getTextDisplayUnits('1234567890')], []).dp();
    s.ft.fetchLines(true).od(s.pt.didFetchLines).subscribe(([, lines]) => {
      const text = [...lines].join('');
      // eslint-disable-next-line no-console
      console.log(text);
      mock(text);
    });

    expect(mock.mock.calls[0][0]).toBe('\na1234567890 文\n');
  });
  it('clear', () => {
    const service = canvasCacheFac.setting(
      {name: 'cache', debug: true}).create();
    const {s} = service;
    s.ft.add(0, 1, [...getTextDisplayUnits('abc')], []).dp();
    s.ft.add(5, 1, [...getTextDisplayUnits('efg')], []).dp();
    s.ft.add(10, 1, [...getTextDisplayUnits('中文')], []).dp();
    const mock = jest.fn();
    s.ft.clear(1, 1, 3, 1).dp();
    s.ft.fetchLines(true, 'X').od(s.pt.didFetchLines).subscribe(([, lines]) => {
      const text = [...lines].join('');
      // eslint-disable-next-line no-console
      console.log(text);
      mock(text);
    });
    expect(mock.mock.calls[0][0]).toBe('\na  X efg  中文\n');
    const lines = service.table.getData().cache[0]!;
    expect(lines.minimum()?.value.size()).toBe(4);

    s.ft.clear(1, 1, 10, 1).dp();
    s.ft.fetchLines(true, 'Y').od(s.pt.didFetchLines).subscribe(([, lines]) => {
      const text = [...lines].join('');
      // eslint-disable-next-line no-console
      console.log(text);
      mock(text);
    });
    expect(mock.mock.calls[1][0]).toBe('\naYYYY   YY  文\n');
    expect(service.table.getData().cache[0]!.minimum()?.value.size()).toBe(4);

    s.ft.addStr(0, 3, 'abc').dp();
    s.ft.addStr(5, 3, 'efg').dp();
    s.ft.addStr(10, 3, 'hij').dp();
    s.ft.fetchLines(true, 'Y').od(s.pt.didFetchLines).subscribe(([, lines]) => {
      const text = [...lines].join('');
      // eslint-disable-next-line no-console
      console.log(text);
      mock(text);
    });
  });
});
