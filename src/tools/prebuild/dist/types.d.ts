export interface Configuration {
    prebuildGitRemote: string;
    prebuildReleaseBranch: string;
    installEndpoint: {
        [env: string]: string;
    };
    tagPushRemote?: string;
}
