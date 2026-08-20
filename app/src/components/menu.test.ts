import { app, BrowserWindow, Menu, MenuItemConstructorOptions } from 'electron';

jest.mock('fs');
import * as fs from 'fs';
jest.mock('../helpers/helpers');
import { isOSX, nativeTabsSupported } from '../helpers/helpers';
import { createMenu, generateMenu } from './menu';
import { OutputOptions } from '../../../shared/src/options/model';

describe('generateMenu', () => {
  let window: BrowserWindow;
  const mockIsOSX: jest.SpyInstance = isOSX as jest.Mock;
  let mockIsFullScreen: jest.SpyInstance;
  let mockIsFullScreenable: jest.SpyInstance;
  let mockIsSimpleFullScreen: jest.SpyInstance;
  let mockSetFullScreen: jest.SpyInstance;
  let mockSetSimpleFullScreen: jest.SpyInstance;

  beforeEach(() => {
    window = new BrowserWindow();
    mockIsOSX.mockReset();
    mockIsFullScreen = jest
      .spyOn(window, 'isFullScreen')
      .mockReturnValue(false);
    mockIsFullScreenable = jest
      .spyOn(window, 'isFullScreenable')
      .mockReturnValue(true);
    mockIsSimpleFullScreen = jest
      .spyOn(window, 'isSimpleFullScreen')
      .mockReturnValue(false);
    mockSetFullScreen = jest.spyOn(window, 'setFullScreen');
    mockSetSimpleFullScreen = jest.spyOn(window, 'setSimpleFullScreen');
  });

  afterAll(() => {
    mockIsFullScreen.mockRestore();
    mockIsFullScreenable.mockRestore();
    mockIsSimpleFullScreen.mockRestore();
    mockSetFullScreen.mockRestore();
    mockSetSimpleFullScreen.mockRestore();
  });

  test('does not have fullscreen if not supported', () => {
    mockIsOSX.mockReturnValue(false);
    mockIsFullScreenable.mockReturnValue(false);

    const menu = generateMenu(
      {
        nativefierVersion: '1.0.0',
        zoom: 1.0,
        disableDevTools: false,
      },
      window,
    );

    const editMenu = menu.filter((item) => item.label === '&View');

    const fullscreen = (
      editMenu[0].submenu as MenuItemConstructorOptions[]
    ).filter((item) => item.label === 'Toggle Full Screen');

    expect(fullscreen).toHaveLength(1);
    expect(fullscreen[0].enabled).toBe(false);
    expect(fullscreen[0].visible).toBe(false);

    expect(mockIsOSX).toHaveBeenCalled();
    expect(mockIsFullScreenable).toHaveBeenCalled();
  });

  test('has fullscreen no matter what on mac', () => {
    mockIsOSX.mockReturnValue(true);
    mockIsFullScreenable.mockReturnValue(false);

    const menu = generateMenu(
      {
        nativefierVersion: '1.0.0',
        zoom: 1.0,
        disableDevTools: false,
      },
      window,
    );

    const editMenu = menu.filter((item) => item.label === '&View');

    const fullscreen = (
      editMenu[0].submenu as MenuItemConstructorOptions[]
    ).filter((item) => item.label === 'Toggle Full Screen');

    expect(fullscreen).toHaveLength(1);
    expect(fullscreen[0].enabled).toBe(true);
    expect(fullscreen[0].visible).toBe(true);

    expect(mockIsOSX).toHaveBeenCalled();
    expect(mockIsFullScreenable).toHaveBeenCalled();
  });

  test.each([true, false])(
    'has a fullscreen menu item that toggles fullscreen',
    (isFullScreen) => {
      mockIsOSX.mockReturnValue(false);
      mockIsFullScreenable.mockReturnValue(true);
      mockIsFullScreen.mockReturnValue(isFullScreen);

      const menu = generateMenu(
        {
          nativefierVersion: '1.0.0',
          zoom: 1.0,
          disableDevTools: false,
        },
        window,
      );

      const editMenu = menu.filter((item) => item.label === '&View');

      const fullscreen = (
        editMenu[0].submenu as MenuItemConstructorOptions[]
      ).filter((item) => item.label === 'Toggle Full Screen');

      expect(fullscreen).toHaveLength(1);
      expect(fullscreen[0].enabled).toBe(true);
      expect(fullscreen[0].visible).toBe(true);

      expect(mockIsOSX).toHaveBeenCalled();
      expect(mockIsFullScreenable).toHaveBeenCalled();

      // @ts-expect-error click is here TypeScript...
      fullscreen[0].click(null, window);

      expect(mockSetFullScreen).toHaveBeenCalledWith(!isFullScreen);
      expect(mockSetSimpleFullScreen).not.toHaveBeenCalled();
    },
  );

  test.each([true, false])(
    'has a fullscreen menu item that toggles simplefullscreen as a fallback on mac',
    (isFullScreen) => {
      mockIsOSX.mockReturnValue(true);
      mockIsFullScreenable.mockReturnValue(false);
      mockIsSimpleFullScreen.mockReturnValue(isFullScreen);

      const menu = generateMenu(
        {
          nativefierVersion: '1.0.0',
          zoom: 1.0,
          disableDevTools: false,
        },
        window,
      );

      const editMenu = menu.filter((item) => item.label === '&View');

      const fullscreen = (
        editMenu[0].submenu as MenuItemConstructorOptions[]
      ).filter((item) => item.label === 'Toggle Full Screen');

      expect(fullscreen).toHaveLength(1);
      expect(fullscreen[0].enabled).toBe(true);
      expect(fullscreen[0].visible).toBe(true);

      expect(mockIsOSX).toHaveBeenCalled();
      expect(mockIsFullScreenable).toHaveBeenCalled();

      // @ts-expect-error click is here TypeScript...
      fullscreen[0].click(null, window);

      expect(mockSetSimpleFullScreen).toHaveBeenCalledWith(!isFullScreen);
      expect(mockSetFullScreen).not.toHaveBeenCalled();
    },
  );
});

describe('generateMenu on macOS', () => {
  let window: BrowserWindow;
  const mockIsOSX: jest.SpyInstance = isOSX as jest.Mock;
  const mockNativeTabsSupported: jest.SpyInstance =
    nativeTabsSupported as jest.Mock;

  const menuOptions = {
    nativefierVersion: '1.0.0',
    zoom: 1.0,
    disableDevTools: false,
  };

  const submenuOf = (
    menu: MenuItemConstructorOptions[],
    label: string,
  ): MenuItemConstructorOptions[] =>
    menu.find((item) => item.label === label)
      ?.submenu as MenuItemConstructorOptions[];

  beforeEach(() => {
    window = new BrowserWindow();
    jest.spyOn(window, 'isFullScreenable').mockReturnValue(true);
    mockIsOSX.mockReturnValue(true);
    mockNativeTabsSupported.mockReturnValue(true);
  });

  test('opens with an About item, as the HIG requires', () => {
    const menu = generateMenu(menuOptions, window);

    const appMenu = menu[0].submenu as MenuItemConstructorOptions[];

    expect(appMenu[0].role).toBe('about');
  });

  test('offers Zoom in the Window menu', () => {
    const menu = generateMenu(menuOptions, window);

    const windowMenu = submenuOf(menu, '&Window');

    expect(windowMenu.filter((item) => item.role === 'zoom')).toHaveLength(1);
  });

  test('offers tab commands in the Window menu when native tabs are on', () => {
    const menu = generateMenu(menuOptions, window);

    const roles = submenuOf(menu, '&Window').map((item) => item.role);

    expect(roles).toEqual(
      expect.arrayContaining([
        'selectNextTab',
        'selectPreviousTab',
        'mergeAllWindows',
        'moveTabToNewWindow',
      ]),
    );
  });

  test('leaves out tab commands when native tabs are off', () => {
    mockNativeTabsSupported.mockReturnValue(false);

    const menu = generateMenu(menuOptions, window);

    const roles = submenuOf(menu, '&Window').map((item) => item.role);

    expect(roles).not.toContain('selectNextTab');
  });

  test('offers the Speech submenu in the Edit menu', () => {
    const menu = generateMenu(menuOptions, window);

    const speech = submenuOf(menu, '&Edit').find(
      (item) => item.label === 'Speech',
    );

    expect(
      (speech?.submenu as MenuItemConstructorOptions[]).map((i) => i.role),
    ).toEqual(['startSpeaking', 'stopSpeaking']);
  });
});

describe('createMenu', () => {
  const mockIsOSX: jest.SpyInstance = isOSX as jest.Mock;
  let window: BrowserWindow;
  let mockSetAboutPanelOptions: jest.SpyInstance;

  const options = {
    name: 'My App',
    appVersion: '2.1.0',
    appCopyright: '(c) Me',
    nativefierVersion: '1.0.0',
    targetUrl: 'https://example.com',
    disableDevTools: false,
  } as unknown as OutputOptions;

  beforeEach(() => {
    window = new BrowserWindow();
    jest.spyOn(window, 'isFullScreenable').mockReturnValue(true);
    jest.spyOn(Menu, 'setApplicationMenu').mockImplementation();
    mockSetAboutPanelOptions = jest
      .spyOn(app, 'setAboutPanelOptions')
      .mockImplementation();
    mockIsOSX.mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('fills the About panel from the app options', () => {
    createMenu(options, window);

    expect(mockSetAboutPanelOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationName: 'My App',
        applicationVersion: '2.1.0',
        copyright: '(c) Me',
      }),
    );
  });
});

describe('generateMenu find items', () => {
  let window: BrowserWindow;
  const mockIsOSX: jest.SpyInstance = isOSX as jest.Mock;

  beforeEach(() => {
    window = new BrowserWindow();
    jest.spyOn(window, 'isFullScreenable').mockReturnValue(true);
    mockIsOSX.mockReturnValue(true);
  });

  test('offers Find, Find Next and Find Previous under Edit', () => {
    const menu = generateMenu(
      { nativefierVersion: '1.0.0', zoom: 1.0, disableDevTools: false },
      window,
    );

    const editMenu = menu.find((item) => item.label === '&Edit')
      ?.submenu as MenuItemConstructorOptions[];
    const findMenu = editMenu.find((item) => item.label === 'Find')
      ?.submenu as MenuItemConstructorOptions[];

    expect(
      findMenu.map((item) => [item.label, item.accelerator]),
    ).toEqual([
      ['Find…', 'CmdOrCtrl+F'],
      ['Find Next', 'CmdOrCtrl+G'],
      ['Find Previous', 'Shift+CmdOrCtrl+G'],
    ]);
  });
});

describe('createMenu dock menu', () => {
  const mockIsOSX: jest.SpyInstance = isOSX as jest.Mock;
  let window: BrowserWindow;
  let mockSetMenu: jest.SpyInstance;

  const options = {
    name: 'My App',
    nativefierVersion: '1.0.0',
    targetUrl: 'https://example.com',
    disableDevTools: false,
  } as unknown as OutputOptions;

  beforeEach(() => {
    window = new BrowserWindow();
    jest.spyOn(window, 'isFullScreenable').mockReturnValue(true);
    jest.spyOn(Menu, 'setApplicationMenu').mockImplementation();
    jest.spyOn(app, 'setAboutPanelOptions').mockImplementation();
    mockSetMenu = jest
      .spyOn(
        app.dock as unknown as { setMenu: (menu: unknown) => void },
        'setMenu',
      )
      .mockImplementation();
    mockIsOSX.mockReturnValue(true);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify({
        menuLabel: 'Places',
        bookmarks: [
          { type: 'link', title: 'Inbox', url: 'https://example.com/inbox' },
        ],
      }),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('puts the bookmarks in the dock menu', () => {
    createMenu(options, window);

    expect(mockSetMenu).toHaveBeenCalled();
  });

  test('leaves the dock menu alone when there are no bookmarks', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    createMenu(options, window);

    expect(mockSetMenu).not.toHaveBeenCalled();
  });
});

describe('generateMenu About label', () => {
  test('names the app as the user named it, not as the bundle id', () => {
    const window = new BrowserWindow();
    jest.spyOn(window, 'isFullScreenable').mockReturnValue(true);
    (isOSX as jest.Mock).mockReturnValue(true);

    const menu = generateMenu(
      {
        name: 'My Great App',
        nativefierVersion: '1.0.0',
        zoom: 1.0,
        disableDevTools: false,
      },
      window,
    );

    const appMenu = menu[0].submenu as MenuItemConstructorOptions[];

    expect(appMenu[0].label).toBe('About My Great App');
  });
});
