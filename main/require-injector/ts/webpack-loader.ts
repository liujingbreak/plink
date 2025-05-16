import * as wp from 'webpack';
import _ from 'lodash';
import Injector from './replace-require';
import ts from 'typescript';

type LoaderContext = wp.loader.LoaderContext;

interface LoaderContextWithOptions extends LoaderContext {
  query: LoaderOptions;
}

export interface LoaderOptions {
  injector: Injector;
  /** cache should return compiled AST:sourceFile */
  astCache?(resource: string): ts.SourceFile | undefined | null;
  /** If you don't provide astCache, a new AST is created and can be returned by this call back */
  onAstCreated?(resource: string, ast: ts.SourceFile): void;
}

const loader: wp.loader.Loader = function(this: LoaderContextWithOptions, content, sourcemap) {
  var callback = this.async();
  if (!callback)
    throw new Error('require-injector only supports async loader');
  try {
    const {content: newContent} = load(content, this);
    callback(null, newContent);
  } catch (ex) {
    callback(ex);
  }
};

export {loader as default};

function load(content: string | Buffer, loader: LoaderContextWithOptions) {
  var rj = loader.query.injector || new Injector({noNode: true});
  var file = loader.resourcePath;
  let inputAst: ReturnType<NonNullable<LoaderOptions['astCache']>>;
  if (loader.query.astCache != null) {
    inputAst = loader.query.astCache(loader.resourcePath);
  }

  const {replaced, patches, ast} = rj.injectToFileWithPatchInfo(file, content as string, inputAst || undefined);
  if (loader.query.onAstCreated != null) {
    loader.query.onAstCreated(file, ast);
  }
  return {
    content: replaced,
    ast,
    patches
  };
}
