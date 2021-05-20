import parse, {ObjectAst} from '../utils/json-sync-parser';
import {findPackagesByNames} from './utils';
import replaceText, {ReplacementInf} from '../utils/patch-text';
import {exe} from '../process-utils';
import fs from 'fs';
import Path from 'path';
import {getLogger} from 'log4js';
import _ from 'lodash';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import {plinkEnv} from '../utils/misc';
import {workspacesOfDependencies} from '../package-mgr/package-list-helper';
import {actionDispatcher as pkgDispater, isCwdWorkspace, getState, workspaceDir, workspaceKey} from '../package-mgr/index';
import '../editor-helper';
const log = getLogger('plink.cli-add-package');

export async function addDependencyTo(packages: string[], to?: string, dev = false) {
  if (packages.length === 0) {
    throw new Error('At least specify one dependency argument');
  }
  let wsDirs: string[] = [];
  if (to == null) {
    if (isCwdWorkspace()) {
      to = plinkEnv.workDir;
    } else {
      const ws = getState().currWorkspace;
      if (ws == null) {
        throw new Error('No worktree space is found for current directory, and no "--to" option is specified.\n' +
          'Either execute this command with option "--to <pkg name | pkg dir | worktree space>"' +
          'or in a workstree space directory.');
      }
      to = workspaceDir(ws);
    }
    wsDirs.push(to);
  } else {
    const tryWsKey = workspaceKey(to);
    if (getState().workspaces.has(tryWsKey)) {
      wsDirs.push(Path.resolve(to));
    } else {
      const [foundPkg] = findPackagesByNames([to]);
      if (foundPkg == null) {
        throw new Error('No matched linked package or worktree space is found for option "--to"');
      }
      to = foundPkg.realPath;
      const rootDir = plinkEnv.rootDir;
      wsDirs = Array.from(workspacesOfDependencies(foundPkg.name))
        .map(ws => Path.resolve(rootDir, ws));
    }
  }
  await add(packages, to, dev);
  setImmediate(() => {
    for (const wsDir of wsDirs) {
      pkgDispater.updateWorkspace({dir: wsDir, isForce: false, createHook: false});
    }
  });
}

async function add(packages: string[], toDir: string, dev = false) {
  const targetJsonFile = Path.resolve(toDir, 'package.json');
  const pkgJsonStr = fs.readFileSync(targetJsonFile, 'utf-8');
  const objAst = parse(pkgJsonStr);
  const patches: ReplacementInf[] = [];

  const depsAst = dev ? objAst.properties.find(prop => prop.name.text === '"devDependencies"') :
    objAst.properties.find(prop => prop.name.text === '"dependencies"');

  const depsSet = depsAst == null ?
    new Set<string>() :
    new Set<string>((depsAst.value as ObjectAst).properties.map(prop => prop.name.text.slice(1, -1)));

  log.debug('existing:', depsSet);
  const input = packages.map(rawName => {
    const m = /^((?:@[^/]+\/)?[^/@]+)(?:@([^]+))?$/.exec(rawName);
    if (m) {
      return [m[1], m[2]] as [name: string, ver: string | undefined];
    } else {
      throw new Error(`Invalid package name: ${rawName}, valid name should be like "<pkg name>[@<version>]"`);
    }
  });
  let i = 0;
  let newLines = '';
  const srcPkgs = Array.from(findPackagesByNames(input.map(item => item[0])));

  await Promise.all(srcPkgs.map(async pkg => {
    const inputItem = input[i++];
    let version = inputItem[1];

    if (pkg == null || (pkg.json.dr == null && pkg.json.plink == null)) {
      const name = inputItem[0];
      if (depsSet.has(name)) {
        log.warn(`Found duplicate existing dependency ${chalk.red(name)}`);
        return;
      }
      if (version == null) {
        version = await fetchRemoteVersion(name);
      }
      log.info(`Package ${name}@${version} is not a linked package, add as 3rd party dependency`);
      newLines += `    "${name}": "${version}",\n`;
    } else {
      if (depsSet.has(pkg.name)) {
        log.warn(`Duplicate with existing dependency ${chalk.red(pkg.name)}`);
        return;
      }
      log.info(`Add package ${chalk.cyan(pkg.name)} ${version || ''}`);
      newLines += `    "${pkg.name}": "${version || pkg.json.version}",\n`;
    }
  }));
  if (newLines.length > 0)
    newLines = newLines.slice(0, newLines.length - 2); // trim last comma
  else
    return;
  log.debug(newLines);

  if (depsAst == null) {
    const last = objAst.properties[objAst.properties.length - 1];
    const pos = last.value.end;
    patches.push({start: pos, end: pos,
      text: `,\n  "${dev ? 'devDependencies' : 'dependencies'}": {\n${newLines}\n  }`});
  } else {
    const props = (depsAst.value as ObjectAst).properties;
    let start = 0;
    if (props.length > 0) {
      start = props[props.length - 1].value.end;
      newLines = ',\n' + newLines;
    } else {
      start = depsAst.value.end - 1;
    }

    patches.push({start, end: start, text: newLines});
  }

  const newJsonText = replaceText(pkgJsonStr, patches);
  log.info(`Write file: ${targetJsonFile}:\n` + newJsonText);
  fs.writeFileSync(targetJsonFile, newJsonText);
}

async function fetchRemoteVersion(pkgName: string) {
  const text = stripAnsi(await exe('npm', 'view', pkgName, {silent: true}).promise);
  const rPattern = _.escapeRegExp(pkgName) + '@(\\S*)\\s';
  const pattern = new RegExp(rPattern);
  const m = pattern.exec(text);
  if (m) {
    return m[1];
  }
  throw new Error(`Failed to fetch dependency latest version (pattern: ${pattern}) from message:\n ${text}`);
}
