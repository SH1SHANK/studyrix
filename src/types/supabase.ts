export type CourseRecordRow = {
  courseID: string;
  courseName: string | null;
  syllabusAssets: unknown | null;
  department_id: string | null;
  semesterID: number | null;
};

export type Database = {
  public: {
    Tables: {
      courseRecords: {
        Row: CourseRecordRow;
        Insert: Partial<CourseRecordRow>;
        Update: Partial<CourseRecordRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
