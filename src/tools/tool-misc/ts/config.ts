export interface Config {
  fillPalettes: {[colorNum: string]: string};
}

const defaultConfig: Config = {
  fillPalettes: {}
};

export default defaultConfig;
