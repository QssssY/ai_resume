let recognizer = null
let runtimeReady = false
let recognizerReadyPromise = null

const loadRuntime = async (runtimeUrl) => {
  if (!runtimeUrl || runtimeReady) return
  importScripts(runtimeUrl)
  if (self.__sherpaRuntimeReady) {
    await self.__sherpaRuntimeReady
  }
  runtimeReady = true
}

const createRecognizer = async (config) => {
  if (self.createSherpaOnnxRecognizer) {
    return self.createSherpaOnnxRecognizer(config)
  }
  if (self.sherpaOnnx?.createRecognizer) {
    return self.sherpaOnnx.createRecognizer(config)
  }
  throw new Error('未找到 sherpa-onnx 浏览器运行时，请检查模型目录中的 runtime 配置')
}

const initializeRecognizer = (runtimeUrl, config) => {
  // init 加载 WASM 期间可能已经收到 start/audio；统一挂到同一个 Promise 上避免早到消息被丢弃。
  recognizerReadyPromise = (async () => {
    await loadRuntime(runtimeUrl)
    recognizer = await createRecognizer(config || {})
    return recognizer
  })()
  return recognizerReadyPromise
}

const getRecognizer = async () => {
  if (recognizer) return recognizer
  if (!recognizerReadyPromise) {
    throw new Error('离线语音识别 Worker 尚未初始化')
  }
  const readyRecognizer = await recognizerReadyPromise
  if (!readyRecognizer) {
    throw new Error('离线语音识别器初始化失败')
  }
  return readyRecognizer
}

self.onmessage = async (event) => {
  const message = event.data || {}
  try {
    if (message.type === 'init') {
      await initializeRecognizer(message.runtimeUrl, message.config)
      self.postMessage({ type: 'ready' })
      return
    }

    if (message.type === 'start') {
      const readyRecognizer = await getRecognizer()
      readyRecognizer.start?.()
      return
    }

    if (message.type === 'audio') {
      const readyRecognizer = await getRecognizer()
      const result = await readyRecognizer.acceptWaveform?.(message.sampleRate, message.samples)
      if (result?.text && result?.isFinal) {
        self.postMessage({ type: 'final', transcript: result.text })
      } else if (result?.text) {
        self.postMessage({ type: 'partial', transcript: result.text })
      }
      return
    }

    if (message.type === 'stop') {
      const readyRecognizer = await getRecognizer()
      const result = await readyRecognizer.stop?.()
      if (result?.text) {
        self.postMessage({ type: 'final', transcript: result.text })
      } else {
        self.postMessage({ type: 'stopped' })
      }
      return
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error?.message || '离线语音识别 Worker 执行失败'
    })
  }
}
