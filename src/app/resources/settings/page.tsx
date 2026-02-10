"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  HardDrive,
  Settings,
  Trash2,
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
import { StudyrixFooter } from "@/components/resources/StudyrixFooter";
import { useStudyMaterialsPreferences } from "@/hooks/useStudyMaterialsPreferences";
import { useOfflineManager } from "@/hooks/useOfflineManager";
import { useOfflineStorageUsage } from "@/hooks/useOfflineStorageUsage";
import { useResourceFilters } from "@/hooks/useResources";
import {
  hasFolderAccessSupport,
  requestOfflineFolderAccess,
} from "@/lib/resources/offline-folder";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CACHE_LIMIT_MIN_MB = 50;
const CACHE_LIMIT_MAX_MB = 2000;
const CACHE_LIMIT_STEP_MB = 10;
const CACHE_LIMIT_DEFAULT_MB = 500;
const DEFAULT_SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function ResourcesSettingsPage() {
  const {
    loaded: prefsLoaded,
    offlineFiles,
    cacheConfig,
    offlineStorageMode,
    departmentId,
    semesterId,
    updateCacheConfig,
    updateOfflineStorageMode,
    removeOfflineFiles,
    setOfflineFile,
    replaceOfflineFiles,
    updateDepartmentSemester,
  } = useStudyMaterialsPreferences(null);
  const cacheLimitMb = cacheConfig.limitMb ?? null;
  const offlineManager = useOfflineManager({
    loaded: prefsLoaded,
    offlineFiles,
    offlineStorageMode,
    cacheLimitMb,
    setOfflineFile,
    removeOfflineFiles,
    replaceOfflineFiles,
    updateOfflineStorageMode,
  });
  const isUnlimited = cacheLimitMb === null;
  const storageUsage = useOfflineStorageUsage(offlineFiles, cacheLimitMb);
  const [showFolderConfirm, setShowFolderConfirm] = useState(false);
  const [folderPending, setFolderPending] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [draftDepartmentId, setDraftDepartmentId] = useState("");
  const [draftSemesterId, setDraftSemesterId] = useState<number | null>(null);
  const departmentsQuery = useResourceFilters(null);
  const semestersQuery = useResourceFilters(
    draftDepartmentId ? draftDepartmentId : null,
  );
  const departments = useMemo(
    () => departmentsQuery.data?.departments ?? [],
    [departmentsQuery.data],
  );
  const semestersFromApi = useMemo(
    () => semestersQuery.data?.semesters ?? [],
    [semestersQuery.data],
  );
  const semesterOptions = useMemo(() => {
    if (!draftDepartmentId) return DEFAULT_SEMESTERS;
    return semestersFromApi.length > 0 ? semestersFromApi : DEFAULT_SEMESTERS;
  }, [draftDepartmentId, semestersFromApi]);
  const selectionChanged =
    (draftDepartmentId || "") !== (departmentId || "") ||
    draftSemesterId !== (typeof semesterId === "number" ? semesterId : null);
  const [pendingLimit, setPendingLimit] = useState(() => {
    if (cacheLimitMb && Number.isFinite(cacheLimitMb)) {
      return Math.min(
        CACHE_LIMIT_MAX_MB,
        Math.max(CACHE_LIMIT_MIN_MB, Math.round(cacheLimitMb)),
      );
    }
    return CACHE_LIMIT_DEFAULT_MB;
  });
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evictionRef = useRef({ active: false });
  const hasOfflineFiles = Object.keys(offlineFiles).length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    setDraftDepartmentId(departmentId ?? "");
    setDraftSemesterId(
      typeof semesterId === "number" && Number.isFinite(semesterId)
        ? semesterId
        : null,
    );
  }, [departmentId, prefsLoaded, semesterId]);

  useEffect(() => {
    if (!draftDepartmentId) {
      if (draftSemesterId !== null) {
        setDraftSemesterId(null);
      }
      return;
    }
    if (
      typeof draftSemesterId === "number" &&
      !semesterOptions.includes(draftSemesterId)
    ) {
      setDraftSemesterId(null);
    }
  }, [draftDepartmentId, draftSemesterId, semesterOptions]);

  useEffect(() => {
    if (cacheLimitMb === null || !Number.isFinite(cacheLimitMb)) return;
    setPendingLimit(
      Math.min(
        CACHE_LIMIT_MAX_MB,
        Math.max(CACHE_LIMIT_MIN_MB, Math.round(cacheLimitMb)),
      ),
    );
  }, [cacheLimitMb]);

  useEffect(() => {
    if (cacheLimitMb === null) return;
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    updateTimerRef.current = setTimeout(() => {
      updateCacheConfig(pendingLimit);
    }, 250);
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, [cacheLimitMb, pendingLimit, updateCacheConfig]);

  const handleSliderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setPendingLimit(Number(event.target.value));
    },
    [],
  );

  const handleUnlimitedToggle = useCallback(() => {
    if (cacheLimitMb === null) {
      updateCacheConfig(pendingLimit);
    } else {
      updateCacheConfig(null);
    }
  }, [cacheLimitMb, pendingLimit, updateCacheConfig]);

  const handleSaveSelection = useCallback(() => {
    if (!draftDepartmentId || draftSemesterId === null) {
      toast.error("Please select both a department and semester.");
      return;
    }
    updateDepartmentSemester(draftDepartmentId, draftSemesterId);
    toast.message("Department and semester updated.");
  }, [draftDepartmentId, draftSemesterId, updateDepartmentSemester]);

  const handleStorageModeChange = useCallback(
    (nextMode: "web" | "folder") => {
      if (nextMode === "folder") {
        if (!hasFolderAccessSupport()) {
          toast.error("This browser doesn't support device folders.");
          return;
        }
        setShowFolderConfirm(true);
        return;
      }
      setShowFolderConfirm(false);
      updateOfflineStorageMode("web");
    },
    [updateOfflineStorageMode],
  );

  const handleConfirmFolderMode = useCallback(async () => {
    if (folderPending) return;
    setFolderPending(true);
    try {
      const handle = await requestOfflineFolderAccess();
      if (!handle) {
        toast.error("We couldn't use that folder. We'll keep files in the app.");
        updateOfflineStorageMode("web");
        return;
      }
      updateOfflineStorageMode("folder");
      toast.message("Device folder enabled.");
      setShowFolderConfirm(false);
    } finally {
      setFolderPending(false);
    }
  }, [folderPending, updateOfflineStorageMode]);

  const handleKeepWebCache = useCallback(() => {
    setShowFolderConfirm(false);
    updateOfflineStorageMode("web");
  }, [updateOfflineStorageMode]);

  const handleClearOfflineCache = useCallback(async () => {
    await offlineManager.clearAllOffline();
    toast.message("Saved files cleared.");
  }, [offlineManager]);

  const requestClearOfflineCache = useCallback(() => {
    if (!hasOfflineFiles) {
      toast.message("No saved files to clear.");
      return;
    }
    setConfirmClearOpen(true);
  }, [hasOfflineFiles]);

  useEffect(() => {
    if (cacheLimitMb === null || !Number.isFinite(cacheLimitMb)) return;
    if (cacheLimitMb <= 0) return;
    if (evictionRef.current.active) return;
    evictionRef.current.active = true;
    const evict = async () => {
      await offlineManager.enforceCacheLimit(cacheLimitMb);
      evictionRef.current.active = false;
    };
    void evict();
  }, [cacheLimitMb, offlineManager]);

  return (
    <div className="min-h-screen bg-neutral-50 pb-24 transition-colors duration-300 relative isolate">
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
        className="mx-auto max-w-4xl relative z-10 px-4 sm:px-6 pt-4 pb-6"
      >
        <header className="bg-white border-b-4 border-black px-4 py-3 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/"
                aria-label="Back to resources"
                className="h-10 w-10 border-2 border-black bg-white flex items-center justify-center shadow-[3px_3px_0_#0a0a0a] transition-colors duration-150 transition-transform hover:bg-yellow-50 active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center border-2 border-black bg-[#FFD700] shadow-[3px_3px_0px_0px_#000]">
                    <Settings className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-stone-900 tracking-tight">
                      Study Materials Settings
                    </h1>
                    <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-stone-500">
                      Saved Files and Space
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <span className="flex h-10 w-10 items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000]">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </header>

        <section className="bg-white border-b-4 border-black px-4 py-5 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-black uppercase text-stone-700">
                Department & Semester
              </p>
              <p className="text-[11px] font-bold uppercase text-stone-500">
                Change the study materials view
              </p>
            </div>
            {departmentId && typeof semesterId === "number" && (
              <span className="border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000]">
                Current: {departmentId} • Semester {semesterId}
              </span>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-[11px] font-black uppercase text-stone-600"
                htmlFor="settings-department"
              >
                Department
              </label>
              <select
                id="settings-department"
                value={draftDepartmentId}
                onChange={(event) => {
                  setDraftDepartmentId(event.target.value);
                  setDraftSemesterId(null);
                }}
                disabled={departmentsQuery.isLoading || departments.length === 0}
                name="department"
                className="w-full h-12 border-[3px] border-black bg-white px-3 text-sm font-black uppercase shadow-[3px_3px_0px_0px_#000] focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-60"
              >
                <option value="" disabled>
                  {departmentsQuery.isLoading
                    ? "Loading departments…"
                    : "Choose a department"}
                </option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {departmentsQuery.isError && (
                <p className="text-[11px] font-bold uppercase text-red-600">
                  Unable to load departments.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                className="text-[11px] font-black uppercase text-stone-600"
                htmlFor="settings-semester"
              >
                Semester
              </label>
              <select
                id="settings-semester"
                value={draftSemesterId ?? ""}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setDraftSemesterId(Number.isFinite(value) ? value : null);
                }}
                name="semester"
                disabled={!draftDepartmentId}
                className="w-full h-12 border-[3px] border-black bg-white px-3 text-sm font-black uppercase shadow-[3px_3px_0px_0px_#000] focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-60"
              >
                <option value="" disabled>
                  {draftDepartmentId
                    ? "Choose a semester"
                    : "Select a department first"}
                </option>
                {semesterOptions.map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveSelection}
              disabled={!draftDepartmentId || draftSemesterId === null}
              className="inline-flex items-center gap-2 border-2 border-black bg-[#FFD700] px-4 py-2 text-[11px] font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-transform active:scale-95 disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              Save Selection
            </button>
            {selectionChanged && (
              <span className="text-[10px] font-black uppercase text-stone-500">
                Applies immediately to course listings.
              </span>
            )}
          </div>
        </section>

        <section className="bg-white border-b-4 border-black px-4 py-5 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000]">
                <HardDrive className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-stone-700">
                  Space Used
                </p>
                <p className="text-[11px] font-bold uppercase text-stone-500">
                  Saved files on this device
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000]">
              <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {storageUsage.usedMb}
                {"\u00A0"}MB /{" "}
                {storageUsage.limitMb === null
                  ? "Unlimited"
                  : `${storageUsage.limitMb}\u00A0MB`}
              </span>
            </div>
          </div>
        </section>

        <section className="bg-white border-b-4 border-black px-4 py-5 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000]">
              <p className="text-xs font-black uppercase text-stone-700 mb-3">
                Save Limit
              </p>
              <div className="flex items-center justify-between text-[11px] font-black uppercase text-stone-500">
                <span>
                  Used {storageUsage.usedMb}
                  {"\u00A0"}MB
                </span>
                <span>
                  {isUnlimited ? "Unlimited" : `${pendingLimit}\u00A0MB`}
                </span>
              </div>
              <div className="mt-3">
                <input
                  type="range"
                  min={CACHE_LIMIT_MIN_MB}
                  max={CACHE_LIMIT_MAX_MB}
                  step={CACHE_LIMIT_STEP_MB}
                  value={pendingLimit}
                  onChange={handleSliderChange}
                  disabled={isUnlimited}
                  aria-label="Save limit"
                  name="cache-limit"
                  autoComplete="off"
                  className="w-full accent-black disabled:opacity-60"
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label
                  htmlFor="cache-unlimited"
                  className="flex items-center gap-2 border-2 border-black bg-white px-3 py-2 text-[11px] font-black uppercase shadow-[2px_2px_0px_0px_#000] cursor-pointer transition-colors duration-150 hover:bg-yellow-50"
                >
                  <input
                    id="cache-unlimited"
                    type="checkbox"
                    checked={isUnlimited}
                    onChange={handleUnlimitedToggle}
                    name="cache-unlimited"
                    autoComplete="off"
                    className="h-3.5 w-3.5 border-2 border-black"
                  />
                  Unlimited
                </label>
                {!isUnlimited && (
                  <span className="text-[10px] font-black uppercase text-stone-500">
                    +{CACHE_LIMIT_STEP_MB}
                    {"\u00A0"}MB steps
                  </span>
                )}
              </div>
            </div>

            <div className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000]">
              <p className="text-xs font-black uppercase text-stone-700 mb-3">
                Save Location
              </p>
              <div className="space-y-2">
                <label
                  htmlFor="offline-web"
                  className="flex items-center gap-2 border-2 border-black bg-white px-3 py-2 text-[11px] font-black uppercase shadow-[2px_2px_0px_0px_#000] cursor-pointer transition-colors duration-150 hover:bg-yellow-50"
                >
                  <input
                    id="offline-web"
                    type="radio"
                    name="offline-mode"
                    checked={offlineStorageMode === "web"}
                    onChange={() => handleStorageModeChange("web")}
                    autoComplete="off"
                    className="h-3.5 w-3.5 border-2 border-black"
                  />
                  In this app
                </label>
                <label
                  htmlFor="offline-folder"
                  className={cn(
                    "flex items-center gap-2 border-2 border-black px-3 py-2 text-[11px] font-black uppercase shadow-[2px_2px_0px_0px_#000] cursor-pointer transition-colors duration-150",
                    hasFolderAccessSupport()
                      ? "bg-white hover:bg-yellow-50"
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed",
                    showFolderConfirm &&
                      offlineStorageMode !== "folder" &&
                      "bg-yellow-50 ring-2 ring-black/30",
                  )}
                  aria-busy={
                    showFolderConfirm && offlineStorageMode !== "folder"
                  }
                  aria-disabled={!hasFolderAccessSupport()}
                >
                  <input
                    id="offline-folder"
                    type="radio"
                    name="offline-mode"
                    checked={offlineStorageMode === "folder"}
                    onChange={() => handleStorageModeChange("folder")}
                    disabled={!hasFolderAccessSupport()}
                    autoComplete="off"
                    className={cn(
                      "h-3.5 w-3.5 border-2 border-black",
                      showFolderConfirm &&
                        offlineStorageMode !== "folder" &&
                        "ring-2 ring-black/30 ring-offset-2 ring-offset-yellow-50",
                    )}
                  />
                  Device folder
                  {showFolderConfirm &&
                    offlineStorageMode !== "folder" && (
                      <span className="ml-auto border-2 border-black bg-white px-2 py-0.5 text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_#000]">
                        Pending
                      </span>
                    )}
                </label>
              </div>
              <p className="mt-3 text-[10px] font-bold uppercase text-stone-500">
                Device folder keeps files in a folder on this device. You&apos;ll
                be asked to allow it.
              </p>
              {showFolderConfirm && offlineStorageMode !== "folder" && (
                <div className="mt-3 border-2 border-black bg-yellow-50 px-3 py-3 text-[11px] font-bold uppercase text-stone-600 shadow-[2px_2px_0px_0px_#000]">
                  <p className="mb-3">
                    Choose a folder on this device for saved files. If you
                    skip, we&apos;ll keep using this app.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmFolderMode}
                      disabled={folderPending}
                      className="inline-flex items-center gap-2 border-2 border-black bg-[#FFD700] px-3 py-2 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000] transition-transform active:scale-95 disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                    >
                      Use device folder
                    </button>
                    <button
                      type="button"
                      onClick={handleKeepWebCache}
                      disabled={folderPending}
                      className="inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000] transition-transform active:scale-95 disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                    >
                      Use This App
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white border-b-4 border-black px-4 py-5 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-stone-700">
                Saved Files Controls
              </p>
              <p className="text-[11px] font-bold uppercase text-stone-500">
                Remove saved files on this device
              </p>
            </div>
            <button
              type="button"
              onClick={requestClearOfflineCache}
              disabled={!hasOfflineFiles}
              aria-disabled={!hasOfflineFiles}
              className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 text-[11px] font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-colors duration-150 transition-transform hover:bg-yellow-50 active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Clear Saved Files
            </button>
          </div>
        </section>
      </div>

      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="border-2 border-black bg-white shadow-[6px_6px_0px_0px_#000] max-w-[92vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase text-stone-900">
              Clear Saved Files
            </DialogTitle>
            <DialogDescription className="text-sm font-bold text-stone-600">
              Remove all saved files from this device?
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
              onClick={async () => {
                await handleClearOfflineCache();
                setConfirmClearOpen(false);
              }}
              disabled={!hasOfflineFiles}
              className="border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white shadow-[3px_3px_0px_0px_#000] hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Clear Files
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StudyrixFooter />
    </div>
  );
}
