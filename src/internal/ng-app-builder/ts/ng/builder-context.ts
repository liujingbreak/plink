import webpack, {compilation} from 'webpack';
import {AngularCliParam} from './common';
import changeWebpackConfig, {transformIndexHtml} from '../config-webpack';

export interface BuilderContextOptions {
    inlineChunks: string[];
}

export class BuilderContext {
    inlineAssets: Map<string, string|null> = new Map();
    options: BuilderContextOptions;

    _setCompilation: (value: compilation.Compilation) => void;

    constructor(public ngBuildOption: AngularCliParam, opt?: BuilderContextOptions) {
        if (opt) {
            this.options = opt;
        } else {
            this.options = {inlineChunks: ['runtime']};
        }
        this.options.inlineChunks.forEach(chunkName => this.inlineAssets.set(chunkName, null));
    }

    configWebpack(webpackConfig: webpack.Configuration,
        drcpConfigSetting: {devMode: boolean}) {
        changeWebpackConfig(this, this.ngBuildOption, webpackConfig, drcpConfigSetting);
    }

    transformIndexHtml(content: string) {
        return transformIndexHtml(this, content);
    }
}
