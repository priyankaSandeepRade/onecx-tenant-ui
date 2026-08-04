import { routerNavigatedAction } from '@ngrx/router-store'

import { ColumnType } from '@onecx/angular-accelerator'

import { TenantSearchActions } from './tenant-search.actions'
import { initialState, tenantSearchReducer } from './tenant-search.reducers'
import { tenantSearchCriteriasSchema } from './tenant-search.parameters'

describe('TenantSearchReducer', () => {
  describe('on tenantReceived action', () => {
    describe('with the initial state', () => {
      it('should store the results', () => {
        const tenant = {
          results: [
            { id: '123', modificationCount: 1 },
            { id: '234', modificationCount: 1 }
          ],
          totalElements: 2
        }
        const action = TenantSearchActions.tenantSearchResultsReceived(tenant)
        const nextState = tenantSearchReducer(initialState, action)
        expect(nextState).toEqual({
          ...initialState,
          results: tenant.results,
          loadingData: false
        })
        expect(nextState).not.toBe(initialState)
      })
    })
  })

  it('should return the initial state', () => {
    const action = { type: 'Unknown' } as any
    const state = tenantSearchReducer(undefined, action)
    expect(state).toBe(initialState)
  })

  it('should update criteria on routerNavigatedAction with valid queryParams', () => {
    const queryParams = { orgId: 'test' }
    const action = routerNavigatedAction({
      payload: {
        routerState: {
          root: { queryParams }
        }
      } as any
    })
    const state = tenantSearchReducer(initialState, action)
    expect(state.criteria).toEqual(queryParams)
  })

  it('should return unchanged state if routerNavigatedAction has invalid queryParams', () => {
    const invalidQueryParams = { invalid: true }

    // Mock schema to simulate failure
    jest.spyOn(tenantSearchCriteriasSchema, 'safeParse').mockReturnValueOnce({
      success: false,
      error: {} as any
    })

    const action = routerNavigatedAction({
      payload: {
        routerState: {
          root: { queryParams: invalidQueryParams }
        }
      } as any
    })

    const state = tenantSearchReducer(initialState, action)
    expect(state).toBe(initialState)
  })

  it('should return unchanged state if searchConfigSelected is called with null', () => {
    const action = TenantSearchActions.searchConfigSelected({ searchConfig: null as any })
    const state = tenantSearchReducer(initialState, action)
    expect(state).toBe(initialState)
  })

  it('should return unchanged state if searchConfigSelected has invalid fieldValues', () => {
    jest.spyOn(tenantSearchCriteriasSchema, 'safeParse').mockReturnValueOnce({
      success: false,
      error: {} as any
    })

    const action = TenantSearchActions.searchConfigSelected({
      searchConfig: {
        fieldValues: { invalid: 'true' },
        displayedColumnsIds: ['id'],
        viewMode: 'basic',
        name: ''
      }
    })

    const state = tenantSearchReducer(initialState, action)
    expect(state).toBe(initialState)
  })

  it('should update criteria, displayedColumns and viewMode on searchConfigSelected', () => {
    const action = TenantSearchActions.searchConfigSelected({
      searchConfig: {
        fieldValues: { orgId: 'test' },
        displayedColumnsIds: ['orgId'],
        viewMode: 'advanced',
        name: 'name'
      }
    })
    const state = tenantSearchReducer(initialState, action)
    expect(state.criteria).toEqual({ orgId: 'test' })
    expect(state.displayedColumns).toEqual(['orgId'])
    expect(state.viewMode).toBe('advanced')
  })

  it('should update criteria on searchButtonClicked', () => {
    const action = TenantSearchActions.searchButtonClicked({
      searchCriteria: { orgId: 'orgId' }
    })
    const state = tenantSearchReducer(initialState, action)
    expect(state.criteria).toEqual({ orgId: 'orgId' })
  })

  it('should reset criteria on resetButtonClicked', () => {
    const modifiedState = { ...initialState, criteria: { orgId: 'test' } }
    const action = TenantSearchActions.resetButtonClicked()
    const state = tenantSearchReducer(modifiedState, action)
    expect(state.criteria).toEqual({})
  })

  it('should clear results on tenantSearchResultsLoadingFailed', () => {
    const modifiedState = { ...initialState, results: [{ id: '1' }] }
    const action = TenantSearchActions.tenantSearchResultsLoadingFailed({ error: '' })
    const state = tenantSearchReducer(modifiedState, action)
    expect(state.results).toEqual([])
  })

  it('should set chartVisible on chartVisibilityRehydrated', () => {
    const action = TenantSearchActions.chartVisibilityRehydrated({ visible: true })
    const state = tenantSearchReducer(initialState, action)
    expect(state.chartVisible).toBe(true)
  })

  it('should toggle chartVisible on chartVisibilityToggled', () => {
    const action = TenantSearchActions.chartVisibilityToggled()
    const state = tenantSearchReducer({ ...initialState, chartVisible: false }, action)
    expect(state.chartVisible).toBe(true)
  })

  it('should change viewMode on viewModeChanged', () => {
    const action = TenantSearchActions.viewModeChanged({ viewMode: 'advanced' })
    const state = tenantSearchReducer(initialState, action)
    expect(state.viewMode).toBe('advanced')
  })

  it('should update displayedColumns on displayedColumnsChanged', () => {
    const action = TenantSearchActions.displayedColumnsChanged({
      displayedColumns: [{ id: 'name', columnType: ColumnType.STRING, nameKey: '' }]
    })
    const state = tenantSearchReducer(initialState, action)
    expect(state.displayedColumns).toEqual(['name'])
  })

  it('should set loadingData to true on updateTenantSucceeded', () => {
    const modifiedState = { ...initialState, loadingData: false }
    const state = tenantSearchReducer(modifiedState, TenantSearchActions.updateTenantSucceeded())
    expect(state.loadingData).toBe(true)
  })

  it('should set loadingData to true on createTenantSucceeded', () => {
    const modifiedState = { ...initialState, loadingData: false }
    const state = tenantSearchReducer(modifiedState, TenantSearchActions.createTenantSucceeded())
    expect(state.loadingData).toBe(true)
  })
})
