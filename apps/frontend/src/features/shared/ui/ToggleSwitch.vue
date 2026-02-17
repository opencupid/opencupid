<script lang="ts" setup>
const props = defineProps({
  label: {
    type: String,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  modelValue: {
    type: Boolean,
    default: false,
  },
})

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()

function toggleHandler(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>

<template>
  <label
    class="toggleswitch__outer"
    :class="{ disabled: disabled }"
  >
    <input
      class="input"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="toggleHandler"
    />
    <span class="switch"></span>
    <slot>
      <span class="label">
        {{ label }}
      </span>
    </slot>
  </label>
</template>

<style lang="scss" scoped>
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';

.toggleswitch__outer {
  --switch-container-width: 50px;
  cursor: pointer;
  display: flex;
  align-items: center;
  width: var(--switch-container-width);
}

.label {
  margin-left: 0.5em;
  color: var(--bs-secondary-color);
  // overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

label {
  cursor: pointer;
  user-select: none;
}

/* Visually hide the checkbox input */
.input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.switch {
  --switch-size: calc(var(--switch-container-width) / 2);
  /* Bootstrap color variables */
  --switch-bg: var(--bs-gray-200);
  --switch-bg-checked: var(--bs-success);
  --switch-bg-disabled: var(--bs-gray-300);
  --switch-border-default: var(--bs-gray-400);
  --switch-border-focus: var(--bs-primary);
  --switch-border-focus-checked: var(--bs-success);
  --switch-border-disabled: var(--bs-gray-500);

  display: flex;
  align-items: center;
  position: relative;
  height: var(--switch-size);
  flex-basis: var(--switch-container-width);
  border-radius: var(--switch-size);
  background-color: var(--switch-bg);
  flex-shrink: 0;
  transition: background-color 0.25s ease-in-out;
}

.switch::before {
  content: '';
  position: absolute;
  left: 1px;
  height: calc(var(--switch-size) - 4px);
  width: calc(var(--switch-size) - 4px);
  border-radius: 9999px;
  background-color: #fff;
  border: 2px solid var(--switch-border-default);
  transition:
    transform 0.375s ease-in-out,
    border-color 0.25s;
}

.input:checked + .switch {
  background-color: var(--switch-bg-checked);
}

.input:checked + .switch::before {
  border-color: var(--switch-border-focus-checked);
  transform: translateX(calc(var(--switch-container-width) - var(--switch-size)));
}

.input:focus + .switch::before {
  border-color: var(--switch-border-focus);
}

.input:focus:checked + .switch::before {
  border-color: var(--switch-border-focus-checked);
}

.input:disabled + .switch {
  background-color: var(--switch-bg-disabled);
}

.input:disabled:checked + .switch {
  background-color: $success-bg-subtle-dark;
}

.input:disabled + .switch::before {
  background-color: var(--bs-gray-500);
  border-color: var(--switch-border-disabled);
}

.disabled .label {
  color: var(--bs-gray-500);
}
</style>
