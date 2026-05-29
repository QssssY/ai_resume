import { describe, expect, it } from 'vitest'

import { resolveVoiceModelLocalPath } from '@/utils/voiceModelDevServer'

describe('voiceModelDevServer', () => {
  it('rejects traversal paths outside the local voice model directory', () => {
    const resolved = resolveVoiceModelLocalPath(
      'F:/Code/ai-resume/frontend/app/voice-models-local',
      '/voice-models/../package.json'
    )

    expect(resolved).toBeNull()
  })

  it('resolves normal model files inside the local voice model directory', () => {
    const resolved = resolveVoiceModelLocalPath(
      'F:/Code/ai-resume/frontend/app/voice-models-local',
      '/voice-models/sherpa-onnx/zh-cn-streaming/manifest.json'
    )

    expect(resolved?.replace(/\\/g, '/')).toBe(
      'F:/Code/ai-resume/frontend/app/voice-models-local/sherpa-onnx/zh-cn-streaming/manifest.json'
    )
  })
})
