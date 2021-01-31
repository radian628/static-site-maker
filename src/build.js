const packager = require("electron-packager");

async function bundleElectronApp(options) {
    const appPaths = await packager(options);
    console.log(`Electron app bundles created here:\n${appPaths.join("\n")}`);
}

bundleElectronApp({
    dir: "./",
    all: true,
    out: "../build"
});