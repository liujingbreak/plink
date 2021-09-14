import generateStructure from '@wfh/plink/wfh/dist/template-gen';
import replaceText from '@wfh/plink/wfh/dist/utils/patch-text';
import {findPackagesByNames} from '@wfh/plink/wfh/dist/cmd/utils';
import {getState, getStore, actionDispatcher, isCwdWorkspace} from '@wfh/plink/wfh/dist/package-mgr';
import parse, {ObjectAst} from '@wfh/plink/wfh/dist/utils/json-sync-parser';
import Path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import * as op from 'rxjs/operators';
import {GlobalOptions, log4File} from '@wfh/plink';
import {getTscConfigOfPkg} from '@wfh/plink/wfh/dist/utils/misc';
import * as _tscmd from '@wfh/plink/wfh/dist/ts-cmd';

const log = log4File(__filename);
export interface CBOptions extends GlobalOptions {
  forTemplate: boolean;
  dryRun: boolean;
}

export async function generate(packageName: string, cmdName: string, opts: CBOptions) {
  const targetPkgs = Array.from(findPackagesByNames(getState(), [packageName]));

  if (targetPkgs.length === 0) {
    throw new Error(`Can not find package ${packageName}`);
  }
  const targetPkg = targetPkgs[0]!;
  const pkgTsDirInfo = getTscConfigOfPkg(targetPkg.json);

  const lowerCaseCmdName = cmdName.toLowerCase();
  const cmdFileName = lowerCaseCmdName.replace(/:/g, '-');
  const camelCaseCmd = lowerCaseCmdName.replace(/[-:]([a-zA-Z])/g, (match, $1: string) => $1.toUpperCase());
  if (opts.dryRun) {
    log.warn('Dryrun mode...');
  }
  await generateStructure(Path.resolve(__dirname, '../../template-cligen'),
    Path.resolve(targetPkg.realPath, pkgTsDirInfo.srcDir),
    {
      fileMapping: [ [/foobar/g, cmdFileName] ],
      textMapping: {
        foobar: lowerCaseCmdName,
        foobarId: camelCaseCmd,
        foobarFile: cmdFileName
      }
    }, {dryrun: opts.dryRun});

  const pkJsonFile = Path.resolve(targetPkg.realPath, 'package.json');

  if (opts.dryRun) {
    log.info(chalk.cyan(pkJsonFile) + ' will be changed.');
  } else {
    let text = fs.readFileSync(pkJsonFile, 'utf8');
    const objAst = parse(text);
    const plinkProp = objAst.properties.find(prop => prop.name.text === '"dr"')
      || objAst.properties.find(prop => prop.name.text === '"plink"');
    if (plinkProp) {
      const drProp = plinkProp.value as ObjectAst;
      if (drProp.properties.map(item => item.name.text).includes('"cli"')) {
        throw new Error(`${pkJsonFile} has already defined a "cli" property as executable entry`);
      }
      const pkjsonText = replaceText(text, [{
        text: '\n    "cli": "dist/cli/cli.js#default"' + (drProp.properties.length > 0 ? ',' : '\n  '),
        start: drProp.start + 1,
        end: drProp.start + 1
      }]);
      fs.writeFileSync(pkJsonFile, pkjsonText);
      log.info(chalk.cyan(pkJsonFile) + 'is changed.');

      if (isCwdWorkspace()) {
        actionDispatcher.updateWorkspace({dir: process.cwd(), isForce: false, packageJsonFiles: [pkJsonFile]});
        await getStore().pipe(
          op.map(s => s.workspaceUpdateChecksum),
          op.distinctUntilChanged(),
          op.skip(1),
          op.take(1)
        ).toPromise();
        const {tsc} = require('@wfh/plink/wfh/dist/ts-cmd') as typeof _tscmd;
        await tsc({package: [packageName], pathsJsons: []});
      }

    } else {
      throw new Error(`${pkJsonFile} has no "dr" or "plink" property, is it an valid Plink package?`);
    }
  }
}
