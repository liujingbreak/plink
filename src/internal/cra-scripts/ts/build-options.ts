export interface BuildOptions {
  statsJson: boolean;
  progress: boolean;
}

export interface CommandOption {
  buildType: 'lib' | 'app';
  buildTarget: string;
  watch: boolean;
  argv: Map<string, string|boolean>;
}
