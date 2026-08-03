/* eslint-disable @typescript-eslint/no-var-requires */
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { Location } from '@angular/common'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { AppStateServiceMock, provideAppStateServiceMock } from '@onecx/angular-integration-interface/mocks'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { TenantCreateUpdateComponent } from './tenant-create-update.component'
import { provideHttpClient } from '@angular/common/http'
import { Configuration, ImagesAPIService } from 'src/app/shared/generated'
import { TenantCreateUpdateViewModel, TenantDialogMode } from './tenant-create-update.types'
import { environment } from 'src/environments/environment'

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

const originalCreateObjectURL = URL.createObjectURL
beforeAll(() => {
  ;(global as any).URL.createObjectURL = jest.fn(() => 'blob:mock')
  ;(global as any).URL.revokeObjectURL = jest.fn()
})

afterAll(() => {
  if (originalCreateObjectURL) {
    ;(global as any).URL.createObjectURL = originalCreateObjectURL
  }
})

const viewModel: TenantCreateUpdateViewModel = {
  itemToEdit: {
    id: '1',
    orgId: '1',
    tenantId: 'Tenant1',
    description: 'Description 1'
  }
}

describe('TenantCreateUpdateComponent', () => {
  let component: TenantCreateUpdateComponent
  let fixture: ComponentFixture<TenantCreateUpdateComponent>
  let appStateServiceMock: AppStateServiceMock

  const mockActivatedRoute = {}
  const mockedImageService: Partial<ImagesAPIService> = {
    configuration: new Configuration({
      basePath: '/test'
    })
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TenantCreateUpdateComponent,
        AngularAcceleratorModule,
        FormsModule,
        ReactiveFormsModule,
        TranslateTestingModule.withTranslations({
          de: require('./src/assets/i18n/de.json'),
          en: require('./src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        FormBuilder,
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ImagesAPIService, useValue: mockedImageService },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAppStateServiceMock()
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(TenantCreateUpdateComponent)
    component = fixture.componentInstance
    appStateServiceMock = TestBed.inject(AppStateServiceMock)
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('in create mode', () => {
    it('should set component properly', () => {
      component.dialogMode = TenantDialogMode.CREATE
      component.ngOnInit()

      expect(component.formGroup).toBeDefined()
      expect(component.formGroup.get('tenantId')?.enabled).toEqual(true)
    })

    it('should return empty image url', () => {
      component.dialogMode = TenantDialogMode.CREATE
      component.ngOnInit()

      const url = component.getImageUrl()
      expect(url).toBeUndefined()
    })

    it('should enable primary button when all data is set', (done) => {
      component.dialogMode = TenantDialogMode.CREATE
      component.ngOnInit()

      component.primaryButtonEnabled.subscribe((btnEnabled) => {
        expect(btnEnabled).toEqual(true)
        done()
      })

      const item = viewModel.itemToEdit!
      component.formGroup.patchValue({ orgId: item.orgId, tenantId: item.tenantId })
    })

    it('should set proper dialog result', () => {
      component.dialogMode = TenantDialogMode.CREATE
      component.ngOnInit()
      const item = viewModel.itemToEdit!
      component.formGroup.patchValue({ orgId: item.orgId, tenantId: item.tenantId })
      component.ocxDialogButtonClicked()
      const { orgId, tenantId, image } = component.dialogResult!

      expect(orgId).toEqual(item.orgId)
      expect(tenantId).toEqual(item.tenantId)
      expect(image).toBeNull()
    })
  })

  describe('in edit mode', () => {
    it('should set component properly', () => {
      component.dialogMode = TenantDialogMode.UPDATE
      component.vm = viewModel
      component.ngOnInit()

      expect(component.formGroup).toBeDefined()
      expect(component.formGroup.get('tenantId')?.enabled).toEqual(false)
      expect(component.formGroup.value['orgId']).toEqual(viewModel.itemToEdit?.orgId)
    })

    it('should enable primary button when data is changed', (done) => {
      component.dialogMode = TenantDialogMode.UPDATE
      component.vm = viewModel
      component.primaryButtonEnabled.subscribe((btnEnabled) => {
        expect(btnEnabled).toEqual(true)
        expect(component.formGroup.value['orgId']).toEqual('Org2')
        done()
      })
      component.ngOnInit()
      component.formGroup.patchValue({ orgId: 'Org2' })
    })

    it('should enable button when image is uploaded', (done) => {
      component.dialogMode = TenantDialogMode.UPDATE
      component.vm = viewModel
      component.ngOnInit()

      component.primaryButtonEnabled.subscribe((btnEnabled) => {
        expect(btnEnabled).toEqual(true)
        done()
      })

      const file = new File(['test'], 'test.png', { type: 'image/png' })
      const event = {
        target: {
          files: [file]
        }
      }
      component.handleFileChange(event as unknown as Event)
      component.ocxDialogButtonClicked()
      expect(component.dialogResult?.image).toBeDefined()
    })

    it('should revoke previous object url when a new image is uploaded', () => {
      component.dialogMode = TenantDialogMode.UPDATE
      component.vm = viewModel
      component.ngOnInit()

      const revokeSpy = jest.spyOn(URL, 'revokeObjectURL')
      ;(component as any).uploadedFileUrl = 'blob:old'
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      const event = {
        target: {
          files: [file]
        }
      }

      component.handleFileChange(event as unknown as Event)

      expect(revokeSpy).toHaveBeenCalledWith('blob:old')
      expect((component as any).uploadedFileUrl).toEqual('blob:mock')
      expect(component.imageRemoved).toBe(false)
    })

    it('should emit true then false when form validity changes', (done) => {
      component.dialogMode = TenantDialogMode.UPDATE
      component.vm = viewModel
      component.ngOnInit()

      const emittedValues: boolean[] = []
      component.primaryButtonEnabled.subscribe((btnEnabled) => {
        emittedValues.push(btnEnabled)

        if (emittedValues.length === 2) {
          expect(emittedValues[0]).toEqual(true)
          expect(emittedValues[1]).toEqual(false)
          done()
        }
      })

      // First patch - form becomes valid
      component.formGroup.patchValue({ orgId: 'Org2' })

      // Second patch - form becomes invalid
      component.formGroup.patchValue({ orgId: null })
    })

    it('should handle image remove', () => {
      component.dialogMode = TenantDialogMode.UPDATE
      component.vm = viewModel
      component.ngOnInit()

      const file = new File(['test'], 'test.png', { type: 'image/png' })
      const event = {
        target: {
          files: [file]
        }
      }
      component.handleFileChange(event as unknown as Event)
      component.ocxDialogButtonClicked()
      expect(component.dialogResult?.image).toBeDefined()
      component.handleFileRemove()
      component.ocxDialogButtonClicked()
      expect(component.dialogResult?.image).toBeNull()
    })

    it('should clear file input and mark image as removed', () => {
      component.dialogMode = TenantDialogMode.UPDATE
      component.vm = viewModel
      component.ngOnInit()
      ;(component as any).uploadedFileUrl = 'blob:old'
      component.uploadedFile = new File(['test'], 'test.png', { type: 'image/png' })
      component.uploadedFilePreview = {} as any
      component.fileInput = { nativeElement: document.createElement('input') } as any
      component.formGroup.patchValue({ orgId: viewModel.itemToEdit?.orgId, tenantId: viewModel.itemToEdit?.tenantId })

      const revokeSpy = jest.spyOn(URL, 'revokeObjectURL')

      component.handleFileRemove()

      expect(revokeSpy).toHaveBeenCalledWith('blob:old')
      expect(component.uploadedFile).toBeNull()
      expect((component as any).uploadedFileUrl).toBeNull()
      expect(component.uploadedFilePreview).toBeNull()
      expect(component.imageRemoved).toBe(true)
      expect(component.fileInput.nativeElement.value).toBe('')
    })
  })

  describe('in details mode', () => {
    it('should set component properly', (done) => {
      component.dialogMode = TenantDialogMode.DETAILS
      component.vm = viewModel

      component.primaryButtonEnabled.subscribe((btnEnabled) => {
        expect(component.formGroup.getRawValue()['orgId']).toEqual(viewModel.itemToEdit?.orgId)
        expect(component.formGroup.disabled).toEqual(true)
        expect(btnEnabled).toEqual(true)
        done()
      })

      component.ngOnInit()
    })

    it('should return proper image url', () => {
      component.dialogMode = TenantDialogMode.DETAILS
      component.vm = viewModel

      const url = component.getImageUrl()
      expect(url).toContain(viewModel.itemToEdit?.id)
    })
  })

  it('should switch tabs via menu commands', () => {
    component.selectedTab = 'internal'

    component.menuItems[0].command?.({} as any)
    expect(component.selectedTab).toBe('main')

    component.menuItems[1].command?.({} as any)
    expect(component.selectedTab).toBe('internal')
  })

  it('should toggle existing image flag on load and error', () => {
    component.hasExistingImage = false
    component.onImageLoad()
    expect(component.hasExistingImage).toBe(true)

    component.onImageError()
    expect(component.hasExistingImage).toBe(false)
  })

  describe('file validation and handling', () => {
    it('should do nothing when input has no files', () => {
      component.dialogMode = TenantDialogMode.UPDATE
      component.vm = viewModel
      component.ngOnInit()

      const initialUploadedFile = component.uploadedFile
      const event = {
        target: {
          files: null
        }
      }

      component.handleFileChange(event as unknown as Event)

      expect(component.uploadedFile).toBe(initialUploadedFile)
    })

    it('should do nothing when input files array is empty', () => {
      component.dialogMode = TenantDialogMode.UPDATE
      component.vm = viewModel
      component.ngOnInit()

      const initialUploadedFile = component.uploadedFile
      const event = {
        target: {
          files: []
        }
      }

      component.handleFileChange(event as unknown as Event)

      expect(component.uploadedFile).toBe(initialUploadedFile)
    })

    it('should reject non-image files and reset state', () => {
      component.dialogMode = TenantDialogMode.UPDATE
      component.vm = viewModel
      component.ngOnInit()
      component.uploadedFile = new File(['test'], 'test.png', { type: 'image/png' })
      ;(component as any).uploadedFileUrl = 'blob:existing'
      component.uploadedFilePreview = {} as any
      component.fileInput = { nativeElement: document.createElement('input') } as any
      component.fileInput.nativeElement.value = 'test.txt'

      const revokeSpy = jest.spyOn(URL, 'revokeObjectURL')
      const nonImageFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      const event = {
        target: {
          files: [nonImageFile]
        }
      }

      component.handleFileChange(event as unknown as Event)

      expect(revokeSpy).toHaveBeenCalledWith('blob:existing')
      expect(component.uploadedFile).toBeNull()
      expect((component as any).uploadedFileUrl).toBeNull()
      expect(component.uploadedFilePreview).toBeNull()
      expect(component.imageRemoved).toBe(false)
      expect(component.fileInput.nativeElement.value).toBe('')
    })

    it('should accept image files with various MIME types', () => {
      component.dialogMode = TenantDialogMode.UPDATE
      component.vm = viewModel
      component.ngOnInit()

      const imageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp']

      imageTypes.forEach((type) => {
        const file = new File(['test'], 'test.img', { type })
        const event = {
          target: {
            files: [file]
          }
        }

        component.handleFileChange(event as unknown as Event)

        expect(component.uploadedFile).toBe(file)
        expect((component as any).uploadedFileUrl).toEqual('blob:mock')
      })
    })
  })

  it('should set tenantDefaultImagePath from AppStateService currentMfe$ subscription', () => {
    const mockMfe = {
      remoteBaseUrl: 'http://example.com/remote',
      appId: 'test-app',
      productName: 'test-product'
    }

    appStateServiceMock.currentMfe$.publish(mockMfe as any)

    const expectedPath = Location.joinWithSlash(mockMfe.remoteBaseUrl, environment.TENANT_IMAGE_PATH)
    expect(component.tenantDefaultImagePath).toBe(expectedPath)
  })
})
