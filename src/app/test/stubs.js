const passthrough = { template: '<div><slot /></div>' }

const stubs = {
  'va-alert': passthrough,
  'va-badge': { props: ['text', 'color'], template: '<span :data-color="color">{{ text }}</span>' },
  'va-card': passthrough,
  'va-card-content': passthrough,
  'va-card-title': passthrough,
  'va-chip': passthrough,
  'va-inner-loading': passthrough,
  'va-tabs': { template: '<div><slot /><slot name="tabs" /></div>' },
  'va-tab': passthrough,
  'va-modal': {
    props: ['modelValue'],
    template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
  },
  'va-button': {
    props: ['color', 'preset', 'disabled'],
    template:
      '<button :data-color="color" :data-preset="preset" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
  },
  'va-input': { props: ['modelValue', 'label', 'placeholder', 'type', 'clearable', 'minRows'], template: '<input />' },
  'va-select': {
    props: ['modelValue', 'options', 'label', 'valueBy', 'textBy', 'clearable'],
    template: '<select></select>'
  },
  'va-checkbox': {
    props: ['modelValue', 'label'],
    template: '<label><input type="checkbox" :checked="modelValue" />{{ label }}</label>'
  },
  'va-switch': {
    props: ['modelValue', 'disabled', 'label'],
    template: '<input type="checkbox" role="switch" :disabled="disabled" :checked="modelValue" />'
  }
}

export { stubs, passthrough }
