import { createSSRApp, h } from "vue";
import type { Component } from "vue";
import { renderToString } from "@vue/server-renderer";
import juice from "juice";
import type { SimpleEmailProps } from "./types"


export async function renderEmail(
  component: Component,
  props: SimpleEmailProps,
): Promise<string> {
  const app = createSSRApp(component, props);
  const bodyInner = await renderToString(app);

  const doc = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
</head>
<body style="margin:0;padding:0;">
${bodyInner}
</body>
</html>`;

  // Inline CSS for email client compatibility
  return juice(doc, {
    removeStyleTags: true,          // remove <style> after inlining
    preserveMediaQueries: true,     // keep @media rules if present
    applyStyleTags: true,
    insertPreservedExtraCss: true,
    preserveImportant: true,
  });
}

