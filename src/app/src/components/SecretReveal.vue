<script>
export default {
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: 'Client secret' },
    noun: { type: String, default: 'secret' },
    subject: { type: String, default: '' },
    detail: { type: String, default: '' },
    secret: { type: String, default: '' }
  },
  emits: ['update:modelValue', 'cleared'],
  data() {
    return {
      copied: false,
      acknowledged: false
    }
  },
  watch: {
    modelValue(value) {
      if (value) {
        this.copied = false
        this.acknowledged = false
      }
    }
  },
  methods: {
    async copy() {
      try {
        await navigator.clipboard.writeText(this.secret)
        this.copied = true
      } catch {
        this.copied = false
      }
    },
    done() {
      this.$emit('update:modelValue', false)
      this.$emit('cleared')
    }
  }
}
</script>

<template>
  <va-modal
    :model-value="modelValue"
    :title="title"
    hide-default-actions
    :no-dismiss="true"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <va-alert color="warning" class="mb-4">
      This is the only time this {{ noun }} will be shown. Copy it now — it cannot be retrieved again.
    </va-alert>

    <p class="secret-subject">
      <strong>{{ subject }}</strong>
      <span v-if="detail"> · {{ detail }}</span>
    </p>

    <code class="secret-box">{{ secret }}</code>

    <div class="secret-copy">
      <va-button size="small" preset="secondary" icon="content_copy" @click="copy">
        {{ copied ? 'Copied' : `Copy ${noun}` }}
      </va-button>
    </div>

    <va-checkbox v-model="acknowledged" :label="`I have copied this ${noun}`" class="secret-ack" />

    <template #footer>
      <div class="secret-actions">
        <va-button color="primary" :disabled="!acknowledged" @click="done">Done</va-button>
      </div>
    </template>
  </va-modal>
</template>

<style scoped>
.secret-subject {
  margin-bottom: 0.5rem;
  color: var(--va-secondary);
  font-size: 0.875rem;
}

.secret-box {
  display: block;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--va-background-border);
  border-radius: 0.25rem;
  font-family: 'Source Code Pro', monospace;
  word-break: break-all;
}

.secret-copy {
  margin-top: 0.75rem;
}

.secret-ack {
  margin-top: 1rem;
}

.secret-actions {
  display: flex;
  justify-content: flex-end;
}

.mb-4 {
  margin-bottom: 1rem;
}
</style>
