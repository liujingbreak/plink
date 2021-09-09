#!/usr/bin/env node
import Path from 'path';
import * as fs from 'fs-extra';
import {getTscConfigOfPkg} from '@wfh/plink/wfh/dist/utils/misc';
import {log4File} from '@wfh/plink';
import * as TJS from 'typescript-json-schema';
import Selector, {printFile, typescript as ts} from '@wfh/plink/wfh/dist/utils/ts-ast-query';
import glob from 'glob';
import {CliExtension, setTsCompilerOptForNodePath, findPackagesByNames, PackageInfo, cliPackageArgDesc} from '@wfh/plink';

const baseTsconfigFile = require.resolve('@wfh/plink/wfh/tsconfig-base.json');

const log = log4File(__filename);

const cliExt: CliExtension = (program) => {
  program.command('json-schema-gen <package...>').alias('jsg')
  .description('Scan packages and generate json schema. ' +
  'You package.json file must contains:  "dr": {jsonSchema: "<interface files whose path is relative to package directory>"}',
    {package: cliPackageArgDesc})
  .option('-f, --file <spec>', 'run single file')
  .action(async (packages: string[]) => {
    let dones: Promise<any>[];

    const baseTsconfig = ts.parseConfigFileTextToJson(baseTsconfigFile, fs.readFileSync(baseTsconfigFile, 'utf8')).config;

    if (packages && packages.length > 0) {
      dones = Array.from(findPackagesByNames(packages))
      .filter((pkg, i) => {
        if (pkg == null) {
          log.error(`Can not find package for name like: "${packages[i]}"`);
          return false;
        }
        return true;
      })
      .map(pkg => doPackage(pkg!, baseTsconfig.compilerOptions));
      await Promise.all(dones);
    }
  });

  const listAstCmd = program.command('list-ts-ast <file> [ASTPath]').alias('lta')
  .description('List AST of specific TS, TSX file', {
    file: 'Target source file path',
    ASTPath: 'Only list those child nodes that match specific AST node.\n' +
      'Like CSS select\n := ["^"] <selector element> (" " | ">") <selector element>\n' +
      '   where <selector element> := "." <property name> <index>? | ":" <Typescript Syntax kind name> | *\n' +
      '   where <index> := "[" "0"-"9" "]"\n' +
      ' e.g.\n' +
      '   ".elements:ImportSpecifier > .name"\n' +
      '   ".elements[2] > .name"\n' +
      '   "^.statements[0] :ImportSpecifier > :Identifier"\n' +
      ' "^" is equivalent to expression ":SourceFile >" '
  })
  .option('--wt|--with-type', 'Print AST with Typescript syntax type', false)
  .action(async (file: string, ASTPath: string | undefined) => {
    printFile(file, ASTPath || null, listAstCmd.opts().withType);
  });
};

export default cliExt;

function doPackage({json, realPath: packagePath, name}: PackageInfo, baseCompilerOptions: TJS.CompilerOptions) {
  const dirs = getTscConfigOfPkg(json);

  if (json.dr == null || json.dr.jsonSchema == null)
    return Promise.resolve();

  const schemaSrcDir =json.dr.jsonSchema as string;
  log.info(`package ${name} has JSON schema: ${schemaSrcDir}`);
  // packagePath = fs.realpathSync(packagePath);

  return new Promise((resolve, reject) => glob(schemaSrcDir, {cwd: packagePath}, (err, matches) => {
    log.info('Found schema source', matches);

    const co = {...baseCompilerOptions, rootDir: packagePath};
    setTsCompilerOptForNodePath(process.cwd(), packagePath, co);

    const compilerOptions: TJS.CompilerOptions = co;

    const tjsPgm = TJS.getProgramFromFiles(matches.map(path => Path.resolve(packagePath, path)), compilerOptions, packagePath);
    const generator = TJS.buildGenerator(tjsPgm, {});
    const symbols: string[] = [];
    for (const filename of matches) {
      const tsFile = Path.resolve(packagePath, filename);
      const astQuery = new Selector(fs.readFileSync(tsFile, 'utf8'), tsFile);
      symbols.push(
        ...astQuery.findAll('^.statements:InterfaceDeclaration>.name:Identifier').map(ast => ast.getText()),
        ...astQuery.findAll('^:TypeAliasDeclaration > .name').map(ast => ast.getText())
      );
    }
    if (generator) {
      const output: any = {};
      for (const syb of symbols) {
        log.info('Schema for ', syb);
        output[syb] = generator.getSchemaForSymbol(syb);
      }
      const outFile = Path.resolve(packagePath, dirs.isomDir || 'isom', 'json-schema.json');
      fs.mkdirpSync(Path.resolve(packagePath, dirs.isomDir || 'isom'));
      fs.promises.writeFile( outFile, JSON.stringify(output, null, '  '))
      .then(resolve, reject);
    } else {
      throw new Error('Failed to create typescript-json-schema generator');
    }
  }));

}
