import { findPackagesByNames } from '@wfh/plink';
import generateStructure from '@wfh/plink/wfh/dist/template-gen';
import {actionDispatcher, PackageInfo} from '@wfh/plink/wfh/dist/package-mgr';
import {tsc} from '@wfh/plink/wfh/dist/ts-cmd';
import fs from 'fs';
import Path from 'path';
import plink from '__plink';
import _ from 'lodash';

export async function generateSetting(pkgs: string[], opt: {dryRun: boolean}) {
  if (opt.dryRun) {
    plink.logger.info('Dryrun mode');
  }
  const pkgsInfo = Array.from(findPackagesByNames(pkgs));
  let i = 0;
  const pkgInfoWithJsonFiles: Array<[pkg: PackageInfo, jsonFile: string] | null> =
    await Promise.all(pkgsInfo.map(async pkgInfo => {
      if (pkgInfo == null) {
        plink.logger.error(`Package not found: ${pkgs[i]}`);
        return null;
      }

      let camelCased = pkgInfo.shortName.replace(/-([^])/g, (match, g1) => g1.toUpperCase());
      const upperCaseFirstName = camelCased.charAt(0).toUpperCase() + camelCased.slice(1) + 'Setting';

      const json = _.cloneDeep(pkgInfo.json);
      const pkgjsonProp = json.dr || json.plink!;
      if (pkgjsonProp.setting) {
        plink.logger.warn(`There has been an existing "${pkgInfo.json.dr ? 'dr' : 'plink'}.setting" in ${pkgInfo.realPath}/package.json file`);
        return null;
      }

      pkgjsonProp.setting = {
        value: `isom/${pkgInfo.shortName}-setting.js#defaultSetting`,
        type: `isom/${pkgInfo.shortName}-setting#` + upperCaseFirstName
      };

      const pkgjsonStr = JSON.stringify(json, null, '  ');
      const pkgjsonFile = Path.resolve(pkgInfo.realPath, 'package.json');

      let jsonDone: Promise<any>;
      if (opt.dryRun) {
        plink.logger.info(`Will write file ${pkgjsonFile}:\n` + pkgjsonStr);
        jsonDone = Promise.resolve();
      } else {
        jsonDone = fs.promises.writeFile(pkgjsonFile, pkgjsonStr);
        plink.logger.info(`Write file ${pkgjsonFile}`);
      }

      const filesDone = generateStructure(Path.resolve(__dirname, '../../template-gsetting'),
        Path.resolve(pkgInfo.realPath, 'isom'), {
          fileMapping: [
            [/foobar/g, pkgInfo.shortName]
          ],
          textMapping: {
            foobarPackage: pkgInfo.name,
            foobar: camelCased,
            Foobar: camelCased.charAt(0).toUpperCase() + camelCased.slice(1)
          }
        }, {dryrun: opt.dryRun});
      await Promise.all([jsonDone, filesDone]);
      return [pkgInfo, pkgjsonFile] as [pkg: PackageInfo, jsonFile: string];
    }));

  if (!opt.dryRun) {
    const meta = pkgInfoWithJsonFiles.filter(item => item != null);
    if (meta.length === 0)
      return;
    await tsc({
      package: meta.map(item => item![0].name)
    });
    await new Promise(resolve => setImmediate(resolve));
    await import('@wfh/plink/wfh/dist/editor-helper.js');
    actionDispatcher.scanAndSyncPackages({packageJsonFiles:
      meta.map(item => item![1])
    });
  }
}
