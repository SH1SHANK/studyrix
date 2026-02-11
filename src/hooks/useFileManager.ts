"use client";

import { shallow } from "zustand/shallow";
import { useFileManagerStore } from "@/lib/file-manager/store";

export function useFileManagerActions() {
  return useFileManagerStore(
    (state) => ({
      initialize: state.initialize,
      setViewMode: state.setViewMode,
      setSearchQuery: state.setSearchQuery,
      setTagFilter: state.setTagFilter,
      setRootFolder: state.setRootFolder,
      loadFolder: state.loadFolder,
      openFolder: state.openFolder,
      goBack: state.goBack,
      navigateToStackIndex: state.navigateToStackIndex,
      refreshCurrentFolder: state.refreshCurrentFolder,
      clearFolderCache: state.clearFolderCache,
      createTag: state.createTag,
      editTag: state.editTag,
      deleteTag: state.deleteTag,
      toggleTagForFile: state.toggleTagForFile,
      setTagsForFile: state.setTagsForFile,
      setStorageMode: state.setStorageMode,
      saveFileOffline: state.saveFileOffline,
      removeOfflineEntry: state.removeOfflineEntry,
      clearOfflineEntries: state.clearOfflineEntries,
      openFile: state.openFile,
      downloadFile: state.downloadFile,
    }),
    shallow,
  );
}

export function useFileManagerBrowseState() {
  return useFileManagerStore(
    (state) => ({
      currentFolder: state.currentFolder,
      folderStack: state.folderStack,
      driveFiles: state.driveFiles,
      searchQuery: state.searchQuery,
      debouncedSearchQuery: state.debouncedSearchQuery,
      selectedTagId: state.selectedTagId,
      isLoading: state.isLoading,
      error: state.error,
      rootFolderId: state.rootFolderId,
      rootFolderName: state.rootFolderName,
    }),
    shallow,
  );
}

export function useFileManagerLocalState() {
  return useFileManagerStore(
    (state) => ({
      tags: state.tags,
      fileTags: state.fileTags,
      offlineFiles: state.offlineFiles,
      storageMode: state.storageMode,
      canUseDeviceStorage: state.canUseDeviceStorage,
      deviceStorageReady: state.deviceStorageReady,
      viewMode: state.viewMode,
    }),
    shallow,
  );
}
