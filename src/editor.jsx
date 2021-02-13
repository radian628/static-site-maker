let  { parseDirectory } = require("./directory-parser");
let fs = require("fs");
let path = require("path");
let { ipcRenderer, shell, TouchBarScrubber } = require("electron");
let { dialog } = require("electron").remote;
let { getReplacers, getSubstrings } = require("./page-parser");
let marked = require("marked");
let React = require("react");
let ReactDOM = require("react-dom");
let EventEmitter = require("events");
const { template } = require("@babel/core");
const { throwDeprecation } = require("process");

class EditorInterface extends EventEmitter {
    chooseWorkspace() {
        dialog.showOpenDialog({
            title: "Open a Workspace (.ssmworkspace) File",
            buttonLabel: "Open Workspace",
            filters: [
                {
                    name: "Workspace",
                    extensions: ["ssmworkspace"]
                }
            ],
            properties: ["openFile"]
        }).then((fileInfo) => {
            let filePaths = fileInfo.filePaths;
            if (filePaths && filePaths[0]) {
                this.emit("choose-workspace", filePaths[0]);
            }
        });
    }
    readWorkspaceFile(filePath) {
        fs.readFile(filePath, (err, workspaceFile) => {
            if (err) throw err;
            this.emit("read-workspace-file", JSON.parse(workspaceFile.toString()));
        });
    }
    readInstanceFile(filePath) {
        fs.readFile(filePath, (err, instanceFile) => {
            if (err) throw err;
            let instanceJSON = JSON.parse(instanceFile.toString());
            instanceJSON.saved = true;
            this.emit("read-instance-file", filePath, instanceJSON);
        });
    }
    readTemplateFile(filePath) {
        fs.readFile(filePath, (err, templateFile) => {
            if (err) throw err;
            this.emit("read-template-file", filePath, templateFile.toString());
        });
    }
    writeJSONFile(filePath, fileData) {
        fs.writeFile(filePath, JSON.stringify(fileData), (err) => {
            if (err) throw err;
        });
    }
    chooseInstance() {
        dialog.showOpenDialog({
            title: "Open Instance (.htmlinstance) File(s)",
            buttonLabel: "Open Instance",
            filters: [
                {
                    name: "Instance",
                    extensions: ["htmlinstance"]
                }
            ],
            properties: ["openFile", "multiSelections"]
        }).then((fileInfo) => {
            let filePaths = fileInfo.filePaths;
            if (!fileInfo.canceled) {
                this.emit("choose-instance", filePaths);
            }
        });
    }
    chooseTemplate() {
        dialog.showOpenDialog({
            title: "Open Template (.htmltemplate) File(s)",
            buttonLabel: "Open Template",
            filters: [
                {
                    name: "Template",
                    extensions: ["htmltemplate"]
                }
            ],
            properties: ["openFile"]
        }).then((fileInfo) => {
            let filePaths = fileInfo.filePaths;
            if (!fileInfo.canceled) {
                this.emit("choose-template", filePaths[0]);
            }
        });
    }
    createInstance(workspacePath, templatePath, templateData) {
        dialog.showSaveDialog({
            title: "Create new Instance (.htmlinstance) File",
            buttonLabel: "Create Instance",
            filters: [
                {
                    name: "Instance",
                    extensions: ["htmlinstance"]
                }
            ]
        }).then((fileInfo) => {
            if (!fileInfo.canceled) {
                let filePath = fileInfo.filePath;
                let instanceFile = {
                    template: path.relative(workspacePath, templatePath),
                    replacers: {}
                };
                let replacers = getReplacers(templateData);
                replacers.forEach(replacer => {
                    if (replacer.identifier) {
                        instanceFile.replacers[replacer.identifier] = "";
                    }
                });
                fs.writeFile(filePath, JSON.stringify(instanceFile), err => {
                    if (err) throw err;
                    this.emit("create-instance", filePath);
                });
            }
        });
    }
}

class WorkspaceEditor extends React.Component {
    constructor (props) {
        super(props);
    }

    render () {

        let workspaceInfo;
        let workspaceDescription;

        if (this.props.workspaceData !== undefined) {

            let workspaceData = this.props.workspaceData;

            workspaceInfo = (
                <div id="workspace-info" className="individual-section">
                    <p>Source Directory (relative): <span className="property-value">{workspaceData.source}</span></p>
                    <p>Destination Directory (relative): <span className="property-value">{workspaceData.destination}</span></p>
                </div>
            );

            workspaceDescription = (
                <div id="workspace-description"  className="individual-section" dangerouslySetInnerHTML={{ __html: marked(workspaceData.description) }}>
                </div>
            );

        } else {
            workspaceInfo = <div id="workspace-info"><p>Loading workspace file...</p></div>;
        }

        if (this.props.openWorkspace === undefined) {
            return (
                <div className="individual-section">
                    <button onClick={() => { this.props.interface.chooseWorkspace() }} >Open Workspace</button>
                    <p>Open a workspace to begin editing!</p>
                </div>
            );
        } else {
            return (
                <div>
                    <div className="individual-section">
                        <button onClick={() => { this.props.interface.chooseWorkspace() }} >Open Workspace</button>
                        <p>Currently opened: <span className="property-value">{this.props.openWorkspace}</span></p>
                    </div>
                    {workspaceInfo}
                    {workspaceDescription}
                    {this.props.workspaceData ? (<div className="individual-section">
                        <button onClick={() => { parseDirectory(path.dirname(this.props.openWorkspace), this.props.workspaceData.source, this.props.workspaceData.destination, () => {
                            window.alert("Parsing complete! Opening site homepage...");
                            shell.openPath(path.join(path.dirname(this.props.openWorkspace), this.props.workspaceData.homepage));
                        }) }}>Build Site</button>
                    </div>) : null}
                </div>
            );
        }
    }

}

class InstanceNav extends React.Component {
    constructor (props) {
        super(props);
    }

    render () {
        let instanceList = Object.keys(this.props.openInstances).map(key => {
            let savedAsterisk = this.props.openInstances[key].saved ? "" : "* "
            return (
                    <li key={key}>
                        <button onClick={(event) => { this.props.setOpenInstance(event.currentTarget.dataset.instance) }} data-instance={key}>{savedAsterisk}{path.parse(key).name}</button>
                    </li>
            );
        });

        return (
            <div className="sidebar-left individual-section">
                <h2>Opened Instances:</h2>
                <ul>
                    {instanceList}
                </ul>
            </div>
        );
    }
}

class SingleInstanceEditor extends React.Component {
    constructor (props) {
        super(props);

        this.updateInstance = this.updateInstance.bind(this);

        this.saveHandler = (event) => {
            if (event.ctrlKey && event.key == "s") {
                fs.writeFile(this.props.openInstance, JSON.stringify(this.props.instanceData), (err) => {
                    if (err) throw err;
                    this.updateSavedState(true);
                });
            }
        }
    }

    updateSavedState(value) {
        let updatedInstance = {
            ...this.props.instanceData,
            saved: value
        };
        this.props.updateInstance(this.props.openInstance, updatedInstance);
    }

    updateInstance(event) {
        let replacer = event.currentTarget.dataset.replacername; 
        let newContent = event.currentTarget.value;
        let updatedInstance = {
            ...this.props.instanceData,
            replacers: {
                ...this.props.instanceData.replacers,
                [replacer]: newContent
            },
            saved: false
        };
        this.props.updateInstance(this.props.openInstance, updatedInstance);
    }

    componentDidMount() {
        document.addEventListener("keydown", this.saveHandler);
    }
    
    componentWillUnmount() {
        document.removeEventListener("keydown", this.saveHandler);
    }

    render () {
        if (this.props.instanceData) {
            let templateFilePath = path.join(path.dirname(this.props.openWorkspace), this.props.workspaceData.source, this.props.instanceData.template);
            
            let template = this.props.openTemplates[templateFilePath];
            if (template) {
                
                let templateReplacerMetadata = getReplacers(template);

                let templateReplacerDict = {};
                templateReplacerMetadata.forEach(replacerMetadata => {
                    templateReplacerDict[replacerMetadata.identifier] = replacerMetadata;
                });

                let replacers = this.props.instanceData.replacers;

                let replacerGUIList = Object.keys(replacers).map(key => {
                    let replacerContent = replacers[key];
                    
                    return (
                        <li key={key}>
                            <h3>{key}</h3>
                            <div>{templateReplacerDict[key].desc}</div>
                            <textarea data-replacername={key} value={replacerContent} onChange={this.updateInstance}></textarea>
                        </li>
                    );
                });
                
                return (
                    <div className="individual-section">
                        <h2>Currently Editing <span className="property-value">{path.parse(this.props.openInstance).name}</span></h2>
                        <p>Full Path: <span className="property-value">{this.props.openInstance}</span></p>
                        {this.props.instanceData.saved ? null : <p>* Unsaved (Ctrl+S to Save)</p>}
                        <ul>
                            {replacerGUIList}
                        </ul>        
                    </div>
                );
            } else {
                return (<p>Loading template file...</p>);
            }
        } else {
            return (<p>Loading instance file...</p>);
        }
    }
}

class InstanceEditor extends React.Component {
    constructor (props) {
        super(props);
    }

    render () {
        if (this.props.openWorkspace) {
            let pageContent;
            if (Object.keys(this.props.openInstances).length == 0) {
                pageContent = (
                    <div className="individual-section">
                        <p>Open or create instance(s) to begin editing!</p>
                    </div>
                );
            } else {
                let openInstanceGUI;

                if (this.props.openInstance) {
                    openInstanceGUI = <SingleInstanceEditor {...this.props} instanceData={this.props.openInstances[this.props.openInstance]} />
                }

                pageContent = (
                    <div>
                        <InstanceNav openInstances={this.props.openInstances} interface={this.props.interface} setOpenInstance={this.props.setOpenInstance} />
                        {openInstanceGUI}
                    </div>
                );
            }

            return (
                <div>
                    <div className="individual-section">
                        <button onClick={() => { this.props.interface.chooseInstance() }} >Open Instance(s)</button>
                    </div>
                    <div className="individual-section">
                        <button onClick={() => { this.props.interface.chooseTemplate() }} >Select Template for New Instances</button>
                        <p>Template Selected: <span className="property-value">{this.props.selectedTemplate}</span></p>
                        <button onClick={() => { 
                            if (this.props.selectedTemplate && this.props.openTemplates[this.props.selectedTemplate]) {
                                this.props.interface.createInstance(this.props.openWorkspace, this.props.selectedTemplate, this.props.openTemplates[this.props.selectedTemplate]);
                            } else {
                                window.alert("You must select a template off of which to base your new instance.")
                            }
                        }} >Create New Instance</button>
                    </div>
                    {pageContent}
                </div>
            );
        } else {
            return (
                <div className="individual-section">
                    <p>Open a workspace to edit its instances.</p>
                </div>
            );
        }
    }
}

class SSMEditor extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            openTab: "WorkspaceEditor",
            openWorkspace: undefined,
            workspaceData: undefined,
            openInstances: {},
            openInstance: undefined,
            openTemplates: {}
        };
        this.interface = props.interface;
        this.interface.on("choose-workspace", (filePath) => {
            this.setState({ openWorkspace: filePath });
            this.interface.readWorkspaceFile(this.state.openWorkspace);
        });
        this.interface.on("choose-template", (filePath) => {
            this.setState({ selectedTemplate: filePath });
            if (!this.state.openTemplates[this.state.selectedTemplate]) {
                this.setState({
                    openTemplates: {
                        ...this.state.openTemplates,
                        [filePath]: false
                    }
                });
                this.interface.readTemplateFile(filePath);
            }
        });
        this.interface.on("read-workspace-file", (fileData) => {
            this.setState({ workspaceData: fileData });
        });
        this.interface.on("choose-instance", (filePaths) => {
            let openInstancesCopy = {};
            Object.assign(openInstancesCopy, this.state.openInstances);
            filePaths.forEach(filePath => {
                openInstancesCopy[filePath] = false;
                this.interface.readInstanceFile(filePath);
            });
            this.setState({ openInstances: openInstancesCopy });
        });
        this.interface.on("read-instance-file", (filePath, fileData) => {
            let openInstancesCopy = {};
            Object.assign(openInstancesCopy, this.state.openInstances);
            openInstancesCopy[filePath] = fileData;
            if (fileData.template) {
                this.interface.readTemplateFile(path.join(path.dirname(this.state.openWorkspace), this.state.workspaceData.source, fileData.template));
            }
            this.setState({ 
                openInstances: openInstancesCopy
            });
        });
        this.interface.on("read-template-file", (filePath, fileData) => {
            this.setState({
                openTemplates: {
                    ...this.state.openTemplates,
                    [filePath]: fileData
                }
            });
        });
        this.interface.on("create-instance", (filePath) => {
            this.interface.readInstanceFile(filePath);
        }); 

        this.setOpenInstance = this.setOpenInstance.bind(this);
    }

    openTab (tabName) {
        this.setState({ openTab: tabName });
    }

    updateInstance (instanceKey, newInstanceData) {
        this.setState({
            openInstances: {
                ...this.state.openInstances,
                [instanceKey]: newInstanceData
            }
        });
    }

    setOpenInstance(filePath) {
        this.setState({ openInstance: filePath });
    }

    render () {
        return (<div id="editor-container">
            <ul id="tabs">
                <button onClick={ () => { this.openTab("WorkspaceEditor") }} >Workspace</button>
                <button onClick={ () => { this.openTab("InstanceEditor") }} >Instances</button>
            </ul>
            <div id="tab-container">
                {
                    ({        
                        WorkspaceEditor: <WorkspaceEditor openWorkspace={this.state.openWorkspace} workspaceData={this.state.workspaceData} interface={this.interface} />,
                        InstanceEditor: <InstanceEditor {...this.state} interface={this.interface} updateInstance={this.updateInstance.bind(this)} setOpenInstance={this.setOpenInstance} />
                    })[this.state.openTab]
                }
            </div>
        </div>);
    }
}

let editor = <SSMEditor interface={new EditorInterface()}/>;

ReactDOM.render(editor, document.getElementById("editor-container-container"));

//parseDirectory("source", "destination");


