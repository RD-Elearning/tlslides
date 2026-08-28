import type { TDDocument } from '~types'
import { TldrawApp } from '~state'
import { DEFAULT_SLIDE_SIZE } from '~constants'
import { migrate } from './migrate'
import oldDoc from '~test/documents/old-doc'
import oldDoc2 from '~test/documents/old-doc-2'

function makeDocument(overrides: Partial<TDDocument> = {}): TDDocument {
  return {
    id: 'doc',
    name: 'New Document',
    version: 15.3,
    pages: {
      page1: {
        id: 'page1',
        name: 'Page 1',
        childIndex: 1,
        shapes: {},
        bindings: {},
      },
    },
    pageStates: {
      page1: {
        id: 'page1',
        selectedIds: [],
        camera: { point: [0, 0], zoom: 1 },
      },
    },
    assets: {},
    ...overrides,
  } as unknown as TDDocument
}

describe('When migrating bindings', () => {
  it('migrates a document without a version', () => {
    new TldrawApp().loadDocument(oldDoc as unknown as TDDocument)
  })

  it('migrates a document with an older version', () => {
    const app = new TldrawApp().loadDocument(oldDoc2 as unknown as TDDocument)
    expect(app.getShape('d7ab0a49-3cb3-43ae-3d83-f5cf2f4a510a').style.color).toBe('black')
  })
})

describe('When migrating to version 16', () => {
  it('sets a size on every page that is missing one, and a defaultPageSize on the document', () => {
    const document = makeDocument({
      pages: {
        page1: { id: 'page1', name: 'Page 1', childIndex: 1, shapes: {}, bindings: {} },
        page2: { id: 'page2', name: 'Page 2', childIndex: 2, shapes: {}, bindings: {} },
      },
    } as unknown as Partial<TDDocument>)

    const migrated = migrate(document, 16)

    expect(migrated.defaultPageSize).toEqual(DEFAULT_SLIDE_SIZE)
    Object.values(migrated.pages).forEach((page) => {
      expect(page.size).toEqual(DEFAULT_SLIDE_SIZE)
    })
  })

  it('does not override a page size or defaultPageSize that is already set', () => {
    const document = makeDocument({
      defaultPageSize: [800, 600],
      pages: {
        page1: {
          id: 'page1',
          name: 'Page 1',
          childIndex: 1,
          size: [800, 600],
          shapes: {},
          bindings: {},
        },
      },
    } as unknown as Partial<TDDocument>)

    const migrated = migrate(document, 16)

    expect(migrated.defaultPageSize).toEqual([800, 600])
    expect(migrated.pages.page1.size).toEqual([800, 600])
  })

  it("rewrites the 'erif' font typo to 'serif'", () => {
    const document = makeDocument({
      pages: {
        page1: {
          id: 'page1',
          name: 'Page 1',
          childIndex: 1,
          shapes: {
            text1: {
              id: 'text1',
              type: 'text',
              name: 'Text',
              parentId: 'page1',
              childIndex: 1,
              point: [0, 0],
              text: 'hello',
              style: { color: 'black', size: 'medium', dash: 'solid', font: 'erif' },
            },
          },
          bindings: {},
        },
      },
    } as unknown as Partial<TDDocument>)

    const migrated = migrate(document, 16)

    expect(migrated.pages.page1.shapes.text1.style.font).toBe('serif')
  })

  it('repairs colliding childIndex values into distinct, ordered indices', () => {
    const document = makeDocument({
      pages: {
        pageA: { id: 'pageA', name: 'Page A', childIndex: 1, shapes: {}, bindings: {} },
        pageB: { id: 'pageB', name: 'Page B', childIndex: 1, shapes: {}, bindings: {} },
        pageC: { id: 'pageC', name: 'Page C', childIndex: 1, shapes: {}, bindings: {} },
      },
    } as unknown as Partial<TDDocument>)

    const migrated = migrate(document, 16)

    expect(migrated.pages.pageA.childIndex).toBe(1)
    expect(migrated.pages.pageB.childIndex).toBe(2)
    expect(migrated.pages.pageC.childIndex).toBe(3)
  })

  it('produces the same size/defaultPageSize fields as a fresh defaultDocument', () => {
    // Take the shipped default document and strip the fields this migration
    // adds, then re-run it through the same migration path a saved pre-16
    // document would take. The result must match the fresh default exactly.
    const stripped = JSON.parse(JSON.stringify(TldrawApp.defaultDocument)) as TDDocument
    stripped.version = 15.3
    delete stripped.defaultPageSize
    Object.values(stripped.pages).forEach((page) => delete page.size)

    const migrated = migrate(stripped, TldrawApp.version)

    expect(migrated.defaultPageSize).toEqual(TldrawApp.defaultDocument.defaultPageSize)
    Object.keys(migrated.pages).forEach((id) => {
      expect(migrated.pages[id].size).toEqual(TldrawApp.defaultDocument.pages[id].size)
    })
  })

  it('leaves a fresh TldrawApp.defaultDocument unchanged (already satisfies version 16)', () => {
    expect(TldrawApp.defaultDocument.version).toBe(16)
    expect(TldrawApp.defaultDocument.defaultPageSize).toEqual(DEFAULT_SLIDE_SIZE)
    Object.values(TldrawApp.defaultDocument.pages).forEach((page) => {
      expect(page.size).toEqual(DEFAULT_SLIDE_SIZE)
    })

    const document = JSON.parse(JSON.stringify(TldrawApp.defaultDocument)) as TDDocument
    const migrated = migrate(document, TldrawApp.version)

    expect(migrated).toEqual(TldrawApp.defaultDocument)
  })
})
