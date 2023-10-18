import {config} from '@wfh/plink';

export default function openBrowser(url: string): boolean {
  const setting = config()['@wfh/cra-scripts'].openBrowser;
  if (setting !== false) {
    return require('react-dev-utils/openBrowser')(setting ? setting : url);
  }
  return true;
}
