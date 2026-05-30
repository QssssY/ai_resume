import { computed, onUnmounted, ref } from 'vue'
import {
  clearModelCache,
  downloadModelFromManifest,
  getOfflineVoiceModelStatus
} from '@/utils/offlineVoiceModelCache'

const VOICE_ACTIVITY_THRESHOLD = 0.018
const VOICE_ACTIVITY_INTERVAL_MS = 120
const NO_TRANSCRIPT_TIMEOUT_MS = 6000
const OFFLINE_AUDIO_FRAME_TIMEOUT_MS = 2000
const OFFLINE_STOP_FLUSH_TIMEOUT_MS = 5000
const OFFLINE_STT_MODEL_KEY = 'stt:sherpa_onnx:zh_cn'
const OFFLINE_STT_MANIFEST_URL = '/voice-models/sherpa-onnx/zh-cn-streaming/manifest.json'
const OFFLINE_STT_WORKLET_URL = '/audio-worklets/offline-stt-processor.js'
const OFFLINE_STT_RUNTIME_VERSION = '20260530-persistent-worker-stream-reset'
const OFFLINE_MODEL_MISSING_MESSAGE = '离线语音识别模型未安装，请先到设置中心下载离线语音识别引擎。'
const OFFLINE_AUDIO_UNAVAILABLE_MESSAGE = '离线语音识别未收到麦克风音频，请检查浏览器麦克风权限或刷新后重试。'
const OFFLINE_NO_TRANSCRIPT_MESSAGE = '离线语音识别已收到麦克风音频，但没有返回识别文字，请检查离线语音包是否完整后重新下载。'
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
  let offlineWorkerReady = false
  let offlineWorkerRuntimeUrl = ''
  let offlineWorkerReadyPromise = null
  let offlineWorkerReadyResolve = null
  let offlineWorkerReadyReject = null
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
  let offlineAudioFrameTimer = null
  let hasOfflineAudioFrame = false

  const clearOfflineAudioFrameTimer = () => {
    if (!offlineAudioFrameTimer) return
    clearTimeout(offlineAudioFrameTimer)
    offlineAudioFrameTimer = null
  }

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
    if (hasOfflineAudioFrame && !hasTranscriptResult) {
      setOfflineErrorState(OFFLINE_NO_TRANSCRIPT_MESSAGE, 'offline-no-transcript')
    }
    isRecording.value = false
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

  const setOfflineErrorState = (message, code) => {
    error.value = message
    errorCode.value = code
    offlineEngineSuggested.value = false
    isSupported.value = true
    engineStatus.value = 'offline-error'
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
    offlineWorkerReady = false
    offlineWorkerRuntimeUrl = ''
    offlineWorkerReadyResolve = null
    offlineWorkerReadyReject = null
    offlineWorkerReadyPromise = null
  }

  const cleanupVoiceActivity = () => {
    clearOfflineAudioFrameTimer()
    if (voiceActivityTimer) {
      clearInterval(voiceActivityTimer)
      voiceActivityTimer = null
    }
    if (audioProcessor) {
      audioProcessor.onaudioprocess = null
      if (audioProcessor.port) {
        audioProcessor.port.onmessage = null
        audioProcessor.port.close?.()
      }
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

  const stopWithError = (message, code = 'recognition-error', options = {}) => {
    if (options.offline) {
      setOfflineErrorState(message, code)
    } else {
      setErrorState(message, code, true)
    }
    isStarting = false
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

  const startOfflineAudioFrameWatchdog = () => {
    clearOfflineAudioFrameTimer()
    offlineAudioFrameTimer = setTimeout(() => {
      if (!isRecording.value || ignoreResults) return
      stopWithError(OFFLINE_AUDIO_UNAVAILABLE_MESSAGE, 'offline-audio-unavailable', { offline: true })
    }, OFFLINE_AUDIO_FRAME_TIMEOUT_MS)
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

  const startVoiceActivityMonitor = async (shouldKeepMonitor = () => true, monitorOptions = {}) => {
    if (!navigator.mediaDevices?.getUserMedia || voiceActivityTimer) {
      releaseLocalVoiceActivityResources(null, monitorOptions.prewarmedAudioContext, null)
      return
    }

    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextConstructor) {
      releaseLocalVoiceActivityResources(null, monitorOptions.prewarmedAudioContext, null)
      return
    }

    let nextMediaStream = null
    let nextAudioContext = monitorOptions.prewarmedAudioContext || null
    let nextAnalyser = null
    let nextAudioSource = null

    const audioConstraints = monitorOptions.audioConstraints ?? true
    const audioContextOptions = monitorOptions.audioContextOptions
    const shouldDetectNoTranscript = monitorOptions.detectNoTranscript !== false

    // 这里的 getUserMedia 用于离线识别和音量监测；浏览器 Web Speech 会在 start() 内部自行申请麦克风。
    try {
      if (!nextAudioContext) {
        nextAudioContext = audioContextOptions
          ? new AudioContextConstructor(audioContextOptions)
          : new AudioContextConstructor()
      }
      if (monitorOptions.resumeSuspendedContext && nextAudioContext.state === 'suspended') {
        await nextAudioContext.resume?.()
      }
      nextMediaStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
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
        if (shouldDetectNoTranscript && !hasTranscriptResult) {
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

  const markOfflineVoiceActivityFromSamples = (samples) => {
    if (!samples?.length) return
    const rms = Math.sqrt(
      samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length
    )
    const active = rms >= VOICE_ACTIVITY_THRESHOLD
    isVoiceActive.value = active
    if (active) {
      voiceActivityAt.value = Date.now()
    }
  }

  const postOfflineAudioSamples = (samples) => {
    if (!isRecording.value || ignoreResults || !offlineWorker || !audioContext) return
    clearOfflineAudioFrameTimer()
    hasOfflineAudioFrame = true
    const chunk = samples instanceof Float32Array ? new Float32Array(samples) : new Float32Array(samples)
    markOfflineVoiceActivityFromSamples(chunk)
    offlineWorker.postMessage({
      type: 'audio',
      sampleRate: audioContext.sampleRate,
      samples: chunk
    }, [chunk.buffer])
  }

  const connectScriptProcessorAudioStream = () => {
    if (!audioContext?.createScriptProcessor || !audioSource || !offlineWorker) return false
    try {
      audioProcessor = audioContext.createScriptProcessor(4096, 1, 1)
    } catch {
      return false
    }
    audioProcessor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0)
      postOfflineAudioSamples(input)
    }
    audioSource.connect(audioProcessor)
    audioProcessor.connect(audioContext.destination)
    return true
  }

  const connectAudioWorkletStream = () => {
    const AudioWorkletNodeConstructor = window.AudioWorkletNode
    if (!audioContext?.audioWorklet?.addModule || !AudioWorkletNodeConstructor || !audioSource || !offlineWorker) {
      return null
    }
    return audioContext.audioWorklet.addModule(OFFLINE_STT_WORKLET_URL)
      .then(() => {
        if (!audioContext || !audioSource || !offlineWorker) return false
        audioProcessor = new AudioWorkletNodeConstructor(audioContext, 'offline-stt-processor')
        audioProcessor.port.onmessage = (event) => {
          const samples = event.data?.samples
          if (samples?.length) postOfflineAudioSamples(samples)
        }
        audioSource.connect(audioProcessor)
        audioProcessor.connect?.(audioContext.destination)
        return true
      })
      .catch(() => connectScriptProcessorAudioStream())
  }

  const connectOfflineAudioStream = () => {
    // 新版浏览器优先使用 AudioWorklet 采集 PCM，避免 ScriptProcessorNode 的弃用警告；旧浏览器继续走 ScriptProcessor 兜底。
    const audioWorkletConnection = connectAudioWorkletStream()
    return audioWorkletConnection || connectScriptProcessorAudioStream()
  }

  const buildOfflineWorkerConfig = () => {
    const files = Array.isArray(modelStatus.value.files)
      ? modelStatus.value.files.map((file) => ({
        path: String(file?.path || ''),
        url: String(file?.url || ''),
        size: Number(file?.size || 0)
      }))
      : []

    return {
      modelKey: OFFLINE_STT_MODEL_KEY,
      language: language.value,
      manifestUrl: modelStatus.value.manifestUrl || OFFLINE_STT_MANIFEST_URL,
      files
    }
  }

  const resolveOfflineRuntimeUrl = () => {
    const runtimeUrl = modelStatus.value.runtime || '/voice-models/sherpa-onnx/zh-cn-streaming/runtime.js'
    const separator = runtimeUrl.includes('?') ? '&' : '?'
    const version = [modelStatus.value.version, OFFLINE_STT_RUNTIME_VERSION]
      .filter(Boolean)
      .join('__') || OFFLINE_STT_RUNTIME_VERSION
    return `${runtimeUrl}${separator}v=${encodeURIComponent(version)}`
  }

  const createOfflineWorkerReadyPromise = () => {
    offlineWorkerReadyPromise = new Promise((resolve, reject) => {
      offlineWorkerReadyResolve = resolve
      offlineWorkerReadyReject = reject
    })
    return offlineWorkerReadyPromise
  }

  const handleOfflineWorkerMessage = (event, beginOfflineRecording) => {
    if (ignoreResults) return
    const message = event.data || {}
    if (message.type === 'ready') {
      offlineWorkerReady = true
      engineStatus.value = 'offline-ready'
      offlineWorkerReadyResolve?.()
      offlineWorkerReadyResolve = null
      offlineWorkerReadyReject = null
      beginOfflineRecording?.()
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
    if (message.type === 'stopped') {
      if (offlineStopFlushResolve) {
        finishOfflineStopFlush()
      }
      return
    }
    if (message.type === 'error') {
      const workerError = new Error(message.error || START_RECOGNITION_ERROR_MESSAGE)
      offlineWorkerReadyReject?.(workerError)
      offlineWorkerReadyResolve = null
      offlineWorkerReadyReject = null
      stopWithError(workerError.message, 'offline-worker-error', { offline: true })
    }
  }

  const ensureOfflineWorker = (runtimeUrl, beginOfflineRecording) => {
    if (offlineWorker && offlineWorkerRuntimeUrl === runtimeUrl) {
      offlineWorker.onmessage = (event) => handleOfflineWorkerMessage(event, beginOfflineRecording)
      if (offlineWorkerReady) {
        return Promise.resolve()
      }
      return offlineWorkerReadyPromise || createOfflineWorkerReadyPromise()
    }

    if (offlineWorker) {
      cleanupOfflineWorker()
    }

    const readyPromise = createOfflineWorkerReadyPromise()
    offlineWorker = new Worker(new URL('../workers/sherpaSpeechWorker.js', import.meta.url))
    offlineWorkerReady = false
    offlineWorkerRuntimeUrl = runtimeUrl
    offlineWorker.onmessage = (event) => handleOfflineWorkerMessage(event, beginOfflineRecording)
    offlineWorker.onerror = () => {
      const workerError = new Error('离线语音识别 Worker 启动失败，请检查模型文件和运行时是否已部署。')
      offlineWorkerReadyReject?.(workerError)
      offlineWorkerReadyResolve = null
      offlineWorkerReadyReject = null
      stopWithError(workerError.message, 'offline-worker-error', { offline: true })
    }
    try {
      offlineWorker.postMessage({
        type: 'init',
        runtimeUrl,
        config: buildOfflineWorkerConfig()
      })
    } catch (postMessageError) {
      const workerError = new Error(
        postMessageError?.message || '离线语音识别 Worker 初始化消息发送失败，请刷新后重试。'
      )
      offlineWorkerReadyReject?.(workerError)
      offlineWorkerReadyResolve = null
      offlineWorkerReadyReject = null
      stopWithError(workerError.message, 'offline-worker-error', { offline: true })
    }
    return readyPromise
  }

  const prepareOfflineRecognition = async () => {
    if (!preferOffline) return false
    refreshModelStatus()
    if (!isModelReady.value) return false
    if (isRecording.value || isStarting) return false

    const nextRuntimeUrl = resolveOfflineRuntimeUrl()
    if (offlineWorker && offlineWorkerReady && offlineWorkerRuntimeUrl === nextRuntimeUrl) {
      engineStatus.value = 'offline-ready'
      return true
    }

    clearState()
    ignoreResults = false
    engineStatus.value = 'offline-ready'
    // 预热只加载 sherpa Worker/模型，不申请麦克风；真正收音仍由用户点击开始通话触发。
    // 这里保持“已就绪”文案稳定，避免后台预热 Worker 时把用户可见的引擎状态闪成加载中。
    await ensureOfflineWorker(nextRuntimeUrl)
    return offlineWorkerReady
  }

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
    hasOfflineAudioFrame = false
    voiceActivityStartedAt = 0
    const nextRuntimeUrl = resolveOfflineRuntimeUrl()
    const canReuseReadyOfflineWorker = Boolean(
      offlineWorker && offlineWorkerReady && offlineWorkerRuntimeUrl === nextRuntimeUrl
    )
    engineStatus.value = canReuseReadyOfflineWorker ? 'offline-ready' : 'offline-loading'

    try {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext
      let prewarmedAudioContext = null
      if (AudioContextConstructor) {
        prewarmedAudioContext = new AudioContextConstructor({ sampleRate: 16000 })
        if (prewarmedAudioContext.state === 'suspended') {
          await prewarmedAudioContext.resume?.()
        }
      }
      await startVoiceActivityMonitor(
        () => currentStartRunId === startRunId && isStarting && !ignoreResults,
        {
          audioConstraints: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          audioContextOptions: prewarmedAudioContext ? undefined : { sampleRate: 16000 },
          prewarmedAudioContext,
          resumeSuspendedContext: true,
          detectNoTranscript: false,
        }
      )
    } catch {
      if (currentStartRunId !== startRunId || !isStarting || ignoreResults) {
        cleanupVoiceActivity()
        isStarting = false
        return
      }
      setOfflineErrorState(MICROPHONE_PERMISSION_ERROR_MESSAGE, 'not-allowed')
      cleanupVoiceActivity()
      isStarting = false
      return
    }

    if (currentStartRunId !== startRunId || !isStarting || ignoreResults) {
      cleanupVoiceActivity()
      isStarting = false
      return
    }

    const beginOfflineRecording = () => {
      if (currentStartRunId !== startRunId || !isStarting || ignoreResults) return

      const startWorkerAfterAudioConnected = (audioConnected) => {
        if (currentStartRunId !== startRunId || !isStarting || ignoreResults) return
        if (!audioConnected) {
          stopWithError(OFFLINE_AUDIO_UNAVAILABLE_MESSAGE, 'offline-audio-unavailable', { offline: true })
          return
        }
        try {
          // Worker 承载已加载的 sherpa WASM/ONNX；每轮只重新 start 识别流，避免反复初始化模型造成长时间“准备中”。
          offlineWorker.postMessage({ type: 'start' })
        } catch (startError) {
          stopWithError(
            startError?.message || START_RECOGNITION_ERROR_MESSAGE,
            'offline-worker-error',
            { offline: true }
          )
          return
        }
        engineStatus.value = 'offline-ready'
        isRecording.value = true
        isStarting = false
        startOfflineAudioFrameWatchdog()
      }

      const audioConnection = connectOfflineAudioStream()
      if (audioConnection && typeof audioConnection.then === 'function') {
        audioConnection.then(startWorkerAfterAudioConnected).catch(() => {
          stopWithError(OFFLINE_AUDIO_UNAVAILABLE_MESSAGE, 'offline-audio-unavailable', { offline: true })
        })
        return
      }
      startWorkerAfterAudioConnected(audioConnection)
    }

    if (canReuseReadyOfflineWorker) {
      beginOfflineRecording()
      return
    }

    ensureOfflineWorker(nextRuntimeUrl, beginOfflineRecording).catch((workerError) => {
      stopWithError(workerError?.message || START_RECOGNITION_ERROR_MESSAGE, 'offline-worker-error', { offline: true })
    })
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
      cleanupOfflineWorker()
      cleanupRecognition()
    }
    if (offlineWorker && isRecording.value) {
      await new Promise((resolve) => {
        offlineStopFlushResolve = resolve
        offlineStopFlushTimer = setTimeout(() => {
          finishOfflineStopFlush()
          cleanupOfflineWorker()
        }, OFFLINE_STOP_FLUSH_TIMEOUT_MS)
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
    const shouldPreserveOfflineError = engineStatus.value === 'offline-error' && errorCode.value.startsWith('offline-')
    startRunId += 1
    ignoreResults = true
    isStarting = false
    isRecording.value = false
    if (!shouldPreserveOfflineError) {
      clearState()
    }
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
    prepareOfflineRecognition,
  }
}
