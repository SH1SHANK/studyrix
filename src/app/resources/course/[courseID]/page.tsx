import { MobileFileManager } from "@/components/file-manager/mobile-file-manager";

type CoursePageProps = {
  params: Promise<{ courseID: string }>;
};

export default async function CoursePage({ params }: CoursePageProps) {
  const resolved = await params;
  const initialCourseId = decodeURIComponent(resolved.courseID);
  return <MobileFileManager initialTab="browse" initialCourseId={initialCourseId} />;
}
