const {
  app,
  Tray,
  BrowserWindow,
  ipcMain
} = require('electron');
const path = require('path');
const ActivityTracker = require("./ActivityTracker");
const config = require('./config');
const log = require('electron-log');

module.exports = class MainApp {
  constructor(app, menu) {
    this.isRunningAsAdmin;
    this.isDebug = false;
    this.iconPath = path.join(__dirname, 'Brain Jack.png');
    this.flags = {
      isFromSystemTrayClose: false
    }
    this._app = app;
    this._ipcMain = ipcMain;
    this._mainWindow;
    this._systemTray;
    this._trayContextMenu = menu;
    this._activityTracker;
    this.onstartupOperations();
    this.appEvents();
    this.ipcEvents();
    this.handleAllErrors();
    this.logSettings();
    this.autoUpdate();
  }

  autoUpdate() {
    autoUpdater.on('update-downloaded', (info) => {
      autoUpdater.quitAndInstall();
    });
  }

  logSettings() {
    log.transports.file.file = path.join(__dirname, 'log.txt');
    console.log("logging");
    log.warn("logging");
  }

  mainWindowSetUp() {
    this._mainWindow = new BrowserWindow({
      width: 400,
      height: 550
    });
    this._mainWindow.loadURL(config.webAppUrl);
    this._mainWindow.setMenu(null);
    this._mainWindow.setIcon(this.iconPath);
    this._mainWindow.show();
    this.mainWindowEvents();
    this.systemTraySetup();
    if (this.isDebug) {
      this._mainWindow.webContents.openDevTools()
    }
  }

  landingPageReload() {
    this._mainWindow.show();
    this._mainWindow.loadURL(config.webAppUrl + '/app/dashboard');
    // this._mainWindow.reload();
  }

  onstartupOperations() {
    const exeName = path.basename(process.execPath);
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
      args: [
        '--processStart', `${exeName}`,
        '--process-start-args', "--hidden"
      ]
    });
  }

  systemTraySetup() {
    this._systemTray = new Tray(this.iconPath);
    this._systemTray.setToolTip('BrainJack Is Running...');
    this._systemTray.setContextMenu(this.contextMenuSetup());
    this.systemTrayEvents();
  }

  contextMenuSetup() {
    return this._trayContextMenu.buildFromTemplate([{
        label: 'Open',
        click: event => {
          this.landingPageReload();
        }
      },
      {
        label: 'Quit',
        click: event => {
          this.flags.isFromSystemTrayClose = true;
          app.quit();
        }
      }
    ]);
  }

  appEvents() {
    //this._app.on('ready', event => this.mainWindowSetUp());
    this._app.on('ready', event => {
      this.mainWindowSetUp(event);
      autoUpdater.checkForUpdates();
    });
    this._app.on('window-all-closed', event => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  mainWindowEvents() {
    this._mainWindow.on('close', event => {
      if (!this.flags.isFromSystemTrayClose) {
        // event.preventDefault();
        // this._mainWindow.hide();
      }
    });
  }

  async ipcEvents() {
    await this._ipcMain.on('getUserId', (event, arg) => {
      console.log(arg);
      if (arg && !this._activityTracker) {
        event.returnValue = true;
        this._mainWindow.maximize();
        this._activityTracker = new ActivityTracker(arg);
        this._activityTracker.start();
        log.info("works fine with me");
      }
    });
  }

  handleAllErrors() {
    process.on('uncaughtException', function (error) {
      log.error('an error happened(most because of ipc call):' + error);
    });
  }

  systemTrayEvents() {
    this._systemTray.on('click', event => {
      this.landingPageReload();
    });
  }
}