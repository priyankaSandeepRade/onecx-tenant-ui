import { ComponentFixture, TestBed } from '@angular/core/testing'
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { LetDirective } from '@ngrx/component'
import { ofType } from '@ngrx/effects'
import { Store, StoreModule } from '@ngrx/store'
import { MockStore, provideMockStore } from '@ngrx/store/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { DialogService } from 'primeng/dynamicdialog'
import { PrimeIcons } from 'primeng/api'

import { AngularAcceleratorModule, ColumnType, DataTableColumn } from '@onecx/angular-accelerator'
import { PermissionService } from '@onecx/angular-utils'
import { UserService } from '@onecx/angular-integration-interface'

import { TenantSearchActions } from './tenant-search.actions'
import { TenantSearchComponent } from './tenant-search.component'
import { initialState } from './tenant-search.reducers'
import { selectTenantSearchViewModel } from './tenant-search.selectors'
import { TenantSearchViewModel } from './tenant-search.viewmodel'
import { TenantSearchHarness } from './tenant-search.harness'
import { Tenant } from 'src/app/shared/generated'
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'
import { TranslateService } from '@ngx-translate/core'
import { firstValueFrom, map, of } from 'rxjs'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { tenantSearchCriteriasSchema } from './tenant-search.parameters'
import { CardModule } from 'primeng/card'
import { provideAppStateServiceMock } from '@onecx/angular-integration-interface/mocks'

fdescribe('TenantSearchComponent', () => {
  let component: TenantSearchComponent
  let fixture: ComponentFixture<TenantSearchComponent>
  let store: MockStore<Store>
  let formBuilder: FormBuilder
  let tenantSearch: TenantSearchHarness

  const mockActivatedRoute = {}

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    })
  })

  /* eslint-disable @typescript-eslint/no-var-requires */
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TenantSearchComponent,
        AngularAcceleratorModule,
        LetDirective,
        ReactiveFormsModule,
        StoreModule.forRoot({}),
        TranslateTestingModule.withTranslations({
          de: require('./src/assets/i18n/de.json'),
          en: require('./src/assets/i18n/en.json')
        }).withDefaultLanguage('en'),
        NoopAnimationsModule,
        CardModule
      ],
      providers: [
        DialogService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockStore({
          initialState: { tenant: { search: initialState } }
        }),
        FormBuilder,
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        provideAppStateServiceMock(),
        {
          provide: PermissionService,
          useValue: {
            hasPermission: () => of(true),
            getPermissions: () => of([])
          }
        }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
    }).compileComponents()
  })
  /* eslint-disable @typescript-eslint/no-var-requires */

  beforeEach(async () => {
    const userService = TestBed.inject(UserService)
    userService.hasPermission = () => Promise.resolve(true)
    const translateService = TestBed.inject(TranslateService)
    translateService.use('en')
    fixture = TestBed.createComponent(TenantSearchComponent)
    component = fixture.componentInstance
    store = TestBed.inject(MockStore)
    formBuilder = TestBed.inject(FormBuilder)
    fixture.detectChanges()
    tenantSearch = await TestbedHarnessEnvironment.harnessForFixture(fixture, TenantSearchHarness)
    window.URL.createObjectURL = jest.fn()
  })

  it('should create the component', () => {
    expect(component).toBeTruthy()
  })

  it('should dispatch searchButtonClicked action on search', (done) => {
    const formValue = formBuilder.group({ changeMe: '123' })
    component.tenantSearchForm = formValue
    component.visibleFormControls = [{ name: 'changeMe' }] as any

    store.scannedActions$.pipe(ofType(TenantSearchActions.searchButtonClicked)).subscribe((a) => {
      expect(a.searchCriteria).toEqual({ changeMe: '123' })
      done()
    })

    component.onSearch(formValue)
  })

  it('should dispatch resetButtonClicked action on reset search', () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch')

    component.onResetSearchCriteria()

    expect(dispatchSpy).toHaveBeenCalledWith(TenantSearchActions.resetButtonClicked())
  })

  it('should dispatch searchButtonClicked action on search', (done) => {
    const date = new Date()
    const formValue = formBuilder.group({ date: date })
    component.tenantSearchForm = formValue
    component.visibleFormControls = [{ name: 'changeMe' }] as any

    store.scannedActions$.pipe(ofType(TenantSearchActions.searchButtonClicked)).subscribe((a) => {
      expect(a.searchCriteria).toEqual({ date: null })
    })
    done()

    component.onSearch(formValue)
  })

  it('should convert valid date to UTC and falsy value to null in searchCriteria', (done) => {
    const date = new Date(2023, 5, 15, 10, 30, 0)
    const formValue = formBuilder.group({
      validDate: date,
      emptyField: '',
      pageSize: '',
      pageNumber: undefined
    })

    component.tenantSearchForm = formValue
    component.visibleFormControls = [{ name: 'validDate' }, { name: 'emptyField' }] as any

    store.scannedActions$.pipe(ofType(TenantSearchActions.searchButtonClicked)).subscribe((a) => {
      expect(a.searchCriteria).toEqual({
        validDate: new Date(Date.UTC(2023, 5, 15, 10, 30, 0)),
        emptyField: null,
        pageSize: null,
        pageNumber: null
      })
    })
    done()

    component.onSearch(formValue)
  })

  it('should transform empty string to undefined', () => {
    const parsed = tenantSearchCriteriasSchema.parse({
      pageNumber: '',
      pageSize: ''
    })

    expect(parsed.pageNumber).toBeUndefined()
    expect(parsed.pageSize).toBeUndefined()
  })

  it('should filter results using orgId or tenantId', () => {
    const matchingOrg = { orgId: 'Alpha', tenantId: 'T-1' } as any
    const matchingTenant = { orgId: 'Other', tenantId: 'Target' } as any
    const nonMatching = { orgId: 'Beta', tenantId: 'Something' } as any
    const missingIds = {} as any

    ;(component as any).handleFilterChange('alpha', [matchingOrg, matchingTenant, nonMatching])
    expect(component.filteredResults$.value).toEqual([matchingOrg])
    ;(component as any).handleFilterChange('target', [matchingOrg, matchingTenant, nonMatching])
    expect(component.filteredResults$.value).toEqual([matchingTenant])
    ;(component as any).handleFilterChange('missing', [matchingOrg, matchingTenant, nonMatching])
    expect(component.filteredResults$.value).toEqual([])
    ;(component as any).handleFilterChange('none', [missingIds])
    expect(component.filteredResults$.value).toEqual([])
  })

  it('should return unfiltered results when filter is empty', () => {
    const items = [{ orgId: 'Alpha', tenantId: 'T-1' }] as any

    ;(component as any).handleFilterChange('', items)
    expect(component.filteredResults$.value).toEqual(items)
    ;(component as any).handleFilterChange(null, items)
    expect(component.filteredResults$.value).toEqual(items)
  })

  it('should dispatch view mode change', async () => {
    jest.spyOn(store, 'dispatch')
    const baseTenantSearchViewModel: TenantSearchViewModel = {
      chartVisible: true,
      columns: [{ columnType: ColumnType.STRING, id: '1', nameKey: 'orgId' }],
      displayedColumns: [{ columnType: ColumnType.STRING, id: '1', nameKey: 'orgId' }],
      results: [{ id: '1', imagePath: ' ' }],
      searchCriteria: { orgId: '1' },
      viewMode: 'basic',
      loadingData: false
    }
    store.overrideSelector(selectTenantSearchViewModel, {
      ...baseTenantSearchViewModel,
      chartVisible: false,
      viewMode: 'advanced'
    })
    store.refreshState()

    await tenantSearch.getHeader()

    expect(store.dispatch).toHaveBeenCalledWith(TenantSearchActions.viewModeChanged({ viewMode: 'advanced' }))
  })

  it('should dispatch chart visibility change', (done) => {
    jest.spyOn(store, 'dispatch')
    const testViewModel: TenantSearchViewModel = {
      chartVisible: false,
      columns: [{ columnType: ColumnType.STRING, id: '1', nameKey: 'orgId' }],
      displayedColumns: [{ columnType: ColumnType.STRING, id: '1', nameKey: 'orgId' }],
      results: [{ id: '1', imagePath: ' ' }],
      searchCriteria: { orgId: '1' },
      viewMode: 'advanced',
      loadingData: false
    }

    component.viewModel$ = of(testViewModel)

    component.headerActions$.subscribe((actions) => {
      const toggleChartAction = actions.find((a) => a.labelKey === 'TENANT_SEARCH.ACTIONS.SHOW_CHART')
      expect(toggleChartAction).toBeDefined()
      toggleChartAction?.actionCallback?.()
      expect(store.dispatch).toHaveBeenCalledWith(TenantSearchActions.chartVisibilityToggled())
      done()
    })
  })

  it('should dispatch export', (done) => {
    jest.spyOn(component, 'onExportItems')

    const testViewModel: TenantSearchViewModel = {
      chartVisible: true,
      columns: [{ columnType: ColumnType.STRING, id: '1', nameKey: 'orgId' }],
      displayedColumns: [{ columnType: ColumnType.STRING, id: '1', nameKey: 'orgId' }],
      results: [{ id: '1', imagePath: ' ' }],
      searchCriteria: { orgId: '1' },
      viewMode: 'advanced',
      loadingData: false
    }

    component.viewModel$ = of(testViewModel)

    component.headerActions$.subscribe((actions) => {
      const exportAction = actions.find((a) => a.labelKey === 'TENANT_SEARCH.ACTIONS.EXPORT_ALL')
      expect(exportAction).toBeDefined()
      exportAction?.actionCallback?.()
      expect(component.onExportItems).toHaveBeenCalled()
      done()
    })
  })
  it('should dispatch search config changed action when search config changed', async () => {
    jest.spyOn(store, 'dispatch')

    component.searchConfigInfoSelectionChanged({
      name: 'orgId',
      displayedColumnsIds: ['orgId'],
      fieldValues: { orgId: 'org1' },
      viewMode: 'advanced'
    })
    expect(store.dispatch).toHaveBeenCalledWith(
      TenantSearchActions.searchConfigSelected({
        searchConfig: {
          name: 'orgId',
          displayedColumnsIds: ['orgId'],
          fieldValues: { orgId: 'org1' },
          viewMode: 'advanced'
        }
      })
    )
  })
  it('should emit the correct diagram column', (done) => {
    const testColumnId = 'diagram123'

    const testColumn: DataTableColumn = {
      id: testColumnId,
      nameKey: 'diagram',
      columnType: ColumnType.STRING
    }

    const testViewModel: TenantSearchViewModel = {
      columns: [testColumn],
      displayedColumns: [],
      results: [],
      searchCriteria: {},
      chartVisible: false,
      viewMode: 'advanced',
      loadingData: false
    }

    component.diagramColumnId = testColumnId
    component.viewModel$ = of(testViewModel)
    // Rebuild diagramColumn$ after changing viewModel$
    component.diagramColumn$ = component.viewModel$.pipe(
      map((vm) => vm.columns.find((e) => e.id === component.diagramColumnId) as DataTableColumn)
    )

    component.diagramColumn$.subscribe((result) => {
      expect(result).toEqual(testColumn)
      done()
    })
  })

  it('should dispatch createTenantButtonClicked action when onCreateTenant is called', () => {
    jest.spyOn(store, 'dispatch')

    component.onCreateTenant()

    expect(store.dispatch).toHaveBeenCalledWith(TenantSearchActions.createTenantButtonClicked())
  })

  it('should dispatch openDialogForExistingEntry action when handleOpenEntryDetails is called', () => {
    jest.spyOn(store, 'dispatch')
    const tenant = { id: 'tenant-456', orgId: 'org2', tenantId: 'tenant2' }

    component.handleOpenEntryDetails(tenant as Tenant)

    expect(store.dispatch).toHaveBeenCalledWith(TenantSearchActions.dialogForExistingEntryOpened({ id: 'tenant-456' }))
  })

  it('should return image URL for given object ID', () => {
    const objectId = 'test-id-123'

    const result = component.getImageUrl(objectId)

    expect(result).toContain(objectId)
  })

  it('should dispatch displayedColumnsChanged action when onDisplayedColumnsChange is called', () => {
    jest.spyOn(store, 'dispatch')
    const columns: DataTableColumn[] = [
      { id: '1', nameKey: 'orgId', columnType: ColumnType.STRING },
      { id: '2', nameKey: 'tenantId', columnType: ColumnType.STRING }
    ]

    component.onDisplayedColumnsChange(columns)

    expect(store.dispatch).toHaveBeenCalledWith(
      TenantSearchActions.displayedColumnsChanged({ displayedColumns: columns })
    )
  })

  it('should clear text filter when clearTextFilters is called', () => {
    component.tenantFilterFormControl.setValue('test filter' as any)

    component.clearTextFilters()

    expect(component.tenantFilterFormControl.value).toBeNull()
  })

  it('should normalize valid date value to UTC date', () => {
    const localDate = new Date(2024, 0, 2, 3, 4, 5)

    const result = (component as any).normalizeSearchCriteriaValue(localDate)

    expect(result).toEqual(new Date(Date.UTC(2024, 0, 2, 3, 4, 5)))
  })

  it('should keep truthy non-date value when normalizing search criteria', () => {
    const result = (component as any).normalizeSearchCriteriaValue('tenant-1')

    expect(result).toBe('tenant-1')
  })

  it('should map falsy non-date value to null when normalizing search criteria', () => {
    const result = (component as any).normalizeSearchCriteriaValue('')

    expect(result).toBeNull()
  })

  it('should filter results when handleFilterChange is called with valid filter', () => {
    const viewModel: TenantSearchViewModel = {
      chartVisible: false,
      columns: [],
      displayedColumns: [],
      results: [
        { id: '1', orgId: 'org1', tenantId: 'tenant1', imagePath: '' },
        { id: '2', orgId: 'org2', tenantId: 'tenant2', imagePath: '' },
        { id: '3', orgId: 'org3', tenantId: 'test-tenant', imagePath: '' }
      ],
      searchCriteria: {},
      viewMode: 'basic',
      loadingData: false
    }

    component['handleFilterChange']('test', viewModel.results)

    component.filteredResults$.subscribe((results) => {
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('3')
    })
  })

  it('should return all results when handleFilterChange is called with empty filter', () => {
    const viewModel: TenantSearchViewModel = {
      chartVisible: false,
      columns: [],
      displayedColumns: [],
      results: [
        { id: '1', orgId: 'org1', tenantId: 'tenant1', imagePath: '' },
        { id: '2', orgId: 'org2', tenantId: 'tenant2', imagePath: '' }
      ],
      searchCriteria: {},
      viewMode: 'basic',
      loadingData: false
    }

    component['handleFilterChange']('', viewModel.results)

    component.filteredResults$.subscribe((results) => {
      expect(results.length).toBe(2)
    })
  })

  it('should return all results when handleFilterChange is called with null filter', () => {
    const viewModel: TenantSearchViewModel = {
      chartVisible: false,
      columns: [],
      displayedColumns: [],
      results: [
        { id: '1', orgId: 'org1', tenantId: 'tenant1', imagePath: '' },
        { id: '2', orgId: 'org2', tenantId: 'tenant2', imagePath: '' }
      ],
      searchCriteria: {},
      viewMode: 'basic',
      loadingData: false
    }

    component['handleFilterChange'](null, viewModel.results)

    component.filteredResults$.subscribe((results) => {
      expect(results.length).toBe(2)
    })
  })

  it('should filter by orgId when handleFilterChange is called', () => {
    const viewModel: TenantSearchViewModel = {
      chartVisible: false,
      columns: [],
      displayedColumns: [],
      results: [
        { id: '1', orgId: 'test-org', tenantId: 'tenant1', imagePath: '' },
        { id: '2', orgId: 'other-org', tenantId: 'tenant2', imagePath: '' }
      ],
      searchCriteria: {},
      viewMode: 'basic',
      loadingData: false
    }

    component['handleFilterChange']('test-org', viewModel.results)

    component.filteredResults$.subscribe((results) => {
      expect(results.length).toBe(1)
      expect(results[0]['orgId']).toBe('test-org')
    })
  })

  it('should filter by tenantId when handleFilterChange is called', () => {
    const viewModel: TenantSearchViewModel = {
      chartVisible: false,
      columns: [],
      displayedColumns: [],
      results: [
        { id: '1', orgId: 'org1', tenantId: 'special-tenant', imagePath: '' },
        { id: '2', orgId: 'org2', tenantId: 'tenant2', imagePath: '' }
      ],
      searchCriteria: {},
      viewMode: 'basic',
      loadingData: false
    }

    component['handleFilterChange']('special', viewModel.results)

    component.filteredResults$.subscribe((results) => {
      expect(results.length).toBe(1)
      expect(results[0]['tenantId']).toBe('special-tenant')
    })
  })

  it('should call actionCallback when headerActions$ is subscribed', (done) => {
    jest.spyOn(component, 'onCreateTenant')

    component.headerActions$.subscribe((actions) => {
      const createAction = actions.find((a) => a.labelKey === 'TENANT_CREATE_UPDATE.ACTION.CREATE')
      expect(createAction).toBeDefined()
      createAction?.actionCallback?.()
      expect(component.onCreateTenant).toHaveBeenCalled()
      done()
    })
  })

  it('should call handleOpenEntryDetails when additionalActions callback is invoked', () => {
    jest.spyOn(component, 'handleOpenEntryDetails')
    const testData = { id: 'test-123', orgId: 'org-test', tenantId: 'tenant-test' }

    const action = component.additionalActions[0]
    expect(action).toBeDefined()
    expect(action.permission).toBe('TENANT#SEARCH')

    action.callback?.(testData)

    expect(component.handleOpenEntryDetails).toHaveBeenCalledWith(testData)
  })

  it('should set icon to PENCIL when user has TENANT#ADMIN_EDIT permission', () => {
    const action = component.additionalActions[0]
    expect(action.icon).toBe(PrimeIcons.PENCIL)
  })

  it('should set icon to EYE when user does not have TENANT#ADMIN_EDIT permission', () => {
    const userService = TestBed.inject(UserService)
    jest.spyOn(userService, 'hasPermission').mockResolvedValue(false)

    const localFixture = TestBed.createComponent(TenantSearchComponent)
    const localComponent = localFixture.componentInstance
    localFixture.detectChanges()

    const action = localComponent.additionalActions[0]
    expect(action.icon).toBe(PrimeIcons.EYE)
  })

  it('should use hide chart labels when chart is visible', async () => {
    const testViewModel: TenantSearchViewModel = {
      chartVisible: true,
      columns: [{ columnType: ColumnType.STRING, id: '1', nameKey: 'orgId' }],
      displayedColumns: [{ columnType: ColumnType.STRING, id: '1', nameKey: 'orgId' }],
      results: [{ id: '1', imagePath: ' ' }],
      searchCriteria: { orgId: '1' },
      viewMode: 'advanced',
      loadingData: false
    }

    store.overrideSelector(selectTenantSearchViewModel, testViewModel)
    store.refreshState()
    const actions = await firstValueFrom(component.headerActions$)

    const toggleChartAction = actions.find((a) => a.labelKey === 'TENANT_SEARCH.ACTIONS.HIDE_CHART')
    expect(toggleChartAction).toBeDefined()
    expect(toggleChartAction?.titleKey).toBe('TENANT_SEARCH.ACTIONS.HIDE_CHART.TOOLTIP')
  })

  it('should emit diagram column from default observable pipeline', (done) => {
    const vm: TenantSearchViewModel = {
      chartVisible: false,
      columns: [{ id: 'tenantId', nameKey: 'tenantId', columnType: ColumnType.STRING }],
      displayedColumns: [],
      results: [],
      searchCriteria: {},
      viewMode: 'advanced',
      loadingData: false
    }

    store.overrideSelector(selectTenantSearchViewModel, vm)
    store.refreshState()

    component.diagramColumn$.subscribe((column) => {
      expect(column.id).toBe('tenantId')
      done()
    })
  })

  it('should map displayed column keys and ignore unknown keys', () => {
    const vm: TenantSearchViewModel = {
      chartVisible: false,
      columns: [
        { id: 'orgId', nameKey: 'orgId', columnType: ColumnType.STRING },
        { id: 'tenantId', nameKey: 'tenantId', columnType: ColumnType.STRING }
      ],
      displayedColumns: [],
      results: [],
      searchCriteria: {},
      viewMode: 'advanced',
      loadingData: false
    }

    component.viewModel$ = of(vm)
    const displayedColumnsChangeSpy = jest.spyOn(component, 'onDisplayedColumnsChange')

    component.onDisplayedColumnKeysChange(['tenantId', 'missing'])

    expect(displayedColumnsChangeSpy).toHaveBeenCalledWith([
      { id: 'tenantId', nameKey: 'tenantId', columnType: ColumnType.STRING }
    ])
  })

  it('should set global filter value', () => {
    component.onGlobalFilter('tenant')

    expect(component.tenantFilterFormControl.value).toBe('tenant')
  })

  it('should clear input and call clearTextFilters on global filter reset', () => {
    const filterInput = document.createElement('input')
    filterInput.value = 'tenant'
    const clearSpy = jest.spyOn(component, 'clearTextFilters')

    component.onClearGlobalFilter(filterInput)

    expect(filterInput.value).toBe('')
    expect(clearSpy).toHaveBeenCalled()
  })

  it('should use fallback icon when permission check fails', async () => {
    const userService = TestBed.inject(UserService)
    jest.spyOn(userService, 'hasPermission').mockRejectedValue(new Error('failed permission check'))

    const localFixture = TestBed.createComponent(TenantSearchComponent)
    const localComponent = localFixture.componentInstance
    localFixture.detectChanges()
    await localFixture.whenStable()

    const action = localComponent.additionalActions[0]
    expect(action.icon).toBe(PrimeIcons.EYE)
  })
})
