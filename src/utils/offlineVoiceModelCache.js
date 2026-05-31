const OFFLINE_VOICE_MODEL_STATUS_KEY = 'ai_resume_offline_voice_model_status'
const OFFLINE_VOICE_CACHE_NAME = 'ai-resume-offline-voice-models-v1'
const VALID_MODEL_STATUS = Object.freeze(['pending', 'downloading', 'ready', 'failed'])

const normalizeFileList = (files = [], baseUrl = '') => (
  Array.isArray(files)
    ? files
      .map((file) => {
        const path = typeof file === 'string' ? file : file?.path
        if (!path) return null
        const explicitUrl = typeof file?.url === 'string' ? file.url : ''
        return {
          path,
          size: Number(file?.size || 0),
          url: explicitUrl || (/^https?:\/\//.test(path) || path.startsWith('/')
            ? path
            : `${baseUrl}${path}`)
        }
      })
      .filter(Boolean)
    : []
)

const resolveManifestRelativeUrl = (value = '', baseUrl = '') => {
  if (!value) return ''
  return /^https?:\/\//.test(value) || value.startsWith('/')
    ? value
    : `${baseUrl}${value}`
}

const isHtmlResponse = async (response) => {
  const contentType = response.headers?.get?.('content-type') || ''
  if (contentType.includes('text/html')) return true
  const clonedResponse = response.clone?.()
  if (!clonedResponse?.text) return false
  const text = await clonedResponse.text()
  const trimmed = text.trim()
  return /^<!doctype\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)
}

const clampProgress = (value) => {
  const progress = Number(value)
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) return 0
  return Math.round(progress)
}

const normalizeModelStatus = (modelKey, status = {}) => ({
  modelKey,
  status: VALID_MODEL_STATUS.includes(status.status) ? status.status : 'pending',
  progress: clampProgress(status.progress),
  version: typeof status.version === 'string' ? status.version : '',
  manifestUrl: typeof status.manifestUrl === 'string' ? status.manifestUrl : '',
  runtime: typeof status.runtime === 'string' ? status.runtime : '',
  files: Array.isArray(status.files) ? status.files : []
})

const resolveCachePrefix = (status) => {
  const manifestUrl = typeof status.manifestUrl === 'string' ? status.manifestUrl : ''
  if (!manifestUrl) return ''
  return manifestUrl.slice(0, manifestUrl.lastIndexOf('/') + 1)
}

const isCacheRequestUnderPrefix = (request, prefix) => {
  if (!prefix) return false
  const requestUrl = typeof request === 'string' ? request : request?.url || ''
  if (!requestUrl) return false
  try {
    return new URL(requestUrl, window.location.origin).pathname.startsWith(prefix)
  } catch {
    return requestUrl.startsWith(prefix)
  }
}

const readStatusMap = () => {
  if (typeof localStorage === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_VOICE_MODEL_STATUS_KEY) || '{}') || {}
  } catch {
    return {}
  }
}

const writeStatusMap = (statusMap) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(OFFLINE_VOICE_MODEL_STATUS_KEY, JSON.stringify(statusMap))
}

const assertCacheApi = () => {
  if (typeof caches === 'undefined') {
    throw new Error('当前浏览器不支持 Cache API，无法缓存离线语音识别模型')
  }
}

/**
 * 检测浏览器是否具备离线语音识别模型持久化所需能力。
 */
export function getOfflineVoiceStorageSupport() {
  const indexedDB = typeof window !== 'undefined' && 'indexedDB' in window
  const cacheApi = typeof caches !== 'undefined'
  return {
    indexedDB,
    cacheApi,
    supported: indexedDB || cacheApi
  }
}

/**
 * 读取某个离线识别模型的本地缓存状态。
 */
export function getOfflineVoiceModelStatus(modelKey) {
  const statusMap = readStatusMap()
  return normalizeModelStatus(modelKey, statusMap[modelKey])
}

/**
 * 保存离线识别模型状态元数据，真实模型文件由 Cache API 单独持久化。
 */
export function saveOfflineVoiceModelStatus(modelKey, status) {
  const statusMap = readStatusMap()
  const normalized = normalizeModelStatus(modelKey, status)
  statusMap[modelKey] = normalized
  writeStatusMap(statusMap)
  return normalized
}

/**
 * 读取静态目录中的识别模型清单，并把相对路径归一为可缓存 URL。
 */
export async function readModelManifest(modelKey, manifestUrl) {
  const response = await fetch(manifestUrl, { cache: 'no-cache' })
  if (!response.ok) {
    throw new Error(`离线语音识别模型清单加载失败: ${response.status}`)
  }
  const contentType = response.headers?.get?.('content-type') || ''
  const bodyText = await response.text()
  const trimmedBody = bodyText.trim()

  // Vite/SPA 在静态模型未部署时可能返回 index.html，这里转成明确的部署提示。
  if (
    contentType.includes('text/html') ||
    /^<!doctype\s+html/i.test(trimmedBody) ||
    /^<html[\s>]/i.test(trimmedBody)
  ) {
    throw new Error(`离线语音识别模型清单不是 JSON，请确认模型文件已部署到 ${manifestUrl}`)
  }

  let manifest
  try {
    manifest = JSON.parse(bodyText)
  } catch {
    throw new Error(`离线语音识别模型清单解析失败，请检查 ${manifestUrl}`)
  }
  const baseUrl = manifestUrl.slice(0, manifestUrl.lastIndexOf('/') + 1)
  return {
    modelKey,
    manifestUrl,
    version: String(manifest.version || ''),
    baseUrl,
    runtime: resolveManifestRelativeUrl(manifest.runtime || '', baseUrl),
    files: normalizeFileList(manifest.files, baseUrl)
  }
}

/**
 * 按 manifest 下载并缓存识别模型文件。音频识别资源只保存在当前浏览器本地，不上传用户音频。
 */
export async function downloadModelFromManifest(modelKey, manifestUrl, onProgress) {
  assertCacheApi()
  const previousStatus = getOfflineVoiceModelStatus(modelKey)
  if (previousStatus.status === 'ready' && await isModelCached(modelKey)) {
    return previousStatus
  }
  let manifest
  try {
    manifest = await readModelManifest(modelKey, manifestUrl)
  } catch (error) {
    saveOfflineVoiceModelStatus(modelKey, {
      status: 'failed',
      progress: 0,
      manifestUrl,
      version: previousStatus.version,
      runtime: previousStatus.runtime,
      files: previousStatus.files
    })
    throw error
  }
  const files = manifest.files
  if (!files.length) {
    throw new Error('离线语音识别模型清单没有可下载文件')
  }

  const totalSize = files.reduce((sum, file) => sum + Number(file.size || 0), 0)
  let loadedSize = 0
  saveOfflineVoiceModelStatus(modelKey, {
    status: 'downloading',
    progress: 0,
    version: manifest.version,
    manifestUrl,
    runtime: manifest.runtime,
    files
  })

  const cache = await caches.open(OFFLINE_VOICE_CACHE_NAME)
  for (const file of files) {
    let response
    try {
      response = await fetch(file.url)
    } catch {
      saveOfflineVoiceModelStatus(modelKey, {
        status: 'failed',
        progress: clampProgress(totalSize ? (loadedSize / totalSize) * 100 : 0),
        version: manifest.version,
        manifestUrl,
        runtime: manifest.runtime,
        files
      })
      throw new Error(`离线语音识别模型文件请求失败，请先将 ${file.path} 部署到同源静态目录`)
    }
    if (!response.ok || await isHtmlResponse(response)) {
      saveOfflineVoiceModelStatus(modelKey, {
        status: 'failed',
        progress: clampProgress(totalSize ? (loadedSize / totalSize) * 100 : 0),
        version: manifest.version,
        manifestUrl,
        runtime: manifest.runtime,
        files
      })
      throw new Error(`离线语音识别模型文件不是有效模型资源，请确认已部署 ${file.path}`)
    }
    await cache.put(file.url, response.clone())
    loadedSize += Number(file.size || 0)
    const progress = clampProgress(totalSize ? (loadedSize / totalSize) * 100 : (files.indexOf(file) + 1) / files.length * 100)
    onProgress?.(progress)
    saveOfflineVoiceModelStatus(modelKey, {
      status: 'downloading',
      progress,
      version: manifest.version,
      manifestUrl,
      runtime: manifest.runtime,
      files
    })
  }

  return saveOfflineVoiceModelStatus(modelKey, {
    status: 'ready',
    progress: 100,
    version: manifest.version,
    manifestUrl,
    runtime: manifest.runtime,
    files
  })
}

/**
 * 校验模型状态和关键文件缓存是否都存在。
 */
export async function isModelCached(modelKey) {
  const status = getOfflineVoiceModelStatus(modelKey)
  if (status.status !== 'ready' || !status.files.length || typeof caches === 'undefined') {
    return false
  }
  const cache = await caches.open(OFFLINE_VOICE_CACHE_NAME)
  const matches = await Promise.all(status.files.map((file) => cache.match(file.url)))
  return matches.every(Boolean)
}

/**
 * 清理某个离线识别模型的本地缓存和状态。
 */
export async function clearModelCache(modelKey) {
  const status = getOfflineVoiceModelStatus(modelKey)
  if (typeof caches !== 'undefined') {
    const cache = await caches.open(OFFLINE_VOICE_CACHE_NAME)
    if (status.files.length) {
      await Promise.all(status.files.map((file) => cache.delete(file.url)))
    } else if (typeof cache.keys === 'function') {
      const cachePrefix = resolveCachePrefix(status)
      const cachedRequests = await cache.keys()
      // 兼容旧失败状态：files 为空时按 manifest 所在目录清理残留模型文件，避免长期占用浏览器缓存。
      await Promise.all(cachedRequests
        .filter((request) => isCacheRequestUnderPrefix(request, cachePrefix))
        .map((request) => cache.delete(request)))
    }
  }
  return saveOfflineVoiceModelStatus(modelKey, {
    status: 'pending',
    progress: 0,
    version: '',
    manifestUrl: '',
    runtime: '',
    files: []
  })
}
