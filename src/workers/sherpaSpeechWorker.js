let recognizer = null
let runtimeReady = false

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

self.onmessage = async (event) => {
  const message = event.data || {}
  try {
    if (message.type === 'init') {
      await loadRuntime(message.runtimeUrl)
      recognizer = await createRecognizer(message.config || {})
      self.postMessage({ type: 'ready' })
      return
    }

    if (message.type === 'start') {
      recognizer?.start?.()
      return
    }

    if (message.type === 'audio') {
      if (!recognizer) return
      const result = await recognizer.acceptWaveform?.(message.sampleRate, message.samples)
      if (result?.text && result?.isFinal) {
        self.postMessage({ type: 'final', transcript: result.text })
      } else if (result?.text) {
        self.postMessage({ type: 'partial', transcript: result.text })
      }
      return
    }

    if (message.type === 'stop') {
      const result = await recognizer?.stop?.()
      if (result?.text) {
        self.postMessage({ type: 'final', transcript: result.text })
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
