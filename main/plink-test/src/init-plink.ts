import Path from 'path';
import fs from 'fs';
import * as rx from 'rxjs';
import {createPlinkPackageLookupService} from '@wfh/plink/wfh/dist/package-mgr/package-mgr2-lookup';
import {lookupPlinkRoot} from '@wfh/plink/wfh/dist/plink2/process-common';
import {TsconfigType} from '@wfh/plink/wfh/dist/package-mgr/package-mgr2-utils';

export const plinkRootDir = lookupPlinkRoot(process.cwd())!;
export const tsconfigFile = Path.resolve(plinkRootDir, 'tsconfig.json');
export const tsconfigJson = JSON.parse(fs.readFileSync(tsconfigFile, 'utf8')) as TsconfigType;
const lookupTool = createPlinkPackageLookupService();
console.log('here');
lookupTool.input.fromTsconfig(plinkRootDir, tsconfigJson).dp();
console.log('there');
export const packageToPathMap = lookupTool.table.getData().packageToPathMap[0]!;
export function lookupPackage(file: string) {
  let resolved: string | undefined | null;
  lookupTool.input.lookupPackage(file).od(lookupTool.output.lookupPackageResolved).pipe(
    rx.take(1)
  ).subscribe(([, value]) => {
    resolved = value;
  });
  return resolved;
}
