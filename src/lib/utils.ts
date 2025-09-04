import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    
    const startDateTime = new Date(`${today}T${start}:00`);
    const endDateTime = new Date(`${today}T${end}:00`);

    if (endDateTime < startDateTime) {
      // Handle overnight shifts by adding a day to the end time
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    return Math.round(diffMs / 60000); // convert milliseconds to minutes
};
