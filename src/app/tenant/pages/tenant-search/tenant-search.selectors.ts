import { createSelector } from '@ngrx/store'

import { DataTableColumn, RowListGridData } from '@onecx/angular-accelerator'
import { createChildSelectors } from '@onecx/ngrx-accelerator'

import { tenantFeature } from '../../tenant.reducers'
import { initialState } from './tenant-search.reducers'
import { TenantSearchViewModel } from './tenant-search.viewmodel'

export const tenantSearchSelectors = createChildSelectors(tenantFeature.selectSearch, initialState)

export const selectResults = createSelector(tenantSearchSelectors.selectResults, (results): RowListGridData[] => {
  return results.map((item) => ({
    imagePath: '',
    ...item
    // ACTION S6: Here you can create a mapping of the items and their corresponding translation strings
  }))
})

export const selectDisplayedColumns = createSelector(
  tenantSearchSelectors.selectColumns,
  tenantSearchSelectors.selectDisplayedColumns,
  (columns, displayedColumns): DataTableColumn[] => {
    return (displayedColumns?.map((d) => columns.find((c) => c.id === d)).filter(Boolean) as DataTableColumn[]) ?? []
  }
)

export const selectTenantSearchViewModel = createSelector(
  tenantSearchSelectors.selectColumns,
  tenantSearchSelectors.selectCriteria,
  selectResults,
  selectDisplayedColumns,
  tenantSearchSelectors.selectViewMode,
  tenantSearchSelectors.selectChartVisible,
  tenantSearchSelectors.selectLoadingData,
  (columns, searchCriteria, results, displayedColumns, viewMode, chartVisible, loadingData): TenantSearchViewModel => ({
    columns,
    searchCriteria,
    results,
    displayedColumns,
    viewMode,
    chartVisible,
    loadingData
  })
)
