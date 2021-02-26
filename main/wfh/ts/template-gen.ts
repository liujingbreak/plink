import Path from 'path';
import {promises, existsSync} from 'fs';
import fse from 'fs-extra';
import {from, Observable, of} from 'rxjs';
import {mergeMap} from 'rxjs/operators';
import chalk from 'chalk';
import _ from 'lodash';
import {getLogger} from 'log4js';
const log = getLogger('plink.template-gen');
export interface TemplReplacement {
  fileMapping?: [RegExp, string][];
  /** lodah template */
  textMapping?: {[key: string]: string};
  /** Suffix name of target file, default: /(?:[tj]sx?|s?css|json|yaml|yml|html|svg)$/ */
  includeTextType?: RegExp;
}

export interface GenerateOption {
  dryrun?: boolean;
  /** By default, after copying all template files to target directory, file name suffix will be trimed,
   *  e.g.
   * 
   *  If the template file is named "foobar.ts.txt", then it will become "foobar.ts" in target directory.
   * 
   */
  keepFileSuffix?: boolean;
}

const lodashTemplateSetting: NonNullable<Parameters<typeof _.template>[1]> = {
  interpolate: /\$__([\s\S]+?)__\$/g,
  evaluate: /\/\*<%([\s\S]+?)%>\*\//g,
  // escape: /<%-([\s\S]+?)%>/g,
  // evaluate: /<%([\s\S]+?)%>/g,
  // interpolate: /<%=([\s\S]+?)%>/g,
  // variable: '',
  // imports: {_: lodash}
};
/**
 * The template file name and directory name is replaced by regular expression,
 * file name suffix is removed, therefor you should use a double suffix as a template
 * file name (like 'hellow.ts.txt' will become 'hellow.ts').
 * 
 * lodash template setting:
 * - interpolate: /\$__([\s\S]+?)__\$/g,
 * - evaluate: /\/\*<%([\s\S]+?)%>\*\//g,
 * 
 * The template file content is replace by lodash template function
 * @param templDir 
 * @param targetDir 
 * @param replacement 
 * @param opt 
 */
export default function generateStructure(
  templDir: string, targetDir: string, replacement: TemplReplacement, opt: GenerateOption = {dryrun: false}) {
  if (replacement.includeTextType == null) {
    replacement.includeTextType = /(?:[tj]sx?|s?css|json|yaml|yml|html|svg)$/;
  }
  if (!opt.dryrun)
    fse.mkdirpSync(targetDir);
  return _recurseDir(templDir, targetDir, replacement, opt).toPromise();
}

function _recurseDir(templDir: string, targetDir: string, replacement: TemplReplacement,
  opt: GenerateOption = {dryrun: false}, targetIsEmpty = false): Observable<any> {
  const dryrun = !!opt.dryrun;
  return from(promises.readdir(templDir)).pipe(
    mergeMap(files => from(files)),
    mergeMap(sub => {
      const absSub = Path.resolve(templDir, sub);
      return from(promises.stat(absSub)).pipe(
        mergeMap(state => {
          if (state.isDirectory()) {
            let newDir = sub;
            for (const [reg, repl] of replacement.fileMapping || []) {
              newDir = newDir.replace(reg, repl);
            }
            newDir = Path.resolve(targetDir, newDir);
            // console.log(newDir, absSub);
            const done$ = dryrun ? of(undefined) :
              from(fse.mkdirp(Path.resolve(targetDir, newDir)));
            return done$.pipe(
              mergeMap(() => _recurseDir(absSub, newDir, replacement, opt, true))
            );
          } else {
            let newFile = sub;
            for (const [reg, repl] of replacement.fileMapping || []) {
              newFile = newFile.replace(reg, repl);
            }
            newFile = Path.resolve(targetDir,
              opt.keepFileSuffix ? newFile : newFile.replace(/\.([^./\\]+)$/, '')
            );

            return (async () => {
              if (targetIsEmpty || !existsSync(newFile)) {
                if (!dryrun) {
                  if (!replacement.includeTextType!.test(newFile)) {
                    await promises.copyFile(absSub, newFile);
                    // tslint:disable-next-line: no-console
                    log.info(`${chalk.cyan(Path.relative(Path.resolve(), newFile))} is copied`);
                  } else {
                    let content = await promises.readFile(absSub, 'utf-8');
                    try {
                      content = _.template(content, lodashTemplateSetting)(replacement.textMapping);
                    } catch (e) {
                      console.error(`In file ${absSub}`);
                      console.error(e);
                    }
                    await promises.writeFile(newFile, content);
                    // tslint:disable-next-line: no-console
                    log.info(`${chalk.cyan(Path.relative(Path.resolve(), newFile))} is written`);
                  }
                } else {
                  // tslint:disable-next-line: no-console
                  log.info(`${chalk.cyan(Path.relative(Path.resolve(), newFile))} is created`);
                }
              } else {
                // tslint:disable-next-line: no-console
                log.info('target file already exists:', Path.relative(Path.resolve(), newFile));
              }
            })();
          }
        })
      );
    })
  );
}
