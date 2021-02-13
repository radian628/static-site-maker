let fs = require("fs");
let fse = require("fs-extra");
let path = require("path");
let PageParser = require("./page-parser");

function changeExtension(filePath, newExt) {
    let parsedPath = path.parse(filePath);
    parsedPath.base = undefined;
    parsedPath.ext = newExt;
    return path.format(parsedPath);
}

function recursiveReaddir(dir, callback, allDone) {
    fs.readdir(dir, {}, (err, files) => {
        let promises = [];
        files.forEach(file => {
            let filePath = path.join(dir, file);
            promises.push(new Promise((resolveFilePromise, reject) => {
                fs.stat(filePath, {}, (err2, stats) => {
                    Promise.all([
                        new Promise((resolve, reject) => {
                            if (stats.isDirectory()) {
                                recursiveReaddir(filePath, callback, () => {
                                    resolve();
                                });
                            } else {
                                resolve();
                            }
                        }),
                        new Promise((resolve, reject) => {
                            callback(err2, filePath, stats, () => {
                                resolve();
                            });
                        })
                    ]).then(() => {
                        resolveFilePromise();
                    });
                });
            }));
        });
        Promise.all(promises).then(() => {
            allDone();
        });
    });
}

function deleteListOfFiles(filesToDelete, callback) {
    let promises = [];
    filesToDelete.forEach(file => {
        promises.push(new Promise((resolve, reject) => {
            fs.unlink(file, (err) => {
                if (err) throw err;
                resolve();
            });
        }));
    });
    Promise.all(promises).then(callback);
}

function parseFileLinks(callback) {
    recursiveReaddir("./", (err, filePath, stats, done) => {
        if (err) throw err;
        let filePathInfo = path.parse(filePath);
        switch (filePathInfo.ext) {
            case ".html":
                fs.readFile(filePath, (err, pageFile) => {
                    if (err) throw err;
                    let pageFileString = pageFile.toString();
                    let pageFileReplaced = PageParser.applyInput(pageFileString, filePath, { directory: true });
                    fs.writeFile(filePath, pageFileReplaced, (err) => {
                        if (err) throw err;
                        done();
                    });

                });
                break;
            default:
                done();
                break;
        }

    }, () => {
        callback();
    });
}

//Behold, the mythical function containing *six* nested callbacks. Why is async so painful?
exports.parseDirectory = function parseDirectory(workspaceLocation, src, dst, callback) {

    let prevDirectory = process.cwd();
    console.log(prevDirectory);
    process.chdir(workspaceLocation);

    fs.rmdir(dst, { recursive: true }, () => {

        fse.copy(src, dst, {}, () => {

            process.chdir(path.join(workspaceLocation, dst));            

            let instanceFiles = [];
            let filesToDelete = [];

            recursiveReaddir("./", (err, filePath, stats, done) => {
                if (err) throw err;
                let filePathInfo = path.parse(filePath);
                switch (filePathInfo.ext) {
                    case ".htmlinstance":
                        instanceFiles.push(filePath);
                        filesToDelete.push(filePath);

                        fs.readFile(filePath, (err, instanceFile) => {
                            if (err) throw err;
                            let instanceFileString = instanceFile.toString();
                            let instanceFileJSON = JSON.parse(instanceFileString);
                            fs.readFile(instanceFileJSON.template, (err, templateFile) => {
                                if (err) throw err;
                                let templateFileString = templateFile.toString();
                                let instanceFileWithInput = PageParser.insertInput(templateFileString, instanceFileJSON);
                                let instanceFileReplaced = PageParser.applyInput(instanceFileWithInput, filePath, { replace: true });
                                fs.writeFile(changeExtension(filePath, ".html"), instanceFileReplaced, (err) => {
                                    if (err) throw err;
                                    done();
                                });
                            });

                        });

                        break;
                    case ".htmltemplate":
                        filesToDelete.push(filePath);
                        done();
                        break;
                    default:
                        done();
                        break;
                }

            }, () => {

                parseFileLinks(() => {
                    deleteListOfFiles(filesToDelete, () => {
                        process.chdir(prevDirectory);
                        callback();
                    });
                });

            });

        });

    });

}

//parseDirectory("source", "destination");