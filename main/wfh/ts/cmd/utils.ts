import chalk from 'chalk';
import fs from 'fs-extra';
import Path from 'path';

export function writeFile(file: string, content: string) {
  fs.writeFileSync(file, content);
  // tslint:disable-next-line: no-console
  console.log('%s is written', chalk.cyan(Path.relative(process.cwd(), file)));
}

