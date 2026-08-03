import { CommonModule, Location } from '@angular/common'
import { Component, ElementRef, EventEmitter, Input, OnInit, ViewChild } from '@angular/core'
import {
  AngularAcceleratorModule,
  DialogButtonClicked,
  DialogPrimaryButtonDisabled,
  DialogResult
} from '@onecx/angular-accelerator'
import { AppStateService } from '@onecx/angular-integration-interface'

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import {
  TenantCreateUpdateDialogResult,
  TenantCreateUpdateViewModel,
  TenantDialogMode
} from './tenant-create-update.types'
import { map } from 'rxjs'
import { ImagesAPIService } from 'src/app/shared/generated'
import { getImageUrl } from 'src/app/shared/utils/image.utils'
import { ButtonModule } from 'primeng/button'
import { FloatLabelModule } from 'primeng/floatlabel'
import { MenuItem } from 'primeng/api'
import { InputTextModule } from 'primeng/inputtext'
import { TabMenuModule } from 'primeng/tabmenu'
import { Textarea } from 'primeng/inputtextarea'
import { TooltipModule } from 'primeng/tooltip'
import { environment } from 'src/environments/environment'
import { TranslateModule } from '@ngx-translate/core'

@Component({
  selector: 'app-tenant-create-update',
  standalone: true,
  imports: [
    AngularAcceleratorModule,
    ButtonModule,
    CommonModule,
    FloatLabelModule,
    InputTextModule,
    ReactiveFormsModule,
    TabMenuModule,
    Textarea,
    TooltipModule,
    TranslateModule
  ],
  templateUrl: './tenant-create-update.component.html',
  styleUrls: ['./tenant-create-update.component.scss']
})
export class TenantCreateUpdateComponent
  implements
    DialogPrimaryButtonDisabled,
    DialogResult<TenantCreateUpdateDialogResult | undefined>,
    DialogButtonClicked<TenantCreateUpdateComponent>,
    OnInit
{
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>
  @Input() public vm: TenantCreateUpdateViewModel = {
    itemToEdit: undefined
  }

  @Input() public dialogMode: TenantDialogMode = TenantDialogMode.CREATE

  public formGroup!: FormGroup

  primaryButtonEnabled: EventEmitter<boolean> = new EventEmitter()
  dialogResult: TenantCreateUpdateDialogResult | undefined = undefined
  dialogModeEnum = TenantDialogMode
  selectedTab: 'main' | 'internal' = 'main'
  hasExistingImage = true
  imageRemoved = false
  uploadedFile: File | null = null
  uploadedFilePreview: string | null = null
  tenantDefaultImagePath: string = environment.TENANT_IMAGE_PATH
  activeMenuItem?: MenuItem

  readonly menuItems: MenuItem[] = [
    {
      label: 'TENANT_CREATE_UPDATE.MENU.PROPERTIES',
      tooltip: 'TENANT_CREATE_UPDATE.MENU.TOOLTIPS.PROPERTIES',
      command: () => (this.selectedTab = 'main')
    },
    {
      label: 'TENANT_CREATE_UPDATE.MENU.INTERNAL',
      tooltip: 'TENANT_CREATE_UPDATE.MENU.TOOLTIPS.INTERNAL',
      command: () => (this.selectedTab = 'internal')
    }
  ]

  private readonly baseImagePath: string
  private uploadedFileUrl: string | null = null

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly imageService: ImagesAPIService,
    private readonly appState: AppStateService
  ) {
    this.baseImagePath = this.imageService.configuration.basePath!
  }

  ngOnInit() {
    this.activeMenuItem = this.menuItems[0]
    this.initForm()
    this.adjustToDialogMode()
    if (this.dialogMode !== TenantDialogMode.DETAILS) {
      this.makeSubscriptions()
    }
    this.appState.currentMfe$
      .pipe(map((mfe) => Location.joinWithSlash(mfe.remoteBaseUrl, environment.TENANT_IMAGE_PATH)))
      .subscribe((data) => (this.tenantDefaultImagePath = data))
  }

  ocxDialogButtonClicked() {
    this.dialogResult = {
      ...this.vm.itemToEdit,
      ...this.formGroup.value,
      image: this.uploadedFile,
      imageRemoved: this.imageRemoved
    }
  }

  handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) {
      return
    }
    if (!this.isAllowedImage(file)) {
      this.resetUploadedFileState(false)
      return
    }
    if (this.uploadedFileUrl) {
      URL.revokeObjectURL(this.uploadedFileUrl)
    }
    this.uploadedFile = file
    this.uploadedFileUrl = URL.createObjectURL(file)
    this.uploadedFilePreview = this.uploadedFileUrl
    this.imageRemoved = false
    if (this.formGroup.valid) {
      this.primaryButtonEnabled.next(true)
    }
  }

  handleFileRemove() {
    this.resetUploadedFileState()
    if (this.formGroup.valid) {
      this.primaryButtonEnabled.next(true)
    }
  }

  onImageLoad() {
    this.hasExistingImage = true
  }

  onImageError() {
    this.hasExistingImage = false
  }

  getImageUrl(): string | undefined {
    if (this.dialogMode === TenantDialogMode.CREATE) {
      return undefined
    }
    return getImageUrl(this.baseImagePath, this.vm.itemToEdit!.id)
  }

  private initForm() {
    this.formGroup = this.formBuilder.group({
      orgId: [null, [Validators.required]],
      description: [null],
      tenantId: [{ value: null, disabled: true }, [Validators.required]],
      modificationUser: [{ value: null, disabled: true }],
      modificationDate: [{ value: null, disabled: true }],
      creationUser: [{ value: null, disabled: true }],
      creationDate: [{ value: null, disabled: true }]
    })
  }

  private adjustToDialogMode() {
    switch (this.dialogMode) {
      case TenantDialogMode.DETAILS:
        this.setDetailsMode()
        break
      case TenantDialogMode.CREATE:
        this.setCreateMode()
        break
      case TenantDialogMode.UPDATE:
        this.setUpdateMode()
        break
    }
  }

  private setCreateMode() {
    this.formGroup.get('tenantId')!.enable({ emitEvent: false })
  }

  private setUpdateMode() {
    this.formGroup.patchValue({
      ...this.vm.itemToEdit
    })
  }

  private setDetailsMode() {
    this.formGroup.patchValue({
      ...this.vm.itemToEdit
    })
    this.formGroup.disable()
    this.primaryButtonEnabled.next(true)
  }

  private makeSubscriptions() {
    this.formGroup.statusChanges
      .pipe(
        map((status) => {
          return status === 'VALID'
        })
      )
      .subscribe(this.primaryButtonEnabled)
  }

  private isAllowedImage(file: File): boolean {
    return file.type.startsWith('image/')
  }

  private resetUploadedFileState(markAsRemoved = true) {
    if (this.uploadedFileUrl) {
      URL.revokeObjectURL(this.uploadedFileUrl)
    }
    this.uploadedFileUrl = null
    this.uploadedFilePreview = null
    this.uploadedFile = null
    this.imageRemoved = markAsRemoved
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = ''
    }
  }
}
