import { ColumnType, DataTableColumn, RowListGridData } from '@onecx/angular-accelerator'

import { selectTenantSearchViewModel, selectDisplayedColumns, selectResults } from './tenant-search.selectors'

describe('Tenant search selectors:', () => {
  describe('selectSearchResultsCount', () => {
    it('should return the amount of results', () => {
      expect(selectDisplayedColumns.projector([], [])).toHaveLength(0)
    })

    it('should return 0 when results are not defined', () => {
      expect(selectResults.projector([])).toHaveLength(0)
    })
  })

  it('should filter out undefined columns when displayedColumns contains unknown ids', () => {
    const columns: DataTableColumn[] = [
      { id: 'name', nameKey: 'Name', columnType: ColumnType.STRING },
      { id: 'email', nameKey: 'Email', columnType: ColumnType.STRING }
    ]

    const displayedColumns = ['name', 'unknown', 'email']

    const result = selectDisplayedColumns.projector(columns, displayedColumns)

    expect(result).toEqual([
      { id: 'name', nameKey: 'Name', columnType: ColumnType.STRING },
      { id: 'email', nameKey: 'Email', columnType: ColumnType.STRING }
    ])
  })

  describe('selectTenantSearchViewModel', () => {
    it('should combine the input to be the viewmodel', () => {
      const columns: DataTableColumn[] = [
        {
          columnType: ColumnType.STRING,
          id: 'id',
          nameKey: 'TENANT_SEARCH.COLUMNS.ID',
          filterable: true,
          sortable: true,
          predefinedGroupKeys: [
            'TENANT_SEARCH.PREDEFINED_GROUP.DEFAULT',
            'TENANT_SEARCH.PREDEFINED_GROUP.EXTENDED',
            'TENANT_SEARCH.PREDEFINED_GROUP.FULL'
          ]
        },
        {
          columnType: ColumnType.STRING,
          id: 'orgId',
          nameKey: 'TENANT_SEARCH.COLUMNS.ORG_ID',
          filterable: true,
          sortable: true,
          predefinedGroupKeys: [
            'TENANT_SEARCH.PREDEFINED_GROUP.DEFAULT',
            'TENANT_SEARCH.PREDEFINED_GROUP.EXTENDED',
            'TENANT_SEARCH.PREDEFINED_GROUP.FULL'
          ]
        }
      ]

      const searchCriteria = {
        orgId: '1'
      }
      const results: RowListGridData[] = [{ id: 1, imagePath: '' }]
      const displayedColumns: DataTableColumn[] = [
        {
          columnType: ColumnType.STRING,
          id: 'id',
          nameKey: 'TENANT_SEARCH.COLUMNS.ID',
          filterable: true,
          sortable: true,
          predefinedGroupKeys: [
            'TENANT_SEARCH.PREDEFINED_GROUP.DEFAULT',
            'TENANT_SEARCH.PREDEFINED_GROUP.EXTENDED',
            'TENANT_SEARCH.PREDEFINED_GROUP.FULL'
          ]
        },
        {
          columnType: ColumnType.STRING,
          id: 'orgId',
          nameKey: 'TENANT_SEARCH.COLUMNS.ORG_ID',
          filterable: true,
          sortable: true,
          predefinedGroupKeys: [
            'TENANT_SEARCH.PREDEFINED_GROUP.DEFAULT',
            'TENANT_SEARCH.PREDEFINED_GROUP.EXTENDED',
            'TENANT_SEARCH.PREDEFINED_GROUP.FULL'
          ]
        }
      ]
      const viewMode = 'advanced' as 'basic' | 'advanced'
      const chartVisible = false
      expect(
        selectTenantSearchViewModel.projector(
          columns,
          searchCriteria,
          results,
          displayedColumns,
          viewMode,
          chartVisible,
          false
        )
      ).toEqual({
        columns: columns,
        searchCriteria: searchCriteria,
        results: results,
        displayedColumns: displayedColumns,
        viewMode: viewMode,
        chartVisible: chartVisible,
        loadingData: false
      })
    })

    it('should map results and add imagePath', () => {
      const input = [
        { id: '1', name: 'Tenant A' },
        { id: '2', name: 'Tenant B' }
      ]

      const result = selectResults.projector(input)

      expect(result).toEqual([
        { imagePath: '', id: '1', name: 'Tenant A' },
        { imagePath: '', id: '2', name: 'Tenant B' }
      ])
    })
  })
})
