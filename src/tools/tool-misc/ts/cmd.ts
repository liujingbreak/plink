import {CliExtension, GlobalOptions, initConfigAsync} from '@wfh/plink/wfh/dist';
import generateStructure from '@wfh/plink/wfh/dist/template-gen';
import Path from 'path';

const cliExt: CliExtension = (program, withGlobalOptions) => {
  const cmd = program.command('gen-redux <path>')
  .description('Generate a Redux-toolkt & Redux-observable slice file')
  .option('--tsd', 'Support generating Typescript tsd file', false)
  .option('-d', 'Dryrun', false)
  .action(async (targetFile: string) => {
    await initConfigAsync(cmd.opts() as GlobalOptions);
    await generateSlice(targetFile, cmd.opts() as any);
  });
};

export default cliExt;

async function generateSlice(filePath: string, opts: {tsd: boolean, dryRun: boolean}) {
  const basename = /^(.*?)(?:\.[^.])?$/.exec(Path.basename(filePath))![1];

  await generateStructure(Path.resolve(__dirname, 'template'), filePath, {
    fileMapping: [ [/^slice\.ts$/, filePath] ],
    textMapping: {
      SliceName: basename.charAt(0).toUpperCase + basename.slice(1),
      sliceName: basename
    }
  }, {dryrun: opts.dryRun});
}
