import { Loader } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';

/** Page title + assessment picker. Figma: 1097x46 row, picker 460x42. */
export function ReportsHeader({ assessments, selectedId, onSelect, loading }) {
  return (
    <div className="flex flex-col gap-[18px] lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-[20px] font-bold leading-[24px] text-text-primary">Reports</h1>
        <p className="mt-[5px] text-[15px] leading-[17px] text-text-secondary">
          Candidate assessment reports — evidence and overall signal, not a verdict.
        </p>
      </div>

      <div className="w-full lg:w-[460px]">
        {loading ? (
          <div className="flex h-[42px] items-center gap-2 rounded-[8px] border border-border-default px-[12px] text-[14px] text-text-secondary">
            <Loader className="h-[15px] w-[15px] animate-spin" />
            Loading assessments...
          </div>
        ) : (
          <Select value={selectedId} onValueChange={onSelect} disabled={assessments.length === 0}>
            <SelectTrigger
              aria-label="Select assessment"
              className="h-[42px] w-full rounded-[8px] px-[12px] text-[14px]"
            >
              <SelectValue placeholder="No assessments yet" />
            </SelectTrigger>
            <SelectContent>
              {assessments.map(assessment => (
                <SelectItem key={assessment.id} value={String(assessment.id)}>
                  {assessment.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
