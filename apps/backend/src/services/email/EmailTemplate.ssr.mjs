import { defineComponent, mergeProps, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderStyle, ssrInterpolate, ssrRenderAttr } from "vue/server-renderer";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "EmailTemplate",
  __ssrInlineRender: true,
  props: {
    siteName: {},
    publicName: {},
    contentBody: {},
    callToActionLabel: {},
    callToActionUrl: {},
    footer: {}
  },
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ style: { "margin": "0", "padding": "0", "background": "#f6f7f9" } }, _attrs))}><div style="${ssrRenderStyle({ "display": "none", "max-height": "0", "overflow": "hidden", "opacity": "0", "color": "transparent", "visibility": "hidden" })}"> Hello ${ssrInterpolate(__props.publicName)} — quick action needed. </div><table role="presentation" class="outer"><tbody><tr><td class="center"><table role="presentation" class="card"><tbody><tr><td class="header"><div class="appName">${ssrInterpolate(__props.siteName)}</div></td></tr><tr><td class="body"><h1 class="title">Hi ${ssrInterpolate(__props.publicName)},</h1><div class="content">${__props.contentBody ?? ""}</div><table role="presentation" class="ctaTable"><tbody><tr><td class="ctaCell"><a${ssrRenderAttr("href", __props.callToActionUrl)} class="ctaButton">${ssrInterpolate(__props.callToActionLabel)}</a></td></tr></tbody></table><p class="fallback"> If the button doesn’t work, copy and paste this URL:<br><a${ssrRenderAttr("href", __props.callToActionUrl)} class="link">${ssrInterpolate(__props.callToActionUrl)}</a></p></td></tr><tr><td class="footer">${ssrInterpolate(__props.footer)}</td></tr></tbody></table></td></tr></tbody></table></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/services/email/EmailTemplate.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  _sfc_main as default
};
