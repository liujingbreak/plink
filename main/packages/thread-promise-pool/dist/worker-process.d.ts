export interface InitialOptions {
    verbose?: boolean;
    /** After worker being created, the exported function will be run,
     * You can put any initial logic in it, like calling `require('source-map-support/register')` or
     * setup process event handling for uncaughtException and unhandledRejection.
     */
    initializer?: {
        file: string;
        exportFn?: string;
    };
}
export interface Task {
    file: string;
    /**
     * A function which can return Promise or non-Promise value
     */
    exportFn?: string;
    args?: any[];
}
export interface Command {
    exit: boolean;
}
