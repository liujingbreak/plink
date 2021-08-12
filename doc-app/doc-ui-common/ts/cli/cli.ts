import {CliExtension} from '@wfh/plink/wfh/dist';
import * as markdownUtil from '../markdown-util';
import fs from 'fs';
import {mkdirpSync} from 'fs-extra';
import Path from 'path';
// import util from 'util';

const cliExt: CliExtension = (program) => {
  const mdCli = program.command('markdown <file>')
  .description('Show markdown topics', {file: 'source markdown file'})
  .option('-o,--out <output html>', 'Output to html file')
  .action(async (file) => {
    const {markdownToHtml, tocToString} = require('../markdown-util') as typeof markdownUtil;
    const {toc, content} = await markdownToHtml(fs.readFileSync(Path.resolve(file), 'utf8')).toPromise();
    // eslint-disable-next-line no-console
    console.log('Table of content:\n' + tocToString(toc));
    if (mdCli.opts().out) {
      const target = Path.resolve(mdCli.opts().out);
      mkdirpSync(Path.dirname(target));
      fs.writeFileSync(target, content);
      // eslint-disable-next-line no-console
      console.log('Output HTML to file:', target);
    }
  });

  program.command('color-info <color-string...>')
  .description('Show color information', {'color-string': 'In form of CSS color string'})
  .action(async function(colors: string[]) {
    for (const info of (await import('../color')).colorInfo(colors)) {
      // eslint-disable-next-line no-console
      console.log(info);
    }
  });

  program.command('color-contrast <color-string1> <color-string2>')
  .description('Show color contrast information', {'color-string1': 'In form of CSS color string'})
  .action(async function(...colors: string[]) {
    (await import('../color')).colorContrast(...colors as [string, string]);
  });

  program.command('color-mix <color1> <color2> [weight-interval]')
  .description('compare 2 colors', {
    color1: 'In form of CSS color string',
    color2: 'In form of CSS color string',
    'weight-interval': 'weight of color to be mixed, should be number between 0 - 1'
  })
  .action(async (color1: string, color2: string, weightInterval?: string) => {
    if (weightInterval == null) {
      weightInterval = '0.1';
    }
    (await import('../color')).mixColor(color1, color2, Number(weightInterval));
  });

  // TODO: Add more sub command here
};

export default cliExt;
