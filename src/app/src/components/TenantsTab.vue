<script>
import DataTable from './DataTable.vue'
import { createTenant, getMyTenant, listTenants } from '../utils/tenantApi'

export default {
  components: { DataTable },
  props: {
    whoami: { type: Object, required: true }
  },
  data() {
    return {
      tenants: [],
      myTenant: null,
      loading: false,
      error: '',
      createOpen: false,
      createForm: { name: '', domain: '' }
    }
  },
  computed: {
    columns() {
      return [
        { key: 'name', label: 'Name' },
        { key: 'domain', label: 'Domain' },
        { key: 'guid', label: 'Guid' }
      ]
    }
  },
  async mounted() {
    await this.refresh()
  },
  methods: {
    async refresh() {
      this.loading = true
      this.error = ''
      try {
        if (this.whoami.globalAdmin) {
          this.tenants = await listTenants()
        } else {
          this.myTenant = await getMyTenant()
        }
      } catch (error) {
        this.error = error?.response?.data?.error || 'Could not load tenant information.'
      } finally {
        this.loading = false
      }
    },
    openCreate() {
      this.createForm = { name: '', domain: '' }
      this.createOpen = true
    },
    async submitCreate() {
      this.error = ''
      try {
        await createTenant(this.createForm)
        this.createOpen = false
        await this.refresh()
      } catch (error) {
        if (error?.message === 'tenant_name_required') {
          this.error = 'A tenant name is required.'
          return
        }
        this.error = error?.response?.data?.error || 'Could not create the tenant.'
      }
    }
  }
}
</script>

<template>
  <div>
    <template v-if="whoami.globalAdmin">
      <data-table
        title="Tenants"
        :columns="columns"
        :rows="tenants"
        row-key="guid"
        :loading="loading"
        :error="error"
        :initial-sort="{ key: 'name', dir: 'asc' }"
        empty-text="No tenants have been created yet."
        @refresh="refresh"
      >
        <template #toolbar>
          <va-button size="small" color="primary" icon="add" @click="openCreate">Create tenant</va-button>
        </template>

        <template #cell-guid="{ row }">
          <code>{{ row.guid }}</code>
        </template>
      </data-table>

      <p class="tenant-scope-note">
        Users and Apps list every tenant. Creating a tenant here does not create an administrator
        for it. Tenant deletion is intentionally not offered, because it would orphan every user and
        application inside the tenant with no way to recover the guid.
      </p>

      <va-modal v-model="createOpen" title="Create tenant" hide-default-actions>
        <div class="create-form">
          <va-input v-model="createForm.name" label="Name" />
          <va-input v-model="createForm.domain" label="Domain" />
        </div>
        <template #footer>
          <div class="create-actions">
            <va-button preset="secondary" color="secondary" @click="createOpen = false">Cancel</va-button>
            <va-button color="primary" @click="submitCreate">Create</va-button>
          </div>
        </template>
      </va-modal>
    </template>

    <va-card v-else class="tenant-card">
      <va-card-title>Tenant</va-card-title>
      <va-card-content>
        <va-alert v-if="error" color="danger" class="mb-4">{{ error }}</va-alert>
        <va-inner-loading :loading="loading">
          <dl v-if="myTenant" class="tenant-details">
            <dt>Name</dt>
            <dd>{{ myTenant.name }}</dd>
            <dt>Domain</dt>
            <dd>{{ myTenant.domain || '—' }}</dd>
            <dt>Guid</dt>
            <dd><code>{{ myTenant.guid }}</code></dd>
          </dl>
          <p v-else-if="!loading" class="section-hint">You are not a member of a tenant.</p>
        </va-inner-loading>
      </va-card-content>
    </va-card>
  </div>
</template>

<style scoped>
.tenant-card {
  margin-top: 1rem;
}

.tenant-details {
  display: grid;
  grid-template-columns: 8rem 1fr;
  row-gap: 0.5rem;
}

.tenant-details dt {
  color: var(--va-secondary);
  font-size: 0.875rem;
}

.tenant-scope-note {
  margin-top: 0.75rem;
  color: var(--va-secondary);
  font-size: 0.875rem;
}

.section-hint {
  color: var(--va-secondary);
  font-size: 0.875rem;
}

.mb-4 {
  margin-bottom: 1rem;
}
</style>
