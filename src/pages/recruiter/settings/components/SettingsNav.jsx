import { cn } from '../../../../lib/utils';
import { SETTINGS_TABS } from '../tabs';

/**
 * Left rail for the settings page.
 *
 * A plain button list rather than the shared `Tabs` primitive: that one is
 * built for a horizontal strip above its content, and rebuilding it vertically
 * would mean overriding most of what it does.
 */
export function SettingsNav({ active, onChange }) {
  return (
    <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {SETTINGS_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-shrink-0 items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13.5px] font-medium transition-colors focus-visible:!outline-none lg:w-full',
              isActive
                ? 'bg-surface-muted text-text-primary'
                : 'text-text-secondary hover:bg-surface-muted/60 hover:text-text-primary',
            )}
          >
            <Icon className="h-[15px] w-[15px] flex-shrink-0" strokeWidth={1.8} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
