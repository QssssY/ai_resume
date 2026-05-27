import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useTextToSpeech } from '@/composables/useTextToSpeech'

describe('useTextToSpeech', () => {
  let spokenUtterances

  beforeEach(() => {
    spokenUtterances = []
    window.speechSynthesis = {
      getVoices: vi.fn(() => [{ lang: 'zh-CN' }]),
      speak: vi.fn((utterance) => {
        spokenUtterances.push(utterance)
      }),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      onvoiceschanged: null,
    }
    window.SpeechSynthesisUtterance = vi.fn(function SpeechSynthesisUtterance(text) {
      this.text = text
    })
  })

  it('speaks streaming chunks by sentence boundary and flushes remaining text', () => {
    const tts = useTextToSpeech()

    tts.speakStreaming('你好，')
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled()

    tts.speakStreaming('请介绍自己。下一句还没结束')
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1)
    expect(spokenUtterances[0].text).toBe('你好，请介绍自己。')

    tts.flushRemaining()
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(2)
    expect(spokenUtterances[1].text).toBe('下一句还没结束')
  })

  it('filters feedback blocks before speaking', () => {
    const tts = useTextToSpeech()

    tts.speak('继续说说你的项目。<FEEDBACK>这里不应朗读</FEEDBACK>')

    expect(spokenUtterances[0].text).toBe('继续说说你的项目。')
  })

  it('preserves English spaces across streaming chunk boundaries', () => {
    const tts = useTextToSpeech()

    tts.speakStreaming('Please describe ')
    tts.speakStreaming('your project.')

    expect(spokenUtterances[0].text).toBe('Please describe your project.')
  })

  it('uses a softer default speaking style and prefers natural Chinese voices', () => {
    window.speechSynthesis.getVoices = vi.fn(() => [
      { lang: 'en-US', name: 'English Voice' },
      { lang: 'zh-CN', name: 'Microsoft Xiaoxiao Natural' },
      { lang: 'zh-CN', name: 'Basic Chinese Voice' },
    ])
    const tts = useTextToSpeech()

    tts.speak('你好。')

    expect(tts.rate.value).toBe(0.92)
    expect(tts.pitch.value).toBe(1.06)
    expect(spokenUtterances[0].voice.name).toBe('Microsoft Xiaoxiao Natural')
    expect(spokenUtterances[0].rate).toBe(0.92)
    expect(spokenUtterances[0].pitch).toBe(1.06)
    expect(window.speechSynthesis.resume).toHaveBeenCalled()
  })

  it('waits for browser voices before speaking the first utterance', async () => {
    vi.useFakeTimers()
    let currentVoices = []
    window.speechSynthesis.getVoices = vi.fn(() => currentVoices)
    const tts = useTextToSpeech()

    tts.speak('你好。')

    expect(tts.isSpeaking.value).toBe(true)
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled()

    currentVoices = [{ lang: 'zh-CN', name: 'Microsoft Xiaoxiao Natural' }]
    window.speechSynthesis.onvoiceschanged()
    await Promise.resolve()

    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1)
    expect(spokenUtterances[0].text).toBe('你好。')
    expect(spokenUtterances[0].voice.name).toBe('Microsoft Xiaoxiao Natural')
    vi.useRealTimers()
  })

  it('exposes browser TTS engine status without requiring enhanced voice package', () => {
    const tts = useTextToSpeech()

    expect(tts.engineStatus.value).toBe('system-tts')
    expect(tts.enhancedVoiceReady.value).toBe(false)
  })

  it('uses configured speaking style when provided', () => {
    const tts = useTextToSpeech({ rate: 1.1, pitch: 0.95, volume: 0.6 })

    tts.speak('你好。')

    expect(tts.rate.value).toBe(1.1)
    expect(tts.pitch.value).toBe(0.95)
    expect(tts.volume.value).toBe(0.6)
    expect(spokenUtterances[0].rate).toBe(1.1)
    expect(spokenUtterances[0].pitch).toBe(0.95)
    expect(spokenUtterances[0].volume).toBe(0.6)
  })

  it('uses custom configured browser voice when available', () => {
    window.speechSynthesis.getVoices = vi.fn(() => [
      { lang: 'zh-CN', name: 'Microsoft Xiaoxiao Natural', voiceURI: 'xiaoxiao-uri' },
      { lang: 'zh-CN', name: 'Microsoft Yunxi Natural', voiceURI: 'yunxi-uri' },
    ])
    const tts = useTextToSpeech({
      voicePreference: {
        type: 'custom',
        name: 'Microsoft Yunxi Natural',
        voiceURI: 'yunxi-uri',
        lang: 'zh-CN',
      },
    })

    tts.speak('Hello.')

    expect(spokenUtterances[0].voice.name).toBe('Microsoft Yunxi Natural')
  })

  it('can use system default voice without assigning a browser voice', () => {
    window.speechSynthesis.getVoices = vi.fn(() => [
      { lang: 'zh-CN', name: 'Microsoft Xiaoxiao Natural', voiceURI: 'xiaoxiao-uri' },
    ])
    const tts = useTextToSpeech({ voicePreference: { type: 'system' } })

    tts.speak('Hello.')

    expect(tts.voice.value).toBeNull()
    expect(spokenUtterances[0].voice).toBeUndefined()
    expect(spokenUtterances[0].lang).toBe('zh-CN')
  })

  it('prefers configured gender voice when browser names expose one', () => {
    window.speechSynthesis.getVoices = vi.fn(() => [
      { lang: 'zh-CN', name: 'Microsoft Xiaoxiao Natural', voiceURI: 'xiaoxiao-uri' },
      { lang: 'zh-CN', name: 'Microsoft Yunxi Natural', voiceURI: 'yunxi-uri' },
    ])
    const tts = useTextToSpeech({ voicePreference: { type: 'male' } })

    tts.speak('Hello.')

    expect(spokenUtterances[0].voice.name).toBe('Microsoft Yunxi Natural')
  })

  it('stop clears speech queue', () => {
    const tts = useTextToSpeech()

    tts.speakStreaming('尚未结束')
    tts.stop()
    tts.flushRemaining()

    expect(window.speechSynthesis.cancel).toHaveBeenCalled()
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled()
  })

  it('releases speaking state when browser TTS never emits end or error', () => {
    vi.useFakeTimers()
    const onEnd = vi.fn()
    const tts = useTextToSpeech({ onEnd })

    tts.speak('浣犲ソ锛岃浠嬬粛鑷繁銆?')

    expect(tts.isSpeaking.value).toBe(true)
    vi.advanceTimersByTime(20000)

    expect(window.speechSynthesis.cancel).toHaveBeenCalled()
    expect(tts.isSpeaking.value).toBe(false)
    expect(onEnd).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('does not cancel a long utterance while the browser is still speaking', () => {
    vi.useFakeTimers()
    const onEnd = vi.fn()
    window.speechSynthesis.speaking = true
    window.speechSynthesis.pending = false
    const tts = useTextToSpeech({ onEnd })

    tts.speak('This is a long interview response that should keep playing until the browser reports the utterance has ended.')
    window.speechSynthesis.cancel.mockClear()

    vi.advanceTimersByTime(20000)

    expect(window.speechSynthesis.cancel).not.toHaveBeenCalled()
    expect(tts.isSpeaking.value).toBe(true)

    window.speechSynthesis.speaking = false
    spokenUtterances[0].onend()

    expect(tts.isSpeaking.value).toBe(false)
    expect(onEnd).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
