import {config, InjectorConfigHandler} from '@wfh/plink';

/**
 * Package setting type
 */
export interface PrebuildSetting {
  /** Build target Git remote name */
  prebuildDeployRemote: string;
  /** Build targe Git branch name */
  prebuildDeployBranch: string;
  /** Build target Git remote name for tag only */
  tagPushRemote: string;

  byEnv: {[env: string]: {
    installEndpoint: string;
    sendConcurrency: number;
    sendNodes: number;
  }; };
}

/**
 * Plink runs this funtion to get package level setting value,
 * function name "defaultSetting" must be also configured in package.json file
 */
export function defaultSetting(): PrebuildSetting {
  const defaultValue: PrebuildSetting = {
    prebuildDeployRemote: 'deploy',
    prebuildDeployBranch: 'release-server',
    tagPushRemote: 'origin',
    byEnv: {
      local: {
        installEndpoint: 'http://localhost:14333',
        sendConcurrency: 1,
        sendNodes: 1
      }
    }
  };
  return defaultValue;
}

/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export function getSetting() {
  /* eslint-disable dot-notation,@typescript-eslint/dot-notation */
  return config()['@wfh/prebuild']!;
}

const otherConfigures: InjectorConfigHandler = {
    /** For Node.js runtime, replace module in "require()" or import syntax */
    setupNodeInjector(factory, setting) {
      // factory.fromPackage('@wfh/foobar').alias('moduleA', 'moduleB');
    },
    /** For Client framework build tool (React, Angular), replace module in "require()" or import syntax */
    setupWebInjector(factory, setting) {
      // factory.fromPackage('@wfh/foobar').alias('moduleA', 'moduleB');
    }
};

export default otherConfigures;
