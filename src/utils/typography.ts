/**
 * Typography utility for mapping design token roles to CSS classes
 * 
 * @example
 * const displayClass = getTypographyClass('display');
 */

export type TypographyRole = 'display' | 'title' | 'subtitle' | 'body' | 'caption' | 'mono';

/**
 * Maps a typography role to its corresponding CSS class
 * The class automatically handles responsive scaling via CSS variables
 * 
 * @param role - The typography role: display, title, subtitle, body, caption, or mono
 * @returns CSS class name for the role
 */
export function getTypographyClass(role: TypographyRole): string {
  const classMap: Record<TypographyRole, string> = {
    display: 'text-display',
    title: 'text-title',
    subtitle: 'text-subtitle',
    body: 'text-body',
    caption: 'text-caption',
    mono: 'text-mono',
  };

  return classMap[role];
}

