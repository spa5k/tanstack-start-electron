import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../../src/lib/desktop-contract'
import type { DesktopApi } from '../../src/lib/desktop-contract'

/**
 * The only place where the renderer meets Node. Everything is funneled
 * through `contextBridge`, which deep-freezes the object graph it exposes —
 * the page can call these functions but cannot reach `ipcRenderer`, `require`,
 * or `process` itself.
 */
const desktop: DesktopApi = {
  platform: process.platform,

  invoke: {
    appInfo: () => ipcRenderer.invoke(IPC.invoke.appInfo),
    ping: (message) => ipcRenderer.invoke(IPC.invoke.ping, message),
    openExternal: (url) => ipcRenderer.invoke(IPC.invoke.openExternal, url),
    pickFile: (options) => ipcRenderer.invoke(IPC.invoke.pickFile, options),
  },

  on: (event, listener) => {
    const channel = IPC.events[event]

    const handler = (_event: Electron.IpcRendererEvent, payload: unknown) => {
      listener(payload as never)
    }

    ipcRenderer.on(channel, handler)

    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  },
}

contextBridge.exposeInMainWorld('desktop', desktop)
