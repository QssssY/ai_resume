import { onUnmounted, ref } from 'vue'

const VOICE_ACTIVITY_THRESHOLD = 0.018
const VOICE_ACTIVITY_INTERVAL_MS = 120
const NO_TRANSCRIPT_TIMEOUT_MS = 6000
const UNSUPPORTED_RECOGNITION_ERROR_MESSAGE = '当前浏览器不支持语音识别，已降级为手动输入'
const NETWORK_RECOGNITION_ERROR_MESSAGE = '当前浏览器语音识别服务不可用，已降级为手动输入'
const MICROPHONE_PERMISSION_ERROR_MESSAGE = '麦克风权限被拒绝，已降级为手动输入'
const AUDIO_CAPTURE_ERROR_MESSAGE = '未检测到可用麦克风，已降级为手动输入'
const START_RECOGNITION_ERROR_MESSAGE = '启动语音识别失败，已降级为手动输入'
const NO_SPEECH_ERROR_MESSAGE = '未识别到有效语音内容，已降级为手动输入。错误码：no-speech'
const NO_TRANSCRIPT_ERROR_MESSAGE = '检测到麦克风输入，但浏览器未返回识别文字，已降级为手动输入。错误码：no-transcript'
const RECOGNITION_ENDED_WITHOUT_RESULT_MESSAGE = '语音识别已结束但未返回文字，已降级为手动输入。错误码：end-without-result'

export function useSpeechToText() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const hasBrowserRecognition = () => Boolean(SpeechRecognition)

  const isSupported = ref(hasBrowserRecognition())
  const isRecording = ref(false)
  const isVoiceActive = ref(false)
  const voiceActivityAt = ref(0)
  const finalTranscript = ref('')
  const interimTranscript = ref('')
  const error = ref('')
  const errorCode = ref('')
  const engineStatus = ref(isSupported.value ? 'browser-service' : 'unsupported')
  const supportsLocalProcessing = ref(false)
  const language = ref('zh-CN')

  let recognition = null
  let ignoreResults = false
  let isStarting = false
  let mediaStream = null
  let audioContext = null
  let analyser = null
  let voiceActivityTimer = null
  let voiceActivityStartedAt = 0
  let hasTranscriptResult = false
  let startRunId = 0
  let preferLocalProcessing = true

  const clearState = () => {
    finalTranscript.value = ''
    interimTranscript.value = ''
    error.value = ''
    errorCode.value = ''
    if (isSupported.value && engineStatus.value === 'unavailable') {
      engineStatus.value = supportsLocalProcessing.value ? 'system-local' : 'browser-service'
    }
  }

  const setErrorState = (message, code) => {
    error.value = message
    errorCode.value = code
    engineStatus.value = code === 'unsupported' ? 'unsupported' : 'unavailable'
  }

  const cleanupRecognition = () => {
    if (!recognition) return
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    recognition = null
  }

  const cleanupVoiceActivity = () => {
    if (voiceActivityTimer) {
      clearInterval(voiceActivityTimer)
      voiceActivityTimer = null
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop())
      mediaStream = null
    }
    if (audioContext) {
      audioContext.close?.()
      audioContext = null
    }
    analyser = null
    isVoiceActive.value = false
    voiceActivityStartedAt = 0
  }

  const releaseVoiceActivityResources = (stream, context, source) => {
    source?.disconnect?.()
    stream?.getTracks?.().forEach((track) => track.stop())
    context?.close?.()
  }

  const stopWithError = (message, code = 'recognition-error') => {
    setErrorState(message, code)
    isStarting = false
    isRecording.value = false
    try {
      recognition?.abort?.()
    } catch (abortError) {
      console.warn('停止浏览器语音识别失败', abortError)
    }
    cleanupRecognition()
    cleanupVoiceActivity()
  }

  const canUseLocalProcessing = async () => {
    if (!preferLocalProcessing || typeof SpeechRecognition?.available !== 'function') {
      return false
    }
    try {
      const availability = await SpeechRecognition.available({
        langs: [language.value],
        processLocally: true,
      })
      return availability === 'available'
    } catch (availabilityError) {
      console.warn('检测浏览器本地语音识别能力失败', availabilityError)
      return false
    }
  }

  const startVoiceActivityMonitor = async (shouldKeepMonitor = () => true) => {
    if (!navigator.mediaDevices?.getUserMedia || voiceActivityTimer) return

    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextConstructor) return

    let nextMediaStream = null
    let nextAudioContext = null
    let nextAnalyser = null
    let nextAudioSource = null

    try {
      nextAudioContext = new AudioContextConstructor()
      nextMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      nextAnalyser = nextAudioContext.createAnalyser()
      nextAnalyser.fftSize = 1024
      nextAudioSource = nextAudioContext.createMediaStreamSource(nextMediaStream)
      nextAudioSource.connect(nextAnalyser)
    } catch (audioContextError) {
      releaseVoiceActivityResources(nextMediaStream, nextAudioContext, nextAudioSource)
      throw audioContextError
    }

    if (!shouldKeepMonitor() || voiceActivityTimer) {
      releaseVoiceActivityResources(nextMediaStream, nextAudioContext, nextAudioSource)
      return
    }

    mediaStream = nextMediaStream
    audioContext = nextAudioContext
    analyser = nextAnalyser

    const samples = new Uint8Array(nextAnalyser.fftSize)
    voiceActivityTimer = setInterval(() => {
      nextAnalyser.getByteTimeDomainData(samples)
      const rms = Math.sqrt(
        samples.reduce((sum, sample) => {
          const normalized = (sample - 128) / 128
          return sum + normalized * normalized
        }, 0) / samples.length
      )
      const active = rms >= VOICE_ACTIVITY_THRESHOLD
      isVoiceActive.value = active
      if (!active) return

      voiceActivityAt.value = Date.now()
      if (!hasTranscriptResult) {
        voiceActivityStartedAt ||= voiceActivityAt.value
        if (voiceActivityAt.value - voiceActivityStartedAt >= NO_TRANSCRIPT_TIMEOUT_MS) {
          stopWithError(NO_TRANSCRIPT_ERROR_MESSAGE, 'no-transcript')
        }
      }
    }, VOICE_ACTIVITY_INTERVAL_MS)
  }

  const startOptionalVoiceActivityMonitor = (currentStartRunId) => {
    void startVoiceActivityMonitor(() => (
      currentStartRunId === startRunId && !ignoreResults && isRecording.value && Boolean(recognition)
    )).catch((monitorError) => {
      // 浏览器 Web Speech 自己负责授权和识别；音量监测失败只影响无文字保护，不阻断主识别链路。
      console.warn('浏览器语音活动监测启动失败', monitorError)
      cleanupVoiceActivity()
    })
  }

  const start = async () => {
    if (!SpeechRecognition) {
      isSupported.value = false
      setErrorState(UNSUPPORTED_RECOGNITION_ERROR_MESSAGE, 'unsupported')
      return
    }
    if (isRecording.value || isStarting) return

    clearState()
    ignoreResults = false
    isStarting = true
    startRunId += 1
    const currentStartRunId = startRunId
    hasTranscriptResult = false
    voiceActivityStartedAt = 0

    const shouldUseLocalProcessing = await canUseLocalProcessing()
    if (currentStartRunId !== startRunId || !isStarting || ignoreResults) {
      cleanupVoiceActivity()
      isStarting = false
      return
    }

    recognition = new SpeechRecognition()
    let localProcessingEnabled = false
    if (shouldUseLocalProcessing) {
      try {
        recognition.processLocally = true
        localProcessingEnabled = recognition.processLocally === true
      } catch (localProcessingError) {
        console.warn('启用浏览器本地语音识别失败，改用浏览器默认识别', localProcessingError)
        localProcessingEnabled = false
      }
    }
    supportsLocalProcessing.value = localProcessingEnabled
    engineStatus.value = localProcessingEnabled ? 'system-local' : 'browser-service'
    recognition.lang = language.value
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      if (ignoreResults) return
      hasTranscriptResult = true
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result.isFinal) final += result[0].transcript
        else interim += result[0].transcript
      }
      if (final) finalTranscript.value += final
      interimTranscript.value = interim
    }

    recognition.onerror = (event) => {
      if (ignoreResults) return
      if (event.error === 'aborted') {
        isRecording.value = false
        cleanupRecognition()
        cleanupVoiceActivity()
        return
      }
      if (event.error === 'language-not-supported' && localProcessingEnabled) {
        preferLocalProcessing = false
        supportsLocalProcessing.value = false
        engineStatus.value = 'browser-service'
        error.value = ''
        errorCode.value = ''
        isRecording.value = false
        const failedRecognition = recognition
        cleanupRecognition()
        try {
          failedRecognition?.abort?.()
        } catch (abortError) {
          console.warn('切换浏览器语音识别模式时停止旧实例失败', abortError)
        }
        cleanupVoiceActivity()
        void start()
        return
      }
      if (event.error === 'network') {
        setErrorState(NETWORK_RECOGNITION_ERROR_MESSAGE, 'network')
      } else if (event.error === 'no-speech') {
        setErrorState(NO_SPEECH_ERROR_MESSAGE, 'no-speech')
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setErrorState(MICROPHONE_PERMISSION_ERROR_MESSAGE, 'not-allowed')
      } else if (event.error === 'audio-capture') {
        setErrorState(AUDIO_CAPTURE_ERROR_MESSAGE, 'audio-capture')
      } else {
        setErrorState(`语音识别不可用，已降级为手动输入: ${event.error}`, event.error || 'recognition-error')
      }
      isRecording.value = false
      cleanupRecognition()
      cleanupVoiceActivity()
    }

    recognition.onend = () => {
      if (!ignoreResults && !hasTranscriptResult && isRecording.value) {
        stopWithError(RECOGNITION_ENDED_WITHOUT_RESULT_MESSAGE, 'end-without-result')
        return
      }
      isRecording.value = false
      cleanupRecognition()
      cleanupVoiceActivity()
    }

    try {
      recognition.start()
      isRecording.value = true
      startOptionalVoiceActivityMonitor(currentStartRunId)
    } catch (startError) {
      console.warn('启动浏览器语音识别失败', startError)
      setErrorState(START_RECOGNITION_ERROR_MESSAGE, 'start-failed')
      cleanupRecognition()
      cleanupVoiceActivity()
    }
    isStarting = false
  }

  const stop = () => {
    if (isStarting) {
      startRunId += 1
      isStarting = false
      cleanupRecognition()
    }
    if (recognition && isRecording.value) {
      try {
        recognition.stop()
      } finally {
        isRecording.value = false
        cleanupRecognition()
      }
    }
    isRecording.value = false
    cleanupVoiceActivity()
  }

  const cancel = () => {
    startRunId += 1
    ignoreResults = true
    isStarting = false
    isRecording.value = false
    clearState()
    cleanupVoiceActivity()
    if (!recognition) return
    try {
      recognition.abort()
    } catch (abortError) {
      console.warn('取消浏览器语音识别失败', abortError)
    }
    cleanupRecognition()
  }

  const toggle = () => {
    isRecording.value ? stop() : start()
  }

  onUnmounted(() => {
    cancel()
  })

  return {
    isSupported,
    isRecording,
    isVoiceActive,
    voiceActivityAt,
    finalTranscript,
    interimTranscript,
    error,
    errorCode,
    engineStatus,
    supportsLocalProcessing,
    language,
    start,
    stop,
    cancel,
    toggle,
  }
}
