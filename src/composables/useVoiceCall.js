import { computed, nextTick, onUnmounted, ref, watch } from 'vue'

const DEFAULT_SILENCE_TIMEOUT_MS = 3000
const CHECK_INTERVAL_MS = 500
const MUTE_RESUME_MODE_AUTO = 'auto'
const TTS_RESUME_DELAY_MS = 800
const RECOVERABLE_SPEECH_RESTART_DELAY_MS = 600
const MAX_RECOVERABLE_SPEECH_RESTARTS = 2
const UNSUPPORTED_SPEECH_ERROR_MESSAGE = '当前浏览器不支持语音识别，已降级为手动输入'
const UNSUPPORTED_TTS_ERROR_MESSAGE = '当前浏览器不支持语音播报，已降级为手动输入'
const RECOVERABLE_SPEECH_ERROR_CODES = new Set([
  'network',
  'no-speech',
  'no-transcript',
  'end-without-result',
])

/**
 * 语音通话模式编排。
 * STT 可恢复中断会优先自动重启，不可恢复错误才退出语音模式；AI 播报期间暂停收音，播报结束后按当前规则恢复。
 */
export function useVoiceCall(options) {
  const isVoiceMode = ref(false)
  const isMuted = ref(false)
  const isListening = computed(() => Boolean(options.speech.isRecording.value))
  const isAiSpeaking = computed(() => Boolean(options.textToSpeech.isSpeaking.value || options.isReplying?.value))
  const callDuration = ref(0)
  const pendingMessage = ref('')
  const error = ref('')
  const isManualResumePending = ref(false)

  let durationTimer = null
  let silenceTimer = null
  let lastSpeechAt = 0
  let lastFinal = ''
  let lastInterim = ''
  let pendingFinalText = ''
  let pendingInterimText = ''
  let isInitialListeningDeferred = false
  let isAutoSending = false
  // ttsWasActive: TTS 播报期间同步设置，确保 resumeListening 在播报结束后始终走延迟路径，
  // 避免 isSpeaking / isReplying 两个 watcher 竞态导致延迟失效。
  let ttsWasActive = false
  let ttsResumeTimer = null
  let recoverableSpeechRestartTimer = null
  let recoverableSpeechRestartCount = 0

  const silenceTimeoutMs = Number(options.silenceTimeoutMs ?? DEFAULT_SILENCE_TIMEOUT_MS)
  const muteResumeMode = options.muteResumeMode || MUTE_RESUME_MODE_AUTO

  const clearRecoverableSpeechRestartTimer = () => {
    if (recoverableSpeechRestartTimer) {
      clearTimeout(recoverableSpeechRestartTimer)
      recoverableSpeechRestartTimer = null
    }
  }

  const clearTimers = () => {
    if (durationTimer) {
      clearInterval(durationTimer)
      durationTimer = null
    }
    if (silenceTimer) {
      clearInterval(silenceTimer)
      silenceTimer = null
    }
    if (ttsResumeTimer) {
      clearTimeout(ttsResumeTimer)
      ttsResumeTimer = null
    }
    clearRecoverableSpeechRestartTimer()
  }

  const resetSpeechState = () => {
    pendingFinalText = ''
    pendingInterimText = ''
    pendingMessage.value = ''
    isManualResumePending.value = false
    isInitialListeningDeferred = false
    lastSpeechAt = 0
    lastFinal = options.speech.finalTranscript.value || ''
    lastInterim = options.speech.interimTranscript.value || ''
    ttsWasActive = false
    isAutoSending = false
    recoverableSpeechRestartCount = 0
    clearRecoverableSpeechRestartTimer()
  }

  const pauseListeningForAi = () => {
    clearRecoverableSpeechRestartTimer()
    if (options.speech.isRecording.value) {
      void options.speech.stop?.()
    }
  }

  const flushListeningBeforeSend = () => {
    if (!options.speech.isRecording.value) return null
    const stopResult = options.speech.stop?.()
    if (!stopResult || typeof stopResult.then !== 'function') return null
    return stopResult.then(() => nextTick())
  }

  const resumeListening = (resumeOptions = {}) => {
    if (!isVoiceMode.value || isMuted.value || options.isReplying?.value || options.textToSpeech.isSpeaking.value) {
      return
    }
    // TTS 刚结束时必须延迟恢复收音，避免麦克风拾取扬声器的尾音 / 回声。
    // ttsWasActive 在 TTS 开始时同步设置（isSpeaking watcher speaking=true 分支），
    // 无论哪个 watcher 先触发 resumeListening，延迟保护始终生效。
    if (ttsWasActive) {
      if (!ttsResumeTimer) {
        ttsResumeTimer = setTimeout(() => {
          ttsResumeTimer = null
          ttsWasActive = false
          resumeListening()
        }, TTS_RESUME_DELAY_MS)
      }
      return
    }
    isInitialListeningDeferred = false
    if (!resumeOptions.preserveTranscript) {
      // 清理 TTS 播报期间可能残留的误识别文本，防止复读；STT 自动恢复时会保留候选文本，避免用户刚说出的内容丢失。
      pendingFinalText = ''
      pendingInterimText = ''
      pendingMessage.value = ''
      lastSpeechAt = 0
      lastFinal = options.speech.finalTranscript.value || ''
      lastInterim = options.speech.interimTranscript.value || ''
    }
    if (!options.speech.isSupported.value) {
      error.value = UNSUPPORTED_SPEECH_ERROR_MESSAGE
      return
    }
    if (!options.speech.isRecording.value) {
      options.speech.start?.()
    }
  }

  const scheduleRecoverableSpeechRestart = () => {
    clearRecoverableSpeechRestartTimer()
    isInitialListeningDeferred = false
    lastSpeechAt = Date.now()
    if (recoverableSpeechRestartCount >= MAX_RECOVERABLE_SPEECH_RESTARTS) {
      // 连续恢复失败后才交给用户手动继续，避免 Web Speech 短暂无结果时直接中断语音面试。
      isManualResumePending.value = true
      return
    }
    recoverableSpeechRestartCount += 1
    isManualResumePending.value = false
    recoverableSpeechRestartTimer = setTimeout(() => {
      recoverableSpeechRestartTimer = null
      if (!isVoiceMode.value || isMuted.value || options.isReplying?.value || options.textToSpeech.isSpeaking.value) {
        return
      }
      error.value = ''
      resumeListening({ preserveTranscript: true })
    }, RECOVERABLE_SPEECH_RESTART_DELAY_MS)
  }

  const autoSendTranscript = async () => {
    if (isAutoSending) return false
    if (options.isReplying?.value) return false
    isAutoSending = true
    try {
      clearRecoverableSpeechRestartTimer()
      if (pendingMessage.value.trim() || lastSpeechAt) {
        const flushPromise = flushListeningBeforeSend()
        if (flushPromise) {
          await flushPromise
        }
      }
      const text = pendingMessage.value.trim()
      if (!text || options.isReplying?.value) return false

      pendingFinalText = ''
      pendingInterimText = ''
      pendingMessage.value = ''
      await options.onSend(text)
      return true
    } finally {
      isAutoSending = false
    }
  }

  const stopListeningAndSend = async () => {
    if (!isVoiceMode.value || options.isReplying?.value || options.textToSpeech.isSpeaking.value) {
      return false
    }
    return autoSendTranscript()
  }

  const checkSilence = () => {
    if (!isVoiceMode.value || options.isReplying?.value || options.textToSpeech.isSpeaking.value) return
    if (
      !options.speech.isRecording.value &&
      !isMuted.value &&
      !isManualResumePending.value &&
      !isInitialListeningDeferred &&
      !recoverableSpeechRestartTimer
    ) {
      resumeListening({ preserveTranscript: Boolean(pendingMessage.value.trim()) })
    }
    if (options.speech.isVoiceActive?.value) {
      lastSpeechAt = Date.now()
      return
    }
    if (!silenceTimeoutMs || !lastSpeechAt) return
    if (!pendingMessage.value.trim()) return
    if (Date.now() - lastSpeechAt >= silenceTimeoutMs) {
      autoSendTranscript()
    }
  }

  const startVoiceCall = (startOptions = {}) => {
    error.value = ''
    if (!options.speech.isSupported.value) {
      error.value = UNSUPPORTED_SPEECH_ERROR_MESSAGE
      return false
    }
    if (!options.textToSpeech.isSupported.value) {
      error.value = UNSUPPORTED_TTS_ERROR_MESSAGE
      return false
    }

    isVoiceMode.value = true
    isMuted.value = false
    callDuration.value = 0
    resetSpeechState()
    isInitialListeningDeferred = startOptions.startListening === false
    clearTimers()
    durationTimer = setInterval(() => {
      callDuration.value += 1
    }, 1000)
    silenceTimer = setInterval(checkSilence, CHECK_INTERVAL_MS)
    // 首轮需要先播报开场白时，允许页面进入通话态但暂不开麦，避免 STT 启动后立刻被 TTS 取消。
    if (!isInitialListeningDeferred) {
      resumeListening()
    }
    return true
  }

  const endVoiceCall = () => {
    isVoiceMode.value = false
    isMuted.value = false
    clearTimers()
    resetSpeechState()
    options.speech.cancel?.()
    options.textToSpeech.stop()
  }

  const toggleMute = () => {
    if (!isVoiceMode.value) return false
    if (!isMuted.value && isManualResumePending.value) {
      isManualResumePending.value = false
      recoverableSpeechRestartCount = 0
      resumeListening({ preserveTranscript: true })
      return false
    }
    isMuted.value = !isMuted.value
    if (isMuted.value) {
      clearRecoverableSpeechRestartTimer()
      void options.speech.stop?.()
      return true
    }
    if (muteResumeMode === MUTE_RESUME_MODE_AUTO) {
      resumeListening()
    } else {
      isManualResumePending.value = true
    }
    return false
  }

  watch(
    [options.speech.finalTranscript, options.speech.interimTranscript],
    ([nextFinal, nextInterim]) => {
      if (!isVoiceMode.value || options.isReplying?.value || options.textToSpeech.isSpeaking.value) return
      const normalizedFinal = nextFinal || ''
      const normalizedInterim = nextInterim || ''
      const finalChanged = normalizedFinal !== lastFinal
      const interimChanged = normalizedInterim !== lastInterim
      if (!finalChanged && !interimChanged) return

      lastSpeechAt = Date.now()
      if (finalChanged) {
        const appendedText = normalizedFinal.startsWith(lastFinal)
          ? normalizedFinal.slice(lastFinal.length)
          : normalizedFinal
        if (appendedText.trim()) {
          pendingFinalText = `${pendingFinalText}${appendedText}`
        }
      }
      // 浏览器识别会持续返回 interim；自动静音提交临时展示/发送 interim，final 到达后再由最终文本接管。
      pendingInterimText = normalizedInterim
      pendingMessage.value = `${pendingFinalText}${pendingInterimText}`
      lastFinal = normalizedFinal
      lastInterim = normalizedInterim
      recoverableSpeechRestartCount = 0
      clearRecoverableSpeechRestartTimer()
      isManualResumePending.value = false
      error.value = ''
    }
  )

  watch(options.speech.voiceActivityAt || ref(0), (nextActivityAt) => {
    if (!isVoiceMode.value || isMuted.value || options.isReplying?.value || options.textToSpeech.isSpeaking.value) return
    if (nextActivityAt) {
      lastSpeechAt = nextActivityAt
    }
  })

  watch(options.textToSpeech.isSpeaking, (speaking) => {
    if (!isVoiceMode.value) return
    if (speaking) {
      // TTS 开始播报时同步设置 flag，确保后续所有 resumeListening 路径都走延迟
      ttsWasActive = true
      pauseListeningForAi()
      return
    }
    resumeListening()
  })

  watch(
    () => options.isReplying?.value,
    (replying) => {
      if (!isVoiceMode.value) return
      if (replying) {
        pauseListeningForAi()
        return
      }
      resumeListening()
    }
  )

  watch(options.speech.error, (nextError) => {
    if (!nextError || !isVoiceMode.value) return
    error.value = nextError
    const speechErrorCode = options.speech.errorCode?.value || ''
    if (RECOVERABLE_SPEECH_ERROR_CODES.has(speechErrorCode)) {
      // 浏览器 Web Speech 偶发无结果/短暂中断时先自动重启识别；连续失败再暴露手动继续收音。
      scheduleRecoverableSpeechRestart()
      return
    }
    endVoiceCall()
  })

  onUnmounted(() => {
    endVoiceCall()
  })

  return {
    isVoiceMode,
    isMuted,
    isListening,
    isAiSpeaking,
    callDuration,
    pendingMessage,
    error,
    isManualResumePending,
    startVoiceCall,
    endVoiceCall,
    toggleMute,
    resumeListening,
    autoSendTranscript,
    stopListeningAndSend,
  }
}
