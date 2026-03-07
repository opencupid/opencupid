<script setup lang="ts">
import type { EmailTemplateProps } from './types'

defineProps<EmailTemplateProps>()
</script>

<template>
  <div style="margin: 0; padding: 0; background: #f6f7f9">
    <!-- Preheader (hidden, shows in some inbox previews) -->
    <!-- <div
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
    </div> -->

    <table
      role="presentation"
      class="outer"
      cellpadding="0"
      cellspacing="0"
    >
      <tbody>
        <tr>
          <td class="center">
            <table
              role="presentation"
              class="card"
              width="600"
              cellpadding="0"
              cellspacing="0"
            >
              <tbody>
                <tr>
                  <td class="header">
                    <div class="appName">{{ siteName }}</div>
                  </td>
                </tr>

                <tr>
                  <td class="body">
                    <div
                      class="content"
                      v-html="contentBody"
                    ></div>

                    <table
                      role="presentation"
                      class="ctaTable"
                      cellpadding="0"
                      cellspacing="0"
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
                      {{ fallbackHint }}
                      <br />
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
