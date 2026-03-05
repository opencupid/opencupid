declare module "../../../dist-ssr/EmailTemplate.ssr.mjs" {
  type DefineComponent = import("vue").DefineComponent;
  type SimpleEmailProps = import("../services/email/types").EmailTemplateProps;

  const component: DefineComponent<SimpleEmailProps, {}, any>;
  export default component;
}