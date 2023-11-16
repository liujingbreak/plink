/**
 * @material/theme/_theme-color.scss
 */
type ThemeColors = {
    [theme: string]: {
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
declare const colors: ThemeColors;
export default colors;
