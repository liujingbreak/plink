declare module 'cfonts' {
  export interface FontOption {
    font?: 'block' | 'slick' | 'tiny' | 'grid' | 'pallet' | 'shade' | 'chrome' | 'simple' | 'simpleBlock' | '3d' | 'simple3d' | 'huge' | 'console';
    align?: string;
    colors?: string[];
    background?: string;
    letterSpacing?: number;
    lineHeight?: number;
    space?: boolean;
    maxLength?: number;
    gradient?: false | string[];
    independentGradient?: boolean;
    transitionGradient?: boolean;
    env?: 'node';
  }
  export function say(font: string, opt: FontOption): void;
  export function render(text: string, opt: FontOption): {
    string: string;
    array: string[];
    lines: number;
    options: FontOption;
  };
}
