import * as path from 'path';

import * as log from 'loglevel';

import { isOSX } from '../helpers/helpers';
import {
  convertToPng,
  convertToIco,
  convertToIcns,
  convertToTrayIcon,
} from '../helpers/iconShellHelpers';
import { AppOptions } from '../../shared/src/options/model';

function iconIsIco(iconPath: string): boolean {
  return path.extname(iconPath) === '.ico';
}

function iconIsPng(iconPath: string): boolean {
  return path.extname(iconPath) === '.png';
}

function iconIsIcns(iconPath: string): boolean {
  return path.extname(iconPath) === '.icns';
}

/**
 * Will convert a `.png` icon to the appropriate arch format (if necessary),
 * and return adjusted options
 */
export function convertIconIfNecessary(options: AppOptions): void {
  if (!options.packager.icon) {
    log.debug('Option "icon" not set, skipping icon conversion.');
    return;
  }

  const iconPath = options.packager.icon;

  if (options.packager.platform === 'win32') {
    if (iconIsIco(iconPath)) {
      log.debug(
        'Building for Windows and icon is already a .ico, no conversion needed',
      );
      return;
    }

    try {
      const convertedPath = convertToIco(iconPath);
      options.packager.icon = convertedPath;
      return;
    } catch (err: unknown) {
      log.warn('Failed to convert icon to .ico, skipping.', err);
      return;
    }
  }

  if (options.packager.platform === 'linux') {
    if (iconIsPng(iconPath)) {
      log.debug(
        'Building for Linux and icon is already a .png, no conversion needed',
      );
      return;
    }

    try {
      const convertedPath = convertToPng(iconPath);
      options.packager.icon = convertedPath;
      return;
    } catch (err: unknown) {
      log.warn('Failed to convert icon to .png, skipping.', err);
      return;
    }
  }

  if (iconIsIcns(iconPath)) {
    log.debug(
      'Building for macOS and icon is already a .icns, no conversion needed',
    );
  }

  if (!isOSX()) {
    log.warn(
      'Skipping icon conversion to .icns, conversion is only supported on macOS',
    );
    return;
  }

  try {
    if (!iconIsIcns(iconPath)) {
      const convertedPath = convertToIcns(iconPath);
      options.packager.icon = convertedPath;
    }
    if (options.nativefier.tray !== 'false') {
      // Use the updated icon path after conversion
      const finalIconPath = options.packager.icon || iconPath;
      convertToTrayIcon(finalIconPath);
    }
  } catch (err: unknown) {
    log.warn('Failed to convert icon to .icns, skipping.', err);
    options.packager.icon = undefined;
  }
}
