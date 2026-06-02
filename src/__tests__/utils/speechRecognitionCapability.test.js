import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  detectSpeechRecognitionCapability,
  installLocalSpeechRecognition,
  SPEECH_RECOGNITION_CAPABILITY_STATUS,
} from '@/utils/speechRecognitionCapability'

describe('speechRecognitionCapability', () => {
  beforeEach(() => {
    delete window.SpeechRecognition
    delete window.webkitSpeechRecognition
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: vi.fn(() => Promise.resolve({ state: 'granted' })),
      },
    })
  })

  it('reports unsupported when Web Speech recognition is missing', async () => {
    const capability = await detectSpeechRecognitionCapability()

    expect(capability.status).toBe(SPEECH_RECOGNITION_CAPABILITY_STATUS.UNSUPPORTED)
    expect(capability.SpeechRecognition).toBeNull()
  })

  it('reports permission-blocked when microphone permission is denied', async () => {
    window.SpeechRecognition = vi.fn()
    navigator.permissions.query.mockResolvedValueOnce({ state: 'denied' })

    const capability = await detectSpeechRecognitionCapability({ lang: 'zh-CN' })

    expect(navigator.permissions.query).toHaveBeenCalledWith({ name: 'microphone' })
    expect(capability.status).toBe(SPEECH_RECOGNITION_CAPABILITY_STATUS.PERMISSION_BLOCKED)
    expect(capability.permissionState).toBe('denied')
  })

  it('reports local-ready when the browser local language pack is available', async () => {
    window.SpeechRecognition = vi.fn()
    window.SpeechRecognition.available = vi.fn(() => Promise.resolve('available'))

    const capability = await detectSpeechRecognitionCapability({ lang: 'zh-CN' })

    expect(window.SpeechRecognition.available).toHaveBeenCalledWith({
      langs: ['zh-CN'],
      processLocally: true,
    })
    expect(capability.status).toBe(SPEECH_RECOGNITION_CAPABILITY_STATUS.LOCAL_READY)
    expect(capability.supportsLocalProcessing).toBe(true)
    expect(capability.canInstallLocal).toBe(false)
  })

  it('reports local-downloadable when the browser can install a local language pack', async () => {
    window.SpeechRecognition = vi.fn()
    window.SpeechRecognition.available = vi.fn(() => Promise.resolve('downloadable'))
    window.SpeechRecognition.install = vi.fn(() => Promise.resolve(true))

    const capability = await detectSpeechRecognitionCapability({ lang: 'zh-CN' })

    expect(capability.status).toBe(SPEECH_RECOGNITION_CAPABILITY_STATUS.LOCAL_DOWNLOADABLE)
    expect(capability.canInstallLocal).toBe(true)
  })

  it('falls back to regular Web Speech when local recognition is unavailable', async () => {
    window.SpeechRecognition = vi.fn()
    window.SpeechRecognition.available = vi.fn(() => Promise.resolve('unavailable'))

    const capability = await detectSpeechRecognitionCapability({ lang: 'zh-CN' })

    expect(capability.status).toBe(SPEECH_RECOGNITION_CAPABILITY_STATUS.WEBSPEECH_READY)
    expect(capability.supportsLocalProcessing).toBe(false)
  })

  it('installs a local language pack through the guarded experimental API', async () => {
    window.SpeechRecognition = vi.fn()
    window.SpeechRecognition.install = vi.fn(() => Promise.resolve(true))

    const result = await installLocalSpeechRecognition({ lang: 'zh-CN' })

    expect(window.SpeechRecognition.install).toHaveBeenCalledWith({ langs: ['zh-CN'] })
    expect(result.ok).toBe(true)
  })
})
