import plink from '__plink';

import {stringifyListAllVersions} from './artifacts';

export function activate() {
  plink.router().get('/_githash', async (req, res) => {
    res.setHeader('content-type', 'text/plain');
    res.send(await stringifyListAllVersions());
  });
}
