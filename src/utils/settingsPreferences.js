export const SETTINGS_PREFERENCES_KEY = 'ai_resume_settings_preferences'
export const SETTINGS_PREFERENCES_UPDATED_EVENT = 'ai-resume-settings-preferences-updated'

export const INTERVIEW_RETENTION_DAY_OPTIONS = Object.freeze([0, 30, 90, 180, 365])
export const RESUME_RETENTION_DAY_OPTIONS = Object.freeze([0, 30, 90, 180, 365])
export const VOICE_AUTO_SUBMIT_DELAY_OPTIONS = Object.freeze([0, 2000, 3000, 5000])

export const DEFAULT_SETTINGS_PREFERENCES = Object.freeze({
  notificationRealtimeEnabled: true,
  notificationDefaultUnreadOnly: false,
  notificationDefaultType: '',
  defaultInterviewJobRole: '',
  defaultInterviewJobRoleCode: '',
  defaultInterviewDifficulty: 'primary',
  defaultInterviewMode: 'normal',
  defaultFeedbackMode: 'after_interview',
  defaultInterviewInteractionType: 0,
  voiceSpeakingRate: 0.92,
  voicePitch: 1.06,
  voiceVolume: 1,
  voiceMuteResumeMode: 'auto',
  voiceAutoSubmitDelayMs: 3000,
  voiceRecognitionLanguage: 'auto',
  voiceRecognitionEngine: 'system_local',
  offlineSttEngine: 'sherpa_onnx',
  offlineTtsEngine: 'system',
  voicePreferredType: 'natural_zh',
  voiceName: '',
  voiceURI: '',
  voiceLang: '',
  interviewRetentionDays: 0,
  resumeRetentionDays: 0
})

const LOCAL_CACHE_KEYS = Object.freeze([
  SETTINGS_PREFERENCES_KEY,
  'theme',
  'followSystem'
])

const DIFFICULTY_VALUES = Object.freeze(['primary', 'intermediate', 'advanced'])
const INTERVIEW_MODE_VALUES = Object.freeze([
  'normal',
  'stress',
  'big_company_hr',
  'tech_leader',
  'foreign_interviewer'
])
const FEEDBACK_MODE_VALUES = Object.freeze(['after_interview', 'immediate'])
const INTERACTION_TYPE_VALUES = Object.freeze([0, 1])
const VOICE_MUTE_RESUME_MODE_VALUES = Object.freeze(['auto', 'manual'])
const VOICE_RECOGNITION_LANGUAGE_VALUES = Object.freeze(['auto', 'zh-CN', 'en-US'])
const VOICE_RECOGNITION_ENGINE_VALUES = Object.freeze(['offline_sherpa', 'system_local'])
const OFFLINE_STT_ENGINE_VALUES = Object.freeze(['sherpa_onnx'])
const OFFLINE_TTS_ENGINE_VALUES = Object.freeze(['system'])
const VOICE_PREFERRED_TYPE_VALUES = Object.freeze(['natural_zh', 'female', 'male', 'system', 'custom'])

const booleanOrDefault = (value, defaultValue) => (
  typeof value === 'boolean' ? value : defaultValue
)

const stringOrDefault = (value, defaultValue) => (
  typeof value === 'string' ? value : defaultValue
)

const optionOrDefault = (value, options, defaultValue) => (
  options.includes(value) ? value : defaultValue
)

const retentionDaysOrDefault = (value, options, defaultValue) => {
  const parsed = Number(value)
  return options.includes(parsed)
    ? parsed
    : defaultValue
}

const numberInRangeOrDefault = (value, min, max, defaultValue) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return defaultValue
  }
  return parsed
}

/**
 * 统一归一化设置中心本机偏好。
 * 新增偏好字段只影响当前浏览器，非法缓存值会回退默认值，避免旧缓存污染页面状态。
 */
export function normalizeSettingsPreferences(preferences = {}) {
  return {
    notificationRealtimeEnabled: booleanOrDefault(
      preferences.notificationRealtimeEnabled,
      DEFAULT_SETTINGS_PREFERENCES.notificationRealtimeEnabled
    ),
    notificationDefaultUnreadOnly: booleanOrDefault(
      preferences.notificationDefaultUnreadOnly,
      DEFAULT_SETTINGS_PREFERENCES.notificationDefaultUnreadOnly
    ),
    notificationDefaultType: stringOrDefault(
      preferences.notificationDefaultType,
      DEFAULT_SETTINGS_PREFERENCES.notificationDefaultType
    ),
    defaultInterviewJobRole: stringOrDefault(
      preferences.defaultInterviewJobRole,
      DEFAULT_SETTINGS_PREFERENCES.defaultInterviewJobRole
    ),
    defaultInterviewJobRoleCode: stringOrDefault(
      preferences.defaultInterviewJobRoleCode,
      DEFAULT_SETTINGS_PREFERENCES.defaultInterviewJobRoleCode
    ),
    defaultInterviewDifficulty: optionOrDefault(
      preferences.defaultInterviewDifficulty,
      DIFFICULTY_VALUES,
      DEFAULT_SETTINGS_PREFERENCES.defaultInterviewDifficulty
    ),
    defaultInterviewMode: optionOrDefault(
      preferences.defaultInterviewMode,
      INTERVIEW_MODE_VALUES,
      DEFAULT_SETTINGS_PREFERENCES.defaultInterviewMode
    ),
    defaultFeedbackMode: optionOrDefault(
      preferences.defaultFeedbackMode,
      FEEDBACK_MODE_VALUES,
      DEFAULT_SETTINGS_PREFERENCES.defaultFeedbackMode
    ),
    defaultInterviewInteractionType: optionOrDefault(
      Number(preferences.defaultInterviewInteractionType),
      INTERACTION_TYPE_VALUES,
      DEFAULT_SETTINGS_PREFERENCES.defaultInterviewInteractionType
    ),
    voiceSpeakingRate: numberInRangeOrDefault(
      preferences.voiceSpeakingRate,
      0.7,
      1.2,
      DEFAULT_SETTINGS_PREFERENCES.voiceSpeakingRate
    ),
    voicePitch: numberInRangeOrDefault(
      preferences.voicePitch,
      0.8,
      1.3,
      DEFAULT_SETTINGS_PREFERENCES.voicePitch
    ),
    voiceVolume: numberInRangeOrDefault(
      preferences.voiceVolume,
      0,
      1,
      DEFAULT_SETTINGS_PREFERENCES.voiceVolume
    ),
    voiceMuteResumeMode: optionOrDefault(
      preferences.voiceMuteResumeMode,
      VOICE_MUTE_RESUME_MODE_VALUES,
      DEFAULT_SETTINGS_PREFERENCES.voiceMuteResumeMode
    ),
    voiceAutoSubmitDelayMs: retentionDaysOrDefault(
      preferences.voiceAutoSubmitDelayMs,
      VOICE_AUTO_SUBMIT_DELAY_OPTIONS,
      DEFAULT_SETTINGS_PREFERENCES.voiceAutoSubmitDelayMs
    ),
    voiceRecognitionLanguage: optionOrDefault(
      preferences.voiceRecognitionLanguage,
      VOICE_RECOGNITION_LANGUAGE_VALUES,
      DEFAULT_SETTINGS_PREFERENCES.voiceRecognitionLanguage
    ),
    voiceRecognitionEngine: optionOrDefault(
      preferences.voiceRecognitionEngine,
      VOICE_RECOGNITION_ENGINE_VALUES,
      DEFAULT_SETTINGS_PREFERENCES.voiceRecognitionEngine
    ),
    offlineSttEngine: optionOrDefault(
      preferences.offlineSttEngine,
      OFFLINE_STT_ENGINE_VALUES,
      DEFAULT_SETTINGS_PREFERENCES.offlineSttEngine
    ),
    offlineTtsEngine: optionOrDefault(
      preferences.offlineTtsEngine,
      OFFLINE_TTS_ENGINE_VALUES,
      DEFAULT_SETTINGS_PREFERENCES.offlineTtsEngine
    ),
    voicePreferredType: optionOrDefault(
      preferences.voicePreferredType,
      VOICE_PREFERRED_TYPE_VALUES,
      DEFAULT_SETTINGS_PREFERENCES.voicePreferredType
    ),
    voiceName: stringOrDefault(
      preferences.voiceName,
      DEFAULT_SETTINGS_PREFERENCES.voiceName
    ),
    voiceURI: stringOrDefault(
      preferences.voiceURI,
      DEFAULT_SETTINGS_PREFERENCES.voiceURI
    ),
    voiceLang: stringOrDefault(
      preferences.voiceLang,
      DEFAULT_SETTINGS_PREFERENCES.voiceLang
    ),
    interviewRetentionDays: retentionDaysOrDefault(
      preferences.interviewRetentionDays,
      INTERVIEW_RETENTION_DAY_OPTIONS,
      DEFAULT_SETTINGS_PREFERENCES.interviewRetentionDays
    ),
    resumeRetentionDays: retentionDaysOrDefault(
      preferences.resumeRetentionDays,
      RESUME_RETENTION_DAY_OPTIONS,
      DEFAULT_SETTINGS_PREFERENCES.resumeRetentionDays
    )
  }
}

/**
 * 读取当前浏览器内的设置偏好。
 * 设置中心第一版不新增后端接口，因此通知偏好只影响本机展示与筛选默认值。
 */
export function getSettingsPreferences() {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_SETTINGS_PREFERENCES }
  }

  try {
    const raw = localStorage.getItem(SETTINGS_PREFERENCES_KEY)
    if (!raw) {
      return { ...DEFAULT_SETTINGS_PREFERENCES }
    }

    const parsed = JSON.parse(raw)
    return normalizeSettingsPreferences(parsed)
  } catch {
    return { ...DEFAULT_SETTINGS_PREFERENCES }
  }
}

/**
 * 合并保存设置偏好，避免调用方只更新一个字段时覆盖其他字段。
 */
export function saveSettingsPreferences(nextPreferences) {
  const merged = {
    ...getSettingsPreferences(),
    ...nextPreferences
  }

  const normalized = normalizeSettingsPreferences(merged)

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SETTINGS_PREFERENCES_KEY, JSON.stringify(normalized))
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SETTINGS_PREFERENCES_UPDATED_EVENT, { detail: normalized }))
  }

  return normalized
}

/**
 * 恢复默认设置，主要用于设置中心重置和单元测试。
 */
export function resetSettingsPreferences() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(SETTINGS_PREFERENCES_KEY)
  }
  const defaults = { ...DEFAULT_SETTINGS_PREFERENCES }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SETTINGS_PREFERENCES_UPDATED_EVENT, { detail: defaults }))
  }
  return defaults
}

/**
 * 清空设置中心管理的浏览器本机缓存。
 * 登录态和管理端登录态不在清理范围内，避免用户误以为只是清缓存却被登出。
 */
export function clearLocalSettingsCache() {
  if (typeof localStorage !== 'undefined') {
    LOCAL_CACHE_KEYS.forEach((key) => localStorage.removeItem(key))
  }
  const defaults = { ...DEFAULT_SETTINGS_PREFERENCES }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SETTINGS_PREFERENCES_UPDATED_EVENT, { detail: defaults }))
  }
  return defaults
}
