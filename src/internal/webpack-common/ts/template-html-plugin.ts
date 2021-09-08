/* eslint-disable  max-classes-per-file */
/**
 * For create-react-app, allow lodash template to be used in any "index.html" file before it goes to html-webpack-plugin.
 * 
 * html-webpack-plugin natually supports template engine like lodash.tempalte, but unfortunately the one in CRA's is not
 * working due to some special configuration from CRA. 
 * 
 * Support lodash template variable "_config" which is a json carries all Plink's configuration properties 
 */
import * as _ from 'lodash';
// import * as Path from 'path';
import { Compiler } from 'webpack';
import _HtmlWebpackPlugin from 'html-webpack-plugin';
import {config} from '@wfh/plink';
import api from '__plink';
// const { RawSource } = require('webpack-sources');

export interface TemplateHtmlPluginOptions {
  htmlFile: string;
}

export default class TemplateHtmlPlugin {
  private htmlWebpackPlugin: typeof _HtmlWebpackPlugin = _HtmlWebpackPlugin;

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('PlinkTemplateHtmlPlugin', compilation => {
      this.htmlWebpackPlugin
        .getHooks(compilation)
        .afterTemplateExecution.tap('PlinkTemplateHtmlPlugin', data => {
          data.html = _.template(data.html)({
            _config: config(),
            __api: api
          });
          return data;
        });
    });
  }
}

export function transformHtml(this: void, html: string) {
  const compile = _.template(html);

  html = compile({
    _config: config(),
    require
  });

  return html;
}
