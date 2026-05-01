<template>
  <div
    ref="resumeRef"
    :class="['resume-template', `resume-template--${mode}`]"
    @focusin="syncActiveEditable"
    @click="syncActiveEditable"
  >
    <div v-if="mode === 'preview'" class="editor-toolbar">
      <button type="button" class="editor-tool" @mousedown.prevent @click="undo" :disabled="!canUndo">撤销</button>
      <button type="button" class="editor-tool" @mousedown.prevent @click="redo" :disabled="!canRedo">重做</button>
      <span class="toolbar-separator"></span>
      <button type="button" class="editor-tool" @mousedown.prevent @click="toggleBold" :disabled="!selectedBlockId">B</button>
      <button type="button" class="editor-tool" @mousedown.prevent @click="decreaseFontSize" :disabled="!selectedBlockId">A-</button>
      <button type="button" class="editor-tool" @mousedown.prevent @click="increaseFontSize" :disabled="!selectedBlockId">A+</button>
      <span class="toolbar-separator"></span>
      <button type="button" class="editor-tool" @mousedown.prevent @click="insertTextBlockAfter">新增段落</button>
      <button type="button" class="editor-tool" @mousedown.prevent @click="deleteCurrentBlock" :disabled="!selectedBlockId">删除段落</button>
      <button type="button" class="editor-tool" @mousedown.prevent @click="moveCurrentBlockUp" :disabled="!selectedBlockId || isFirstBlock">上移</button>
      <button type="button" class="editor-tool" @mousedown.prevent @click="moveCurrentBlockDown" :disabled="!selectedBlockId || isLastBlock">下移</button>
      <span class="toolbar-separator"></span>
      <button type="button" class="editor-tool" :class="{ 'editor-tool--active': currentBlockType === 'section_title' }" @mousedown.prevent @click="toggleSectionTitle" :disabled="!selectedBlockId">章节标题</button>
      <button type="button" class="editor-tool" @mousedown.prevent @click="resetCurrentStyle" :disabled="!selectedBlockId">重置</button>
    </div>
    <article class="resume-paper">
      <section data-role="section" class="resume-section resume-section--profile">
        <div class="resume-section-head">
          <div class="section-tab">
            <span class="section-tab-mark"></span>
            <h2 data-role="section-title" class="section-title" contenteditable="true" spellcheck="false">
              个人信息
            </h2>
          </div>
          <div class="section-line"></div>
        </div>

        <div class="profile-card">
          <div class="profile-main">
            <div class="profile-name-row">
              <h1 data-role="profile-name" class="profile-name" contenteditable="true" spellcheck="false">
                {{ profileHeader.name }}
              </h1>
            </div>

            <div v-if="profileHeader.jobTarget || profileHeader.metaItems.length" class="profile-meta-grid">
              <div
                v-if="profileHeader.jobTarget"
                data-role="profile-target"
                class="profile-meta-item profile-meta-item--wide"
                contenteditable="true"
                spellcheck="false"
              >
                {{ profileHeader.jobTarget }}
              </div>
              <div
                v-for="(item, index) in profileHeader.metaItems"
                :key="`${item}-${index}`"
                data-role="profile-meta"
                class="profile-meta-item"
                contenteditable="true"
                spellcheck="false"
              >
                {{ item }}
              </div>
            </div>

            <div v-if="profileHeader.summaryLines.length" class="profile-summary">
              <p
                v-for="(line, index) in profileHeader.summaryLines"
                :key="`${line}-${index}`"
                data-role="profile-summary"
                class="profile-summary-line"
                contenteditable="true"
                spellcheck="false"
              >
                {{ line }}
              </p>
            </div>
          </div>

          <div class="profile-photo">
            <input
              v-if="mode === 'preview'"
              ref="photoInputRef"
              class="photo-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              @change="handlePhotoChange"
            />
            <button
              v-if="mode === 'preview'"
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
            <div v-if="mode === 'preview'" class="photo-actions">
              <button type="button" class="photo-action" @click="triggerPhotoUpload">
                {{ photoDataUrl ? '替换照片' : '上传照片' }}
              </button>
              <button v-if="photoDataUrl" type="button" class="photo-action photo-action--ghost" @click="clearPhoto">
                清空照片
              </button>
            </div>
            <p data-role="photo-tip" class="photo-tip" contenteditable="true" spellcheck="false">
              {{ photoDataUrl ? '导出时将保留当前照片' : '照片预留区' }}
            </p>
          </div>
        </div>
      </section>

      <main class="resume-main">
        <section
          v-for="(section, sectionIndex) in mergedSections"
          :key="`${section.key}-${sectionIndex}`"
          data-role="section"
          :class="['resume-section', `resume-section--${section.key}`]"
        >
          <div class="resume-section-head">
            <div class="section-tab">
              <span class="section-tab-mark"></span>
              <h2
                data-role="section-title"
                class="section-title"
                contenteditable="true"
                spellcheck="false"
              >
                {{ section.title }}
              </h2>
            </div>
            <div class="section-line"></div>
          </div>

          <div class="resume-section-body">
            <div
              v-for="(block, blockIndex) in section.blocks"
              :key="block.id"
              :data-block-type="getEffectiveType(block)"
              :data-block-id="block.id"
              :class="['resume-block', { 'is-selected': selectedBlockId === block.id }]"
            >
              <div v-if="getEffectiveType(block) === 'section_title'" class="resume-section-head" style="margin-bottom:0;">
                <div class="section-tab">
                  <span class="section-tab-mark"></span>
                  <h2
                    data-role="section-title"
                    class="section-title"
                    contenteditable="true"
                    spellcheck="false"
                    @focus="selectBlock(block.id)"
                    @blur="block.content = $event.target.textContent"
                  >{{ block.content }}</h2>
                </div>
                <div class="section-line"></div>
              </div>

              <div v-else-if="getEffectiveType(block) === 'row'" class="entry-row">
                <span
                  v-for="(item, itemIndex) in block.items"
                  :key="`${item}-${itemIndex}`"
                  data-role="row-cell"
                  class="entry-cell"
                  :class="`entry-cell--${resolveCellRole(itemIndex, block.items.length)}`"
                  contenteditable="true"
                  spellcheck="false"
                  @focus="selectBlock(block.id)"
                >
                  {{ item }}
                </span>
              </div>

              <p v-else-if="getEffectiveType(block) === 'label'" class="label-line">
                <span
                  data-role="label-key"
                  class="label-key"
                  contenteditable="true"
                  spellcheck="false"
                  @focus="selectBlock(block.id)"
                >
                  {{ block.label }}
                </span>
                <span
                  data-role="label-value"
                  class="label-value"
                  contenteditable="true"
                  spellcheck="false"
                  @focus="selectBlock(block.id)"
                >
                  {{ block.content }}
                </span>
              </p>

              <p
                v-else-if="getEffectiveType(block) === 'text'"
                data-role="text-block"
                :class="['text-line', block.variant ? `text-line--${block.variant}` : '']"
                contenteditable="true"
                spellcheck="false"
                @focus="selectBlock(block.id)"
                @blur="block.content = $event.target.textContent"
              >
                {{ block.content }}
              </p>

              <ul v-else-if="getEffectiveType(block) === 'list'" class="bullet-list">
                <li
                  v-for="(item, itemIndex) in block.items"
                  :key="`${item}-${itemIndex}`"
                  data-role="list-item"
                  class="bullet-item"
                  contenteditable="true"
                  spellcheck="false"
                >
                  {{ item }}
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </article>
  </div>
</template>

<script setup>
import { computed, ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'

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

const resumeRef = ref(null)
const photoInputRef = ref(null)
const photoDataUrl = ref('')
const activeEditableEl = ref(null)

const SECTION_SPECS = [
  {
    key: 'profile',
    title: '个人信息',
    aliases: ['个人信息', '基本信息', '求职意向', '求职方向', '个人概况', '个人资料'],
  },
  {
    key: 'education',
    title: '教育背景',
    aliases: ['教育背景', '教育经历', '学历背景', '院校经历'],
  },
  {
    key: 'experience',
    title: '实习经历',
    aliases: ['实习经历', '工作经历', '工作经验', '职业经历', '实践经历', '测试经验'],
  },
  {
    key: 'project',
    title: '项目经历',
    aliases: ['项目经历', '项目经验', '项目成果', '科研项目', '实践项目'],
  },
  {
    key: 'skill',
    title: '专业技能',
    aliases: ['专业技能', '专业能力', '职业技能', '核心技能', '技能特长', '技能清单'],
  },
  {
    key: 'campus',
    title: '校园经历',
    aliases: ['校园经历', '校内经历', '学生工作', '社团经历', '组织经历'],
  },
  {
    key: 'honor',
    title: '荣誉证书',
    aliases: ['荣誉证书', '荣誉奖项', '证书资质', '技术资质', '技能证书', '获奖情况', '荣誉奖励'],
  },
  {
    key: 'evaluation',
    title: '个人评价',
    aliases: ['个人评价', '自我评价', '职业优势', '个人优势', '个人总结', '个人陈述'],
  },
]

const DISPLAY_ORDER = ['education', 'experience', 'project', 'skill', 'campus', 'honor', 'evaluation']

const normalizeInputLines = computed(() => {
  return (props.text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
})

const normalizeTitleText = (line) => {
  return line
    .replace(/^[【\[]/, '')
    .replace(/[】\]]$/, '')
    .replace(/^[0-9一二三四五六七八九十]+[、.．)\]]*\s*/, '')
    .replace(/[：:]+$/, '')
    .trim()
}

const matchSectionHeader = (line) => {
  const normalized = normalizeTitleText(line)
  if (!normalized) {
    return null
  }

  for (const spec of SECTION_SPECS) {
    if (spec.aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
      return {
        key: spec.key,
        rawTitle: normalized,
      }
    }
  }

  return null
}

const splitInlineItems = (line) => {
  return line
    .split(/\s*[|｜·•]\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const isInlineRow = (line) => splitInlineItems(line).length >= 2

const isLabelLine = (line) => /^[^：:\n]{2,12}[：:]\s*.+$/.test(line)

const parseLabelLine = (line) => {
  const separatorIndex = Math.max(line.indexOf('：'), line.indexOf(':'))
  if (separatorIndex < 0) {
    return {
      label: '',
      content: line,
    }
  }

  return {
    label: line.slice(0, separatorIndex + 1).trim(),
    content: line.slice(separatorIndex + 1).trim(),
  }
}

const isListItem = (line) => /^[-*•·▪]\s*/.test(line) || /^\d+[.、]\s*/.test(line)

const normalizeListItem = (line) => {
  return line
    .replace(/^[-*•·▪]\s*/, '')
    .replace(/^\d+[.、]\s*/, '')
    .trim()
}

const shouldEmphasizeProjectLine = (sectionKey, line) => {
  if (sectionKey !== 'project') {
    return false
  }

  if (!line || isLabelLine(line) || isInlineRow(line)) {
    return false
  }

  if (/：|:/.test(line)) {
    return false
  }

  return line.length <= 32 || /\d{4}[./-]\d{1,2}/.test(line)
}

// 生成唯一 block ID
let _blockIdSeq = 0
const generateBlockId = () => `blk_${++_blockIdSeq}`

const buildBlocksFromLines = (sectionKey, lines) => {
  const blocks = []
  let currentListItems = []

  const flushList = () => {
    if (!currentListItems.length) {
      return
    }
    blocks.push({
      id: generateBlockId(),
      type: 'list',
      items: [...currentListItems],
    })
    currentListItems = []
  }

  lines.forEach((line) => {
    if (isListItem(line)) {
      const item = normalizeListItem(line)
      if (item) {
        currentListItems.push(item)
      }
      return
    }

    flushList()

    if (isInlineRow(line)) {
      blocks.push({
        id: generateBlockId(),
        type: 'row',
        items: splitInlineItems(line),
      })
      return
    }

    if (isLabelLine(line)) {
      blocks.push({
        id: generateBlockId(),
        type: 'label',
        ...parseLabelLine(line),
      })
      return
    }

    blocks.push({
      id: generateBlockId(),
      type: 'text',
      content: line,
      variant: shouldEmphasizeProjectLine(sectionKey, line) ? 'heading' : '',
    })
  })

  flushList()
  return blocks
}

const parsedResume = computed(() => {
  const lines = normalizeInputLines.value
  const leadLines = []
  const sectionMap = new Map()
  let currentSectionKey = null

  const ensureSection = (key, rawTitle) => {
    if (!sectionMap.has(key)) {
      sectionMap.set(key, {
        key,
        sourceTitles: [],
        rawLines: [],
      })
    }

    const target = sectionMap.get(key)
    if (rawTitle && !target.sourceTitles.includes(rawTitle)) {
      target.sourceTitles.push(rawTitle)
    }
    return target
  }

  lines.forEach((line) => {
    const header = matchSectionHeader(line)
    if (header) {
      currentSectionKey = header.key
      ensureSection(header.key, header.rawTitle)
      return
    }

    if (!currentSectionKey) {
      leadLines.push(line)
      return
    }

    ensureSection(currentSectionKey).rawLines.push(line)
  })

  return {
    leadLines,
    sectionMap,
  }
})

const extractDisplayName = (line) => {
  if (!line) {
    return ''
  }

  const normalizedLine = line.trim()
  const match = normalizedLine.match(/(?:简历|履历|个人简历)\s*[-—:：｜|/\\]*\s*([\u4e00-\u9fa5A-Za-z·]{2,24})$/)
  if (match?.[1]) {
    return match[1].trim()
  }

  if (isLikelyName(normalizedLine)) {
    return normalizedLine
  }

  return ''
}

const isLikelyName = (line) => {
  if (!line || line.length > 24 || /\d{4}/.test(line)) {
    return false
  }

  if (isInlineRow(line) || isLabelLine(line)) {
    return false
  }

  return /^[A-Za-z\u4e00-\u9fa5·\s]{2,24}$/.test(line)
}

const isJobTargetLabel = (label) => /求职|应聘|方向|意向|岗位|目标/.test(label)

const isContactLikeLine = (line) => {
  return /@|电话|手机|邮箱|微信|地址|现居|居住|城市|GitHub|Github|博客|LinkedIn|出生|年龄|政治面貌/.test(line)
}

const uniquePush = (target, value, maxLength = 8) => {
  if (!value || target.includes(value) || target.length >= maxLength) {
    return
  }
  target.push(value)
}

// 个人信息区统一从“开头散落文本 + 个人信息相关区块”中提取，保证姓名、求职方向、联系方式收拢到同一块展示。
const profileHeader = computed(() => {
  const profileLines = parsedResume.value.sectionMap.get('profile')?.rawLines || []
  const sourceLines = [...parsedResume.value.leadLines, ...profileLines]

  if (!sourceLines.length) {
    return {
      name: '',
      jobTarget: '',
      metaItems: [],
      summaryLines: [],
    }
  }

  const metaItems = []
  const summaryLines = []
  let name = ''
  let jobTarget = ''

  sourceLines.forEach((line, index) => {
    if (!name && index === 0) {
      const displayName = extractDisplayName(line)
      if (displayName) {
        name = displayName
        return
      }
    }

    if (!name && isLikelyName(line)) {
      name = line
      return
    }

    if (isLabelLine(line)) {
      const parsed = parseLabelLine(line)
      const cleanLabel = parsed.label.replace(/[：:]/g, '')

      if (!jobTarget && isJobTargetLabel(cleanLabel)) {
        jobTarget = `${cleanLabel}：${parsed.content}` || line
        return
      }

      if (isContactLikeLine(line) || parsed.content.length <= 24) {
        uniquePush(metaItems, `${cleanLabel}：${parsed.content}`)
        return
      }
    }

    if (isInlineRow(line)) {
      splitInlineItems(line).forEach((item) => {
        if (!jobTarget && isJobTargetLabel(item)) {
          jobTarget = item
          return
        }
        uniquePush(metaItems, item)
      })
      return
    }

    if (!jobTarget && index <= 2 && line.length <= 20 && !isContactLikeLine(line)) {
      jobTarget = line
      return
    }

    if (isContactLikeLine(line) || line.length <= 22) {
      uniquePush(metaItems, line)
      return
    }

    uniquePush(summaryLines, line, 3)
  })

  return {
    name,
    jobTarget,
    metaItems,
    summaryLines,
  }
})

const resolveSectionTitle = (key, sourceTitles) => {
  if (key !== 'experience') {
    return SECTION_SPECS.find((item) => item.key === key)?.title || '简历内容'
  }

  const hasWorkTitle = sourceTitles.some((title) => /工作/.test(title))
  const hasInternTitle = sourceTitles.some((title) => /实习|测试/.test(title))
  if (hasWorkTitle && !hasInternTitle) {
    return '工作经历'
  }
  return '实习经历'
}

// 区块按固定顺序输出，只展示当前简历中真实存在的内容，避免标题混乱或顺序漂移。
const orderedSections = computed(() => {
  const result = []

  DISPLAY_ORDER.forEach((key) => {
    const section = parsedResume.value.sectionMap.get(key)
    if (!section || !section.rawLines.length) {
      return
    }

    result.push({
      key,
      title: resolveSectionTitle(key, section.sourceTitles),
      blocks: buildBlocksFromLines(key, section.rawLines),
    })
  })

  return result
})

const resolveCellRole = (index, total) => {
  if (total === 1 || index === 0) {
    return 'left'
  }
  if (index === total - 1) {
    return 'right'
  }
  return 'middle'
}

// ─── 块选中机制 ────────────────────────────────────────────────

const selectedBlockId = ref(null)
// 类型覆盖表：blockId → 覆盖后的类型（ref 对象，赋值触发 Vue 重渲染）
const blockTypeOverrides = ref({})
// 用户新增的 block（不在原始解析数据中）
const extraBlocks = ref([])

const getEffectiveType = (block) => blockTypeOverrides.value[block.id] || block.type

// 合并原始 sections 和用户新增的 block
const mergedSections = computed(() => {
  if (!extraBlocks.value.length) return orderedSections.value

  const result = orderedSections.value.map((s) => ({
    ...s,
    blocks: [...s.blocks],
  }))

  extraBlocks.value.forEach((eb) => {
    const target = result.find((s) => s.key === eb.sectionKey)
    if (target) {
      if (eb.block === null) {
        // 删除操作：移除指定位置的 block
        target.blocks.splice(eb.insertIndex, 1)
      } else {
        target.blocks.splice(eb.insertIndex, 0, eb.block)
      }
    } else if (eb.block !== null) {
      result.push({
        key: eb.sectionKey,
        title: eb.sectionKey,
        blocks: [eb.block],
      })
    }
  })

  // 过滤掉可能残留的 null blocks
  result.forEach((s) => {
    s.blocks = s.blocks.filter(Boolean)
  })

  return result
})

// 选中某个 block
const selectBlock = (blockId) => {
  selectedBlockId.value = blockId
}

// 查找 block 所属的 section 和在 blocks 数组中的索引（搜索合并后的 sections）
const findBlockLocation = (blockId) => {
  for (const section of mergedSections.value) {
    const idx = section.blocks.findIndex((b) => b.id === blockId)
    if (idx !== -1) {
      return { section, index: idx }
    }
  }
  return null
}

// 获取当前选中 block 的类型（考虑覆盖表）
const currentBlockType = computed(() => {
  if (!selectedBlockId.value) return null
  const loc = findBlockLocation(selectedBlockId.value)
  if (!loc) return null
  return getEffectiveType(loc.section.blocks[loc.index])
})

// 是否为第一个/最后一个 block
const isFirstBlock = computed(() => {
  if (!selectedBlockId.value) return true
  const allBlocks = mergedSections.value.flatMap((s) => s.blocks)
  return allBlocks.findIndex((b) => b.id === selectedBlockId.value) === 0
})

const isLastBlock = computed(() => {
  if (!selectedBlockId.value) return true
  const allBlocks = mergedSections.value.flatMap((s) => s.blocks)
  const idx = allBlocks.findIndex((b) => b.id === selectedBlockId.value)
  return idx === allBlocks.length - 1
})

// ─── 撤销/重做 ─────────────────────────────────────────────────

const undoStack = ref([])
const redoStack = ref([])
const canUndo = computed(() => undoStack.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)

// 同步所有 contenteditable 元素的文本到响应式数据
const syncAllContentFromDOM = () => {
  if (!resumeRef.value) return
  resumeRef.value.querySelectorAll('.resume-block[data-block-id]').forEach((blockEl) => {
    const blockId = blockEl.getAttribute('data-block-id')
    const editable = blockEl.querySelector('[contenteditable="true"]')
    if (!editable || !blockId) return
    const text = editable.textContent || ''
    const loc = findBlockLocation(blockId)
    if (loc) {
      const block = loc.section.blocks[loc.index]
      block.content = text
      if (block.items) block.items = [text]
    }
  })
}

// 保存响应式状态快照（extraBlocks + blockTypeOverrides）
const pushUndoSnapshot = () => {
  syncAllContentFromDOM()
  undoStack.value.push(JSON.stringify({
    extraBlocks: extraBlocks.value,
    blockTypeOverrides: blockTypeOverrides.value,
  }))
  redoStack.value = []
  if (undoStack.value.length > 50) undoStack.value.shift()
}

const undo = () => {
  if (!canUndo.value) return
  syncAllContentFromDOM()
  redoStack.value.push(JSON.stringify({
    extraBlocks: extraBlocks.value,
    blockTypeOverrides: blockTypeOverrides.value,
  }))
  const snapshot = JSON.parse(undoStack.value.pop())
  extraBlocks.value = snapshot.extraBlocks
  blockTypeOverrides.value = snapshot.blockTypeOverrides
  selectedBlockId.value = null
}

const redo = () => {
  if (!canRedo.value) return
  syncAllContentFromDOM()
  undoStack.value.push(JSON.stringify({
    extraBlocks: extraBlocks.value,
    blockTypeOverrides: blockTypeOverrides.value,
  }))
  const snapshot = JSON.parse(redoStack.value.pop())
  extraBlocks.value = snapshot.extraBlocks
  blockTypeOverrides.value = snapshot.blockTypeOverrides
  selectedBlockId.value = null
}

// ─── 工具栏操作函数 ────────────────────────────────────────────

// 查找选中 block 的 DOM 元素
const findSelectedBlockEl = () => {
  if (!selectedBlockId.value || !resumeRef.value) return null
  return resumeRef.value.querySelector(`.resume-block[data-block-id="${selectedBlockId.value}"]`)
}

// 获取选中 block 内的文本内容
const getBlockText = (blockEl) => {
  if (!blockEl) return ''
  const editable = blockEl.querySelector('[contenteditable="true"]')
  if (editable) return editable.textContent || ''
  return blockEl.textContent || ''
}

// 在 mergedSections 中查找 block（同时搜索 extraBlocks 的 sectionKey）
const findBlockInSections = (blockId) => {
  for (const section of mergedSections.value) {
    const idx = section.blocks.findIndex((b) => b.id === blockId)
    if (idx !== -1) return { section, index: idx }
  }
  return null
}

// 切换 block 类型
const setBlockType = (newType) => {
  const blockId = selectedBlockId.value
  if (!blockId) {
    ElMessage.warning('请先点击要操作的内容')
    return
  }
  const loc = findBlockInSections(blockId)
  const currentType = blockTypeOverrides.value[blockId] || loc?.section.blocks[loc.index]?.type

  if (newType === currentType) return

  pushUndoSnapshot()

  // 同步当前 DOM 文本到 block 数据
  const blockEl = findSelectedBlockEl()
  if (blockEl && loc) {
    const text = getBlockText(blockEl)
    const block = loc.section.blocks[loc.index]
    block.content = text
    if (block.items) block.items = [text]
  }

  // 切换类型
  if (blockTypeOverrides.value[blockId]) {
    const { [blockId]: _, ...rest } = blockTypeOverrides.value
    blockTypeOverrides.value = rest
  } else {
    blockTypeOverrides.value = { ...blockTypeOverrides.value, [blockId]: newType }
  }
}

const toggleSectionTitle = () => {
  const blockId = selectedBlockId.value
  if (!blockId) {
    ElMessage.warning('请先点击要操作的内容')
    return
  }
  const currentType = blockTypeOverrides.value[blockId] || findBlockInSections(blockId)?.section.blocks[findBlockInSections(blockId).index]?.type
  setBlockType(currentType === 'section_title' ? 'text' : 'section_title')
}

// 删除当前选中的 block（操作响应式数据）
const deleteCurrentBlock = () => {
  const blockId = selectedBlockId.value
  if (!blockId) {
    ElMessage.warning('请先点击要删除的内容')
    return
  }

  const loc = findBlockInSections(blockId)
  if (!loc) return

  if (loc.section.blocks.length <= 1) {
    ElMessage.warning('章节中至少保留一个内容块')
    return
  }

  pushUndoSnapshot()

  // 从 extraBlocks 或原始 blocks 中删除
  const extraIdx = extraBlocks.value.findIndex(
    (eb) => eb.sectionKey === loc.section.key && eb.block.id === blockId
  )
  if (extraIdx !== -1) {
    extraBlocks.value = extraBlocks.value.filter((_, i) => i !== extraIdx)
  } else {
    // 原始 block：通过添加一个负向 extraBlock 来删除（标记删除）
    extraBlocks.value = [
      ...extraBlocks.value,
      { sectionKey: loc.section.key, insertIndex: loc.index, block: null },
    ]
  }

  selectedBlockId.value = null
}

// 上移当前 block（操作响应式数据）
const moveCurrentBlockUp = () => {
  const blockId = selectedBlockId.value
  if (!blockId) return

  const loc = findBlockInSections(blockId)
  if (!loc || loc.index <= 0) return

  pushUndoSnapshot()

  const blocks = [...loc.section.blocks]
  const temp = blocks[loc.index - 1]
  blocks[loc.index - 1] = blocks[loc.index]
  blocks[loc.index] = temp

  // 更新 extraBlocks 中的顺序
  updateBlocksForSection(loc.section.key, blocks)
}

// 下移当前 block（操作响应式数据）
const moveCurrentBlockDown = () => {
  const blockId = selectedBlockId.value
  if (!blockId) return

  const loc = findBlockInSections(blockId)
  if (!loc || loc.index >= loc.section.blocks.length - 1) return

  pushUndoSnapshot()

  const blocks = [...loc.section.blocks]
  const temp = blocks[loc.index + 1]
  blocks[loc.index + 1] = blocks[loc.index]
  blocks[loc.index] = temp

  updateBlocksForSection(loc.section.key, blocks)
}

// 更新某个 section 的 blocks 顺序（通过 extraBlocks 重排）
const updateBlocksForSection = (sectionKey, newBlocks) => {
  // 重建 extraBlocks：保留其他 section 的，替换当前 section 的
  const otherExtras = extraBlocks.value.filter((eb) => eb.sectionKey !== sectionKey)
  const originalBlocks = orderedSections.value.find((s) => s.key === sectionKey)?.blocks || []
  const newExtras = []

  newBlocks.forEach((block, idx) => {
    const isOriginal = originalBlocks.some((ob) => ob.id === block.id)
    if (!isOriginal) {
      newExtras.push({ sectionKey, insertIndex: idx, block })
    }
  })

  extraBlocks.value = [...otherExtras, ...newExtras]
}

// 在当前 block 后新增段落
const insertTextBlockAfter = () => {
  const blockId = selectedBlockId.value
  let sectionKey = null
  let insertIndex = 0

  if (blockId) {
    const loc = findBlockInSections(blockId)
    if (loc) {
      sectionKey = loc.section.key
      insertIndex = loc.index + 1
    }
  }

  if (!sectionKey) {
    const firstSection = mergedSections.value[0]
    if (firstSection) {
      sectionKey = firstSection.key
      insertIndex = firstSection.blocks.length
    }
  }

  if (!sectionKey) return

  pushUndoSnapshot()

  const id = generateBlockId()
  const newBlock = { id, type: 'text', content: '请输入补充内容' }

  extraBlocks.value = [
    ...extraBlocks.value,
    { sectionKey, insertIndex, block: newBlock },
  ]

  nextTick(() => {
    const el = resumeRef.value?.querySelector(`.resume-block[data-block-id="${id}"]`)
    if (el) {
      const editable = el.querySelector('[contenteditable="true"]')
      if (editable) editable.focus()
    }
    selectedBlockId.value = id
  })
}

const syncActiveEditable = (event) => {
  const target = event?.target
  if (target instanceof HTMLElement && target.getAttribute('contenteditable') === 'true') {
    activeEditableEl.value = target
  }
}

// 编辑工具栏始终作用于当前聚焦的可编辑节点；如果用户选中了局部文本，则优先只修改选区。
const resolveEditingContext = () => {
  const selection = window.getSelection()
  const currentNode = selection?.anchorNode
  const currentElement =
    currentNode instanceof HTMLElement
      ? currentNode
      : currentNode?.parentElement || activeEditableEl.value
  const editableElement = currentElement?.closest?.('[contenteditable="true"]') || activeEditableEl.value

  if (!editableElement) {
    ElMessage.warning('请先点击简历中的可编辑内容')
    return null
  }

  return {
    selection,
    editableElement,
  }
}

const getSelectionWrapper = (selection) => {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null
  }

  const range = selection.getRangeAt(0)
  const wrapper = document.createElement('span')
  const fragment = range.extractContents()
  wrapper.appendChild(fragment)
  range.insertNode(wrapper)

  selection.removeAllRanges()
  const newRange = document.createRange()
  newRange.selectNodeContents(wrapper)
  selection.addRange(newRange)
  return wrapper
}

// 加粗能力兼容两种编辑方式：选中局部文本时只包裹选区，否则直接切换当前节点粗细。
const toggleBold = () => {
  const context = resolveEditingContext()
  if (!context) {
    return
  }

  const wrapper = getSelectionWrapper(context.selection)
  if (wrapper) {
    wrapper.style.fontWeight = wrapper.style.fontWeight === '700' ? '400' : '700'
    return
  }

  const currentWeight = window.getComputedStyle(context.editableElement).fontWeight
  context.editableElement.style.fontWeight =
    currentWeight === '700' || Number(currentWeight) >= 600 ? '400' : '700'
}

const updateFontSize = (delta) => {
  const context = resolveEditingContext()
  if (!context) {
    return
  }

  const wrapper = getSelectionWrapper(context.selection)
  const target = wrapper || context.editableElement
  const currentSize = Number.parseFloat(window.getComputedStyle(target).fontSize) || 14
  const nextSize = Math.min(28, Math.max(12, currentSize + delta))
  target.style.fontSize = `${nextSize}px`
}

const increaseFontSize = () => updateFontSize(1)

const decreaseFontSize = () => updateFontSize(-1)

// 重置：清除内联样式 + 恢复原始 block 类型
const resetCurrentStyle = () => {
  const blockId = selectedBlockId.value
  if (!blockId) return

  pushUndoSnapshot()

  // 清除类型覆盖
  if (blockTypeOverrides.value[blockId]) {
    const { [blockId]: _, ...rest } = blockTypeOverrides.value
    blockTypeOverrides.value = rest
  }

  // 清除内联样式
  const blockEl = findSelectedBlockEl()
  if (blockEl) {
    blockEl.querySelectorAll('[contenteditable="true"]').forEach((el) => {
      el.style.fontWeight = ''
      el.style.fontSize = ''
    })
  }
}

const focusEditableNode = (node) => {
  if (!(node instanceof HTMLElement)) {
    return
  }

  node.focus()
  const selection = window.getSelection()
  if (!selection) {
    return
  }

  const range = document.createRange()
  range.selectNodeContents(node)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
  activeEditableEl.value = node
}


// 键盘快捷键处理
const handleKeydown = (e) => {
  // Ctrl+Z 撤销
  if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    undo()
    return
  }
  // Ctrl+Y 或 Ctrl+Shift+Z 重做
  if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
    e.preventDefault()
    redo()
    return
  }
  // Ctrl+Delete 删除当前 block
  if (e.ctrlKey && e.key === 'Delete') {
    e.preventDefault()
    deleteCurrentBlock()
    return
  }
  // Ctrl+ArrowUp 上移
  if (e.ctrlKey && e.key === 'ArrowUp') {
    e.preventDefault()
    moveCurrentBlockUp()
    return
  }
  // Ctrl+ArrowDown 下移
  if (e.ctrlKey && e.key === 'ArrowDown') {
    e.preventDefault()
    moveCurrentBlockDown()
    return
  }
}

// 初始化：绑定键盘事件
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})

const removeEditableAttributes = (rootNode) => {
  rootNode.querySelectorAll('[contenteditable]').forEach((node) => {
    node.removeAttribute('contenteditable')
    node.removeAttribute('spellcheck')
  })
}

// 直接下载 PDF 时复用一个脱离页面的克隆节点，避免把预览态输入控件和焦点态样式一起导出。
// 同时移除占位提示文字（如"导出时将保留当前照片"），确保 PDF 干净。
const buildPdfSourceElement = () => {
  if (!resumeRef.value) {
    return null
  }

  const clone = resumeRef.value.cloneNode(true)
  clone.classList.remove('resume-template--preview')
  clone.classList.add('resume-template--print')
  removeEditableAttributes(clone)
  clone.querySelector('.editor-toolbar')?.remove()

  // 移除头像提示文字，避免"导出时将保留当前照片"出现在 PDF 中
  const photoTip = clone.querySelector('[data-role="photo-tip"]')
  if (photoTip) {
    photoTip.remove()
  }

  return clone
}

// 导出专用克隆节点：移除所有非导出元素（提示文字、上传按钮、操作区），确保截图干净。
const buildExportElement = () => {
  if (!resumeRef.value) {
    return null
  }

  const clone = resumeRef.value.cloneNode(true)
  clone.classList.remove('resume-template--preview')
  clone.classList.add('resume-template--print')
  removeEditableAttributes(clone)
  clone.querySelector('.editor-toolbar')?.remove()

  // 移除所有不需要出现在导出结果中的元素
  clone.querySelectorAll('[data-role="photo-tip"], .photo-input, .photo-actions').forEach((el) => {
    el.remove()
  })

  return clone
}

// 头像在前端本地转为 data URL，既能即时预览，也能在打印页中直接复用，避免 about:blank 打印页丢失本地文件引用。
const handlePhotoChange = (event) => {
  const file = event.target.files?.[0]
  if (!file) {
    return
  }

  if (!file.type.startsWith('image/')) {
    event.target.value = ''
    return
  }

  // 限制头像文件大小不超过 5MB
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

// 复制与导出都以当前页面上已编辑后的真实文本为准，避免继续使用 AI 原始文本造成内容回退。
const getResumePlainText = () => {
  if (!resumeRef.value) {
    return ''
  }

  const lines = []
  const profileTitle = resumeRef.value.querySelector('.resume-section--profile [data-role="section-title"]')?.textContent?.trim()
  const profileName = resumeRef.value.querySelector('[data-role="profile-name"]')?.textContent?.trim()
  const profileTarget = resumeRef.value.querySelector('[data-role="profile-target"]')?.textContent?.trim()
  const profileMeta = Array.from(resumeRef.value.querySelectorAll('[data-role="profile-meta"]'))
    .map((node) => node.textContent?.trim() || '')
    .filter(Boolean)
  const profileSummary = Array.from(resumeRef.value.querySelectorAll('[data-role="profile-summary"]'))
    .map((node) => node.textContent?.trim() || '')
    .filter(Boolean)

  if (profileTitle) {
    lines.push(profileTitle)
  }
  if (profileName) {
    lines.push(profileName)
  }
  if (profileTarget) {
    lines.push(profileTarget)
  }
  if (profileMeta.length) {
    lines.push(profileMeta.join(' | '))
  }
  profileSummary.forEach((item) => lines.push(item))

  Array.from(resumeRef.value.querySelectorAll('.resume-main [data-role="section"]')).forEach((sectionNode) => {
    const title = sectionNode.querySelector('[data-role="section-title"]')?.textContent?.trim()
    if (title) {
      lines.push('')
      lines.push(title)
    }

    Array.from(sectionNode.querySelectorAll('.resume-block')).forEach((blockNode) => {
      const blockType = blockNode.getAttribute('data-block-type')
      if (blockType === 'row') {
        const cells = Array.from(blockNode.querySelectorAll('[data-role="row-cell"]'))
          .map((node) => node.textContent?.trim() || '')
          .filter(Boolean)
        if (cells.length) {
          lines.push(cells.join(' | '))
        }
        return
      }

      if (blockType === 'label') {
        const label = blockNode.querySelector('[data-role="label-key"]')?.textContent?.trim() || ''
        const value = blockNode.querySelector('[data-role="label-value"]')?.textContent?.trim() || ''
        if (label || value) {
          lines.push(`${label}${value}`)
        }
        return
      }

      if (blockType === 'section_title') {
        const sectionTitle = blockNode.querySelector('[data-role="section-title"]')?.textContent?.trim()
        if (sectionTitle) {
          lines.push('')
          lines.push(sectionTitle)
        }
        return
      }

      if (blockType === 'list') {
        Array.from(blockNode.querySelectorAll('[data-role="list-item"]')).forEach((itemNode) => {
          const itemText = itemNode.textContent?.trim()
          if (itemText) {
            lines.push(`- ${itemText}`)
          }
        })
        return
      }

      const textLine = blockNode.querySelector('[data-role="text-block"]')?.textContent?.trim()
      if (textLine) {
        lines.push(textLine)
      }
    })
  })

  return lines.join('\n').trim()
}

const getResumeName = () => {
  return resumeRef.value?.querySelector('[data-role="profile-name"]')?.textContent?.trim() || ''
}

// 导出结构化文档 JSON（仅保存最终合并后的 sections，不单独存 extraBlocks/blockTypeOverrides）
// PDF 导出继续使用浏览器打印流，保留真实文字和空白头像位，方便后续补图或二次调整。
const buildPrintHtml = () => {
  if (!resumeRef.value) {
    return ''
  }

  const clone = buildPdfSourceElement()
  if (!clone) {
    return ''
  }

  const headHtml = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n')

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <title>简历导出</title>
        ${headHtml}
        <style>
          @page {
            size: A4;
            margin: 9mm;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        </style>
      </head>
      <body>
        ${clone.outerHTML}
        <script>
          window.onload = function () {
            setTimeout(function () {
              window.focus();
              window.print();
            }, 160);
          };
          window.onafterprint = function () {
            window.close();
          };
        <\/script>
      </body>
    </html>
  `
}

defineExpose({
  resumeRef,
  getResumePlainText,
  getResumeName,
  buildPdfSourceElement,
  buildExportElement,
  buildPrintHtml,
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
}

[data-theme="dark"] .resume-template {
  --resume-accent: #5fb5a7;
  --resume-accent-soft: #1a2e2c;
  --resume-gold: #d4a574;
  --resume-text: #e2e8f0;
  --resume-muted: #94a3b8;
  --resume-line: #3a4a48;
  width: 100%;
  box-sizing: border-box;
}

.resume-template--preview {
  max-width: 980px;
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

.editor-tool {
  min-width: 44px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(27, 91, 87, 0.2);
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

.editor-tool:hover {
  border-color: rgba(27, 91, 87, 0.52);
  box-shadow: 0 6px 14px rgba(27, 91, 87, 0.1);
  transform: translateY(-1px);
}

.editor-tool:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.editor-tool--active {
  background: var(--resume-accent, #1b5b57);
  color: var(--bg-card, #fff);
  border-color: var(--resume-accent, #1b5b57);
}

.resume-block.is-selected {
  outline: 2px dashed var(--resume-accent, #1b5b57);
  outline-offset: 2px;
  border-radius: 4px;
  background: rgba(27, 91, 87, 0.04);
}

.resume-block .resume-section-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 0;
}

.toolbar-separator {
  width: 1px;
  height: 24px;
  background: rgba(27, 91, 87, 0.2);
  margin: 0 4px;
  align-self: center;
}

.resume-template--print {
  width: 190mm;
  margin: 0 auto;
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

/* 打印模式下收紧间距，优先保证内容在一页内 */
.resume-template--print .resume-main {
  margin-top: 10px;
}

.resume-template--print .resume-section + .resume-section {
  margin-top: 12px;
}

.resume-template--print .resume-section-head {
  margin-bottom: 8px;
}

.resume-template--print .profile-card {
  padding: 4px 0 6px;
  gap: 16px;
}

/* 打印模式下将 Grid 改为 table 布局，html2canvas 对 table 渲染更准确，
   避免 fr 单位计算偏差导致列内文字意外换行。 */
.resume-template--print .entry-row {
  display: table;
  width: 100%;
  table-layout: fixed;
  border-spacing: 0;
  gap: 0;
}

.resume-template--print .entry-cell {
  display: table-cell;
  vertical-align: baseline;
  padding-right: 16px;
  word-break: normal;
}

.resume-template--print .entry-cell:last-child {
  padding-right: 0;
}

/* 按原始 Grid 比例分配列宽：1.5fr : 1fr : 0.85fr */
.resume-template--print .entry-cell--left {
  width: 45%;
}

.resume-template--print .entry-cell--middle {
  width: 30%;
}

.resume-template--print .entry-cell--right {
  width: 25%;
  text-align: right;
}

.resume-main {
  margin-top: 14px;
}

.resume-section + .resume-section {
  margin-top: 18px;
}

.resume-section-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
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

.section-title {
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

.profile-main {
  min-width: 0;
}

.profile-name-row {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
}

.profile-name {
  margin: 0;
  font-size: 38px;
  line-height: 1.06;
  font-weight: 800;
  color: var(--resume-text, #143f45);
  letter-spacing: 0.06em;
}

.profile-target {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
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

.profile-meta-item {
  min-width: 0;
  font-size: 14px;
  line-height: 1.72;
  color: var(--resume-muted);
  word-break: break-word;
}

.profile-meta-item--wide {
  grid-column: 1 / -1;
  font-weight: 600;
  color: #334155;
}

.profile-summary {
  margin-top: 12px;
  padding: 10px 12px;
  border-left: 2px solid rgba(27, 91, 87, 0.22);
  background: rgba(232, 240, 238, 0.32);
}

.profile-summary-line {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
}

.profile-summary-line + .profile-summary-line {
  margin-top: 4px;
}

.profile-photo {
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
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 118px;
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
  gap: 8px;
}

.resume-block {
  min-width: 0;
}

.entry-row {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) minmax(118px, 0.85fr);
  gap: 16px;
  align-items: baseline;
}

.entry-cell {
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
.text-line {
  margin: 0;
  font-size: 14px;
  line-height: 1.82;
  color: #24323f;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-line--heading {
  font-size: 15px;
  font-weight: 700;
  color: #173a52;
}

.label-key {
  margin-right: 6px;
  font-weight: 700;
  color: #253542;
}

.label-value {
  color: #425466;
}

.bullet-list {
  margin: 0;
  padding: 0 0 0 18px;
}

.bullet-item {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: #24323f;
  white-space: pre-wrap;
  word-break: break-word;
}

.bullet-item + .bullet-item {
  margin-top: 4px;
}

[contenteditable="true"] {
  outline: none;
}

[contenteditable="true"]:focus {
  background: rgba(191, 219, 254, 0.26);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.16);
}

.resume-template--print [contenteditable="true"]:focus {
  background: transparent;
  box-shadow: none;
}

.resume-template--print .photo-input,
.resume-template--print .photo-actions,
.resume-template--print .photo-tip,
.resume-template--print .editor-toolbar {
  display: none;
}

/* 打印/导出模式下移除头像描边，保持干净外观 */
.resume-template--print .photo-frame {
  border: none;
  background: var(--bg-elevated, #f3f6f5);
}

/* 无照片时也用纯色背景，不显示斜纹占位 */
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

  .profile-name {
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
