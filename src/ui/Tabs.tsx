import React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from './utils';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultValue,
  value,
  onValueChange,
  className,
}) => {
  return (
    <RadixTabs.Root
      defaultValue={defaultValue ?? tabs[0]?.id}
      value={value}
      onValueChange={onValueChange}
      className={cn('flex flex-col h-full', className)}
    >
      <RadixTabs.List
        className="flex items-center gap-1 border-b border-border bg-surface px-3 py-1.5 shrink-0"
        aria-label="Tabs"
      >
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.id}
            value={tab.id}
            className="px-3 py-1 text-xs font-medium text-text-secondary rounded-control hover:text-text-primary data-[state=active]:text-text-primary data-[state=active]:bg-surface-elevated transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {tab.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {tabs.map((tab) => (
        <RadixTabs.Content
          key={tab.id}
          value={tab.id}
          className="flex-1 overflow-auto focus:outline-none"
        >
          {tab.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
};
