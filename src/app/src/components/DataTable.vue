<script>
import { filterRows, nextSortDirection, sortRows } from '../utils/sortFilter'

export default {
  props: {
    title: { type: String, default: '' },
    columns: { type: Array, required: true },
    rows: { type: Array, default: () => [] },
    rowKey: { type: String, default: 'id' },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
    emptyText: { type: String, default: 'Nothing to show yet.' },
    searchFields: { type: Array, default: null },
    initialSort: { type: Object, default: null },
    facets: { type: Array, default: () => [] }
  },
  emits: ['refresh'],
  data() {
    return {
      query: '',
      sortKey: this.initialSort?.key || null,
      sortDir: this.initialSort?.dir || 'asc',
      facetValues: {}
    }
  },
  computed: {
    fields() {
      return this.searchFields?.length ? this.searchFields : this.columns.map((column) => column.key)
    },
    visibleRows() {
      const filtered = filterRows(this.rows, {
        query: this.query,
        fields: this.fields,
        facets: this.facetValues
      })
      return sortRows(filtered, this.sortKey, this.sortDir)
    },
    hasRows() {
      return this.visibleRows.length > 0
    }
  },
  methods: {
    keyFor(row, index) {
      return row?.[this.rowKey] ?? index
    },
    toggleSort(column) {
      if (column.sortable === false) {
        return
      }
      const next = nextSortDirection(this.sortKey, this.sortDir, column.key)
      this.sortKey = next.key
      this.sortDir = next.dir
    },
    ariaSort(column) {
      if (this.sortKey !== column.key) {
        return 'none'
      }
      return this.sortDir === 'asc' ? 'ascending' : 'descending'
    },
    sortIndicator(column) {
      if (this.sortKey !== column.key) {
        return ''
      }
      return this.sortDir === 'asc' ? '▲' : '▼'
    },
    display(row, column) {
      const value = row?.[column.key]
      if (value === null || value === undefined) {
        return ''
      }
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No'
      }
      return String(value)
    }
  }
}
</script>

<template>
  <va-card class="table-card">
    <va-card-title>
      <span>{{ title }}</span>
      <div class="toolbar">
        <slot name="toolbar"></slot>
        <va-button size="small" preset="secondary" icon="refresh" @click="$emit('refresh')">
          Refresh
        </va-button>
      </div>
    </va-card-title>

    <va-card-content>
      <va-alert v-if="error" color="danger" class="mb-4">{{ error }}</va-alert>

      <div class="filters">
        <va-input v-model="query" placeholder="Search" clearable class="search-input" />
        <va-select
          v-for="facet in facets"
          :key="facet.key"
          v-model="facetValues[facet.key]"
          :options="facet.options"
          :label="facet.label"
          value-by="value"
          text-by="text"
          clearable
          class="facet-select"
        />
      </div>

      <va-inner-loading :loading="loading">
        <table v-if="hasRows" class="admin-table">
          <thead>
            <tr>
              <th
                v-for="column in columns"
                :key="column.key"
                :aria-sort="ariaSort(column)"
                :class="{ sortable: column.sortable !== false }"
                @click="toggleSort(column)"
              >
                {{ column.label }}
                <span class="sort-indicator">{{ sortIndicator(column) }}</span>
              </th>
              <th v-if="$slots.actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in visibleRows" :key="keyFor(row, index)">
              <td v-for="column in columns" :key="column.key">
                <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
                  {{ display(row, column) }}
                </slot>
              </td>
              <td v-if="$slots.actions">
                <div class="actions-cell">
                  <slot name="actions" :row="row"></slot>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else-if="!loading" class="section-hint">{{ emptyText }}</p>
      </va-inner-loading>
    </va-card-content>
  </va-card>
</template>

<style scoped>
.table-card {
  margin-top: 1rem;
}

.toolbar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.filters {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.search-input {
  min-width: 16rem;
}

.facet-select {
  min-width: 10rem;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
}

.admin-table th,
.admin-table td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--va-background-border);
  vertical-align: middle;
}

.admin-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.sort-indicator {
  font-size: 0.75rem;
  color: var(--va-secondary);
}

.actions-cell {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.section-hint {
  color: var(--va-secondary);
  font-size: 0.875rem;
}

.mb-4 {
  margin-bottom: 1rem;
}
</style>
