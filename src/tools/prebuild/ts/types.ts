export interface DeployParam {
  deploySourceDir: string;
  fileServerEndpoint: string;
  transConcurrency: number;
  numOfFileServerNode: number;
}

export type build<A> = (appName: string, env: string, argv: A) => Promise<DeployParam>;
