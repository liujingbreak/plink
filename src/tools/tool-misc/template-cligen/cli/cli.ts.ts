import {CliExtension} from '@wfh/plink/wfh/dist';

const cliExt: CliExtension = (program) => {
  const cmd = program.command('$__foobar__$ [argument1...]')
  .description('$__foobar__$ description', {
    'argument1': 'Description for argument1'
  })
  .option('-f, --file <spec>', 'sample option')
  .action(async (argument1: string[]) => {
    await (await import('./cli-$__foobarFile__$')).$__foobarId__$(argument1, cmd.opts() as any);
  });

  // TODO: Add more sub command here
};

export default cliExt;
