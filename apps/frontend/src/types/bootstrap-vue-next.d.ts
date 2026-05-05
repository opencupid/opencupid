import 'bootstrap-vue-next'

// Per bvn docs (https://bootstrap-vue-next.github.io/bootstrap-vue-next/docs/types.html#extending-types):
// extend BaseColorVariant with custom theme colors, and BaseButtonVariant with
// the explicit `outline-*` counterparts (bvn doesn't auto-derive them).
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
    dating: unknown
    'dating-light': unknown
    social: unknown
    tag: unknown
    muted: unknown
    highlight: unknown
    'post-it': unknown
    'outline-dating': unknown
    'outline-dating-light': unknown
    'outline-social': unknown
    'outline-tag': unknown
    'outline-muted': unknown
    'outline-highlight': unknown
    'outline-post-it': unknown
  }
}
