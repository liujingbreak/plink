#!/usr/bin/env node
require('source-map-support/register');
import {program} from 'commander';
import pk from '../package.json';
import Path from 'path';
import * as fs from 'fs-extra';
import {getTsDirsOfPackage} from 'dr-comp-package/wfh/dist/utils';
import log4js from 'log4js';
import api from '__api';
import * as TJS from 'typescript-json-schema';
import Selector from '@dr-core/ng-app-builder/dist/utils/ts-ast-query';
import glob from 'glob';
const baseTsconfig = require('dr-comp-package/wfh/tsconfig.json');

const cfg = require('dr-comp-package/wfh/lib/config.js') as typeof api.config;
const logConfig = require('dr-comp-package/wfh/lib/logConfig.js');

const log = log4js.getLogger(pk.name);

program.version(pk.version).name('json-schema-gen')
  .description('Scan packages and generate json schema.\n' +
  'You package.json file must contains:\n  "dr": {jsonSchema: "<interface files whose path is relative to package directory>"}')
  .arguments('[...packages]')
  .passCommandToAction(true);
program.option('-c, --config <config-file>',
  'Read config files, if there are multiple files, the latter one overrides previous one',
  (curr, prev) => prev.concat(curr.split(',')), [] as string[]);
program.option('--prop <property-path=value as JSON | literal>',
  '<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n',
  (curr, prev) => prev.concat(curr), [] as string[]);

program.action(async () => {
  const dones: Promise<void>[] = [];
  await cfg.init({
    config: (program.opts().config as string[]).length === 0 ? undefined : program.opts().config,
    prop: (program.opts().prop as string[])
  });
  logConfig(cfg());

  log.info(program.args);
  const packageUtils = require('dr-comp-package/wfh/lib/packageMgr/packageUtils');

  const packages = program.args;
  if (packages && packages.length > 0)
    packageUtils.findAllPackages(packages, onComponent, 'src');
  // else if (argv.project && argv.project.length > 0) {
  //   packageUtils.findAllPackages(onComponent, 'src', argv.project);
  // }
  else
    packageUtils.findAllPackages(onComponent, 'src');

  function onComponent(name: string, entryPath: string, parsedName: string, json: any, packagePath: string) {
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
  }
  await Promise.all(dones);
});

program.parseAsync(process.argv).catch(e => {
  console.error(e);
  process.exit(1);
});


