import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearLocalSettingsCache,
  DEFAULT_SETTINGS_PREFERENCES,
  getSettingsPreferences,
  normalizeSettingsPreferences,
  resetSettingsPreferences,
  saveSettingsPreferences
} from '@/utils/settingsPreferences'

describe('settingsPreferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults when nothing is stored', () => {
    expect(getSettingsPreferences()).toEqual(DEFAULT_SETTINGS_PREFERENCES)
    expect(getSettingsPreferences().voiceRecognitionEngine).toBe('system_local')
  })

  it('merges and persists saved preferences', () => {
    saveSettingsPreferences({
      notificationRealtimeEnabled: false,
      notificationDefaultType: 'resume',
      defaultInterviewJobRole: '前端工程师',
      defaultInterviewJobRoleCode: 'frontend',
      defaultInterviewDifficulty: 'advanced',
      defaultInterviewMode: 'tech_leader',
      defaultFeedbackMode: 'immediate',
      defaultInterviewInteractionType: 1,
      voiceSpeakingRate: 1.1,
      voicePitch: 0.95,
      voiceVolume: 0.6,
      voiceMuteResumeMode: 'manual',
      voiceAutoSubmitDelayMs: 5000,
      voiceRecognitionLanguage: 'en-US',
      voiceRecognitionEngine: 'offline_sherpa',
      voicePreferredType: 'custom',
      voiceName: 'Microsoft Xiaoxiao Natural',
      voiceURI: 'xiaoxiao-uri',
      voiceLang: 'zh-CN',
      interviewRetentionDays: 90,
      resumeRetentionDays: 180
    })

    expect(getSettingsPreferences()).toEqual({
      notificationRealtimeEnabled: false,
      notificationDefaultUnreadOnly: false,
      notificationDefaultType: 'resume',
      defaultInterviewJobRole: '前端工程师',
      defaultInterviewJobRoleCode: 'frontend',
      defaultInterviewDifficulty: 'advanced',
      defaultInterviewMode: 'tech_leader',
      defaultFeedbackMode: 'immediate',
      defaultInterviewInteractionType: 1,
      voiceSpeakingRate: 1.1,
      voicePitch: 0.95,
      voiceVolume: 0.6,
      voiceMuteResumeMode: 'manual',
      voiceAutoSubmitDelayMs: 5000,
      voiceRecognitionLanguage: 'en-US',
      voiceRecognitionEngine: 'system_local',
      voicePreferredType: 'custom',
      voiceName: 'Microsoft Xiaoxiao Natural',
      voiceURI: 'xiaoxiao-uri',
      voiceLang: 'zh-CN',
      interviewRetentionDays: 90,
      resumeRetentionDays: 180
    })
  })

  it('drops legacy offline speech preferences from normalized settings', () => {
    const normalized = normalizeSettingsPreferences({
      voiceRecognitionEngine: 'offline_sherpa',
      offlineSttEngine: 'sherpa_onnx',
      offlineTtsEngine: 'legacy_offline_tts',
      offlineTtsVoiceType: 'male',
      voicePreferredType: 'female'
    })

    expect(normalized.voiceRecognitionEngine).toBe('system_local')
    expect(normalized).not.toHaveProperty('offlineSttEngine')
    expect(normalized).not.toHaveProperty('offlineTtsEngine')
    expect(normalized).not.toHaveProperty('offlineTtsVoiceType')
    expect(normalized.voicePreferredType).toBe('female')
  })

  it('normalizes invalid stored interview preferences to defaults', () => {
    const normalized = normalizeSettingsPreferences({
      defaultInterviewJobRole: 123,
      defaultInterviewJobRoleCode: null,
      defaultInterviewDifficulty: 'invalid',
      defaultInterviewMode: 'custom',
      defaultFeedbackMode: 'later',
      defaultInterviewInteractionType: 2,
      voiceSpeakingRate: 3,
      voicePitch: 0.1,
      voiceVolume: 2,
      voiceMuteResumeMode: 'invalid',
      voiceAutoSubmitDelayMs: 7000,
      voiceRecognitionLanguage: 'fr-FR',
      voiceRecognitionEngine: 'offline_sherpa',
      offlineSttEngine: 'vosk',
      offlineTtsEngine: 'remote',
      offlineTtsVoiceType: 'robot',
      voicePreferredType: 'remote',
      voiceName: 123,
      voiceURI: null,
      voiceLang: false,
      interviewRetentionDays: 7,
      resumeRetentionDays: 7
    })

    expect(normalized).toEqual(DEFAULT_SETTINGS_PREFERENCES)
  })

  it('resets preferences back to defaults', () => {
    saveSettingsPreferences({
      notificationRealtimeEnabled: false,
      notificationDefaultUnreadOnly: true,
      notificationDefaultType: 'quota'
    })

    expect(resetSettingsPreferences()).toEqual(DEFAULT_SETTINGS_PREFERENCES)
    expect(getSettingsPreferences()).toEqual(DEFAULT_SETTINGS_PREFERENCES)
  })

  it('clears local settings cache without removing login tokens', () => {
    localStorage.setItem('ai_resume_token', 'user-token')
    localStorage.setItem('ai_resume_admin_token', 'admin-token')
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('followSystem', 'false')
    saveSettingsPreferences({ defaultInterviewMode: 'stress' })

    expect(clearLocalSettingsCache()).toEqual(DEFAULT_SETTINGS_PREFERENCES)
    expect(localStorage.getItem('theme')).toBeNull()
    expect(localStorage.getItem('followSystem')).toBeNull()
    expect(getSettingsPreferences()).toEqual(DEFAULT_SETTINGS_PREFERENCES)
    expect(localStorage.getItem('ai_resume_token')).toBe('user-token')
    expect(localStorage.getItem('ai_resume_admin_token')).toBe('admin-token')
  })
})
