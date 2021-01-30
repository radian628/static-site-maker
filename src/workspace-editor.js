let  { parseDirectory } = require("./directory-parser");
let fs = require("fs");
let path = require("path");
let { ipcRenderer, shell } = require("electron");
let { getReplacers, getSubstrings } = require("./page-parser");
let marked = require("marked");

document.getElementById("new-instance").addEventListener("click", function () {
    ipcRenderer.send("open-create-instance-dialog", workspaceDataJSON);
});

let workspaceDataJSON;
let workspacePath;

ipcRenderer.on("create-new-instance", (event, paths) => {
    let instanceData = {
        template: path.relative(workspaceDataJSON.source, paths.templatePath),
        replacers: {}
    };

    fs.readFile(paths.templatePath, (err, templateFile) => {
        if (err) throw err;
        getReplacers(templateFile.toString()).forEach(replacer => {
            if (replacer.identifier) {
                instanceData.replacers[replacer.identifier] = "";
            }
        });
        fs.writeFile(paths.instancePath, JSON.stringify(instanceData), (err) => {
            if (err) throw err;
            ipcRenderer.send("open-instance-window", paths.instancePath, workspaceDataJSON, workspacePath);
        });
    });

});

ipcRenderer.on("opened-file-info", (event, fileName) => {
    workspacePath = fileName;
    document.getElementById("editing-file-name").innerText = fileName;
    fs.readFile(fileName, (err, workspaceData) => {
        if (err) throw err;
        workspaceDataJSON = JSON.parse(workspaceData.toString());

        process.chdir(path.dirname(fileName));
        
        document.getElementById("source-directory-name").innerText = workspaceDataJSON.source;
        
        document.getElementById("destination-directory-name").innerText = workspaceDataJSON.destination;

        document.getElementById("workspace-info-container").innerHTML = marked(workspaceDataJSON.description);

        document.getElementById("open-button").addEventListener("click", (event) => {
            ipcRenderer.send("open-dialog", {
                instance: true,
                folder: path.resolve(workspaceDataJSON.source),
                workspaceData: workspaceDataJSON,
                workspacePath: workspacePath
            });
        });

        document.getElementById("build-button").addEventListener("click", (event) => {
            parseDirectory(workspaceDataJSON.source, workspaceDataJSON.destination, () => {
                shell.openPath(path.resolve(workspaceDataJSON.homepage));
                window.alert("Done!");
            })
        });

    });
});


//parseDirectory("source", "destination");


