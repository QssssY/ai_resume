import path from 'node:path'

const VOICE_MODEL_PREFIX = '/voice-models/'

export function resolveVoiceModelContentType(filePath = '') {
  const normalizedPath = filePath.toLowerCase()
  if (normalizedPath.endsWith('.js')) return 'text/javascript; charset=utf-8'
  if (normalizedPath.endsWith('.json')) return 'application/json; charset=utf-8'
  if (normalizedPath.endsWith('.wasm')) return 'application/wasm'
  if (normalizedPath.endsWith('.data')) return 'application/octet-stream'
  return 'application/octet-stream'
}

/**
 * 解析开发环境语音模型本地路径，并确保最终路径不会逃逸模型目录。
 */
export function resolveVoiceModelLocalPath(modelsDir, requestUrl) {
  if (!requestUrl?.startsWith(VOICE_MODEL_PREFIX)) return null

  let requestPath
  try {
    requestPath = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname)
  } catch {
    return null
  }
  if (!requestPath.startsWith(VOICE_MODEL_PREFIX)) return null

  const relativePath = requestPath.slice(VOICE_MODEL_PREFIX.length)
  const rootPath = path.resolve(modelsDir)
  const resolvedPath = path.resolve(rootPath, relativePath)
  const normalizedRoot = rootPath.endsWith(path.sep) ? rootPath : `${rootPath}${path.sep}`

  return resolvedPath.startsWith(normalizedRoot) ? resolvedPath : null
}
