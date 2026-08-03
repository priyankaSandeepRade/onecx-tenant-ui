import { CommonModule } from '@angular/common'
import { Component, Inject, LOCALE_ID, OnInit, QueryList, ViewChildren } from '@angular/core'
import { FormBuilder, FormControlName, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { LetDirective } from '@ngrx/component'
import { Store } from '@ngrx/store'
import { TranslateModule } from '@ngx-translate/core'
import { BehaviorSubject, debounceTime, distinctUntilChanged, first, map, Observable, withLatestFrom } from 'rxjs'
import { PrimeIcons } from 'primeng/api'
import { ButtonModule } from 'primeng/button'
import { CardModule } from 'primeng/card'
import { FloatLabelModule } from 'primeng/floatlabel'
import { InputGroupAddonModule } from 'primeng/inputgroupaddon'
import { InputGroupModule } from 'primeng/inputgroup'
import { InputTextModule } from 'primeng/inputtext'
import { TooltipModule } from 'primeng/tooltip'
import deepEqual from 'fast-deep-equal'

import {
  Action,
  AngularAcceleratorModule,
  BreadcrumbService,
  DataAction,
  DataSortDirection,
  DataTableColumn,
  ExportDataService,
  RowListGridData,
  SearchConfigData
} from '@onecx/angular-accelerator'
import { PortalPageComponent } from '@onecx/angular-utils'
import { UserService } from '@onecx/angular-integration-interface'

import { isValidDate } from 'src/app/shared/utils/isValidDate.utils'

import { TenantSearchActions } from './tenant-search.actions'
import { TenantSearchCriteria, tenantSearchCriteriasSchema } from './tenant-search.parameters'
import { selectTenantSearchViewModel } from './tenant-search.selectors'
import { TenantSearchViewModel } from './tenant-search.viewmodel'
import { ImageContainerComponent } from 'src/app/shared/components/image-container/image-container.component'
import { ImagesAPIService, Tenant } from 'src/app/shared/generated'
import { getImageUrl } from 'src/app/shared/utils/image.utils'

@Component({
  selector: 'app-tenant-search',
  standalone: true,
  imports: [
    AngularAcceleratorModule,
    ButtonModule,
    CardModule,
    CommonModule,
    FloatLabelModule,
    ImageContainerComponent,
    InputGroupAddonModule,
    InputGroupModule,
    InputTextModule,
    LetDirective,
    PortalPageComponent,
    ReactiveFormsModule,
    TooltipModule,
    TranslateModule
  ],
  templateUrl: './tenant-search.component.html',
  styleUrls: ['./tenant-search.component.scss']
})
export class TenantSearchComponent implements OnInit {
  viewModel$: Observable<TenantSearchViewModel> = this.store.select(selectTenantSearchViewModel)

  headerActions$: Observable<Action[]> = this.viewModel$.pipe(
    map((vm) => {
      const actions: Action[] = [
        {
          labelKey: 'TENANT_SEARCH.ACTIONS.EXPORT_ALL',
          icon: PrimeIcons.DOWNLOAD,
          titleKey: 'TENANT_SEARCH.ACTIONS.EXPORT_ALL.TOOLTIP',
          show: 'asOverflow',
          actionCallback: () => this.onExportItems()
        },
        {
          labelKey: vm.chartVisible ? 'TENANT_SEARCH.ACTIONS.HIDE_CHART' : 'TENANT_SEARCH.ACTIONS.SHOW_CHART',
          icon: PrimeIcons.EYE,
          titleKey: vm.chartVisible
            ? 'TENANT_SEARCH.ACTIONS.HIDE_CHART.TOOLTIP'
            : 'TENANT_SEARCH.ACTIONS.SHOW_CHART.TOOLTIP',
          show: 'asOverflow',
          actionCallback: () => this.toggleChartVisibility()
        },
        {
          labelKey: 'TENANT_CREATE_UPDATE.ACTION.CREATE',
          icon: PrimeIcons.PLUS,
          titleKey: 'TENANT_CREATE_UPDATE.ACTION.CREATE.TOOLTIP',
          show: 'always',
          permission: 'TENANT#ADMIN_CREATE',
          actionCallback: () => this.onCreateTenant()
        }
      ]
      return actions
    })
  )

  layout: 'list' | 'grid' = 'grid'
  diagramColumnId = 'tenantId'
  diagramColumn$ = this.viewModel$.pipe(
    map((vm) => vm.columns.find((e) => e.id === this.diagramColumnId) as DataTableColumn)
  )

  filteredResults$ = new BehaviorSubject<RowListGridData[]>([])
  imageBasePath = this.imageService.configuration.basePath!
  additionalActions: DataAction[] = []

  public tenantSearchForm: FormGroup = this.formBuilder.group({
    ...(Object.fromEntries(tenantSearchCriteriasSchema.keyof().options.map((k) => [k, null])) as Record<
      keyof TenantSearchCriteria,
      unknown
    >)
  } satisfies Record<keyof TenantSearchCriteria, unknown>)
  public tenantFilterFormControl = this.formBuilder.control<string | null>(null)

  @ViewChildren(FormControlName) visibleFormControls!: QueryList<FormControlName>

  constructor(
    @Inject(LOCALE_ID) public readonly locale: string,
    private readonly breadcrumbService: BreadcrumbService,
    private readonly store: Store,
    private readonly formBuilder: FormBuilder,
    private readonly exportDataService: ExportDataService,
    private readonly imageService: ImagesAPIService,
    private readonly userService: UserService
  ) {}

  public ngOnInit() {
    this.updateAdditionalActions(false)
    this.userService
      .hasPermission('TENANT#ADMIN_EDIT')
      .then((hasPermission) => this.updateAdditionalActions(hasPermission))
      .catch(() => this.updateAdditionalActions(false))

    this.breadcrumbService.setItems([
      {
        titleKey: 'TENANT_SEARCH.BREADCRUMB',
        labelKey: 'TENANT_SEARCH.BREADCRUMB',
        routerLink: '/tenant'
      }
    ])
    this.makeSubscriptions()
  }

  public searchConfigInfoSelectionChanged(searchConfig: SearchConfigData | undefined) {
    this.store.dispatch(
      TenantSearchActions.searchConfigSelected({
        searchConfig: searchConfig
      })
    )
  }

  public onSearch(formValue: FormGroup) {
    const searchCriteria = Object.entries(formValue.getRawValue()).reduce(
      (acc: Partial<TenantSearchCriteria>, [key, value]) => ({
        ...acc,
        [key]: this.isVisible(key) ? this.getNewDate(value) : null
      }),
      {}
    )
    this.store.dispatch(TenantSearchActions.searchButtonClicked({ searchCriteria }))
  }

  private getNewDate(value: any): Date | null {
    return isValidDate(value)
      ? new Date(
          Date.UTC(
            value.getFullYear(),
            value.getMonth(),
            value.getDate(),
            value.getHours(),
            value.getMinutes(),
            value.getSeconds()
          )
        )
      : value || null
  }

  public onResetSearchCriteria() {
    this.store.dispatch(TenantSearchActions.resetButtonClicked())
  }

  public onExportItems() {
    this.viewModel$.pipe(first()).subscribe((data) => {
      this.exportDataService.exportCsv(data.displayedColumns, data.results, 'tenant.csv')
    })
  }

  getImageUrl(objectId: string): string {
    return `${getImageUrl(this.imageBasePath, objectId)}`
  }

  viewModeChanged(viewMode: 'basic' | 'advanced') {
    this.store.dispatch(
      TenantSearchActions.viewModeChanged({
        viewMode: viewMode
      })
    )
  }

  onDisplayedColumnsChange(displayedColumns: DataTableColumn[]) {
    this.store.dispatch(TenantSearchActions.displayedColumnsChanged({ displayedColumns }))
  }

  onDisplayedColumnKeysChange(displayedColumnKeys: string[]) {
    this.viewModel$.pipe(first()).subscribe((vm) => {
      const displayedColumns = displayedColumnKeys
        .map((columnKey) => vm.columns.find((column) => column.id === columnKey))
        .filter((column): column is DataTableColumn => column !== undefined)
      this.onDisplayedColumnsChange(displayedColumns)
    })
  }

  getDisplayedColumnKeys(displayedColumns: DataTableColumn[]): string[] {
    return displayedColumns.map((column) => column.id)
  }

  toggleChartVisibility() {
    this.store.dispatch(TenantSearchActions.chartVisibilityToggled())
  }

  handleOpenEntryDetails(item: Tenant | RowListGridData) {
    this.store.dispatch(TenantSearchActions.dialogForExistingEntryOpened({ id: String(item.id) }))
  }

  onCreateTenant() {
    this.store.dispatch(TenantSearchActions.createTenantButtonClicked())
  }

  onGlobalFilter(value: string) {
    this.tenantFilterFormControl.setValue(value)
  }

  onClearGlobalFilter(filterInput: HTMLInputElement) {
    filterInput.value = ''
    this.clearTextFilters()
  }

  clearTextFilters(emitEvent = true) {
    this.tenantFilterFormControl.setValue(null, { emitEvent })
  }

  private normalizeSearchCriteriaValue(value: unknown): unknown {
    if (isValidDate(value)) {
      return new Date(
        Date.UTC(
          value.getFullYear(),
          value.getMonth(),
          value.getDate(),
          value.getHours(),
          value.getMinutes(),
          value.getSeconds()
        )
      )
    }
    return value || null
  }

  private isVisible(control: string) {
    return this.visibleFormControls.some(
      (formControl) => formControl.name !== null && String(formControl.name) === control
    )
  }

  private updateAdditionalActions(hasEditPermission: boolean) {
    this.additionalActions = [
      {
        icon: hasEditPermission ? PrimeIcons.PENCIL : PrimeIcons.EYE,
        callback: (data) => this.handleOpenEntryDetails(data as RowListGridData),
        permission: 'TENANT#SEARCH'
      }
    ]
  }

  private makeSubscriptions() {
    this.viewModel$
      .pipe(
        map((vm) => vm.searchCriteria),
        distinctUntilChanged(deepEqual)
      )
      .subscribe((sc) => {
        this.tenantSearchForm.reset(sc)
      })
    this.viewModel$
      .pipe(
        map((vm) => vm.results),
        distinctUntilChanged(deepEqual)
      )
      .subscribe((results) => {
        this.clearTextFilters(false)
        this.handleFilterChange(null, results)
      })
    this.tenantFilterFormControl.valueChanges
      .pipe(debounceTime(200), withLatestFrom(this.viewModel$))
      .subscribe(([filterValue, viewModel]) => this.handleFilterChange(filterValue, viewModel.results))
  }

  private handleFilterChange(filterValue: string | null, results: RowListGridData[]) {
    if (filterValue === null || filterValue.trim() === '') {
      this.filteredResults$.next(results)
      return
    }
    const lowerFilter = filterValue.toLowerCase()
    const filtered = results.filter((item) => {
      const orgId = (item['orgId'] as string)?.toLowerCase() ?? ''
      const tenantId = (item['tenantId'] as string)?.toLowerCase() ?? ''
      return orgId.includes(lowerFilter) || tenantId.includes(lowerFilter)
    })
    this.filteredResults$.next(filtered)
  }

  get ascendingSortDirection(): DataSortDirection {
    return DataSortDirection.ASCENDING
  }
}
