import fs from 'fs';
import Path from 'path';
import {CliExtension} from '@wfh/plink/wfh/dist';
import {mkdirpSync} from 'fs-extra';
import * as markdownUtil from '../markdown-util';
// import util from 'util';

const cliExt: CliExtension = (program) => {
  const mdCli = program.command('markdown <file>')
    .description('Show markdown topics', {file: 'source markdown file'})
    .option('-i, --insert', 'Insert or update table of content in markdown file')
    .option('-o,--out <output html>', 'Output to html file')
    .action(async (file) => {
      const {markdownToHtml, tocToString, insertOrUpdateMarkdownToc} = require('../markdown-util') as typeof markdownUtil;
      const input = fs.readFileSync(Path.resolve(file), 'utf8');
      if (mdCli.opts().insert) {
        const {changedMd, toc, html} = await insertOrUpdateMarkdownToc(input);
        // eslint-disable-next-line no-console
        console.log('Table of content:\n' + toc);
        fs.writeFileSync(file, changedMd);
        if (mdCli.opts().out) {
          const target = Path.resolve(mdCli.opts().out);
          mkdirpSync(Path.dirname(target));
          fs.writeFileSync(target, html);
          // eslint-disable-next-line no-console
          console.log('Output HTML to file:', target);
        }
      } else {
        const {toc, content} = await markdownToHtml(input).toPromise();
        // eslint-disable-next-line no-console
        console.log('Table of content:\n' + tocToString(toc));
        if (mdCli.opts().out) {
          const target = Path.resolve(mdCli.opts().out);
          mkdirpSync(Path.dirname(target));
          fs.writeFileSync(target, content);
          // eslint-disable-next-line no-console
          console.log('Output HTML to file:', target);
        }
      }
    });

  program.command('color-info <color-string...>')
    .description('Show color information', {'color-string': 'In form of CSS color string'})
    .action(async function(colors: string[]) {
      for (const info of (await import('../color.js')).colorInfo(colors)) {
      // eslint-disable-next-line no-console
        console.log(info);
      }
    });

  program.command('color-contrast <color-string1> <color-string2>')
    .description('Show color contrast information', {'color-string1': 'In form of CSS color string'})
    .action(async function(...colors: string[]) {
      (await import('../color.js')).colorContrast(...colors as [string, string]);
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
      (await import('../color.js')).mixColor(color1, color2, Number(weightInterval));
    });

  // TODO: Add more sub command here
};

export default cliExt;
