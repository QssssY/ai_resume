export const SPEECH_RECOGNITION_CAPABILITY_STATUS = Object.freeze({
  LOCAL_READY: 'local-ready',
  LOCAL_DOWNLOADABLE: 'local-downloadable',
  WEBSPEECH_READY: 'webspeech-ready',
  TEMPORARILY_UNAVAILABLE: 'temporarily-unavailable',
  PERMISSION_BLOCKED: 'permission-blocked',
  UNSUPPORTED: 'unsupported',
})

const LOCAL_DOWNLOADABLE_VALUES = new Set(['downloadable', 'downloading'])

export const getSpeechRecognitionConstructor = () => {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

const queryMicrophonePermission = async () => {
  if (typeof navigator === 'undefined' || typeof navigator.permissions?.query !== 'function') {
    return ''
  }

  try {
    const permission = await navigator.permissions.query({ name: 'microphone' })
    return permission?.state || ''
  } catch {
    return ''
  }
}

/**
 * 检测当前浏览器语音识别能力。
 * 实验性的本地语言包 API 只能通过特性检测访问，失败时回落到普通 Web Speech 主链路。
 */
export async function detectSpeechRecognitionCapability(options = {}) {
  const lang = options.lang || 'zh-CN'
  const SpeechRecognition = getSpeechRecognitionConstructor()

  if (!SpeechRecognition) {
    return {
      status: SPEECH_RECOGNITION_CAPABILITY_STATUS.UNSUPPORTED,
      SpeechRecognition: null,
      permissionState: '',
      supportsLocalProcessing: false,
      canInstallLocal: false,
    }
  }

  const permissionState = await queryMicrophonePermission()
  if (permissionState === 'denied') {
    return {
      status: SPEECH_RECOGNITION_CAPABILITY_STATUS.PERMISSION_BLOCKED,
      SpeechRecognition,
      permissionState,
      supportsLocalProcessing: false,
      canInstallLocal: false,
    }
  }

  if (typeof SpeechRecognition.available !== 'function') {
    return {
      status: SPEECH_RECOGNITION_CAPABILITY_STATUS.WEBSPEECH_READY,
      SpeechRecognition,
      permissionState,
      supportsLocalProcessing: false,
      canInstallLocal: false,
    }
  }

  try {
    const availability = await SpeechRecognition.available({
      langs: [lang],
      processLocally: true,
    })

    if (availability === 'available') {
      return {
        status: SPEECH_RECOGNITION_CAPABILITY_STATUS.LOCAL_READY,
        SpeechRecognition,
        permissionState,
        supportsLocalProcessing: true,
        canInstallLocal: false,
      }
    }

    if (LOCAL_DOWNLOADABLE_VALUES.has(availability)) {
      return {
        status: SPEECH_RECOGNITION_CAPABILITY_STATUS.LOCAL_DOWNLOADABLE,
        SpeechRecognition,
        permissionState,
        supportsLocalProcessing: false,
        canInstallLocal: typeof SpeechRecognition.install === 'function',
      }
    }
  } catch (availabilityError) {
    console.warn('检测浏览器本地语音识别能力失败', availabilityError)
  }

  return {
    status: SPEECH_RECOGNITION_CAPABILITY_STATUS.WEBSPEECH_READY,
    SpeechRecognition,
    permissionState,
    supportsLocalProcessing: false,
    canInstallLocal: false,
  }
}

export async function installLocalSpeechRecognition(options = {}) {
  const lang = options.lang || 'zh-CN'
  const SpeechRecognition = getSpeechRecognitionConstructor()

  if (typeof SpeechRecognition?.install !== 'function') {
    return {
      ok: false,
      status: SPEECH_RECOGNITION_CAPABILITY_STATUS.UNSUPPORTED,
    }
  }

  try {
    await SpeechRecognition.install({ langs: [lang] })
    return {
      ok: true,
      status: SPEECH_RECOGNITION_CAPABILITY_STATUS.LOCAL_READY,
    }
  } catch (installError) {
    console.warn('安装浏览器本地语音包失败', installError)
    return {
      ok: false,
      status: SPEECH_RECOGNITION_CAPABILITY_STATUS.TEMPORARILY_UNAVAILABLE,
      error: installError,
    }
  }
}
