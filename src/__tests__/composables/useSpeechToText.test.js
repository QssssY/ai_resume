import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSpeechToText } from '@/composables/useSpeechToText'

vi.mock('@/utils/offlineVoiceModelCache', async () => {
  const actual = await vi.importActual('@/utils/offlineVoiceModelCache')
  return {
    ...actual,
    getOfflineVoiceModelStatus: vi.fn(() => ({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'pending',
      progress: 0
    })),
    downloadModelFromManifest: vi.fn(),
    clearModelCache: vi.fn()
  }
})

describe('useSpeechToText', () => {
  let recognitionInstance
  let mediaTrack
  let audioContext
  let audioSource
  let audioProcessor
  let audioWorkletNode
  let analyser
  let sampleValue
  let workerInstance
  let workerInstances

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-19T10:00:00.000Z'))
    sampleValue = 128
    workerInstance = null
    workerInstances = []
    recognitionInstance = null
    mediaTrack = { stop: vi.fn() }
    audioSource = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
    audioProcessor = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      onaudioprocess: null,
    }
    audioWorkletNode = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      port: {
        onmessage: null,
        close: vi.fn(),
      },
    }
    analyser = {
      fftSize: 0,
      getByteTimeDomainData: vi.fn((samples) => samples.fill(sampleValue)),
    }
    audioContext = {
      state: 'running',
      sampleRate: 16000,
      resume: vi.fn(() => Promise.resolve()),
      createAnalyser: vi.fn(() => analyser),
      createMediaStreamSource: vi.fn(() => audioSource),
      createScriptProcessor: vi.fn(() => audioProcessor),
      close: vi.fn(),
    }

    window.SpeechRecognition = vi.fn(function SpeechRecognitionMock() {
      recognitionInstance = this
      this.start = vi.fn()
      this.stop = vi.fn()
      this.abort = vi.fn()
    })
    window.SpeechRecognition.available = vi.fn(() => Promise.resolve('available'))
    window.AudioContext = vi.fn(function AudioContextMock() {
      return audioContext
    })
    navigator.mediaDevices = {
      getUserMedia: vi.fn(() => Promise.resolve({ getTracks: () => [mediaTrack] })),
    }
    window.Worker = vi.fn(function WorkerMock() {
      workerInstance = this
      workerInstances.push(this)
      this.postMessage = vi.fn()
      this.terminate = vi.fn()
    })
  })

  afterEach(() => {
    delete window.SpeechRecognition
    delete window.AudioContext
    delete window.AudioWorkletNode
    delete navigator.mediaDevices
    delete window.Worker
    vi.useRealTimers()
  })

  it('tries browser recognition first when the offline model is missing', async () => {
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()

    expect(speech.engineStatus.value).toBe('system-local')
    expect(speech.modelStatus.value.status).toBe('pending')
    expect(speech.isModelReady.value).toBe(false)
    expect(speech.error.value).toBe('')
    expect(speech.isRecording.value).toBe(true)
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(window.SpeechRecognition).toHaveBeenCalled()
    expect(recognitionInstance.start).toHaveBeenCalled()
  })

  it('suggests offline model only when neither offline nor browser recognition is available', async () => {
    delete window.SpeechRecognition
    delete window.webkitSpeechRecognition
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()

    expect(speech.engineStatus.value).toBe('offline-missing')
    expect(speech.isSupported.value).toBe(false)
    expect(speech.error.value).toContain('离线语音识别模型未安装')
    expect(speech.offlineEngineSuggested.value).toBe(true)
    expect(speech.isRecording.value).toBe(false)
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled()
  })

  it('uses offline worker when model is ready and updates transcripts from worker messages', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100,
      manifestUrl: '/voice-models/sherpa-onnx/zh-cn-streaming/manifest.json',
      runtime: '/voice-models/sherpa-onnx/zh-cn-streaming/runtime.js'
    })
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()
    expect(window.AudioContext).toHaveBeenCalledWith({ sampleRate: 16000 })
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    })
    expect(speech.isRecording.value).toBe(false)

    workerInstance.onmessage({ data: { type: 'ready' } })
    expect(speech.engineStatus.value).toBe('offline-ready')
    expect(speech.isRecording.value).toBe(true)
    expect(audioSource.connect).toHaveBeenCalledWith(audioProcessor)
    expect(audioProcessor.connect).toHaveBeenCalledWith(audioContext.destination)

    workerInstance.onmessage({ data: { type: 'partial', transcript: 'hello' } })
    expect(speech.interimTranscript.value).toBe('hello')
    workerInstance.onmessage({ data: { type: 'final', transcript: 'hello interviewer' } })

    expect(window.SpeechRecognition).not.toHaveBeenCalled()
    expect(workerInstance.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'init',
      runtimeUrl: expect.stringMatching(/^\/voice-models\/sherpa-onnx\/zh-cn-streaming\/runtime\.js\?v=/)
    }))
    expect(workerInstance.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'start' }))
    expect(speech.finalTranscript.value).toBe('hello interviewer')
  })

  it('posts a structured-cloneable offline worker init message when cached files are reactive', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    const cachedFiles = [
      {
        path: 'sherpa-onnx-asr.js',
        url: '/voice-models/sherpa-onnx/zh-cn-streaming/sherpa-onnx-asr.js',
        size: 43606
      }
    ]
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100,
      manifestUrl: '/voice-models/sherpa-onnx/zh-cn-streaming/manifest.json',
      runtime: '/voice-models/sherpa-onnx/zh-cn-streaming/runtime.js',
      files: cachedFiles
    })
    window.Worker = vi.fn(function WorkerMock() {
      workerInstance = this
      workerInstances.push(this)
      this.postMessage = vi.fn((message) => structuredClone(message))
      this.terminate = vi.fn()
    })
    const speech = useSpeechToText({ preferOffline: true })

    await expect(speech.start()).resolves.toBeUndefined()

    const initCall = workerInstance.postMessage.mock.calls.find(([message]) => message.type === 'init')
    expect(initCall).toBeTruthy()
    expect(initCall[0].runtimeUrl).toMatch(/^\/voice-models\/sherpa-onnx\/zh-cn-streaming\/runtime\.js\?v=/)
    expect(initCall[0].config.files).toEqual(cachedFiles)
    expect(() => structuredClone(initCall[0])).not.toThrow()
  })

  it('appends the frontend runtime adapter version even when the cached model has its own version', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100,
      version: 'speech-asr-1pass-20260527',
      runtime: '/voice-models/sherpa-onnx/zh-cn-streaming/runtime.js'
    })
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()

    const initCall = workerInstance.postMessage.mock.calls.find(([message]) => message.type === 'init')
    expect(initCall[0].runtimeUrl).toContain('speech-asr-1pass-20260527')
    expect(initCall[0].runtimeUrl).toMatch(/20260530/)
  })

  it('prepares the offline worker without opening microphone capture', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100,
      runtime: '/voice-models/sherpa-onnx/zh-cn-streaming/runtime.js'
    })
    const speech = useSpeechToText({ preferOffline: true })

    const preparePromise = speech.prepareOfflineRecognition()

    expect(window.Worker).toHaveBeenCalledTimes(1)
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled()
    expect(speech.isRecording.value).toBe(false)
    expect(workerInstance.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'init' }))

    workerInstance.onmessage({ data: { type: 'ready' } })
    await preparePromise

    expect(speech.engineStatus.value).toBe('offline-ready')
    expect(speech.isRecording.value).toBe(false)
  })

  it('keeps the downloaded offline engine label stable while prewarming', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100,
      runtime: '/voice-models/sherpa-onnx/zh-cn-streaming/runtime.js'
    })
    const speech = useSpeechToText({ preferOffline: true })

    expect(speech.engineStatus.value).toBe('offline-ready')

    const preparePromise = speech.prepareOfflineRecognition()

    expect(speech.engineStatus.value).toBe('offline-ready')
    expect(speech.isRecording.value).toBe(false)

    workerInstance.onmessage({ data: { type: 'ready' } })
    await preparePromise

    expect(speech.engineStatus.value).toBe('offline-ready')
  })

  it('starts recording through a prewarmed offline worker without sending init again', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100,
      runtime: '/voice-models/sherpa-onnx/zh-cn-streaming/runtime.js'
    })
    const speech = useSpeechToText({ preferOffline: true })

    const preparePromise = speech.prepareOfflineRecognition()
    workerInstance.onmessage({ data: { type: 'ready' } })
    await preparePromise
    const firstWorker = workerInstance

    await speech.start()

    expect(workerInstances).toHaveLength(1)
    expect(firstWorker.postMessage.mock.calls.filter(([message]) => message.type === 'init')).toHaveLength(1)
    expect(firstWorker.postMessage).toHaveBeenLastCalledWith({ type: 'start' })
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1)
    expect(speech.isRecording.value).toBe(true)
  })

  it('resumes suspended offline audio context before recording starts', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100
    })
    audioContext.state = 'suspended'
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()

    expect(audioContext.resume).toHaveBeenCalled()
  })

  it('resumes offline audio context within the start gesture before microphone permission resolves', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100
    })
    audioContext.state = 'suspended'
    let resolveUserMedia
    navigator.mediaDevices.getUserMedia = vi.fn(() => new Promise((resolve) => {
      resolveUserMedia = resolve
    }))
    const speech = useSpeechToText({ preferOffline: true })

    const startPromise = speech.start()
    await Promise.resolve()
    await Promise.resolve()

    expect(window.AudioContext).toHaveBeenCalledWith({ sampleRate: 16000 })
    expect(audioContext.resume).toHaveBeenCalled()
    expect(audioContext.createMediaStreamSource).not.toHaveBeenCalled()

    resolveUserMedia({ getTracks: () => [mediaTrack] })
    await startPromise

    expect(audioContext.createMediaStreamSource).toHaveBeenCalled()
  })

  it('sends offline microphone audio frames into the worker after ready', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100
    })
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()
    workerInstance.onmessage({ data: { type: 'ready' } })
    audioProcessor.onaudioprocess({
      inputBuffer: {
        getChannelData: vi.fn(() => new Float32Array([0.25, -0.5]))
      }
    })

    const audioCall = workerInstance.postMessage.mock.calls.find(([message]) => message.type === 'audio')
    expect(audioCall).toBeTruthy()
    expect(audioCall[0].sampleRate).toBe(16000)
    expect(Array.from(audioCall[0].samples)).toEqual([0.25, -0.5])
    expect(audioCall[1]).toEqual([audioCall[0].samples.buffer])
    expect(speech.errorCode.value).toBe('')
  })

  it('uses AudioWorklet for offline microphone frames before falling back to deprecated ScriptProcessor', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100
    })
    audioContext.audioWorklet = {
      addModule: vi.fn(() => Promise.resolve()),
    }
    window.AudioWorkletNode = vi.fn(function AudioWorkletNodeMock() {
      return audioWorkletNode
    })
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()
    workerInstance.onmessage({ data: { type: 'ready' } })
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(speech.isRecording.value).toBe(true)
    audioWorkletNode.port.onmessage({ data: { samples: [0.25, -0.5] } })

    expect(audioContext.audioWorklet.addModule).toHaveBeenCalledWith(expect.stringContaining('/audio-worklets/offline-stt-processor.js'))
    expect(window.AudioWorkletNode).toHaveBeenCalledWith(audioContext, 'offline-stt-processor')
    expect(audioContext.createScriptProcessor).not.toHaveBeenCalled()
    const audioCall = workerInstance.postMessage.mock.calls.find(([message]) => message.type === 'audio')
    expect(audioCall).toBeTruthy()
    expect(audioCall[0].sampleRate).toBe(16000)
    expect(Array.from(audioCall[0].samples)).toEqual([0.25, -0.5])
    expect(audioCall[1]).toEqual([audioCall[0].samples.buffer])
    expect(speech.isVoiceActive.value).toBe(true)
  })

  it('marks offline voice activity directly from PCM frames before transcript changes', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100
    })
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()
    workerInstance.onmessage({ data: { type: 'ready' } })
    audioProcessor.onaudioprocess({
      inputBuffer: {
        getChannelData: vi.fn(() => new Float32Array([0.04, -0.04, 0.03, -0.03]))
      }
    })

    expect(speech.isVoiceActive.value).toBe(true)
    expect(speech.voiceActivityAt.value).toBe(Date.now())
  })

  it('reports an offline audio error when no processor node is available', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100
    })
    audioContext.createScriptProcessor = undefined
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()
    workerInstance.onmessage({ data: { type: 'ready' } })

    expect(speech.errorCode.value).toBe('offline-audio-unavailable')
    expect(speech.engineStatus.value).toBe('offline-error')
    expect(speech.offlineEngineSuggested.value).toBe(false)
    expect(speech.isRecording.value).toBe(false)
    expect(workerInstance.terminate).toHaveBeenCalled()
  })

  it('reports an offline audio error when recording produces no audio frames', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100
    })
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()
    workerInstance.onmessage({ data: { type: 'ready' } })
    vi.advanceTimersByTime(2200)

    expect(speech.errorCode.value).toBe('offline-audio-unavailable')
    expect(speech.engineStatus.value).toBe('offline-error')
    expect(speech.offlineEngineSuggested.value).toBe(false)
    expect(speech.isRecording.value).toBe(false)
    expect(workerInstance.terminate).toHaveBeenCalled()
  })

  it('does not downgrade ready offline recognition to no-transcript before sherpa flushes final text', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100
    })
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()
    workerInstance.onmessage({ data: { type: 'ready' } })
    audioProcessor.onaudioprocess({
      inputBuffer: {
        getChannelData: vi.fn(() => new Float32Array([0.08, -0.09]))
      }
    })
    sampleValue = 145
    vi.advanceTimersByTime(6240)

    expect(speech.errorCode.value).toBe('')
    expect(speech.engineStatus.value).toBe('offline-ready')
    expect(speech.isRecording.value).toBe(true)
  })

  it('keeps installed offline model status after an offline worker error instead of suggesting another download', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100
    })
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()
    workerInstance.onmessage({ data: { type: 'ready' } })
    workerInstance.onmessage({ data: { type: 'error', error: 'runtime failed' } })

    expect(speech.errorCode.value).toBe('offline-worker-error')
    expect(speech.engineStatus.value).toBe('offline-error')
    expect(speech.offlineEngineSuggested.value).toBe(false)
    expect(speech.isSupported.value).toBe(true)
  })

  it('terminates offline worker and releases microphone when cancelled', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100
    })
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()
    speech.cancel()

    expect(workerInstance.terminate).toHaveBeenCalled()
    expect(mediaTrack.stop).toHaveBeenCalled()
    expect(audioContext.close).toHaveBeenCalled()
    expect(speech.isRecording.value).toBe(false)
  })

  it('waits for the offline worker final transcript before releasing microphone on stop', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100
    })
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()
    workerInstance.onmessage({ data: { type: 'ready' } })
    const stopPromise = speech.stop()

    expect(workerInstance.postMessage).toHaveBeenCalledWith({ type: 'stop' })
    expect(workerInstance.terminate).not.toHaveBeenCalled()

    workerInstance.onmessage({ data: { type: 'final', transcript: 'last answer' } })
    await stopPromise

    expect(speech.finalTranscript.value).toBe('last answer')
    expect(workerInstance.terminate).not.toHaveBeenCalled()
    expect(mediaTrack.stop).toHaveBeenCalled()
    expect(audioContext.close).toHaveBeenCalled()
    expect(speech.isRecording.value).toBe(false)
  })

  it('reuses the ready offline worker between recording rounds instead of reinitializing the model', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100,
      runtime: '/voice-models/sherpa-onnx/zh-cn-streaming/runtime.js'
    })
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()
    workerInstance.onmessage({ data: { type: 'ready' } })
    const firstWorker = workerInstance
    const stopPromise = speech.stop()
    firstWorker.onmessage({ data: { type: 'final', transcript: '第一轮' } })
    await stopPromise

    await speech.start()

    expect(workerInstances).toHaveLength(1)
    expect(firstWorker.terminate).not.toHaveBeenCalled()
    expect(firstWorker.postMessage.mock.calls.filter(([message]) => message.type === 'init')).toHaveLength(1)
    expect(firstWorker.postMessage).toHaveBeenLastCalledWith({ type: 'start' })
    expect(speech.engineStatus.value).toBe('offline-ready')
    expect(speech.isRecording.value).toBe(true)
  })

  it('finishes offline stop immediately when the worker confirms stop without text', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100
    })
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()
    workerInstance.onmessage({ data: { type: 'ready' } })
    audioProcessor.onaudioprocess({
      inputBuffer: {
        getChannelData: vi.fn(() => new Float32Array([0.08, -0.09]))
      }
    })

    const stopPromise = speech.stop()
    let resolved = false
    stopPromise.then(() => { resolved = true })
    workerInstance.onmessage({ data: { type: 'stopped' } })
    await stopPromise

    expect(resolved).toBe(true)
    expect(speech.errorCode.value).toBe('offline-no-transcript')
    expect(workerInstance.terminate).not.toHaveBeenCalled()
  })

  it('reports an offline recognition error when microphone audio flushes without any transcript', async () => {
    const cache = await import('@/utils/offlineVoiceModelCache')
    cache.getOfflineVoiceModelStatus.mockReturnValue({
      modelKey: 'stt:sherpa_onnx:zh_cn',
      status: 'ready',
      progress: 100
    })
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()
    workerInstance.onmessage({ data: { type: 'ready' } })
    audioProcessor.onaudioprocess({
      inputBuffer: {
        getChannelData: vi.fn(() => new Float32Array([0.08, -0.09]))
      }
    })
    sampleValue = 145
    vi.advanceTimersByTime(120)

    const stopPromise = speech.stop()
    vi.advanceTimersByTime(5100)
    await stopPromise

    expect(speech.errorCode.value).toBe('offline-no-transcript')
    expect(speech.engineStatus.value).toBe('offline-error')
    expect(speech.offlineEngineSuggested.value).toBe(false)
    expect(speech.isRecording.value).toBe(false)
  })

  it('marks voice activity from microphone volume before transcript changes', async () => {
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()
    sampleValue = 145
    vi.advanceTimersByTime(120)

    expect(speech.isRecording.value).toBe(true)
    expect(speech.isVoiceActive.value).toBe(true)
    expect(speech.voiceActivityAt.value).toBe(Date.now())
    expect(recognitionInstance.start).toHaveBeenCalled()
  })

  it('starts browser recognition before opening the optional microphone monitor', async () => {
    navigator.mediaDevices.getUserMedia = vi.fn(() => {
      if (!recognitionInstance?.start.mock.calls.length) {
        throw new Error('monitor opened before native recognition')
      }
      return Promise.resolve({ getTracks: () => [mediaTrack] })
    })
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()

    expect(recognitionInstance.start).toHaveBeenCalled()
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(speech.error.value).toBe('')
    expect(speech.isRecording.value).toBe(true)
  })

  it('keeps browser recognition running when the optional microphone monitor is denied', async () => {
    navigator.mediaDevices.getUserMedia = vi.fn(() => Promise.reject(new Error('denied')))
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()
    await Promise.resolve()

    expect(recognitionInstance.start).toHaveBeenCalled()
    expect(speech.error.value).toBe('')
    expect(speech.errorCode.value).toBe('')
    expect(speech.isRecording.value).toBe(true)
  })

  it('tries to enable local system recognition when processLocally is supported', async () => {
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()

    expect(recognitionInstance.processLocally).toBe(true)
    expect(speech.supportsLocalProcessing.value).toBe(true)
    expect(speech.engineStatus.value).toBe('system-local')
    expect(speech.errorCode.value).toBe('')
  })

  it('retries browser recognition when local recognition does not support the language', async () => {
    const recognitionInstances = []
    window.SpeechRecognition = vi.fn(function SpeechRecognitionMock() {
      recognitionInstance = this
      recognitionInstances.push(this)
      this.start = vi.fn()
      this.stop = vi.fn()
      this.abort = vi.fn()
    })
    window.SpeechRecognition.available = vi.fn(() => Promise.resolve('available'))
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()
    recognitionInstances[0].onerror({ error: 'language-not-supported' })
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(recognitionInstances).toHaveLength(2)
    expect(recognitionInstances[0].abort).toHaveBeenCalled()
    expect(recognitionInstances[1].processLocally).toBeUndefined()
    expect(recognitionInstances[1].start).toHaveBeenCalled()
    expect(speech.error.value).toBe('')
    expect(speech.errorCode.value).toBe('')
    expect(speech.engineStatus.value).toBe('browser-service')
    expect(speech.isRecording.value).toBe(true)
    expect(mediaTrack.stop).toHaveBeenCalledTimes(1)
    expect(audioContext.close).toHaveBeenCalledTimes(1)
  })

  it('falls back to browser recognition when processLocally assignment is unsupported', async () => {
    window.SpeechRecognition = vi.fn(function SpeechRecognitionMock() {
      recognitionInstance = this
      Object.defineProperty(this, 'processLocally', {
        set() {
          throw new Error('unsupported')
        }
      })
      this.start = vi.fn()
      this.stop = vi.fn()
      this.abort = vi.fn()
    })
    window.SpeechRecognition.available = vi.fn(() => Promise.resolve('available'))
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()

    expect(speech.supportsLocalProcessing.value).toBe(false)
    expect(speech.engineStatus.value).toBe('browser-service')
    expect(recognitionInstance.start).toHaveBeenCalled()
  })

  it('uses browser recognition when local language package is not available', async () => {
    window.SpeechRecognition.available = vi.fn(() => Promise.resolve('unavailable'))
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()

    expect(window.SpeechRecognition.available).toHaveBeenCalledWith({
      langs: ['zh-CN'],
      processLocally: true,
    })
    expect(recognitionInstance.processLocally).toBeUndefined()
    expect(speech.supportsLocalProcessing.value).toBe(false)
    expect(speech.engineStatus.value).toBe('browser-service')
    expect(recognitionInstance.start).toHaveBeenCalled()
  })

  it('cleans microphone monitor when cancelled', async () => {
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()
    speech.cancel()

    expect(mediaTrack.stop).toHaveBeenCalled()
    expect(audioContext.close).toHaveBeenCalled()
    expect(speech.isVoiceActive.value).toBe(false)
    expect(recognitionInstance.abort).toHaveBeenCalled()
  })

  it('cleans optional microphone monitor when browser recognition is cancelled during startup', async () => {
    let resolveUserMedia
    const pendingUserMedia = new Promise((resolve) => {
      resolveUserMedia = resolve
    })
    navigator.mediaDevices.getUserMedia = vi.fn(() => pendingUserMedia)
    const speech = useSpeechToText({ preferOffline: false })

    const startPromise = speech.start()
    await startPromise
    speech.cancel()
    resolveUserMedia({ getTracks: () => [mediaTrack] })
    await Promise.resolve()

    expect(recognitionInstance.abort).toHaveBeenCalled()
    expect(speech.isRecording.value).toBe(false)
    expect(speech.error.value).toBe('')
    expect(mediaTrack.stop).toHaveBeenCalled()
    expect(audioContext.close).toHaveBeenCalled()
  })

  it('stops recognition and releases microphone immediately when stopped', async () => {
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()
    speech.stop()

    expect(recognitionInstance.stop).toHaveBeenCalled()
    expect(speech.isRecording.value).toBe(false)
    expect(mediaTrack.stop).toHaveBeenCalled()
    expect(audioContext.close).toHaveBeenCalled()
  })

  it('writes a user-facing error when network recognition fails', async () => {
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()
    recognitionInstance.onerror({ error: 'network' })
    expect(speech.errorCode.value).toBe('network')
    expect(speech.offlineEngineSuggested.value).toBe(true)
    expect(speech.engineStatus.value).toBe('unavailable')

    expect(speech.error.value).toBe('当前浏览器语音识别服务不可用，已降级为手动输入；建议下载离线语音识别引擎')
    expect(speech.isRecording.value).toBe(false)
    expect(mediaTrack.stop).toHaveBeenCalled()
    expect(audioContext.close).toHaveBeenCalled()
  })

  it('writes a manual-input degradation prompt when speech recognition is unsupported', async () => {
    delete window.SpeechRecognition
    delete window.webkitSpeechRecognition
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()

    expect(speech.error.value).toBe('当前浏览器不支持语音识别，已降级为手动输入')
    expect(speech.isRecording.value).toBe(false)
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled()
  })

  it('writes a manual-input degradation prompt when browser recognition reports microphone denial', async () => {
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()
    recognitionInstance.onerror({ error: 'not-allowed' })

    expect(speech.error.value).toBe('麦克风权限被拒绝，已降级为手动输入')
    expect(speech.isRecording.value).toBe(false)
  })

  it('writes a manual-input degradation prompt when microphone capture fails', async () => {
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()
    recognitionInstance.onerror({ error: 'audio-capture' })

    expect(speech.error.value).toBe('未检测到可用麦克风，已降级为手动输入')
    expect(speech.isRecording.value).toBe(false)
  })

  it('writes a degradation prompt when no speech is recognized', async () => {
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()
    recognitionInstance.onerror({ error: 'no-speech' })

    expect(speech.error.value).toBe('未识别到有效语音内容，已降级为手动输入。错误码：no-speech')
    expect(speech.isRecording.value).toBe(false)
    expect(mediaTrack.stop).toHaveBeenCalled()
    expect(audioContext.close).toHaveBeenCalled()
  })

  it('writes a degradation prompt when microphone has audio but recognition returns no text', async () => {
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()
    sampleValue = 145
    vi.advanceTimersByTime(6240)

    expect(speech.error.value).toBe('检测到麦克风输入，但浏览器未返回识别文字，已降级为手动输入。错误码：no-transcript')
    expect(speech.isRecording.value).toBe(false)
    expect(recognitionInstance.abort).toHaveBeenCalled()
    expect(mediaTrack.stop).toHaveBeenCalled()
    expect(audioContext.close).toHaveBeenCalled()
  })

  it('writes a degradation prompt when recognition ends without text', async () => {
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()
    recognitionInstance.onend()

    expect(speech.error.value).toBe('语音识别已结束但未返回文字，已降级为手动输入。错误码：end-without-result')
    expect(speech.isRecording.value).toBe(false)
    expect(recognitionInstance.abort).toHaveBeenCalled()
    expect(mediaTrack.stop).toHaveBeenCalled()
    expect(audioContext.close).toHaveBeenCalled()
  })

  it('marks permission and no-speech errors as offline-engine candidates', async () => {
    const speech = useSpeechToText({ preferOffline: false })

    await speech.start()
    recognitionInstance.onerror({ error: 'not-allowed' })

    expect(speech.errorCode.value).toBe('not-allowed')
    expect(speech.offlineEngineSuggested.value).toBe(true)

    await speech.start()
    recognitionInstance.onerror({ error: 'no-speech' })

    expect(speech.errorCode.value).toBe('no-speech')
    expect(speech.offlineEngineSuggested.value).toBe(true)
  })
})
