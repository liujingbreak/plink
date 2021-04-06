// tslint:disable no-console
import fs from 'fs-extra';
import Path from 'path';
import _ from 'lodash';
// import chalk from 'chalk';
import {boxString} from '@wfh/plink/wfh/dist/utils/misc';
import generateStructure from '@wfh/plink/wfh/dist/template-gen';
import plink from '__plink';

export async function genPackage(path: string, compName: string, featureName: string, outputPath?: string,
  dryrun = false) {
  compName = compName.charAt(0).toUpperCase() + compName.slice(1);
  // const sCompName = compName.charAt(0).toLowerCase() + compName.slice(1);
  const capitalFeatureName = featureName.charAt(0).toUpperCase() + featureName.slice(1);
  const littleFeatureName = featureName.charAt(0).toLowerCase() + featureName.slice(1);

  if (!path) {
    throw new Error('Lack of arguments');
  }
  const dir = Path.resolve(path);
  if (dryrun) {
    // tslint:disable-next-line: no-console
    plink.logger.info('dryrun mode');
  } else {
    fs.mkdirpSync(dir);
  }
  const ma = /^@[^/]\/([^]*)$/.exec(path);
  if (ma) {
    path = ma[1];
  }
  const packageName = Path.basename(path);
  const featureDir = Path.resolve(dir, littleFeatureName);
  if (!dryrun) {
    fs.mkdirpSync( featureDir); // mkdir feature directory
  }

  if (outputPath == null)
    outputPath = Path.basename(path);
  if (outputPath.startsWith('/'))
    outputPath = _.trimStart(outputPath, '/');

  await generateStructure(Path.resolve(__dirname, '../../template-cra-pkg'), dir, {
      fileMapping: [
        [/^my-feature/, littleFeatureName]
      ],
      textMapping: {
        packageName,
        MyComponentPath: `${littleFeatureName}/${compName}`,
        appBuild: '/' + outputPath,
        publicUrlOrPath: '/' + (outputPath.length > 0 ? outputPath + '/' : '')
      }
    },
    {dryrun});

  await generateStructure(Path.resolve(__dirname, '../../template-cra-connected-comp'),  featureDir, {
      fileMapping: [
        [/^MyConnectedComp/, compName]
      ],
      textMapping: {
        MyComponent: compName,
        slice_file: './' + featureName + 'Slice',
        withImage: true,
        isEntry: true,
        isConnected: true
      }
    },
    {dryrun});

  await generateStructure(Path.resolve(__dirname, '../../template-cra-slice'),  featureDir, {
      fileMapping: [
        [/^MyFeatureSlice/, littleFeatureName + 'Slice']
      ],
      textMapping: {
        SliceName: capitalFeatureName,
        sliceName: littleFeatureName
      }
    },
    {dryrun});
  // copyTempl(dir, Path.basename(path), dryrun);
  plink.logger.info('\n' + boxString(
    `1. Modify ${Path.resolve(path, 'package.json')} to change current package name "@wfh/${packageName}",` +
    ' if you don\'t like it.\n' +
    '2. Run command: plink sync\n' +
    `3. Add "${packageName}" as dependency in ${process.cwd()}/package.json.\n` +
    `  (Run command: plink add @wfh/${packageName})\n`));
}

export async function genComponents(dir: string, compNames: string[], connectedToSlice: string | undefined, dryrun = false) {
  dir = Path.resolve(dir);

  if (dryrun) {
    // tslint:disable-next-line: no-console
    plink.logger.info('dryrun mode');
  } else {
    fs.mkdirpSync(dir);
  }
  for (let compName of compNames) {
    compName = compName.charAt(0).toUpperCase() + compName.slice(1);

    let sliceFilePath = '<Your Redux Slice Path>';
    if (connectedToSlice) {
      sliceFilePath = Path.relative(dir, connectedToSlice).replace(/\\/g, '/').replace(/\.[^.]+$/, '');
      if (!sliceFilePath.startsWith('.'))
        sliceFilePath = './' + sliceFilePath;
    }
    await generateStructure(Path.resolve(__dirname, '../../template-cra-connected-comp'), dir,
    {
      fileMapping: [
        [/^MyConnectedComp/, compName]
      ],
      textMapping: {
        MyComponent: compName,
        slice_file: sliceFilePath,
        withImage: false,
        isEntry: false,
        isConnected: !!connectedToSlice
      }
    },
    {dryrun});
  }
}

export async function genSlice(dir: string, targetNames: string[], opt: {dryRun?: boolean; comp: boolean}) {
  dir = Path.resolve(dir);

  if (opt.dryRun) {
    // tslint:disable-next-line: no-console
    plink.logger.info('dryrun mode');
  } else {
    fs.mkdirpSync(dir);
  }
  for (let targetName of targetNames) {
    targetName = targetName.charAt(0).toUpperCase() + targetName.slice(1);
    const smallTargetName = targetName.charAt(0).toLowerCase() + targetName.slice(1);
    await generateStructure(
      Path.resolve(__dirname, opt.comp ? '../../template-slice4comp' : '../../template-cra-slice'),
      dir,
    {
      fileMapping: [
        [/^myFeature/, smallTargetName],
        [/^MyComp/, smallTargetName]
      ],
      textMapping: {
        SliceName: targetName,
        sliceName: smallTargetName
      }
    },
    {dryrun: opt.dryRun});
  }
}
