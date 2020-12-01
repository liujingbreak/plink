export interface Configuration {
  prebuildGitRemote: string;
  prebuildReleaseBranch: string;
  tagPushRemote?: string;

  byEnv: {[env: string]: {
    installEndpoint: string;
    sendConcurrency: number;
    /** The number of remote nodes should be waiting for confirming recieved */
    sendNodes: number;
  }};
}
