<script setup lang="ts">
export type SimpleEmailProps = {
  publicName: string
  contentBody: string
  callToActionLabel: string
  callToActionUrl: string
}

defineProps<SimpleEmailProps>()
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
      <tr>
        <td class="center">
          <table
            role="presentation"
            class="card"
          >
            <tr>
              <td class="header">
                <div class="appName">Your App</div>
              </td>
            </tr>

            <tr>
              <td class="body">
                <h1 class="title">Hi {{ publicName }},</h1>

                <p class="content">
                  {{ contentBody }}
                </p>

                <table
                  role="presentation"
                  class="ctaTable"
                >
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
                </table>

                <p class="fallback">
                  If the button doesn’t work, copy and paste this URL:
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
              <td class="footer">If you didn’t request this, you can ignore this email.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</template>

<style>

body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}


.outer {
  width: 100%;
  border-collapse: collapse;
  background: #f6f7f9;
}

.center {
  padding: 24px 12px;
  text-align: center;
}

.card {
  width: 600px;
  max-width: 600px;
  border-collapse: collapse;
  background: #ffffff;
}

.header {
  padding: 20px 24px;
  border-bottom: 1px solid #e9edf2;
  font-family: Arial, sans-serif;
}

.appName {
  font-size: 14px;
  line-height: 20px;
  color: #667085;
}

.body {
  padding: 24px;
  font-family: Arial, sans-serif;
  color: #101828;
}

.title {
  margin: 0 0 12px;
  font-size: 20px;
}

.content {
  margin: 0 0 18px;
}

.ctaTable {
  border-collapse: collapse;
}

.ctaCell {
  border-radius: 10px;
  background: #2563eb;
}

.ctaButton {
  display: inline-block;
  padding: 12px 16px;
  font-family: Arial, sans-serif;
  font-size: 14px;
  line-height: 18px;
  font-weight: 700;
  color: #ffffff;
  text-decoration: none;
  border-radius: 10px;
}

.fallback {
  margin: 18px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: #667085;
}

.link {
  color: #2563eb;
  text-decoration: underline;
}

.footer {
  padding: 16px 24px;
  border-top: 1px solid #e9edf2;
  font-family: Arial, sans-serif;
  color: #98a2b3;
  font-size: 12px;
  line-height: 18px;
}
</style>
