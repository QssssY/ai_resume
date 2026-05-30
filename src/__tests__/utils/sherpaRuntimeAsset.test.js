import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const trackedRuntimeAssetPaths = [
  'public/voice-models/sherpa-onnx/zh-cn-streaming/runtime.js'
]

describe('sherpa runtime asset', () => {
  it.each(trackedRuntimeAssetPaths)('loads the sherpa API wrapper before the wasm runtime in %s', (runtimePath) => {
    const source = fs.readFileSync(path.resolve(runtimePath), 'utf8')

    expect(source).toMatch(/\n\s*importScripts\(runtimeBlobUrls\['sherpa-onnx-asr\.js'\]\)/)
    expect(source).toMatch(/\n\s*importScripts\(runtimeBlobUrls\['sherpa-onnx-wasm-main-asr\.js'\]\)/)
    expect(source.indexOf("importScripts(runtimeBlobUrls['sherpa-onnx-asr.js'])"))
      .toBeLessThan(source.indexOf("importScripts(runtimeBlobUrls['sherpa-onnx-wasm-main-asr.js'])"))
  })

  it.each(trackedRuntimeAssetPaths)('turns off sherpa debug logs in the default recognizer config in %s', (runtimePath) => {
    const source = fs.readFileSync(path.resolve(runtimePath), 'utf8')

    expect(source).toContain('const createDefaultOnlineRecognizerConfig = () => ({')
    expect(source).toContain('debug: 0')
    expect(source).toContain('config.recognizerConfig || createDefaultOnlineRecognizerConfig()')
  })

  it.each(trackedRuntimeAssetPaths)('retypes cached JavaScript blobs before importScripts in %s', (runtimePath) => {
    const source = fs.readFileSync(path.resolve(runtimePath), 'utf8')

    expect(source).toContain("if (normalizedUrl.endsWith('.js')) return 'text/javascript'")
    expect(source).toContain("if (normalizedUrl.endsWith('.wasm')) return 'application/wasm'")
    expect(source).toContain('new Blob([blob], { type: expectedType })')
  })

  it.each(trackedRuntimeAssetPaths)('creates a fresh sherpa stream for every recording round in %s', (runtimePath) => {
    const source = fs.readFileSync(path.resolve(runtimePath), 'utf8')

    expect(source).toContain('resetStream()')
    expect(source).toContain('this.stream?.free?.()')
    expect(source).toContain('this.stream = this.recognizer.createStream()')
    expect(source).toMatch(/start\(\) \{\s*this\.resetStream\(\)/)
  })
})
