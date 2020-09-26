import {getState, workspaceKey} from './index';
import fs from 'fs';

export function writeInstallJson() {
  const ws = getState().workspaces.get(workspaceKey(process.cwd()));
  fs.writeFileSync('package.json', ws!.installJsonStr);
}
