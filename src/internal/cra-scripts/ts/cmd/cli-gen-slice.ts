import {CliExtension, GlobalOptions, initConfigAsync} from '@wfh/plink/wfh/dist';
import generateStructure from '@wfh/plink/wfh/dist/template-gen';
import Path from 'path';

const cliExt: CliExtension = (program, withGlobalOptions) => {
  const cmd = program.command('redux-slice-gen <filePath>')
  .description('Generate a Redux-toolkit slice (with Redux-observable epic) file skeleton')
  .option('-d', 'dryrun', false)
  .action(async (filePath: string) => {
    await initConfigAsync(cmd.opts() as GlobalOptions);
    await generateSlice(filePath, cmd.opts() as any);
  });
};

export default cliExt;

async function generateSlice(filePath: string, opts: {d: boolean}) {
  const basename = /^(.*?)(?:\.[^.])?$/.exec(Path.basename(filePath))![1];

  await generateStructure(Path.resolve(__dirname, 'template'), filePath, {
    fileMapping: [ [/^slice\.ts$/, filePath] ],
    textMapping: {
      SliceName: basename.charAt(0).toUpperCase + basename.slice(1),
      sliceName: basename
    }
  }, {dryrun: opts.d});
}
