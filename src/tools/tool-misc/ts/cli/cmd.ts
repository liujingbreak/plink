import {CliExtension, GlobalOptions, initConfig, initProcess} from '@wfh/plink/wfh/dist';
import generateStructure from '@wfh/plink/wfh/dist/template-gen';
import {findPackagesByNames} from '@wfh/plink/wfh/dist/cmd/utils';
import {getState} from '@wfh/plink/wfh/dist/package-mgr';
import parse from '@wfh/plink/wfh/dist/utils/json-sync-parser';
import Path from 'path';
import api from '__api';

interface CBOptions extends GlobalOptions {
  forTemplate: boolean;
  dryRun: boolean;
}

const cliExt: CliExtension = (program, withGlobalOptions) => {
  const cmd = program.command('gen-command-builder <package> <command-name>')
  .description('Generate a Plink command line implementation in specific package')
  .option('--for-template <templateName>', 'Create a command for generating template', false)
  .option('-d', 'Dryrun', false)
  .action(async (packageName: string, cmdName: string) => {
    initConfig(cmd.opts() as GlobalOptions);
    initProcess();
    generate(packageName, cmdName, cmd.opts() as CBOptions);
  });
};

export default cliExt;

async function generate(packageName: string, cmdName: string, opts: CBOptions) {
  const targetPkgs = Array.from(findPackagesByNames(getState(), [packageName]));
  if (targetPkgs.length === 0) {
    throw new Error(`Can not find package ${packageName}`);
  }
  const targetPkg = targetPkgs[0]!;

  const lowerCaseCmdName = cmdName.toLowerCase();
  await generateStructure(Path.resolve(__dirname, '../../template-cligen'),
    Path.resolve(targetPkg.realPath, 'ts'),
    {
      fileMapping: [ [/-foobar$/, lowerCaseCmdName] ],
      textMapping: {
        foobar: lowerCaseCmdName
      }
    }, {dryrun: opts.dryRun});

  const pkJsonFile = Path.resolve(targetPkg.path, 'package.json');
  const objAst = parse(pkJsonFile);
  const plinkProp = objAst.properties.find(prop => prop.name.text === '"dr"');
  if (plinkProp) {
    api.logger.info('found "dr"');
  } else {

  }
  if (opts.dryRun) {
    api.logger.info(pkJsonFile + ' will be changed.');
  }
}
