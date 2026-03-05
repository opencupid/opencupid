<script setup lang="ts">
import type { SimpleEmailProps } from './types';



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
}



.outer {
}

.center {
}

.card {
}

.header {
}

.appName {
}

.body {
}

.title {
}

.content {
}

.ctaTable {
}

.ctaCell {
}

.ctaButton {
}

.fallback {
}

.link {
}

.footer {

}
</style>
