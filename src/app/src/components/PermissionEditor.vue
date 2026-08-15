<script>
import { PERMISSION_OPTIONS, formatPermissions, parsePermissions } from '../utils/permissions'

export default {
  props: {
    modelValue: { type: Boolean, default: false },
    username: { type: String, default: '' },
    permissions: { type: String, default: '' },
    busy: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'save'],
  data() {
    return {
      options: PERMISSION_OPTIONS,
      selected: parsePermissions(this.permissions)
    }
  },
  watch: {
    permissions(value) {
      this.selected = parsePermissions(value)
    },
    modelValue(value) {
      if (value) {
        this.selected = parsePermissions(this.permissions)
      }
    }
  },
  methods: {
    isChecked(letter) {
      return this.selected.includes(letter)
    },
    toggle(letter, checked) {
      const without = this.selected.filter((entry) => entry !== letter)
      this.selected = checked ? [...without, letter] : without
    },
    cancel() {
      this.$emit('update:modelValue', false)
    },
    save() {
      this.$emit('save', formatPermissions(this.selected))
    }
  }
}
</script>

<template>
  <va-modal
    :model-value="modelValue"
    title="Permissions"
    hide-default-actions
    @update:modelValue="$emit('update:modelValue', $event)"
    @cancel="cancel"
  >
    <p class="permission-subject">
      Permissions for <strong>{{ username }}</strong>
    </p>
    <div class="permission-list">
      <va-checkbox
        v-for="option in options"
        :key="option.value"
        :model-value="isChecked(option.value)"
        :label="`${option.label} (${option.value})`"
        @update:modelValue="toggle(option.value, $event)"
      />
    </div>
    <template #footer>
      <div class="permission-actions">
        <va-button preset="secondary" color="secondary" @click="cancel">Cancel</va-button>
        <va-button color="primary" :loading="busy" @click="save">Save</va-button>
      </div>
    </template>
  </va-modal>
</template>

<style scoped>
.permission-subject {
  margin-bottom: 0.75rem;
}

.permission-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.permission-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>
