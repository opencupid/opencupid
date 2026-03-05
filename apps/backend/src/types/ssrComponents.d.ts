declare module '*.ssr.mjs' {
  type DefineComponent = import('vue').DefineComponent
  type EmailTemplateProps = import('../services/email/types').EmailTemplateProps

  const component: DefineComponent<EmailTemplateProps, {}, any>
  export default component
}
