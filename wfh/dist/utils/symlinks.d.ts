/**
 * Do not import any 3rd-party dependency in this file,
 * it is run by `init` command at the time there probably is
 * no dependencies installed yet
 */
export default function scanNodeModules(deleteOption?: 'all' | 'invalid'): Promise<void>;
export declare function linkDrcp(): void;
