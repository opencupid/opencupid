import 'bootstrap-vue-next'

// Per bvn docs (https://bootstrap-vue-next.github.io/bootstrap-vue-next/docs/types.html#extending-types):
// extend BaseColorVariant with custom theme colors (auto-inherited into
// BaseButtonVariant via `extends`); add `outline-*` counterparts to
// BaseButtonVariant explicitly because BaseColorVariantOutline is a frozen
// mapped type that doesn't auto-derive from augmented BaseColorVariant.
//
// NOTE: this file must be included by every tsconfig project that
// type-checks .vue files using bvn components — see tsconfig.vitest.json's
// include list. A child tsconfig's `include` replaces the parent's, so
// vitest project must list this file explicitly even though it extends
// tsconfig.app.json.
declare module 'bootstrap-vue-next' {
  export interface BaseColorVariant {
    dating: unknown
    'dating-light': unknown
    social: unknown
    tag: unknown
    muted: unknown
    highlight: unknown
    'post-it': unknown
  }

  export interface BaseButtonVariant {
    'outline-dating': unknown
    'outline-dating-light': unknown
    'outline-social': unknown
    'outline-tag': unknown
    'outline-muted': unknown
    'outline-highlight': unknown
    'outline-post-it': unknown
  }
}
