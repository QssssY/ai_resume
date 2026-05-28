import { createWriteStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { copyFile, mkdtemp, readdir, rm, stat } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { pipeline } from 'node:stream/promises'
import { spawn } from 'node:child_process'

const modelDir = resolve('public/voice-models/sherpa-onnx/zh-cn-streaming')
const zipFileName = 'sherpa-onnx-wasm-asr-1pass.zip'
const defaultZipUrl = 'https://hf-mirror.com/anyshu/sherpa-onnx-wasm-main-asr.data/resolve/main/sherpa-onnx-wasm-asr-1pass.zip'
const sourceZipUrl = process.env.SHERPA_ONNX_MODEL_ZIP_URL || defaultZipUrl
const localZipPath = process.env.SHERPA_ONNX_MODEL_ZIP_PATH
  ? resolve(process.env.SHERPA_ONNX_MODEL_ZIP_PATH)
  : resolve('.tmp-sherpa-pack', zipFileName)
const requiredFiles = [
  'sherpa-onnx-asr.js',
  'sherpa-onnx-wasm-main-asr.js',
  'sherpa-onnx-wasm-main-asr.wasm',
  'sherpa-onnx-wasm-main-asr.data'
]

const run = (command, args, options = {}) => new Promise((resolveRun, rejectRun) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: false, ...options })
  child.on('error', rejectRun)
  child.on('exit', (code) => {
    if (code === 0) resolveRun()
    else rejectRun(new Error(`${command} ${args.join(' ')} exited with ${code}`))
  })
})

const downloadZip = async () => {
  if (existsSync(localZipPath) && statSync(localZipPath).size > 1024 * 1024) {
    console.log(`[skip] using existing ${localZipPath}`)
    return
  }

  mkdirSync(dirname(localZipPath), { recursive: true })
  console.log(`[download] ${sourceZipUrl}`)
  let response
  try {
    response = await fetch(sourceZipUrl)
  } catch (error) {
    throw new Error(`下载 sherpa-onnx 模型包失败。可设置 SHERPA_ONNX_MODEL_ZIP_URL 为可访问镜像，或设置 SHERPA_ONNX_MODEL_ZIP_PATH 指向已下载 zip。原始错误: ${error?.message || error}`)
  }
  if (!response.ok || !response.body) {
    throw new Error(`下载 sherpa-onnx 模型包失败: HTTP ${response.status}`)
  }
  await pipeline(response.body, createWriteStream(localZipPath))
  console.log(`[done] ${localZipPath}`)
}

const findFile = async (rootDir, fileName) => {
  const entries = await readdir(rootDir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(rootDir, entry.name)
    if (entry.isDirectory()) {
      const nested = await findFile(fullPath, fileName)
      if (nested) return nested
    } else if (entry.isFile() && entry.name === fileName) {
      return fullPath
    }
  }
  return ''
}

const writeManifest = async () => {
  const files = []
  for (const fileName of requiredFiles) {
    const filePath = join(modelDir, fileName)
    const fileStat = await stat(filePath)
    files.push({ path: fileName, size: fileStat.size })
  }

  const manifest = {
    version: `speech-asr-1pass-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`,
    runtime: 'runtime.js',
    files
  }
  writeFileSync(join(modelDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
}

mkdirSync(modelDir, { recursive: true })
await downloadZip()

const extractDir = await mkdtemp(join(tmpdir(), 'ai-resume-sherpa-'))
try {
  await run('tar', ['-xf', localZipPath, '-C', extractDir])
  for (const fileName of requiredFiles) {
    const sourcePath = await findFile(extractDir, fileName)
    if (!sourcePath) {
      throw new Error(`模型包缺少必要文件: ${fileName}`)
    }
    const targetPath = join(modelDir, basename(fileName))
    await copyFile(sourcePath, targetPath)
    console.log(`[copy] ${fileName}`)
  }
  await writeManifest()
} finally {
  await rm(extractDir, { recursive: true, force: true })
}

console.log('sherpa-onnx 浏览器模型资源已部署到 public/voice-models/sherpa-onnx/zh-cn-streaming')
