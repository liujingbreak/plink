/**
 * https://devdocs.io/css/transition-timing-function
 */
import bezierEasing from 'bezier-easing';

export const ease = bezierEasing(0.25, 0.1, 0.25, 1);

export const easeIn = bezierEasing(0.42, 0, 1.0, 1);

export const easeOut = bezierEasing(0, 0, 0.58, 1);

export const easeInOut = bezierEasing(0.42, 0, 0.58, 1);
