/**
 * Preload for the find bar's own WebContentsView. Deliberately tiny: the bar
 * must not run any of the main preload's page-facing machinery.
 */
import { contextBridge, ipcRenderer } from 'electron';

export type FindBarResult = {
  activeMatchOrdinal: number;
  matches: number;
};

contextBridge.exposeInMainWorld('nativefierFindBar', {
  search(text: string, forward: boolean, findNext: boolean): void {
    ipcRenderer.send('find-in-page', { text, forward, findNext });
  },
  close(): void {
    ipcRenderer.send('find-in-page-close');
  },
  onResult(callback: (result: FindBarResult) => void): void {
    ipcRenderer.on('find-in-page-result', (_event, result: FindBarResult) =>
      callback(result),
    );
  },
  onFocus(callback: () => void): void {
    ipcRenderer.on('find-in-page-focus', () => callback());
  },
  onStep(callback: (forward: boolean) => void): void {
    ipcRenderer.on('find-in-page-next', (_event, forward: boolean) =>
      callback(forward),
    );
  },
});
