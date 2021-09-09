import generateStructure from '@wfh/plink/wfh/dist/template-gen';
// import fsex from 'fs-extra';
import Path from 'path';
import fs from 'fs';
// import chalk from 'chalk';
import plink from '__plink';
import _ from 'lodash';
import {inspect} from 'util';
import {allSrcDirs} from '@wfh/plink/wfh/dist/recipe-manager';
import {getProjectList, actionDispatcher as pkgMgrDispatcher} from '@wfh/plink/wfh/dist/package-mgr';
import parse, {isArrayAst} from '@wfh/plink/wfh/dist/utils/json-sync-parser';
import replaceText from '@wfh/plink/wfh/dist/utils/patch-text';
import '@wfh/plink/wfh/dist/editor-helper';


// TODO: support file type other than "ts"
export async function generateConfig(file: string, opt: {dryRun: boolean; type: 'ts' | 'yaml' | 'json'}) {
  file = Path.resolve(file);
  if (opt.dryRun) {
    plink.logger.info('Dryrun mode');
  }
  const suffix = Path.extname(file);
  if (suffix === '')
    file = file + '.ts';
  else if (suffix !== '.ts') {
    file = file.replace(/\.[^./\\]$/, '.ts');
    plink.logger.warn('We recommend using Typescript file as configuration, which can provide type check in Visual Code editor.');
  }

  // if (!opt.dryRun) {
  //   fsex.mkdirpSync(Path.dirname(file));
  // }

  let isUnderSrcDir = false;
  const srcDirs = Array.from(allSrcDirs()).map(item => item.srcDir);
  for (const {srcDir} of allSrcDirs()) {
    if (file.startsWith(srcDir + Path.sep)) {
      isUnderSrcDir = true;
      break;
    }
  }

  if (!isUnderSrcDir) {
    const projDir = getProjectList().find(prj => file.startsWith(Path.resolve(prj) + Path.sep));
    if (projDir) {
      let output: string;
      const projJsonFile = Path.resolve(projDir, 'package.json');
      const jsonStr = fs.readFileSync(projJsonFile, 'utf8');
      const ast = parse(jsonStr);
      const packagesAst = ast.properties.find(item => item.name.text === '"packages"');
      if (packagesAst) {
        if (!isArrayAst(packagesAst.value)) {
          throw new Error(`Invalid ${projJsonFile}, property "packages" must be Array type`);
        }
        const end = packagesAst.value.items[packagesAst.value.items.length - 1].end;
        output = replaceText(jsonStr, [
          {
            start: end, end,
            text: `,\n    ${JSON.stringify(Path.relative(projDir, Path.dirname(file)).replace(/\\/g, '/'))}`
          }
        ]);
      } else {
        const end = ast.properties[ast.properties.length - 1].value.end;
        output = replaceText(jsonStr, [
          {
            start: end, end,
            text: `,\n  "packages": [${JSON.stringify(Path.relative(projDir, Path.dirname(file)).replace(/\\/g, '/'))}]`
          }
        ]);
        // plink.logger.info(projJsonFile + ` is changed, you need to run command "${chalk.green('plink sync')}" to create a tsconfig file Editor`);
      }

      if (!opt.dryRun) {
        fs.writeFileSync(projJsonFile, output);
        await new Promise(resolve => setImmediate(resolve));
        // updateTsconfigFileForProjects(workspaceKey(process.cwd()), projDir);
        pkgMgrDispatcher.scanAndSyncPackages({});
        plink.logger.info(projJsonFile + ' is updated.');
      }
    } else {
      plink.logger.error(`The target file ${file} is not under any of associated project directories:\n`
        + srcDirs.join('\n')
        + '\n  A Typescript file will not get proper type checked in Editor without tsconfig file, Plink "sync" command can ' +
        ' help to generate an Editor friendly tsconfig file, but it must be one of associated project directory');
      return;
    }
  }

  await generateStructure(Path.resolve(__dirname, '../../template-gcfg'), Path.dirname(file), {
    fileMapping: [ [/foobar\.ts/, Path.basename(file)] ],
    textMapping: {
      settingValue: inspect(plink.config(), false, 5).replace(/(\r?\n)([^])/mg, (match, p1, p2) => p1 + '    // ' + p2)
    }
  }, {dryrun: opt.dryRun});
}
