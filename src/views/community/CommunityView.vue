<template>
  <div class="community-page">
    <!-- 【页面标题横幅】带渐变背景的装饰性banner区域 -->
    <div class="page-banner">
      <button class="my-activity-btn" @click="router.push('/community/my')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>个人动态中心</span>
        <span v-if="unreadCount > 0" class="activity-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      </button>
      <div class="page-header">
        <div class="header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div>
          <h1 class="page-title">社区</h1>
          <p class="page-desc">分享面试经验，发现内推机会</p>
        </div>
      </div>
      <!-- 【装饰性背景圆点】营造层次感 -->
      <div class="banner-dot dot-1"></div>
      <div class="banner-dot dot-2"></div>
      <div class="banner-dot dot-3"></div>
    </div>

    <!-- Tab 切换栏 + 排序 -->
    <div class="tab-bar">
      <div class="tab-group">
        <button
          class="tab-item"
          :class="{ active: activeTab === 'all' }"
          @click="switchTab('all')"
        >
          全部
        </button>
        <button
          class="tab-item"
          :class="{ active: activeTab === 'interview_exp' }"
          @click="switchTab('interview_exp')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tab-icon">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          面试经验分享
        </button>
        <button
          class="tab-item"
          :class="{ active: activeTab === 'referral' }"
          @click="switchTab('referral')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tab-icon">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          内推广场
        </button>
      </div>
      <div class="sort-group">
        <button
          class="sort-btn"
          :class="{ active: sortBy === 'latest' }"
          @click="switchSort('latest')"
        >
          最新
        </button>
        <button
          class="sort-btn"
          :class="{ active: sortBy === 'hot' }"
          @click="switchSort('hot')"
        >
          最热
        </button>
      </div>
    </div>

    <!-- 帖子列表 -->
    <div class="post-feed">
      <!-- 【加载骨架屏】闪光扫光动画，视觉更高级 -->
      <template v-if="loading && posts.length === 0">
        <div v-for="i in 3" :key="i" class="skeleton-card">
          <div class="skeleton-header">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-meta">
              <div class="skeleton-line short"></div>
              <div class="skeleton-line shorter"></div>
            </div>
          </div>
          <div class="skeleton-body">
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line medium"></div>
          </div>
        </div>
      </template>

      <!-- 帖子卡片列表 -->
      <template v-else-if="posts.length > 0">
        <PostCard
          v-for="post in posts"
          :key="post.id"
          :post="post"
          @click="goToDetail(post.id)"
          @like="handleLike(post)"
          @favorite="handleFavorite(post)"
          @share="handleShare(post)"
        />
      </template>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h3 class="empty-title">暂无帖子</h3>
        <p class="empty-desc">成为第一个分享的人吧</p>
      </div>

      <!-- 加载更多 -->
      <div v-if="hasMore && posts.length > 0" class="load-more-area">
        <div v-if="loadingMore" class="loading-more">
          <div class="loading-spinner"></div>
          <span>加载中...</span>
        </div>
        <el-button v-else link type="primary" @click="loadMore">加载更多</el-button>
      </div>

      <!-- 【没有更多】装饰性分隔符 -->
      <div v-if="!hasMore && posts.length > 0" class="no-more">
        <span class="no-more-line"></span>
        <span class="no-more-text">已经到底了</span>
        <span class="no-more-line"></span>
      </div>
    </div>

    <!-- 悬浮按钮组 -->
    <div class="fab-group">
      <!-- 刷新按钮 -->
      <button class="fab-button fab-refresh" @click="handleRefresh" :class="{ refreshing: isRefreshing }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </button>
      <!-- 发布按钮 -->
      <button class="fab-button fab-post" @click="showEditor = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>

    <!-- 发布帖子弹窗 -->
    <el-dialog
      v-model="showEditor"
      title="发布帖子"
      width="600px"
      :close-on-click-modal="false"
      :append-to-body="true"
      class="post-editor-dialog"
      @closed="resetEditor"
    >
      <PostEditor
        v-if="showEditor"
        @success="onPostSuccess"
        @cancel="showEditor = false"
      />
    </el-dialog>

    <!-- 分享面板 -->
    <el-dialog
      v-model="showShareDialog"
      title="分享帖子"
      width="400px"
      :append-to-body="true"
      class="share-dialog"
    >
      <div class="share-content">
        <p class="share-label">复制链接分享给好友：</p>
        <div class="share-link-row">
          <el-input v-model="shareLink" readonly size="large" />
          <el-button type="primary" size="large" @click="copyLink">复制链接</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getPostList, togglePostLike, togglePostFavorite, getInteractionUnreadCount } from '@/api/community'
import PostCard from '@/components/community/PostCard.vue'
import PostEditor from '@/components/community/PostEditor.vue'

const router = useRouter()

const activeTab = ref('all')
const sortBy = ref('latest')
const posts = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const pageNum = ref(1)
const pageSize = 15
const hasMore = ref(false)
const showEditor = ref(false)
const showShareDialog = ref(false)
const shareLink = ref('')
const unreadCount = ref(0)
const isRefreshing = ref(false)
const LAST_SEEN_KEY = 'community_last_interaction_seen'

const fetchPosts = async (page = 1, append = false) => {
  if (page === 1) loading.value = true
  else loadingMore.value = true

  try {
    const params = {
      pageNum: page,
      pageSize,
      sort: sortBy.value
    }
    if (activeTab.value !== 'all') {
      params.category = activeTab.value
    }
    const res = await getPostList(params)
    if (res.code === 200) {
      const records = res.data?.list || []
      const total = res.data?.total || 0
      if (append) {
        posts.value.push(...records)
      } else {
        posts.value = records
      }
      hasMore.value = posts.value.length < total
      pageNum.value = page
    }
  } catch (err) {
    console.error('[社区] 获取帖子失败:', err)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const switchTab = (tab) => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  posts.value = []
  fetchPosts(1)
}

const switchSort = (sort) => {
  if (sortBy.value === sort) return
  sortBy.value = sort
  posts.value = []
  fetchPosts(1)
}

const loadMore = () => {
  fetchPosts(pageNum.value + 1, true)
}

const goToDetail = (postId) => {
  router.push(`/community/post/${postId}`)
}

const handleLike = async (post) => {
  try {
    await togglePostLike(post.id)
    post.liked = !post.liked
    post.likeCount = post.liked
      ? (post.likeCount || 0) + 1
      : Math.max(0, (post.likeCount || 0) - 1)
  } catch (err) {
    console.error('点赞失败:', err)
  }
}

const handleFavorite = async (post) => {
  try {
    await togglePostFavorite(post.id)
    post.favorited = !post.favorited
  } catch (err) {
    console.error('收藏失败:', err)
  }
}

const handleShare = (post) => {
  shareLink.value = `${window.location.origin}/community/post/${post.id}`
  showShareDialog.value = true
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value)
    ElMessage.success('链接已复制到剪贴板')
    showShareDialog.value = false
  } catch {
    // fallback
    const input = document.createElement('input')
    input.value = shareLink.value
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    ElMessage.success('链接已复制到剪贴板')
    showShareDialog.value = false
  }
}

const onPostSuccess = () => {
  showEditor.value = false
  fetchPosts(1)
}

const handleRefresh = async () => {
  if (isRefreshing.value) return
  isRefreshing.value = true
  posts.value = []
  await fetchPosts(1)
  isRefreshing.value = false
}

const resetEditor = () => {
  // dialog closed
}

const refreshUnreadCount = () => {
  const lastSeen = localStorage.getItem(LAST_SEEN_KEY)
  if (lastSeen) {
    getInteractionUnreadCount(lastSeen).then(res => {
      if (res.code === 200) {
        unreadCount.value = res.data || 0
      }
    })
  } else {
    unreadCount.value = 0
  }
}

onMounted(() => {
  fetchPosts(1)
  refreshUnreadCount()
})
</script>

<style scoped>
/* ===== 社区主页面样式（UI美化版 v2） ===== */

/* 【社区页面容器】注意：不能在此元素上使用带 transform 的动画，
   否则会创建新的包含块，导致内部 position: fixed 的悬浮按钮定位失效 */
.community-page {
  min-height: 100%;
  padding: 0 0 40px;
  position: relative;
}

/* 【标题横幅】渐变背景卡片，带装饰性浮动圆点 */
.page-banner {
  position: relative;
  background: linear-gradient(135deg, var(--orange-light-bg) 0%, rgba(255, 215, 191, 0.3) 100%);
  border-radius: 16px;
  padding: 24px 28px;
  margin-bottom: 24px;
  border: 1px solid var(--orange-border);
  overflow: hidden;
}

/* 【装饰性背景圆点】三个浮动半透明圆，营造空间层次 */
.banner-dot {
  position: absolute;
  border-radius: 50%;
  background: var(--orange-main);
  opacity: 0.06;
  pointer-events: none;
}

.banner-dot.dot-1 {
  width: 120px;
  height: 120px;
  top: -30px;
  right: -20px;
}

.banner-dot.dot-2 {
  width: 60px;
  height: 60px;
  bottom: -10px;
  right: 80px;
}

.banner-dot.dot-3 {
  width: 40px;
  height: 40px;
  top: 10px;
  right: 140px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.my-activity-btn {
  position: absolute;
  top: 16px;
  right: 20px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  background: rgba(255, 255, 255, 0.85);
  color: var(--text-body);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 10px;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.25s;
  letter-spacing: 0.2px;
}

.my-activity-btn:hover {
  background: #fff;
  color: var(--orange-main);
  box-shadow: 0 4px 16px rgba(255, 140, 66, 0.15);
  gap: 8px;
}

.my-activity-btn svg {
  width: 16px;
  height: 16px;
}

.activity-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #f53f3f;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  border-radius: 10px;
  pointer-events: none;
  box-shadow: 0 1px 3px rgba(245, 63, 63, 0.4);
}

.header-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--orange-main) 0%, var(--orange-deep) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(255, 140, 66, 0.35);
}

.header-icon svg {
  width: 26px;
  height: 26px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-title);
  letter-spacing: 0.5px;
}

.page-desc {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--text-muted);
  letter-spacing: 0.3px;
}

/* 【Tab 切换栏】使用项目设计令牌，增强玻璃质感 */
.tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.tab-group {
  display: flex;
  background: var(--bg-card);
  border-radius: 12px;
  padding: 4px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-card);
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  letter-spacing: 0.2px;
  position: relative;
}

.tab-item:hover {
  color: var(--text-title);
  background: var(--bg-page);
}

/* 【Tab激活态】品牌渐变背景 + 底部指示器圆点 */
.tab-item.active {
  background: linear-gradient(135deg, var(--orange-main) 0%, var(--orange-deep) 100%);
  color: #fff;
  box-shadow: 0 2px 12px rgba(255, 140, 66, 0.35);
}

.tab-icon {
  width: 16px;
  height: 16px;
}

/* 【排序切换组】与Tab栏视觉风格统一 */
.sort-group {
  display: flex;
  gap: 4px;
  background: var(--bg-card);
  border-radius: 10px;
  padding: 3px;
  border: 1px solid var(--border-card);
}

.sort-btn {
  padding: 6px 14px;
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sort-btn:hover {
  color: var(--text-title);
}

.sort-btn.active {
  background: var(--orange-light-bg);
  color: var(--orange-main);
  font-weight: 500;
}

/* 【帖子列表】卡片间距优化 */
.post-feed {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 【骨架屏】闪光扫光动画（shimmer），视觉更高级 */
.skeleton-card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid var(--border-card);
  overflow: hidden;
}

.skeleton-header {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.skeleton-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(90deg, var(--bg-elevated) 25%, #f0e6de 50%, var(--bg-elevated) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}

.skeleton-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
}

.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--bg-elevated) 25%, #f0e6de 50%, var(--bg-elevated) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}

.skeleton-line.short { width: 40%; }
.skeleton-line.shorter { width: 25%; }
.skeleton-line.medium { width: 70%; }

/* 【闪光扫光动画】从左到右的渐变位移 */
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 【空状态】优雅的留白与图标呈现 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 0;
  text-align: center;
}

.empty-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--orange-light-bg) 0%, var(--orange-border) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  animation: float-breathe 3s ease-in-out infinite;
}

/* 【空状态图标呼吸动画】缓慢上下浮动 */
@keyframes float-breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.empty-icon-wrapper svg {
  width: 40px;
  height: 40px;
  color: var(--orange-main);
}

.empty-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-title);
}

.empty-desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-muted);
}

/* 【加载更多】居中布局 */
.load-more-area {
  text-align: center;
  padding: 24px 0;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

/* 【加载动画】品牌色旋转指示器 */
.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-divider);
  border-top-color: var(--orange-main);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 【到底了】装饰性双线分隔符 */
.no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 28px 0;
}

.no-more-line {
  display: block;
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--orange-border), transparent);
}

.no-more-text {
  font-size: 13px;
  color: var(--text-placeholder);
  letter-spacing: 2px;
}

/* 【悬浮按钮组】固定在右下角 */
.fab-group {
  position: fixed;
  bottom: 32px;
  right: 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 100;
}

/* 【悬浮按钮】品牌渐变，带呼吸脉冲阴影 */
.fab-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--orange-main) 0%, var(--orange-deep) 100%);
  border: none;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(255, 140, 66, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 【发布按钮呼吸脉冲】阴影周期性放大缩小，吸引注意力 */
.fab-post {
  animation: fab-pulse 2.5s ease-in-out infinite;
}

@keyframes fab-pulse {
  0%, 100% { box-shadow: 0 4px 16px rgba(255, 140, 66, 0.4); }
  50% { box-shadow: 0 4px 24px rgba(255, 140, 66, 0.6); }
}

.fab-button:hover {
  transform: translateY(-2px) scale(1.06);
  box-shadow: 0 8px 28px rgba(255, 140, 66, 0.5);
}

.fab-post:hover {
  animation: none;
}

.fab-button:active {
  transform: translateY(0) scale(0.97);
}

.fab-button svg {
  width: 24px;
  height: 24px;
}

/* 【刷新按钮】旋转动画 */
.fab-refresh.refreshing svg {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 【发布弹窗】统一圆角与阴影 */
.post-editor-dialog :deep(.el-dialog) {
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.post-editor-dialog :deep(.el-dialog__header) {
  padding: 20px 24px 0;
}

.post-editor-dialog :deep(.el-dialog__body) {
  padding: 20px 24px 24px;
}

/* 【分享弹窗】与发布弹窗风格一致 */
.share-dialog :deep(.el-dialog) {
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.share-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.share-label {
  font-size: 14px;
  color: var(--text-body);
  margin: 0;
}

.share-link-row {
  display: flex;
  gap: 8px;
}

.share-link-row .el-input {
  flex: 1;
}

/* 【响应式】移动端布局适配 */
@media (max-width: 768px) {
  .page-banner {
    padding: 20px;
    border-radius: 12px;
  }

  .tab-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .tab-group {
    overflow-x: auto;
  }

  .sort-group {
    align-self: flex-end;
  }

  .fab-group {
    bottom: 20px;
    right: 20px;
  }

  .fab-button {
    width: 50px;
    height: 50px;
  }

  .fab-button svg {
    width: 20px;
    height: 20px;
  }
}

@media (max-width: 480px) {
  .tab-item {
    padding: 6px 12px;
    font-size: 13px;
  }

  .tab-icon {
    display: none;
  }
}
</style>
