import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import glob from 'glob';
import pify from 'pify';
import fs from 'fs';

import ts from 'typescript';
import Selector from '@dr-core/ng-app-builder/dist/utils/ts-ast-query';
const log = require('log4js').getLogger('ng-schematics');

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function help(options: {dir: string}): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.info('This schematics is for:\n\
    Upgrading source code to be compatible to Angular 8.\n\
    Be aware there is not "--dryRun" supported for all commands here\
    '.replace(/^\s+/mg, ''));
    // context.addTask()
    fixViewChild(options.dir);
    return tree;
  };
}

export async function fixViewChild(dir = '.') {
  log.info('scan', dir);
  dir = dir.replace(/\/$/g, '');
  const globAsync = pify(glob);
  const matches: string[] = await globAsync(dir + '/**/*.ts');
  log.info(matches);
  for (const file of matches) {
    const sel = new Selector(fs.readFileSync(file, 'utf8'), file);
    // sel.printAll();
    const foundModule = sel.findWith('^:ImportDeclaration>.moduleSpecifier:StringLiteral',
      (ast: ts.StringLiteral, path, parents) => {
      log.info('-', ast.text);
      if (ast.text === '@angular/core') {
        sel.printAll(ast.parent);
        return sel.findAll(ast.parent, '.namedBindings > .elements > .name')
        .map(node => node.getText(sel.src));
      }
    });
    if (foundModule) {
      log.info('import:', foundModule);
      // sel.printAll();
    }
  }
}
