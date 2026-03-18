#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getZhangyugeAgentReadOnlyBashPatterns } from './cli-domains.ts'

interface AllowedBashEntry {
  pattern: string
  comment?: string
}

interface PermissionsConfig {
  version?: string
  allowedBashPatterns?: AllowedBashEntry[]
  [key: string]: unknown
}

function isZhangyugeAgentPattern(entry: AllowedBashEntry): boolean {
  return typeof entry.pattern === 'string' && entry.pattern.startsWith('^zhangyuge-agent\\s')
}

function syncZhangyugeAgentPatterns(config: PermissionsConfig): PermissionsConfig {
  const patterns = config.allowedBashPatterns ?? []
  const first章鱼哥AIIndex = patterns.findIndex(isZhangyugeAgentPattern)

  const without章鱼哥AI = patterns.filter(entry => !isZhangyugeAgentPattern(entry))
  const generated = getZhangyugeAgentReadOnlyBashPatterns()

  const insertAt = first章鱼哥AIIndex >= 0 ? first章鱼哥AIIndex : without章鱼哥AI.length
  const nextAllowedBashPatterns = [
    ...without章鱼哥AI.slice(0, insertAt),
    ...generated,
    ...without章鱼哥AI.slice(insertAt),
  ]

  return {
    ...config,
    allowedBashPatterns: nextAllowedBashPatterns,
  }
}

function main() {
  const targetPath = process.argv[2]
    ? resolve(process.argv[2])
    : resolve(process.cwd(), 'apps/electron/resources/permissions/default.json')

  const config = JSON.parse(readFileSync(targetPath, 'utf-8')) as PermissionsConfig
  const nextConfig = syncZhangyugeAgentPatterns(config)

  writeFileSync(targetPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf-8')
  process.stdout.write(`Synced zhangyuge-agent bash patterns in ${targetPath}\n`)
}

if (import.meta.main) {
  main()
}
