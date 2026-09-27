/** On web the browser's own localStorage is used (absent during static rendering). */
export const authStorage = typeof window === 'undefined' ? undefined : window.localStorage;
