import { loader as wbLoader } from 'webpack';
interface LoaderContext {
    loadModule: wbLoader.LoaderContext['loadModule'];
    resourcePath: wbLoader.LoaderContext['resourcePath'];
}
declare const loader: wbLoader.Loader & {
    compileHtml: (content: string, loader: LoaderContext) => Promise<string>;
};
export = loader;
