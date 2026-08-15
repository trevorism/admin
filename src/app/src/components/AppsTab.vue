<script>
import DataTable from './DataTable.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import SecretReveal from './SecretReveal.vue'
import { describePermissions, PERMISSION_OPTIONS, formatPermissions } from '../utils/permissions'
import { deleteApp, listApps, registerApp, rotateAppSecret } from '../utils/appApi'

export default {
  components: { DataTable, ConfirmDialog, SecretReveal },
  props: {
    whoami: { type: Object, required: true }
  },
  data() {
    return {
      apps: [],
      loading: false,
      error: '',
      busyKey: null,
      registerOpen: false,
      registerForm: { appName: '', replyUrls: '', logoutUrls: '', permissions: [] },
      permissionOptions: PERMISSION_OPTIONS,
      rotateTarget: null,
      deleteTarget: null,
      revealOpen: false,
      revealAppName: '',
      revealClientId: '',
      revealSecret: ''
    }
  },
  computed: {
    columns() {
      const base = [
        { key: 'appName', label: 'Application' },
        { key: 'clientId', label: 'Client id' },
        { key: 'active', label: 'Active' },
        { key: 'permissions', label: 'Permissions' }
      ]
      if (this.whoami.globalAdmin) {
        base.push({ key: 'tenant', label: 'Tenant' })
      }
      base.push({ key: 'dateCreated', label: 'Created' })
      base.push({ key: 'dateExpired', label: 'Expires' })
      return base
    },
    facets() {
      return [
        {
          key: 'active',
          label: 'Status',
          options: [
            { value: 'true', text: 'Active' },
            { value: 'false', text: 'Inactive' }
          ]
        }
      ]
    },
    rotateDialogOpen: {
      get() {
        return !!this.rotateTarget
      },
      set(value) {
        if (!value) {
          this.rotateTarget = null
        }
      }
    },
    deleteDialogOpen: {
      get() {
        return !!this.deleteTarget
      },
      set(value) {
        if (!value) {
          this.deleteTarget = null
        }
      }
    }
  },
  async mounted() {
    await this.refresh()
  },
  methods: {
    describePermissions,
    async refresh() {
      this.loading = true
      this.error = ''
      try {
        this.apps = await listApps()
      } catch (error) {
        this.error = error?.response?.data?.error || 'Could not load applications.'
      } finally {
        this.loading = false
      }
    },
    openRegister() {
      this.registerForm = { appName: '', replyUrls: '', logoutUrls: '', permissions: [] }
      this.registerOpen = true
    },
    async submitRegister() {
      this.error = ''
      try {
        const result = await registerApp({
          appName: this.registerForm.appName,
          replyUrls: this.registerForm.replyUrls,
          logoutUrls: this.registerForm.logoutUrls,
          permissions: formatPermissions(this.registerForm.permissions)
        })
        this.registerOpen = false
        this.reveal(result.app?.appName || this.registerForm.appName, result.app?.clientId, result.clientSecret)
        await this.refresh()
      } catch (error) {
        this.error = this.messageFor(error, 'Could not register the application.')
      }
    },
    async confirmRotate() {
      const target = this.rotateTarget
      this.busyKey = target.clientId
      this.error = ''
      try {
        const secret = await rotateAppSecret(target.clientId)
        this.rotateTarget = null
        this.reveal(target.appName, target.clientId, secret)
        await this.refresh()
      } catch (error) {
        this.error = this.messageFor(error, 'Could not rotate the secret.')
        this.rotateTarget = null
      } finally {
        this.busyKey = null
      }
    },
    async confirmDelete() {
      const target = this.deleteTarget
      this.busyKey = target.id
      this.error = ''
      try {
        await deleteApp(target.id)
        this.deleteTarget = null
        await this.refresh()
      } catch (error) {
        this.error = this.messageFor(error, 'Could not delete the application.')
        this.deleteTarget = null
      } finally {
        this.busyKey = null
      }
    },
    reveal(appName, clientId, secret) {
      this.revealAppName = appName || ''
      this.revealClientId = clientId || ''
      this.revealSecret = secret || ''
      this.revealOpen = true
    },
    clearSecret() {
      this.revealSecret = ''
      this.revealClientId = ''
      this.revealAppName = ''
    },
    messageFor(error, fallback) {
      if (error?.message === 'app_name_required') {
        return 'An application name is required.'
      }
      return error?.response?.data?.error || fallback
    }
  }
}
</script>

<template>
  <div>
    <data-table
      title="Applications"
      :columns="columns"
      :rows="apps"
      row-key="id"
      :loading="loading"
      :error="error"
      :facets="facets"
      :initial-sort="{ key: 'appName', dir: 'asc' }"
      empty-text="No applications are visible to you."
      @refresh="refresh"
    >
      <template #toolbar>
        <va-button size="small" color="primary" icon="add" @click="openRegister">Register app</va-button>
      </template>

      <template #cell-active="{ row }">
        <va-badge :color="row.active ? 'success' : 'warning'" :text="row.active ? 'Active' : 'Inactive'" />
      </template>

      <template #cell-permissions="{ row }">
        <code>{{ describePermissions(row.permissions) }}</code>
      </template>

      <template #cell-clientId="{ row }">
        <code>{{ row.clientId }}</code>
      </template>

      <template #actions="{ row }">
        <va-button
          size="small"
          preset="secondary"
          color="warning"
          :loading="busyKey === row.clientId"
          @click="rotateTarget = row"
        >
          Rotate secret
        </va-button>
        <va-button
          size="small"
          preset="secondary"
          color="danger"
          :loading="busyKey === row.id"
          @click="deleteTarget = row"
        >
          Delete
        </va-button>
      </template>
    </data-table>

    <va-modal v-model="registerOpen" title="Register application" hide-default-actions>
      <div class="register-form">
        <va-input v-model="registerForm.appName" label="Application name" />
        <va-input
          v-model="registerForm.replyUrls"
          label="Reply URLs (one per line)"
          type="textarea"
          :min-rows="2"
        />
        <va-input
          v-model="registerForm.logoutUrls"
          label="Logout URLs (one per line)"
          type="textarea"
          :min-rows="2"
        />
        <div class="register-permissions">
          <span class="register-label">Permissions</span>
          <va-checkbox
            v-for="option in permissionOptions"
            :key="option.value"
            v-model="registerForm.permissions"
            :array-value="option.value"
            :label="`${option.label} (${option.value})`"
          />
        </div>
      </div>
      <template #footer>
        <div class="register-actions">
          <va-button preset="secondary" color="secondary" @click="registerOpen = false">Cancel</va-button>
          <va-button color="primary" @click="submitRegister">Register</va-button>
        </div>
      </template>
    </va-modal>

    <confirm-dialog
      v-model="rotateDialogOpen"
      title="Rotate client secret"
      :message="`Rotate the secret for ${rotateTarget?.appName}?`"
      note="The current secret stops working immediately. This cannot be undone."
      confirm-text="Rotate"
      confirm-color="warning"
      @confirm="confirmRotate"
    />

    <confirm-dialog
      v-model="deleteDialogOpen"
      title="Delete application"
      :message="`Permanently delete ${deleteTarget?.appName}?`"
      @confirm="confirmDelete"
    />

    <secret-reveal
      v-model="revealOpen"
      :app-name="revealAppName"
      :client-id="revealClientId"
      :secret="revealSecret"
      @cleared="clearSecret"
    />
  </div>
</template>

<style scoped>
.register-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.register-permissions {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.register-label {
  font-size: 0.875rem;
  color: var(--va-secondary);
}

.register-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>
