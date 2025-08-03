import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { User } from 'firebase/auth'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getUserDisplayName(user: User | null): string {
  if (!user) return 'Guest'
  
  // If user has a display name, use it
  if (user.displayName) {
    return user.displayName
  }
  
  // If user has an email, extract name from email
  if (user.email) {
    const emailName = user.email.split('@')[0]
    // Capitalize first letter and replace dots/underscores with spaces
    return emailName
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }
  
  // Fallback to email or 'User'
  return user.email || 'User'
}
