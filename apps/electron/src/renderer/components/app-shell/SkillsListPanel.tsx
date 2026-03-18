import * as React from 'react'
import { Zap } from 'lucide-react'
import { SkillAvatar } from '@/components/ui/skill-avatar'
import { EntityPanel } from '@/components/ui/entity-panel'
import { EntityListEmptyScreen } from '@/components/ui/entity-list-empty'
import { skillSelection } from '@/hooks/useEntitySelection'
import { SkillMenu } from './SkillMenu'
import { EditPopover, getEditConfig } from '@/components/ui/EditPopover'
import { useI18n } from '@/context/I18nContext'
import type { LoadedSkill } from '../../../shared/types'

export interface SkillsListPanelProps {
  skills: LoadedSkill[]
  onDeleteSkill: (skillSlug: string) => void
  onSkillClick: (skill: LoadedSkill) => void
  selectedSkillSlug?: string | null
  workspaceId?: string
  workspaceRootPath?: string
  className?: string
}

export function SkillsListPanel({
  skills,
  onDeleteSkill,
  onSkillClick,
  selectedSkillSlug,
  workspaceId,
  workspaceRootPath,
  className,
}: SkillsListPanelProps) {
  const { t } = useI18n()
  return (
    <EntityPanel<LoadedSkill>
      items={skills}
      getId={(s) => s.slug}
      selection={skillSelection}
      selectedId={selectedSkillSlug}
      onItemClick={onSkillClick}
      className={className}
      emptyState={
        <EntityListEmptyScreen
          icon={<Zap />}
          title={t('settings.lists.skills.emptyTitle')}
          description={t('settings.lists.skills.emptyDescription')}
          docKey="skills"
        >
          {workspaceRootPath && (
            <EditPopover
              align="center"
              trigger={
                <button className="inline-flex items-center h-7 px-3 text-xs font-medium rounded-[8px] bg-background shadow-minimal hover:bg-foreground/[0.03] transition-colors">
                  {t('settings.lists.skills.addSkill')}
                </button>
              }
              {...getEditConfig('add-skill', workspaceRootPath, t)}
            />
          )}
        </EntityListEmptyScreen>
      }
      mapItem={(skill) => ({
        icon: <SkillAvatar skill={skill} size="sm" workspaceId={workspaceId} />,
        title: skill.metadata.name,
        badges: <span className="truncate">{skill.metadata.description}</span>,
        menu: (
          <SkillMenu
            skillSlug={skill.slug}
            skillName={skill.metadata.name}
            onOpenInNewWindow={() => window.electronAPI.openUrl(`zhangyuge-agent://skills/skill/${skill.slug}?window=focused`)}
            onShowInFinder={() => { if (workspaceId) window.electronAPI.openSkillInFinder(workspaceId, skill.slug) }}
            onDelete={() => onDeleteSkill(skill.slug)}
          />
        ),
      })}
    />
  )
}
