class OfflineSttProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]?.[0]
    if (input?.length) {
      this.port.postMessage({ samples: Array.from(input) })
    }
    return true
  }
}

registerProcessor('offline-stt-processor', OfflineSttProcessor)
