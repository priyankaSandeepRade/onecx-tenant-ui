import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  ViewChild
} from '@angular/core'
import { Location } from '@angular/common'
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { TranslateModule } from '@ngx-translate/core'
import { map } from 'rxjs'

import { ButtonModule } from 'primeng/button'
import { FloatLabelModule } from 'primeng/floatlabel'
import { InputTextModule } from 'primeng/inputtext'
import { TabsModule } from 'primeng/tabs'
import { TextareaModule } from 'primeng/textarea'
import { TooltipModule } from 'primeng/tooltip'

import { TabMenuModule } from 'primeng/tabmenu'

import {
  AngularAcceleratorModule,
  DialogButtonClicked,
  DialogPrimaryButtonDisabled,
  DialogResult
} from '@onecx/angular-accelerator'
import { AppStateService, UserService } from '@onecx/angular-integration-interface'

import { ImagesAPIService } from 'src/app/shared/generated'
import { getImageUrl } from 'src/app/shared/utils/image.utils'
import { environment } from 'src/environments/environment'

import { TenantInternComponent } from '../tenant-intern/tenant-intern.component'
import { TenantDetailDialogResult, TenantDetailViewModel, TenantDialogMode } from './tenant-detail.types'

@Component({
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [
    AngularAcceleratorModule,
    ButtonModule,
    FloatLabelModule,
    InputTextModule,
    ReactiveFormsModule,
    TabMenuModule,
    TabsModule,
    TextareaModule,
    TooltipModule,
    TranslateModule,
    // components
    TenantInternComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tenant-detail.component.html',
  styleUrls: ['./tenant-detail.component.scss']
})
export class TenantDetailComponent
  implements
    DialogPrimaryButtonDisabled,
    DialogResult<TenantDetailDialogResult | undefined>,
    DialogButtonClicked<TenantDetailComponent>,
    OnInit
{
  private readonly user = inject(UserService)
  private readonly formBuilder = inject(FormBuilder)
  private readonly imageService = inject(ImagesAPIService)
  private readonly appState = inject(AppStateService)

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>
  @Input() public vm: TenantDetailViewModel = {
    itemToEdit: undefined
  }

  @Input() public dialogMode = TenantDialogMode.CREATE

  public formGroup!: FormGroup

  public TenantDialogMode = TenantDialogMode
  primaryButtonEnabled: EventEmitter<boolean> = new EventEmitter()
  dialogResult: TenantDetailDialogResult | undefined = undefined
  hasExistingImage = true
  imageRemoved = false
  uploadedFile: File | null = null
  uploadedFilePreview: string | null = null
  tenantDefaultImagePath: string = environment.TENANT_IMAGE_PATH
  public dateFormat = 'M/d/yy, hh:mm:ss a'
  private readonly baseImagePath: string
  private uploadedFileUrl: string | null = null

  constructor() {
    this.baseImagePath = this.imageService.configuration.basePath!
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm:ss' : this.dateFormat
  }

  ngOnInit() {
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
