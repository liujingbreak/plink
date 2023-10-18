import {Configuration} from 'webpack';
import {packages4Workspace} from '@wfh/plink/wfh/dist/package-mgr/package-list-helper';

export function addResolveAlias(config: Configuration) {
  if (config.resolve == null)
    config.resolve = {};
  if (config.resolve?.alias == null)
    config.resolve.alias = {};

  return [...packages4Workspace(undefined, false)]
    .map(pkg => (config.resolve!.alias! as Record<string, string>)[pkg.name] = pkg.realPath);
}

