<script setup lang="ts">
import type { EmailTemplateProps } from './types'

defineProps<EmailTemplateProps>()
</script>

<template>
  <div style="margin: 0; padding: 0; background: #f6f7f9">
    <!-- Preheader (hidden, shows in some inbox previews) -->
    <div
      style="
        display: none;
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        color: transparent;
        visibility: hidden;
      "
    >
      Hello {{ publicName }} — quick action needed.
    </div>

    <table
      role="presentation"
      class="outer"
    >
      <tbody>
        <tr>
          <td class="center">
            <table
              role="presentation"
              class="card"
            >
              <tbody>
                <tr>
                  <td class="header">
                    <div class="appName">{{ siteName }}</div>
                  </td>
                </tr>

                <tr>
                  <td class="body">
                    <h1 class="title">Hi {{ publicName }},</h1>

                    <div
                      class="content"
                      v-html="contentBody"
                    ></div>

                    <table
                      role="presentation"
                      class="ctaTable"
                    >
                      <tbody>
                        <tr>
                          <td class="ctaCell">
                            <a
                              :href="callToActionUrl"
                              class="ctaButton"
                            >
                              {{ callToActionLabel }}
                            </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <p class="fallback">
                      If the button doesn’t work, copy and paste this URL:<br />
                      <a
                        :href="callToActionUrl"
                        class="link"
                      >
                        {{ callToActionUrl }}
                      </a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td class="footer">
                    {{ footer }}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: 'Nunito', 'Poppins', Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: #3e3f3a;
  background-color: #f8f5f0;
}

.outer {
  width: 100%;
  border-collapse: collapse;
  background-color: #f8f5f0;
  margin: 0;
  padding: 24px 16px;
}

.center {
  text-align: center;
  vertical-align: top;
}

.card {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  border-collapse: separate;
  border-spacing: 0;
  background-color: #ffffff;
  border: 1px solid #dfd7ca;
  border-radius: 12px;
}

.header {
  padding: 24px 24px 12px;
  text-align: left;
}

.appName {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  color: #8e8c84;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.body {
  padding: 8px 24px 12px;
  text-align: left;
}

.title {
  margin: 0 0 12px;
  font-size: 24px;
  line-height: 1.25;
  font-weight: 700;
  color: #3e3f3a;
}

.content {
  margin: 0 0 20px;
  font-size: 16px;
  line-height: 1.6;
  color: #3e3f3a;
}

.ctaTable {
  margin: 0 0 20px;
  border-collapse: collapse;
}

.ctaCell {
  text-align: left;
}

.ctaButton {
  display: inline-block;
  padding: 12px 20px;
  border-radius: 8px;
  background-color: rgb(147, 197, 75);
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
}

.fallback {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #8e8c84;
  word-break: break-word;
}

.link {
  color: #325d88;
  text-decoration: underline;
  overflow-wrap: anywhere;
}

.footer {
  padding: 16px 24px 24px;
  border-top: 1px solid #dfd7ca;
  font-size: 13px;
  line-height: 1.5;
  color: #8e8c84;
  text-align: left;
}
</style>
