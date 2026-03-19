import { describe, expect, it } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SessionPersistenceQueue } from '../persistence-queue'
import type { StoredSession } from '../types'

describe('session persistence queue JSONL writes', () => {
  it('persists intermediate messages to session.jsonl', async () => {
    const workspaceRootPath = mkdtempSync(join(tmpdir(), 'persistence-queue-jsonl-'))
    const queue = new SessionPersistenceQueue(0)

    try {
      const sessionId = 'session-test'
      const session: StoredSession = {
        id: sessionId,
        workspaceRootPath,
        createdAt: 1,
        lastUsedAt: 1,
        messages: [
          {
            id: 'm1',
            type: 'assistant',
            role: 'assistant',
            content: 'intermediate',
            timestamp: 1,
            isIntermediate: true,
          } as any,
          {
            id: 'm2',
            type: 'assistant',
            role: 'assistant',
            content: 'final',
            timestamp: 2,
            isIntermediate: false,
          } as any,
        ],
        tokenUsage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          contextTokens: 0,
          costUsd: 0,
        },
      }

      queue.enqueue(session)
      await queue.flush(sessionId)

      const sessionFile = join(workspaceRootPath, 'sessions', sessionId, 'session.jsonl')
      const lines = readFileSync(sessionFile, 'utf-8').trim().split('\n')

      expect(lines).toHaveLength(3)
      const firstMessage = JSON.parse(lines[1]!)
      const secondMessage = JSON.parse(lines[2]!)
      expect(firstMessage.isIntermediate).toBe(true)
      expect(secondMessage.isIntermediate).toBe(false)
    } finally {
      rmSync(workspaceRootPath, { recursive: true, force: true })
    }
  })
})
