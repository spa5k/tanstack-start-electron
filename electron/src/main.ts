import { is } from "@electron-toolkit/utils";
import { getPort } from "get-port-please";
import { existsSync } from "node:fs";
import { createConnection } from "node:net";
import { pathToFileURL } from "node:url";
import { join } from "path";

const { app, BrowserWindow, ipcMain } =
  require("electron") as typeof import("electron");

let nitroServerPromise: Promise<number> | null = null;

const waitForServer = (port: number, host = "127.0.0.1", timeout = 15_000) =>
  new Promise<void>((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      const socket = createConnection({ port, host }, () => {
        socket.end();
        resolve();
      });

      socket.on("error", (error) => {
        socket.destroy();
        if (Date.now() - start >= timeout) {
          reject(error);
          return;
        }
        setTimeout(check, 200);
      });
    };

    check();
  });

type NitroOptions = {
  rootDir?: string;
  isDev?: boolean;
};

const startNitroServer = async (options: NitroOptions = {}) => {
  if (nitroServerPromise) return nitroServerPromise;

  nitroServerPromise = (async () => {
    const port = await getPort({ portRange: [31_000, 60_000] });
    const basePath = options.rootDir ?? app.getAppPath();
    const serverRoot = options.isDev ? join(basePath, ".output") : basePath;
    const serverEntry = join(serverRoot, "server", "index.mjs");
    if (!existsSync(serverEntry)) {
      throw new Error(
        `Unable to locate Nitro server entry at ${serverEntry}. Run "pnpm build" to generate it.`,
      );
    }

    const publicDirCandidate = join(serverRoot, "public");
    const publicDir = existsSync(publicDirCandidate)
      ? publicDirCandidate
      : join(basePath, "public");

    process.env.NODE_ENV = options.isDev ? "development" : "production";
    process.env.PORT = String(port);
    process.env.NITRO_PORT = String(port);
    process.env.NITRO_HOST = "127.0.0.1";
    process.env.HOST = "127.0.0.1";
    process.env.NITRO_UNIX_SOCKET = "";
    process.env.NITRO_PUBLIC_DIR = publicDir;

    await import(pathToFileURL(serverEntry).href);
    await waitForServer(port);

    return port;
  })().catch((error) => {
    nitroServerPromise = null;
    throw error;
  });

  return nitroServerPromise;
};

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: true,
    },
  });

  mainWindow.on("ready-to-show", () => mainWindow.show());

  try {
    const port = await startNitroServer({
      isDev: is.dev,
      rootDir: is.dev ? process.cwd() : undefined,
    });
    await mainWindow.loadURL(`http://127.0.0.1:${port}`);
  } catch (error) {
    console.error("Failed to load TanStack Start application", error);
  }

  return mainWindow;
};

app.whenReady().then(() => {
  createWindow();

  ipcMain.on("ping", () => console.log("pong"));

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
