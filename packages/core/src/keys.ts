// Cosense resolves page links, hashtags, and titles case-insensitively: `[foo]`,
// `#Foo`, and a page titled "FOO" all refer to the same page, and the author has
// no way to tell case-variant tags apart. So every place that matches an
// author-supplied tag or title against page data must normalize through this
// single helper — otherwise matches that work on Cosense silently break, and,
// worst of all, an `excludeTags` entry written as `#Draft` fails *open* and
// leaks a page that was meant to stay unpublished.
//
// `titleKey` (internal-link resolution in resolve/links.ts) delegates here so
// the whole codebase shares one definition of "the same name".
export function normalizeKey(value: string): string {
  return value.toLowerCase();
}
