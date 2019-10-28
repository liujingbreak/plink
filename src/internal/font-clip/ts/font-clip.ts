/// <reference path="fonteditor-core.d.ts"/>

import {Font, woff2, CreateOpt} from 'fonteditor-core';
import * as iconv from 'iconv-lite';
import fs from 'fs-extra';
import {promisify} from 'util';
import * as Path from 'path';

type WRITEFILE_ARG = Parameters<(typeof fs)['writeFile']>;
const writeFileAsync: (arg: WRITEFILE_ARG[0], arg2: WRITEFILE_ARG[1]) => Promise<void> = promisify(fs.writeFile);
const readFileAsync = promisify<string, Buffer>(fs.readFile);

const TYPES = ['ttf', 'woff', 'woff2', 'eof', 'otf', 'svg'];
export function convert(str: string) {
  const buf = iconv.encode(str, 'utf8');
  return iconv.decode(buf, 'GB2312');
}

/**
 * clip and minimize font file to only contain specific character subset and cnverto woff2
 * @param source source file
 * @param clipChars subset
 */
export async function clipToWoff2(source: string, destDir: string, toFormats: CreateOpt['type'][] = ['woff2'], clipChars?: string | null) {
  if (!source) {
    source = Path.resolve(__dirname, '../example-font/PingFang Regular.ttf');
  }
  const srcType = Path.extname(source).slice(1) as CreateOpt['type'];

  if (!TYPES.includes(srcType)) {
    throw new Error(`Source file suffix must be one of ${TYPES.join(', ')}`);
  }

  const font = Font.create((await readFileAsync(source)), {
    type: srcType,
    subset: clipChars ? clipChars.split('').map(c => c.charCodeAt(0)) : undefined,
    hinting: true,
    compound2simple: true
  });
  // font.optimize();
  // font.compound2simple();
  if (toFormats.includes('woff2'))
    await woff2.init();

  fs.mkdirpSync(destDir);
  return Promise.all(toFormats.map(format => {
    const file = Path.resolve(destDir, Path.basename(source, Path.extname(source)) + '.' + format);
    // tslint:disable-next-line: no-console
    console.log('[font-clip] write', file);
    return writeFileAsync(file,
      font.write({
      type: format,
      hinting: true
    }));
  }));
}

export function example(subset?: string) {
  return Promise.all([
    Path.resolve(__dirname, '../example-font/PingFang Regular.ttf'),
    Path.resolve(__dirname, '../example-font/PingFang Medium.ttf'),
    Path.resolve(__dirname, '../example-font/PingFang Bold.ttf')
  ].map(src => clipToWoff2(src, Path.resolve(Path.dirname(src), 'gen'), ['woff','woff2'], subset)));
}

export function notoSans(subset?: string) {
  return Promise.all([
    Path.resolve(__dirname, '../example-font/NotoSansSC-Black.otf'),
    Path.resolve(__dirname, '../example-font/NotoSansSC-Bold.otf'),
    Path.resolve(__dirname, '../example-font/NotoSansSC-Light.otf'),
    Path.resolve(__dirname, '../example-font/NotoSansSC-Medium.otf'),
    Path.resolve(__dirname, '../example-font/NotoSansSC-Regular.otf'),
    Path.resolve(__dirname, '../example-font/NotoSansSC-Thin.otf')
  ].map(src => clipToWoff2(src, Path.resolve(Path.dirname(src), 'gen'), ['woff','woff2'], subset)));
}

/**
 * https://www.qqxiuzi.cn/zh/hanzi-unicode-bianma.php
 * @param code 
 */
// function isChineseCharCode(code: number) {
//   return code >= 0x4E00 && code <= 0x9FEF || code >= 0x3400 && code <= 0x4DB5;
// }
