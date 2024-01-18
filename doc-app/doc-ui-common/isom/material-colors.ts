/**
 * @material/theme/_theme-color.scss 
 */
// import Color from 'color';

type ThemeColors = {[theme: string]: {
  primary?: string;
  'on-primary'?: string;
  accent?: string;
  secondary?: string;
  'on-secondary'?: string;
  background?: string;
  surface?: string;
  'on-surface'?: string;
  error?: string;
  'on-error'?: string;
};
};

const colors: ThemeColors = {
  light: {
    primary: '#2e2b10',
    'on-primary': '#e0e0e0',
    secondary: '#ce93d8',
    'on-secondary': '#2e2b10',
    surface: '#ffffff',
    background: 'e0e0e0',
    'on-surface': '#2e2b10'
  }
};

export default colors;

