let fs = require("fs");
let path = require("path");
let marked = require("marked");

exports.getReplacers = function (template) {
    return template.match(/\${.{0,}?}/g).map(str => str.slice(1)).map(replacer => JSON.parse(replacer));
}

exports.getSubstrings = function (template) {
    return template.split(/\${.{0,}?}/g);
}

exports.zipperMerge = function (arr1, arr2) {
    let out = "";
    arr1.forEach((e, index) => {
        out += e;
        if (arr2[index]) {
            out += arr2[index];
        }
    });
    return out
}

exports.insertInput = function (template, content) {
    let replacers = exports.getReplacers(template);
    let substrings = exports.getSubstrings(template);

    let insertedStrings = replacers.map(replacer => {
        let input = content.replacers[replacer.identifier];
        if (input) {
            replacer.input = input;
        }
        return "$" + JSON.stringify(replacer);
    });

    return exports.zipperMerge(substrings, insertedStrings);
}

exports.applyInput = function (instance, directory, replacersToUse) {
    console.log(instance);
    let replacers = instance.match(/\${.{0,}?}/g).map(str => str.slice(1)).map(replacer => JSON.parse(replacer));
    let substrings = instance.split(/\${.{0,}?}/g);

    let insertedStrings = replacers.map(replacer => {
        let input = replacer.input;
        if (replacersToUse.all || replacersToUse[replacer.type]) {
            switch (replacer.type) {
                case "directory":
                    let directoryPath = replacer.relative ? path.join(directory, replacer.path) : replacer.path;
                    let files = fs.readdirSync(directoryPath);
                    let fileData = [];
                    files.forEach(file => {
                        let filePath = path.join(directoryPath, file);
                        //console.log(filePath);
                        let fileExt = path.extname(filePath);
                        if (fs.statSync(filePath).isFile() && fileExt != ".htmltemplate" && fileExt != ".htmlinstance") {
                            fileData.push({
                                fileName: file,
                                fileTitle: fs.readFileSync(path.join(directoryPath, file)).toString().match(/(?<=<title>).{0,}?(?=<\/title>)/)
                            });
                        }
                    });
                    return fileData.map(file => `<li><a href="${file.fileName}">${file.fileTitle || file.fileName}</a></li>`).join("\n");
                case "replace":
                    return marked(input);
            }
        } else {
            return "$" + JSON.stringify(replacer);
        }
    });

    return exports.zipperMerge(substrings, insertedStrings);
}

// fs.readFile("test.html", (err, data) => {
//     if (err) throw err;
    
//     let withInput = exports.insertInput(data.toString(), {
//         replacers: { 
//             testText: "qwerertjtjdklgdfkgjldfkjg",
//             pageTitle: "Page Title"
//         }
//     });

//     let withActualText = exports.applyInput(withInput, "", { all: true });

//     fs.writeFile("output.html", withActualText, () => {

//     });
// })