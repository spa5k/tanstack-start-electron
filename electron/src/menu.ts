import { Menu, shell } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'

export function buildApplicationMenu(): void {
  const isMac = process.platform === 'darwin'

  const template: Array<MenuItemConstructorOptions> = [
    ...(isMac ? [{ role: 'appMenu' } as MenuItemConstructorOptions] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        {
          label: 'TanStack Start docs',
          click: () => void shell.openExternal('https://tanstack.com/start'),
        },
        {
          label: 'TanStack Router docs',
          click: () => void shell.openExternal('https://tanstack.com/router'),
        },
        {
          label: 'Electron docs',
          click: () =>
            void shell.openExternal('https://www.electronjs.org/docs/latest'),
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
