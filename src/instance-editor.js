let  { parseDirectory } = require("./directory-parser");
let fs = require("fs");
let path = require("path");
let { ipcRenderer } = require("electron");
let { getReplacers, getSubstrings } = require("./page-parser");

let instanceJSON;
let fileName;

document.addEventListener("keydown", function (event) {
    if (event.key == "s" && event.ctrlKey) {
        if (fileName && instanceJSON) {
            Object.keys(instanceJSON.replacers).forEach(replacerKey => {
                instanceJSON.replacers[replacerKey] = document.getElementById(`replacer-text-${replacerKey}`).value;
            });
            fs.writeFile(fileName, JSON.stringify(instanceJSON), (err) => {
                if (err) {
                    window.alert(`Error: ${err}`);
                } else {
                    document.getElementById("is-unsaved").innerText = "";
                }
            })
        }
    }
});

function setupInstanceEditor() {

}

function markAsUnsaved() {
    
}

function saveContent() {
    
}

ipcRenderer.once("opened-instance-info", (event, instanceInfo) => {
    fileName = instanceInfo.path;
    console.log(instanceInfo)
    document.getElementById("editing-file-name").innerText = fileName;
    fs.readFile(fileName, (err, instanceData) => {
        if (err) throw err;
        instanceJSON = JSON.parse(instanceData.toString());
        process.chdir(path.join(path.dirname(instanceInfo.workspacePath), instanceInfo.workspace.source));

        fs.readFile(instanceJSON.template, (err, templateData) => {
            if (err) throw err;
            let templateDataString = templateData.toString();
            let replacers = getReplacers(templateDataString);
            let substrings = getSubstrings(templateDataString);

            let replacerContainer = document.getElementById("replacer-container");

            replacers.forEach(replacer => {

                if (replacer.type == "replace") {
                    let replacerElem = document.createElement("div");
                    replacerElem.className = "replacer individual-section";
                    replacerContainer.appendChild(replacerElem);
                    
                    let replacerHeaderElem = document.createElement("h3");
                    replacerHeaderElem.innerText = replacer.title;
                    replacerElem.appendChild(replacerHeaderElem);

                    let replacerDescElem = document.createElement("label");
                    replacerDescElem.innerText = replacer.desc;
                    replacerElem.appendChild(replacerDescElem);

                    let replacerTextElem = document.createElement("textarea");
                    replacerTextElem.dataset.replacerName = replacer.identifier;
                    replacerTextElem.value = instanceJSON.replacers[replacer.identifier];//.replace(/\n/g, "<br>");
                    replacerTextElem.addEventListener("input", () => {
                        document.getElementById("is-unsaved").innerText = "(Unsaved)";
                    });
                    replacerTextElem.id = `replacer-text-${replacer.identifier}`;
                    replacerElem.appendChild(replacerTextElem);
                }
            })
        });
    });
});


//parseDirectory("source", "destination");


