import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sourceFile = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('xlsx export loading strategy', () => {
  it('does not statically import xlsx in the export utility', () => {
    const source = sourceFile('src/utils/export.js')

    expect(source).not.toMatch(/import\s+\*\s+as\s+XLSX\s+from\s+['"]xlsx['"]/)
    expect(source).toContain("import('xlsx')")
  })
})
