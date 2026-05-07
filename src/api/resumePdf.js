import axios from 'axios'
import { getToken, getTokenType, removeToken, isLoggedIn } from '@/utils/auth'
import router from '@/router'

/**
 * 构建带认证头的请求配置（生成和下载接口共用）
 */
function buildAuthConfig(extraConfig = {}) {
  if (!isLoggedIn()) {
    removeToken()
    const currentPath = router.currentRoute?.value?.fullPath || '/'
    router.push({ path: '/login', query: { redirect: currentPath } })
    throw new Error('请先登录')
  }

  const headers = {}
  const token = getToken()
  if (token) {
    headers.Authorization = `${getTokenType()} ${token}`
  }

  return { headers, ...extraConfig }
}

/**
 * 步骤一：调用后端生成 PDF
 *
 * 后端返回 Result 格式 JSON: { code: 200, message: "PDF 生成成功", data: { fileId, fileName, fileSize } }
 * 前端只关注 code === 200 且 message 为 "PDF 生成成功"。
 *
 * @param {string} html - 完整 HTML（含内联 CSS）
 * @returns {Promise<{ fileId: string, fileName: string, fileSize: number }>}
 */
export async function exportPdfFromHtml(html) {
  const config = buildAuthConfig({ timeout: 60000 })

  return axios.post('/api/resume/export-pdf', { html }, config)
    .then((res) => {
      const { code, message, data } = res.data
      if (code !== 200 || !data?.fileId) {
        throw new Error(message || 'PDF 生成失败')
      }
      console.log('[PDF生成] 成功，fileId:', data.fileId, '大小:', (data.fileSize / 1024).toFixed(1), 'KB')
      return data
    })
    .catch((err) => {
      if (err.response) {
        const { status, data } = err.response

        if (status === 401) {
          removeToken()
          const currentPath = router.currentRoute?.value?.fullPath || '/'
          router.push({ path: '/login', query: { redirect: currentPath } })
          throw new Error('登录已过期，请重新登录')
        }

        if (data?.message) throw new Error(data.message)
        throw new Error(`服务端错误 (${status})`)
      }

      if (err.code === 'ECONNABORTED') throw new Error('PDF 生成请求超时，请稍后重试')
      if (err.message === 'Network Error') throw new Error('网络连接失败，请检查网络后重试')
      throw err
    })
}

/**
 * 步骤二：根据 fileId 下载 PDF 文件到本地
 *
 * 后端返回 application/pdf 文件流，用 Axios blob 方式接收，
 * 再通过临时 <a> 标签触发浏览器保存对话框（可携带 JWT 认证头）。
 *
 * @param {string} fileId - 步骤一返回的文件唯一标识
 * @returns {Promise<void>}
 */
export function downloadPdfFile(fileId, fileName) {
  if (!fileId) {
    throw new Error('缺少文件标识，无法下载')
  }

  const token = getToken()
  if (!token) {
    throw new Error('未登录或登录已过期，请重新登录')
  }

  // 用 <a> 标签直接指向后端下载地址，不用 Axios/XHR
  // 原因：后端返回 Content-Disposition: attachment 时，IDM 等下载器会拦截 XHR 响应，
  // 导致 Axios 拿到残缺 blob → 生成假的 blob: URL → 双重下载（一个真一个假）。
  // 直接导航到后端 URL 只需一次 HTTP 请求，下载器正确拦截，没有 blob 中间层。
  const a = document.createElement('a')
  a.href = `/api/resume/download-pdf/${fileId}?token=${encodeURIComponent(token)}`
  a.download = fileName || `resume-${fileId}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  console.log('[PDF下载] 触发下载，fileId:', fileId, 'fileName:', fileName)
}

/**
 * 将 DOM 元素序列化为带内联 CSS 的完整 HTML 字符串。
 */
export function serializeElementToHtml(element, cssText) {
  const clone = element.cloneNode(true)

  clone.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      if (attr.name.startsWith('data-v-')) node.removeAttribute(attr.name)
    })
  })
  Array.from(clone.attributes).forEach((attr) => {
    if (attr.name.startsWith('data-v-')) clone.removeAttribute(attr.name)
  })

  clone.querySelectorAll('style').forEach((s) => {
    s.removeAttribute('scoped')
    s.removeAttribute('data-v-')
  })

  clone.querySelectorAll('.photo-frame img, .header-photo img').forEach((img) => {
    const src = img.getAttribute('src') || ''
    if (!src || src === 'about:blank') img.remove()
  })

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=190mm">
<style>${cssText}</style>
</head>
<body>${clone.outerHTML}</body>
</html>`
}

/**
 * 清除 CSS 中的 [data-v-xxxxx] scoped 选择器后缀。
 */
export function stripScopedSelectors(css) {
  return css.replace(/\[data-v-[a-f0-9]+\]/g, '')
}
