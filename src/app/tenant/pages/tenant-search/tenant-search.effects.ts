import { PortalDialogConfig, PortalDialogService } from '@onecx/angular-accelerator'
import { concat, from, mergeMap, Observable, catchError, last, map, of, switchMap, tap } from 'rxjs'
import { Injectable, SkipSelf } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Actions, createEffect, ofType } from '@ngrx/effects'
import { routerNavigatedAction } from '@ngrx/router-store'
import { Action, Store } from '@ngrx/store'
import { concatLatestFrom } from '@ngrx/operators'
import { PrimeIcons } from 'primeng/api'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const equal = require('fast-deep-equal')

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import {
  filterForNavigatedTo,
  filterOutOnlyQueryParamsChanged,
  filterOutQueryParamsHaveNotChanged
} from '@onecx/ngrx-accelerator'

import {
  CreateTenantRequest,
  UpdateTenantRequest,
  ImagesAPIService,
  UploadImageRequestParams,
  RefType,
  DeleteImageRequestParams,
  Tenant,
  TenantAPIService
} from 'src/app/shared/generated'
import { TenantSearchActions } from './tenant-search.actions'
import { TenantSearchComponent } from './tenant-search.component'
import { tenantSearchSelectors } from './tenant-search.selectors'
import { TenantSearchCriteria, tenantSearchCriteriasSchema } from './tenant-search.parameters'
import {
  TenantCreateUpdateDialogResult,
  TenantDialogMode
} from './dialogs/tenant-create-update/tenant-create-update.types'
import { TenantCreateUpdateComponent } from './dialogs/tenant-create-update/tenant-create-update.component'

export const DialogConfig: PortalDialogConfig = {
  modal: true,
  draggable: true,
  resizable: true,
  width: '30vw'
}

@Injectable()
export class TenantSearchEffects {
  constructor(
    private readonly portalDialogService: PortalDialogService,
    private readonly actions$: Actions,
    @SkipSelf() private readonly route: ActivatedRoute,
    private readonly tenantService: TenantAPIService,
    private readonly router: Router,
    private readonly store: Store,
    private readonly messageService: PortalMessageService,
    private readonly imageService: ImagesAPIService,
    private readonly userServcie: UserService
  ) {}

  syncParamsToUrl$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(TenantSearchActions.searchButtonClicked, TenantSearchActions.resetButtonClicked),
        concatLatestFrom(() => [this.store.select(tenantSearchSelectors.selectCriteria), this.route.queryParams]),
        tap(([, criteria, queryParams]) => {
          const results = tenantSearchCriteriasSchema.safeParse(queryParams)
          if (!results.success || !equal(criteria, results.data)) {
            const params = {
              ...criteria
            }
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: params,
              replaceUrl: true,
              onSameUrlNavigation: 'ignore'
            })
          }
        })
      )
    },
    { dispatch: false }
  )

  refreshSearchAfterCreateUpdate$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(TenantSearchActions.createTenantSucceeded, TenantSearchActions.updateTenantSucceeded),
      concatLatestFrom(() => this.store.select(tenantSearchSelectors.selectCriteria)),
      switchMap(([, searchCriteria]) => this.performSearch(searchCriteria))
    )
  })

  openDialogForExistingEntry$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(TenantSearchActions.dialogForExistingEntryOpened),
      mergeMap((action) =>
        from(this.userServcie.hasPermission('TENANT#ADMIN_EDIT')).pipe(
          map((hasEditPermission) => ({ action, hasEditPermission }))
        )
      ),
      map(({ action, hasEditPermission }) => {
        if (hasEditPermission) {
          return TenantSearchActions.editTenantButtonClicked({ id: action.id })
        }
        return TenantSearchActions.openTenantDetailsButtonClicked({ id: action.id })
      })
    )
  })

  editButtonClicked$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(TenantSearchActions.editTenantButtonClicked),
      concatLatestFrom(() => this.store.select(tenantSearchSelectors.selectResults)),
      map(([action, results]) => {
        return results.find((item) => item.id == action.id)
      }),
      mergeMap((itemToEdit) => {
        return this.portalDialogService.openDialog<TenantCreateUpdateDialogResult | undefined>(
          'TENANT_CREATE_UPDATE.UPDATE.HEADER',
          {
            type: TenantCreateUpdateComponent,
            inputs: {
              vm: {
                itemToEdit
              },
              dialogMode: TenantDialogMode.UPDATE
            }
          },
          {
            key: 'TENANT_CREATE_UPDATE.UPDATE.FORM.SAVE',
            icon: PrimeIcons.SAVE,
            tooltipKey: 'TENANT_CREATE_UPDATE.UPDATE.FORM.TOOLTIPS.SAVE',
            tooltipPosition: 'bottom'
          },
          {
            key: 'TENANT_CREATE_UPDATE.UPDATE.FORM.CANCEL',
            icon: PrimeIcons.TIMES,
            tooltipKey: 'TENANT_CREATE_UPDATE.UPDATE.FORM.TOOLTIPS.CANCEL',
            tooltipPosition: 'bottom'
          },
          DialogConfig
        )
      }),
      switchMap((dialogResult) => {
        if (!dialogResult || dialogResult.button == 'secondary') {
          return of(TenantSearchActions.updateTenantCancelled())
        }
        if (!dialogResult.result) {
          this.messageService.error({
            summaryKey: 'TENANT_CREATE_UPDATE.UPDATE.ERROR'
          })
          return of(
            TenantSearchActions.updateTenantFailed({
              error: 'DialogResult was not set as expected!'
            })
          )
        }
        const itemToEditId = dialogResult.result.id
        const updateOperations: Observable<any>[] = []
        updateOperations.push(this.getUpdateOperation(itemToEditId, dialogResult.result))
        if (dialogResult.result.image) {
          updateOperations.push(this.getUpdateImageOperation(itemToEditId, dialogResult.result.image))
        }
        if (dialogResult.result.imageRemoved) {
          updateOperations.push(this.getRemoveImageOperation(itemToEditId))
        }
        return concat(...updateOperations).pipe(
          last(),
          map(() => {
            this.messageService.success({
              summaryKey: 'TENANT_CREATE_UPDATE.UPDATE.SUCCESS'
            })
            return TenantSearchActions.updateTenantSucceeded()
          })
        )
      }),
      catchError((error) => {
        this.messageService.error({
          summaryKey: 'TENANT_CREATE_UPDATE.UPDATE.ERROR'
        })
        return of(
          TenantSearchActions.updateTenantFailed({
            error
          })
        )
      })
    )
  })

  createButtonClicked$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(TenantSearchActions.createTenantButtonClicked),
      switchMap(() => {
        return this.portalDialogService.openDialog<TenantCreateUpdateDialogResult | undefined>(
          'TENANT_CREATE_UPDATE.CREATE.HEADER',
          {
            type: TenantCreateUpdateComponent,
            inputs: {
              vm: {
                itemToEdit: undefined
              },
              dialogMode: TenantDialogMode.CREATE
            }
          },
          {
            key: 'TENANT_CREATE_UPDATE.CREATE.FORM.SAVE',
            icon: PrimeIcons.SAVE,
            tooltipKey: 'TENANT_CREATE_UPDATE.CREATE.FORM.TOOLTIPS.SAVE',
            tooltipPosition: 'bottom'
          },
          {
            key: 'TENANT_CREATE_UPDATE.CREATE.FORM.CANCEL',
            icon: PrimeIcons.TIMES,
            tooltipKey: 'TENANT_CREATE_UPDATE.CREATE.FORM.TOOLTIPS.CANCEL',
            tooltipPosition: 'bottom'
          },
          DialogConfig
        )
      }),
      switchMap((dialogResult) => {
        if (!dialogResult || dialogResult.button == 'secondary') {
          return of(TenantSearchActions.createTenantCancelled())
        }
        if (!dialogResult.result) {
          this.messageService.error({
            summaryKey: 'TENANT_CREATE_UPDATE.CREATE.ERROR'
          })
          return of(
            TenantSearchActions.createTenantFailed({
              error: 'DialogResult was not set as expected!'
            })
          )
        }
        const itemToCreate: CreateTenantRequest = {
          orgId: dialogResult.result.orgId!,
          description: dialogResult.result.description!,
          tenantId: dialogResult.result.tenantId!
        }
        return this.tenantService.createTenant({ createTenantRequest: itemToCreate }).pipe(
          map(() => {
            this.messageService.success({
              summaryKey: 'TENANT_CREATE_UPDATE.CREATE.SUCCESS'
            })
            return TenantSearchActions.createTenantSucceeded()
          })
        )
      }),
      catchError((error) => {
        this.messageService.error({
          summaryKey: 'TENANT_CREATE_UPDATE.CREATE.ERROR'
        })
        return of(
          TenantSearchActions.createTenantFailed({
            error
          })
        )
      })
    )
  })

  openDetailsButtonClicked$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(TenantSearchActions.openTenantDetailsButtonClicked),
        concatLatestFrom(() => this.store.select(tenantSearchSelectors.selectResults)),
        map(([action, results]) => {
          return results.find((item) => item.id == action.id)
        }),
        switchMap((tenantDetails) => {
          return this.portalDialogService.openDialog<TenantCreateUpdateDialogResult | undefined>(
            'TENANT_CREATE_UPDATE.DETAILS.HEADER',
            {
              type: TenantCreateUpdateComponent,
              inputs: {
                vm: {
                  itemToEdit: tenantDetails
                },
                dialogMode: TenantDialogMode.DETAILS
              }
            },
            {
              key: 'TENANT_CREATE_UPDATE.DETAILS.BUTTON',
              icon: PrimeIcons.TIMES,
              tooltipKey: 'TENANT_CREATE_UPDATE.DETAILS.TOOLTIPS.BUTTON',
              tooltipPosition: 'bottom'
            },
            undefined,
            DialogConfig
          )
        })
      )
    },
    { dispatch: false }
  )

  searchByUrl$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      filterForNavigatedTo(this.router, TenantSearchComponent),
      filterOutQueryParamsHaveNotChanged(this.router, tenantSearchCriteriasSchema, true),
      concatLatestFrom(() => this.store.select(tenantSearchSelectors.selectCriteria)),
      switchMap(([, searchCriteria]) => this.performSearch(searchCriteria))
    )
  })

  rehydrateChartVisibility$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      filterForNavigatedTo(this.router, TenantSearchComponent),
      filterOutOnlyQueryParamsChanged(this.router),
      map(() =>
        TenantSearchActions.chartVisibilityRehydrated({
          visible: localStorage.getItem('tenantChartVisibility') === 'true'
        })
      )
    )
  })

  saveChartVisibility$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(TenantSearchActions.chartVisibilityToggled),
        concatLatestFrom(() => this.store.select(tenantSearchSelectors.selectChartVisible)),
        tap(([, chartVisible]) => {
          localStorage.setItem('tenantChartVisibility', String(chartVisible))
        })
      )
    },
    { dispatch: false }
  )

  errorMessages: { action: Action; key: string }[] = [
    {
      action: TenantSearchActions.tenantSearchResultsLoadingFailed,
      key: 'TENANT_SEARCH.ERROR_MESSAGES.SEARCH_RESULTS_LOADING_FAILED'
    }
  ]

  displayError$ = createEffect(
    () => {
      return this.actions$.pipe(
        tap((action) => {
          const e = this.errorMessages.find((e) => e.action.type === action.type)
          if (e) {
            this.messageService.error({ summaryKey: e.key })
          }
        })
      )
    },
    { dispatch: false }
  )

  private performSearch(searchCriteria: TenantSearchCriteria) {
    return this.tenantService.searchTenants({ tenantSearchCriteria: searchCriteria }).pipe(
      map(({ stream, totalElements }) =>
        TenantSearchActions.tenantSearchResultsReceived({
          results: stream,
          totalElements
        })
      ),
      catchError((error) =>
        of(
          TenantSearchActions.tenantSearchResultsLoadingFailed({
            error
          })
        )
      )
    )
  }

  private getUpdateOperation(itemId: string, result: Tenant): Observable<any> {
    const itemToEdit: UpdateTenantRequest = {
      orgId: result.orgId!,
      description: result.description!
    }
    return this.tenantService.updateTenant({ id: itemId, updateTenantRequest: itemToEdit })
  }

  private getUpdateImageOperation(itemToEditId: string, image: File): Observable<any> {
    const uploadParams: UploadImageRequestParams = {
      refId: itemToEditId,
      refType: RefType.Logo,
      body: image
    }
    return this.imageService.uploadImage(uploadParams)
  }

  private getRemoveImageOperation(itemId: string): Observable<any> {
    const request: DeleteImageRequestParams = {
      refId: itemId,
      refType: RefType.Logo
    }
    return this.imageService.deleteImage(request)
  }
}
