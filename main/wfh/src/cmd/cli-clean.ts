import {CliExtension} from '../index';

const cliExt: CliExtension = (program) => {
  program.command('upgrade [package...]')
  .description('Hellow command description')
  .option('-f, --file <spec>', 'run single file')
  .action(async (packages: string[]) => {
    // TODO
  });
};

export default cliExt;
