import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

declare module 'fs' {
  export function readFileSync(path: string, encoding: string): string;
}
declare module 'path' {
  export function resolve(...paths: string[]): string;
}
declare const process: { cwd: () => string };

describe('Motion CSS Custom Properties & Fallbacks', () => {
  const rootDir = process.cwd();
  const indexCssPath = resolve(rootDir, 'src/index.css');
  const layoutCssPath = resolve(rootDir, 'src/components/Layout.css');
  const walletCssPath = resolve(rootDir, 'src/components/Wallet/wallet.css');
  const themeTogglePath = resolve(rootDir, 'src/components/ThemeToggle.tsx');
  const vaultTxPath = resolve(rootDir, 'src/pages/VaultTransactions.tsx');

  it('defines all motion custom properties in src/index.css :root block', () => {
    const content = readFileSync(indexCssPath, 'utf-8');

    const expectedTokens = [
      '--duration-micro: 100ms;',
      '--duration-fast: 150ms;',
      '--duration-normal: 200ms;',
      '--duration-moderate: 300ms;',
      '--duration-slow: 400ms;',
      '--duration-slower: 500ms;',
      '--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);',
      '--ease-out: cubic-bezier(0, 0, 0.2, 1);',
      '--ease-in: cubic-bezier(0.4, 0, 1, 1);',
      '--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);',
      '--ease-smooth: cubic-bezier(0.25, 0.1, 0.25, 1);',
    ];

    expectedTokens.forEach((token) => {
      expect(content).toContain(token);
    });
  });

  it('ensures no un-fallback-backed var(--ease-in-out) or var(--ease-out) exist in key component files', () => {
    const filesToTest = [
      { path: layoutCssPath, name: 'Layout.css' },
      { path: walletCssPath, name: 'wallet.css' },
      { path: themeTogglePath, name: 'ThemeToggle.tsx' },
      { path: vaultTxPath, name: 'VaultTransactions.tsx' },
    ];

    const bareEaseRegex = /var\(\s*--(ease-in-out|ease-out)\s*\)/g;

    filesToTest.forEach(({ path, name }) => {
      const content = readFileSync(path, 'utf-8');
      const matches = content.match(bareEaseRegex);
      expect(
        matches,
        `Expected ${name} to have no bare var(--ease-in-out) or var(--ease-out) without fallbacks`,
      ).toBeNull();
    });
  });

  it('verifies fallback values are present in key component files for ease variables', () => {
    const filesToTest = [
      { path: layoutCssPath, name: 'Layout.css' },
      { path: walletCssPath, name: 'wallet.css' },
      { path: themeTogglePath, name: 'ThemeToggle.tsx' },
      { path: vaultTxPath, name: 'VaultTransactions.tsx' },
    ];

    const fallbackEaseRegex = /var\(\s*--(ease-in-out|ease-out)\s*,\s*[^)]+\)/g;

    filesToTest.forEach(({ path, name }) => {
      const content = readFileSync(path, 'utf-8');
      const matches = content.match(fallbackEaseRegex);
      expect(
        matches?.length,
        `Expected ${name} to contain fallback-backed var(--ease-*) declarations`,
      ).toBeGreaterThan(0);
    });
  });
});
