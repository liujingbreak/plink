/* eslint-disable no-console */
import {describe, it, expect, jest}  from '@jest/globals';
import * as rx from 'rxjs';
import {formatToConcise} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTextWidget} from '../src';
import {createWordSplitter} from '../src/text-split';

describe('word splitter', () => {
  it('lexer', () => {
    const service = createWordSplitter();
    service.config({
      debug: true,
      log(...args) {
        process.stderr.write(formatToConcise(...args));
        process.stderr.write('\n');
      }
    });
    const {s} = service;
    const fn = jest.fn();
    s.ft.setTextToSplit('hello ([world])\n\t中文foobar').od(s.pt.onWordRecorded).pipe(
      rx.mergeMap(([, record]) => record.pipe(
        rx.map(([word, type, len]) => fn(String.fromCodePoint(...word), type, len))
      ))
    ).subscribe();
    console.log(fn.mock.calls);
    expect(fn.mock.calls).toEqual([
      ['hello', 'a', 5 ],
      [' ', 's', 1 ],
      ['(', 'o', 1 ],
      ['[', 'o', 1 ],
      ['world', 'a', 5 ],
      [']', 'o', 1 ],
      [')', 'o', 1 ],
      ['\n', 'n', 1 ],
      ['\t', 't', 2 ],
      ['中', 'f', 2 ],
      ['文', 'f', 2 ],
      ['foobar', 'a', 6 ]
    ]);

    const fn2 = jest.fn();
    s.ft.setTextToSplit('abcdefg 12345,hello.world\nASDFqwertyuiop 中文来了').od(s.pt.onWordRecorded).pipe(
      rx.mergeMap(([, record]) => record),
      rx.map(([word]) => fn2(String.fromCodePoint(...word)))
    ).subscribe();
    console.log(fn2.mock.calls);
    expect(fn2.mock.calls).toEqual([
      [ 'abcdefg' ],
      [ ' ' ],
      [ '12345' ],
      [ ',' ],
      [ 'hello' ],
      [ '.' ],
      [ 'world' ],
      [ '\n' ],
      [ 'ASDFqwertyuiop' ],
      [ ' ' ],
      [ '中' ],
      [ '文' ],
      [ '来' ],
      [ '了' ]
    ]);

    service.dispose();
  });

  it('split text of single character', () => {
    const service = createWordSplitter({debug: false});
    const {s} = service;
    const fn = jest.fn();
    s.ft.setTextToSplit('8').od(s.pt.onWordRecorded).pipe(
      rx.mergeMap(([, record]) => record.pipe(
        rx.map(([word, type, len]) => fn(String.fromCodePoint(...word), type, len))
      ))
    ).subscribe();

    s.ft.setTextToSplit('82').od(s.pt.onWordRecorded).pipe(
      rx.mergeMap(([, record]) => record.pipe(
        rx.map(([word, type, len]) => fn(String.fromCodePoint(...word), type, len))
      ))
    ).subscribe();
    console.log(fn.mock.calls);
    service.dispose();
  });

  it('TextWidget.querySizeOf', () => {
    const service = createTextWidget();
    service.config({
      debug: true
    });
    const {s} = service;
    const fn = jest.fn();
    const fn0 = jest.fn();
    s.ft.setContent('abcdefg 12345,hello.world\nASDFqwertyuiop9 x中文来了中文').dp();
    s.pt.onDisplayLinesForWidth.subscribe(([, , lines]) => {
      fn(lines ? lines.map(line => String.fromCodePoint(...line)) : null);
    });
    s.ft.querySizeOf(8, null).do(s.pt.prefHeightFor).pipe(
      rx.map(([, , h]) => {
        fn0(h);
      })
    ).subscribe();
    console.log(fn.mock.calls);
    expect(fn.mock.calls[0][0]).toEqual([
      'abcdefg ',
      '12345,',
      'hello.',
      'world',
      'ASDFqwe-',
      'rtyuiop9',
      'x中文来',
      '了中文'
    ]);
    expect(fn0.mock.calls[0][0]).toEqual((fn.mock.calls[0][0] as string[]).length);
    service.dispose();
  });

  it('TextWidget.setSize', () => {
    const service = createTextWidget();
    service.config({
      debug: true
    });
    const {s} = service;
    const fn = jest.fn();
    s.pt.onDisplayLines.subscribe(([, lines]) => fn(lines.map(line => String.fromCodePoint(...line))));
    s.ft.setContent('abcdefg 12345,hello.world\nASDFqwertyuiop9 x中文来了中文').dp();
    s.ft.onSize(8, 10).dp();
    console.log(fn.mock.calls);
    expect(fn.mock.calls[1][0]).toEqual([
      'abcdefg ',
      '12345,',
      'hello.',
      'world',
      'ASDFqwe-',
      'rtyuiop9',
      'x中文来',
      '了中文'
    ]);
    expect(service.table.getData().overflow[0]).toBe(false);

    s.ft.onSize(6, 8).dp();
    expect(service.table.getData().overflow[0]).toBe(true);
    console.log(fn.mock.calls[2][0]);
    expect(fn.mock.calls[2][0]).toEqual([
      'abcde-', 'fg ',
      '12345,', 'hello.',
      'world',  'ASDFq-',
      'werty-', 'uiop9 ',
      'x中文',  '来了中',
      '文'
    ]);
    service.dispose();
  });
});
