/**
 * @param action
 * @param dirs
 */
export default function (opts: {
    isSrcDir: boolean;
}, action?: 'add' | 'remove', dirs?: string[]): void;
export declare function listProject(projects?: string[], afterChange?: boolean): void;
