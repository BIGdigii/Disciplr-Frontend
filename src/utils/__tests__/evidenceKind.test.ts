import { classifyEvidenceUrl, EVIDENCE_BADGE_COLORS } from '../evidenceKind';
import type { EvidenceKind } from '../evidenceKind';

describe('evidenceKind', () => {
  describe('EVIDENCE_BADGE_COLORS', () => {
    const ALL_KINDS: EvidenceKind[] = ['github', 'figma', 'ipfs', 'other'];

    it('defines a color for every EvidenceKind', () => {
      ALL_KINDS.forEach((kind) => {
        expect(EVIDENCE_BADGE_COLORS[kind]).toBeDefined();
        expect(EVIDENCE_BADGE_COLORS[kind]).not.toBe('');
      });
    });

    it('uses the correct GitHub brand hex', () => {
      expect(EVIDENCE_BADGE_COLORS.github).toBe('#24292e');
    });

    it('uses the correct Figma brand hex', () => {
      expect(EVIDENCE_BADGE_COLORS.figma).toBe('#f24e1e');
    });

    it('uses the correct IPFS brand hex', () => {
      expect(EVIDENCE_BADGE_COLORS.ipfs).toBe('#65c3cb');
    });

    it('uses a CSS variable for other (no single brand color)', () => {
      expect(EVIDENCE_BADGE_COLORS.other).toMatch(/^var\(/);
    });
  });

  describe('classifyEvidenceUrl', () => {
    it('should classify GitHub URLs', () => {
      expect(classifyEvidenceUrl('https://github.com/user/repo')).toEqual({
        kind: 'github',
        host: 'github.com'
      });
    });

    it('should classify Figma URLs', () => {
      // Host is normalized to the canonical brand hostname, same as GitHub above.
      expect(classifyEvidenceUrl('https://www.figma.com/file/abc123')).toEqual({
        kind: 'figma',
        host: 'figma.com'
      });
    });

    it('should classify IPFS URLs with hostname containing ipfs', () => {
      expect(classifyEvidenceUrl('https://ipfs.io/ipfs/QmXoyp')).toEqual({
        kind: 'ipfs',
        host: 'ipfs.io'
      });
    });

    it('should classify other URLs', () => {
      expect(classifyEvidenceUrl('https://example.com')).toEqual({
        kind: 'other',
        host: 'example.com'
      });
    });

    it('should return null for invalid URLs', () => {
      expect(classifyEvidenceUrl('not-a-valid-url')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(classifyEvidenceUrl('')).toBeNull();
    });
  });
});
