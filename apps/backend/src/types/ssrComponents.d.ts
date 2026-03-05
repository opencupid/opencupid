declare module "../../../ssr-dist/EmailTemplate.ssr.mjs" {
  type DefineComponent = import("vue").DefineComponent;
  type SimpleEmailProps = import("../services/email/types").SimpleEmailProps;

  const component: DefineComponent<SimpleEmailProps, {}, any>;
  export default component;
}