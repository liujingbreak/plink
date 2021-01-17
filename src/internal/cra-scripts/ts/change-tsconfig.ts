import {setTsCompilerOptForNodePath} from '@wfh/plink/wfh/dist/config-handler';
import {closestCommonParentDir} from '@wfh/plink/wfh/dist/utils/misc';
import {getState} from '@wfh/plink/wfh/dist/package-mgr';
import {getRootDir} from '@wfh/plink/wfh/dist';
import Path from 'path';
import fs from 'fs';

export function changeTsConfigFile() {
  // const craOptions = getCmdOptions();
  const plinkRoot = getRootDir();
  const rootDir = closestCommonParentDir(Array.from(
    getState().project2Packages                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                .keys()
    ).map(prjDir => Path.resolve(plinkRoot, prjDir))).replace(/\\/g, '/');

  const tsconfigJson = JSON.parse(fs.readFileSync(process.env._plink_cra_scripts_tsConfig!, 'utf8'));
  const tsconfigDir = Path.dirname(process.env._plink_cra_scripts_tsConfig!);

  const pathMapping: {[key: string]: string[]} = {};

  for (const [name, {realPath}] of getState().srcPackages.entries() || []) {
    const realDir = Path.relative(tsconfigDir, realPath).replace(/\\/g, '/');
    pathMapping[name] = [realDir];
    pathMapping[name + '/*'] = [realDir + '/*'];
  }

  if (getState().linkedDrcp) {
    const drcpDir = Path.relative(tsconfigDir, getState().linkedDrcp!.realPath).replace(/\\/g, '/');
    pathMapping['@wfh/plink'] = [drcpDir];
    pathMapping['@wfh/plink/*'] = [drcpDir + '/*'];
  }
  tsconfigJson.compilerOptions.paths = pathMapping;

  setTsCompilerOptForNodePath(tsconfigDir, './', tsconfigJson.compilerOptions, {
    workspaceDir: process.cwd()
  });

  tsconfigJson.include = [Path.relative(process.cwd(), process.env._plink_cra_scripts_indexJs!)];
  tsconfigJson.compilerOptions.rootDir = rootDir;
  // tslint:disable-next-line: no-console
  // console.log('[change-tsconfig] tsconfigJson:', JSON.stringify(tsconfigJson, null, '  '));
  // fs.writeFileSync(Path.resolve('tsconfig.json'), JSON.stringify(tsconfigJson, null, '  '));
  return tsconfigJson;
}
