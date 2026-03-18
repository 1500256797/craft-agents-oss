import type { ComponentEntry } from './types'
import { ZhangyugeAgentLogo } from '@/components/icons/ZhangyugeAgentLogo'
import { ZhangyugeAgentSymbol } from '@/components/icons/ZhangyugeAgentSymbol'
import { PanelLeftRounded } from '@/components/icons/PanelLeftRounded'
import { SquarePenRounded } from '@/components/icons/SquarePenRounded'

export const iconComponents: ComponentEntry[] = [
  {
    id: 'zhangyuge-agent-logo',
    name: 'ZhangyugeAgentLogo',
    category: 'Icons',
    description: 'Full 章鱼哥AI branding logo with text',
    component: ZhangyugeAgentLogo,
    props: [
      {
        name: 'className',
        description: 'Tailwind classes for sizing and styling',
        control: { type: 'string' },
        defaultValue: 'h-8',
      },
    ],
    variants: [
      { name: 'Small', props: { className: 'h-6' } },
      { name: 'Medium', props: { className: 'h-8' } },
      { name: 'Large', props: { className: 'h-12' } },
    ],
  },
  {
    id: 'zhangyuge-agent-symbol',
    name: 'ZhangyugeAgentSymbol',
    category: 'Icons',
    description: '章鱼哥AI "E" pixel art symbol icon (brand color: #9570BE)',
    component: ZhangyugeAgentSymbol,
    props: [
      {
        name: 'className',
        description: 'Tailwind classes for sizing',
        control: { type: 'string' },
        defaultValue: 'h-6 w-6',
      },
    ],
    variants: [
      { name: 'Small', props: { className: 'h-4 w-4' } },
      { name: 'Medium', props: { className: 'h-6 w-6' } },
      { name: 'Large', props: { className: 'h-10 w-10' } },
    ],
  },
  {
    id: 'panel-left-rounded',
    name: 'PanelLeftRounded',
    category: 'Icons',
    description: 'Sidebar toggle icon with rounded corners',
    component: PanelLeftRounded,
    props: [
      {
        name: 'className',
        description: 'Tailwind classes',
        control: { type: 'string' },
        defaultValue: 'h-5 w-5',
      },
    ],
    variants: [
      { name: 'Default', props: { className: 'h-5 w-5' } },
      { name: 'Large', props: { className: 'h-8 w-8' } },
      { name: 'Muted', props: { className: 'h-5 w-5 text-muted-foreground' } },
    ],
  },
  {
    id: 'square-pen-rounded',
    name: 'SquarePenRounded',
    category: 'Icons',
    description: 'New chat/compose icon with rounded corners',
    component: SquarePenRounded,
    props: [
      {
        name: 'className',
        description: 'Tailwind classes',
        control: { type: 'string' },
        defaultValue: 'h-5 w-5',
      },
    ],
    variants: [
      { name: 'Default', props: { className: 'h-5 w-5' } },
      { name: 'Large', props: { className: 'h-8 w-8' } },
      { name: 'Primary', props: { className: 'h-5 w-5 text-foreground' } },
    ],
  },
]
