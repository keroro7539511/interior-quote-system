const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: '愛菲爾報價系統',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  Menu.setApplicationMenu(null);
}

// ── 自動更新邏輯 ─────────────────────────────────────────────
function setupAutoUpdater() {
  // 靜默下載，下載完詢問使用者是否重啟安裝
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '發現新版本',
      message: `新版本 ${info.version} 正在下載中，完成後會通知您。`,
      buttons: ['確定'],
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: '更新已下載',
      message: '新版本已下載完成，是否立即重啟安裝？',
      buttons: ['立即安裝', '下次啟動時安裝'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
  });

  // 啟動 60 秒後再檢查（避免影響啟動速度）
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 60 * 1000);
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
