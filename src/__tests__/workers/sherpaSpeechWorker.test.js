import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('sherpaSpeechWorker', () => {
  beforeEach(() => {
    vi.resetModules()
    self.importScripts = vi.fn()
    self.postMessage = vi.fn()
    delete self.__sherpaRuntimeReady
    delete self.createSherpaOnnxRecognizer
    delete self.sherpaOnnx
  })

  it('waits for async recognizer initialization before handling early start and audio messages', async () => {
    let resolveRecognizer
    const recognizerReady = new Promise((resolve) => {
      resolveRecognizer = resolve
    })
    const recognizer = {
      start: vi.fn(),
      acceptWaveform: vi.fn(() => ({ text: '你好', isFinal: false })),
    }
    self.createSherpaOnnxRecognizer = vi.fn(() => recognizerReady)

    await import('@/workers/sherpaSpeechWorker.js')

    const initPromise = self.onmessage({
      data: {
        type: 'init',
        runtimeUrl: '/voice-models/sherpa-onnx/zh-cn-streaming/runtime.js',
        config: { language: 'zh-CN' }
      }
    })
    const startPromise = self.onmessage({ data: { type: 'start' } })
    const audioPromise = self.onmessage({
      data: {
        type: 'audio',
        sampleRate: 16000,
        samples: new Float32Array([0.1, -0.1])
      }
    })

    expect(recognizer.acceptWaveform).not.toHaveBeenCalled()

    resolveRecognizer(recognizer)
    await Promise.all([initPromise, startPromise, audioPromise])

    expect(recognizer.start).toHaveBeenCalled()
    expect(recognizer.acceptWaveform).toHaveBeenCalledWith(16000, expect.any(Float32Array))
    expect(self.postMessage).toHaveBeenCalledWith({ type: 'partial', transcript: '你好' })
  })

  it('posts a stopped message when stop flush returns no transcript', async () => {
    const recognizer = {
      start: vi.fn(),
      stop: vi.fn(() => ({ text: '', isFinal: false })),
      acceptWaveform: vi.fn(() => ({ text: '', isFinal: false })),
    }
    self.createSherpaOnnxRecognizer = vi.fn(() => Promise.resolve(recognizer))

    await import('@/workers/sherpaSpeechWorker.js')
    await self.onmessage({
      data: {
        type: 'init',
        runtimeUrl: '/voice-models/sherpa-onnx/zh-cn-streaming/runtime.js',
        config: { language: 'zh-CN' }
      }
    })

    await self.onmessage({ data: { type: 'stop' } })

    expect(recognizer.stop).toHaveBeenCalled()
    expect(self.postMessage).toHaveBeenCalledWith({ type: 'stopped' })
  })

  it('passes worker config through to the sherpa runtime without dropping model metadata', async () => {
    const recognizer = {
      start: vi.fn(),
      acceptWaveform: vi.fn(() => ({ text: '', isFinal: false })),
    }
    self.createSherpaOnnxRecognizer = vi.fn(() => Promise.resolve(recognizer))

    await import('@/workers/sherpaSpeechWorker.js')

    const config = {
      language: 'zh-CN',
      recognizerConfig: {
        featConfig: { sampleRate: 16000, featureDim: 80 },
        modelConfig: {
          transducer: {
            encoder: './encoder.onnx',
            decoder: './decoder.onnx',
            joiner: './joiner.onnx'
          },
          tokens: './tokens.txt'
        }
      }
    }

    await self.onmessage({
      data: {
        type: 'init',
        runtimeUrl: '/voice-models/sherpa-onnx/zh-cn-streaming/runtime.js',
        config
      }
    })

    expect(self.createSherpaOnnxRecognizer).toHaveBeenCalledWith(config)
    expect(self.postMessage).toHaveBeenCalledWith({ type: 'ready' })
  })
})
