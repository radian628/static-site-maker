const packager = require("electron-packager");
const { fork } = require("child_process");

function bundleElectronApp(options) {
    packager(options).then(appPaths => {
        appPaths.forEach(appPath => {
            console.log("Path: " + appPath);
        })
    }).catch(err => {
        console.log(err);
    }).finally(() => {
        //fork("./compress-builds.js");
    });
}

bundleElectronApp({
    dir: "../dist",
    all: true,
    out: "../build"
});