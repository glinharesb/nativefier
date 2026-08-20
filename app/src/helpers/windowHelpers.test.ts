import { dialog, BrowserWindow } from 'electron';
jest.mock('loglevel');
import { error } from 'loglevel';
import { WindowOptions } from '../../../shared/src/options/model';

jest.mock('./helpers');
import {
  getCSSToInject,
  isOSX,
  linkIsInternal,
  nativeTabsSupported,
} from './helpers';
jest.mock('./windowEvents');
import {
  clearAppData,
  createNewTab,
  getDefaultWindowOptions,
  hideWindow,
  injectCSS,
  setIsQuitting,
  setupSessionPermissionHandler,
} from './windowHelpers';

describe('clearAppData', () => {
  let window: BrowserWindow;
  let mockClearCache: jest.SpyInstance;
  let mockClearStorageData: jest.SpyInstance;
  const mockShowDialog: jest.SpyInstance = jest.spyOn(dialog, 'showMessageBox');

  beforeEach(() => {
    window = new BrowserWindow();
    mockClearCache = jest.spyOn(window.webContents.session, 'clearCache');
    mockClearStorageData = jest.spyOn(
      window.webContents.session,
      'clearStorageData',
    );
    mockShowDialog.mockReset().mockResolvedValue(undefined);
  });

  afterAll(() => {
    mockClearCache.mockRestore();
    mockClearStorageData.mockRestore();
    mockShowDialog.mockRestore();
  });

  test('will not clear app data if dialog canceled', async () => {
    mockShowDialog.mockResolvedValue(1);

    await clearAppData(window);

    expect(mockShowDialog).toHaveBeenCalledTimes(1);
    expect(mockClearCache).not.toHaveBeenCalled();
    expect(mockClearStorageData).not.toHaveBeenCalled();
  });

  test('will clear app data if ok is clicked', async () => {
    mockShowDialog.mockResolvedValue(0);

    await clearAppData(window);

    expect(mockShowDialog).toHaveBeenCalledTimes(1);
    expect(mockClearCache).not.toHaveBeenCalledTimes(1);
    expect(mockClearStorageData).not.toHaveBeenCalledTimes(1);
  });
});

describe('createNewTab', () => {
  // const window = new BrowserWindow();
  const options: WindowOptions = {
    autoHideMenuBar: true,
    blockExternalUrls: false,
    insecure: false,
    name: 'Test App',
    targetUrl: 'https://github.com/nativefier/natifefier',
    zoom: 1.0,
  } as WindowOptions;
  const setupWindow = jest.fn();
  const url = 'https://github.com/nativefier/nativefier';
  const mockAddTabbedWindow: jest.SpyInstance = jest.spyOn(
    BrowserWindow.prototype,
    'addTabbedWindow',
  );
  const mockFocus: jest.SpyInstance = jest.spyOn(
    BrowserWindow.prototype,
    'focus',
  );
  const mockLoadURL: jest.SpyInstance = jest.spyOn(
    BrowserWindow.prototype,
    'loadURL',
  );

  test('creates new foreground tab', () => {
    const foreground = true;

    const tab = createNewTab(options, setupWindow, url, foreground);

    expect(mockAddTabbedWindow).toHaveBeenCalledWith(tab);
    expect(setupWindow).toHaveBeenCalledWith(options, tab);
    expect(mockLoadURL).toHaveBeenCalledWith(url);
    expect(mockFocus).not.toHaveBeenCalled();
  });

  test('creates new background tab', () => {
    const foreground = false;

    const tab = createNewTab(
      options,
      setupWindow,
      url,
      foreground,
      // window
    );

    expect(mockAddTabbedWindow).toHaveBeenCalledWith(tab);
    expect(setupWindow).toHaveBeenCalledWith(options, tab);
    expect(mockLoadURL).toHaveBeenCalledWith(url);
    expect(mockFocus).toHaveBeenCalledTimes(1);
  });
});

describe('injectCSS', () => {
  jest.setTimeout(10000);

  const mockGetCSSToInject: jest.SpyInstance = getCSSToInject as jest.Mock;
  const mockLogError: jest.SpyInstance = error as jest.Mock;

  const css = 'body { color: white; }';
  let responseHeaders: Record<string, string[]>;

  beforeEach(() => {
    mockGetCSSToInject.mockReset().mockReturnValue('');
    mockLogError.mockReset();
    responseHeaders = { 'x-header': ['value'], 'content-type': ['test/other'] };
  });

  afterAll(() => {
    mockGetCSSToInject.mockRestore();
    mockLogError.mockRestore();
  });

  test('will not inject if getCSSToInject is empty', () => {
    const window = new BrowserWindow();
    const mockWebContentsInsertCSS: jest.SpyInstance = jest
      .spyOn(window.webContents, 'insertCSS')
      .mockResolvedValue('');
    jest
      .spyOn(window.webContents, 'getURL')
      .mockReturnValue('https://example.com');

    injectCSS(window);

    expect(mockGetCSSToInject).toHaveBeenCalled();
    expect(mockWebContentsInsertCSS).not.toHaveBeenCalled();
  });

  test('will inject on did-navigate + onResponseStarted', () => {
    mockGetCSSToInject.mockReturnValue(css);
    const window = new BrowserWindow();
    const mockWebContentsInsertCSS: jest.SpyInstance = jest
      .spyOn(window.webContents, 'insertCSS')
      .mockResolvedValue('');
    jest
      .spyOn(window.webContents, 'getURL')
      .mockReturnValue('https://example.com');

    injectCSS(window);

    expect(mockGetCSSToInject).toHaveBeenCalled();

    window.webContents.emit('did-navigate');
    // @ts-expect-error this function doesn't exist in the actual electron version, but will in our mock
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    window.webContents.session.webRequest.send('onResponseStarted', {
      responseHeaders,
      webContents: window.webContents,
    });

    expect(mockWebContentsInsertCSS).toHaveBeenCalledWith(css);
  });

  test.each<string>(['application/json', 'font/woff2', 'image/png'])(
    'will not inject for content-type %s',
    (contentType: string) => {
      mockGetCSSToInject.mockReturnValue(css);
      const window = new BrowserWindow();
      const mockWebContentsInsertCSS: jest.SpyInstance = jest
        .spyOn(window.webContents, 'insertCSS')
        .mockResolvedValue('');
      jest
        .spyOn(window.webContents, 'getURL')
        .mockReturnValue('https://example.com');

      responseHeaders['content-type'] = [contentType];

      injectCSS(window);

      expect(mockGetCSSToInject).toHaveBeenCalled();

      expect(window.webContents.emit('did-navigate')).toBe(true);
      mockWebContentsInsertCSS.mockReset().mockResolvedValue(undefined);
      // @ts-expect-error this function doesn't exist in the actual electron version, but will in our mock
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      window.webContents.session.webRequest.send('onResponseStarted', {
        responseHeaders,
        webContents: window.webContents,
        url: `test-${contentType}`,
      });
      // insertCSS will still run once for the did-navigate
      expect(mockWebContentsInsertCSS).not.toHaveBeenCalled();
    },
  );

  test.each<string>(['text/html'])(
    'will inject for content-type %s',
    (contentType: string) => {
      mockGetCSSToInject.mockReturnValue(css);
      const window = new BrowserWindow();
      const mockWebContentsInsertCSS: jest.SpyInstance = jest
        .spyOn(window.webContents, 'insertCSS')
        .mockResolvedValue('');
      jest
        .spyOn(window.webContents, 'getURL')
        .mockReturnValue('https://example.com');

      responseHeaders['content-type'] = [contentType];

      injectCSS(window);

      expect(mockGetCSSToInject).toHaveBeenCalled();

      window.webContents.emit('did-navigate');
      mockWebContentsInsertCSS.mockReset().mockResolvedValue(undefined);
      // @ts-expect-error this function doesn't exist in the actual electron version, but will in our mock
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      window.webContents.session.webRequest.send('onResponseStarted', {
        responseHeaders,
        webContents: window.webContents,
        url: `test-${contentType}`,
      });

      expect(mockWebContentsInsertCSS).toHaveBeenCalledTimes(1);
    },
  );

  test.each<string>(['image', 'script', 'stylesheet', 'xhr'])(
    'will not inject for resource type %s',
    (resourceType: string) => {
      mockGetCSSToInject.mockReturnValue(css);
      const window = new BrowserWindow();
      const mockWebContentsInsertCSS: jest.SpyInstance = jest
        .spyOn(window.webContents, 'insertCSS')
        .mockResolvedValue('');
      jest
        .spyOn(window.webContents, 'getURL')
        .mockReturnValue('https://example.com');

      injectCSS(window);

      expect(mockGetCSSToInject).toHaveBeenCalled();

      window.webContents.emit('did-navigate');
      mockWebContentsInsertCSS.mockReset().mockResolvedValue(undefined);
      // @ts-expect-error this function doesn't exist in the actual electron version, but will in our mock
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      window.webContents.session.webRequest.send('onResponseStarted', {
        responseHeaders,
        webContents: window.webContents,
        resourceType,
        url: `test-${resourceType}`,
      });
      // insertCSS will still run once for the did-navigate
      expect(mockWebContentsInsertCSS).not.toHaveBeenCalled();
    },
  );

  test.each<string>(['html', 'other'])(
    'will inject for resource type %s',
    (resourceType: string) => {
      mockGetCSSToInject.mockReturnValue(css);
      const window = new BrowserWindow();
      const mockWebContentsInsertCSS: jest.SpyInstance = jest
        .spyOn(window.webContents, 'insertCSS')
        .mockResolvedValue('');
      jest
        .spyOn(window.webContents, 'getURL')
        .mockReturnValue('https://example.com');

      injectCSS(window);

      expect(mockGetCSSToInject).toHaveBeenCalled();

      window.webContents.emit('did-navigate');
      mockWebContentsInsertCSS.mockReset().mockResolvedValue(undefined);
      // @ts-expect-error this function doesn't exist in the actual electron version, but will in our mock
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      window.webContents.session.webRequest.send('onResponseStarted', {
        responseHeaders,
        webContents: window.webContents,
        resourceType,
        url: `test-${resourceType}`,
      });
      expect(mockWebContentsInsertCSS).toHaveBeenCalledTimes(1);
    },
  );
});

describe('hideWindow', () => {
  const mockIsOSX = isOSX as jest.Mock;
  let window: BrowserWindow;
  let mockHide: jest.SpyInstance;
  let preventDefault: jest.Mock;
  let event: Event;

  beforeEach(() => {
    window = new BrowserWindow();
    mockHide = jest.spyOn(window, 'hide').mockImplementation();
    preventDefault = jest.fn();
    event = { preventDefault } as unknown as Event;
    setIsQuitting(false);
  });

  afterEach(() => {
    mockHide.mockRestore();
    setIsQuitting(false);
  });

  test('hides the window instead of closing it on macOS', () => {
    mockIsOSX.mockReturnValue(true);

    hideWindow(window, event, false, 'false');

    expect(preventDefault).toHaveBeenCalled();
    expect(mockHide).toHaveBeenCalled();
  });

  test('lets the window close once the app is quitting', () => {
    mockIsOSX.mockReturnValue(true);
    setIsQuitting(true);

    hideWindow(window, event, false, 'false');

    expect(preventDefault).not.toHaveBeenCalled();
    expect(mockHide).not.toHaveBeenCalled();
  });
});

describe('getDefaultWindowOptions', () => {
  const mockNativeTabsSupported = nativeTabsSupported as jest.Mock;

  const baseOptions = {
    autoHideMenuBar: false,
    insecure: false,
    name: 'Test App',
    targetUrl: 'https://example.com',
    zoom: 1.0,
  } as unknown as WindowOptions;

  test('keeps the tabbing identifier it was handed', () => {
    mockNativeTabsSupported.mockReturnValue(true);

    const options = getDefaultWindowOptions({
      ...baseOptions,
      tabbingIdentifier: 'shared-identifier',
    });

    expect(options.tabbingIdentifier).toBe('shared-identifier');
  });

  test('does not invent a tabbing identifier when given none', () => {
    // Generating one here would hand every window a different identifier,
    // so native tabs would refuse to group them. outputOptionsToWindowOptions
    // is the single place allowed to generate it.
    mockNativeTabsSupported.mockReturnValue(true);

    const options = getDefaultWindowOptions({ ...baseOptions });

    expect(options.tabbingIdentifier).toBeUndefined();
  });
});

describe('setupSessionPermissionHandler', () => {
  const mockLinkIsInternal = linkIsInternal as jest.Mock;
  const options = {
    internalUrls: undefined,
    strictInternalUrls: false,
    targetUrl: 'https://example.com',
  } as unknown as WindowOptions;

  let window: BrowserWindow;
  let checkHandler: (
    webContents: unknown,
    permission: string,
    requestingOrigin: string,
    details: unknown,
  ) => boolean;
  let requestHandler: (
    webContents: unknown,
    permission: string,
    callback: (granted: boolean) => void,
    details: unknown,
  ) => void;

  beforeEach(() => {
    window = new BrowserWindow();
    mockLinkIsInternal.mockReset();
    jest
      .spyOn(window.webContents.session, 'setPermissionCheckHandler')
      .mockImplementation((handler) => {
        checkHandler = handler as typeof checkHandler;
      });
    jest
      .spyOn(window.webContents.session, 'setPermissionRequestHandler')
      .mockImplementation((handler) => {
        requestHandler = handler as typeof requestHandler;
      });
    setupSessionPermissionHandler(options, window);
  });

  test('grants a permission checked by the wrapped site', () => {
    mockLinkIsInternal.mockReturnValue(true);

    expect(
      checkHandler(null, 'notifications', 'https://example.com', {}),
    ).toBe(true);
  });

  test('denies a permission checked by an unrelated site', () => {
    mockLinkIsInternal.mockReturnValue(false);

    expect(
      checkHandler(null, 'media', 'https://tracker.example.net', {}),
    ).toBe(false);
  });

  test('grants a permission requested by the wrapped site', () => {
    mockLinkIsInternal.mockReturnValue(true);
    const callback = jest.fn();

    requestHandler(null, 'notifications', callback, {
      requestingUrl: 'https://example.com/inbox',
    });

    expect(callback).toHaveBeenCalledWith(true);
  });

  test('denies a permission requested by an unrelated site', () => {
    mockLinkIsInternal.mockReturnValue(false);
    const callback = jest.fn();

    requestHandler(null, 'media', callback, {
      requestingUrl: 'https://tracker.example.net/spy',
    });

    expect(callback).toHaveBeenCalledWith(false);
  });
});
