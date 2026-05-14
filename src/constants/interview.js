/**
 * 面试模块共享常量
 */

/** 难度级别映射：数值 → 中文标签 */
export const DIFFICULTY_LABEL_MAP = {
  1: '初级',
  2: '中级',
  3: '高级'
}

/** 难度级别映射：数值 → Element Plus Tag 类型 */
export const DIFFICULTY_TAG_MAP = {
  1: { text: '初级', type: 'success' },
  2: { text: '中级', type: 'warning' },
  3: { text: '高级', type: 'danger' }
}

/**
 * 获取难度级别的中文标签
 * @param {number} difficulty - 难度值（1/2/3）
 * @param {string} fallback - 默认值
 * @returns {string}
 */
export function getDifficultyLabel(difficulty, fallback = '未知') {
  return DIFFICULTY_LABEL_MAP[difficulty] || fallback
}

/** 难度级别映射：英文 key → 数值（用于前端选项值转 API 参数） */
export const STRING_TO_DIFFICULTY = {
  primary: 1,
  intermediate: 2,
  advanced: 3
}

/** 难度级别映射：数值 → 英文 key（用于路由 query 传递） */
export const DIFFICULTY_KEY_MAP = {
  1: 'primary',
  2: 'intermediate',
  3: 'advanced'
}
