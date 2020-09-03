import {getState, pathToWorkspace} from './index';
import fs from 'fs';

export function writeInstallJson() {
  const ws = getState().workspaces.get(pathToWorkspace(process.cwd()));
  fs.writeFileSync('package.json', ws!.installJsonStr);
}
