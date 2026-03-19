import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PromptBuilder } from '../prompt-builder.ts';

let tempDir: string;
let workspaceRoot: string;
let projectRoot: string;

function createSkill(
  skillsDir: string,
  slug: string,
  opts: { name: string; description: string }
): void {
  const skillDir = join(skillsDir, slug);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'SKILL.md'), `---
name: "${opts.name}"
description: "${opts.description}"
---

Instructions for ${slug}
`);
}

describe('PromptBuilder', () => {
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'prompt-builder-test-'));
    workspaceRoot = join(tempDir, 'workspace');
    projectRoot = join(tempDir, 'project');
    mkdirSync(join(workspaceRoot, 'skills'), { recursive: true });
    mkdirSync(join(projectRoot, '.agents', 'skills'), { recursive: true });
  });

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('injects a skills XML block with name and description', () => {
    createSkill(join(workspaceRoot, 'skills'), 'alpha-skill', {
      name: 'Alpha Skill',
      description: 'Handles alpha <beta> & gamma',
    });

    const builder = new PromptBuilder({
      workspace: { id: 'ws-1', name: 'Test Workspace', rootPath: workspaceRoot } as any,
      session: { id: 'session-1', workingDirectory: projectRoot } as any,
    });

    const parts = builder.buildContextParts({}, '<sources>\nActive: none\n</sources>');
    const joined = parts.join('\n\n');

    const sourcesIdx = parts.findIndex(part => part.includes('<sources>'));
    const skillsIdx = parts.findIndex(part => part.includes('<skills>'));
    const capabilitiesIdx = parts.findIndex(part => part.includes('<workspace_capabilities>'));

    expect(sourcesIdx).toBeGreaterThanOrEqual(0);
    expect(skillsIdx).toBeGreaterThan(sourcesIdx);
    expect(capabilitiesIdx).toBeGreaterThan(skillsIdx);

    expect(joined).toContain('<skills>');
    expect(joined).toContain('<name>Alpha Skill</name>');
    expect(joined).toContain('<description>Handles alpha &lt;beta&gt; &amp; gamma</description>');
  });

  it('uses project skill metadata when project and workspace share the same slug', () => {
    createSkill(join(workspaceRoot, 'skills'), 'shared-skill', {
      name: 'Workspace Shared',
      description: 'Workspace description',
    });
    createSkill(join(projectRoot, '.agents', 'skills'), 'shared-skill', {
      name: 'Project Shared',
      description: 'Project description',
    });

    const builder = new PromptBuilder({
      workspace: { id: 'ws-1', name: 'Test Workspace', rootPath: workspaceRoot } as any,
      session: { id: 'session-1', workingDirectory: projectRoot } as any,
    });

    const joined = builder.buildContextParts({}).join('\n\n');

    expect(joined).toContain('<name>Project Shared</name>');
    expect(joined).toContain('<description>Project description</description>');
    expect(joined).not.toContain('<name>Workspace Shared</name>');
    expect(joined).not.toContain('<description>Workspace description</description>');
  });
});
