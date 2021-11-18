import {CliExtension} from '@wfh/plink';

const cliExt: CliExtension = (program) => {
  const cmd = program.command('$__foobar__$')
  .description('$__foobar__$ description')
  .argument('[argument1...]', 'Description for argument1', [])
  .option('-f, --file <spec>', 'sample option')
  .action(async (argument1: string[]) => {
    (await import('./cli-$__foobarFile__$')).$__foobarId__$(argument1, cmd.opts());
  });

  // TODO: Add more sub command here
};

export default cliExt;
