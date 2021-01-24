// tslint:disable no-console
import fs from 'fs-extra';
import Path from 'path';
import _ from 'lodash';
import chalk from 'chalk';
import {boxString} from '@wfh/plink/wfh/dist/utils/misc';
import generateStructure from '@wfh/plink/wfh/dist/template-gen';

export async function genPackage(path: string, compName = 'Sample', dryrun = false) {
  compName = compName.charAt(0).toUpperCase() + compName.slice(1);
  const sCompName = compName.charAt(0).toLowerCase() + compName.slice(1);
  if (!path) {
    throw new Error('Lack of arguments');
  }
  const dir = Path.resolve(path);
  if (dryrun) {
    // tslint:disable-next-line: no-console
    console.log('[cra-scripts cmd] dryrun mode');
  } else {
    fs.mkdirpSync(dir);
  }
  const ma = /^@[^/]\/([^]*)$/.exec(path);
  if (ma) {
    path = ma[1];
  }
  const packageName = Path.basename(path);
  await generateStructure(Path.resolve(__dirname, '../../template'), dir,
    {
      fileMapping: [
        [/^my\-feature/, 'sample'],
        [/^MyFeature/, sCompName],
        [/^MyComponent/, compName + 'Comp']
      ],
      textMapping: {
        packageName,
        MyComponent: compName + 'Comp',
        SliceName: compName,
        sliceName: sCompName,
        MyComponentPath: `${sCompName}/${compName}Comp`
      }
    },
    {dryrun});

  // copyTempl(dir, Path.basename(path), dryrun);
  console.log('[cra-scripts cmd]\n' + boxString(
    `1. Modify ${Path.resolve(path, 'package.json')} to change current package name "${packageName}",` +
    ` if you don't like it.\n` +
    `2. Add "${packageName}" as dependency in ${process.cwd()}/package.json.\n` +
    `3. Run command:\n  ${chalk.cyan('plink init .')}`));
}

export async function genComponents(dir: string, compNames: string[], dryrun = false) {
  dir = Path.resolve(dir);

  if (dryrun) {
    // tslint:disable-next-line: no-console
    console.log('[cra-scripts cmd] dryrun mode');
  } else {
    fs.mkdirpSync(dir);
  }
  for (let compName of compNames) {
    compName = compName.charAt(0).toUpperCase() + compName.slice(1);
    const sCompName = compName.charAt(0).toLowerCase() + compName.slice(1);
    await generateStructure(Path.resolve(__dirname, '../../template-comp'), dir,
    {
      fileMapping: [
        [/^my\-feature/, 'sample'],
        [/^MyComponent/, compName + 'Comp']
      ],
      textMapping: {
        MyComponent: compName + 'Comp',
        SliceName: compName,
        sliceName: sCompName
      }
    },
    {dryrun});
  }
}

export async function genSlice(dir: string, targetNames: string[], dryrun = false) {
  dir = Path.resolve(dir);

  if (dryrun) {
    // tslint:disable-next-line: no-console
    console.log('[cra-scripts cmd] dryrun mode');
  } else {
    fs.mkdirpSync(dir);
  }
  for (let targetName of targetNames) {
    targetName = targetName.charAt(0).toUpperCase() + targetName.slice(1);
    const smallTargetName = targetName.charAt(0).toLowerCase() + targetName.slice(1);
    await generateStructure(Path.resolve(__dirname, '../../template-slice'), dir,
    {
      fileMapping: [
        [/^MyFeature/, smallTargetName]
      ],
      textMapping: {
        SliceName: targetName,
        sliceName: smallTargetName
      }
    },
    {dryrun});
  }
}
