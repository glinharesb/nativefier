import {
  isArgFormatInvalid,
  generateRandomSuffix,
  camelCased,
  getSingleIconPath,
} from './helpers';

describe('isArgFormatInvalid', () => {
  test('is false for correct short args', () => {
    expect(isArgFormatInvalid('-t')).toBe(false);
  });

  test('is true for improperly double-dashed short args', () => {
    expect(isArgFormatInvalid('--t')).toBe(true);
  });

  test('is false for --x and --y (backwards compat, we should have made these short, oh well)', () => {
    expect(isArgFormatInvalid('--x')).toBe(false);
    expect(isArgFormatInvalid('--y')).toBe(false);
  });

  test('is false for correct long args', () => {
    expect(isArgFormatInvalid('--test')).toBe(false);
  });

  test('is true for improperly triple-dashed long args', () => {
    expect(isArgFormatInvalid('---test')).toBe(true);
  });

  test('is true for improperly single-dashed long args', () => {
    expect(isArgFormatInvalid('-test')).toBe(true);
  });

  test('is false for correct long args with dashes', () => {
    expect(isArgFormatInvalid('--test-run')).toBe(false);
  });

  test('is false for correct long args with many dashes', () => {
    expect(isArgFormatInvalid('--test-run-with-many-dashes')).toBe(false);
  });
});

describe('generateRandomSuffix', () => {
  test('is not empty', () => {
    expect(generateRandomSuffix()).not.toBe('');
  });

  test('is not null', () => {
    expect(generateRandomSuffix()).not.toBeNull();
  });

  test('is not undefined', () => {
    expect(generateRandomSuffix()).toBeDefined();
  });

  test('is different per call', () => {
    expect(generateRandomSuffix()).not.toBe(generateRandomSuffix());
  });

  test('respects the length param', () => {
    expect(generateRandomSuffix(10).length).toBe(10);
  });
});

describe('camelCased', () => {
  test('has no hyphens in camel case', () => {
    expect(camelCased('file-download')).toEqual(expect.not.stringMatching(/-/));
  });

  test('returns camel cased string', () => {
    expect(camelCased('file-download')).toBe('fileDownload');
  });

  test('has no spaces in camel case', () => {
    expect(camelCased('--file--download--')).toBe('fileDownload');
  });

  test('handles multiple hyphens properly', () => {
    expect(camelCased('file--download--options')).toBe('fileDownloadOptions');
  });

  test('does not affect non-snake cased strings', () => {
    expect(camelCased('win32options')).toBe('win32options');
  });
});

describe('getSingleIconPath', () => {
  test('passes a lone path straight through', () => {
    expect(getSingleIconPath('/tmp/icon.icns')).toBe('/tmp/icon.icns');
  });

  test('takes the first when packager was handed several', () => {
    // @electron/packager 18 lets macOS carry both an .icns and an .icon.
    // Nativefier only ever produces one, but the option type allows an array.
    expect(getSingleIconPath(['/tmp/icon.icns', '/tmp/icon.icon'])).toBe(
      '/tmp/icon.icns',
    );
  });

  test('stays undefined when no icon was set', () => {
    expect(getSingleIconPath(undefined)).toBeUndefined();
  });

  test('stays undefined for an empty list', () => {
    expect(getSingleIconPath([])).toBeUndefined();
  });
});
