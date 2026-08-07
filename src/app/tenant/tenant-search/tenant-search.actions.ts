import { createActionGroup, emptyProps, props } from '@ngrx/store'

import { DataTableColumn, SearchConfigData } from '@onecx/angular-accelerator'

import { Tenant } from 'src/app/shared/generated'
import { TenantSearchCriteria } from './tenant-search.parameters'

export const TenantSearchActions = createActionGroup({
  source: 'TenantSearch',
  events: {
    'Dialog for existing entry opened': props<{ id: number | string }>(),
    'Create tenant button clicked': emptyProps(),
    'Edit tenant button clicked': props<{ id: number | string }>(),
    'Open tenant details button clicked': props<{ id: number | string }>(),
    'Create tenant cancelled': emptyProps(),
    'Update tenant cancelled': emptyProps(),
    'Create tenant succeeded': emptyProps(),
    'Update tenant succeeded': emptyProps(),
    'Create tenant failed': props<{ error: string | null }>(),
    'Update tenant failed': props<{ error: string | null }>(),
    'Reset button clicked': emptyProps(),
    'Search button clicked': props<{ searchCriteria: TenantSearchCriteria }>(),
    'Search config selected': props<{ searchConfig: SearchConfigData | undefined }>(),
    'Tenant search results received': props<{ results: Tenant[]; totalElements: number }>(),
    'Tenant search results loading failed': props<{ error: string | null }>(),
    'Displayed columns changed': props<{ displayedColumns: DataTableColumn[] }>(),
    'Chart visibility rehydrated': props<{ visible: boolean }>(),
    'Chart visibility toggled': emptyProps(),
    'View mode changed': props<{ viewMode: 'basic' | 'advanced' }>()
  }
})
