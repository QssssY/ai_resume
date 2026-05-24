import { describe, expect, it } from 'vitest'
import { featureIcons, featureIconLabels, getFeatureIcon, getFeatureIconLabel } from '@/utils/featureIcons'

const orderedFeatureIconKeys = [
  'home-dashboard',
  'resume-upload',
  'resume-analysis',
  'resume-optimization',
  'mock-interview',
  'interview-report',
  'history-records',
  'template-library',
  'community-hub',
  'growth-center',
  'offer-assistant',
  'settings',
  'resume-notifications',
  'resume-polish-notifications',
  'interview-notifications',
  'membership-credits',
  'system-notifications',
  'event-notifications',
  'user-profile',
  'membership-center',
  'beginner-guide',
  'data-management',
  'account-security',
  'ai-interviewer',
  'ai-loading',
  'announcement',
  'attachment',
  'back',
  'close',
  'collapse',
  'comment',
  'community-activity',
  'copy',
  'dark-mode',
  'data-cleanup',
  'delete',
  'download',
  'edit',
  'empty-state',
  'error',
  'exit-fullscreen',
  'expand',
  'favorite',
  'feedback-center',
  'fullscreen',
  'growth-milestone',
  'growth-radar',
  'image-upload',
  'interview-answer',
  'interview-end',
  'interview-feedback',
  'interview-pause',
  'interview-question',
  'interview-replay',
  'interview-start',
  'job-match-analysis',
  'light-mode',
  'liked',
  'loading',
  'mark-read',
  'menu',
  'message',
  'microphone-off',
  'microphone-on',
  'more',
  'next',
  'notification-center',
  'notification-settings',
  'offer-comparison',
  'onboarding-task',
  'password',
  'preview',
  'previous',
  'privacy',
  'processing',
  'profile-edit',
  'resume-editor',
  'resume-export',
  'resume-score',
  'retry',
  'salary-negotiation',
  'salary-script',
  'save',
  'search',
  'security-question',
  'share',
  'success',
  'template-editor',
  'unread',
  'upload-file',
  'version-log',
  'voice-interview',
  'voice-settings',
  'warning'
]

describe('featureIcons', () => {
  it('should resolve every local feature icon key without interfering old and new icons', () => {
    for (const key of orderedFeatureIconKeys) {
      expect(getFeatureIcon(key)).toContain(`${key}.png`)
      expect(getFeatureIconLabel(key)).not.toBe('功能图标')
    }

    expect(Object.keys(featureIcons)).toHaveLength(orderedFeatureIconKeys.length)
    expect(Object.keys(featureIconLabels)).toEqual(Object.keys(featureIcons))
  })

  it('should fallback to system notifications for unknown feature icon keys', () => {
    expect(getFeatureIcon('unknown-feature')).toContain('system-notifications.png')
    expect(getFeatureIconLabel('unknown-feature')).toBe('功能图标')
  })
})
