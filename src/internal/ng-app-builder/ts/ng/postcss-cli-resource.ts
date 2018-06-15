/* tslint:disable */
import { interpolateName } from 'loader-utils';
import * as postcss from 'postcss';
import * as url from 'url';
import * as webpack from 'webpack';
import {DrcpApi} from '__api';
// import * as _ from 'lodash';
import * as Path from 'path';
const log = require('log4js').getLogger('postcss-cli-resource');

function wrapUrl(url: string): string {
  let wrappedUrl;
  const hasSingleQuotes = url.indexOf('\'') >= 0;

  if (hasSingleQuotes) {
	wrappedUrl = `"${url}"`;
  } else {
	wrappedUrl = `'${url}'`;
  }

  return `url(${wrappedUrl})`;
}

export interface PostcssCliResourcesOptions {
  deployUrl?: string;
  filename: string;
  loader: any;
}

async function resolve(
  file: string,
  base: string,
  resolver: (file: string, base: string) => Promise<string>
): Promise<string> {
  try {
	return await resolver('./' + file, base);
  } catch (err) {
	return resolver(file, base);
  }
}

export default postcss.plugin('postcss-cli-resources', (options: PostcssCliResourcesOptions) => {
	const api = require('__api') as DrcpApi;
  let { deployUrl, filename, loader } = options;

  const process = async (inputUrl: string, resourceCache: Map<string, string>) => {
	inputUrl = replaceAssetsUrl(api, loader.resourcePath, inputUrl);
	// If root-relative or absolute, leave as is
	if (inputUrl.match(/^(?:\w+:\/\/|data:|chrome:|#|\/)/)) {
	  return inputUrl;
	}
	// If starts with a caret, remove and return remainder
	// this supports bypassing asset processing
	if (inputUrl.startsWith('^')) {
	  return inputUrl.substr(1);
	}

	const cachedUrl = resourceCache.get(inputUrl);
	if (cachedUrl) {
	  return cachedUrl;
	}

	const { pathname, hash, search } = url.parse(inputUrl.replace(/\\/g, '/'));
	const resolver = (file: string, base: string) => new Promise<string>((resolve, reject) => {
	  loader.resolve(base, file, (err: any, result: any) => {
		if (err) {
		  reject(err);
		  return;
		}
		resolve(result);
	  });
	});
	
	const result = await resolve(pathname as string, loader.context, resolver);
	// ------------- hack starts
	let comp = api.findPackageByFile(result);
	// let outputPath = _.trimStart(api.config.get(['outputPathMap', comp.longName]), '/');
	let relativeDir = Path.dirname(Path.relative(comp.packagePath, result)).replace(/\\/g, '/');
	if (relativeDir.startsWith('..')) {
		log.error(`Target resource: ${result}\n, while package is ${comp.realPackagePath}, and dir is ${relativeDir}`);
		throw new Error('Resource path should not starts with "../", caused by symblink');
	}
	// ------------- hack ends

	return new Promise<string>((resolve, reject) => {
	  loader.fs.readFile(result, (err: Error, content: Buffer) => {
		if (err) {
		  reject(err);
		  return;
		}
		// ----------- hack starts
		const outputPath = relativeDir + '/' + interpolateName(
		  { resourcePath: result } as webpack.loader.LoaderContext,
		  filename,
		  { content },
		);
		// ----------- hack ends

		loader.addDependency(result);
		loader.emitFile(outputPath, content, undefined);

		let outputUrl = outputPath.replace(/\\/g, '/');
		if (hash || search) {
		  outputUrl = url.format({ pathname: outputUrl, hash, search });
		}

		if (deployUrl) {
		  outputUrl = url.resolve(deployUrl, outputUrl);
		}

		resourceCache.set(inputUrl, outputUrl);
		log.info(`Url resource ${outputUrl} from ${loader.resourcePath}`);
		resolve(outputUrl);
	  });
	});
  };

  return (root) => {
	const urlDeclarations: postcss.Declaration[] = [];
	root.walkDecls(decl => {
	  if (decl.value && decl.value.includes('url')) {
		urlDeclarations.push(decl);
	  }
	});

	if (urlDeclarations.length === 0) {
	  return;
	}

	const resourceCache = new Map<string, string>();

	return Promise.all(urlDeclarations.map(async decl => {
	  const value = decl.value;
	  const urlRegex = /url\(\s*(?:"([^"]+)"|'([^']+)'|(.+?))\s*\)/g;
	  const segments: string[] = [];

	  let match;
	  let lastIndex = 0;
	  let modified = false;
	  // tslint:disable-next-line:no-conditional-assignment
	  while (match = urlRegex.exec(value)) {
		const originalUrl = match[1] || match[2] || match[3];
		let processedUrl;
		try {
		  processedUrl = await process(originalUrl, resourceCache);
		} catch (err) {
		  loader.emitError(decl.error(err.message, { word: originalUrl }).toString());
		  continue;
		}

		if (lastIndex < match.index) {
		  segments.push(value.slice(lastIndex, match.index));
		}

		if (!processedUrl || originalUrl === processedUrl) {
		  segments.push(match[0]);
		} else {
		  segments.push(wrapUrl(processedUrl));
		  modified = true;
		}

		lastIndex = match.index + match[0].length;
	  }

	  if (lastIndex < value.length) {
		segments.push(value.slice(lastIndex));
	  }

	  if (modified) {
		decl.value = segments.join('');
	  }
	}));
  };
});

// -- hack starts
function replaceAssetsUrl(api: DrcpApi, file: string, url: string) {
	var res = api.normalizeAssetsUrl(url, file);
	if (typeof res === 'string')
		return res;
	else if (res.isTilde)
		return `~${res.packageName}/${res.path}`;
	else
		return api.assetsUrl(res.packageName, res.path);
}
// -- hack ends