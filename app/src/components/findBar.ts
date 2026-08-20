import * as path from 'path';

import { ipcMain, BrowserWindow, WebContentsView } from 'electron';

import * as log from '../helpers/loggingHelper';
import { onFindInPage, FindInPageRequest } from '../helpers/windowHelpers';

const WIDTH = 380;
const HEIGHT = 46;
const MARGIN = 10;

export type FindBar = {
  open: () => void;
  close: () => void;
  step: (forward: boolean) => void;
  isOpen: () => boolean;
  view: WebContentsView;
};

const findBars = new WeakMap<BrowserWindow, FindBar>();

// The `find-in-page` IPC arrives from the *bar's* webContents, but the search
// has to run against the *page's*. ipcMain handlers are global, so keep the
// mapping here and register them once.
const windowsByFindBarId = new Map<number, BrowserWindow>();
let handlersRegistered = false;

function registerFindBarHandlers(): void {
  if (handlersRegistered) {
    return;
  }
  handlersRegistered = true;

  ipcMain.on('find-in-page', (event, request: FindInPageRequest) => {
    const window = windowsByFindBarId.get(event.sender.id);
    if (window) {
      onFindInPage(window.webContents, request);
    }
  });

  ipcMain.on('find-in-page-close', (event) => {
    const window = windowsByFindBarId.get(event.sender.id);
    if (window) {
      findBars.get(window)?.close();
    }
  });
}

/**
 * Lays the bar out at the top-right of the window's content area.
 */
export function layoutFindBar(
  window: BrowserWindow,
  view: WebContentsView,
): void {
  const { width } = window.getContentBounds();
  view.setBounds({
    x: Math.max(0, width - WIDTH - MARGIN),
    y: MARGIN,
    width: Math.min(WIDTH, width),
    height: HEIGHT,
  });
}

/**
 * Builds the find bar for a window, as its own WebContentsView rather than
 * markup injected into the page. An in-page bar would be searched along with
 * the page: `findInPage` matches `<input>` values, including inside a shadow
 * root, so the bar's own query would count as an extra match every time.
 */
export function createFindBar(window: BrowserWindow): FindBar {
  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'findBarPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  view.setBackgroundColor('#00000000');
  view.setVisible(false);
  window.contentView.addChildView(view);
  layoutFindBar(window, view);

  view.webContents
    .loadFile(path.join(__dirname, 'static', 'findBar.html'))
    .catch((err) => log.error('findBar.loadFile ERROR', err));

  // The bar only ever shows our own file; never let it navigate anywhere else.
  view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  view.webContents.on('will-navigate', (event) => event.preventDefault());

  window.on('resize', () => layoutFindBar(window, view));

  // Match counts come from the page's webContents, and are shown by the bar's.
  window.webContents.on('found-in-page', (_event, result) => {
    log.debug('window.webContents.found-in-page', result);
    view.webContents.send('find-in-page-result', {
      activeMatchOrdinal: result.activeMatchOrdinal,
      matches: result.matches,
    });
  });

  registerFindBarHandlers();
  windowsByFindBarId.set(view.webContents.id, window);
  window.on('closed', () => windowsByFindBarId.delete(view.webContents.id));

  let open = false;

  const findBar: FindBar = {
    view,
    isOpen: (): boolean => open,
    open: (): void => {
      open = true;
      view.setVisible(true);
      layoutFindBar(window, view);
      view.webContents.focus();
      view.webContents.send('find-in-page-focus');
    },
    close: (): void => {
      open = false;
      view.setVisible(false);
      window.webContents.stopFindInPage('clearSelection');
      window.webContents.focus();
    },
    step: (forward: boolean): void => {
      if (!open) {
        findBar.open();
        return;
      }
      view.webContents.send('find-in-page-next', forward);
    },
  };

  findBars.set(window, findBar);
  return findBar;
}

export function getFindBar(window: BrowserWindow): FindBar | undefined {
  return findBars.get(window);
}

/** Opens the focused window's find bar. Wired to the Find… menu item. */
export function openFindInPage(): void {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    findBars.get(window)?.open();
  }
}

/** Steps the focused window's find bar through matches. */
export function findNextInPage(forward: boolean): void {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    findBars.get(window)?.step(forward);
  }
}
