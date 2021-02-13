let fs = require("fs");
let tar = require("tar");
let path = require("path");

const buildDir = "../build";

fs.readdir(buildDir, (err, files) => {
    files.forEach(directory => {
        let fullDirPath = path.join(buildDir, directory);
        if (fs.statSync(fullDirPath).isDirectory()) {
            tar.c({
                gzip: true,
                file: path.join("../build", directory + ".tar.gz")
            }, [fullDirPath]).then(_ => {
                fs.rmdir(fullDirPath, {
                    recursive: true
                }, (err) => {
                    if (err) throw err;
                    console.log("Done compressing " + directory);
                });
            });
        }
    });
});