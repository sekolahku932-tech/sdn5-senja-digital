export type Role = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: Role;
  assignedClass?: string; // For teachers (e.g., "1", "6")
}

export interface Student {
  id: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  grade: string; // Kelas 1-6
}

export interface Question {
  id: string;
  text: string;
}

export interface Material {
  id: string;
  grade: string;
  title: string;
  type: 'pdf' | 'video' | 'article' | 'image';
  url: string; // Link to PDF or Video OR Base64 Data
  questions: Question[]; // Reflection questions
  taskDescription: string;
}

export interface FileAttachment {
  name: string;
  type: string;
  data: string; // Base64 string
}

export interface SubmissionAnswer {
  questionId: string;
  answer: string;
  attachment?: FileAttachment;
}

export interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  materialId: string;
  materialTitle: string;
  answers: SubmissionAnswer[];
  taskResponse: string; // Text description
  taskAttachments?: FileAttachment[]; // Array of files for the task
  feedback?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  grade?: string; // Class
}

export interface AppSettings {
  certBackground: string; // Base64 image
}