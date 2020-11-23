// import parseJson, {Ast} from '@wfh/plink/wfh/dist/utils/json-sync-parser';
// import replaceCode, {ReplacementInf} from '@wfh/plink/wfh/dist/utils/patch-text';
import parse, { ObjectAst } from '@wfh/plink/wfh/dist/utils/json-sync-parser';
import replacePatches, { ReplacementInf } from '@wfh/plink/wfh/dist/utils/patch-text';
import fs from 'fs';
import log4js from 'log4js';

const log = log4js.getLogger('cra');

export async function initTsconfig() {
  // const {default: parse} = await import('@wfh/plink/wfh/dist/utils/json-sync-parser');
  overrideTsConfig();
}

function overrideTsConfig() {
  const baseCompileOptions = JSON.parse(fs.readFileSync(require.resolve('@wfh/plink/wfh/tsconfig-base.json'), 'utf8')).compilerOptions;

  let fileContent = fs.readFileSync('tsconfig.json', 'utf8');
  const ast = parse(fileContent);
  let pMap = new Map(ast.properties.map(el => [/^"(.*)"$/.exec(el.name.text)![1], el]));

  // Due to react-scripts does not recoganize "extends" in tsconfig.json: react-scripts/config/modules.js
  const currCoPropsAst = (pMap.get('compilerOptions')!.value as ObjectAst).properties;
  const lastPropEndPos = currCoPropsAst[currCoPropsAst.length - 1].value.end;
  const currCoMap = new Map(currCoPropsAst.map(el => [/^"(.*)"$/.exec(el.name.text)![1], el]));
  const replacements: ReplacementInf[] = [{
    start: lastPropEndPos, end: lastPropEndPos,
    replacement: '\n'
  }];

  for (const [key, value] of Object.entries(baseCompileOptions)) {
    if (!currCoMap.has(key)) {
      log.info(`Add compiler option: ${key}:${value}`);
      replacements.push({
        start: lastPropEndPos, end: lastPropEndPos,
        replacement: `,\n    "${key}": ${JSON.stringify(value)}`
      });
    }
  }
  if (replacements.length === 1) {
    replacements.splice(0, 1);
  }

  // const baseTsConfig = Path.relative(process.cwd(), require.resolve('@wfh/plink/wfh/tsconfig-base.json')).replace(/\\/g, '/');

  // if (!pMap.has('extends')) {
  //   replacements.push({start: 1, end: 1, replacement: `\n  "extends": "${baseTsConfig}",`});
  // } else if ((pMap.get('extends')!.value as Token).text.slice(1, -1) !== baseTsConfig) {
  //   log.info('Update ' + Path.resolve('tsconfig.json'));
  //   const extendValueToken = (pMap.get('extends')!.value as Token);
  //   replacements.push({start: extendValueToken.pos + 1, end: extendValueToken.end - 1, replacement: baseTsConfig});
  // }
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
