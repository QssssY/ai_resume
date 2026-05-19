import { computed, onUnmounted, ref } from 'vue'

const SENTENCE_END_REGEXP = /[。！？.!?]/
const FEEDBACK_BLOCK_REGEXP = /<FEEDBACK>[\s\S]*?<\/FEEDBACK>/gi

/**
 * 浏览器 TTS 语音合成封装。
 * 用于语音面试中按 SSE 分片逐句朗读 AI 回复，并过滤不适合播报的结构化反馈内容。
 */
export function useTextToSpeech(options = {}) {
  const isSupported = ref(typeof window !== 'undefined' && 'speechSynthesis' in window)
  const isSpeaking = ref(false)
  const isPaused = ref(false)
  const voices = ref([])
  const selectedVoice = ref(null)
  const rate = ref(Number(options.rate ?? 0.92))
  const pitch = ref(Number(options.pitch ?? 1.06))
  const volume = ref(Number(options.volume ?? 1))
  const voicePreference = ref(options.voicePreference || { type: 'natural_zh' })

  let buffer = ''
  let pendingCount = 0

  const speechSynthesisRef = computed(() => (
    typeof window !== 'undefined' ? window.speechSynthesis : null
  ))

  const normalizeTextForSpeech = (text) => {
    if (!text) return ''
    return text
      .replace(FEEDBACK_BLOCK_REGEXP, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[#*_>`|]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const isFemaleVoiceName = (name) => /xiaoxiao|xiaoyi|xiaobei|xiaoxuan|huihui|yaoyao|hanhan|tingting|meijia|female|woman|girl|zira|aria|jenny|susan|samantha|victoria/.test(name)

  const isMaleVoiceName = (name) => /yunxi|yunyang|yunjian|kangkang|male|man|boy|david|mark|george|daniel/.test(name)

  const getVoiceScore = (voice, preferredType = 'natural_zh') => {
    const lang = voice.lang?.toLowerCase() || ''
    const name = voice.name?.toLowerCase() || ''
    let score = 0

    // 语音面试优先选择浏览器中更接近自然人声的中文 voice。
    if (lang.startsWith('zh')) score += 20
    if (lang === 'zh-cn' || lang === 'zh-hans') score += 8
    if (/xiaoxiao|xiaoyi|xiaobei|yunxi|xiaoxuan|natural|neural|premium/.test(name)) score += 12
    if (/microsoft|google/.test(name)) score += 4
    if (voice.localService === false) score += 2
    if (preferredType === 'female' && isFemaleVoiceName(name)) score += 16
    if (preferredType === 'male' && isMaleVoiceName(name)) score += 16

    return score
  }

  const matchCustomVoice = (availableVoices, preference) => {
    if (!preference?.voiceURI && !preference?.name) return null
    return availableVoices.find((voice) => (
      (preference.voiceURI && voice.voiceURI === preference.voiceURI) ||
      (
        preference.name &&
        voice.name === preference.name &&
        (!preference.lang || voice.lang === preference.lang)
      )
    )) || null
  }

  const pickPreferredVoice = (availableVoices, preference = voicePreference.value) => {
    if (preference?.type === 'system') return null

    if (preference?.type === 'custom') {
      const customVoice = matchCustomVoice(availableVoices, preference)
      if (customVoice) return customVoice
    }

    return [...availableVoices]
      .sort((left, right) => getVoiceScore(right, preference?.type) - getVoiceScore(left, preference?.type))[0]
      || null
  }

  const refreshVoices = () => {
    if (!isSupported.value || !speechSynthesisRef.value) return
    voices.value = speechSynthesisRef.value.getVoices()
    selectedVoice.value = pickPreferredVoice(voices.value)
  }

  const markUtteranceEnd = () => {
    pendingCount = Math.max(0, pendingCount - 1)
    if (pendingCount === 0) {
      isSpeaking.value = false
      options.onEnd?.()
    }
  }

  const enqueue = (text) => {
    const normalizedText = normalizeTextForSpeech(text)
    if (!normalizedText || !isSupported.value || !speechSynthesisRef.value) return

    const utterance = new SpeechSynthesisUtterance(normalizedText)
    utterance.lang = selectedVoice.value?.lang || 'zh-CN'
    utterance.rate = rate.value
    utterance.pitch = pitch.value
    utterance.volume = volume.value
    if (selectedVoice.value) {
      utterance.voice = selectedVoice.value
    }
    utterance.onend = markUtteranceEnd
    utterance.onerror = markUtteranceEnd

    pendingCount += 1
    isSpeaking.value = true
    speechSynthesisRef.value.speak(utterance)
  }

  const speak = (text) => {
    stop()
    enqueue(text)
  }

  const speakStreaming = (chunk) => {
    if (!chunk) return

    // 流式分片边界可能落在英文单词之间，必须保留原始空格，等完整句子入队前再统一清理。
    buffer += String(chunk).replace(FEEDBACK_BLOCK_REGEXP, '')
    if (!buffer.trim()) return

    while (true) {
      const endIndex = Array.from(buffer).findIndex((char) => SENTENCE_END_REGEXP.test(char))
      if (endIndex === -1) break
      const sentence = buffer.slice(0, endIndex + 1).trim()
      buffer = buffer.slice(endIndex + 1)
      enqueue(sentence)
    }
  }

  const flushRemaining = () => {
    const remaining = buffer.trim()
    buffer = ''
    if (remaining) {
      enqueue(remaining)
    } else if (pendingCount === 0) {
      options.onEnd?.()
    }
  }

  const stop = () => {
    buffer = ''
    pendingCount = 0
    isSpeaking.value = false
    isPaused.value = false
    speechSynthesisRef.value?.cancel()
  }

  const pause = () => {
    if (!isSupported.value || !speechSynthesisRef.value) return
    speechSynthesisRef.value.pause()
    isPaused.value = true
  }

  const resume = () => {
    if (!isSupported.value || !speechSynthesisRef.value) return
    speechSynthesisRef.value.resume()
    isPaused.value = false
  }

  const setVoice = (voice) => {
    selectedVoice.value = voice
  }

  const setVoicePreference = (preference) => {
    voicePreference.value = preference || { type: 'natural_zh' }
    selectedVoice.value = pickPreferredVoice(voices.value)
  }

  refreshVoices()
  if (isSupported.value && speechSynthesisRef.value) {
    speechSynthesisRef.value.onvoiceschanged = refreshVoices
  }

  onUnmounted(() => {
    stop()
    // 浏览器 speechSynthesis 是全局单例，组件卸载后若仍持有 onvoiceschanged 回调，
    // 蓝牙耳机连接等事件会再次触发 refreshVoices 写入已被销毁的 ref，造成警告与潜在内存压力。
    if (speechSynthesisRef.value) {
      speechSynthesisRef.value.onvoiceschanged = null
    }
  })

  return {
    isSupported,
    isSpeaking,
    isPaused,
    voices,
    voice: selectedVoice,
    rate,
    pitch,
    volume,
    setVoice,
    setVoicePreference,
    speak,
    speakStreaming,
    flushRemaining,
    stop,
    pause,
    resume,
    normalizeTextForSpeech,
  }
}
