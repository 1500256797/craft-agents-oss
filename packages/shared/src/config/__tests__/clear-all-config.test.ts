import { describe, expect, it } from 'bun:test'
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { pathToFileURL } from 'url'

const STORAGE_MODULE_PATH = pathToFileURL(join(import.meta.dir, '..', 'storage.ts')).href

function runStorageScript(tempRoot: string, configDir: string, script: string): void {
  const run = Bun.spawnSync([
    process.execPath,
    '--eval',
    script,
  ], {
    cwd: tempRoot,
    env: {
      ...process.env,
      ZHANGYUGE_AGENT_CONFIG_DIR: configDir,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (run.exitCode !== 0) {
    throw new Error(
      `storage subprocess failed (exit ${run.exitCode})\nstdout:\n${run.stdout.toString()}\nstderr:\n${run.stderr.toString()}`,
    )
  }
}

describe('clearAllConfig', () => {
  it('deletes tracked workspace root folders in addition to app config data', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'clear-all-config-'))
    const configDir = join(tempRoot, 'config')
    const workspaceRoot = join(tempRoot, 'user-workspaces', 'alpha')
    const workspaceDataDir = join(configDir, 'workspaces', 'ws-alpha')
    const credentialsFile = join(configDir, 'credentials.enc')
    const configFile = join(configDir, 'config.json')

    mkdirSync(configDir, { recursive: true })
    mkdirSync(workspaceRoot, { recursive: true })
    mkdirSync(workspaceDataDir, { recursive: true })
    writeFileSync(join(workspaceRoot, 'config.json'), JSON.stringify({ id: 'ws-alpha', name: 'Alpha' }), 'utf-8')
    writeFileSync(credentialsFile, 'secret', 'utf-8')
    writeFileSync(configFile, JSON.stringify({
      workspaces: [
        {
          id: 'ws-alpha',
          name: 'Alpha',
          rootPath: workspaceRoot,
          createdAt: Date.now(),
        },
      ],
      activeWorkspaceId: 'ws-alpha',
      activeSessionId: null,
    }, null, 2), 'utf-8')

    runStorageScript(
      tempRoot,
      configDir,
      `import { clearAllConfig } from '${STORAGE_MODULE_PATH}'; await clearAllConfig();`,
    )

    expect(existsSync(configFile)).toBe(false)
    expect(existsSync(credentialsFile)).toBe(false)
    expect(existsSync(workspaceDataDir)).toBe(false)
    expect(existsSync(workspaceRoot)).toBe(false)

    rmSync(tempRoot, { recursive: true, force: true })
  })
})
