import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useVoiceCall } from '@/composables/useVoiceCall'

describe('useVoiceCall', () => {
  let speech
  let textToSpeech
  let isReplying
  let onSend

  beforeEach(() => {
    vi.useFakeTimers()
    speech = {
      isSupported: ref(true),
      isRecording: ref(false),
      isVoiceActive: ref(false),
      voiceActivityAt: ref(0),
      finalTranscript: ref(''),
      interimTranscript: ref(''),
      error: ref(''),
      engineStatus: ref('offline-ready'),
      isModelReady: ref(true),
      start: vi.fn(() => {
        speech.isRecording.value = true
      }),
      stop: vi.fn(() => {
        speech.isRecording.value = false
      }),
      cancel: vi.fn(() => {
        speech.isRecording.value = false
      }),
    }
    textToSpeech = {
      isSupported: ref(true),
      isSpeaking: ref(false),
      stop: vi.fn(),
    }
    isReplying = ref(false)
    onSend = vi.fn(() => Promise.resolve())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts speech recognition and call timer', () => {
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend })

    expect(call.startVoiceCall()).toBe(true)
    vi.advanceTimersByTime(1000)

    expect(speech.start).toHaveBeenCalled()
    expect(call.callDuration.value).toBe(1)
  })

  it('can defer initial listening until opening speech finishes', () => {
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend })

    expect(call.startVoiceCall({ startListening: false })).toBe(true)
    vi.advanceTimersByTime(1000)

    expect(call.isVoiceMode.value).toBe(true)
    expect(call.callDuration.value).toBe(1)
    expect(speech.start).not.toHaveBeenCalled()

    call.resumeListening()

    expect(speech.start).toHaveBeenCalledTimes(1)
  })

  it('auto sends after three seconds of silence', async () => {
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend })
    call.startVoiceCall()

    speech.finalTranscript.value = '我负责订单模块'
    await nextTick()
    vi.advanceTimersByTime(3000)

    expect(onSend).toHaveBeenCalledWith('我负责订单模块')
    expect(call.pendingMessage.value).toBe('')
  })

  it('does not auto send when silence timeout is disabled', async () => {
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend, silenceTimeoutMs: 0 })
    call.startVoiceCall()

    speech.finalTranscript.value = '我负责订单模块'
    await nextTick()
    vi.advanceTimersByTime(5000)

    expect(onSend).not.toHaveBeenCalled()
    expect(call.pendingMessage.value).toBe('我负责订单模块')
  })

  it('preserves English spaces across transcript updates', async () => {
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend })
    call.startVoiceCall()

    speech.finalTranscript.value = 'Please describe '
    await nextTick()
    speech.finalTranscript.value = 'Please describe your project.'
    await nextTick()
    vi.advanceTimersByTime(3000)

    expect(onSend).toHaveBeenCalledWith('Please describe your project.')
  })

  it('does not auto send while ai is replying', async () => {
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend })
    call.startVoiceCall()
    speech.finalTranscript.value = '我负责订单模块'
    await nextTick()

    isReplying.value = true
    await nextTick()
    vi.advanceTimersByTime(3000)

    expect(onSend).not.toHaveBeenCalled()
    expect(speech.stop).toHaveBeenCalled()
  })

  it('cleans resources when ending call', () => {
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend })
    call.startVoiceCall()

    call.endVoiceCall()

    expect(call.isVoiceMode.value).toBe(false)
    expect(call.isMuted.value).toBe(false)
    expect(speech.cancel).toHaveBeenCalled()
    expect(textToSpeech.stop).toHaveBeenCalled()
  })

  it('falls back to manual input when speech recognition is unsupported', () => {
    speech.isSupported.value = false
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend })

    expect(call.startVoiceCall()).toBe(false)

    expect(call.error.value).toBe('当前浏览器不支持语音识别，已降级为手动输入')
    expect(call.isVoiceMode.value).toBe(false)
    expect(speech.start).not.toHaveBeenCalled()
  })

  it('starts browser recognition when offline speech model is missing but speech is supported', () => {
    speech.engineStatus.value = 'offline-missing'
    speech.isModelReady.value = false
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend })

    expect(call.startVoiceCall()).toBe(true)

    expect(call.error.value).toBe('')
    expect(call.isVoiceMode.value).toBe(true)
    expect(speech.start).toHaveBeenCalled()
  })

  it('does not enter voice mode when both offline and browser recognition are unavailable', () => {
    speech.isSupported.value = false
    speech.engineStatus.value = 'offline-missing'
    speech.isModelReady.value = false
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend })

    expect(call.startVoiceCall()).toBe(false)

    expect(call.error.value).toBe('当前浏览器不支持语音识别，已降级为手动输入')
    expect(call.isVoiceMode.value).toBe(false)
    expect(speech.start).not.toHaveBeenCalled()
  })

  it('ends voice mode when speech recognition reports an error', async () => {
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend })
    call.startVoiceCall()

    speech.error.value = '系统语音引擎暂不可用，建议下载离线语音包'
    await nextTick()

    expect(call.error.value).toBe('系统语音引擎暂不可用，建议下载离线语音包')
    expect(call.isVoiceMode.value).toBe(false)
    expect(textToSpeech.stop).toHaveBeenCalled()
    expect(speech.cancel).toHaveBeenCalled()
  })

  it('pauses recognition while muted and resumes after unmute', () => {
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend })
    call.startVoiceCall()

    expect(call.toggleMute()).toBe(true)
    expect(call.isMuted.value).toBe(true)
    expect(speech.stop).toHaveBeenCalled()

    expect(call.toggleMute()).toBe(false)
    expect(call.isMuted.value).toBe(false)
    expect(speech.start).toHaveBeenCalledTimes(2)
  })

  it('waits for a second click after unmute in manual resume mode', () => {
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend, muteResumeMode: 'manual' })
    call.startVoiceCall()

    expect(call.toggleMute()).toBe(true)
    expect(call.toggleMute()).toBe(false)

    expect(call.isMuted.value).toBe(false)
    expect(call.isManualResumePending.value).toBe(true)
    expect(speech.start).toHaveBeenCalledTimes(1)

    expect(call.toggleMute()).toBe(false)

    expect(call.isManualResumePending.value).toBe(false)
    expect(speech.start).toHaveBeenCalledTimes(2)
  })

  it('keeps waiting while microphone detects voice activity', async () => {
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend })
    call.startVoiceCall()
    speech.finalTranscript.value = '我负责订单模块'
    await nextTick()

    vi.advanceTimersByTime(2500)
    speech.isVoiceActive.value = true
    vi.advanceTimersByTime(500)

    expect(onSend).not.toHaveBeenCalled()

    speech.isVoiceActive.value = false
    vi.advanceTimersByTime(3000)

    expect(onSend).toHaveBeenCalledWith('我负责订单模块')
  })

  it('manually stops listening and sends pending transcript even when voice activity continues', async () => {
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend })
    call.startVoiceCall()
    speech.finalTranscript.value = '我负责订单模块'
    await nextTick()

    speech.isVoiceActive.value = true
    const sent = await call.stopListeningAndSend()

    expect(sent).toBe(true)
    expect(onSend).toHaveBeenCalledWith('我负责订单模块')
    expect(speech.stop).toHaveBeenCalled()
    expect(call.pendingMessage.value).toBe('')
    expect(call.isMuted.value).toBe(false)
  })

  it('keeps listening when manual stop has no pending transcript', async () => {
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend })
    call.startVoiceCall()
    speech.stop.mockClear()

    const sent = await call.stopListeningAndSend()

    expect(sent).toBe(false)
    expect(onSend).not.toHaveBeenCalled()
    expect(speech.stop).not.toHaveBeenCalled()
    expect(call.isVoiceMode.value).toBe(true)
  })

  it('restarts speech recognition when browser ends listening during a voice call', () => {
    const call = useVoiceCall({ speech, textToSpeech, isReplying, onSend })
    call.startVoiceCall()

    speech.isRecording.value = false
    vi.advanceTimersByTime(500)

    expect(speech.start).toHaveBeenCalledTimes(2)
  })
})
