import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { toast } from 'sonner';
import { AskAnythingBar } from '../../../components/recruiter/AskAnythingBar';
import { cn } from '../../../lib/utils';
import { useTemplateGallery } from './hooks/useTemplateGallery';
import { TemplateCard } from './components/TemplateCard';
import { TemplateFilterSidebar } from './components/TemplateFilterSidebar';
import { TemplatePreviewDrawer } from './components/TemplatePreviewDrawer';
import {
  TemplateGridSkeleton,
  TemplatesEmptyState,
} from './components/TemplateGridStates';

/**
 * The template gallery — the front door to creating an assessment.
 *
 * "Use template" does not instantiate here. It hands the template to step 1 of
 * the builder, which prefills its fields from the template and creates the
 * assessment when the recruiter presses Continue. Instantiating on this click
 * would leave a stray draft behind every time someone changed their mind on the
 * details screen.
 */
export default function TemplatesPage() {
  const navigate = useNavigate();
  const gallery = useTemplateGallery();

  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handlePreview = template => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };

  const handleUse = template => {
    if (!template?.id) {
      toast.error('That template is no longer available.');
      return;
    }
    navigate(`/recruiter/assessments/new?template=${template.id}`);
  };

  const startFromScratch = () => navigate('/recruiter/assessments/new?from=scratch');

  return (
    <div className="flex h-full min-h-0 flex-col bg-page">
      <AskAnythingBar />

      <div className="min-h-0 flex-1 p-3 pt-0">
        <div className="flex h-full min-h-0 overflow-hidden rounded-[10px] border border-border-subtle bg-surface">
          <TemplateFilterSidebar
            filters={gallery.filters}
            setFilter={gallery.setFilter}
            filterOptions={gallery.filterOptions}
            filtersActive={gallery.filtersActive}
            onClear={gallery.clearFilters}
          />

          <section className="flex min-w-0 flex-1 flex-col">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-[24px] py-[16px]">
              <div>
                <h1 className="text-[18px] font-bold leading-[24px] text-text-primary">
                  Templates
                </h1>
                <p className="mt-[3px] text-[13px] leading-[18px] text-text-secondary">
                  Prebuilt assessments for common roles. Pick one, adjust the details, invite.
                </p>
              </div>

              <div className="flex items-center gap-[10px]">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-[11px] top-1/2 z-10 h-[15px] w-[15px] -translate-y-1/2 text-text-muted"
                    strokeWidth={1.8}
                  />
                  <Input
                    value={gallery.search}
                    onChange={event => gallery.setSearch(event.target.value)}
                    placeholder="Search templates"
                    className="h-[38px] w-[220px] rounded-[8px] border-border-strong pl-[34px] text-[14px] focus-visible:border-black focus-visible:ring-black/15 focus-visible:ring-offset-0"
                  />
                </div>
                <button
                  type="button"
                  onClick={startFromScratch}
                  className="inline-flex h-[38px] items-center gap-[6px] rounded-[8px] border border-border-default bg-surface px-[16px] text-[14px] font-medium leading-none text-text-primary transition-colors hover:bg-surface-hover"
                >
                  <Plus className="h-[15px] w-[15px]" strokeWidth={2} />
                  Start from scratch
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-[24px] py-[20px]">
              {gallery.error && (
                <p className="mb-[16px] rounded-[8px] border border-error-border bg-error-bg px-4 py-3 text-[13px] leading-[18px] text-error">
                  {gallery.error}
                </p>
              )}

              {gallery.loading && <TemplateGridSkeleton />}

              {!gallery.loading && !gallery.error && gallery.rows.length === 0 && (
                <TemplatesEmptyState
                  filtersActive={gallery.filtersActive}
                  onClear={gallery.clearFilters}
                  onStartFromScratch={startFromScratch}
                />
              )}

              {!gallery.loading && gallery.rows.length > 0 && (
                <>
                  <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2 2xl:grid-cols-3">
                    {gallery.rows.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onPreview={handlePreview}
                        onUse={handleUse}
                      />
                    ))}
                  </div>

                  {gallery.totalPages > 1 && (
                    <div className="mt-[20px] flex items-center justify-center gap-[8px]">
                      {Array.from({ length: gallery.totalPages }).map((_, index) => {
                        const pageNumber = index + 1;
                        return (
                          <button
                            key={pageNumber}
                            type="button"
                            onClick={() => gallery.setPage(pageNumber)}
                            className={cn(
                              'h-[32px] min-w-[32px] rounded-[7px] border px-[10px] text-[13px] font-medium leading-none transition-colors',
                              pageNumber === gallery.page
                                ? 'border-border-strong bg-page text-text-primary'
                                : 'border-transparent text-text-secondary hover:bg-surface-hover',
                            )}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      <TemplatePreviewDrawer
        template={previewTemplate}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onUse={handleUse}
      />
    </div>
  );
}
