(() => {
  const CACHE_NAME = 'ai-resume-offline-voice-models-v1'
  const MODEL_BASE_URL = 'https://huggingface.co/spaces/k2-fsa/web-assembly-asr-sherpa-onnx-zh-en/resolve/main/'
  const MODEL_FILES = Object.freeze({
    'sherpa-onnx-asr.js': `${MODEL_BASE_URL}sherpa-onnx-asr.js`,
    'sherpa-onnx-wasm-main-asr.js': `${MODEL_BASE_URL}sherpa-onnx-wasm-main-asr.js`,
    'sherpa-onnx-wasm-main-asr.wasm': `${MODEL_BASE_URL}sherpa-onnx-wasm-main-asr.wasm`,
    'sherpa-onnx-wasm-main-asr.data': `${MODEL_BASE_URL}sherpa-onnx-wasm-main-asr.data`
  })

  const runtimeBlobUrls = {}

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
    return URL.createObjectURL(await response.blob())
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

  class AiResumeSherpaRecognizer {
    constructor(recognizer) {
      this.recognizer = recognizer
      this.stream = recognizer.createStream()
      this.lastPartialText = ''
    }

    start() {
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
    return new AiResumeSherpaRecognizer(factory(self.Module, config.recognizerConfig))
  }
})()
