<script>
export default {
  props: {
    username: { type: String, default: '' }
  }
}
</script>

<template>
  <va-card class="denied-card">
    <va-card-title>Administration</va-card-title>
    <va-card-content>
      <va-alert color="warning" class="mb-4">
        This console is for tenant and global administrators only.
      </va-alert>
      <p class="denied-note">
        <span v-if="username">You are signed in as <strong>{{ username }}</strong>, which does not</span>
        <span v-else>Your account does not</span>
        have administrative access. To manage your own profile, use your account page instead.
      </p>
    </va-card-content>
  </va-card>
</template>

<style scoped>
.denied-card {
  margin-top: 1rem;
}

.denied-note {
  color: var(--va-secondary);
  font-size: 0.9375rem;
}
</style>
