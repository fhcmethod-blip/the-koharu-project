const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain, session } = require("electron");
const path = require("path");

let mainWindow = null;
let tray = null;
let unreadCount = 0;

const API_BASE = "https://thekoharuproject.com";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 500,
    title: "Koharu Admin",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: "#0a0a0a",
  });

  mainWindow.loadFile("index.html");

  // Minimize to tray instead of closing
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("page-title-updated", (e) => e.preventDefault());
}

function createTray() {
  // Create a simple 16x16 tray icon (green dot)
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show",
      click: () => mainWindow.show(),
    },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Koharu Admin");
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => mainWindow.show());
}

// Update tray with unread badge
function updateTrayBadge(count) {
  unreadCount = count;
  if (tray) {
    tray.setToolTip(
      count > 0
        ? `Koharu Admin — ${count} unread`
        : "Koharu Admin",
    );
  }
  if (mainWindow) {
    mainWindow.setTitle(
      count > 0
        ? `Koharu Admin (${count} unread)`
        : "Koharu Admin",
    );
  }
  // Flash taskbar on Windows
  if (count > 0 && mainWindow && !mainWindow.isFocused()) {
    mainWindow.flashFrame(true);
  }
}

// Notify for new message
function notifyNewMessage(sender, preview) {
  if (Notification.isSupported()) {
    const n = new Notification({
      title: `New message from ${sender}`,
      body: preview,
      icon: path.join(__dirname, "icon.png"),
    });
    n.on("click", () => {
      mainWindow.show();
      mainWindow.focus();
    });
    n.show();
  }
}

// IPC handlers
ipcMain.handle("get-api-base", () => API_BASE);
ipcMain.handle("update-badge", (_, count) => updateTrayBadge(count));
ipcMain.handle("notify", (_, sender, preview) =>
  notifyNewMessage(sender, preview),
);

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow.show();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}