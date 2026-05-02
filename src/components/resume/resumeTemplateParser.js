 let blockIdSeed = 0

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

const generateBlockId = () => `resume_block_${++blockIdSeed}`

const escapeHtml = (value) => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const wrapParagraphHtml = (value) => {
  return `<p>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`
}

const uniquePush = (target, value, maxLength = 8) => {
  if (!value || target.includes(value) || target.length >= maxLength) {
    return
  }
  target.push(value)
}

const createStyleModel = () => ({
  fontSize: null,
  fontWeight: null,
})

const createTextBlock = (content, variant = '') => ({
  id: generateBlockId(),
  type: 'text',
  variant,
  html: wrapParagraphHtml(content),
  style: createStyleModel(),
})

const createSectionTitleBlock = (content) => ({
  id: generateBlockId(),
  type: 'section_title',
  html: wrapParagraphHtml(content),
  style: createStyleModel(),
})

const createBannerTitleBlock = (title) => ({
  id: generateBlockId(),
  type: 'banner_title',
  title,
  style: createStyleModel(),
})

const createLabelBlock = (label, value) => ({
  id: generateBlockId(),
  type: 'label',
  label,
  value,
  style: createStyleModel(),
})

const createRowBlock = (items) => ({
  id: generateBlockId(),
  type: 'row',
  items: items.map((item) => ({
    id: generateBlockId(),
    value: item,
  })),
  style: createStyleModel(),
})

const normalizeInputLines = (text) => {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

const normalizeTitleText = (line) => {
  return line
    .replace(/^[【\[]/, '')
    .replace(/[】\]]$/, '')
    .replace(/^[0-9一二三四五六七八九十]+[、.)）\]]*\s*/, '')
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

const isContactLikeLine = (line) => {
  return /@|电话|手机|邮箱|微信|地址|现居|居住|城市|GitHub|Github|博客|LinkedIn|出生|年龄|政治面貌/.test(line)
}

const isJobTargetLabel = (label) => /求职|应聘|方向|意向|岗位|目标/.test(label)

const isLikelyName = (line) => {
  if (!line || line.length > 24 || /\d{4}/.test(line)) {
    return false
  }
  if (isInlineRow(line) || isLabelLine(line)) {
    return false
  }
  return /^[A-Za-z\u4e00-\u9fa5·\s]{2,24}$/.test(line)
}

const extractDisplayName = (line) => {
  if (!line) {
    return ''
  }

  const normalizedLine = line.trim()
  const match = normalizedLine.match(/(?:简历|个人简历)\s*[-—:：/]?\s*([\u4e00-\u9fa5A-Za-z·]{2,24})$/)
  if (match?.[1]) {
    return match[1].trim()
  }

  if (isLikelyName(normalizedLine)) {
    return normalizedLine
  }

  return ''
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

const shouldUseSubTitleBlock = (line, nextLine) => {
  if (!line || line.length > 16) {
    return false
  }
  if (isInlineRow(line) || isLabelLine(line) || isListItem(line)) {
    return false
  }
  if (/[，,。；;：:]/.test(line)) {
    return false
  }
  if (!nextLine) {
    return false
  }
  return isInlineRow(nextLine) || isLabelLine(nextLine) || nextLine.length >= line.length
}

const resolveSectionTitle = (key, sourceTitles) => {
  if (key !== 'experience') {
    return SECTION_SPECS.find((item) => item.key === key)?.title || '简历内容'
  }

  if (sourceTitles.includes('工作经历') || sourceTitles.includes('工作经验')) {
    return '工作经历'
  }

  return '实习经历'
}

const buildBlocksFromLines = (sectionKey, lines) => {
  const blocks = []

  lines.forEach((line, index) => {
    const nextLine = lines[index + 1] || ''

    if (isListItem(line)) {
      const item = normalizeListItem(line)
      if (item) {
        blocks.push(createTextBlock(item, 'bullet'))
      }
      return
    }

    if (shouldUseSubTitleBlock(line, nextLine)) {
      blocks.push(createSectionTitleBlock(line))
      return
    }

    if (isInlineRow(line)) {
      blocks.push(createRowBlock(splitInlineItems(line)))
      return
    }

    if (isLabelLine(line)) {
      const parsed = parseLabelLine(line)
      blocks.push(createLabelBlock(parsed.label, parsed.content))
      return
    }

    blocks.push(createTextBlock(line, shouldEmphasizeProjectLine(sectionKey, line) ? 'heading' : ''))
  })

  return blocks
}

const buildProfileHeader = (leadLines, profileLines) => {
  const sourceLines = [...leadLines, ...profileLines]
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
        jobTarget = parsed.content
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
    sectionTitle: '个人信息',
    name,
    jobTarget,
    metaItems: metaItems.map((item) => ({
      id: generateBlockId(),
      value: item,
    })),
    summaryLines: summaryLines.map((item) => ({
      id: generateBlockId(),
      value: item,
    })),
  }
}

/**
 * 将 AI 返回的纯文本简历解析为前端模板使用的数据模型。
 * 这里统一处理章节别名、头部信息抽取与正文块类型归类，避免模板组件继续承担解析职责。
 */
export const buildResumeTemplateModel = (text) => {
  const lines = normalizeInputLines(text)
  const leadLines = []
  const sectionMap = new Map()
  let currentSectionKey = null

  const ensureSection = (key, rawTitle = '') => {
    if (!sectionMap.has(key)) {
      sectionMap.set(key, {
        key,
        sourceTitles: [],
        rawLines: [],
      })
    }

    const section = sectionMap.get(key)
    if (rawTitle && !section.sourceTitles.includes(rawTitle)) {
      section.sourceTitles.push(rawTitle)
    }
    return section
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

  const header = buildProfileHeader(leadLines, sectionMap.get('profile')?.rawLines || [])
  const sections = []

  DISPLAY_ORDER.forEach((key) => {
    const sourceSection = sectionMap.get(key)
    if (!sourceSection || !sourceSection.rawLines.length) {
      return
    }

    sections.push({
      id: generateBlockId(),
      key,
      title: resolveSectionTitle(key, sourceSection.sourceTitles),
      blocks: buildBlocksFromLines(key, sourceSection.rawLines),
    })
  })

  if (!sections.length) {
    sections.push({
      id: generateBlockId(),
      key: 'content',
      title: '简历内容',
      blocks: leadLines.length ? buildBlocksFromLines('content', leadLines) : [createTextBlock('请在这里补充简历内容')],
    })
  }

  return {
    header,
    sections,
  }
}

export const createEmptyTextBlock = () => createTextBlock('')

export const createEmptySectionTitleBlock = () => createSectionTitleBlock('请输入小标题')

export const createEmptyLabelBlock = () => createLabelBlock('标签：', '请输入内容')
