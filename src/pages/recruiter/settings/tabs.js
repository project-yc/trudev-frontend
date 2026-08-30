import { Building2, Plug, User } from 'lucide-react';

// Order matters — this is also the tab order, and the first entry is the
// default section.
//
// Lives apart from SettingsNav because a module that exports both components
// and constants breaks React Fast Refresh.
export const SETTINGS_TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'org', label: 'Organisation', icon: Building2 },
  { key: 'integrations', label: 'Integrations', icon: Plug },
];
