export const languages = _LANGUAGES_;
export * from './locales.js';

declare const kParameters: unique symbol;
export interface ParameterizedString<T extends string = string> {
    [kParameters]: T;
}
