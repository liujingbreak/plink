import {CliExtension, GlobalOptions} from 'dr-comp-package/wfh/dist';
import {initConfigAsync} from 'dr-comp-package/wfh/dist/utils/bootstrap-server';

const cliExt: CliExtension = (program, withGlobalOptions) => {
  const cmd = program.command('jasmine [package...]', 'run jasmine test spec from specific packages')
  .option('-f, --file <spec>', 'run single file')
  .action(async (packages: string[]) => {
    await initConfigAsync(cmd.opts() as GlobalOptions);
    // TODO
  });
};

export default cliExt;
