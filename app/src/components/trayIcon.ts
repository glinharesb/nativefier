import { app, Tray, Menu, ipcMain, nativeImage, BrowserWindow } from 'electron';

import { getAppIcon, getCounterValue, isOSX } from '../helpers/helpers';
import * as log from '../helpers/loggingHelper';
import { setIsQuitting } from '../helpers/windowHelpers';
import { OutputOptions } from '../../../shared/src/options/model';

// The macOS menu bar wants a 16pt icon. This used to be derived from
// Tray.getBounds().height, but that stays 0 until an image has been set, so
// resize() was being asked for a height of -2.
const MACOS_MENU_BAR_ICON_HEIGHT = 16;

export function createTrayIcon(
  nativefierOptions: OutputOptions,
  mainWindow: BrowserWindow,
): Tray | undefined {
  const options = { ...nativefierOptions };

  if (options.tray && options.tray !== 'false') {
    const iconPath = getAppIcon();
    if (!iconPath) {
      throw new Error('Icon path not found found to use with tray option.');
    }
    const nimage = nativeImage.createFromPath(iconPath);
    const appIcon = new Tray(nativeImage.createEmpty());

    if (isOSX()) {
      appIcon.setImage(nimage.resize({ height: MACOS_MENU_BAR_ICON_HEIGHT }));
    } else {
      appIcon.setImage(nimage);
    }

    const onClick = (): void => {
      log.debug('onClick');
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    };

    const contextMenu = Menu.buildFromTemplate([
      {
        label: options.name,
        click: onClick,
      },
      {
        label: 'Quit',
        click: (): void => {
          setIsQuitting(true);
          app.quit();
        },
      },
    ]);

    appIcon.on('click', onClick);

    if (options.counter) {
      mainWindow.on('page-title-updated', (event, title) => {
        log.debug('mainWindow.page-title-updated', { event, title });
        const counterValue = getCounterValue(title);
        if (counterValue) {
          appIcon.setToolTip(
            `(${counterValue})  ${options.name ?? 'Nativefier'}`,
          );
        } else {
          appIcon.setToolTip(options.name ?? '');
        }
      });
    } else {
      ipcMain.on('notification', () => {
        log.debug('ipcMain.notification');
        if (mainWindow.isFocused()) {
          return;
        }
        if (options.name) {
          appIcon.setToolTip(`•  ${options.name}`);
        }
      });

      mainWindow.on('focus', () => {
        log.debug('mainWindow.focus');
        appIcon.setToolTip(options.name ?? '');
      });
    }

    appIcon.setToolTip(options.name ?? '');
    appIcon.setContextMenu(contextMenu);

    return appIcon;
  }

  return undefined;
}
