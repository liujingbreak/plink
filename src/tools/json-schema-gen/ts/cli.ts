#!/usr/bin/env node
// import {program} from 'commander';
import pk from '../package.json';
import Path from 'path';
import * as fs from 'fs-extra';
import {getTsDirsOfPackage} from '@wfh/plink/wfh/dist/utils/misc';
import log4js from 'log4js';
import * as TJS from 'typescript-json-schema';
import Selector from '@wfh/prebuild/dist/ts-ast-query';
import glob from 'glob';
import {CliExtension, GlobalOptions, initConfigAsync, initProcess} from '@wfh/plink/wfh/dist';
import pkgUtils from '@wfh/plink/wfh/dist/package-utils';

const baseTsconfig = require('@wfh/plink/wfh/tsconfig-base.json');

const log = log4js.getLogger(pk.name);

const cliExt: CliExtension = (program, withGlobalOptions) => {
  const cmd = program.command('json-schema-gen [package...]')
  .description('Scan packages and generate json schema. ' +
  'You package.json file must contains:\n  "dr": {jsonSchema: "<interface files whose path is relative to package directory>"}')
  .option('-f, --file <spec>', 'run single file')
  .action(async (packages: string[]) => {
    await initConfigAsync(cmd.opts() as GlobalOptions);
    initProcess();
    const dones: Promise<void>[] = [];

    const packageUtils = require('@wfh/plink/wfh/dist/package-utils') as typeof pkgUtils;

    const onComponent: pkgUtils.FindPackageCb = (name, entryPath, parsedName, json, packagePath) => {
      dones.push(new Promise((resolve, reject) => {
        const dirs = getTsDirsOfPackage(json);

        if (json.dr && json.dr.jsonSchema) {
          const schemaSrcDir =json.dr.jsonSchema as string;
          log.info(`package ${name} has JSON schema: ${schemaSrcDir}`);
          // packagePath = fs.realpathSync(packagePath);

          glob(schemaSrcDir, {cwd: packagePath}, (err, matches) => {
            log.info('Found schema source', matches);

            const compilerOptions: TJS.CompilerOptions = {...baseTsconfig.compilerOptions, rootDir: packagePath};

            const tjsPgm = TJS.getProgramFromFiles(matches.map(path => Path.resolve(packagePath, path)), compilerOptions, packagePath);
            const generator = TJS.buildGenerator(tjsPgm, {});
            const symbols: string[] = [];
            for (const filename of matches) {
              const tsFile = Path.resolve(packagePath, filename);
              const astQuery = new Selector(fs.readFileSync(tsFile, 'utf8'), tsFile);
              symbols.push(...astQuery.findAll(':SourceFile>.statements:InterfaceDeclaration>.name:Identifier').map(ast => ast.getText()));
            }
            if (generator) {
              const output: any = {};
              for (const syb of symbols) {
                log.info('Schema for ', syb);
                output[syb] = generator.getSchemaForSymbol(syb);
              }
              const outFile = Path.resolve(packagePath, dirs.isomDir, 'json-schema.json');
              fs.mkdirpSync(Path.resolve(packagePath, dirs.isomDir));
              fs.writeFile(
                outFile,
                JSON.stringify(output, null, '  '),
                (err) => {
                  if (err)
                    return reject(err);
                  log.info(' written to ' + outFile);
                  resolve();
                }
              );
            }
          });

        }
      }));
    };
    if (packages && packages.length > 0) {
      packageUtils.lookForPackages(packages, onComponent);
      packageUtils.findAllPackages(packages, onComponent, 'src');
    } else
      packageUtils.findAllPackages(onComponent, 'src');
    await Promise.all(dones);
  });
  withGlobalOptions(cmd);
};

export default cliExt;
