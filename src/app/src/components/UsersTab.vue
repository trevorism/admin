<script>
import DataTable from './DataTable.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import PermissionEditor from './PermissionEditor.vue'
import { describePermissions } from '../utils/permissions'
import { describeError } from '../utils/errors'
import {
  approveUser,
  deactivateUser,
  deleteUser,
  listUsers,
  updateUserPermissions
} from '../utils/userApi'

export default {
  components: { DataTable, ConfirmDialog, PermissionEditor },
  props: {
    whoami: { type: Object, required: true }
  },
  data() {
    return {
      users: [],
      loading: false,
      error: '',
      busyKey: null,
      approveTarget: null,
      approveAsAdmin: false,
      deactivateTarget: null,
      deleteTarget: null,
      permissionTarget: null
    }
  },
  computed: {
    columns() {
      const base = [
        { key: 'username', label: 'Username' },
        { key: 'email', label: 'Email' },
        { key: 'admin', label: 'Admin' },
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
        },
        {
          key: 'admin',
          label: 'Role',
          options: [
            { value: 'true', text: 'Administrator' },
            { value: 'false', text: 'Standard' }
          ]
        }
      ]
    },
    approveDialogOpen: {
      get() {
        return !!this.approveTarget
      },
      set(value) {
        if (!value) {
          this.approveTarget = null
        }
      }
    },
    deactivateDialogOpen: {
      get() {
        return !!this.deactivateTarget
      },
      set(value) {
        if (!value) {
          this.deactivateTarget = null
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
    },
    permissionDialogOpen: {
      get() {
        return !!this.permissionTarget
      },
      set(value) {
        if (!value) {
          this.permissionTarget = null
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
        this.users = await listUsers()
      } catch (error) {
        this.error = describeError(error, 'Could not load users.')
      } finally {
        this.loading = false
      }
    },
    // A global admin reads across every tenant, but delete only reaches their own
    // namespace, so the action is hidden rather than offered and then refused.
    canDelete(row) {
      const callerTenant = this.whoami.tenant || ''
      return (row.tenant || '') === callerTenant
    },
    startApprove(row) {
      this.approveTarget = row
      this.approveAsAdmin = row.admin
    },
    async confirmApprove() {
      const target = this.approveTarget
      await this.run(target.username, 'Could not approve the user.', () =>
        approveUser(target.username, this.approveAsAdmin)
      )
      this.approveTarget = null
    },
    async confirmDeactivate() {
      const target = this.deactivateTarget
      await this.run(target.username, 'Could not deactivate the user.', () =>
        deactivateUser(target.username)
      )
      this.deactivateTarget = null
    },
    async confirmDelete() {
      const target = this.deleteTarget
      await this.run(target.username, 'Could not delete the user.', () => deleteUser(target.username))
      this.deleteTarget = null
    },
    async savePermissions(permissions) {
      const target = this.permissionTarget
      await this.run(target.username, 'Could not update the permissions.', () =>
        updateUserPermissions(target.username, permissions)
      )
      this.permissionTarget = null
    },
    async run(key, fallback, work) {
      this.busyKey = key
      this.error = ''
      try {
        await work()
        await this.refresh()
      } catch (error) {
        this.error = describeError(error, fallback)
      } finally {
        this.busyKey = null
      }
    }
  }
}
</script>

<template>
  <div>
    <data-table
      title="Users"
      :columns="columns"
      :rows="users"
      row-key="username"
      :loading="loading"
      :error="error"
      :facets="facets"
      :initial-sort="{ key: 'username', dir: 'asc' }"
      empty-text="No users are visible to you."
      @refresh="refresh"
    >
      <template #cell-admin="{ row }">
        <va-badge :color="row.admin ? 'info' : 'secondary'" :text="row.admin ? 'Admin' : 'Standard'" />
      </template>

      <template #cell-active="{ row }">
        <va-badge :color="row.active ? 'success' : 'warning'" :text="row.active ? 'Active' : 'Inactive'" />
      </template>

      <template #cell-permissions="{ row }">
        <code>{{ describePermissions(row.permissions) }}</code>
      </template>

      <template #actions="{ row }">
        <va-button
          v-if="!row.active"
          size="small"
          preset="secondary"
          color="success"
          :loading="busyKey === row.username"
          @click="startApprove(row)"
        >
          Approve
        </va-button>
        <va-button
          v-if="row.active"
          size="small"
          preset="secondary"
          color="warning"
          :loading="busyKey === row.username"
          @click="deactivateTarget = row"
        >
          Deactivate
        </va-button>
        <va-button size="small" preset="secondary" color="info" @click="permissionTarget = row">
          Permissions
        </va-button>
        <va-button
          v-if="canDelete(row)"
          size="small"
          preset="secondary"
          color="danger"
          @click="deleteTarget = row"
        >
          Delete
        </va-button>
      </template>
    </data-table>

    <va-modal
      v-model="approveDialogOpen"
      title="Approve user"
      hide-default-actions
      @cancel="approveTarget = null"
    >
      <p class="approve-message">
        Approve <strong>{{ approveTarget?.username }}</strong> and extend their account for a year.
      </p>
      <va-switch
        v-model="approveAsAdmin"
        label="Administrator"
        :disabled="!whoami.globalAdmin"
        class="approve-switch"
      />
      <p v-if="!whoami.globalAdmin" class="approve-note">
        Only a global administrator can change administrator access.
      </p>
      <template #footer>
        <div class="approve-actions">
          <va-button preset="secondary" color="secondary" @click="approveTarget = null">Cancel</va-button>
          <va-button color="success" @click="confirmApprove">Approve</va-button>
        </div>
      </template>
    </va-modal>

    <confirm-dialog
      v-model="deactivateDialogOpen"
      title="Deactivate user"
      :message="`Deactivate ${deactivateTarget?.username}? They will not be able to sign in.`"
      note="They can be approved again later."
      confirm-text="Deactivate"
      confirm-color="warning"
      @confirm="confirmDeactivate"
    />

    <confirm-dialog
      v-model="deleteDialogOpen"
      title="Delete user"
      :message="`Permanently delete ${deleteTarget?.username}?`"
      confirm-text="Delete"
      @confirm="confirmDelete"
    />

    <permission-editor
      v-model="permissionDialogOpen"
      :username="permissionTarget?.username || ''"
      :permissions="permissionTarget?.permissions || ''"
      @save="savePermissions"
    />
  </div>
</template>

<style scoped>
.approve-message {
  margin-bottom: 0.75rem;
}

.approve-note {
  margin-top: 0.5rem;
  color: var(--va-secondary);
  font-size: 0.875rem;
}

.approve-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>
