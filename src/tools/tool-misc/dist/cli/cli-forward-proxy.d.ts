export declare function start(port: number, hostMap?: Map<string, string>, opts?: {
    /** if host is not in hostMap, forward to this proxy */
    fallbackProxyHost: string;
    fallbackproxyPort: number;
}): () => void;
