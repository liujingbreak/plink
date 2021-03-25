/**
 * This file is intented to run before "npm install" in workspace, should not dependens on any 3rd-party node packages
 */

import fs from 'fs';
import Path from 'path';

if (fs.existsSync('node_modules')) {
  const files = fs.readdirSync('node_modules');
  for (const fname of files) {
    const target = Path.resolve('node_modules', fname);
    try {
      const stat = fs.lstatSync(target);
      if (stat.isDirectory() && fname.startsWith('@')) {
        const scopeDir = target;
        const scopedNames = fs.readdirSync(scopeDir);
        for (const partName of scopedNames) {
          const scopedPkg = Path.resolve(scopeDir, partName);
          try {
            if (fs.lstatSync(scopedPkg).isSymbolicLink()) {
              fs.unlinkSync(scopedPkg);
              // tslint:disable-next-line: no-console
              console.log('[preinstall] delete symlink', scopedPkg);
            }
          } catch (err) {
            // tslint:disable-next-line: no-console
            console.log('[preinstall] delete symlink', scopedPkg);
            fs.unlinkSync(scopedPkg);
          }
        }
      } else if (stat.isSymbolicLink()) {
        // tslint:disable-next-line: no-console
        console.log('[preinstall] delete symlink', target);
        fs.unlinkSync(target);
      }
    } catch (ex) {
      // tslint:disable-next-line: no-console
      console.log('[preinstall] delete symlink', target);
      fs.unlinkSync(target);
    }
  }
}
