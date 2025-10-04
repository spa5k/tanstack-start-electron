const { contextBridge, ipcRenderer } =
  require("electron") as typeof import("electron");
type IpcRendererEvent = import("electron").IpcRendererEvent;

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    send: (channel: string, data: unknown) => ipcRenderer.send(channel, data),
    on: (
      channel: string,
      listener: (event: IpcRendererEvent, ...args: unknown[]) => void,
    ) => ipcRenderer.on(channel, listener),
  },
});
