// Recruiter settings — a tabbed shell over per-section panels.
//
// Until this existed, org configuration lived only in the one-time onboarding
// wizard, which is not re-enterable.
//
// The active tab is held in the query string rather than component state so a
// section is linkable and survives a reload — "send me the integrations page"
// has to be a URL, and the sidebar's account menu deep-links here.
import { useSearchParams } from 'react-router-dom';

import { AskAnythingBar } from '../../../components/recruiter/AskAnythingBar';
import { SettingsNav } from './components/SettingsNav';
import { SETTINGS_TABS } from './tabs';
import { IntegrationsPanel } from './panels/IntegrationsPanel';
import { OrgPanel } from './panels/OrgPanel';
import { ProfilePanel } from './panels/ProfilePanel';

const PANELS = {
  profile: ProfilePanel,
  org: OrgPanel,
  integrations: IntegrationsPanel,
};

const DEFAULT_TAB = SETTINGS_TABS[0].key;

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const requested = searchParams.get('tab');
  // An unknown ?tab= falls back rather than rendering nothing — a stale
  // bookmark should land somewhere sensible.
  const active = PANELS[requested] ? requested : DEFAULT_TAB;
  const Panel = PANELS[active];

  const setActive = (tab) => {
    // `replace` keeps tab switching out of the history stack, so Back leaves
    // settings instead of walking through every tab visited.
    setSearchParams(tab === DEFAULT_TAB ? {} : { tab }, { replace: true });
  };

  return (
    <div className="flex min-h-full flex-col bg-page">
      <AskAnythingBar />

      <div className="min-h-0 flex-1 p-3 pt-0">
        <section className="min-h-[calc(100vh-76px)] rounded-[10px] border border-border-subtle bg-surface px-[39px] pb-[24px] pt-[42px]">
          <div className="min-w-0">
            <h1 className="text-[20px] font-bold leading-[24px] text-text-primary">Settings</h1>
            <p className="mt-[5px] text-[15px] leading-[17px] text-text-secondary">
              Manage your account, your organisation, and the tools you connect.
            </p>
          </div>

          <div className="mt-[30px] flex flex-col gap-6 lg:flex-row lg:gap-10">
            <div className="flex-shrink-0 lg:w-[200px]">
              <SettingsNav active={active} onChange={setActive} />
            </div>
            <div className="min-w-0 flex-1 border-t border-border-subtle pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <Panel />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
