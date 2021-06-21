/* eslint-disable no-console */
import Graph from '../ts-dep';
import {readTsConfig} from '@wfh/plink/wfh/dist/ts-compiler';
import Path from 'path';

describe('ts-dep', () => {
  xit('When preserveSymlinks = false, walkForDependencies() should can list dependencies', () => {
    const file = Path.resolve('projects/credit-appl/src/app/app.module.ts');
    const co = readTsConfig('tsconfig.json');
    co.preserveSymlinks = false;
    const graph = new Graph(co);
    graph.walkForDependencies(file);

    console.log(graph.requestMap);
    // expect(graph.unresolved.length).toBe(0);
  });

  it('When preserveSymlinks = true, walkForDependencies() should can list dependencies', () => {
    const file = Path.resolve('projects/credit-appl/src/app/app.module.ts');
    const co = readTsConfig('tsconfig.json');
    co.preserveSymlinks = true;
    co.paths = {
    };

    const replacements = [
      {
        replace: 'node_modules/@bk/env/environment.ts',
        with: 'node_modules/@bk/env/environment.dev-proxy.ts'
      },
      {
        replace: 'projects/credit-appl/src/app/project-modules.ts',
        with: 'node_modules/@bk/byj-loan/app/project-modules.ts'
      },
      {
        replace: 'node_modules\\@bk\\module-core\\http-mock\\mock-disable.service.ts',
        with: 'node_modules\\@bk\\module-core\\http-mock\\mock-response.service.ts'
      },
      {
        replace: 'projects\\modules\\app\\core\\http-mock\\mock-disable.service.ts',
        with: 'projects\\modules\\app\\core\\http-mock\\mock-response.service.ts'
      }
    ];
    const graph = new Graph(co, replacements);
    graph.walkForDependencies(file);

    console.log(graph.requestMap);
    // expect(Array.from(graph.walked.values())
    //   .every(file => file.indexOf('node_modules') >= 0)
    // ).toBe(true);
  });
});
