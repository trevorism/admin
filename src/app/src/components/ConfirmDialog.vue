<script>
export default {
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: 'Are you sure?' },
    message: { type: String, default: '' },
    note: { type: String, default: 'This cannot be undone.' },
    confirmText: { type: String, default: 'Confirm' },
    confirmColor: { type: String, default: 'danger' },
    busy: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'confirm'],
  methods: {
    cancel() {
      this.$emit('update:modelValue', false)
    },
    confirm() {
      this.$emit('confirm')
    }
  }
}
</script>

<template>
  <va-modal
    :model-value="modelValue"
    :title="title"
    hide-default-actions
    @update:modelValue="$emit('update:modelValue', $event)"
    @cancel="cancel"
  >
    <p class="confirm-message">{{ message }}</p>
    <p v-if="note" class="confirm-note">{{ note }}</p>
    <template #footer>
      <div class="confirm-actions">
        <va-button preset="secondary" color="secondary" @click="cancel">Cancel</va-button>
        <va-button :color="confirmColor" :loading="busy" @click="confirm">{{ confirmText }}</va-button>
      </div>
    </template>
  </va-modal>
</template>

<style scoped>
.confirm-message {
  margin-bottom: 0.5rem;
}

.confirm-note {
  color: var(--va-secondary);
  font-size: 0.875rem;
}

.confirm-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>
