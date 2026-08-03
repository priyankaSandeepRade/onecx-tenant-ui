import { Type } from '@angular/core'
import {
  ActivatedRoute,
  NavigationExtras,
  Router,
  RouterState,
  RouterStateSnapshot,
  RoutesRecognized
} from '@angular/router'
import { ROUTER_NAVIGATED, RouterNavigatedAction } from '@ngrx/router-store'
import { MockStore, createMockStore } from '@ngrx/store/testing'
import { ReplaySubject, of, throwError } from 'rxjs'
import { hot } from 'jest-marbles'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import { PortalDialogService } from '@onecx/angular-accelerator'

import { ImagesAPIService, RefType, TenantAPIService } from 'src/app/shared/generated'
import { TenantSearchEffects, DialogConfig } from './tenant-search.effects'
import { TenantSearchActions } from './tenant-search.actions'
import { tenantSearchSelectors } from './tenant-search.selectors'
import { TenantSearchComponent } from './tenant-search.component'
import { TenantDialogMode } from './dialogs/tenant-create-update/tenant-create-update.types'
import { TenantCreateUpdateComponent } from './dialogs/tenant-create-update/tenant-create-update.component'

class MockRouter implements Partial<Router> {
  constructor(effectsActions: ReplaySubject<any>) {
    this.effectsActions = effectsActions
  }
  events = new ReplaySubject<any>(1)
  routerState = {
    root: {},
    snapshot: {
      root: {}
    }
  } as RouterState
  effectsActions: ReplaySubject<any>

  routeFor = (component: Type<any>) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.routerState!.root!.component! = component
  }

  setRouterUrl = (url: string) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.routerState!.snapshot.url = url
  }

  configureNavigationUrl = (routerAction: RouterNavigatedAction, currentUrl: string, newUrl: string) => {
    this.setRouterUrl(currentUrl)
    routerAction.payload = {
      event: {
        urlAfterRedirects: newUrl
      }
    } as any
  }

  setRouterParams = (params: any) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.routerState!.snapshot.root.queryParams = params
  }

  configureQueryParams = (routerAction: RouterNavigatedAction, routerParams: any, actionParams: any) => {
    this.setRouterParams(routerParams)
    routerAction.payload = {
      routerState: {
        root: {
          queryParams: actionParams
        }
      }
    } as any
  }

  simulateNavigation = (routerAction: RouterNavigatedAction) => {
    ;(this.events as ReplaySubject<any>).next(new RoutesRecognized(0, '', '', {} as RouterStateSnapshot))
    this.effectsActions.next(routerAction)
  }

  navigate(commands: any[], extras?: NavigationExtras | undefined): Promise<boolean> {
    const routerNavigatedAction = {
      type: ROUTER_NAVIGATED
    } as RouterNavigatedAction
    routerNavigatedAction.payload = {
      routerState: {
        root: {
          queryParams: extras?.queryParams
        }
      }
    } as any
    this.simulateNavigation(routerNavigatedAction)
    return Promise.resolve(true)
  }
}

describe('TenantSearchEffects:', () => {
  const activatedRouteMock: Partial<ActivatedRoute> = {}
  let mockedRouter: MockRouter
  let store: MockStore
  const initialState = {}

  const mockedTenantService: Partial<TenantAPIService> = {
    searchTenants: jest.fn(),
    updateTenant: jest.fn(),
    createTenant: jest.fn()
  }
  const mockedMessageService: Partial<PortalMessageService> = {
    error: jest.fn(),
    success: jest.fn()
  }
  const mockedImageService: Partial<ImagesAPIService> = {
    uploadImage: jest.fn(),
    deleteImage: jest.fn()
  }
  const mockedDialogService: Partial<PortalDialogService> = {
    openDialog: jest.fn()
  }

  const mockedUserService: Partial<UserService> = {
    hasPermission: jest.fn()
  }

  let effectsActions: ReplaySubject<any>
  const initEffects = () => {
    return new TenantSearchEffects(
      mockedDialogService as PortalDialogService,
      effectsActions,
      activatedRouteMock as ActivatedRoute,
      mockedTenantService as TenantAPIService,
      mockedRouter as any,
      store,
      mockedMessageService as PortalMessageService,
      mockedImageService as ImagesAPIService,
      mockedUserService as UserService
    )
  }

  beforeEach(() => {
    effectsActions = new ReplaySubject<any>(1)
    activatedRouteMock.queryParams = new ReplaySubject<any>(1)
    mockedRouter = new MockRouter(effectsActions)
    store = createMockStore({ initialState })
    jest.resetAllMocks()
    ;(mockedUserService.hasPermission as jest.Mock).mockResolvedValue(true)
  })

  it('should display error when TenantSearchActions.tenantSearchResultsLoadingFailed dispatched', (done) => {
    const effects = initEffects()
    effectsActions.next(
      TenantSearchActions.tenantSearchResultsLoadingFailed({
        error: null
      })
    )

    effects.displayError$.subscribe(() => {
      expect(mockedMessageService.error).toHaveBeenLastCalledWith({
        summaryKey: 'TENANT_SEARCH.ERROR_MESSAGES.SEARCH_RESULTS_LOADING_FAILED'
      })
      done()
    })
  })

  it('should not display error when action without error mapping dispatched', (done) => {
    const effects = initEffects()
    // any not mapped action
    effectsActions.next(TenantSearchActions.chartVisibilityToggled())

    effects.displayError$.subscribe(() => {
      expect(mockedMessageService.error).toHaveBeenCalledTimes(0)
      done()
    })
  })

  it('should save visible: true to localStorage when TenantSearchActions.chartVisibilityToggled dispatched', (done) => {
    jest.spyOn(Storage.prototype, 'setItem')

    store.overrideSelector(tenantSearchSelectors.selectChartVisible, true)

    const effects = initEffects()
    effectsActions.next(TenantSearchActions.chartVisibilityToggled())

    effects.saveChartVisibility$.subscribe(() => {
      expect(localStorage.setItem).toHaveBeenLastCalledWith('tenantChartVisibility', 'true')
      done()
    })
  })

  it('should save visible: false to localStorage when TenantSearchActions.chartVisibilityToggled dispatched', (done) => {
    jest.spyOn(Storage.prototype, 'setItem')

    store.overrideSelector(tenantSearchSelectors.selectChartVisible, false)

    const effects = initEffects()
    effectsActions.next(TenantSearchActions.chartVisibilityToggled())

    effects.saveChartVisibility$.subscribe(() => {
      expect(localStorage.setItem).toHaveBeenLastCalledWith('tenantChartVisibility', 'false')
      done()
    })
  })

  it('should dispatch TenantSearchActions.chartVisibilityRehydrated with visible: true on TenantSearchComponent route navigation', (done) => {
    const localStorageSpy = jest.spyOn(Storage.prototype, 'getItem')
    localStorageSpy.mockReturnValue('true')

    const effects = initEffects()

    const routerNavigatedAction = {
      type: ROUTER_NAVIGATED
    } as RouterNavigatedAction
    mockedRouter.routeFor(TenantSearchComponent)
    mockedRouter.configureNavigationUrl(routerNavigatedAction, 'current_url', 'navigation_url')
    mockedRouter.simulateNavigation(routerNavigatedAction)

    effects.rehydrateChartVisibility$.subscribe((action) => {
      expect(action.visible).toBe(true)
      done()
    })
  })

  it('should dispatch TenantSearchActions.chartVisibilityRehydrated with visible: false on TenantSearchComponent route navigation', (done) => {
    const localStorageSpy = jest.spyOn(Storage.prototype, 'getItem')
    localStorageSpy.mockReturnValue('false')

    const effects = initEffects()

    const routerNavigatedAction = {
      type: ROUTER_NAVIGATED
    } as RouterNavigatedAction
    mockedRouter.routeFor(TenantSearchComponent)
    mockedRouter.configureNavigationUrl(routerNavigatedAction, 'current_url', 'navigation_url')
    mockedRouter.simulateNavigation(routerNavigatedAction)

    effects.rehydrateChartVisibility$.subscribe((action) => {
      expect(action.visible).toBe(false)
      done()
    })
  })

  it('should dispatch TenantSearchActions.tenantSearchResultsReceived with search results on new search criteria', (done) => {
    const tenants = {
      stream: [
        {
          id: '1'
        },
        {
          id: '2'
        }
      ],
      totalElements: 2
    }
    jest.spyOn(mockedTenantService, 'searchTenants').mockReturnValue(of(tenants) as any)

    const previousSearchCriteriaParams = {
      orgId: 'prev_org_id',
      pageNumber: '1',
      pageSize: '1'
    }
    const newSearchCriteriaParams = {
      orgId: 'org_id',
      pageNumber: '1',
      pageSize: '1'
    }
    const newSearchCriteria = {
      orgId: 'org_id',
      pageNumber: 1,
      pageSize: 1
    }
    store.overrideSelector(tenantSearchSelectors.selectCriteria, newSearchCriteria)

    const effects = initEffects()

    const routerNavigatedAction = {
      type: ROUTER_NAVIGATED
    } as RouterNavigatedAction
    mockedRouter.routeFor(TenantSearchComponent)
    mockedRouter.configureQueryParams(routerNavigatedAction, previousSearchCriteriaParams, newSearchCriteriaParams)
    mockedRouter.simulateNavigation(routerNavigatedAction)

    effects.searchByUrl$.subscribe((action) => {
      expect(mockedTenantService.searchTenants).toHaveBeenLastCalledWith({ tenantSearchCriteria: newSearchCriteria })
      expect(action).toEqual({
        type: TenantSearchActions.tenantSearchResultsReceived.type,
        results: tenants.stream,
        totalElements: tenants.totalElements
      })
      done()
    })
  })

  it('should dispatch TenantSearchActions.tenantSearchResultsLoadingFailed when search call fails on new search criteria', (done) => {
    const error = {
      cause: 'Bad org id'
    }
    jest.spyOn(mockedTenantService, 'searchTenants').mockReturnValue(throwError(() => error))

    const previousSearchCriteriaParams = {
      orgId: 'prev_org_id',
      pageNumber: '1',
      pageSize: '1'
    }
    const newSearchCriteriaParams = {
      orgId: 'org_id',
      pageNumber: '1',
      pageSize: '1'
    }
    const newSearchCriteria = {
      orgId: 'org_id',
      pageNumber: 1,
      pageSize: 1
    }
    store.overrideSelector(tenantSearchSelectors.selectCriteria, newSearchCriteria)

    const effects = initEffects()

    const routerNavigatedAction = {
      type: ROUTER_NAVIGATED
    } as RouterNavigatedAction
    mockedRouter.routeFor(TenantSearchComponent)
    mockedRouter.configureQueryParams(routerNavigatedAction, previousSearchCriteriaParams, newSearchCriteriaParams)
    mockedRouter.simulateNavigation(routerNavigatedAction)

    effects.searchByUrl$.subscribe((action) => {
      expect(mockedTenantService.searchTenants).toHaveBeenLastCalledWith({ tenantSearchCriteria: newSearchCriteria })
      expect(action).toEqual({
        type: TenantSearchActions.tenantSearchResultsLoadingFailed.type,
        error: error
      })
      done()
    })
  })

  it('should not dispatch anything via searchByUrl on same search criteria', () => {
    const sameSearchCriteria = {
      orgId: 'org_id',
      pageNumber: 1,
      pageSize: 1
    }

    const routerNavigatedAction = {
      type: ROUTER_NAVIGATED
    } as RouterNavigatedAction
    mockedRouter.routeFor(TenantSearchComponent)
    mockedRouter.configureQueryParams(routerNavigatedAction, sameSearchCriteria, { orgId: 'ass' })

    const effects = initEffects()
    effectsActions.next(
      hot('-a', {
        a: routerNavigatedAction
      })
    )

    const expected = hot('--')

    expect(effects.searchByUrl$).toBeObservable(expected)
  })

  it('should navigate when query params are different than search criteria on TenantSearchActions.searchButtonClicked dispatch', (done) => {
    const spy = jest.spyOn(mockedRouter, 'navigate')

    const effects = initEffects()
    ;(activatedRouteMock.queryParams as ReplaySubject<any>).next({
      orgId: 'orgId'
    })
    store.overrideSelector(tenantSearchSelectors.selectCriteria, { orgId: 'differentId' })
    effectsActions.next(
      TenantSearchActions.searchButtonClicked({
        searchCriteria: { orgId: '' }
      })
    )

    effects.syncParamsToUrl$.subscribe(() => {
      expect(spy).toHaveBeenCalledTimes(1)
      done()
    })
  })

  it('should not navigate when query params are same as search criteria on TenantSearchActions.searchButtonClicked dispatch', (done) => {
    const spy = jest.spyOn(mockedRouter, 'navigate')

    const criteria = {
      orgId: 'orgId'
    }

    const effects = initEffects()
    ;(activatedRouteMock.queryParams as ReplaySubject<any>).next(criteria)
    store.overrideSelector(tenantSearchSelectors.selectCriteria, criteria)
    effectsActions.next(
      TenantSearchActions.searchButtonClicked({
        searchCriteria: { orgId: '' }
      })
    )

    effects.syncParamsToUrl$.subscribe(() => {
      expect(spy).toHaveBeenCalledTimes(0)
      done()
    })
  })

  it('should navigate when query params are different than search criteria on TenantSearchActions.resetButtonClicked dispatch', (done) => {
    const spy = jest.spyOn(mockedRouter, 'navigate')

    const effects = initEffects()
    ;(activatedRouteMock.queryParams as ReplaySubject<any>).next({
      orgId: 'orgId'
    })
    store.overrideSelector(tenantSearchSelectors.selectCriteria, { orgId: 'differentId' })
    effectsActions.next(TenantSearchActions.resetButtonClicked())

    effects.syncParamsToUrl$.subscribe(() => {
      expect(spy).toHaveBeenCalledTimes(1)
      done()
    })
  })

  it('should not navigate when query params are same as search criteria on TenantSearchActions.resetButtonClicked dispatch', (done) => {
    const spy = jest.spyOn(mockedRouter, 'navigate')

    const criteria = {
      orgId: 'orgId'
    }

    const effects = initEffects()
    ;(activatedRouteMock.queryParams as ReplaySubject<any>).next(criteria)
    store.overrideSelector(tenantSearchSelectors.selectCriteria, criteria)
    effectsActions.next(TenantSearchActions.resetButtonClicked())

    effects.syncParamsToUrl$.subscribe(() => {
      expect(spy).toHaveBeenCalledTimes(0)
      done()
    })
  })

  it('should dispatch open details when user has no admin permission', (done) => {
    jest.spyOn(mockedUserService, 'hasPermission').mockResolvedValue(false)

    const effects = initEffects()
    effectsActions.next(TenantSearchActions.dialogForExistingEntryOpened({ id: '1' }))

    effects.openDialogForExistingEntry$.subscribe((action) => {
      expect(action.type).toBe(TenantSearchActions.openTenantDetailsButtonClicked.type)
      done()
    })
  })

  it('should dispatch edit details when user has admin permission', (done) => {
    jest.spyOn(mockedUserService, 'hasPermission').mockResolvedValue(true)

    const effects = initEffects()
    effectsActions.next(TenantSearchActions.dialogForExistingEntryOpened({ id: '1' }))

    effects.openDialogForExistingEntry$.subscribe((action) => {
      expect(action.type).toBe(TenantSearchActions.editTenantButtonClicked.type)
      done()
    })
  })

  describe('Refresh search after create/update', () => {
    it('should refresh search after tenant create succeeded', (done) => {
      const searchCriteria = {
        orgId: 'test-org',
        pageNumber: 1,
        pageSize: 10
      }
      const searchResults = {
        stream: [
          { id: '1', orgId: 'org1', description: 'First' },
          { id: '2', orgId: 'org2', description: 'Second' }
        ],
        totalElements: 2
      }

      store.overrideSelector(tenantSearchSelectors.selectCriteria, searchCriteria)
      jest.spyOn(mockedTenantService, 'searchTenants').mockReturnValue(of(searchResults) as any)

      const effects = initEffects()
      effectsActions.next(TenantSearchActions.createTenantSucceeded())

      effects.refreshSearchAfterCreateUpdate$.subscribe((action) => {
        expect(mockedTenantService.searchTenants).toHaveBeenCalledWith({ tenantSearchCriteria: searchCriteria })
        expect(action.type).toBe(TenantSearchActions.tenantSearchResultsReceived.type)
        expect((action as any).results).toEqual(searchResults.stream)
        expect((action as any).totalElements).toBe(searchResults.totalElements)
        done()
      })
    })

    it('should refresh search after tenant update succeeded', (done) => {
      const searchCriteria = {
        orgId: 'test-org',
        pageNumber: 1,
        pageSize: 10
      }
      const searchResults = {
        stream: [{ id: '1', orgId: 'org1', description: 'Updated' }],
        totalElements: 1
      }

      store.overrideSelector(tenantSearchSelectors.selectCriteria, searchCriteria)
      jest.spyOn(mockedTenantService, 'searchTenants').mockReturnValue(of(searchResults) as any)

      const effects = initEffects()
      effectsActions.next(TenantSearchActions.updateTenantSucceeded())

      effects.refreshSearchAfterCreateUpdate$.subscribe((action) => {
        expect(mockedTenantService.searchTenants).toHaveBeenCalledWith({ tenantSearchCriteria: searchCriteria })
        expect(action.type).toBe(TenantSearchActions.tenantSearchResultsReceived.type)
        expect((action as any).results).toEqual(searchResults.stream)
        expect((action as any).totalElements).toBe(searchResults.totalElements)
        done()
      })
    })
  })

  describe('Tenant edit dialog', () => {
    it('should cancel edit when dialog state is undefined', (done) => {
      store.overrideSelector(tenantSearchSelectors.selectResults, [{ id: '1', orgId: 'org1' }])
      jest.spyOn(mockedDialogService, 'openDialog').mockReturnValue(of({ button: 'secondary', result: {} }) as any)
      const messageServiceSpy = jest.spyOn(mockedMessageService, 'success')
      const effects = initEffects()

      effectsActions.next(TenantSearchActions.editTenantButtonClicked({ id: '1' }))

      effects.editButtonClicked$.subscribe((action) => {
        expect(action.type).toBe(TenantSearchActions.updateTenantCancelled.type)
        expect(messageServiceSpy).not.toHaveBeenCalled()
        done()
      })
    })

    it('should fail update when dialog result is undefined', (done) => {
      store.overrideSelector(tenantSearchSelectors.selectResults, [{ id: '1', orgId: 'org1' }])

      jest.spyOn(mockedDialogService, 'openDialog').mockReturnValue(of({ button: 'primary', result: null } as any))

      const effects = initEffects()

      effectsActions.next(TenantSearchActions.editTenantButtonClicked({ id: '1' }))

      effects.editButtonClicked$.subscribe((action) => {
        expect(mockedMessageService.error).toHaveBeenCalled()
        expect(action.type).toBe(TenantSearchActions.updateTenantFailed.type)
        expect((action as any).error).toBe('DialogResult was not set as expected!')
        done()
      })
    })

    it('should fail update when dialog result is missing', (done) => {
      store.overrideSelector(tenantSearchSelectors.selectResults, [{ id: '1', orgId: 'org1' }])

      jest.spyOn(mockedDialogService, 'openDialog').mockReturnValue(of({ button: 'primary', result: undefined } as any))
      const effects = initEffects()

      effects.editButtonClicked$.subscribe({
        next: (action) => {
          expect(mockedMessageService.error).toHaveBeenCalled()
          expect(action.type).toBe(TenantSearchActions.updateTenantFailed.type)
          expect((action as any).error).toBe('DialogResult was not set as expected!')
          done()
        },
        error: (error) => done(error)
      })

      effectsActions.next(TenantSearchActions.editTenantButtonClicked({ id: '1' }))
    })

    it('should emit failure when update service fails', (done) => {
      store.overrideSelector(tenantSearchSelectors.selectResults, [{ id: '1', orgId: 'org1' }])

      jest
        .spyOn(mockedDialogService, 'openDialog')
        .mockReturnValue(of({ button: 'primary', result: { id: '1', orgId: '1', description: 'desc' } } as any))
      const updateError = new Error('update failed')
      jest.spyOn(mockedTenantService, 'updateTenant').mockReturnValue(throwError(() => updateError) as any)

      const effects = initEffects()

      effects.editButtonClicked$.subscribe({
        next: (action) => {
          expect(mockedMessageService.error).toHaveBeenCalledWith({ summaryKey: 'TENANT_CREATE_UPDATE.UPDATE.ERROR' })
          expect(action.type).toBe(TenantSearchActions.updateTenantFailed.type)
          expect((action as any).error).toBe(updateError)
          done()
        },
        error: (error) => done(error)
      })

      effectsActions.next(TenantSearchActions.editTenantButtonClicked({ id: '1' }))
    })

    it('should update object without image properly', (done) => {
      const itemToEdit = {
        orgId: '2',
        description: 'Test Desc'
      }
      store.overrideSelector(tenantSearchSelectors.selectResults, [{ id: '1', orgId: 'org1' }])

      jest
        .spyOn(mockedDialogService, 'openDialog')
        .mockReturnValue(of({ button: 'primary', result: { id: '1', ...itemToEdit } } as any))
      jest.spyOn(mockedTenantService, 'updateTenant').mockReturnValue(of(itemToEdit as any))

      const effects = initEffects()

      effectsActions.next(TenantSearchActions.editTenantButtonClicked({ id: '1' }))

      effects.editButtonClicked$.subscribe((action) => {
        expect(mockedMessageService.success).toHaveBeenCalled()
        expect(mockedImageService.uploadImage).not.toHaveBeenCalled()
        expect(action.type).toBe(TenantSearchActions.updateTenantSucceeded.type)
        expect(mockedTenantService.updateTenant).toHaveBeenCalledWith({ id: '1', updateTenantRequest: itemToEdit })
        done()
      })
    })

    it('should update tenant with image', (done) => {
      const objectId = '1'
      const itemToEdit = {
        orgId: '2',
        description: 'Test Desc'
      }
      const image = new Blob()
      const imageRequest = {
        refId: objectId,
        refType: RefType.Logo,
        body: image
      }
      store.overrideSelector(tenantSearchSelectors.selectResults, [{ id: objectId, orgId: 'org1' }])

      jest
        .spyOn(mockedDialogService, 'openDialog')
        .mockReturnValue(of({ button: 'primary', result: { id: objectId, image, ...itemToEdit } } as any))
      jest.spyOn(mockedTenantService, 'updateTenant').mockReturnValue(of(itemToEdit as any))
      jest.spyOn(mockedImageService, 'uploadImage').mockReturnValue(of({} as any))

      const effects = initEffects()

      effectsActions.next(TenantSearchActions.editTenantButtonClicked({ id: objectId }))

      effects.editButtonClicked$.subscribe((action) => {
        expect(mockedMessageService.success).toHaveBeenCalled()
        expect(mockedImageService.uploadImage).toHaveBeenCalledWith(imageRequest)
        expect(action.type).toBe(TenantSearchActions.updateTenantSucceeded.type)
        expect(mockedTenantService.updateTenant).toHaveBeenCalledWith({ id: '1', updateTenantRequest: itemToEdit })
        done()
      })
    })
    it('should remove image when flagged as removed', (done) => {
      const objectId = '1'
      const itemToEdit = {
        orgId: '2',
        description: 'Test Desc'
      }
      const deleteImageRequest = {
        refId: objectId,
        refType: RefType.Logo
      }
      store.overrideSelector(tenantSearchSelectors.selectResults, [{ id: objectId, orgId: 'org1' }])

      jest
        .spyOn(mockedDialogService, 'openDialog')
        .mockReturnValue(of({ button: 'primary', result: { id: objectId, imageRemoved: true, ...itemToEdit } } as any))
      jest.spyOn(mockedTenantService, 'updateTenant').mockReturnValue(of(itemToEdit as any))
      jest.spyOn(mockedImageService, 'deleteImage').mockReturnValue(of({} as any))

      const effects = initEffects()

      effectsActions.next(TenantSearchActions.editTenantButtonClicked({ id: objectId }))

      effects.editButtonClicked$.subscribe((action) => {
        expect(mockedMessageService.success).toHaveBeenCalled()
        expect(mockedImageService.deleteImage).toHaveBeenCalledWith(deleteImageRequest)
        expect(mockedImageService.uploadImage).not.toHaveBeenCalled()
        expect(action.type).toBe(TenantSearchActions.updateTenantSucceeded.type)
        expect(mockedTenantService.updateTenant).toHaveBeenCalledWith({ id: '1', updateTenantRequest: itemToEdit })
        done()
      })
    })

    it('should remove image when flagged as removed', (done) => {
      const objectId = '1'
      const itemToEdit = {
        orgId: '2',
        description: 'Test Desc'
      }
      const deleteImageRequest = {
        refId: objectId,
        refType: RefType.Logo
      }
      store.overrideSelector(tenantSearchSelectors.selectResults, [{ id: objectId, orgId: 'org1' }])

      jest
        .spyOn(mockedDialogService, 'openDialog')
        .mockReturnValue(of({ button: 'primary', result: { id: objectId, imageRemoved: true, ...itemToEdit } } as any))
      jest.spyOn(mockedTenantService, 'updateTenant').mockReturnValue(of(itemToEdit as any))
      jest.spyOn(mockedImageService, 'deleteImage').mockReturnValue(of({} as any))

      const effects = initEffects()

      effectsActions.next(TenantSearchActions.editTenantButtonClicked({ id: objectId }))

      effects.editButtonClicked$.subscribe((action) => {
        expect(mockedMessageService.success).toHaveBeenCalled()
        expect(mockedImageService.deleteImage).toHaveBeenCalledWith(deleteImageRequest)
        expect(mockedImageService.uploadImage).not.toHaveBeenCalled()
        expect(action.type).toBe(TenantSearchActions.updateTenantSucceeded.type)
        expect(mockedTenantService.updateTenant).toHaveBeenCalledWith({ id: '1', updateTenantRequest: itemToEdit })
        done()
      })
    })

    it('should upload and remove image when both flags are present', (done) => {
      const objectId = '1'
      const itemToEdit = {
        orgId: '2',
        description: 'Test Desc'
      }
      const image = new Blob()
      const deleteImageRequest = {
        refId: objectId,
        refType: RefType.Logo
      }
      const uploadImageRequest = {
        refId: objectId,
        refType: RefType.Logo,
        body: image
      }

      store.overrideSelector(tenantSearchSelectors.selectResults, [{ id: objectId, orgId: 'org1' }])

      jest
        .spyOn(mockedDialogService, 'openDialog')
        .mockReturnValue(
          of({ button: 'primary', result: { id: objectId, imageRemoved: true, image, ...itemToEdit } } as any)
        )
      jest.spyOn(mockedTenantService, 'updateTenant').mockReturnValue(of(itemToEdit as any))
      jest.spyOn(mockedImageService, 'uploadImage').mockReturnValue(of({} as any))
      jest.spyOn(mockedImageService, 'deleteImage').mockReturnValue(of({} as any))

      const effects = initEffects()

      effectsActions.next(TenantSearchActions.editTenantButtonClicked({ id: objectId }))

      effects.editButtonClicked$.subscribe((action) => {
        expect(mockedImageService.uploadImage).toHaveBeenCalledWith(uploadImageRequest)
        expect(mockedImageService.deleteImage).toHaveBeenCalledWith(deleteImageRequest)
        expect(action.type).toBe(TenantSearchActions.updateTenantSucceeded.type)
        done()
      })
    })
  })

  describe('Tenant create dialog', () => {
    it('should cancel create when dialog state is undefined', (done) => {
      jest.spyOn(mockedDialogService, 'openDialog').mockReturnValue(of({ button: 'secondary', result: {} }) as any)
      const messageServiceSpy = jest.spyOn(mockedMessageService, 'success')
      const effects = initEffects()

      effectsActions.next(TenantSearchActions.createTenantButtonClicked())

      effects.createButtonClicked$.subscribe((action) => {
        expect(action.type).toBe(TenantSearchActions.createTenantCancelled.type)
        expect(messageServiceSpy).not.toHaveBeenCalled()
        done()
      })
    })

    it('should fail create when dialog result is undefined', (done) => {
      jest.spyOn(mockedDialogService, 'openDialog').mockReturnValue(of({ button: 'primary', result: null } as any))

      const effects = initEffects()

      effectsActions.next(TenantSearchActions.createTenantButtonClicked())

      effects.createButtonClicked$.subscribe((action) => {
        expect(mockedMessageService.error).toHaveBeenCalled()
        expect(action.type).toBe(TenantSearchActions.createTenantFailed.type)
        expect((action as any).error).toBe('DialogResult was not set as expected!')
        done()
      })
    })

    it('should fail create when dialog result is missing', (done) => {
      jest.spyOn(mockedDialogService, 'openDialog').mockReturnValue(of({ button: 'primary', result: undefined } as any))

      const effects = initEffects()

      effects.createButtonClicked$.subscribe({
        next: (action) => {
          expect(mockedMessageService.error).toHaveBeenCalled()
          expect(action.type).toBe(TenantSearchActions.createTenantFailed.type)
          expect((action as any).error).toBe('DialogResult was not set as expected!')
          done()
        },
        error: (error) => done(error)
      })

      effectsActions.next(TenantSearchActions.createTenantButtonClicked())
    })

    it('should emit failure when create service fails', (done) => {
      jest
        .spyOn(mockedDialogService, 'openDialog')
        .mockReturnValue(
          of({ button: 'primary', result: { orgId: '1', description: 'desc', tenantId: 'id-1' } } as any)
        )

      const createError = new Error('create failed')
      jest.spyOn(mockedTenantService, 'createTenant').mockReturnValue(throwError(() => createError) as any)

      const effects = initEffects()

      effects.createButtonClicked$.subscribe({
        next: (action) => {
          expect(mockedMessageService.error).toHaveBeenCalledWith({ summaryKey: 'TENANT_CREATE_UPDATE.CREATE.ERROR' })
          expect(action.type).toBe(TenantSearchActions.createTenantFailed.type)
          expect((action as any).error).toBe(createError)
          done()
        },
        error: (error) => done(error)
      })

      effectsActions.next(TenantSearchActions.createTenantButtonClicked())
    })

    it('should create tenant properly', (done) => {
      const itemToCreate = {
        orgId: '2',
        description: 'Test Desc',
        tenantId: '2'
      }
      jest
        .spyOn(mockedDialogService, 'openDialog')
        .mockReturnValue(of({ button: 'primary', result: { ...itemToCreate } } as any))
      jest.spyOn(mockedTenantService, 'createTenant').mockReturnValue(of({} as any))
      const effects = initEffects()
      effectsActions.next(TenantSearchActions.createTenantButtonClicked())

      effects.createButtonClicked$.subscribe((action) => {
        expect(mockedMessageService.success).toHaveBeenCalled()
        expect(mockedTenantService.createTenant).toHaveBeenCalledWith({ createTenantRequest: itemToCreate })
        expect(action.type).toBe(TenantSearchActions.createTenantSucceeded.type)
        done()
      })
    })
  })

  describe('Tenant details dialog', () => {
    it('should open details dialog with proper configuration', (done) => {
      const tenantDetails = { id: '1', orgId: 'org1', tenantId: 'tenant1', description: 'Test' }
      store.overrideSelector(tenantSearchSelectors.selectResults, [tenantDetails])

      const openDialogSpy = jest.spyOn(mockedDialogService, 'openDialog').mockReturnValue(of({} as any))

      const effects = initEffects()
      effectsActions.next(TenantSearchActions.openTenantDetailsButtonClicked({ id: '1' }))

      effects.openDetailsButtonClicked$.subscribe(() => {
        expect(openDialogSpy).toHaveBeenCalledWith(
          'TENANT_CREATE_UPDATE.DETAILS.HEADER',
          expect.objectContaining({
            type: TenantCreateUpdateComponent,
            inputs: expect.objectContaining({
              vm: expect.objectContaining({
                itemToEdit: tenantDetails
              }),
              dialogMode: TenantDialogMode.DETAILS
            })
          }),
          expect.objectContaining({
            key: 'TENANT_CREATE_UPDATE.DETAILS.BUTTON'
          }),
          undefined,
          expect.objectContaining(DialogConfig)
        )
        done()
      })
    })

    it('should find correct tenant by id from results', (done) => {
      const tenants = [
        { id: '1', orgId: 'org1', description: 'First' },
        { id: '2', orgId: 'org2', description: 'Second' },
        { id: '3', orgId: 'org3', description: 'Third' }
      ]
      store.overrideSelector(tenantSearchSelectors.selectResults, tenants)

      const openDialogSpy = jest.spyOn(mockedDialogService, 'openDialog').mockReturnValue(of({} as any))

      const effects = initEffects()
      effectsActions.next(TenantSearchActions.openTenantDetailsButtonClicked({ id: '2' }))

      effects.openDetailsButtonClicked$.subscribe(() => {
        expect(openDialogSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            inputs: expect.objectContaining({
              vm: expect.objectContaining({
                itemToEdit: tenants[1]
              }),
              dialogMode: TenantDialogMode.DETAILS
            })
          }),
          expect.objectContaining({ key: expect.any(String) }),
          undefined,
          expect.any(Object)
        )
        done()
      })
    })
  })
})
