import Path from 'path';
import fs from 'fs';
import {PlinkPackageLookup} from '@wfh/plink/wfh/dist/package-mgr/package-mgr2-utils';
import {lookupPlinkRoot} from '@wfh/plink/wfh/dist/plink2/process-common';
import {TsconfigType} from '@wfh/plink/wfh/dist/package-mgr/package-mgr2-utils';

export const plinkRootDir = lookupPlinkRoot(process.cwd())!;
export const tsconfigFile = Path.resolve(plinkRootDir, 'tsconfig.json');
export const tsconfigJson = JSON.parse(fs.readFileSync(tsconfigFile, 'utf8')) as TsconfigType;
const lookupTool = new PlinkPackageLookup();
export const packagePathMap = lookupTool.fromTsconfig(plinkRootDir, tsconfigJson);
export {lookupTool};
