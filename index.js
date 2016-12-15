const electron = require('electron');
const app = electron.app;
const ipc = electron.ipcMain;
const BrowserWindow = electron.BrowserWindow;
const dialog = electron.dialog;
const Menu = electron.Menu;
const Tray=electron.Tray;
//const crashreporter=electron.crashreporter;

const path = require('path');
const glob = require('glob');

var AutoLaunch = require('auto-launch');
var ghReleases = require('electron-gh-releases');
var Positioner = require('electron-positioner');


var iconIdle = path.join(__dirname, 'assets/images', 'github-logo.png');
var iconActive = path.join(__dirname, 'assets/images', 'all-read.png');

//crashreporter.start();

// Utilities
var isDarwin = (process.platform === 'darwin');
var isLinux = (process.platform === 'linux');
var isWindows = (process.platform === 'win32');




const debug = /--debug/.test(process.argv[2])

let mainWindow = null

var shouldQuit = makeSingleInstance()
if (shouldQuit) return app.quit()

var cachedBounds;
var appIcon = new Tray(iconIdle);
appIcon.setToolTip('GitHub Notifications on your menu bar.');

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function(){
  var windowPosition = (isWindows) ? 'trayBottomCenter' : 'trayCenter';

  initWindow();

  appIcon.on('click', function (e, bounds) {
    if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) return hideWindow();
    if (appIcon.window && appIcon.window.isVisible()) return hideWindow();
    bounds = bounds || cachedBounds;
    cachedBounds = bounds;
    showWindow(cachedBounds);
  });

  function initWindow () {
    var defaults = {
      width: 400,
      height: 350,
      show: false,
      frame: false,
      resizable: false,
      webPreferences: {
        overlayScrollbars: true
      }
    };

    appIcon.window = new BrowserWindow(defaults);
    appIcon.positioner = new Positioner(appIcon.window);
    appIcon.window.loadURL('file://' + __dirname + '/build/index.html');
    appIcon.window.on('blur', hideWindow);
    appIcon.window.setVisibleOnAllWorkspaces(true);

    if (debug) {
        appIcon.window.webContents.openDevTools()
        //appIcon.window.maximize()
    }

    initMenu();
    checkAutoUpdate(true);
  }

  function showWindow (trayPos) {
    var noBoundsPosition;
    if (!isDarwin && trayPos !== undefined) {
      var displaySize = electron.screen.getPrimaryDisplay().workAreaSize;
      var trayPosX = trayPos.x;
      var trayPosY = trayPos.y;

      if (isLinux) {
        var cursorPointer = electron.screen.getCursorScreenPoint();
        trayPosX = cursorPointer.x;
        trayPosY = cursorPointer.y;
      }

      var x = (trayPosX < (displaySize.width / 2)) ? 'left' : 'right';
      var y = (trayPosY < (displaySize.height / 2)) ? 'top' : 'bottom';

      if (x === 'right' && y === 'bottom') {
        noBoundsPosition = (isWindows) ? 'trayBottomCenter' : 'bottomRight';
      } else if (x === 'left' && y === 'bottom') {
        noBoundsPosition = 'bottomLeft';
      } else if (y === 'top') {
        noBoundsPosition = (isWindows) ? 'trayCenter' : 'topRight';
      }
    } else if (trayPos === undefined) {
      noBoundsPosition = (isWindows) ? 'bottomRight' : 'topRight';
    }

    var position = appIcon.positioner.calculate(noBoundsPosition || windowPosition, trayPos);
    appIcon.window.setPosition(position.x, position.y);
    appIcon.window.show();
  }

  function hideWindow () {
    if (!appIcon.window) return;
    appIcon.window.hide();
  }
})

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})

ipc.on('reopen-window', function() {
    showWindow(cachedBounds);
  })

ipc.on('update-icon', function(event, arg) {
    if (arg === 'TrayActive') {
      appIcon.setImage(iconActive);
    } else {
      appIcon.setImage(iconIdle);
    }
  })

ipc.on('check-update', function() {
    checkAutoUpdate(true);
  })

ipc.on('app-quit', function() {
      app.quit();
})



function checkAutoUpdate(showAlert) {

    var autoUpdateOptions = {
      repo: 'uname-yang/aria2-air',
      currentVersion: app.getVersion()
    };

    var update = new ghReleases(autoUpdateOptions, function (autoUpdater) {
      autoUpdater
        .on('error', function(event, message) {
          console.log('ERRORED.');
          console.log('Event: ' + JSON.stringify(event) + '. MESSAGE: ' + message);
        })
        .on('update-downloaded', function (event, releaseNotes, releaseName,
          releaseDate, updateUrl, quitAndUpdate) {
          console.log('Update downloaded');
          confirmAutoUpdate(quitAndUpdate);
        });
    });

    // Check for updates
    update.check(function (err, status) {
      if (err || !status) {
        if (showAlert) {
          dialog.showMessageBox({
            type: 'info',
            buttons: ['Close'],
            title: 'No update available',
            message: 'You are currently running the latest version of Gitify.'
          });
        }
        app.dock.hide();
      }

      if (!err && status) {
        update.download();
      }
    });
  }

function confirmAutoUpdate(quitAndUpdate) {
    dialog.showMessageBox({
      type: 'question',
      buttons: ['Update & Restart', 'Cancel'],
      title: 'Update Available',
      cancelId: 99,
      message: 'There is an update available. Would you like to update Gitify now?'
    }, function (response) {
      console.log('Exit: ' + response);
      app.dock.hide();
      if (response === 0) {
        quitAndUpdate();
      }
    } );
  }


// Make this app a single instance app.
//
// The main window will be restored and focused instead of a second window
// opened when a person attempts to launch a second instance.
//
// Returns true if the current version of the app should quit instead of
// launching.
function makeSingleInstance() {
    return app.makeSingleInstance(function() {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
        }
    })
}


function initMenu () {
  var template = [{
    label: 'Edit',
    submenu: [
      {
        label: 'Copy',
        accelerator: 'Command+C',
        selector: 'copy:'
      },
      {
        label: 'Paste',
        accelerator: 'Command+V',
        selector: 'paste:'
      },
      {
        label: 'Select All',
        accelerator: 'Command+A',
        selector: 'selectAll:'
      }
    ]
  }];

    var menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
