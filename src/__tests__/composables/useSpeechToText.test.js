import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSpeechToText } from '@/composables/useSpeechToText'

describe('useSpeechToText', () => {
  let recognitionInstance
  let mediaTrack
  let audioContext
  let analyser
  let sampleValue

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T10:00:00.000Z'))
    sampleValue = 128
    recognitionInstance = null
    mediaTrack = { stop: vi.fn() }
    analyser = {
      fftSize: 0,
      getByteTimeDomainData: vi.fn((samples) => samples.fill(sampleValue)),
    }
    audioContext = {
      state: 'running',
      resume: vi.fn(() => Promise.resolve()),
      createAnalyser: vi.fn(() => analyser),
      createMediaStreamSource: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() })),
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
    window.Worker = vi.fn()
    navigator.mediaDevices = {
      getUserMedia: vi.fn(() => Promise.resolve({ getTracks: () => [mediaTrack] })),
    }
  })

  afterEach(() => {
    delete window.SpeechRecognition
    delete window.webkitSpeechRecognition
    delete window.AudioContext
    delete window.Worker
    delete navigator.mediaDevices
    vi.useRealTimers()
  })

  it('uses browser recognition even when legacy offline options are passed', async () => {
    const speech = useSpeechToText({ preferOffline: true, prewarmOffline: true })

    await speech.start()

    expect(window.SpeechRecognition).toHaveBeenCalledTimes(1)
    expect(recognitionInstance.start).toHaveBeenCalledTimes(1)
    expect(window.Worker).not.toHaveBeenCalled()
    expect(speech.engineStatus.value).toBe('system-local')
    expect(speech.isRecording.value).toBe(true)
    expect(speech).not.toHaveProperty('prepareOfflineRecognition')
    expect(speech).not.toHaveProperty('downloadOfflineModel')
    expect(speech).not.toHaveProperty('clearOfflineModel')
    expect(speech).not.toHaveProperty('offlineEngineSuggested')
  })

  it('reports unsupported when the browser has no Web Speech recognition', async () => {
    delete window.SpeechRecognition
    delete window.webkitSpeechRecognition
    const speech = useSpeechToText({ preferOffline: true })

    await speech.start()

    expect(speech.engineStatus.value).toBe('unsupported')
    expect(speech.isSupported.value).toBe(false)
    expect(speech.isRecording.value).toBe(false)
    expect(speech.error.value).toBe('当前浏览器不支持语音识别，已降级为手动输入')
    expect(speech.error.value).not.toContain('离线')
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled()
  })

  it('does not suggest downloading an offline engine when browser recognition fails', async () => {
    const speech = useSpeechToText()

    await speech.start()
    recognitionInstance.onerror({ error: 'network' })

    expect(speech.errorCode.value).toBe('network')
    expect(speech.engineStatus.value).toBe('unavailable')
    expect(speech.error.value).toBe('当前浏览器语音识别服务不可用，已降级为手动输入')
    expect(speech.error.value).not.toContain('离线')
    expect(speech.isRecording.value).toBe(false)
    expect(mediaTrack.stop).toHaveBeenCalled()
    expect(audioContext.close).toHaveBeenCalled()
  })

  it('collects final and interim browser recognition transcripts', async () => {
    const speech = useSpeechToText()

    await speech.start()
    recognitionInstance.onresult({
      resultIndex: 0,
      results: [
        { isFinal: true, 0: { transcript: '我负责订单模块' } },
        { isFinal: false, 0: { transcript: '以及支付' } }
      ]
    })

    expect(speech.finalTranscript.value).toBe('我负责订单模块')
    expect(speech.interimTranscript.value).toBe('以及支付')
    expect(speech.error.value).toBe('')
  })

  it('marks voice activity from the optional microphone monitor', async () => {
    const speech = useSpeechToText()

    await speech.start()
    sampleValue = 145
    vi.advanceTimersByTime(120)

    expect(speech.isVoiceActive.value).toBe(true)
    expect(speech.voiceActivityAt.value).toBe(Date.now())
  })

  it('clears a no-transcript failure before the next browser recognition start', async () => {
    const speech = useSpeechToText()

    await speech.start()
    sampleValue = 145
    vi.advanceTimersByTime(6120)

    expect(speech.errorCode.value).toBe('no-transcript')
    expect(speech.engineStatus.value).toBe('unavailable')
    expect(speech.isRecording.value).toBe(false)

    await speech.start()

    expect(window.SpeechRecognition).toHaveBeenCalledTimes(2)
    expect(recognitionInstance.start).toHaveBeenCalledTimes(1)
    expect(speech.error.value).toBe('')
    expect(speech.errorCode.value).toBe('')
    expect(speech.engineStatus.value).toBe('system-local')
    expect(speech.isRecording.value).toBe(true)
  })
})
