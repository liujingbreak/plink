"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ng_html_parser_1 = require("../utils/ng-html-parser");
const patch_text_1 = tslib_1.__importStar(require("../utils/patch-text"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const url_1 = tslib_1.__importDefault(require("url"));
const _ = tslib_1.__importStar(require("lodash"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const chalk = require('chalk');
const log = require('log4js').getLogger('ng-app-builder.html-assets-resolver');
// export enum ReplaceType {
// 	resolveUrl, loadRes
// }
const toCheckNames = ['href', 'src', 'ng-src', 'ng-href', 'srcset', 'routerLink'];
function replaceForHtml(content, resourcePath, callback) {
    let ast;
    try {
        ast = new ng_html_parser_1.TemplateParser(content).parse();
    }
    catch (e) {
        log.error(content);
        throw e;
    }
    // const proms: Array<PromiseLike<any>> = [];
    const dones = [];
    const resolver = new AttrAssetsUrlResolver(resourcePath, callback);
    for (const el of ast) {
        if (el.name === 'script')
            continue;
        for (const name of toCheckNames) {
            if (_.has(el.attrs, name)) {
                const value = el.attrs[name].value;
                if (el.attrs[name].isNg || value == null || value.text.indexOf('{{') >= 0)
                    continue;
                dones.push(resolver.resolve(name, el.attrs[name].value, el));
            }
        }
    }
    if (dones.length > 0)
        return rxjs_1.forkJoin(dones).pipe(operators_1.map(replacements => patch_text_1.default(content, replacements)));
    else
        return rxjs_1.of(content);
}
exports.replaceForHtml = replaceForHtml;
class AttrAssetsUrlResolver {
    constructor(resourcePath, callback) {
        this.resourcePath = resourcePath;
        this.callback = callback;
    }
    resolve(attrName, valueToken, el) {
        if (!valueToken)
            return;
        if (attrName === 'srcset') {
            // img srcset
            const value = this.doSrcSet(valueToken.text);
            return value.pipe(operators_1.map(value => new patch_text_1.Replacement(valueToken.start, valueToken.end, value)));
            // replacements.push(new Rep(valueToken.start, valueToken.end, value));
        }
        else if (attrName === 'src') {
            // img src
            const url = this.doLoadAssets(valueToken.text);
            return url.pipe(operators_1.map(url => new patch_text_1.Replacement(valueToken.start, valueToken.end, url)));
        }
        else if (attrName === 'routerLink') {
            const url = this.resolveUrl(valueToken.text);
            const parsedUrl = url_1.default.parse(url);
            return rxjs_1.of(new patch_text_1.Replacement(valueToken.start, valueToken.end, parsedUrl.path + (parsedUrl.hash ? parsedUrl.hash : '')));
        }
        else { // href, ng-src, routerLink
            const url = this.resolveUrl(valueToken.text);
            return rxjs_1.of(new patch_text_1.Replacement(valueToken.start, valueToken.end, url));
        }
    }
    doSrcSet(value) {
        const urlSets$s = value.split(/\s*,\s*/).map(urlSet => {
            urlSet = _.trim(urlSet);
            const factors = urlSet.split(/\s+/);
            const image = factors[0];
            return this.doLoadAssets(image)
                .pipe(operators_1.map(url => url + factors[1]));
        });
        return rxjs_1.forkJoin(urlSets$s).pipe(operators_1.map(urlSets => urlSets.join(', ')));
    }
    resolveUrl(href) {
        if (href === '')
            return href;
        var normalUrlObj = __api_1.default.normalizeAssetsUrl(href, this.resourcePath);
        if (_.isObject(normalUrlObj)) {
            const res = normalUrlObj;
            const resolved = res.isPage ?
                __api_1.default.entryPageUrl(res.packageName, res.path, res.locale) :
                __api_1.default.assetsUrl(res.packageName, res.path);
            log.info(`resolve URL/routePath ${chalk.yellow(href)} to ${chalk.cyan(resolved)},\n` +
                chalk.grey(this.resourcePath));
            return resolved;
        }
        return href;
    }
    doLoadAssets(src) {
        if (src.startsWith('assets://') || src.startsWith('page://')) {
            const normalUrlObj = __api_1.default.normalizeAssetsUrl(src, this.resourcePath);
            if (_.isObject(normalUrlObj)) {
                const res = normalUrlObj;
                return rxjs_1.of(res.isPage ?
                    __api_1.default.entryPageUrl(res.packageName, res.path, res.locale) :
                    __api_1.default.assetsUrl(res.packageName, res.path));
            }
        }
        if (/^(?:https?:|\/\/|data:)/.test(src))
            return rxjs_1.of(src);
        if (src.charAt(0) === '/')
            return rxjs_1.of(src);
        if (src.charAt(0) === '~') {
            src = src.substring(1);
        }
        else if (src.startsWith('npm://')) {
            src = src.substring('npm://'.length);
        }
        else if (src.charAt(0) !== '.' && src.trim().length > 0 && src.indexOf('{') < 0)
            src = './' + src;
        return this.callback(src);
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1hb3QtYXNzZXRzL2h0bWwtYXNzZXRzLXJlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDREQUFrRjtBQUNsRiwwRUFBa0U7QUFDbEUsMERBQXdCO0FBQ3hCLHNEQUFzQjtBQUN0QixrREFBNEI7QUFDNUIsK0JBQThDO0FBQzlDLDhDQUFtQztBQUNuQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO0FBRS9FLDRCQUE0QjtBQUM1Qix1QkFBdUI7QUFDdkIsSUFBSTtBQUNKLE1BQU0sWUFBWSxHQUFHLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUVsRixTQUFnQixjQUFjLENBQUMsT0FBZSxFQUFFLFlBQW9CLEVBQ25FLFFBQThDO0lBQzlDLElBQUksR0FBYSxDQUFDO0lBQ2xCLElBQUk7UUFDSCxHQUFHLEdBQUcsSUFBSSwrQkFBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO0tBQzFDO0lBQUMsT0FBTyxDQUFDLEVBQUU7UUFDWCxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxDQUFDO0tBQ1I7SUFDRCw2Q0FBNkM7SUFDN0MsTUFBTSxLQUFLLEdBQXNCLEVBQUUsQ0FBQztJQUNwQyxNQUFNLFFBQVEsR0FBRyxJQUFJLHFCQUFxQixDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNuRSxLQUFLLE1BQU0sRUFBRSxJQUFJLEdBQUcsRUFBRTtRQUNyQixJQUFJLEVBQUUsQ0FBQyxJQUFJLEtBQUssUUFBUTtZQUN2QixTQUFTO1FBQ1YsS0FB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QUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUN0QyxPQUFPLFNBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQixJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRztZQUN4QixPQUFPLFNBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQixJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO1lBQzFCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3ZCO2FBQU0sSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3BDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNyQzthQUFNLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO1lBQ2hGLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxDQUFDO1FBRWxCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQixDQUFDO0NBQ0QiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctYW90LWFzc2V0cy9odG1sLWFzc2V0cy1yZXNvbHZlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IHtUZW1wbGF0ZVBhcnNlciwgQXR0cmlidXRlVmFsdWVBc3QsIFRhZ0FzdH0gZnJvbSAnLi4vdXRpbHMvbmctaHRtbC1wYXJzZXInO1xuaW1wb3J0IHBhdGNoVGV4dCwge1JlcGxhY2VtZW50IGFzIFJlcH0gZnJvbSAnLi4vdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBVcmwgZnJvbSAndXJsJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgb2YsIGZvcmtKb2lufSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ25nLWFwcC1idWlsZGVyLmh0bWwtYXNzZXRzLXJlc29sdmVyJyk7XG5cbi8vIGV4cG9ydCBlbnVtIFJlcGxhY2VUeXBlIHtcbi8vIFx0cmVzb2x2ZVVybCwgbG9hZFJlc1xuLy8gfVxuY29uc3QgdG9DaGVja05hbWVzID0gWydocmVmJywgJ3NyYycsICduZy1zcmMnLCAnbmctaHJlZicsICdzcmNzZXQnLCAncm91dGVyTGluayddO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVwbGFjZUZvckh0bWwoY29udGVudDogc3RyaW5nLCByZXNvdXJjZVBhdGg6IHN0cmluZyxcblx0Y2FsbGJhY2s6ICh0ZXh0OiBzdHJpbmcpID0+IE9ic2VydmFibGU8c3RyaW5nPik6IE9ic2VydmFibGU8c3RyaW5nPiB7XG5cdGxldCBhc3Q6IFRhZ0FzdFtdO1xuXHR0cnkge1xuXHRcdGFzdCA9IG5ldyBUZW1wbGF0ZVBhcnNlcihjb250ZW50KS5wYXJzZSgpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0bG9nLmVycm9yKGNvbnRlbnQpO1xuXHRcdHRocm93IGU7XG5cdH1cblx0Ly8gY29uc3QgcHJvbXM6IEFycmF5PFByb21pc2VMaWtlPGFueT4+ID0gW107XG5cdGNvbnN0IGRvbmVzOiBPYnNlcnZhYmxlPFJlcD5bXSA9IFtdO1xuXHRjb25zdCByZXNvbHZlciA9IG5ldyBBdHRyQXNzZXRzVXJsUmVzb2x2ZXIocmVzb3VyY2VQYXRoLCBjYWxsYmFjayk7XG5cdGZvciAoY29uc3QgZWwgb2YgYXN0KSB7XG5cdFx0aWYgKGVsLm5hbWUgPT09ICdzY3JpcHQnKVxuXHRcdFx0Y29udGludWU7XG5cdFx0Zm9yIChjb25zdCBuYW1lIG9mIHRvQ2hlY2tOYW1lcykge1xuXHRcdFx0aWYgKF8uaGFzKGVsLmF0dHJzLCBuYW1lKSkge1xuXHRcdFx0XHRjb25zdCB2YWx1ZSA9IGVsLmF0dHJzW25hbWVdLnZhbHVlO1xuXHRcdFx0XHRpZiAoZWwuYXR0cnNbbmFtZV0uaXNOZyB8fCB2YWx1ZSA9PSBudWxsIHx8IHZhbHVlLnRleHQuaW5kZXhPZigne3snKSA+PSAwIClcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0ZG9uZXMucHVzaChyZXNvbHZlci5yZXNvbHZlKG5hbWUsIGVsLmF0dHJzW25hbWVdLnZhbHVlLCBlbCkpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRpZiAoZG9uZXMubGVuZ3RoID4gMClcblx0XHRyZXR1cm4gZm9ya0pvaW4oZG9uZXMpLnBpcGUobWFwKHJlcGxhY2VtZW50cyA9PiBwYXRjaFRleHQoY29udGVudCwgcmVwbGFjZW1lbnRzKSkpO1xuXHRlbHNlXG5cdFx0cmV0dXJuIG9mKGNvbnRlbnQpO1xufVxuXG5jbGFzcyBBdHRyQXNzZXRzVXJsUmVzb2x2ZXIge1xuXHRjb25zdHJ1Y3Rvcihwcml2YXRlIHJlc291cmNlUGF0aDogc3RyaW5nLCBwcml2YXRlIGNhbGxiYWNrOiAodGV4dDogc3RyaW5nKSA9PiBPYnNlcnZhYmxlPHN0cmluZz4pIHtcblx0fVxuXHRyZXNvbHZlKGF0dHJOYW1lOiBzdHJpbmcsIHZhbHVlVG9rZW46IEF0dHJpYnV0ZVZhbHVlQXN0LFxuXHRcdGVsOiBUYWdBc3QpOiBPYnNlcnZhYmxlPFJlcD4ge1xuXHRcdGlmICghdmFsdWVUb2tlbilcblx0XHRcdHJldHVybjtcblx0XHRpZiAoYXR0ck5hbWUgPT09ICdzcmNzZXQnKSB7XG5cdFx0XHQvLyBpbWcgc3Jjc2V0XG5cdFx0XHRjb25zdCB2YWx1ZSA9IHRoaXMuZG9TcmNTZXQodmFsdWVUb2tlbi50ZXh0KTtcblx0XHRcdHJldHVybiB2YWx1ZS5waXBlKG1hcCh2YWx1ZSA9PiBuZXcgUmVwKHZhbHVlVG9rZW4uc3RhcnQsIHZhbHVlVG9rZW4uZW5kLCB2YWx1ZSkpKTtcblx0XHRcdC8vIHJlcGxhY2VtZW50cy5wdXNoKG5ldyBSZXAodmFsdWVUb2tlbi5zdGFydCwgdmFsdWVUb2tlbi5lbmQsIHZhbHVlKSk7XG5cdFx0fSBlbHNlIGlmIChhdHRyTmFtZSA9PT0gJ3NyYycpIHtcblx0XHRcdC8vIGltZyBzcmNcblx0XHRcdGNvbnN0IHVybCA9IHRoaXMuZG9Mb2FkQXNzZXRzKHZhbHVlVG9rZW4udGV4dCk7XG5cdFx0XHRyZXR1cm4gdXJsLnBpcGUobWFwKHVybCA9PiBuZXcgUmVwKHZhbHVlVG9rZW4uc3RhcnQsIHZhbHVlVG9rZW4uZW5kLCB1cmwpKSk7XG5cdFx0fSBlbHNlIGlmIChhdHRyTmFtZSA9PT0gJ3JvdXRlckxpbmsnKSB7XG5cdFx0XHRjb25zdCB1cmwgPSB0aGlzLnJlc29sdmVVcmwodmFsdWVUb2tlbi50ZXh0KTtcblx0XHRcdGNvbnN0IHBhcnNlZFVybCA9IFVybC5wYXJzZSh1cmwpO1xuXHRcdFx0cmV0dXJuIG9mKG5ldyBSZXAodmFsdWVUb2tlbi5zdGFydCwgdmFsdWVUb2tlbi5lbmQsIHBhcnNlZFVybC5wYXRoICsgKHBhcnNlZFVybC5oYXNoID8gcGFyc2VkVXJsLmhhc2ggOiAnJykpKTtcblx0XHR9IGVsc2UgeyAvLyBocmVmLCBuZy1zcmMsIHJvdXRlckxpbmtcblx0XHRcdGNvbnN0IHVybCA9IHRoaXMucmVzb2x2ZVVybCh2YWx1ZVRva2VuLnRleHQpO1xuXHRcdFx0cmV0dXJuIG9mKG5ldyBSZXAodmFsdWVUb2tlbi5zdGFydCwgdmFsdWVUb2tlbi5lbmQsIHVybCkpO1xuXHRcdH1cblx0fVxuXHRwcml2YXRlIGRvU3JjU2V0KHZhbHVlOiBzdHJpbmcpIHtcblx0XHRjb25zdCB1cmxTZXRzJHMgPSB2YWx1ZS5zcGxpdCgvXFxzKixcXHMqLykubWFwKHVybFNldCA9PiB7XG5cdFx0XHR1cmxTZXQgPSBfLnRyaW0odXJsU2V0KTtcblx0XHRcdGNvbnN0IGZhY3RvcnMgPSB1cmxTZXQuc3BsaXQoL1xccysvKTtcblx0XHRcdGNvbnN0IGltYWdlID0gZmFjdG9yc1swXTtcblx0XHRcdHJldHVybiB0aGlzLmRvTG9hZEFzc2V0cyhpbWFnZSlcblx0XHRcdC5waXBlKG1hcCh1cmwgPT4gdXJsICsgZmFjdG9yc1sxXSkpO1xuXHRcdH0pO1xuXHRcdHJldHVybiBmb3JrSm9pbih1cmxTZXRzJHMpLnBpcGUobWFwKHVybFNldHMgPT4gdXJsU2V0cy5qb2luKCcsICcpKSk7XG5cdH1cblxuXHRwcml2YXRlIHJlc29sdmVVcmwoaHJlZjogc3RyaW5nKSB7XG5cdFx0aWYgKGhyZWYgPT09ICcnKVxuXHRcdFx0cmV0dXJuIGhyZWY7XG5cdFx0dmFyIG5vcm1hbFVybE9iaiA9IGFwaS5ub3JtYWxpemVBc3NldHNVcmwoaHJlZiwgdGhpcy5yZXNvdXJjZVBhdGgpO1xuXHRcdGlmIChfLmlzT2JqZWN0KG5vcm1hbFVybE9iaikpIHtcblx0XHRcdGNvbnN0IHJlcyA9IG5vcm1hbFVybE9iaiBhcyBhbnk7XG5cdFx0XHRjb25zdCByZXNvbHZlZCA9IHJlcy5pc1BhZ2UgP1xuXHRcdFx0XHRhcGkuZW50cnlQYWdlVXJsKHJlcy5wYWNrYWdlTmFtZSwgcmVzLnBhdGgsIHJlcy5sb2NhbGUpIDpcblx0XHRcdFx0YXBpLmFzc2V0c1VybChyZXMucGFja2FnZU5hbWUsIHJlcy5wYXRoKTtcblx0XHRcdGxvZy5pbmZvKGByZXNvbHZlIFVSTC9yb3V0ZVBhdGggJHtjaGFsay55ZWxsb3coaHJlZil9IHRvICR7Y2hhbGsuY3lhbihyZXNvbHZlZCl9LFxcbmAgK1xuXHRcdFx0XHRjaGFsay5ncmV5KHRoaXMucmVzb3VyY2VQYXRoKSk7XG5cdFx0XHRyZXR1cm4gcmVzb2x2ZWQ7XG5cdFx0fVxuXHRcdHJldHVybiBocmVmO1xuXHR9XG5cblx0cHJpdmF0ZSBkb0xvYWRBc3NldHMoc3JjOiBzdHJpbmcpOiBPYnNlcnZhYmxlPHN0cmluZz4ge1xuXHRcdGlmIChzcmMuc3RhcnRzV2l0aCgnYXNzZXRzOi8vJykgfHwgc3JjLnN0YXJ0c1dpdGgoJ3BhZ2U6Ly8nKSkge1xuXHRcdFx0Y29uc3Qgbm9ybWFsVXJsT2JqID0gYXBpLm5vcm1hbGl6ZUFzc2V0c1VybChzcmMsIHRoaXMucmVzb3VyY2VQYXRoKTtcblx0XHRcdGlmIChfLmlzT2JqZWN0KG5vcm1hbFVybE9iaikpIHtcblx0XHRcdFx0Y29uc3QgcmVzID0gbm9ybWFsVXJsT2JqIGFzIGFueTtcblx0XHRcdFx0cmV0dXJuIG9mKHJlcy5pc1BhZ2UgP1xuXHRcdFx0XHRcdGFwaS5lbnRyeVBhZ2VVcmwocmVzLnBhY2thZ2VOYW1lLCByZXMucGF0aCwgcmVzLmxvY2FsZSkgOlxuXHRcdFx0XHRcdGFwaS5hc3NldHNVcmwocmVzLnBhY2thZ2VOYW1lLCByZXMucGF0aCkpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICgvXig/Omh0dHBzPzp8XFwvXFwvfGRhdGE6KS8udGVzdChzcmMpKVxuXHRcdFx0cmV0dXJuIG9mKHNyYyk7XG5cdFx0aWYgKHNyYy5jaGFyQXQoMCkgPT09ICcvJylcblx0XHRcdHJldHVybiBvZihzcmMpO1xuXHRcdGlmIChzcmMuY2hhckF0KDApID09PSAnficpIHtcblx0XHRcdHNyYyA9IHNyYy5zdWJzdHJpbmcoMSk7XG5cdFx0fSBlbHNlIGlmIChzcmMuc3RhcnRzV2l0aCgnbnBtOi8vJykpIHtcblx0XHRcdHNyYyA9IHNyYy5zdWJzdHJpbmcoJ25wbTovLycubGVuZ3RoKTtcblx0XHR9IGVsc2UgaWYgKHNyYy5jaGFyQXQoMCkgIT09ICcuJyAmJiBzcmMudHJpbSgpLmxlbmd0aCA+IDAgJiYgc3JjLmluZGV4T2YoJ3snKSA8IDApXG5cdFx0XHRzcmMgPSAnLi8nICsgc3JjO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2FsbGJhY2soc3JjKTtcblx0fVxufVxuIl19
