export interface Task<T> {
    exit: boolean;
    file: string;
    exportFn: string;
    args?: any[];
}
