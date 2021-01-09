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
  setTsCompilerOptForNodePath(process.cwd(), './', tsconfigJson.compilerOptions, {
    workspaceDir: process.cwd()
  });

  tsconfigJson.include = [Path.relative(process.cwd(), process.env._plink_cra_scripts_indexJs!)];
  tsconfigJson.compilerOptions.rootDir = rootDir;
  // tslint:disable-next-line: no-console
  // console.log('tsconfigJson:', tsconfigJson);
  // fs.writeFileSync(Path.resolve('tsconfig.json'), JSON.stringify(tsconfigJson, null, '  '));
  return tsconfigJson;
}
