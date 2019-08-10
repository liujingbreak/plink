import Graph from '../ts-dep';
import {jsonToCompilerOptions} from 'dr-comp-package/wfh/dist/ts-compiler';
import api from '__api';
import { sys } from 'typescript';
import { AngularBuilderOptions } from './common';
import Path from 'path';


export function addSourceFiles(compilerOptions: any, entryFiles: string[], tsconfigFile: string,
  fileReplacements: AngularBuilderOptions['fileReplacements']) {

  const projDir = Path.dirname(tsconfigFile);
  const g = new Graph(jsonToCompilerOptions(compilerOptions), fileReplacements,
    file => {
      const content = sys.readFile(file, 'utf8');
      return api.browserInjector.injectToFile(file, content || '');
    });
  for (const entryFile of entryFiles) {
    g.walkForDependencies(Path.resolve(projDir, entryFile));
  }

  return Array.from(g.walked.values())
    .map(file => Path.relative(projDir, file).replace(/\\/g, '/'));
}
