export interface ProgressPhoto {
  id: string;
  date: string;          // YYYY-MM-DD, user-selected
  imageUri: string;
  caption?: string;
  streakDays?: number;   // snapshot at time of upload
  level?: number;        // snapshot at time of upload
  totalXP?: number;      // snapshot at time of upload
}
