export const languages = _LANGUAGES_ as Record<string, string>;
export * from './locales.js';

declare const kParameters: unique symbol;
export interface ParameterizedString<T extends string = string> {
    [kParameters]: T;
}
