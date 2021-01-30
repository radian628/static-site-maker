const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { fstat } = require('fs');
let path = require("path");

console.log(process.argv[1]);

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
});

function openInstanceWindow(event, filePath, workspace, workspacePath) {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    },
    parent: BrowserWindow.fromWebContents(event.sender)
  });

  win.loadFile('instance-editor.html');

  win.once("ready-to-show", (event) => {
    win.webContents.send("opened-instance-info", {
      path: filePath,
      workspace: workspace,
      workspacePath: workspacePath
    });
  });
}

ipcMain.on("open-instance-window", (event, filePath, workspace, workspacePath) => {
  openInstanceWindow(event, filePath, workspace, workspacePath);
})

function openWorkspaceWindow(event, filePath) {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    },
    parent: BrowserWindow.fromWebContents(event.sender)
  });

  win.loadFile('workspace-editor.html');

  win.once("ready-to-show", (event) => {
    win.webContents.send("opened-file-info", filePath);
  });
}

ipcMain.on("open-dialog", (event, fileOptions) => {

  let filters = [];
  if (fileOptions.workspace) {
    filters.push({
      name: "Workspace",
      extensions: ["ssmworkspace"]
    });
  }
  if (fileOptions.instance) {
    filters.push({
      name: "Instance",
      extensions: ["htmlinstance"]
    })
  }

  console.log(fileOptions.folder);

  dialog.showOpenDialog({
    defaultPath: fileOptions.folder || undefined,
    filters: filters,
    properties: [
      "openFile"
    ]
  }).then((result) => {
    let filePath = result.filePaths[0];
    if (filePath) {
      let filePathInfo = path.parse(filePath);
      if (filePathInfo.ext == ".htmlinstance") {
        openInstanceWindow(event, filePath, fileOptions.workspaceData, fileOptions.workspacePath);
      } else if (filePathInfo.ext == ".ssmworkspace") {
        openWorkspaceWindow(event, filePath);
      }
    }
  });
});

ipcMain.on("open-create-instance-dialog", (event, workspaceData) => {
  dialog.showOpenDialog({
    defaultPath: workspaceData.source,
    buttonLabel: "Select Template",
    title: "Select a template to use for your instance.",
    filters: [
      {
        name: "Template",
        extensions: ["htmltemplate"]
      }
    ],
    properties: [
      "openFile"
    ]
  }).then((template) => {
    if (!template.canceled) {
      dialog.showSaveDialog({
        defaultPath: workspaceData.source,
        buttonLabel: "Create Instance",
        title: "Save your new instance file.",
        filters: [
          {
            name: "Instance",
            extensions: ["htmlinstance"]
          }
        ],
      }).then((instance) => {
        if (!instance.canceled) {
          event.reply("create-new-instance", {
            templatePath: template.filePaths[0],
            instancePath: instance.filePath
          });
        }
      });
    }
  });
});