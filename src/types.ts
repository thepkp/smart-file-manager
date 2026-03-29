export type MaterialType = 'assignment' | 'tutorial' | 'link' | 'pyq' | 'note';
export type AssignmentStatus = 'pending' | 'completed' | 'none';
export type PriorityLevel = 'high' | 'medium' | 'low' | 'none';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  currentSemester?: string;
  subjects?: string[];
}

export interface Material {
  id: string;
  uid: string;
  title: string;
  type: MaterialType;
  content: string;
  subject: string;
  semester: string;
  status: AssignmentStatus;
  priority: PriorityLevel;
  aiSummary?: string;
  isPublic?: boolean;
  dueDate?: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
}
