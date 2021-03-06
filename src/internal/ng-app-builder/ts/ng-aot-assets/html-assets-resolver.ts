
import parseHtml, {AttributeValueAst, OpenTagAst} from '../utils/ng-html-parser';
import patchText, {Replacement as Rep} from '../utils/patch-text';
import api from '__api';
import Url from 'url';
import * as _ from 'lodash';
import {Observable, of, forkJoin} from 'rxjs';
import {map} from 'rxjs/operators';
const chalk = require('chalk');
const log = require('log4js').getLogger('ng-app-builder.html-assets-resolver');

// export enum ReplaceType {
// 	resolveUrl, loadRes
// }
const toCheckNames = ['href', 'src', 'ng-src', 'ng-href', 'srcset', 'routerLink'];

export function replaceForHtml(content: string, resourcePath: string,
  callback: (text: string) => Observable<string>): Observable<string> {
  let ast: OpenTagAst[];
  try {
    ast = parseHtml(content).tags;
  } catch (e) {
    log.error(`${resourcePath}: template parsing failed\n${content}`, e);
    throw e;
  }
  // const proms: Array<PromiseLike<any>> = [];
  const dones: Observable<Rep>[] = [];
  const resolver = new AttrAssetsUrlResolver(resourcePath, callback);
  for (const el of ast) {
    // if (el.name === 'script')
    // 	continue;
    for (const name of toCheckNames) {
      if (_.has(el.attrs, name)) {
        const value = el.attrs![name].value;
        if (el.attrs![name].isNg || value == null || value.text.indexOf('{{') >= 0 )
          continue;
        const resolved$ = resolver.resolve(name, value, el);
        if (resolved$)
          dones.push(resolved$);
      }
    }
  }
  if (dones.length > 0)
    return forkJoin(dones).pipe(map(replacements => patchText(content, replacements)));
  else
    return of(content);
}

class AttrAssetsUrlResolver {
  packagename: string | undefined;
  constructor(private resourcePath: string, private callback: (text: string) => Observable<string>) {
    const pk = api.findPackageByFile(resourcePath);
    if (pk)
      this.packagename = pk.longName;
  }
  resolve(attrName: string, valueToken: AttributeValueAst,
    el: OpenTagAst): Observable<Rep> | null {
    if (!valueToken)
      return null;
    if (attrName === 'srcset') {
      // img srcset
      const value = this.doSrcSet(valueToken.text);
      return value.pipe(map(value => new Rep(valueToken.start, valueToken.end, value)));
      // replacements.push(new Rep(valueToken.start, valueToken.end, value));
    } else if (attrName === 'src') {
      // img src
      const url = this.doLoadAssets(valueToken.text);
      return url.pipe(map(url => new Rep(valueToken.start, valueToken.end, url)));
    } else if (attrName === 'routerLink') {
      if (valueToken.text.startsWith('assets://')) {
        const replWith = '/' + (this.packagename ?
            api.ngRouterPath(this.packagename, valueToken.text) :
            api.ngRouterPath(valueToken.text));
        log.warn(`Use "${replWith}" instead of "%s" in routerLink attribute (%s)`, valueToken.text, this.resourcePath);
        return of (new Rep(valueToken.start, valueToken.end, replWith));
      }
      const url = this.resolveUrl(valueToken.text);
      const parsedUrl = Url.parse(url, false, true);
      return of(new Rep(valueToken.start, valueToken.end, parsedUrl.path + (parsedUrl.hash ? parsedUrl.hash : '')));
    } else { // href, ng-src, routerLink
      const url = this.resolveUrl(valueToken.text);
      return of(new Rep(valueToken.start, valueToken.end, url));
    }
  }
  private doSrcSet(value: string) {
    const urlSets$s = value.split(/\s*,\s*/).map(urlSet => {
      urlSet = _.trim(urlSet);
      const factors = urlSet.split(/\s+/);
      const image = factors[0];
      return this.doLoadAssets(image)
      .pipe(map(url => url + factors[1]));
    });
    return forkJoin(urlSets$s).pipe(map(urlSets => urlSets.join(', ')));
  }

  private resolveUrl(href: string) {
    if (href === '')
      return href;
    var normalUrlObj = api.normalizeAssetsUrl(href, this.resourcePath);
    if (_.isObject(normalUrlObj)) {
      const res = normalUrlObj as any;
      const resolved = res.isPage ?
        api.entryPageUrl(res.packageName, res.path, res.locale) :
        api.assetsUrl(res.packageName, res.path);
      log.info(`resolve URL/routePath ${chalk.yellow(href)} to ${chalk.cyan(resolved)},\n` +
        chalk.grey(this.resourcePath));
      return resolved;
    }
    return href;
  }

  private doLoadAssets(src: string): Observable<string> {
    if (src.startsWith('assets://') || src.startsWith('page://')) {
      const normalUrlObj = api.normalizeAssetsUrl(src, this.resourcePath);
      if (_.isObject(normalUrlObj)) {
        const res = normalUrlObj as any;
        return of(res.isPage ?
          api.entryPageUrl(res.packageName, res.path, res.locale) :
          api.assetsUrl(res.packageName, res.path));
      }
    }

    if (/^(?:https?:|\/\/|data:)/.test(src))
      return of(src);
    if (src.charAt(0) === '/')
      return of(src);

    if ((!src.startsWith('npm://')) && src.charAt(0) !== '~' && src.charAt(0) !== '.' && src.trim().length > 0 && src.indexOf('{') < 0)
      src = './' + src;

    return this.callback(src);
  }
}
