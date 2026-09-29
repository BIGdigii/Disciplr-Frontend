import { describe, expect, it } from 'vitest';
import {
  getTypographyClass,
  type TypographyRole,
} from '../typography';

describe('getTypographyClass', () => {
  const cases: [TypographyRole, string][] = [
    ['display', 'text-display'],
    ['title', 'text-title'],
    ['subtitle', 'text-subtitle'],
    ['body', 'text-body'],
    ['caption', 'text-caption'],
    ['mono', 'text-mono'],
  ];

  it.each(cases)(
    'maps role "%s" to class "%s"',
    (role, expected) => {
      expect(getTypographyClass(role)).toBe(expected);
    },
  );

  it('returns a non-empty string for every role', () => {
    const roles: TypographyRole[] = [
      'display', 'title', 'subtitle', 'body', 'caption', 'mono',
    ];
    roles.forEach(role => {
      expect(getTypographyClass(role)).toBeTruthy();
    });
  });

  it('does not export classifyTypography ensuring dead export surface is removed', async () => {
    const module = await import('../typography');
    expect('classifyTypography' in module).toBe(false);
  });
});

