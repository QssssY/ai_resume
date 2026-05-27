import { computed, onUnmounted, ref } from 'vue'
import {
  clearModelCache,
  downloadModelFromManifest,
  getOfflineVoiceModelStatus
} from '@/utils/offlineVoiceModelCache'

const VOICE_ACTIVITY_THRESHOLD = 0.018
const VOICE_ACTIVITY_INTERVAL_MS = 120
const NO_TRANSCRIPT_TIMEOUT_MS = 6000
const OFFLINE_STOP_FLUSH_TIMEOUT_MS = 1200
const OFFLINE_STT_MODEL_KEY = 'stt:sherpa_onnx:zh_cn'
const OFFLINE_STT_MANIFEST_URL = '/voice-models/sherpa-onnx/zh-cn-streaming/manifest.json'
const OFFLINE_MODEL_MISSING_MESSAGE = '离线语音识别模型未安装，请先到设置中心下载离线语音识别引擎。'
const UNSUPPORTED_RECOGNITION_ERROR_MESSAGE = '当前浏览器不支持语音识别，已降级为手动输入'
const NETWORK_RECOGNITION_ERROR_MESSAGE = '当前浏览器语音识别服务不可用，已降级为手动输入；建议下载离线语音识别引擎'
const MICROPHONE_PERMISSION_ERROR_MESSAGE = '麦克风权限被拒绝，已降级为手动输入'
const AUDIO_CAPTURE_ERROR_MESSAGE = '未检测到可用麦克风，已降级为手动输入'
const START_RECOGNITION_ERROR_MESSAGE = '启动语音识别失败，已降级为手动输入'
const NO_SPEECH_ERROR_MESSAGE = '未识别到有效语音内容，已降级为手动输入。错误码：no-speech'
const NO_TRANSCRIPT_ERROR_MESSAGE = '检测到麦克风输入，但浏览器未返回识别文字，已降级为手动输入。错误码：no-transcript'
const RECOGNITION_ENDED_WITHOUT_RESULT_MESSAGE = '语音识别已结束但未返回文字，已降级为手动输入。错误码：end-without-result'

const createDefaultModelStatus = () => getOfflineVoiceModelStatus(OFFLINE_STT_MODEL_KEY)

export function useSpeechToText(options = {}) {
  const preferOffline = options.preferOffline !== false
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const initialModelStatus = createDefaultModelStatus()
  const hasBrowserRecognition = () => Boolean(SpeechRecognition)
  const resolvePreferredEngineStatus = (status) => {
    if (status.status === 'ready') return 'offline-ready'
    return hasBrowserRecognition() ? 'browser-service' : 'offline-missing'
  }

  const isSupported = ref(preferOffline
    ? initialModelStatus.status === 'ready' || hasBrowserRecognition()
    : hasBrowserRecognition())
  const isRecording = ref(false)
  const isVoiceActive = ref(false)
  const voiceActivityAt = ref(0)
  const finalTranscript = ref('')
  const interimTranscript = ref('')
  const error = ref('')
  const errorCode = ref('')
  const engineStatus = ref(preferOffline
    ? resolvePreferredEngineStatus(initialModelStatus)
    : (isSupported.value ? 'browser-service' : 'unsupported'))
  const supportsLocalProcessing = ref(false)
  const offlineEngineSuggested = ref(false)
  const downloadProgress = ref(0)
  const modelStatus = ref(initialModelStatus)
  const language = ref('zh-CN')
  const isModelReady = computed(() => modelStatus.value.status === 'ready')

  let recognition = null
  let offlineWorker = null
  let ignoreResults = false
  let isStarting = false
  let mediaStream = null
  let audioContext = null
  let analyser = null
  let voiceActivityTimer = null
  let audioProcessor = null
  let audioSource = null
  let voiceActivityStartedAt = 0
  let hasTranscriptResult = false
  let startRunId = 0
  let preferLocalProcessing = true
  let offlineStopFlushTimer = null
  let offlineStopFlushResolve = null

  const resolveOfflineStopFlush = () => {
    if (offlineStopFlushTimer) {
      clearTimeout(offlineStopFlushTimer)
      offlineStopFlushTimer = null
    }
    const resolve = offlineStopFlushResolve
    offlineStopFlushResolve = null
    resolve?.()
  }

  const finishOfflineStopFlush = () => {
    isRecording.value = false
    cleanupOfflineWorker()
    cleanupVoiceActivity()
    resolveOfflineStopFlush()
  }

  const refreshModelStatus = () => {
    modelStatus.value = getOfflineVoiceModelStatus(OFFLINE_STT_MODEL_KEY)
    downloadProgress.value = modelStatus.value.progress
    if (preferOffline) {
      // 离线模型只是增强路径：已缓存时优先使用；未缓存但浏览器识别可用时继续尝试 Web Speech。
      isSupported.value = isModelReady.value || hasBrowserRecognition()
      engineStatus.value = resolvePreferredEngineStatus(modelStatus.value)
    }
  }

  const clearState = () => {
    finalTranscript.value = ''
    interimTranscript.value = ''
    error.value = ''
    errorCode.value = ''
    offlineEngineSuggested.value = false
    if (preferOffline) {
      refreshModelStatus()
      return
    }
    if (isSupported.value && engineStatus.value === 'unavailable') {
      engineStatus.value = supportsLocalProcessing.value ? 'system-local' : 'browser-service'
    }
  }

  const setErrorState = (message, code, shouldSuggestOffline = false) => {
    error.value = message
    errorCode.value = code
    offlineEngineSuggested.value = shouldSuggestOffline
    engineStatus.value = code === 'offline-missing'
      ? 'offline-missing'
      : code === 'unsupported'
        ? 'unsupported'
        : 'unavailable'
  }

  const cleanupRecognition = () => {
    if (!recognition) return
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    recognition = null
  }

  const cleanupOfflineWorker = () => {
    if (!offlineWorker) return
    offlineWorker.onmessage = null
    offlineWorker.onerror = null
    offlineWorker.terminate?.()
    offlineWorker = null
  }

  const cleanupVoiceActivity = () => {
    if (voiceActivityTimer) {
      clearInterval(voiceActivityTimer)
      voiceActivityTimer = null
    }
    if (audioProcessor) {
      audioProcessor.onaudioprocess = null
      audioProcessor.disconnect?.()
      audioProcessor = null
    }
    if (audioSource) {
      audioSource.disconnect?.()
      audioSource = null
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

  const releaseLocalVoiceActivityResources = (stream, context, source) => {
    source?.disconnect?.()
    stream?.getTracks?.().forEach((track) => track.stop())
    context?.close?.()
  }

  const stopWithError = (message, code = 'recognition-error') => {
    setErrorState(message, code, true)
    isRecording.value = false
    try {
      recognition?.abort?.()
      offlineWorker?.postMessage?.({ type: 'stop' })
    } catch {}
    cleanupRecognition()
    cleanupOfflineWorker()
    cleanupVoiceActivity()
    resolveOfflineStopFlush()
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
      if (availability === 'available') return true
      if (availability === 'downloadable' || availability === 'downloading') {
        offlineEngineSuggested.value = true
      }
      return false
    } catch {
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

    // 这里的 getUserMedia 用于离线识别和音量监测；浏览器 Web Speech 会在 start() 内部自行申请麦克风。
    try {
      nextMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      nextAudioContext = new AudioContextConstructor()
      nextAnalyser = nextAudioContext.createAnalyser()
      nextAnalyser.fftSize = 1024
      nextAudioSource = nextAudioContext.createMediaStreamSource(nextMediaStream)
      nextAudioSource.connect(nextAnalyser)
    } catch (audioContextError) {
      releaseLocalVoiceActivityResources(nextMediaStream, nextAudioContext, nextAudioSource)
      throw audioContextError
    }

    if (!shouldKeepMonitor() || voiceActivityTimer) {
      releaseLocalVoiceActivityResources(nextMediaStream, nextAudioContext, nextAudioSource)
      return
    }

    mediaStream = nextMediaStream
    audioContext = nextAudioContext
    analyser = nextAnalyser
    audioSource = nextAudioSource

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
      if (active) {
        voiceActivityAt.value = Date.now()
        if (!hasTranscriptResult) {
          voiceActivityStartedAt ||= voiceActivityAt.value
          if (voiceActivityAt.value - voiceActivityStartedAt >= NO_TRANSCRIPT_TIMEOUT_MS) {
            stopWithError(NO_TRANSCRIPT_ERROR_MESSAGE, 'no-transcript')
          }
        }
      }
    }, VOICE_ACTIVITY_INTERVAL_MS)
  }

  const startOptionalBrowserVoiceActivityMonitor = (currentStartRunId) => {
    void startVoiceActivityMonitor(() => (
      currentStartRunId === startRunId && !ignoreResults && isRecording.value && Boolean(recognition)
    )).catch(() => {
      // 浏览器原生识别已由 recognition.start() 启动；音量监测失败不能阻断 Web Speech 自身的授权与识别。
      cleanupVoiceActivity()
    })
  }

  const connectOfflineAudioStream = () => {
    if (!audioContext?.createScriptProcessor || !audioSource || !offlineWorker) return
    audioProcessor = audioContext.createScriptProcessor(4096, 1, 1)
    audioProcessor.onaudioprocess = (event) => {
      if (!isRecording.value || ignoreResults) return
      const input = event.inputBuffer.getChannelData(0)
      const chunk = new Float32Array(input)
      offlineWorker.postMessage({
        type: 'audio',
        sampleRate: audioContext.sampleRate,
        samples: chunk
      }, [chunk.buffer])
    }
    audioSource.connect(audioProcessor)
    audioProcessor.connect(audioContext.destination)
  }

  const buildOfflineWorkerConfig = () => ({
    modelKey: OFFLINE_STT_MODEL_KEY,
    language: language.value,
    manifestUrl: modelStatus.value.manifestUrl || OFFLINE_STT_MANIFEST_URL,
    files: modelStatus.value.files
  })

  const startOfflineRecognition = async () => {
    refreshModelStatus()
    if (!isModelReady.value) {
      setErrorState(OFFLINE_MODEL_MISSING_MESSAGE, 'offline-missing', true)
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
    engineStatus.value = 'offline-loading'

    try {
      await startVoiceActivityMonitor()
    } catch {
      if (currentStartRunId !== startRunId || !isStarting || ignoreResults) {
        cleanupVoiceActivity()
        isStarting = false
        return
      }
      setErrorState(MICROPHONE_PERMISSION_ERROR_MESSAGE, 'not-allowed', true)
      cleanupVoiceActivity()
      isStarting = false
      return
    }

    if (currentStartRunId !== startRunId || !isStarting || ignoreResults) {
      cleanupVoiceActivity()
      isStarting = false
      return
    }

    offlineWorker = new Worker(new URL('../workers/sherpaSpeechWorker.js', import.meta.url))
    offlineWorker.onmessage = (event) => {
      if (ignoreResults) return
      const message = event.data || {}
      if (message.type === 'ready') {
        engineStatus.value = 'offline-ready'
        return
      }
      if (message.type === 'partial') {
        hasTranscriptResult = true
        interimTranscript.value = message.transcript || ''
        return
      }
      if (message.type === 'final') {
        hasTranscriptResult = true
        if (message.transcript) finalTranscript.value += message.transcript
        interimTranscript.value = ''
        if (offlineStopFlushResolve) {
          finishOfflineStopFlush()
        }
        return
      }
      if (message.type === 'error') {
        stopWithError(message.error || START_RECOGNITION_ERROR_MESSAGE, 'offline-worker-error')
      }
    }
    offlineWorker.onerror = () => {
      stopWithError('离线语音识别 Worker 启动失败，请检查模型文件和运行时是否已部署。', 'offline-worker-error')
    }
    offlineWorker.postMessage({
      type: 'init',
      runtimeUrl: modelStatus.value.runtime || '/voice-models/sherpa-onnx/zh-cn-streaming/runtime.js',
      config: buildOfflineWorkerConfig()
    })
    connectOfflineAudioStream()
    offlineWorker.postMessage({ type: 'start' })
    isRecording.value = true
    isStarting = false
  }

  const startBrowserRecognition = async () => {
    if (!SpeechRecognition) {
      setErrorState(UNSUPPORTED_RECOGNITION_ERROR_MESSAGE, 'unsupported', false)
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
      } catch {
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
        offlineEngineSuggested.value = false
        isRecording.value = false
        const failedRecognition = recognition
        cleanupRecognition()
        try {
          failedRecognition?.abort?.()
        } catch {}
        cleanupVoiceActivity()
        void startBrowserRecognition()
        return
      }
      if (event.error === 'network') {
        setErrorState(NETWORK_RECOGNITION_ERROR_MESSAGE, 'network', true)
      } else if (event.error === 'no-speech') {
        setErrorState(NO_SPEECH_ERROR_MESSAGE, 'no-speech', true)
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setErrorState(MICROPHONE_PERMISSION_ERROR_MESSAGE, 'not-allowed', true)
      } else if (event.error === 'audio-capture') {
        setErrorState(AUDIO_CAPTURE_ERROR_MESSAGE, 'audio-capture', false)
      } else {
        setErrorState(`语音识别不可用，已降级为手动输入: ${event.error}`, event.error || 'recognition-error', true)
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
      startOptionalBrowserVoiceActivityMonitor(currentStartRunId)
    } catch {
      setErrorState(START_RECOGNITION_ERROR_MESSAGE, 'start-failed', true)
      cleanupRecognition()
      cleanupVoiceActivity()
    }
    isStarting = false
  }

  const start = async () => {
    if (!preferOffline) {
      return startBrowserRecognition()
    }

    refreshModelStatus()
    if (isModelReady.value) {
      return startOfflineRecognition()
    }
    if (hasBrowserRecognition()) {
      return startBrowserRecognition()
    }
    setErrorState(OFFLINE_MODEL_MISSING_MESSAGE, 'offline-missing', true)
    return undefined
  }

  const stop = async () => {
    if (isStarting) {
      startRunId += 1
      isStarting = false
    }
    if (offlineWorker && isRecording.value) {
      await new Promise((resolve) => {
        offlineStopFlushResolve = resolve
        offlineStopFlushTimer = setTimeout(finishOfflineStopFlush, OFFLINE_STOP_FLUSH_TIMEOUT_MS)
        try {
          offlineWorker.postMessage({ type: 'stop' })
        } catch {
          finishOfflineStopFlush()
        }
      })
      return
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
    cleanupOfflineWorker()
    if (!recognition) return
    try {
      recognition.abort()
    } catch {}
    cleanupRecognition()
  }

  const toggle = () => {
    isRecording.value ? stop() : start()
  }

  const downloadOfflineModel = async () => {
    const status = await downloadModelFromManifest(
      OFFLINE_STT_MODEL_KEY,
      OFFLINE_STT_MANIFEST_URL,
      (progress) => {
        downloadProgress.value = progress
        modelStatus.value = { ...modelStatus.value, status: 'downloading', progress }
      }
    )
    modelStatus.value = status
    downloadProgress.value = status.progress
    isSupported.value = status.status === 'ready' || hasBrowserRecognition()
    engineStatus.value = resolvePreferredEngineStatus(status)
    return status
  }

  const clearOfflineModel = async () => {
    const status = await clearModelCache(OFFLINE_STT_MODEL_KEY)
    modelStatus.value = status
    downloadProgress.value = 0
    isSupported.value = hasBrowserRecognition()
    engineStatus.value = resolvePreferredEngineStatus(status)
    return status
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
    offlineEngineSuggested,
    downloadProgress,
    modelStatus,
    isModelReady,
    language,
    start,
    stop,
    cancel,
    toggle,
    downloadOfflineModel,
    clearOfflineModel,
  }
}
