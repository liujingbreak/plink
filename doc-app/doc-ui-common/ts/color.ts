/* tslint:disable no-console */
import Color from 'color';
import util from 'util';
import chalk from 'chalk';
// import * as _ from 'lodash';

export function* colorInfo(colorStrs: string[]) {
  for (const colorStr of colorStrs) {
    const col = new Color(colorStr);
    const chalker = chalkForColor(col);
    yield chalker(` ${colorStr} `) + ': ' + chalker(util.inspect({
      luminosity: col.luminosity(),
      hue: col.hue(),
      saturationl: col.saturationl(),
      lightness: col.lightness(),
      isLight: col.isLight(),
      isDark: col.isDark(),
      alpha: col.alpha(),
      gray: col.gray(),
      white: col.white(),
      grayscale: col.grayscale().toString(),
      hex: col.hex(),
      rgb: col.rgb(),
      hsl: col.hsl(),
      hsv: col.hsv(),
      ansi256: col.ansi256(),
      ansi16: col.ansi16(),
      cmyk: col.cmyk(),
      apple:col.apple()
    }));
  }
}

export function colorContrast(...[cols1, cols2]: [col1: string, col2: string]) {
  const col1 = new Color(cols1);
  const  chalker1 = chalkForColor(col1);

  const col2 = new Color(cols2);
  const  chalker2 = chalkForColor(col2);

  for (const info of colorInfo([cols1, cols2])) {
    console.log(info);
  }

  console.log(`Contrast of ${chalker1(cols1)} and ${chalker2(cols2)}: ${col1.contrast(col2)}`);
}

function chalkForColor(col: Color) {
  return chalk.bgHex(col.hex()).hex(col.isDark() ? '#ffffff' : '#000000');
}

export function mixColor(color1: string, color2: string, weightInterval: number) {
  const col1 = new Color(color1);
  const col2 = new Color(color2);

  const count = Math.floor(1 / weightInterval);
  const mixed = [col1];
  for (let i = 1; i <= count; i++) {
    mixed.push(col1.mix(col2, weightInterval * i));
  }
  mixed.push(col2);
  console.log(mixed.map(col => chalkForColor(col)(`  ${col.hex()}  `)).join('\n'));
}

// export function fillPalettes() {
//   const input: Array<{[hue: string]: string}> = api.config.get([api.packageName, 'fillPalettes']);
//   console.log(input);
//   for (const colors of input) {
//     fillPalette(colors);
//   }
// }

// const colorMapkey = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900',
//   'A100', 'A200', 'A400', 'A700'];

// function fillPalette(colorMap: {[hue: string]: string}) {
//   const missingKeys = colorMapkey.filter(key => !_.has(colorMap, key));
//   console.log(missingKeys);

//   // const colors = (input.colors as string[]).map(color => Color(color));
//   // console.log(colors.map(col => col.lightenByRatio(0.15).toCSS()));
// }
