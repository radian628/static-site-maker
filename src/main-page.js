let { ipcRenderer } = require("electron");

document.getElementById("open-button").addEventListener("click", (event) => {
    ipcRenderer.send("open-dialog", {
        workspace: true
    });
});