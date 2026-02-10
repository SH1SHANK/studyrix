"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo2,
  MoreVertical,
  Settings,
} from "lucide-react";
import DotPatternBackground from "@/components/ui/DotPatternBackground";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Menu } from "@/components/ui/Menu";
import { StudyrixFooter } from "@/components/resources/StudyrixFooter";
import { useStudyMaterialsPreferences } from "@/hooks/useStudyMaterialsPreferences";
import { useOfflineManager } from "@/hooks/useOfflineManager";
import { useDownloadCenter } from "@/hooks/useDownloadCenter";
import { cn } from "@/lib/utils";

const PDF_MIME = "application/pdf";
const GOOGLE_DOC = "application/vnd.google-apps.document";
const GOOGLE_SHEET = "application/vnd.google-apps.spreadsheet";
const GOOGLE_SLIDES = "application/vnd.google-apps.presentation";

const DOC_MIMES = new Set([
  GOOGLE_DOC,
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const SHEET_MIMES = new Set([
  GOOGLE_SHEET,
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const SLIDE_MIMES = new Set([
  GOOGLE_SLIDES,
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const ARCHIVE_MIMES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/gzip",
]);

const formatBytes = (size?: number) => {
  if (!Number.isFinite(size) || !size) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let current = size;
  let idx = 0;
  while (current >= 1024 && idx < units.length - 1) {
    current /= 1024;
    idx += 1;
  }
  return `${current.toFixed(current >= 10 || idx === 0 ? 0 : 1)}\u00A0${units[idx]}`;
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getMimeLabel = (mimeType?: string, name?: string) => {
  if (DOC_MIMES.has(mimeType ?? "")) return "DOC";
  if (SHEET_MIMES.has(mimeType ?? "")) return "XLSX";
  if (SLIDE_MIMES.has(mimeType ?? "")) return "PPTX";
  if (mimeType === PDF_MIME) return "PDF";
  if ((mimeType ?? "").startsWith("image/")) return "Image";
  if ((mimeType ?? "").startsWith("video/")) return "Video";
  if ((mimeType ?? "").startsWith("audio/")) return "Audio";
  if (ARCHIVE_MIMES.has(mimeType ?? "")) return "Archive";
  if ((mimeType ?? "").includes("json")) return "JSON";
  if ((mimeType ?? "").startsWith("text/")) return "Text";
  if (name && name.includes(".")) {
    const ext = name.split(".").pop();
    if (ext) return ext.toUpperCase();
  }
  return "File";
};

const getItemIcon = (mimeType?: string) => {
  if (DOC_MIMES.has(mimeType ?? "") || mimeType === PDF_MIME) return FileText;
  if (SHEET_MIMES.has(mimeType ?? "")) return FileSpreadsheet;
  if (SLIDE_MIMES.has(mimeType ?? "")) return FileText;
  if ((mimeType ?? "").startsWith("image/")) return FileImage;
  if ((mimeType ?? "").startsWith("video/")) return FileVideo2;
  if ((mimeType ?? "").startsWith("audio/")) return FileAudio;
  if ((mimeType ?? "").includes("json") || (mimeType ?? "").includes("xml")) {
    return FileCode;
  }
  if (ARCHIVE_MIMES.has(mimeType ?? "")) return FileArchive;
  return File;
};

const ROW_TONES = {
  pdf: {
    row: "bg-[linear-gradient(90deg,#FECACA_0,#FECACA_8px,transparent_8px)]",
    icon: "bg-[#FEE2E2]",
  },
  slides: {
    row: "bg-[linear-gradient(90deg,#DDD6FE_0,#DDD6FE_8px,transparent_8px)]",
    icon: "bg-[#E9D5FF]",
  },
  docs: {
    row: "bg-[linear-gradient(90deg,#BFDBFE_0,#BFDBFE_8px,transparent_8px)]",
    icon: "bg-[#DBEAFE]",
  },
  archives: {
    row: "bg-[linear-gradient(90deg,#FED7AA_0,#FED7AA_8px,transparent_8px)]",
    icon: "bg-[#FFEDD5]",
  },
  default: {
    row: "bg-[linear-gradient(90deg,#E5E7EB_0,#E5E7EB_8px,transparent_8px)]",
    icon: "bg-white",
  },
};

type ConfirmState =
  | { type: "clear-history" }
  | { type: "remove-download"; id: string; name: string }
  | { type: "remove-saved"; resourceId: string; name: string }
  | null;

const getRowTone = (mimeType?: string) => {
  if (mimeType === PDF_MIME) return ROW_TONES.pdf;
  if (SLIDE_MIMES.has(mimeType ?? "")) return ROW_TONES.slides;
  if (DOC_MIMES.has(mimeType ?? "")) return ROW_TONES.docs;
  if (ARCHIVE_MIMES.has(mimeType ?? "")) return ROW_TONES.archives;
  return ROW_TONES.default;
};

export default function DownloadCenterPage() {
  const { entries, clearDownloads, removeDownload } = useDownloadCenter();
  const preferences = useStudyMaterialsPreferences(null);
  const offlineManager = useOfflineManager({
    loaded: preferences.loaded,
    offlineFiles: preferences.offlineFiles,
    offlineStorageMode: preferences.offlineStorageMode ?? "web",
    cacheLimitMb: preferences.cacheConfig?.limitMb ?? null,
    setOfflineFile: preferences.setOfflineFile,
    removeOfflineFiles: preferences.removeOfflineFiles,
    replaceOfflineFiles: preferences.replaceOfflineFiles,
    updateOfflineStorageMode: preferences.updateOfflineStorageMode,
  });
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const offlineEntries = useMemo(() => {
    return Object.entries(preferences.offlineFiles).map(([resourceId, meta]) => ({
      resourceId,
      meta,
    }));
  }, [preferences.offlineFiles]);

  const openOfflineResource = useCallback(
    async (resourceId: string) => {
      const blob = await offlineManager.openOfflineResource({ resourceId });
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
    [offlineManager],
  );

  const handleRemoveOffline = useCallback(
    async (resourceId: string) => {
      await offlineManager.removeOfflineResource(resourceId);
    },
    [offlineManager],
  );

  const requestClearDownloads = useCallback(() => {
    setConfirmState({ type: "clear-history" });
  }, []);

  const requestRemoveDownload = useCallback((id: string, name: string) => {
    setConfirmState({ type: "remove-download", id, name });
  }, []);

  const requestRemoveSaved = useCallback((resourceId: string, name: string) => {
    setConfirmState({ type: "remove-saved", resourceId, name });
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmState) return;
    if (confirmState.type === "clear-history") {
      clearDownloads();
    } else if (confirmState.type === "remove-download") {
      removeDownload(confirmState.id);
    } else {
      await handleRemoveOffline(confirmState.resourceId);
    }
    setConfirmState(null);
  }, [clearDownloads, confirmState, handleRemoveOffline, removeDownload]);

  const deviceDownloads = useMemo(() => {
    return entries.slice().sort((a, b) =>
      new Date(b.downloadedAt).getTime() -
      new Date(a.downloadedAt).getTime(),
    );
  }, [entries]);

  const offlineDownloads = useMemo(() => {
    return offlineEntries.slice().sort((a, b) =>
      new Date(b.meta.cachedAt).getTime() -
      new Date(a.meta.cachedAt).getTime(),
    );
  }, [offlineEntries]);

  const confirmCopy = useMemo(() => {
    if (!confirmState) return null;
    if (confirmState.type === "clear-history") {
      return {
        title: "Clear Download History",
        description: "Remove all download history from this device?",
        confirmLabel: "Clear History",
      };
    }
    if (confirmState.type === "remove-download") {
      return {
        title: "Remove Download",
        description: `Remove "${confirmState.name}" from download history?`,
        confirmLabel: "Remove",
      };
    }
    return {
      title: "Remove Saved File",
      description: `Remove "${confirmState.name}" from saved files?`,
      confirmLabel: "Remove",
    };
  }, [confirmState]);

  return (
    <div className="min-h-screen bg-neutral-50 pb-24 transition-colors duration-300 relative isolate overflow-x-hidden">
      <DotPatternBackground />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase shadow-[3px_3px_0px_0px_#000]"
      >
        Skip to Content
      </a>
      <div
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-5xl relative z-10"
      >
        <header className="bg-white border-b-4 border-black px-4 py-4 sm:px-6 shadow-[0_6px_0px_#0a0a0a]">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              aria-label="Back to resources"
              className="h-10 w-10 border-2 border-black bg-white flex items-center justify-center shadow-[3px_3px_0_#0a0a0a] transition-transform transition-shadow transition-colors duration-150 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#0a0a0a] hover:bg-yellow-50 active:translate-y-0 active:shadow-[2px_2px_0_#0a0a0a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <h1 className="flex-1 font-display text-xl sm:text-2xl font-black uppercase text-stone-900 tracking-tight truncate">
              Downloads
            </h1>
            <Menu>
              <Menu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Open menu"
                  className="h-10 w-10 border-2 border-black bg-white flex items-center justify-center shadow-[3px_3px_0_#0a0a0a] transition-transform transition-shadow transition-colors duration-150 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#0a0a0a] hover:bg-yellow-50 active:translate-y-0 active:shadow-[2px_2px_0_#0a0a0a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                >
                  <MoreVertical className="h-5 w-5" aria-hidden="true" />
                </button>
              </Menu.Trigger>
              <Menu.Content
                align="end"
                sideOffset={8}
                className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] min-w-[200px] max-w-[calc(100vw-2rem)] max-h-[min(60svh,320px)] overflow-y-auto"
              >
                <Menu.Item asChild>
                  <Link
                    href="/offline"
                    className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                  >
                    Saved Materials
                  </Link>
                </Menu.Item>
                <Menu.Item asChild>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                  >
                    <Settings className="h-4 w-4" aria-hidden="true" />
                    Settings
                  </Link>
                </Menu.Item>
              </Menu.Content>
            </Menu>
          </div>
        </header>

        <section className="bg-white border-b-4 border-black px-4 py-6 sm:px-6 shadow-[0_6px_0px_#0a0a0a]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-stone-700">
                On This Device
              </h2>
              <p className="text-[11px] font-bold uppercase text-stone-500">
                Files you saved to this device
              </p>
            </div>
            {deviceDownloads.length > 0 && (
                <button
                  type="button"
                  onClick={requestClearDownloads}
                  className="border-2 border-black bg-white px-3 py-1.5 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000]"
                >
                  Clear Download History
                </button>
              )}
          </div>
          {deviceDownloads.length === 0 ? (
            <div className="border-2 border-black bg-neutral-50 px-4 py-3 text-xs font-bold uppercase text-stone-500 shadow-[2px_2px_0px_0px_#000]">
              Files you save will show up here.
            </div>
          ) : (
            <div
              className="space-y-3"
              style={{ contentVisibility: "auto", containIntrinsicSize: "1px 640px" }}
            >
              {deviceDownloads.map((entry) => {
                const Icon = getItemIcon(entry.mimeType);
                const tone = getRowTone(entry.mimeType);
                const detailLine = [
                  getMimeLabel(entry.mimeType, entry.name),
                  formatBytes(entry.size),
                  `Saved ${formatDate(entry.downloadedAt)}`,
                ]
                  .filter(Boolean)
                  .join(" • ");
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "group w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-black px-4 py-3 text-left shadow-[2px_2px_0px_0px_#000] transition-transform transition-shadow transition-colors duration-150 bg-white even:bg-[#FFFCF3]",
                      tone.row,
                    )}
                  >
                    <div className="flex flex-1 min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center border-2 border-black shadow-[3px_3px_0px_0px_#000]",
                          tone.icon,
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-black uppercase text-stone-900 truncate">
                          {entry.name}
                        </p>
                        <p className="text-[11px] font-bold uppercase text-stone-500/80">
                          {detailLine}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => requestRemoveDownload(entry.id, entry.name)}
                      aria-label={`Remove ${entry.name} from download history`}
                      className="border-2 border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000]"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white border-b-4 border-black px-4 py-6 sm:px-6 shadow-[0_6px_0px_#0a0a0a]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-stone-700">
                Saved for Later
              </h2>
              <p className="text-[11px] font-bold uppercase text-stone-500">
                Files saved for when you&apos;re offline
              </p>
            </div>
            <Link
              href="/offline"
              className="border-2 border-black bg-white px-3 py-1.5 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              Manage Saved
            </Link>
          </div>
          {offlineDownloads.length === 0 ? (
            <div
              className="border-2 border-black bg-neutral-50 px-4 py-3 text-xs font-bold uppercase text-stone-500 shadow-[2px_2px_0px_0px_#000]"
              role="status"
              aria-live="polite"
            >
              Save a file to see it here.
            </div>
          ) : (
            <div
              className="space-y-3"
              style={{ contentVisibility: "auto", containIntrinsicSize: "1px 640px" }}
            >
              {offlineDownloads.map((entry) => {
                const Icon = getItemIcon(entry.meta.mimeType);
                const tone = getRowTone(entry.meta.mimeType);
                const detailLine = [
                  getMimeLabel(entry.meta.mimeType, entry.meta.name),
                  formatBytes(Number(entry.meta.size) || 0),
                  `Saved ${formatDate(entry.meta.cachedAt)}`,
                ]
                  .filter(Boolean)
                  .join(" • ");
                return (
                  <div
                    key={entry.resourceId}
                    className={cn(
                      "group w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-black px-4 py-3 text-left shadow-[2px_2px_0px_0px_#000] transition-transform transition-shadow transition-colors duration-150 bg-white even:bg-[#FFFCF3]",
                      tone.row,
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => openOfflineResource(entry.resourceId)}
                      aria-label={`Open ${entry.meta.name ?? "saved file"}`}
                      className="flex flex-1 min-w-0 min-h-[44px] items-center gap-3 text-left transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center border-2 border-black shadow-[3px_3px_0px_0px_#000]",
                          tone.icon,
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p
                          className="text-sm font-black uppercase text-stone-900 truncate"
                          title={entry.meta.name ?? "Saved file"}
                        >
                          {entry.meta.name ?? "Saved file"}
                        </p>
                        <p className="text-[11px] font-bold uppercase text-stone-500/80">
                          {detailLine}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 border-2 border-black bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase leading-none shadow-[2px_2px_0px_0px_#000]">
                        <Download className="h-3 w-3 text-emerald-700" aria-hidden="true" />
                        Saved
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          requestRemoveSaved(
                            entry.resourceId,
                            entry.meta.name ?? "Saved file",
                          )
                        }
                        aria-label={`Remove ${entry.meta.name ?? "saved file"} from saved files`}
                        className="min-h-[44px] border-2 border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={Boolean(confirmState)}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
      >
        <DialogContent className="border-2 border-black bg-white shadow-[6px_6px_0px_0px_#000] max-w-[92vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase text-stone-900">
              {confirmCopy?.title ?? "Confirm"}
            </DialogTitle>
            <DialogDescription className="text-sm font-bold text-stone-600">
              {confirmCopy?.description ?? "Confirm this action."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <DialogClose asChild>
              <button
                type="button"
                className="border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000] hover:bg-yellow-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={handleConfirmAction}
              className="border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white shadow-[3px_3px_0px_0px_#000] hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              {confirmCopy?.confirmLabel ?? "Confirm"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StudyrixFooter />
    </div>
  );
}
