export declare function listVersions(env: string): Promise<Map<string, string>>;
export declare function listAllVersions(): Promise<Map<string, Map<string, string>>>;
export declare function stringifyListVersions(env: string): Promise<string>;
export declare function stringifyListAllVersions(): Promise<string>;
export declare function writeMockZip(writeTo: string, content: string): Promise<unknown>;
