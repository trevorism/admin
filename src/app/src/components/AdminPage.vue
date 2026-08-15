<script>
import { getWhoami } from '../utils/whoamiApi'
import AccessDenied from './AccessDenied.vue'
import UsersTab from './UsersTab.vue'
import AppsTab from './AppsTab.vue'
import TenantsTab from './TenantsTab.vue'

export default {
  components: { AccessDenied, UsersTab, AppsTab, TenantsTab },
  props: {
    tab: { type: String, default: 'users' }
  },
  data() {
    return {
      whoami: null,
      loading: true,
      error: ''
    }
  },
  computed: {
    canAdminister() {
      return this.whoami?.canAdminister === true
    },
    tenantTabLabel() {
      return this.whoami?.globalAdmin ? 'Tenants' : 'Tenant'
    }
  },
  async mounted() {
    try {
      this.whoami = await getWhoami()
    } catch (error) {
      this.error = error?.response?.data?.error || 'Could not confirm your access.'
    } finally {
      this.loading = false
    }
  },
  methods: {
    go(name) {
      const target = { users: 'Users', apps: 'Apps', tenants: 'Tenants' }[name]
      if (target && this.$route?.name !== target) {
        this.$router.push({ name: target })
      }
    }
  }
}
</script>

<template>
  <va-inner-loading :loading="loading">
    <va-alert v-if="error" color="danger" class="mb-4">{{ error }}</va-alert>

    <access-denied v-else-if="!loading && !canAdminister" :username="whoami?.username" />

    <template v-else-if="whoami">
      <va-tabs :model-value="tab" @update:modelValue="go">
        <template #tabs>
          <va-tab name="users">Users</va-tab>
          <va-tab name="apps">Apps</va-tab>
          <va-tab name="tenants">{{ tenantTabLabel }}</va-tab>
        </template>
      </va-tabs>

      <users-tab v-if="tab === 'users'" :whoami="whoami" />
      <apps-tab v-else-if="tab === 'apps'" :whoami="whoami" />
      <tenants-tab v-else-if="tab === 'tenants'" :whoami="whoami" />
    </template>
  </va-inner-loading>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 1rem;
}
</style>
