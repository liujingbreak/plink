/* eslint-disable  max-classes-per-file */
/**
 * Same function as react-dev-utils/InlineChunkHtmlPlugin, but does not rely on HtmlWebpackPlugin
 */
import { Compiler } from 'webpack';
const { RawSource } = require('webpack-sources');
import parseHtml from '../utils/ng-html-parser';
import * as _ from 'lodash';
import replaceCode, {ReplacementInf} from '../utils/patch-text';
import htmlLoader = require('../loaders/ng-html-loader');
import * as Path from 'path';
  const smUrl = require('source-map-url');
import api from '__api';
const log = require('log4js').getLogger(api.packageName + '.index-html-plugin');

export interface IndexHtmlPluginOptions {
  indexFile: string;
  inlineChunkNames: string[];
  baseHref?: string;
}

class MockLoaderContext {
  resourcePath = ''; // To override super interface
  constructor() {}

  loadModule(path: string, callback: (err: Error, source?: any, sourceMap?: any, module?: any) => void) {
      callback(new Error(`index.html does not support requesting relative resource URL like "${path}".` +
        'only supports resource url in form of : <assets|page>://<package-name>/<resource>'));
  }
}

export default class IndexHtmlPlugin {
  inlineChunkSet = new Set<string>();
  indexOutputPath: string;

  constructor(public options: IndexHtmlPluginOptions) {
    this.indexOutputPath = Path.basename(this.options.indexFile);
    for (const name of options.inlineChunkNames) {
      this.inlineChunkSet.add(name);
    }
  }
  apply(compiler: Compiler) {
    compiler.hooks.emit.tapPromise('drcp-index-html-plugin', async compilation => {
      const htmlSrc = compilation.assets[this.indexOutputPath];
      let source: string = htmlSrc.source();
      source = await transformHtml(source, {baseHref: this.options.baseHref}, (srcUrl) => {
        const match = /([^/.]+)(?:\.[^/.]+)+$/.exec(srcUrl);
        if (match && this.inlineChunkSet.has(match[1])) {
          return smUrl.removeFrom(compilation.assets[match[0]].source());
        }
        return null;
      });

      compilation.assets[this.indexOutputPath] = new RawSource(source);
    });
  }
}

export async function transformHtml(this: void,
  html: string,
  buildOptions: {baseHref?: string},
  inlineReplace: (srcUrl: string) => string | null | void) {

  const compile = _.template(html);
  const replacements: ReplacementInf[] = [];
  html = compile({
    api,
    require
  });
  // Following line must be prior to `TemplateParser.parse()`, TemplateParser
  // has limitation in parsing `<script>inline code ...</script>`
  html = await htmlLoader.compileHtml(html, new MockLoaderContext());
  let hasBaseHref = false;
  const parsed = parseHtml(html);
  for (const comment of parsed.comments) {
    replacements.push({
      start: comment.pos,
      end: comment.end,
      text: ''
    });
  }
  for (const ast of parsed.tags) {
    const tagName = ast.name.toLowerCase();
    const attrs = ast.attrs;
    if (tagName === 'script' && attrs) {
      const srcUrl = _.get(attrs.src || attrs.SRC, 'value');
      if (srcUrl == null)
        continue;
      const inlineContent = inlineReplace(srcUrl.text);
      if (inlineContent != null) {
        replacements.push({
          start: ast.start, end: ast.end, text: '<script>' + inlineContent
        });
        log.info(`Inline "${srcUrl.text}"`);
      }
    } else if (tagName === 'base') {
      hasBaseHref = true;
      if (!buildOptions.baseHref)
        continue;
      const href: string | undefined = _.get<any, any>(attrs, 'href.value.text');
      if (href !== buildOptions.baseHref!) {
        const baseHrefHtml = html.slice(ast.start, ast.end);
        log.error(`In your index HTML, ${baseHrefHtml} is inconsistent to Angular cli configuration 'baseHref="${buildOptions.baseHref}"',\n` +
          `you need to remove ${baseHrefHtml} from index HTML file, let Angular insert for you.`);
      }
    }
    // console.log(tagName, attrs);
  }
  if (!hasBaseHref && !buildOptions.baseHref) {
    const msg = 'There is neither <base href> tag in index HTML, nor Angular cli configuration "baseHref" being set';
    log.error('Error:', msg);
    throw new Error(msg);
  }
  if (replacements.length > 0) {
    html = replaceCode(html, replacements);
  }
  // log.warn(html);
  return html;
}
