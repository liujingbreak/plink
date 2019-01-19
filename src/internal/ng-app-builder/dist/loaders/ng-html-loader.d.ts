import { loader as wbLoader } from 'webpack';
declare const loader: wbLoader.Loader & {
    compileHtml: (content: string, loader: wbLoader.LoaderContext) => Promise<string>;
};
export = loader;
