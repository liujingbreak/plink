export interface BuildOptions {
    statsJson: boolean;
    progress: boolean;
}
export interface CommandOption {
    buildType: 'lib' | 'app';
    buildTarget: string;
    watch: boolean;
    devMode: boolean;
    publicUrl?: string;
}
