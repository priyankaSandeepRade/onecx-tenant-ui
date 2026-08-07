import { createReducer, on } from '@ngrx/store'
import { TenantSearchActions } from './tenant-search.actions'
import { tenantSearchColumns } from './tenant-search.columns'
import { TenantSearchState } from './tenant-search.state'
import { RouterNavigatedAction, routerNavigatedAction } from '@ngrx/router-store'
import { tenantSearchCriteriasSchema } from './tenant-search.parameters'

export const initialState: TenantSearchState = {
  columns: tenantSearchColumns,
  results: [],
  displayedColumns: null,
  viewMode: 'basic',
  chartVisible: false,
  criteria: {},
  loadingData: true
}

export const tenantSearchReducer = createReducer(
  initialState,
  on(routerNavigatedAction, (state: TenantSearchState, action: RouterNavigatedAction) => {
    const results = tenantSearchCriteriasSchema.safeParse(action.payload.routerState.root.queryParams)
    if (results.success) {
      return {
        ...state,
        criteria: results.data,
        loadingData: true
      }
    }
    return state
  }),
  on(TenantSearchActions.searchConfigSelected, (state: TenantSearchState, { searchConfig }): TenantSearchState => {
    if (!searchConfig) return state
    const results = tenantSearchCriteriasSchema.safeParse(searchConfig.fieldValues)
    if (results.success) {
      return {
        ...state,
        criteria: results.data,
        displayedColumns: searchConfig.displayedColumnsIds,
        viewMode: searchConfig.viewMode
      }
    }
    return state
  }),
  on(TenantSearchActions.searchButtonClicked, (state: TenantSearchState, { searchCriteria }): TenantSearchState => ({
    ...state,
    criteria: searchCriteria
  })),
  on(TenantSearchActions.resetButtonClicked, (state: TenantSearchState): TenantSearchState => ({
    ...state,
    criteria: {}
  })),
  on(TenantSearchActions.tenantSearchResultsReceived, (state: TenantSearchState, { results }): TenantSearchState => ({
    ...state,
    results,
    loadingData: false
  })),
  on(TenantSearchActions.tenantSearchResultsLoadingFailed, (state: TenantSearchState): TenantSearchState => ({
    ...state,
    results: [],
    loadingData: false
  })),
  on(TenantSearchActions.chartVisibilityRehydrated, (state: TenantSearchState, { visible }): TenantSearchState => ({
    ...state,
    chartVisible: visible
  })),
  on(TenantSearchActions.chartVisibilityToggled, (state: TenantSearchState): TenantSearchState => ({
    ...state,
    chartVisible: !state.chartVisible
  })),
  on(TenantSearchActions.viewModeChanged, (state: TenantSearchState, { viewMode }): TenantSearchState => ({
    ...state,
    viewMode: viewMode
  })),
  on(TenantSearchActions.displayedColumnsChanged, (state: TenantSearchState, { displayedColumns }) => ({
    ...state,
    displayedColumns: displayedColumns.map((c) => c.id)
  })),
  on(TenantSearchActions.updateTenantSucceeded, (state: TenantSearchState) => ({
    ...state,
    loadingData: true
  })),
  on(TenantSearchActions.createTenantSucceeded, (state: TenantSearchState) => ({
    ...state,
    loadingData: true
  }))
)
