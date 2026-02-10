export const queryKeys = {
  resourceCourses: (
    scope: string | null,
    departmentId: string | null,
    semesterId: number | null,
  ) => ["resource-courses", scope, departmentId, semesterId] as const,
  resourceFilters: (departmentId: string | null) =>
    ["resource-filters", departmentId] as const,
  driveFolder: (folderId: string | null) =>
    ["drive-folder", folderId] as const,
};
