import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import PostCard from '@/components/community/PostCard.vue'

vi.mock('@/utils/optimizedImages', () => ({
  optimizedImages: {
    userAvatar: {
      webp: '/avatar.webp'
    }
  }
}))

vi.mock('@/components/community/ImageGrid.vue', () => ({
  default: {
    name: 'ImageGrid',
    props: ['images'],
    template: '<div class="image-grid-stub" />'
  }
}))

const makePost = (overrides = {}) => ({
  id: 1,
  category: 'interview_exp',
  authorName: 'tester',
  authorAvatar: '',
  createTime: '2026-05-28T10:00:00',
  content: '面试经验内容',
  images: [],
  liked: false,
  likeCount: 3,
  commentCount: 2,
  favorited: false,
  ...overrides
})

const source = () => readFileSync(resolve(process.cwd(), 'src/components/community/PostCard.vue'), 'utf8')

describe('PostCard', () => {
  it('renders a visible favorited pill state with a readable icon', () => {
    const wrapper = mount(PostCard, {
      props: {
        post: makePost({ favorited: true })
      }
    })

    const favoriteButton = wrapper.find('.action-btn.favorited')
    expect(favoriteButton.exists()).toBe(true)
    expect(favoriteButton.text()).toContain('收藏')
    expect(favoriteButton.find('.feature-icon.size-sm').exists()).toBe(true)
    expect(favoriteButton.find('.feature-icon.size-xs').exists()).toBe(false)
  })

  it('emits only favorite when the favorite action is clicked', async () => {
    const wrapper = mount(PostCard, {
      props: {
        post: makePost({ favorited: true })
      }
    })

    await wrapper.find('.action-btn.favorited').trigger('click')

    expect(wrapper.emitted('favorite')).toHaveLength(1)
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('uses a stronger active favorite surface without transition-all', () => {
    const componentSource = source()

    expect(componentSource).toMatch(/\.action-btn\.favorited\s*\{[\s\S]*?background:/)
    expect(componentSource).toMatch(/\.action-btn\.favorited\s*\{[\s\S]*?border-color:/)
    expect(componentSource).toMatch(/\.action-btn\.favorited\s*\{[\s\S]*?box-shadow:/)
    expect(componentSource).toContain('@media (prefers-reduced-motion: reduce)')
    expect(componentSource).not.toContain('transition: all')
  })
})
