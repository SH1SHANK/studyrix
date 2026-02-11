export type CourseUnit = {
  title: string;
  resourceCount: number;
  format: "Notes" | "PYQ" | "Slides" | "Lab";
};

export type CourseCatalogItem = {
  id: string;
  title: string;
  department: string;
  semester: number;
  faculty: string;
  updatedAt: string;
  totalResources: number;
  completion: number;
  units: CourseUnit[];
};

export type DownloadItem = {
  id: string;
  title: string;
  courseId: string;
  format: "PDF" | "PPT" | "ZIP" | "DOC";
  size: string;
  downloadedAt: string;
};

export type OfflinePack = {
  id: string;
  name: string;
  department: string;
  semester: number;
  cachedFiles: number;
  size: string;
  status: "Fresh" | "Needs Sync";
};

export type LaunchpadGroup = {
  id: string;
  name: string;
  description: string;
  href: string;
};

export const APP_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/resources", label: "Library" },
  { href: "/resources/downloads", label: "Downloads" },
  { href: "/resources/offline", label: "Offline" },
  { href: "/resources/settings", label: "Settings" },
  { href: "/launchpad", label: "Launchpad" },
];

export const COURSE_CATALOG: CourseCatalogItem[] = [
  {
    id: "CS201",
    title: "Data Structures and Algorithms",
    department: "CSE",
    semester: 3,
    faculty: "Dr. Lisha Mathew",
    updatedAt: "2026-02-03",
    totalResources: 126,
    completion: 84,
    units: [
      { title: "Asymptotic Analysis", resourceCount: 18, format: "Notes" },
      { title: "Trees and Heaps", resourceCount: 24, format: "PYQ" },
      { title: "Graphs", resourceCount: 22, format: "Slides" },
      { title: "Advanced Problems", resourceCount: 19, format: "Lab" },
    ],
  },
  {
    id: "MA202",
    title: "Linear Algebra and Differential Equations",
    department: "MATH",
    semester: 3,
    faculty: "Prof. Anjana R",
    updatedAt: "2026-01-31",
    totalResources: 92,
    completion: 69,
    units: [
      { title: "Vector Spaces", resourceCount: 21, format: "Notes" },
      { title: "Eigenvalues", resourceCount: 17, format: "PYQ" },
      { title: "Differential Systems", resourceCount: 28, format: "Slides" },
      { title: "Practice Sets", resourceCount: 11, format: "Lab" },
    ],
  },
  {
    id: "EC301",
    title: "Signals and Systems",
    department: "ECE",
    semester: 4,
    faculty: "Dr. Roshan Kurian",
    updatedAt: "2026-02-09",
    totalResources: 111,
    completion: 77,
    units: [
      { title: "Signal Classification", resourceCount: 14, format: "Notes" },
      { title: "Fourier Methods", resourceCount: 27, format: "Slides" },
      { title: "PYQ Drill", resourceCount: 23, format: "PYQ" },
      { title: "Simulation Files", resourceCount: 16, format: "Lab" },
    ],
  },
  {
    id: "ME210",
    title: "Thermodynamics",
    department: "MECH",
    semester: 4,
    faculty: "Prof. Hari Prasad",
    updatedAt: "2026-01-28",
    totalResources: 73,
    completion: 58,
    units: [
      { title: "First Law", resourceCount: 16, format: "Notes" },
      { title: "Second Law", resourceCount: 18, format: "Slides" },
      { title: "Cycle Analysis", resourceCount: 15, format: "PYQ" },
      { title: "Lab Sheets", resourceCount: 9, format: "Lab" },
    ],
  },
];

export const DOWNLOAD_ITEMS: DownloadItem[] = [
  {
    id: "dl-1",
    title: "DSA Midsem PYQ Set",
    courseId: "CS201",
    format: "PDF",
    size: "8.2 MB",
    downloadedAt: "2026-02-10",
  },
  {
    id: "dl-2",
    title: "Signals Unit 3 Slides",
    courseId: "EC301",
    format: "PPT",
    size: "11.4 MB",
    downloadedAt: "2026-02-09",
  },
  {
    id: "dl-3",
    title: "Thermo Lab Handbook",
    courseId: "ME210",
    format: "ZIP",
    size: "24.7 MB",
    downloadedAt: "2026-02-06",
  },
  {
    id: "dl-4",
    title: "Linear Algebra Quick Notes",
    courseId: "MA202",
    format: "DOC",
    size: "2.1 MB",
    downloadedAt: "2026-02-04",
  },
];

export const OFFLINE_PACKS: OfflinePack[] = [
  {
    id: "pack-1",
    name: "CSE Semester 3 Core Pack",
    department: "CSE",
    semester: 3,
    cachedFiles: 248,
    size: "1.6 GB",
    status: "Fresh",
  },
  {
    id: "pack-2",
    name: "ECE Semester 4 Exam Sprint",
    department: "ECE",
    semester: 4,
    cachedFiles: 179,
    size: "980 MB",
    status: "Needs Sync",
  },
  {
    id: "pack-3",
    name: "Math Foundations Essentials",
    department: "MATH",
    semester: 3,
    cachedFiles: 141,
    size: "742 MB",
    status: "Fresh",
  },
];

export const LAUNCHPAD_GROUPS: LaunchpadGroup[] = [
  {
    id: "group-b25-academics",
    name: "B25 Academics",
    description: "Midsem and endsem resources with subject wise discussion.",
    href: "https://chat.whatsapp.com/HPK5NuYpPl9FXr8NIOlhd3?mode=gi_t",
  },
  {
    id: "group-b25-software",
    name: "B25 Software",
    description: "DSA, web development, app dev and AI/ML support tracks.",
    href: "https://chat.whatsapp.com/EnjBGSzZN6DHLiozCAYGzh?mode=gi_t",
  },
  {
    id: "group-launchpad-community",
    name: "Launchpad Community",
    description: "Announcements, mentor sessions, and cross-batch help.",
    href: "https://chat.whatsapp.com/LPo58YtgH4dFcq5m4xw8jK?mode=gi_t",
  },
];

export function findCourseById(courseId: string): CourseCatalogItem | null {
  const normalizedId = courseId.trim().toUpperCase();
  return COURSE_CATALOG.find((course) => course.id.toUpperCase() === normalizedId) ?? null;
}

