import { computed, onUnmounted, ref } from 'vue'

const SENTENCE_END_REGEXP = /[。！？.!?]/
const FEEDBACK_BLOCK_REGEXP = /<FEEDBACK>[\s\S]*?<\/FEEDBACK>/gi
const CHROME_KEEPALIVE_INTERVAL_MS = 10000
const STUCK_TIMEOUT_MS = 180000
const MIN_UTTERANCE_TIMEOUT_MS = 12000
const MAX_UTTERANCE_TIMEOUT_MS = 180000
const UTTERANCE_TIMEOUT_PER_CHAR_MS = 450

/**
 * 浏览器 TTS 语音合成封装。
 * 用于流式播报 AI 回复；keep-alive 定期 resume 防止 Chrome 15 秒自动暂停；
 * 全局卡死保护在 3 分钟无进展时强制 stop。
 */
export function useTextToSpeech(options = {}) {
  const isSupported = ref(typeof window !== 'undefined' && 'speechSynthesis' in window)
  const isSpeaking = ref(false)
  const isPaused = ref(false)
  const voices = ref([])
  const selectedVoice = ref(null)
  const engineStatus = computed(() => (isSupported.value ? 'system-tts' : 'unsupported'))
  const enhancedVoiceReady = ref(false)
  const rate = ref(Number(options.rate ?? 0.92))
  const pitch = ref(Number(options.pitch ?? 1.06))
  const volume = ref(Number(options.volume ?? 1))
  const voicePreference = ref(options.voicePreference || { type: 'natural_zh' })

  let buffer = ''
  let pendingCount = 0
  let speechRunId = 0
  let voiceReadyResolvers = []
  let endedUtterances = new WeakSet()
  let utteranceWatchdogs = new WeakMap()
  let utteranceWatchdogTimers = new Set()
  let keepAliveInterval = null
  let lastPendingChangeAt = 0

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

  const resolveVoiceReadyWaiters = () => {
    const resolvers = voiceReadyResolvers
    voiceReadyResolvers = []
    resolvers.forEach((resolve) => resolve())
  }

  const handleVoicesChanged = () => {
    refreshVoices()
    resolveVoiceReadyWaiters()
  }

  const waitForVoicesReady = () => {
    refreshVoices()
    if (!isSupported.value || !speechSynthesisRef.value || voices.value.length > 0) {
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(), 800)
      voiceReadyResolvers.push(() => {
        clearTimeout(timer)
        resolve()
      })
    })
  }

  const stopKeepAlive = () => {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval)
      keepAliveInterval = null
    }
  }

  // keep-alive：每 10 秒 resume 一次防止 Chrome 15 秒自动暂停；同时检测卡死。
  const startKeepAlive = () => {
    stopKeepAlive()
    lastPendingChangeAt = Date.now()
    keepAliveInterval = setInterval(() => {
      if (isSpeaking.value && speechSynthesisRef.value) {
        speechSynthesisRef.value.resume()
        // 全局卡死保护：3 分钟内没有任何 utterance 完成，强制停止
        if (Date.now() - lastPendingChangeAt > STUCK_TIMEOUT_MS) {
          stop()
        }
      } else {
        stopKeepAlive()
      }
    }, CHROME_KEEPALIVE_INTERVAL_MS)
  }

  // pendingCount 仅由 onend/onerror 扣减，WeakSet 防止同一 utterance 重复扣减。
  const markUtteranceEnd = (utterance) => {
    if (endedUtterances.has(utterance)) return
    endedUtterances.add(utterance)
    const watchdog = utteranceWatchdogs.get(utterance)
    if (watchdog) {
      clearTimeout(watchdog)
      utteranceWatchdogs.delete(utterance)
      utteranceWatchdogTimers.delete(watchdog)
    }
    pendingCount = Math.max(0, pendingCount - 1)
    lastPendingChangeAt = Date.now()
    if (pendingCount === 0) {
      stopKeepAlive()
      isSpeaking.value = false
      options.onEnd?.()
    }
  }

  const getUtteranceTimeout = (text) => Math.min(
    MAX_UTTERANCE_TIMEOUT_MS,
    Math.max(MIN_UTTERANCE_TIMEOUT_MS, text.length * UTTERANCE_TIMEOUT_PER_CHAR_MS)
  )

  const startUtteranceWatchdog = (utterance, text) => {
    const timer = setTimeout(() => {
      utteranceWatchdogTimers.delete(timer)
      if (endedUtterances.has(utterance)) return
      if (speechSynthesisRef.value?.speaking || speechSynthesisRef.value?.pending) {
        startUtteranceWatchdog(utterance, text)
        return
      }
      // 部分浏览器偶发不触发 onend/onerror，主动 cancel 并释放播报状态，避免面试卡住。
      speechSynthesisRef.value?.cancel()
      pendingCount = 1
      markUtteranceEnd(utterance)
    }, getUtteranceTimeout(text))
    utteranceWatchdogs.set(utterance, timer)
    utteranceWatchdogTimers.add(timer)
  }

  const enqueueNow = (text) => {
    const normalizedText = normalizeTextForSpeech(text)
    if (!normalizedText || !isSupported.value || !speechSynthesisRef.value) return

    refreshVoices()
    const utterance = new SpeechSynthesisUtterance(normalizedText)
    utterance.lang = selectedVoice.value?.lang || 'zh-CN'
    utterance.rate = rate.value
    utterance.pitch = pitch.value
    utterance.volume = volume.value
    if (selectedVoice.value) utterance.voice = selectedVoice.value
    utterance.onend = () => markUtteranceEnd(utterance)
    utterance.onerror = () => markUtteranceEnd(utterance)

    pendingCount += 1
    lastPendingChangeAt = Date.now()
    isSpeaking.value = true
    // Chrome 在持续合成约 15 秒后会自动暂停，keep-alive 定期 resume 防止此问题
    if (pendingCount === 1) startKeepAlive()
    speechSynthesisRef.value.resume?.()
    speechSynthesisRef.value.speak(utterance)
    startUtteranceWatchdog(utterance, normalizedText)
  }

  const enqueue = (text, runId = speechRunId) => {
    const normalizedText = normalizeTextForSpeech(text)
    if (!normalizedText || !isSupported.value || !speechSynthesisRef.value) return
    refreshVoices()
    if (voices.value.length > 0) {
      enqueueNow(normalizedText)
      return
    }
    isSpeaking.value = true
    void waitForVoicesReady().then(() => {
      if (runId !== speechRunId) return
      enqueueNow(normalizedText)
    })
  }

  const speak = (text) => {
    stop()
    enqueue(text, speechRunId)
  }

  const speakStreaming = (chunk) => {
    if (!chunk) return
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
    speechRunId += 1
    buffer = ''
    pendingCount = 0
    stopKeepAlive()
    utteranceWatchdogTimers.forEach((timer) => clearTimeout(timer))
    utteranceWatchdogTimers = new Set()
    utteranceWatchdogs = new WeakMap()
    endedUtterances = new WeakSet()
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
    speechSynthesisRef.value.onvoiceschanged = handleVoicesChanged
  }

  onUnmounted(() => {
    stop()
    if (speechSynthesisRef.value) {
      speechSynthesisRef.value.onvoiceschanged = null
    }
  })

  return {
    isSupported,
    isSpeaking,
    isPaused,
    engineStatus,
    enhancedVoiceReady,
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
