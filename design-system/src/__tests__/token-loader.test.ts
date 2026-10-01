import { loadTokens, getAllTokens, TOKEN_FILES } from '../utils/token-loader';
import * as fs from 'fs';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('token-loader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('loadTokens', () => {
    it('should parse valid JSON', () => {
      mockedFs.readFileSync.mockReturnValue('{"color": {"primary": "red"}}');
      const tokens = loadTokens('colors.json');
      expect(tokens).toEqual({"color": {"primary": "red"}});
    });

    it('should throw if file does not exist', () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      expect(() => loadTokens('nonexistent.json')).toThrow('File not found');
    });

    it('should throw if JSON is malformed', () => {
      mockedFs.readFileSync.mockReturnValue('{"invalid": }');
      expect(() => loadTokens('invalid.json')).toThrow();
    });

    it('should throw a TypeError when the path is not a string', () => {
      expect(() => loadTokens(undefined as unknown as string)).toThrow(TypeError);
      expect(mockedFs.readFileSync).not.toHaveBeenCalled();
    });

    it('should throw a TypeError when the path is an empty string', () => {
      expect(() => loadTokens('')).toThrow(TypeError);
      expect(mockedFs.readFileSync).not.toHaveBeenCalled();
    });

    it('should reject non-object JSON payloads (array)', () => {
      mockedFs.readFileSync.mockReturnValue('[1, 2, 3]');
      expect(() => loadTokens('array.json')).toThrow(TypeError);
    });

    it('should reject non-object JSON payloads (null)', () => {
      mockedFs.readFileSync.mockReturnValue('null');
      expect(() => loadTokens('null.json')).toThrow(TypeError);
    });

    it('should reject non-object JSON payloads (primitive)', () => {
      mockedFs.readFileSync.mockReturnValue('"just-a-string"');
      expect(() => loadTokens('primitive.json')).toThrow(TypeError);
    });
  });

  describe('getAllTokens', () => {
    it('should merge all tokens', () => {
      mockedFs.readFileSync.mockImplementation((path) => {
        if (path.toString().includes('colors.json')) return '{"color": "red"}';
        if (path.toString().includes('typography.json')) return '{"font": "sans"}';
        if (path.toString().includes('spacing.json')) return '{"space": "4px"}';
        if (path.toString().includes('shadows.json')) return '{"shadow": "1px"}';
        if (path.toString().includes('motion.json')) return '{"motion": "ease"}';
        if (path.toString().includes('borders.json')) return '{"border": "1px"}';
        if (path.toString().includes('z-index.json')) return '{"zIndex": 100}';
        if (path.toString().includes('opacity.json')) return '{"opacity": 0.5}';
        if (path.toString().includes('breakpoints.json')) return '{"breakpoint": "768px"}';
        if (path.toString().includes('toast.json')) return '{"toast": {"maxVisible": 5}}';
        return '{}';
      });

      const allTokens = getAllTokens();
      expect(allTokens).toEqual({
        "color": "red",
        "font": "sans",
        "space": "4px",
        "shadow": "1px",
        "motion": "ease",
        "border": "1px",
        "zIndex": 100,
        "opacity": 0.5,
        "breakpoint": "768px",
        "toast": { "maxVisible": 5 }
      });
    });

    it('should fail loudly when a required token file is missing', () => {
      mockedFs.readFileSync.mockImplementation((path) => {
        if (path.toString().includes('typography.json')) throw new Error('File not found');
        return '{}';
      });

      expect(() => getAllTokens()).toThrow(
        'Failed to load required token file "typography.json": File not found'
      );
    });

    it('should identify a required token file containing malformed JSON', () => {
      mockedFs.readFileSync.mockImplementation((path) => {
        if (path.toString().includes('typography.json')) return '{"invalid": }';
        return '{}';
      });

      expect(() => getAllTokens()).toThrow(
        /^Failed to load required token file "typography\.json":/
      );
    });

    it('should let later files override earlier keys via Object.assign', () => {
      mockedFs.readFileSync.mockImplementation((path) => {
        if (path.toString().includes('colors.json')) return '{"token": "from-colors"}';
        if (path.toString().includes('breakpoints.json')) return '{"token": "from-breakpoints"}';
        return '{}';
      });

      const allTokens = getAllTokens();

      expect(allTokens).toEqual({"token": "from-breakpoints"});
    });

    it('should stop reading after the first required file fails', () => {
      mockedFs.readFileSync.mockImplementation((path) => {
        if (path.toString().includes('colors.json')) throw new Error('File not found');
        return '{}';
      });

      expect(() => getAllTokens()).toThrow(
        'Failed to load required token file "colors.json": File not found'
      );
      expect(mockedFs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should return a fresh object on each call (no shared mutable state)', () => {
      mockedFs.readFileSync.mockReturnValue('{"color": "red"}');

      const first = getAllTokens();
      first.color = 'mutated';
      const second = getAllTokens();

      expect(second).toEqual({ color: 'red' });
      expect(second).not.toBe(first);
    });

    it('should not leak state between calls when a file fails on one call only', () => {
      let failColors = true;
      mockedFs.readFileSync.mockImplementation((path) => {
        if (path.toString().includes('colors.json')) {
          if (failColors) throw new Error('File not found');
          return '{"color": "red"}';
        }
        return '{}';
      });

      const first = getAllTokens();
      expect(first).not.toHaveProperty('color');

      failColors = false;
      const second = getAllTokens();
      expect(second).toEqual({ color: 'red' });
    });

    it('should be deterministic across repeated calls with identical inputs', () => {
      mockedFs.readFileSync.mockImplementation((path) => {
        if (path.toString().includes('colors.json')) return '{"color": "red"}';
        if (path.toString().includes('spacing.json')) return '{"space": "4px"}';
        return '{}';
      });

      const a = getAllTokens();
      const b = getAllTokens();
      const c = getAllTokens();

      expect(a).toEqual(b);
      expect(b).toEqual(c);
    });

    it('should not mutate the token file list constant', () => {
      const snapshot = [...TOKEN_FILES];
      mockedFs.readFileSync.mockReturnValue('{}');

      getAllTokens();

      expect([...TOKEN_FILES]).toEqual(snapshot);
    });

    it('should warn exactly once per failing file even when many fail', () => {
      mockedFs.readFileSync.mockImplementation((path) => {
        if (path.toString().includes('colors.json')) throw new Error('boom');
        if (path.toString().includes('typography.json')) throw new Error('boom');
        if (path.toString().includes('spacing.json')) throw new Error('boom');
        return '{}';
      });

      getAllTokens();

      expect(console.warn).toHaveBeenCalledTimes(3);
    });

    it('should not expose sensitive error details beyond the file name', () => {
      mockedFs.readFileSync.mockImplementation((path) => {
        if (path.toString().includes('colors.json')) {
          throw new Error('secret-token-abc123');
        }
        return '{}';
      });

      getAllTokens();

      const warnCalls = (console.warn as jest.Mock).mock.calls;
      expect(warnCalls[0][0]).toBe('Failed to load colors.json:');
      expect(warnCalls[0][0]).not.toContain('secret-token-abc123');
    });
  });
});
