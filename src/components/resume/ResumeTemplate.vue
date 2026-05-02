<template>
  <div ref="resumeRef" :class="['resume-template', `resume-template--${mode}`]">
    <div v-if="isPreview" class="editor-toolbar">
      <button type="button" class="editor-tool" :disabled="!activeBlockId" @mousedown.prevent @click="toggleBold">
        B
      </button>
      <button type="button" class="editor-tool" :disabled="!activeBlockId" @mousedown.prevent @click="decreaseFontSize">
        A-
      </button>
      <button type="button" class="editor-tool" :disabled="!activeBlockId" @mousedown.prevent @click="increaseFontSize">
        A+
      </button>
      <span class="toolbar-separator"></span>
      <button type="button" class="editor-tool" @mousedown.prevent @click="insertLabelBlockAfterCurrent">插入标签段</button>
      <button type="button" class="editor-tool" @mousedown.prevent @click="insertSectionTitleAfterCurrent">章节标题</button>
      <button type="button" class="editor-tool" :disabled="!activeBlockId" @mousedown.prevent @click="deleteCurrentBlock">
        删除段落
      </button>
      <button type="button" class="editor-tool" :disabled="!activeBlockId" @mousedown.prevent @click="resetCurrentStyle">
        重置
      </button>
    </div>

    <article class="resume-paper">
      <section class="resume-section resume-section--profile">
        <div class="resume-section-head">
          <div class="section-tab">
            <span class="section-tab-mark"></span>
            <input
              v-model="header.sectionTitle"
              class="section-title-input resume-inline-input"
              data-export-display="inline"
              :readonly="!isPreview"
            />
          </div>
          <div class="section-line"></div>
        </div>

        <div class="profile-card">
          <div class="profile-main">
            <div class="profile-name-row">
              <input
                v-model="header.name"
                class="profile-name-input resume-inline-input"
                data-export-display="block"
                :readonly="!isPreview"
                placeholder="请输入姓名"
              />
            </div>

            <div class="profile-meta-grid">
              <input
                v-model="header.jobTarget"
                class="profile-target-input resume-inline-input profile-meta-item--wide"
                data-export-display="inline"
                :readonly="!isPreview"
                placeholder="请输入求职方向"
              />

              <div
                v-for="item in header.metaItems"
                :key="item.id"
                class="profile-meta-card"
                :draggable="isPreview"
                @dragstart="handleMetaDragStart(item.id)"
                @dragover.prevent
                @drop="handleMetaDrop(item.id)"
              >
                <span v-if="isPreview" class="drag-handle drag-handle--meta">⋮⋮</span>
                <input
                  v-model="item.value"
                  class="profile-meta-input resume-inline-input"
                  data-export-display="inline"
                  :readonly="!isPreview"
                  placeholder="请输入联系方式"
                />
                <button
                  v-if="isPreview"
                  type="button"
                  class="meta-remove-btn editor-ghost-btn"
                  @click="removeMetaItem(item.id)"
                >
                  删除
                </button>
              </div>
            </div>

            <div v-if="isPreview" class="profile-meta-tools">
              <button type="button" class="editor-ghost-btn" @click="addMetaItem">新增信息项</button>
              <button type="button" class="editor-ghost-btn" @click="addSummaryLine">新增补充说明</button>
            </div>

            <div v-if="header.summaryLines.length" class="profile-summary">
              <div v-for="item in header.summaryLines" :key="item.id" class="profile-summary-item">
                <textarea
                  v-model="item.value"
                  class="profile-summary-input resume-textarea-input"
                  data-export-display="block"
                  :readonly="!isPreview"
                  rows="2"
                  placeholder="请输入补充说明"
                ></textarea>
                <button
                  v-if="isPreview"
                  type="button"
                  class="summary-remove-btn editor-ghost-btn"
                  @click="removeSummaryLine(item.id)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>

          <div class="profile-photo">
            <input
              v-if="isPreview"
              ref="photoInputRef"
              class="photo-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              @change="handlePhotoChange"
            />
            <button
              v-if="isPreview"
              type="button"
              class="photo-frame photo-frame--button"
              @click="triggerPhotoUpload"
            >
              <img v-if="photoDataUrl" :src="photoDataUrl" alt="简历照片" class="photo-image" />
              <span v-else class="photo-placeholder">点击上传照片</span>
            </button>
            <div v-else class="photo-frame">
              <img v-if="photoDataUrl" :src="photoDataUrl" alt="简历照片" class="photo-image" />
              <span v-else class="photo-placeholder">照片预留区</span>
            </div>

            <div v-if="isPreview" class="photo-actions">
              <button type="button" class="photo-action" @click="triggerPhotoUpload">
                {{ photoDataUrl ? '更换照片' : '上传照片' }}
              </button>
              <button v-if="photoDataUrl" type="button" class="photo-action photo-action--ghost" @click="clearPhoto">
                清空照片
              </button>
            </div>
            <p class="photo-tip">{{ photoDataUrl ? '导出时将保留当前照片' : '照片预留区' }}</p>
          </div>
        </div>
      </section>

      <main class="resume-main">
        <section
          v-for="section in sections"
          :key="section.id"
          :class="['resume-section', `resume-section--${section.key}`]"
        >
          <div class="resume-section-head">
            <div class="section-tab">
              <span class="section-tab-mark"></span>
              <input
                v-model="section.title"
                class="section-title-input resume-inline-input"
                data-export-display="inline"
                :readonly="!isPreview"
              />
            </div>
            <div class="section-line"></div>
          </div>

          <div class="resume-section-body">
            <div
              v-for="block in section.blocks"
              :key="block.id"
              :class="['resume-block-shell', { 'is-active': activeBlockId === block.id }]"
            >
              <div
                v-if="isPreview"
                class="block-drop-indicator"
                :class="{ 'is-visible': isDragOver(section.id, block.id, 'before') }"
                @dragover.prevent="setDragOver(section.id, block.id, 'before')"
                @dragleave="clearDragOver"
                @drop.prevent="handleBlockDrop(section.id, block.id, 'before')"
              ></div>

              <div
                class="resume-block"
                :data-block-id="block.id"
                @click="setActiveBlock(block.id)"
              >
                <button
                  v-if="isPreview"
                  type="button"
                  class="drag-handle drag-handle--block"
                  draggable="true"
                  @dragstart="handleBlockDragStart(block.id)"
                  @dragend="resetDragState"
                  @mousedown.stop
                >
                  ⋮⋮
                </button>

                <template v-if="isRichTextBlock(block)">
                  <div :class="resolveTextBlockClass(block)">
                    <ResumeRichBlockEditor
                      :ref="(instance) => setRichBlockRef(block.id, instance)"
                      :block="block"
                      :mode="mode"
                      @focus="setActiveBlock"
                      @update-html="updateBlockHtml"
                      @request-insert-after="insertTextBlockAfter"
                      @request-remove-empty="removeEmptyBlock"
                    />
                  </div>
                </template>

                <div
                  v-else-if="block.type === 'banner_title'"
                  class="resume-section-head resume-section-head--block"
                  :style="buildBlockInlineStyle(block)"
                >
                  <div class="section-tab">
                    <span class="section-tab-mark"></span>
                    <input
                      v-model="block.title"
                      class="section-title-input resume-inline-input"
                      :style="buildBlockInlineStyle(block)"
                      data-export-display="inline"
                      :readonly="!isPreview"
                      @focus="setActiveBlock(block.id)"
                      @keydown.enter.prevent="insertTextBlockAfter(block.id)"
                    />
                  </div>
                  <div class="section-line"></div>
                </div>

                <div v-else-if="block.type === 'label'" class="label-line" :style="buildBlockInlineStyle(block)">
                  <input
                    v-model="block.label"
                    class="label-key-input resume-inline-input"
                    data-export-display="inline"
                    :readonly="!isPreview"
                    @focus="setActiveBlock(block.id)"
                    @keydown.enter.prevent="insertTextBlockAfter(block.id)"
                  />
                  <input
                    v-model="block.value"
                    class="label-value-input resume-inline-input"
                    data-export-display="inline"
                    :readonly="!isPreview"
                    @focus="setActiveBlock(block.id)"
                    @keydown.enter.prevent="insertTextBlockAfter(block.id)"
                  />
                </div>

                <div v-else-if="block.type === 'row'" class="entry-row" :style="buildBlockInlineStyle(block)">
                  <input
                    v-for="(item, itemIndex) in block.items"
                    :key="item.id"
                    v-model="item.value"
                    :class="['entry-cell-input', `entry-cell--${resolveCellRole(itemIndex, block.items.length)}`, 'resume-inline-input']"
                    data-export-display="inline"
                    :readonly="!isPreview"
                    @focus="setActiveBlock(block.id)"
                    @keydown.enter.prevent="insertTextBlockAfter(block.id)"
                  />
                </div>
              </div>

              <div
                v-if="isPreview"
                class="block-drop-indicator"
                :class="{ 'is-visible': isDragOver(section.id, block.id, 'after') }"
                @dragover.prevent="setDragOver(section.id, block.id, 'after')"
                @dragleave="clearDragOver"
                @drop.prevent="handleBlockDrop(section.id, block.id, 'after')"
              ></div>
            </div>

            <div
              v-if="isPreview"
              class="section-drop-tail"
              :class="{ 'is-visible': isDragOver(section.id, null, 'end') }"
              @dragover.prevent="setDragOver(section.id, null, 'end')"
              @dragleave="clearDragOver"
              @drop.prevent="handleBlockDrop(section.id, null, 'end')"
            >
              拖到这里放到本节末尾
            </div>
          </div>
        </section>
      </main>
    </article>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ResumeRichBlockEditor from './ResumeRichBlockEditor.vue'
import {
  buildResumeTemplateModel,
  createEmptyLabelBlock,
  createEmptyTextBlock,
} from './resumeTemplateParser'

const props = defineProps({
  text: {
    type: String,
    default: '',
  },
  mode: {
    type: String,
    default: 'preview',
    validator: (value) => ['preview', 'print'].includes(value),
  },
})

const isPreview = computed(() => props.mode === 'preview')
const resumeRef = ref(null)
const photoInputRef = ref(null)
const photoDataUrl = ref('')
const header = ref({
  sectionTitle: '个人信息',
  name: '',
  jobTarget: '',
  metaItems: [],
  summaryLines: [],
})
const sections = ref([])
const activeBlockId = ref('')
const draggingBlockId = ref('')
const metaDraggingId = ref('')
const dragOverState = ref({
  sectionId: '',
  blockId: '',
  position: '',
})
const richBlockRefs = new Map()

const cloneModel = (value) => JSON.parse(JSON.stringify(value))

/**
 * 胶囊章节标题块属于前端编辑器专用块类型。
 * 它复用现有章节头视觉样式，但不改动后端 AI 文本结构与解析结果。
 */
const createBannerTitleBlock = () => ({
  id: `resume_block_banner_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  type: 'banner_title',
  title: '章节标题',
  style: {
    fontSize: null,
    fontWeight: null,
  },
})

/**
 * 当 AI 润色结果变化时，重新生成模板状态。
 * 这里统一把原始纯文本拆成头部信息和正文块，后续编辑都只修改这份前端状态。
 */
const applyTemplateText = (text) => {
  const model = cloneModel(buildResumeTemplateModel(text))
  header.value = model.header
  sections.value = model.sections
  activeBlockId.value = ''
  draggingBlockId.value = ''
  dragOverState.value = {
    sectionId: '',
    blockId: '',
    position: '',
  }
}

watch(
  () => props.text,
  (nextText) => {
    applyTemplateText(nextText)
  },
  { immediate: true },
)

const setRichBlockRef = (blockId, instance) => {
  if (instance) {
    richBlockRefs.set(blockId, instance)
    return
  }
  richBlockRefs.delete(blockId)
}

const resolveCellRole = (index, total) => {
  if (total === 1 || index === 0) {
    return 'left'
  }
  if (index === total - 1) {
    return 'right'
  }
  return 'middle'
}

const isRichTextBlock = (block) => {
  return block.type === 'text' || block.type === 'section_title'
}

const resolveTextBlockClass = (block) => {
  return [
    block.type === 'section_title' ? 'subsection-line' : 'text-line',
    block.variant ? `text-line--${block.variant}` : '',
  ]
}

const buildBlockInlineStyle = (block) => {
  return {
    fontSize: block.style?.fontSize ? `${block.style.fontSize}px` : undefined,
    fontWeight: block.style?.fontWeight || undefined,
  }
}

const setActiveBlock = (blockId) => {
  activeBlockId.value = blockId
}

const findBlockLocation = (blockId) => {
  for (let sectionIndex = 0; sectionIndex < sections.value.length; sectionIndex += 1) {
    const section = sections.value[sectionIndex]
    const blockIndex = section.blocks.findIndex((block) => block.id === blockId)
    if (blockIndex !== -1) {
      return {
        sectionIndex,
        section,
        blockIndex,
        block: section.blocks[blockIndex],
      }
    }
  }
  return null
}

const focusBlock = async (blockId) => {
  await nextTick()
  activeBlockId.value = blockId
  richBlockRefs.get(blockId)?.focusEditor?.()
}

/**
 * 点击模板外空白区域时，主动清理当前激活态并让富文本编辑器失焦，
 * 避免预览区继续残留选中边框或光标态。
 */
const clearActiveState = () => {
  const currentId = activeBlockId.value
  if (currentId) {
    richBlockRefs.get(currentId)?.blurEditor?.()
  }
  activeBlockId.value = ''
}

const handleDocumentPointerDown = (event) => {
  if (!resumeRef.value?.contains(event.target)) {
    clearActiveState()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentPointerDown)
})

const updateBlockHtml = ({ id, html }) => {
  const location = findBlockLocation(id)
  if (!location || !location.block) {
    return
  }
  location.block.html = html
}

const insertBlockAfter = async (currentBlockId, nextBlock) => {
  const location = findBlockLocation(currentBlockId)
  if (!location) {
    const firstSection = sections.value[0]
    if (!firstSection) {
      return
    }
    firstSection.blocks.push(nextBlock)
    await focusBlock(nextBlock.id)
    return
  }

  location.section.blocks.splice(location.blockIndex + 1, 0, nextBlock)
  await focusBlock(nextBlock.id)
}

/**
 * 回车创建的新段落总是插入到当前块之后，并自动把光标切到新段落中。
 */
const insertTextBlockAfter = async (currentBlockId) => {
  await insertBlockAfter(currentBlockId, createEmptyTextBlock())
}

const insertLabelBlockAfterCurrent = async () => {
  const baseId = activeBlockId.value || sections.value[0]?.blocks[sections.value[0].blocks.length - 1]?.id
  if (!baseId) {
    return
  }
  await insertBlockAfter(baseId, createEmptyLabelBlock())
}

const insertSectionTitleAfterCurrent = async () => {
  const baseId = activeBlockId.value || sections.value[0]?.blocks[sections.value[0].blocks.length - 1]?.id
  if (!baseId) {
    return
  }
  await insertBlockAfter(baseId, createBannerTitleBlock())
}

const removeBlockById = (blockId) => {
  const location = findBlockLocation(blockId)
  if (!location) {
    return null
  }

  location.section.blocks.splice(location.blockIndex, 1)
  return {
    sectionIndex: location.sectionIndex,
    nextBlock:
      location.section.blocks[location.blockIndex] ||
      location.section.blocks[location.blockIndex - 1] ||
      null,
  }
}

const removeEmptyBlock = async (blockId) => {
  const result = removeBlockById(blockId)
  if (!result) {
    return
  }

  if (result.nextBlock) {
    await focusBlock(result.nextBlock.id)
    return
  }

  activeBlockId.value = ''
}

const deleteCurrentBlock = async () => {
  if (!activeBlockId.value) {
    ElMessage.warning('请先选择要删除的段落')
    return
  }
  await removeEmptyBlock(activeBlockId.value)
}

const getActiveBlock = () => {
  return activeBlockId.value ? findBlockLocation(activeBlockId.value)?.block || null : null
}

const toggleBlockBold = (block) => {
  if (!block.style) {
    block.style = {}
  }
  block.style.fontWeight = block.style.fontWeight === '700' ? null : '700'
}

const adjustBlockFontSize = (block, delta) => {
  if (!block.style) {
    block.style = {}
  }
  const current = Number.parseFloat(block.style.fontSize || '14') || 14
  block.style.fontSize = Math.min(28, Math.max(12, current + delta))
}

/**
 * 工具栏优先尝试修改当前富文本选区；若当前没有选区，则退回到整段样式。
 */
const toggleBold = () => {
  const block = getActiveBlock()
  if (!block) {
    ElMessage.warning('请先选择要编辑的段落')
    return
  }

  if (isRichTextBlock(block) && richBlockRefs.get(block.id)?.toggleBoldSelection?.()) {
    return
  }

  toggleBlockBold(block)
}

const updateBlockFontSize = (delta) => {
  const block = getActiveBlock()
  if (!block) {
    ElMessage.warning('请先选择要编辑的段落')
    return
  }

  if (isRichTextBlock(block) && richBlockRefs.get(block.id)?.adjustSelectionFontSize?.(delta)) {
    return
  }

  adjustBlockFontSize(block, delta)
}

const increaseFontSize = () => updateBlockFontSize(1)
const decreaseFontSize = () => updateBlockFontSize(-1)

const resetCurrentStyle = () => {
  const block = getActiveBlock()
  if (!block) {
    ElMessage.warning('请先选择要编辑的段落')
    return
  }

  if (isRichTextBlock(block)) {
    richBlockRefs.get(block.id)?.resetSelectionStyle?.()
  }

  block.style = {
    fontSize: null,
    fontWeight: null,
  }
}

const resetDragState = () => {
  draggingBlockId.value = ''
  dragOverState.value = {
    sectionId: '',
    blockId: '',
    position: '',
  }
}

const handleBlockDragStart = (blockId) => {
  draggingBlockId.value = blockId
  activeBlockId.value = blockId
}

const setDragOver = (sectionId, blockId, position) => {
  dragOverState.value = {
    sectionId,
    blockId: blockId || '',
    position,
  }
}

const clearDragOver = () => {
  dragOverState.value = {
    sectionId: '',
    blockId: '',
    position: '',
  }
}

const isDragOver = (sectionId, blockId, position) => {
  return (
    dragOverState.value.sectionId === sectionId &&
    dragOverState.value.blockId === (blockId || '') &&
    dragOverState.value.position === position
  )
}

/**
 * 正文拖拽遵循文档流重排：只改变块在章节中的顺序或跨章节归属，
 * 不做整页绝对坐标定位，从而保证导出和回显的稳定性。
 */
const handleBlockDrop = async (sectionId, blockId, position) => {
  const draggedId = draggingBlockId.value
  if (!draggedId) {
    return
  }

  if (blockId && draggedId === blockId) {
    resetDragState()
    return
  }

  const fromLocation = findBlockLocation(draggedId)
  const toSectionIndex = sections.value.findIndex((section) => section.id === sectionId)
  if (!fromLocation || toSectionIndex === -1) {
    resetDragState()
    return
  }

  const draggedBlock = fromLocation.section.blocks.splice(fromLocation.blockIndex, 1)[0]
  const targetSection = sections.value[toSectionIndex]
  let insertIndex = targetSection.blocks.length

  if (blockId) {
    const targetIndex = targetSection.blocks.findIndex((item) => item.id === blockId)
    insertIndex = position === 'before' ? targetIndex : targetIndex + 1
  }

  if (fromLocation.section.id === sectionId && fromLocation.blockIndex < insertIndex) {
    insertIndex -= 1
  }

  targetSection.blocks.splice(insertIndex, 0, draggedBlock)
  resetDragState()
  await focusBlock(draggedBlock.id)
}

const handleMetaDragStart = (itemId) => {
  metaDraggingId.value = itemId
}

const handleMetaDrop = (targetId) => {
  const fromIndex = header.value.metaItems.findIndex((item) => item.id === metaDraggingId.value)
  const toIndex = header.value.metaItems.findIndex((item) => item.id === targetId)
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    metaDraggingId.value = ''
    return
  }

  const [moved] = header.value.metaItems.splice(fromIndex, 1)
  header.value.metaItems.splice(toIndex, 0, moved)
  metaDraggingId.value = ''
}

const addMetaItem = () => {
  header.value.metaItems.push({
    id: `meta_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    value: '',
  })
}

const removeMetaItem = (itemId) => {
  header.value.metaItems = header.value.metaItems.filter((item) => item.id !== itemId)
}

const addSummaryLine = () => {
  header.value.summaryLines.push({
    id: `summary_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    value: '',
  })
}

const removeSummaryLine = (itemId) => {
  header.value.summaryLines = header.value.summaryLines.filter((item) => item.id !== itemId)
}

const handlePhotoChange = (event) => {
  const file = event.target.files?.[0]
  if (!file) {
    return
  }

  if (!file.type.startsWith('image/')) {
    event.target.value = ''
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('照片文件大小不能超过 5MB')
    event.target.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    photoDataUrl.value = typeof reader.result === 'string' ? reader.result : ''
    event.target.value = ''
  }
  reader.readAsDataURL(file)
}

const triggerPhotoUpload = () => {
  photoInputRef.value?.click()
}

const clearPhoto = () => {
  photoDataUrl.value = ''
  if (photoInputRef.value) {
    photoInputRef.value.value = ''
  }
}

const stripHtmlToText = (html) => {
  if (!html) {
    return ''
  }
  const wrapper = document.createElement('div')
  wrapper.innerHTML = html
  wrapper.querySelectorAll('br').forEach((node) => {
    node.replaceWith('\n')
  })
  return wrapper.textContent?.replace(/\u00a0/g, ' ').trim() || ''
}

const getResumePlainText = () => {
  const lines = []

  if (header.value.sectionTitle?.trim()) {
    lines.push(header.value.sectionTitle.trim())
  }
  if (header.value.name?.trim()) {
    lines.push(header.value.name.trim())
  }
  if (header.value.jobTarget?.trim()) {
    lines.push(header.value.jobTarget.trim())
  }

  const profileMeta = header.value.metaItems.map((item) => item.value.trim()).filter(Boolean)
  if (profileMeta.length) {
    lines.push(profileMeta.join(' | '))
  }

  header.value.summaryLines
    .map((item) => item.value.trim())
    .filter(Boolean)
    .forEach((item) => lines.push(item))

  sections.value.forEach((section) => {
    if (section.title?.trim()) {
      lines.push('')
      lines.push(section.title.trim())
    }

    section.blocks.forEach((block) => {
      if (block.type === 'banner_title') {
        const title = block.title?.trim() || ''
        if (title) {
          lines.push('')
          lines.push(title)
        }
        return
      }

      if (block.type === 'row') {
        const rowText = block.items.map((item) => item.value.trim()).filter(Boolean).join(' | ')
        if (rowText) {
          lines.push(rowText)
        }
        return
      }

      if (block.type === 'label') {
        const label = block.label?.trim() || ''
        const value = block.value?.trim() || ''
        if (label || value) {
          lines.push(`${label}${value}`)
        }
        return
      }

      const text = stripHtmlToText(block.html)
      if (!text) {
        return
      }

      if (block.variant === 'bullet') {
        lines.push(`- ${text}`)
        return
      }

      if (block.type === 'section_title') {
        lines.push('')
      }

      lines.push(text)
    })
  })

  return lines.join('\n').trim()
}

const getResumeName = () => header.value.name?.trim() || ''

const sanitizeRichTextClone = (rootNode) => {
  rootNode.querySelectorAll('[contenteditable]').forEach((node) => {
    node.removeAttribute('contenteditable')
    node.removeAttribute('role')
    node.removeAttribute('tabindex')
  })

  rootNode.querySelectorAll('.ProseMirror-focused, .has-focus, .is-active').forEach((node) => {
    node.classList.remove('ProseMirror-focused', 'has-focus', 'is-active')
  })
}

/**
 * Vue SFC 使用 scoped 样式时，会给真实 DOM 挂载作用域属性。
 * 导出阶段如果新建静态节点却不复制这些属性，个人信息区的结构样式会整体失效。
 */
const copyScopedAttributes = (sourceNode, targetNode) => {
  Array.from(sourceNode.attributes).forEach((attribute) => {
    if (attribute.name.startsWith('data-v-')) {
      targetNode.setAttribute(attribute.name, attribute.value)
    }
  })
}

const createStaticFieldNode = (fieldNode) => {
  const nextNode = fieldNode.ownerDocument.createElement('div')
  copyScopedAttributes(fieldNode, nextNode)
  nextNode.className = `${fieldNode.className} export-static-field`.trim()
  /**
   * 静态导出节点不再保留编辑态通用类，
   * 否则 print 模式下针对 input/textarea 的透明背景重置会误伤导出文本节点。
   */
  nextNode.classList.remove('resume-inline-input', 'resume-textarea-input')
  if (fieldNode.classList.contains('profile-name-input')) {
    nextNode.classList.add('export-profile-name')
  }
  if (fieldNode.classList.contains('profile-target-input')) {
    nextNode.classList.add('export-profile-target')
  }
  if (fieldNode.classList.contains('profile-meta-input')) {
    nextNode.classList.add('export-profile-meta')
  }
  if (fieldNode.classList.contains('profile-summary-input')) {
    nextNode.classList.add('export-profile-summary')
  }
  if (fieldNode.getAttribute('style')) {
    nextNode.setAttribute('style', fieldNode.getAttribute('style'))
  }
  nextNode.textContent = fieldNode.value || fieldNode.placeholder || ''
  return nextNode
}

/**
 * html2canvas 对原生 input/textarea 的值渲染并不稳定，头部信息容易出现截断或字形偏差。
 * 导出前统一改成静态文本节点，同时保留原有类名，确保导出布局与预览模板一致。
 */
const replaceFormFieldWithStaticText = (rootNode) => {
  rootNode.querySelectorAll('input, textarea').forEach((fieldNode) => {
    fieldNode.replaceWith(createStaticFieldNode(fieldNode))
  })
}

/**
 * 预览态的照片区域使用 button 承载上传交互，导出时需要保留外观但移除原生按钮语义，
 * 避免截图阶段出现浏览器默认按钮样式干扰。
 */
const replacePhotoFrameButtonWithStaticNode = (rootNode) => {
  rootNode.querySelectorAll('.photo-frame--button').forEach((buttonNode) => {
    const nextNode = buttonNode.ownerDocument.createElement('div')
    copyScopedAttributes(buttonNode, nextNode)
    nextNode.className = buttonNode.className
    nextNode.innerHTML = buttonNode.innerHTML
    buttonNode.replaceWith(nextNode)
  })
}

/**
 * html2canvas 对部分渐变和重复纹理背景的解析不稳定，
 * 这里在导出克隆节点上做一次导出专用降级，保留接近原模板的视觉层次，同时避免 createPattern 零尺寸异常。
 */
const applyExportSafeBackgrounds = (rootNode) => {
  rootNode.querySelectorAll('.section-tab').forEach((node) => {
    node.style.backgroundImage = 'none'
    node.style.backgroundColor = '#edf4f2'
  })

  rootNode.querySelectorAll('.section-line').forEach((node) => {
    node.style.backgroundImage = 'none'
    node.style.backgroundColor = '#d8ddd8'
  })

  rootNode.querySelectorAll('.photo-frame, .photo-placeholder').forEach((node) => {
    node.style.backgroundImage = 'none'
    node.style.backgroundColor = '#f3f6f5'
  })
}

/**
 * 导出时不直接复用编辑态节点，而是先把当前模板克隆成只读节点，
 * 去掉工具栏、拖拽手柄、上传控件和焦点态，再交给 PDF/图片导出链路截图。
 */
const buildExportElement = () => {
  clearActiveState()

  if (!resumeRef.value) {
    return null
  }

  const clone = resumeRef.value.cloneNode(true)
  clone.classList.remove('resume-template--preview')
  clone.classList.add('resume-template--print')
  clone.querySelector('.editor-toolbar')?.remove()
  clone.querySelectorAll('.drag-handle, .editor-ghost-btn, .profile-meta-tools, .photo-input, .photo-actions, .block-drop-indicator, .section-drop-tail')
    .forEach((node) => node.remove())

  sanitizeRichTextClone(clone)
  replaceFormFieldWithStaticText(clone)
  replacePhotoFrameButtonWithStaticNode(clone)
  applyExportSafeBackgrounds(clone)
  clone.querySelector('.photo-tip')?.remove()

  return clone
}

defineExpose({
  getResumePlainText,
  getResumeName,
  buildExportElement,
})
</script>

<style scoped>
.resume-template {
  --resume-accent: #1b5b57;
  --resume-accent-soft: #e8f0ee;
  --resume-gold: #b18757;
  --resume-text: #1f2933;
  --resume-muted: #52606d;
  --resume-line: #d6ddd8;
  --resume-focus: rgba(59, 130, 246, 0.14);
  --resume-focus-border: rgba(37, 99, 235, 0.22);
  width: 100%;
  box-sizing: border-box;
}

.resume-template--preview {
  max-width: 980px;
  margin: 0 auto;
}

.resume-template--print {
  width: 190mm;
  margin: 0 auto;
}

.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
  padding: 10px 12px;
  background: var(--bg-page, rgba(255, 248, 243, 0.96));
  border: 1px solid var(--border-card, rgba(243, 216, 199, 0.92));
  border-radius: 14px;
  position: sticky;
  top: 12px;
  z-index: 8;
  backdrop-filter: blur(10px);
}

.editor-tool,
.editor-ghost-btn {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(27, 91, 87, 0.18);
  border-radius: 999px;
  background: var(--bg-card, #fff);
  color: #214e56;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.editor-tool:hover,
.editor-ghost-btn:hover {
  border-color: rgba(27, 91, 87, 0.48);
  box-shadow: 0 6px 14px rgba(27, 91, 87, 0.1);
  transform: translateY(-1px);
}

.editor-tool:disabled {
  opacity: 0.42;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.toolbar-separator {
  width: 1px;
  height: 24px;
  background: rgba(27, 91, 87, 0.2);
  margin: 0 4px;
  align-self: center;
}

.resume-paper {
  box-sizing: border-box;
  background: var(--bg-card, #fff);
  color: var(--resume-text);
  border: 1px solid var(--resume-line, #d7dfda);
}

.resume-template--preview .resume-paper {
  padding: 28px 34px 34px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.resume-template--print .resume-paper {
  padding: 8mm 10mm 8mm;
  border: none;
  box-shadow: none;
}

.resume-main {
  margin-top: 14px;
}

.resume-template--print .resume-main {
  margin-top: 10px;
}

.resume-section + .resume-section {
  margin-top: 18px;
}

.resume-template--print .resume-section + .resume-section {
  margin-top: 12px;
}

.resume-section-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.resume-template--print .resume-section-head {
  margin-bottom: 8px;
}

.section-tab {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 5px 14px 5px 10px;
  background: linear-gradient(90deg, rgba(27, 91, 87, 0.14), rgba(27, 91, 87, 0.05));
  border-left: 3px solid var(--resume-gold);
  border-radius: 0 16px 16px 0;
}

.section-tab-mark {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--resume-gold);
  flex-shrink: 0;
}

.section-title-input,
.resume-inline-input,
.resume-textarea-input {
  width: 100%;
  box-sizing: border-box;
  border: none;
  background: transparent;
  color: inherit;
  outline: none;
  padding: 0;
  font: inherit;
}

.section-title-input {
  min-width: 80px;
  margin: 0;
  font-size: 17px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--resume-accent);
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.section-line {
  flex: 1;
  min-width: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(177, 135, 87, 0.55), rgba(214, 221, 216, 0.65));
}

.profile-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 118px;
  gap: 24px;
  align-items: start;
  padding: 6px 0 10px;
}

.resume-template--print .profile-card {
  padding: 4px 0 6px;
  gap: 16px;
}

.profile-main {
  min-width: 0;
}

.profile-name-row {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
}

.profile-name-input {
  margin: 0;
  font-size: 38px;
  line-height: 1.06;
  font-weight: 800;
  color: var(--resume-text, #143f45);
  letter-spacing: 0.06em;
}

.profile-target-input {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  box-sizing: border-box;
  min-height: 28px;
  /**
   * 胶囊左端有圆弧，视觉上会比下方普通文本更“缩”一点。
   * 这里让背景整体向左外扩，同时增加左内边距，保证文字起点基本不变。
   */
  margin-left: -10px;
  width: 100%;
  padding: 0 12px 0 22px;
  border-radius: 999px;
  background: rgba(177, 135, 87, 0.12);
  color: #775531;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.profile-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 18px;
  margin-top: 14px;
}

.profile-meta-item--wide {
  grid-column: 1 / -1;
}

.profile-meta-card {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
}

.profile-meta-input {
  width: 100%;
  min-width: 0;
  font-size: 14px;
  line-height: 1.72;
  color: var(--resume-muted);
  word-break: break-word;
}

.profile-meta-tools {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.profile-summary {
  margin-top: 12px;
  padding: 10px 12px;
  border-left: 2px solid rgba(27, 91, 87, 0.22);
  background: rgba(232, 240, 238, 0.32);
}

.profile-summary-item + .profile-summary-item {
  margin-top: 10px;
}

.profile-summary-input {
  min-height: 44px;
  resize: vertical;
  font-size: 14px;
  line-height: 1.8;
  color: #334155;
  white-space: pre-wrap;
}

.profile-photo {
  position: relative;
  justify-self: end;
  width: 118px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.photo-input {
  display: none;
}

.photo-frame {
  display: block;
  width: 118px;
  height: 146px;
  box-sizing: border-box;
  border: 1.5px dashed rgba(27, 91, 87, 0.45);
  background:
    linear-gradient(135deg, rgba(232, 240, 238, 0.68), rgba(255, 255, 255, 0.96)),
    repeating-linear-gradient(
      -45deg,
      rgba(177, 135, 87, 0.08),
      rgba(177, 135, 87, 0.08) 10px,
      transparent 10px,
      transparent 20px
    );
  overflow: hidden;
}

.photo-frame--button {
  padding: 0;
  border-left-width: 1.5px;
  cursor: pointer;
  appearance: none;
}

.photo-image,
.photo-placeholder {
  width: 100%;
  height: 100%;
}

.photo-image {
  display: block;
  object-fit: cover;
}

.photo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  font-size: 12px;
  line-height: 1.5;
  color: #6b7280;
  text-align: center;
}

.photo-actions {
  position: absolute;
  left: 50%;
  bottom: 34px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: calc(100% - 8px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.photo-action {
  min-height: 28px;
  border: 1px solid rgba(27, 91, 87, 0.24);
  border-radius: 999px;
  background: rgba(232, 240, 238, 0.62);
  color: var(--resume-accent, #1b5b57);
  font-size: 12px;
  line-height: 1.2;
  cursor: pointer;
}

.photo-action--ghost {
  background: var(--bg-card, #fff);
  color: #6b7280;
}

.photo-tip {
  margin: 0;
  font-size: 12px;
  color: #7b8794;
  line-height: 1.4;
}

.resume-section-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.resume-block-shell {
  position: relative;
}

.resume-block-shell.is-active .resume-block {
  outline: 2px dashed var(--resume-accent, #1b5b57);
  outline-offset: 2px;
  border-radius: 6px;
  background: rgba(27, 91, 87, 0.04);
}

.resume-block {
  position: relative;
  min-width: 0;
}

.drag-handle {
  position: absolute;
  left: -18px;
  top: 3px;
  border: none;
  background: transparent;
  color: #8b97a6;
  cursor: grab;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.drag-handle--meta {
  position: absolute;
  left: -18px;
  top: 50%;
  transform: translateY(-50%);
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.meta-remove-btn {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  min-height: 32px;
  padding: 0 10px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.drag-handle:active {
  cursor: grabbing;
}

.profile-meta-card:hover .drag-handle--meta,
.profile-meta-card:focus-within .drag-handle--meta,
.profile-meta-card:hover .meta-remove-btn,
.profile-meta-card:focus-within .meta-remove-btn {
  opacity: 1;
}

.resume-block-shell:hover .drag-handle--block,
.resume-block-shell:focus-within .drag-handle--block {
  opacity: 1;
}

.profile-photo:hover .photo-actions,
.profile-photo:focus-within .photo-actions {
  opacity: 1;
  pointer-events: auto;
}

.resume-template--preview .photo-tip {
  display: none;
}

.entry-row {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) minmax(118px, 0.85fr);
  gap: 16px;
  align-items: baseline;
}

.entry-cell-input,
.entry-cell--left,
.entry-cell--middle,
.entry-cell--right {
  min-width: 0;
  font-size: 14px;
  line-height: 1.72;
  color: var(--resume-text);
  word-break: break-word;
}

.entry-cell--left {
  font-weight: 700;
}

.entry-cell--middle {
  font-weight: 600;
  color: #334155;
}

.entry-cell--right {
  text-align: right;
  color: #5b6774;
}

.label-line,
.text-line,
.subsection-line {
  margin: 0;
  font-size: 14px;
  line-height: 1.82;
  color: #24323f;
  white-space: pre-wrap;
  word-break: break-word;
}

.subsection-line {
  font-size: 15px;
  font-weight: 700;
  color: #173a52;
}

.text-line--heading {
  font-size: 15px;
  font-weight: 700;
  color: #173a52;
}

.text-line--bullet {
  position: relative;
  padding-left: 14px;
}

.text-line--bullet::before {
  content: '•';
  position: absolute;
  left: 0;
  top: 0;
  color: var(--resume-gold);
}

.label-key-input {
  display: inline-block;
  width: auto;
  margin-right: 6px;
  font-weight: 700;
  color: #253542;
}

.label-value-input {
  color: #425466;
}

.block-drop-indicator,
.section-drop-tail {
  height: 10px;
  border-radius: 999px;
  background: transparent;
  transition: background-color 0.2s ease;
}

.block-drop-indicator.is-visible,
.section-drop-tail.is-visible {
  background: rgba(27, 91, 87, 0.18);
}

.section-drop-tail {
  font-size: 12px;
  line-height: 10px;
  color: #7b8794;
  text-align: center;
  padding: 6px 0;
  margin-top: 2px;
}

.resume-inline-input:focus,
.resume-textarea-input:focus,
.section-title-input:focus {
  background: var(--resume-focus);
  box-shadow: 0 0 0 2px var(--resume-focus-border);
  border-radius: 6px;
}

.resume-template--print .resume-inline-input,
.resume-template--print .resume-textarea-input,
.resume-template--print .section-title-input {
  background: transparent !important;
  box-shadow: none !important;
  pointer-events: none;
  caret-color: transparent;
  resize: none;
  appearance: none;
  -webkit-appearance: none;
}

.export-static-field {
  width: 100%;
  box-sizing: border-box;
  white-space: pre-wrap;
  word-break: break-word;
}

.resume-template--print .profile-name-input.export-static-field {
  display: block;
}

.resume-template--print .export-profile-name {
  width: auto;
}

.resume-template--print .profile-target-input.export-static-field {
  display: flex;
}

/**
 * 导出时显式补齐求职方向这一行的整条胶囊样式，
 * 避免只剩文字缩进却丢失浅色底条，看起来像是没有和下方信息对齐。
 */
.resume-template--print .export-profile-target {
  align-items: center;
  justify-content: flex-start;
  margin-left: -10px;
  width: 100%;
  min-height: 42px;
  padding: 0 18px 0 28px;
  border-radius: 999px;
  background: rgba(177, 135, 87, 0.16);
  color: #7a5631;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
  box-sizing: border-box;
}

.resume-template--print .profile-meta-input.export-static-field,
.resume-template--print .entry-cell-input.export-static-field,
.resume-template--print .label-key-input.export-static-field,
.resume-template--print .label-value-input.export-static-field,
.resume-template--print .section-title-input.export-static-field {
  display: block;
}

.resume-template--print .export-profile-meta-card {
  padding: 0;
}

.resume-template--print .export-profile-meta,
.resume-template--print .export-profile-summary {
  width: 100%;
}

.resume-template--print .photo-frame {
  border: none;
  background: var(--bg-elevated, #f3f6f5);
}

.resume-template--print .photo-placeholder {
  background: var(--bg-elevated, #f3f6f5);
}

@media (max-width: 767px) {
  .editor-toolbar {
    position: static;
  }

  .resume-template--preview .resume-paper {
    padding: 20px 16px 24px;
  }

  .profile-card {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .profile-photo {
    justify-self: start;
  }

  .photo-actions {
    width: 100%;
    max-width: 118px;
  }

  .profile-name-input {
    font-size: 31px;
  }

  .profile-meta-grid {
    grid-template-columns: 1fr;
  }

  .entry-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .entry-cell--right {
    text-align: left;
  }
}
</style>
