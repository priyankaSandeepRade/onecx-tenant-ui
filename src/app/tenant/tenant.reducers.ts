import { combineReducers, createFeature } from '@ngrx/store'

import { TenantState } from './tenant.state'
import { tenantSearchReducer } from './tenant-search/tenant-search.reducers'

export const tenantFeature = createFeature({
  name: 'tenant',
  reducer: combineReducers<TenantState>({
    search: tenantSearchReducer
  })
})
