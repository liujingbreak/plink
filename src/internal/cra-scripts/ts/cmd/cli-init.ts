// import parseJson, {Ast} from '@wfh/plink/wfh/dist/utils/json-sync-parser';
// import replaceCode, {ReplacementInf} from '@wfh/plink/wfh/dist/utils/patch-text';
import Path from 'path';
import fs from 'fs';
import log4js from 'log4js';
import replacePatches, { ReplacementInf } from '@wfh/plink/wfh/dist/utils/patch-text';
import parse, {Token, ObjectAst} from '@wfh/plink/wfh/dist/utils/json-sync-parser';
const log = log4js.getLogger('cra');

export async function initTsconfig() {
  // const {default: parse} = await import('@wfh/plink/wfh/dist/utils/json-sync-parser');
  let fileContent = fs.readFileSync('tsconfig.json', 'utf8');
  const ast = parse(fileContent);
  let pMap = new Map(ast.properties.map(el => [/^"(.*)"$/.exec(el.name.text)![1], el]));
  const replacements: ReplacementInf[] = [];
  const baseTsConfig = Path.relative(process.cwd(), require.resolve('@wfh/plink/wfh/tsconfig-base.json')).replace(/\\/g, '/');

  if (pMap.has('extends') && (pMap.get('extends')!.value as Token).text.slice(1, -1) !== baseTsConfig) {
    log.info('Update ' + Path.resolve('tsconfig.json'));
    const extendValueToken = (pMap.get('extends')!.value as Token);
    replacements.push({start: extendValueToken.pos + 1, end: extendValueToken.end - 1, replacement: baseTsConfig});
  } else {
    replacements.push({start: 1, end: 1, replacement: `\n  "extends": "${baseTsConfig}",`});
  }
  // log.warn(Array.from(pMap.keys()));
  const coAst = pMap.get('compilerOptions')!.value as ObjectAst;
  const rootDir = coAst.properties.find(prop => prop.name.text === '"rootDir"');
  if (rootDir == null) {
    replacements.push({start: coAst.start + 1, end: coAst.start + 1,
      replacement: '\n    "rootDir": ".",'});
  }
  if (replacements.length > 0) {
    fileContent = replacePatches(fileContent, replacements);
    fs.writeFileSync('tsconfig.json', fileContent);
    log.info('tsconfig.json is updated.');
  }
}

export default function initRedux() {
  // const pkjsonStr = fs.readFileSync(Path.resolve('package.json'), 'utf8');
  // const pkjson = JSON.parse(pkjsonStr);

  // const replText = [] as ReplacementInf[];
  // const ast = parseJson(pkjsonStr);
  // // console.log(JSON.stringify(ast, null, '  '));
  // if (pkjson.dependencies['@reduxjs/toolkit'] == null && pkjson.devDependencies['@reduxjs/toolkit'] == null) {
  //   const devDepAst = ast.properties.find(prop => prop.name.text === 'devDependencies');
  //   if (!devDepAst) {

  //   }
  //   const insertPoint = devDepAst.start + 1;
  //   replText.push({start: insertPoint, end: insertPoint, text: '\n    "@reduxjs/toolkit": "",'});
  // }
}
