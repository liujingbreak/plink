import webpack, {compilation} from 'webpack';
import {AngularCliParam} from './common';
import changeWebpackConfig, {transformIndexHtml} from '../config-webpack';

export class BuilderContext {
    compilation: Promise<compilation.Compilation>;
    _setCompilation: (value: compilation.Compilation) => void;

    constructor() {
        this.compilation = new Promise<compilation.Compilation>(resolve => {
            this._setCompilation = resolve;
        });
    }

    configWebpack(param: AngularCliParam, webpackConfig: webpack.Configuration,
        drcpConfigSetting: {devMode: boolean}) {
        changeWebpackConfig(this, param, webpackConfig, drcpConfigSetting);
    }

    transformIndexHtml(content: string) {
        return transformIndexHtml(this, content);
    }
}
