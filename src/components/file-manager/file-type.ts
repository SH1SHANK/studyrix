import {
  Archive,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  ImageIcon,
  Presentation,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { FileNode } from "@/types/resources";

export type FileVisual = {
  Icon: LucideIcon;
  wrapperClass: string;
  iconClass: string;
  rowHoverClass: string;
};

function isPdf(mimeType: string) {
  return mimeType.includes("pdf");
}

function isDoc(mimeType: string) {
  return mimeType.includes("word") || mimeType.includes("document");
}

function isPresentation(mimeType: string) {
  return mimeType.includes("presentation") || mimeType.includes("powerpoint");
}

function isSpreadsheet(mimeType: string) {
  return mimeType.includes("spreadsheet") || mimeType.includes("sheet") || mimeType.includes("excel");
}

function isZip(mimeType: string) {
  return mimeType.includes("zip") || mimeType.includes("compressed") || mimeType.includes("archive");
}

function isImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

function isVideo(mimeType: string) {
  return mimeType.startsWith("video/");
}

const VISUALS = {
  folder: {
    Icon: Folder,
    wrapperClass: "bg-blue-100",
    iconClass: "text-blue-700",
    rowHoverClass: "hover:bg-blue-50",
  },
  pdf: {
    Icon: FileText,
    wrapperClass: "bg-red-100",
    iconClass: "text-red-700",
    rowHoverClass: "hover:bg-red-50/40",
  },
  doc: {
    Icon: FileText,
    wrapperClass: "bg-blue-100",
    iconClass: "text-blue-700",
    rowHoverClass: "hover:bg-blue-50/35",
  },
  ppt: {
    Icon: Presentation,
    wrapperClass: "bg-orange-100",
    iconClass: "text-orange-700",
    rowHoverClass: "hover:bg-orange-50/35",
  },
  xls: {
    Icon: FileSpreadsheet,
    wrapperClass: "bg-green-100",
    iconClass: "text-green-700",
    rowHoverClass: "hover:bg-green-50/35",
  },
  zip: {
    Icon: Archive,
    wrapperClass: "bg-purple-100",
    iconClass: "text-purple-700",
    rowHoverClass: "hover:bg-purple-50/35",
  },
  image: {
    Icon: ImageIcon,
    wrapperClass: "bg-pink-100",
    iconClass: "text-pink-700",
    rowHoverClass: "hover:bg-pink-50/35",
  },
  video: {
    Icon: Video,
    wrapperClass: "bg-indigo-100",
    iconClass: "text-indigo-700",
    rowHoverClass: "hover:bg-indigo-50/35",
  },
  other: {
    Icon: File,
    wrapperClass: "bg-slate-200",
    iconClass: "text-slate-700",
    rowHoverClass: "hover:bg-slate-100/50",
  },
} satisfies Record<string, FileVisual>;

export function getFileVisual(node: FileNode): FileVisual {
  const mimeType = node.mimeType.toLowerCase();

  if (node.type === "folder") return VISUALS.folder;
  if (isPdf(mimeType)) return VISUALS.pdf;
  if (isDoc(mimeType)) return VISUALS.doc;
  if (isPresentation(mimeType)) return VISUALS.ppt;
  if (isSpreadsheet(mimeType)) return VISUALS.xls;
  if (isZip(mimeType)) return VISUALS.zip;
  if (isImage(mimeType)) return VISUALS.image;
  if (isVideo(mimeType)) return VISUALS.video;

  return VISUALS.other;
}
