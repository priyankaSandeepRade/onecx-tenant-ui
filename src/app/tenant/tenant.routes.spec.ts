import { TenantSearchComponent } from './tenant-search/tenant-search.component'
import { routes } from './tenant.routes'

describe('bookmark routes', () => {
  it('should define exactly 2 routes', () => {
    expect(routes.length).toBe(1)
  })

  describe('root route', () => {
    const route = routes[0]

    it('should map empty path to TenantSearchComponent', () => {
      expect(route.path).toBe('')
      expect(route.pathMatch).toBe('full')
      expect(route.component).toBe(TenantSearchComponent)
    })
  })
})
