import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, resolve } from 'node:path'

const require = createRequire(import.meta.url)

/** Absolute path to the NovaMind demo MCP entry (tsx runs TypeScript directly). */
export function novamindMcpScriptPath(): string {
  return join(process.cwd(), 'server/mcp/novamindDemoMcp.ts')
}

function isMuslLinux(): boolean {
  if (process.platform !== 'linux') return false
  try {
    return readFileSync('/proc/self/maps', 'utf8').includes('musl')
  } catch {
    return false
  }
}

function platformNativePackageName(): string | undefined {
  const { platform, arch } = process
  if (platform === 'darwin') {
    return arch === 'arm64'
      ? '@anthropic-ai/claude-agent-sdk-darwin-arm64'
      : '@anthropic-ai/claude-agent-sdk-darwin-x64'
  }
  if (platform === 'win32') {
    return arch === 'arm64'
      ? '@anthropic-ai/claude-agent-sdk-win32-arm64'
      : '@anthropic-ai/claude-agent-sdk-win32-x64'
  }
  if (platform === 'linux') {
    const musl = isMuslLinux()
    if (arch === 'arm64') {
      return musl
        ? '@anthropic-ai/claude-agent-sdk-linux-arm64-musl'
        : '@anthropic-ai/claude-agent-sdk-linux-arm64'
    }
    if (arch === 'x64') {
      return musl
        ? '@anthropic-ai/claude-agent-sdk-linux-x64-musl'
        : '@anthropic-ai/claude-agent-sdk-linux-x64'
    }
  }
  return undefined
}

/**
 * Path to the Claude Code CLI used by `@anthropic-ai/claude-agent-sdk`.
 * Env: `CLAUDE_CODE_CLI_PATH` or `PATH_TO_CLAUDE_CODE_EXECUTABLE`, then optionalDependency layout (`claude` / `claude.exe`).
 */
export function resolveClaudeCodeExecutable(): string | undefined {
  const raw =
    process.env.CLAUDE_CODE_CLI_PATH?.trim() ||
    process.env.PATH_TO_CLAUDE_CODE_EXECUTABLE?.trim()
  if (raw) {
    const abs = isAbsolute(raw) ? raw : resolve(process.cwd(), raw)
    if (existsSync(abs)) return abs
    return undefined
  }

  const pkg = platformNativePackageName()
  if (!pkg) return undefined
  let pkgRoot: string
  try {
    pkgRoot = dirname(require.resolve(`${pkg}/package.json`))
  } catch {
    return undefined
  }
  const exe = process.platform === 'win32' ? 'claude.exe' : 'claude'
  const candidate = join(pkgRoot, exe)
  return existsSync(candidate) ? candidate : undefined
}
