jest.mock('../helpers/helpers');
jest.mock('../helpers/windowHelpers');

import { BrowserWindow, nativeImage, Tray } from 'electron';

import { getAppIcon, isOSX } from '../helpers/helpers';
import { createTrayIcon } from './trayIcon';
import { OutputOptions } from '../../../shared/src/options/model';

describe('createTrayIcon', () => {
  const mockGetAppIcon = getAppIcon as jest.Mock;
  const mockIsOSX = isOSX as jest.Mock;

  const options = {
    name: 'Test App',
    tray: 'true',
  } as unknown as OutputOptions;

  let window: BrowserWindow;
  let mockResize: jest.SpyInstance;

  beforeEach(() => {
    window = new BrowserWindow();
    mockGetAppIcon.mockReturnValue('/path/to/icon.png');
    mockIsOSX.mockReturnValue(true);
    mockResize = jest.spyOn(
      nativeImage.createFromPath('/path/to/icon.png'),
      'resize',
    );
    jest
      .spyOn(nativeImage, 'createFromPath')
      .mockReturnValue({
        resize: mockResize as unknown as () => unknown,
      } as unknown as ReturnType<typeof nativeImage.createFromPath>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('sizes the icon for the macOS menu bar', () => {
    // Tray.getBounds().height is 0 until an image is set, so it cannot be used
    // to derive the size: doing so asked for a negative height.
    createTrayIcon(options, window);

    expect(mockResize).toHaveBeenCalledWith({ height: 16 });
  });

  test('leaves the icon alone off macOS', () => {
    mockIsOSX.mockReturnValue(false);

    createTrayIcon(options, window);

    expect(mockResize).not.toHaveBeenCalled();
  });
});
