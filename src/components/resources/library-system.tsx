"use client";

import Link from "next/link";
import {
  Check,
  ChevronDown,
  Download,
  Folder,
  Grid2x2,
  LayoutGrid,
  List,
  Settings,
  X,
} from "lucide-react";
import { type ComponentType, type CSSProperties, type ReactNode, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type ResourceViewMode = "row" | "grid" | "compact";
export type ResourceDensityMode = "comfortable" | "dense";
export type DownloadBehavior = "off" | "wifi" | "always";

export const RESOURCE_THEME_VARS: CSSProperties = {
  "--rm-bg": "#F6F7F2",
  "--rm-surface": "#FFFFFF",
  "--rm-surface-muted": "#EEF2EA",
  "--rm-text": "#111418",
  "--rm-text-secondary": "#4C5560",
  "--rm-text-tertiary": "#6E7781",
  "--rm-border": "#DDE2D8",
  "--rm-primary": "#1E4ED8",
  "--rm-primary-soft": "#E8EEFF",
  "--rm-success": "#0F9D6E",
  "--rm-error": "#B42318",
} as CSSProperties;

export const DEFAULT_SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export type ResourceTab = "browse" | "downloads" | "settings";

type ResourceFrameProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  activeTab: ResourceTab;
  selectionLabel?: string;
  onOpenSelector?: () => void;
  onOpenSettings?: () => void;
  showSelector?: boolean;
};

export function getGreetingLabel(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function preferenceToView(mode: "grid" | "list" | "compact"): ResourceViewMode {
  if (mode === "grid") return "grid";
  if (mode === "compact") return "compact";
  return "row";
}

export function viewToPreference(mode: ResourceViewMode): "grid" | "list" | "compact" {
  if (mode === "grid") return "grid";
  if (mode === "compact") return "compact";
  return "list";
}

export function courseViewSizeToDensity(size: "sm" | "md" | "lg"): ResourceDensityMode {
  if (size === "sm") return "dense";
  return "comfortable";
}

export function densityToCourseViewSize(mode: ResourceDensityMode): "sm" | "md" | "lg" {
  if (mode === "dense") return "sm";
  return "md";
}

export function ResourceFrame({
  children,
  title,
  subtitle,
  activeTab,
  selectionLabel,
  onOpenSelector,
  onOpenSettings,
  showSelector = true,
}: ResourceFrameProps) {
  return (
    <div
      style={RESOURCE_THEME_VARS}
      className="min-h-screen bg-[var(--rm-bg)] text-[var(--rm-text)] pb-[calc(84px+env(safe-area-inset-bottom))]"
    >
      <header className="sticky top-0 z-30 border-b border-[var(--rm-border)] bg-[color:rgba(246,247,242,0.96)] backdrop-blur">
        <div className="h-14 px-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[20px] leading-6 font-semibold text-[var(--rm-text)] truncate">{title}</p>
            {subtitle ? (
              <p className="text-[12px] leading-4 font-normal text-[var(--rm-text-secondary)] truncate">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-[10px] border border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-text-secondary)] flex items-center justify-center transition-colors duration-150 hover:bg-[var(--rm-surface-muted)] active:opacity-80"
            aria-label="Open settings"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {showSelector ? (
          <div className="px-4 pb-3">
            <button
              type="button"
              onClick={onOpenSelector}
              className="h-10 w-full rounded-[12px] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 text-left text-[13px] leading-[18px] font-semibold text-[var(--rm-text)] flex items-center justify-between gap-3 transition-colors duration-150 hover:bg-[var(--rm-surface-muted)] active:opacity-90"
            >
              <span className="truncate">{selectionLabel ?? "Select Department • Semester"}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--rm-text-secondary)]" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </header>

      <main className="px-4 pt-3">{children}</main>

      <ResourceBottomNav activeTab={activeTab} />
    </div>
  );
}

function ResourceBottomNav({ activeTab }: { activeTab: ResourceTab }) {
  const items: Array<{
    id: ResourceTab;
    href: string;
    label: string;
    icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  }> = [
    { id: "browse", href: "/resources", label: "Browse", icon: LayoutGrid },
    { id: "downloads", href: "/downloads", label: "Downloads", icon: Download },
    { id: "settings", href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--rm-border)] bg-[color:rgba(255,255,255,0.96)] backdrop-blur supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),0px)]">
      <ul className="h-16 px-4 grid grid-cols-3 gap-2">
        {items.map((item) => {
          const active = item.id === activeTab;
          const Icon = item.icon;
          return (
            <li key={item.id} className="h-full">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "h-full flex flex-col items-center justify-center gap-1 rounded-[10px] text-[11px] leading-[14px] font-semibold transition-colors duration-150",
                  active
                    ? "text-[var(--rm-primary)] bg-[var(--rm-primary-soft)]"
                    : "text-[var(--rm-text-secondary)] hover:bg-[var(--rm-surface-muted)]",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden={true} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type SelectorSheetProps = {
  open: boolean;
  departments: string[];
  semesters: number[];
  selectedDepartmentId: string;
  selectedSemesterId: number | null;
  onApply: (departmentId: string, semesterId: number) => void;
  onClose: () => void;
};

export function DepartmentSemesterSheet({
  open,
  departments,
  semesters,
  selectedDepartmentId,
  selectedSemesterId,
  onApply,
  onClose,
}: SelectorSheetProps) {
  const [draftDepartment, setDraftDepartment] = useState(selectedDepartmentId);
  const [draftSemester, setDraftSemester] = useState<number | null>(
    selectedSemesterId,
  );

  const semesterOptions = useMemo(() => {
    if (!draftDepartment) return DEFAULT_SEMESTERS;
    return semesters.length > 0 ? semesters : DEFAULT_SEMESTERS;
  }, [draftDepartment, semesters]);

  const canApply =
    draftDepartment.length > 0 &&
    typeof draftSemester === "number" &&
    Number.isFinite(draftSemester);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close selector"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <section className="absolute inset-x-0 bottom-0 max-h-[82svh] rounded-t-2xl border-t border-[var(--rm-border)] bg-[var(--rm-surface)] px-4 pb-4 pt-3 shadow-[0_-10px_24px_rgba(0,0,0,0.08)]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--rm-border)]" aria-hidden="true" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] leading-5 font-semibold text-[var(--rm-text)]">
              Department and Semester
            </h2>
            <p className="text-[12px] leading-4 text-[var(--rm-text-secondary)]">
              Selection applies across Browse, Downloads, and Settings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-[10px] border border-[var(--rm-border)] text-[var(--rm-text-secondary)] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-1 max-h-[calc(82svh-128px)]">
          <div className="space-y-2">
            <p className="text-[14px] leading-5 font-semibold">Department</p>
            <div className="space-y-1.5">
              {departments.length === 0 ? (
                <p className="rounded-[10px] border border-[var(--rm-border)] bg-[var(--rm-surface-muted)] px-3 py-2 text-[12px] leading-4 text-[var(--rm-text-secondary)]">
                  No departments available.
                </p>
              ) : (
                departments.map((department) => {
                  const selected = department === draftDepartment;
                  return (
                    <button
                      key={department}
                      type="button"
                      onClick={() => {
                        setDraftDepartment(department);
                        if (
                          typeof draftSemester === "number" &&
                          !semesterOptions.includes(draftSemester)
                        ) {
                          setDraftSemester(null);
                        }
                      }}
                      className={cn(
                        "h-11 w-full rounded-[10px] border px-3 text-left text-[13px] leading-[18px] font-medium flex items-center justify-between transition-colors duration-150",
                        selected
                          ? "border-[var(--rm-primary)] bg-[var(--rm-primary-soft)] text-[var(--rm-primary)]"
                          : "border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-text)] hover:bg-[var(--rm-surface-muted)]",
                      )}
                    >
                      <span className="truncate">{department}</span>
                      {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[14px] leading-5 font-semibold">Semester</p>
            <div className="grid grid-cols-4 gap-2">
              {semesterOptions.map((semester) => {
                const selected = semester === draftSemester;
                return (
                  <button
                    key={semester}
                    type="button"
                    disabled={!draftDepartment}
                    onClick={() => setDraftSemester(semester)}
                    className={cn(
                      "h-10 rounded-[10px] border text-[12px] leading-4 font-semibold transition-colors duration-150",
                      selected
                        ? "border-[var(--rm-primary)] bg-[var(--rm-primary-soft)] text-[var(--rm-primary)]"
                        : "border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-text-secondary)]",
                      !draftDepartment && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    Sem {semester}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-[10px] border border-[var(--rm-border)] bg-[var(--rm-surface)] text-[13px] font-semibold text-[var(--rm-text-secondary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canApply}
            onClick={() => {
              if (!canApply || draftSemester === null) return;
              onApply(draftDepartment, draftSemester);
              onClose();
            }}
            className="h-11 flex-1 rounded-[10px] border border-[var(--rm-primary)] bg-[var(--rm-primary)] text-[13px] font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      </section>
    </div>
  );
}

type SearchInputProps = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onClear: () => void;
};

export function SearchInput({ value, placeholder, onChange, onClear }: SearchInputProps) {
  return (
    <label className="h-11 rounded-[10px] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 flex items-center gap-2 focus-within:border-[var(--rm-primary)] focus-within:ring-2 focus-within:ring-[color:rgba(30,78,216,0.16)]">
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="h-4 w-4 text-[var(--rm-text-tertiary)]"
      >
        <path
          d="M9 15a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm8 2-4.35-4.35"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="flex-1 min-w-0 bg-transparent text-[13px] leading-[18px] text-[var(--rm-text)] placeholder:text-[var(--rm-text-tertiary)] focus:outline-none"
      />
      {value.length > 0 ? (
        <button
          type="button"
          onClick={onClear}
          className="h-8 w-8 min-h-[44px] min-w-[44px] -my-1.5 -mr-1 rounded-[8px] text-[var(--rm-text-secondary)] flex items-center justify-center"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </label>
  );
}

type ViewFilterRowProps = {
  viewMode: ResourceViewMode;
  densityMode: ResourceDensityMode;
  onViewModeChange: (mode: ResourceViewMode) => void;
  onDensityModeChange: (mode: ResourceDensityMode) => void;
};

export function ViewFilterRow({
  viewMode,
  densityMode,
  onViewModeChange,
  onDensityModeChange,
}: ViewFilterRowProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
      <ChipButton
        active={viewMode === "row"}
        onClick={() => onViewModeChange("row")}
        icon={<List className="h-3.5 w-3.5" aria-hidden="true" />}
        label="Row"
      />
      <ChipButton
        active={viewMode === "grid"}
        onClick={() => onViewModeChange("grid")}
        icon={<Grid2x2 className="h-3.5 w-3.5" aria-hidden="true" />}
        label="Grid"
      />
      <ChipButton
        active={viewMode === "compact"}
        onClick={() => onViewModeChange("compact")}
        icon={<LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />}
        label="Compact"
      />
      <span className="h-6 w-px bg-[var(--rm-border)]" aria-hidden="true" />
      <ChipButton
        active={densityMode === "comfortable"}
        onClick={() => onDensityModeChange("comfortable")}
        label="Comfortable"
      />
      <ChipButton
        active={densityMode === "dense"}
        onClick={() => onDensityModeChange("dense")}
        label="Dense"
      />
    </div>
  );
}

function ChipButton({
  active,
  label,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-8 rounded-[999px] border px-3 inline-flex items-center gap-1.5 text-[13px] leading-[18px] font-semibold whitespace-nowrap transition-colors duration-150",
        active
          ? "border-[var(--rm-primary)] bg-[var(--rm-primary-soft)] text-[var(--rm-primary)]"
          : "border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-text-secondary)] hover:bg-[var(--rm-surface-muted)]",
      )}
    >
      {icon ?? null}
      {label}
    </button>
  );
}

export function formatBytes(size?: number | string) {
  const value = typeof size === "number" ? size : Number(size ?? NaN);
  if (!Number.isFinite(value) || value <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let current = value;
  let unitIndex = 0;
  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }
  const decimals = current >= 10 || unitIndex === 0 ? 0 : 1;
  return `${current.toFixed(decimals)} ${units[unitIndex] ?? "B"}`;
}

export function formatShortDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function FileTypeTag({ type }: { type: string }) {
  const palette = getTagPalette(type);
  return (
    <span
      className="inline-flex h-5 items-center rounded-[999px] border px-2 text-[11px] leading-[14px] font-semibold uppercase tracking-[0.3px]"
      style={{
        color: palette.text,
        backgroundColor: palette.bg,
        borderColor: palette.border,
      }}
    >
      {type}
    </span>
  );
}

function getTagPalette(rawType: string) {
  const type = rawType.toUpperCase();
  if (type === "PDF") {
    return { text: "#8E2A2A", bg: "#FCECEC", border: "#F3CACA" };
  }
  if (type === "PYQ") {
    return { text: "#5D3C99", bg: "#F1EDFC", border: "#DCD0F8" };
  }
  if (type === "NOTES") {
    return { text: "#1F5E3B", bg: "#EAF7EF", border: "#CDEAD8" };
  }
  if (type === "LAB") {
    return { text: "#0E5A75", bg: "#E9F6FA", border: "#C6E7F0" };
  }
  return { text: "#4C5560", bg: "#F3F4F6", border: "#D1D5DB" };
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[12px] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-4 py-6 text-center">
      <p className="text-[14px] leading-5 font-semibold text-[var(--rm-text)]">{title}</p>
      <p className="mt-1 text-[12px] leading-4 text-[var(--rm-text-secondary)]">{description}</p>
    </div>
  );
}

export function LoadingRows({ count = 6, compact = false }: { count?: number; compact?: boolean }) {
  const heightClass = compact ? "h-9" : "h-14";
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            heightClass,
            "rounded-[10px] border border-[var(--rm-border)] bg-[linear-gradient(90deg,#f5f7f3_25%,#ffffff_37%,#f5f7f3_63%)] bg-[length:400%_100%] animate-pulse",
          )}
        />
      ))}
    </div>
  );
}

export function FolderLeadingIcon() {
  return (
    <span className="h-5 w-5 rounded-[6px] bg-[var(--rm-surface-muted)] text-[var(--rm-text-secondary)] flex items-center justify-center">
      <Folder className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );
}
