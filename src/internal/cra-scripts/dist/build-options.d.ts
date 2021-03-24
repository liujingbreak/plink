export interface BuildOptions {
    statsJson: boolean;
    progress: boolean;
}
export interface CommandOption {
    /** "lib" stands for library build mode, "app" stands for application build mode  */
    buildType: 'lib' | 'app';
    /** package name */
    buildTarget: string;
    watch: boolean;
    devMode: boolean;
    /** Be aware that process.env.PUBLIC_URL could be the actual setting approach, do not rely on this property */
    publicUrl?: string;
    includes?: string[];
    webpackEnv: 'development' | 'production';
}
