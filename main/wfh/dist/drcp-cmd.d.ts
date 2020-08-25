import { PackOptions } from './cmd/types';
export declare function pack(opts: PackOptions & {
    packageDirs: string[];
}): Promise<void>;
export declare function packProject(projectDirs: string[]): Promise<void>;
/**
 *
 * @param output
 * e.g.
npm notice === Tarball Details ===
npm notice name:          require-injector
npm notice version:       5.1.5
npm notice filename:      require-injector-5.1.5.tgz
npm notice package size:  56.9 kB
npm notice unpacked size: 229.1 kB
npm notice shasum:        c0693270c140f65a696207ab9deb18e64452a02c
npm notice integrity:     sha512-kRGVWcw1fvQ5J[...]ABwLPU8UvStbA==
npm notice total files:   47
npm notice

 */
export declare function parseNpmPackOutput(output: string): Map<string, string>;
