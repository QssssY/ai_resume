(() => {
  const CACHE_NAME = 'ai-resume-offline-voice-models-v1'
  const MODEL_BASE_URL = '/voice-models/sherpa-onnx/zh-cn-streaming/'
  const MODEL_FILES = Object.freeze({
    'sherpa-onnx-asr.js': `${MODEL_BASE_URL}sherpa-onnx-asr.js`,
    'sherpa-onnx-wasm-main-asr.js': `${MODEL_BASE_URL}sherpa-onnx-wasm-main-asr.js`,
    'sherpa-onnx-wasm-main-asr.wasm': `${MODEL_BASE_URL}sherpa-onnx-wasm-main-asr.wasm`,
    'sherpa-onnx-wasm-main-asr.data': `${MODEL_BASE_URL}sherpa-onnx-wasm-main-asr.data`
  })

  const runtimeBlobUrls = {}

  const resolveRuntimeMimeType = (url) => {
    const normalizedUrl = String(url || '').toLowerCase()
    if (normalizedUrl.endsWith('.js')) return 'text/javascript'
    if (normalizedUrl.endsWith('.wasm')) return 'application/wasm'
    return 'application/octet-stream'
  }

  const fetchCachedBlobUrl = async (url) => {
    const cache = await caches.open(CACHE_NAME)
    let response = await cache.match(url)
    if (!response) {
      response = await fetch(url)
      if (response?.ok) {
        await cache.put(url, response.clone())
      }
    }
    if (!response?.ok) {
      throw new Error(`离线语音模型运行时文件不可用: ${url}`)
    }
    const blob = await response.blob()
    const expectedType = resolveRuntimeMimeType(url)
    const typedBlob = blob.type === expectedType
      ? blob
      : new Blob([blob], { type: expectedType })
    return URL.createObjectURL(typedBlob)
  }

  const downsampleTo16k = (samples, sampleRate) => {
    if (!samples || sampleRate === 16000) return samples
    if (sampleRate < 16000) return samples
    const ratio = sampleRate / 16000
    const nextLength = Math.floor(samples.length / ratio)
    const nextSamples = new Float32Array(nextLength)
    for (let i = 0; i < nextLength; i += 1) {
      const start = Math.floor(i * ratio)
      const end = Math.min(Math.floor((i + 1) * ratio), samples.length)
      let sum = 0
      for (let j = start; j < end; j += 1) {
        sum += samples[j]
      }
      nextSamples[i] = sum / Math.max(end - start, 1)
    }
    return nextSamples
  }

  const createDefaultOnlineRecognizerConfig = () => ({
    featConfig: {
      sampleRate: 16000,
      featureDim: 80
    },
    modelConfig: {
      transducer: {
        encoder: './encoder.onnx',
        decoder: './decoder.onnx',
        joiner: './joiner.onnx'
      },
      paraformer: {
        encoder: '',
        decoder: ''
      },
      zipformer2Ctc: {
        model: ''
      },
      nemoCtc: {
        model: ''
      },
      toneCtc: {
        model: ''
      },
      tokens: './tokens.txt',
      numThreads: 1,
      provider: 'cpu',
      debug: 0,
      modelType: '',
      modelingUnit: 'cjkchar',
      bpeVocab: ''
    },
    decodingMethod: 'greedy_search',
    maxActivePaths: 4,
    enableEndpoint: 1,
    rule1MinTrailingSilence: 2.4,
    rule2MinTrailingSilence: 1.2,
    rule3MinUtteranceLength: 20,
    hotwordsFile: '',
    hotwordsScore: 1.5,
    ctcFstDecoderConfig: {
      graph: '',
      maxActive: 3000
    },
    ruleFsts: '',
    ruleFars: ''
  })

  class AiResumeSherpaRecognizer {
    constructor(recognizer) {
      this.recognizer = recognizer
      this.stream = null
      this.lastPartialText = ''
      this.resetStream()
    }

    resetStream() {
      this.stream?.free?.()
      this.stream = this.recognizer.createStream()
    }

    start() {
      this.resetStream()
      // 同一个 Worker 会复用已加载的模型；每轮收音必须创建新 stream，避免上一轮 inputFinished 状态影响下一轮。
      this.lastPartialText = ''
    }

    acceptWaveform(sampleRate, samples) {
      const pcm = downsampleTo16k(samples, sampleRate)
      this.stream.acceptWaveform(16000, pcm)
      while (this.recognizer.isReady(this.stream)) {
        this.recognizer.decode(this.stream)
      }
      const result = this.recognizer.getResult(this.stream)
      const text = result?.text || ''
      if (this.recognizer.isEndpoint(this.stream)) {
        this.recognizer.reset(this.stream)
        this.lastPartialText = ''
        return { text, isFinal: Boolean(text) }
      }
      if (text && text !== this.lastPartialText) {
        this.lastPartialText = text
        return { text, isFinal: false }
      }
      return { text: '', isFinal: false }
    }

    stop() {
      this.stream.inputFinished()
      while (this.recognizer.isReady(this.stream)) {
        this.recognizer.decode(this.stream)
      }
      const result = this.recognizer.getResult(this.stream)
      const text = result?.text || this.lastPartialText || ''
      this.recognizer.reset(this.stream)
      this.lastPartialText = ''
      return { text, isFinal: Boolean(text) }
    }
  }

  self.__sherpaRuntimeReady = (async () => {
    runtimeBlobUrls['sherpa-onnx-asr.js'] = await fetchCachedBlobUrl(MODEL_FILES['sherpa-onnx-asr.js'])
    runtimeBlobUrls['sherpa-onnx-wasm-main-asr.js'] = await fetchCachedBlobUrl(MODEL_FILES['sherpa-onnx-wasm-main-asr.js'])
    runtimeBlobUrls['sherpa-onnx-wasm-main-asr.wasm'] = await fetchCachedBlobUrl(MODEL_FILES['sherpa-onnx-wasm-main-asr.wasm'])
    runtimeBlobUrls['sherpa-onnx-wasm-main-asr.data'] = await fetchCachedBlobUrl(MODEL_FILES['sherpa-onnx-wasm-main-asr.data'])

    let runtimeInitialized
    const runtimeReady = new Promise((resolve) => {
      runtimeInitialized = resolve
    })

    self.Module = {
      locateFile(path) {
        return runtimeBlobUrls[path] || MODEL_FILES[path] || `${MODEL_BASE_URL}${path}`
      },
      onRuntimeInitialized() {
        runtimeInitialized()
      }
    }

    // 官方 sherpa-onnx 浏览器包由 API 封装和 Emscripten 主运行时两部分组成。
    importScripts(runtimeBlobUrls['sherpa-onnx-asr.js'])
    importScripts(runtimeBlobUrls['sherpa-onnx-wasm-main-asr.js'])
    await runtimeReady
  })()

  self.createSherpaOnnxRecognizer = async (config = {}) => {
    await self.__sherpaRuntimeReady
    const factory = self.createOnlineRecognizer || createOnlineRecognizer
    if (typeof factory !== 'function') {
      throw new Error('未找到 sherpa-onnx 在线识别创建函数')
    }
    // 默认关闭 sherpa C++ debug 日志，避免模型初始化信息被误认为前端报错。
    const recognizerConfig = config.recognizerConfig || createDefaultOnlineRecognizerConfig()
    return new AiResumeSherpaRecognizer(factory(self.Module, recognizerConfig))
  }
})()
