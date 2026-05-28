import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearModelCache,
  downloadModelFromManifest,
  getOfflineVoiceModelStatus,
  getOfflineVoiceStorageSupport,
  isModelCached,
  readModelManifest,
  saveOfflineVoiceModelStatus
} from '@/utils/offlineVoiceModelCache'

describe('offlineVoiceModelCache', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    global.fetch = vi.fn()
    global.caches = {
      open: vi.fn(() => Promise.resolve({
        match: vi.fn(() => Promise.resolve(null)),
        put: vi.fn(() => Promise.resolve()),
        delete: vi.fn(() => Promise.resolve(true))
      }))
    }
  })

  it('reports browser storage capability without downloading model files', () => {
    const support = getOfflineVoiceStorageSupport()

    expect(support).toMatchObject({
      indexedDB: expect.any(Boolean),
      cacheApi: expect.any(Boolean),
      supported: expect.any(Boolean)
    })
  })

  it('persists lightweight offline model status metadata', () => {
    saveOfflineVoiceModelStatus('stt:sherpa_onnx:zh_cn', {
      status: 'ready',
      progress: 100
    })

    expect(getOfflineVoiceModelStatus('stt:sherpa_onnx:zh_cn')).toMatchObject({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100
    })
  })

  it('normalizes invalid status metadata to pending defaults', () => {
    saveOfflineVoiceModelStatus('tts:kokoro', {
      status: 'invalid',
      progress: 180
    })

    expect(getOfflineVoiceModelStatus('tts:kokoro')).toMatchObject({
      modelKey: 'tts:kokoro',
      status: 'pending',
      progress: 0
    })
  })

  it('reads a static model manifest with resolved file urls', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify({
        version: '2026.05',
        runtime: 'runtime.js',
        files: [
          { path: 'tokens.txt', size: 10 },
          { path: 'model.onnx', size: 30 }
        ]
      })),
      json: () => Promise.resolve({
        version: '2026.05',
        files: [
          { path: 'tokens.txt', size: 10 },
          { path: 'model.onnx', size: 30 }
        ]
      })
    })

    const manifest = await readModelManifest('stt:sherpa_onnx:zh_cn', '/voice-models/sherpa-onnx/zh-cn-streaming/manifest.json')

    expect(global.fetch).toHaveBeenCalledWith('/voice-models/sherpa-onnx/zh-cn-streaming/manifest.json', { cache: 'no-cache' })
    expect(manifest).toMatchObject({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      version: '2026.05',
      baseUrl: '/voice-models/sherpa-onnx/zh-cn-streaming/',
      runtime: '/voice-models/sherpa-onnx/zh-cn-streaming/runtime.js'
    })
    expect(manifest.files[1].url).toBe('/voice-models/sherpa-onnx/zh-cn-streaming/model.onnx')
  })

  it('reports a friendly deployment error when manifest url returns the SPA html fallback', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/html; charset=utf-8' },
      text: () => Promise.resolve('<!DOCTYPE html><html><head></head><body id="app"></body></html>')
    })

    await expect(readModelManifest(
      'stt:sherpa_onnx:zh_cn',
      '/voice-models/sherpa-onnx/zh-cn-streaming/manifest.json'
    )).rejects.toThrow('离线语音模型清单不是 JSON，请确认模型文件已部署到 /voice-models/sherpa-onnx/zh-cn-streaming/manifest.json')
  })

  it('reports a friendly parse error when manifest json is malformed', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve('{ invalid json')
    })

    await expect(readModelManifest(
      'stt:sherpa_onnx:zh_cn',
      '/voice-models/sherpa-onnx/zh-cn-streaming/manifest.json'
    )).rejects.toThrow('离线语音模型清单解析失败，请检查 /voice-models/sherpa-onnx/zh-cn-streaming/manifest.json')
  })

  it('downloads manifest files into Cache API and reports progress', async () => {
    const cachePut = vi.fn(() => Promise.resolve())
    global.caches.open = vi.fn(() => Promise.resolve({
      match: vi.fn(() => Promise.resolve(null)),
      put: cachePut,
      delete: vi.fn(() => Promise.resolve(true))
    }))
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify({
          version: '2026.05',
          runtime: 'runtime.js',
          files: [{ path: 'tokens.txt', size: 10 }, { path: 'model.onnx', size: 30 }]
        })),
        json: () => Promise.resolve({
          version: '2026.05',
          files: [{ path: 'tokens.txt', size: 10 }, { path: 'model.onnx', size: 30 }]
        })
      })
      .mockResolvedValueOnce({ ok: true, clone: () => ({ body: 'tokens' }) })
      .mockResolvedValueOnce({ ok: true, clone: () => ({ body: 'model' }) })
    const progress = []

    const status = await downloadModelFromManifest(
      'stt:sherpa_onnx:zh_cn',
      '/voice-models/sherpa-onnx/zh-cn-streaming/manifest.json',
      (value) => progress.push(value)
    )

    expect(cachePut).toHaveBeenCalledTimes(2)
    expect(progress).toEqual([25, 100])
    expect(status).toMatchObject({
      status: 'ready',
      progress: 100,
      version: '2026.05',
      runtime: '/voice-models/sherpa-onnx/zh-cn-streaming/runtime.js'
    })
    expect(getOfflineVoiceModelStatus('stt:sherpa_onnx:zh_cn').status).toBe('ready')
  })

  it('fails clearly when a model file request returns the SPA html fallback', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify({
          version: '2026.05',
          runtime: 'runtime.js',
          files: [{ path: 'sherpa-onnx-wasm-main-asr.data', size: 30 }]
        }))
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        text: () => Promise.resolve('<!DOCTYPE html><html></html>'),
        clone: () => ({})
      })

    await expect(downloadModelFromManifest(
      'stt:sherpa_onnx:zh_cn',
      '/voice-models/sherpa-onnx/zh-cn-streaming/manifest.json'
    )).rejects.toThrow('离线语音模型文件不是有效模型资源，请确认已部署 sherpa-onnx-wasm-main-asr.data')

    expect(getOfflineVoiceModelStatus('stt:sherpa_onnx:zh_cn')).toMatchObject({
      status: 'failed',
      progress: 0
    })
  })

  it('marks failed with a deployment hint when model file fetch is blocked by network', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify({
          version: '2026.05',
          runtime: 'runtime.js',
          files: [{ path: 'sherpa-onnx-asr.js', size: 10 }]
        }))
      })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(downloadModelFromManifest(
      'stt:sherpa_onnx:zh_cn',
      '/voice-models/sherpa-onnx/zh-cn-streaming/manifest.json'
    )).rejects.toThrow('离线语音模型文件请求失败，请先将 sherpa-onnx-asr.js 部署到同源静态目录')

    expect(getOfflineVoiceModelStatus('stt:sherpa_onnx:zh_cn')).toMatchObject({
      status: 'failed',
      progress: 0
    })
  })

  it('marks model status failed when manifest download resolves to invalid html', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/html' },
      text: () => Promise.resolve('<html><body>index fallback</body></html>')
    })

    await expect(downloadModelFromManifest(
      'stt:sherpa_onnx:zh_cn',
      '/voice-models/sherpa-onnx/zh-cn-streaming/manifest.json'
    )).rejects.toThrow('离线语音模型清单不是 JSON')

    expect(getOfflineVoiceModelStatus('stt:sherpa_onnx:zh_cn')).toMatchObject({
      status: 'failed',
      progress: 0,
      manifestUrl: '/voice-models/sherpa-onnx/zh-cn-streaming/manifest.json'
    })
  })

  it('checks and clears cached model files', async () => {
    const cacheDelete = vi.fn(() => Promise.resolve(true))
    global.caches.open = vi.fn(() => Promise.resolve({
      match: vi.fn(() => Promise.resolve({ ok: true })),
      put: vi.fn(),
      delete: cacheDelete
    }))
    saveOfflineVoiceModelStatus('stt:sherpa_onnx:zh_cn', {
      status: 'ready',
      progress: 100,
      manifestUrl: '/voice-models/sherpa-onnx/zh-cn-streaming/manifest.json',
      files: [{ url: '/voice-models/sherpa-onnx/zh-cn-streaming/model.onnx' }]
    })

    await expect(isModelCached('stt:sherpa_onnx:zh_cn')).resolves.toBe(true)
    await clearModelCache('stt:sherpa_onnx:zh_cn')

    expect(cacheDelete).toHaveBeenCalledWith('/voice-models/sherpa-onnx/zh-cn-streaming/model.onnx')
    expect(getOfflineVoiceModelStatus('stt:sherpa_onnx:zh_cn').status).toBe('pending')
  })
})
