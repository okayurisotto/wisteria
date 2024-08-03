# parcom

This is a simple parser combinator library designed to painlessly parse complex strings that regular expressions alone cannot handle. Although initially implemented for use with the `http-signature` package, it is versatile and applicable to various use cases. Refer to test code for specific usage.

## Performance Advice

In JavaScript, using a single large regular expression is more performant than using multiple small ones. Therefore, it is advisable to use a large regular expression with `pattern()` and use this library as a supplementary tool.
