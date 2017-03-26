(function () {
    "use strict";
    
    var path = require('path');
    var cp = require('child_process');

    function execute(command, workingDirectory) {
        let promise = new Promise((resolve, reject) => {
            cp.exec(command, { cwd: workingDirectory, maxBuffer: 1024 * 1024 * 500 }, function (error, stdout, stderr) {
                let execError = stderr.toString();
                resolve(stdout);
                /*if (error) {
                    reject(new Error(error.message));
                }
                else if (execError !== '') {
                    reject(new Error(execError));
                }
                else {
                    resolve(stdout);
                }*/
            });
        });
        return promise;
    }
    
    let _domainManager = null;
    let project = "";
    let coala = "";
    
    function init_handler(project_path, coala_path, callback) {
        project = project_path;
        coala = coala_path;
        execute(coala + " --version", null).then(function(data){
            callback(null, data); 
        });
    }
    
    function analyze_handler(file_path, callback) {
        execute(coala + " --find-config --limit-files=" + path.basename(file_path) + " --format=" + 
               "{line}:{column}:{end_line}:{end_column}:{severity}:{origin}:{message}", path.dirname(file_path)).then(function(data){
            callback(null, data); 
        });
    }

    function init(domainManager) {
        if (!domainManager.hasDomain("coala")) {
            domainManager.registerDomain("coala", {major: 0, minor: 1});
        }

        domainManager.registerCommand(
            "coala",
            "init",
            init_handler,
            true,
            "Initialyze coala",
            [{name: "project",
                type: "string",
                description: "Path to project"},
            {name: "coala_path",
                type: "string",
                description: "Path to coala"}],
            [{
                name: "result",
                type: "string",
                description: "String contains coala version"
            }]
        );
        
        domainManager.registerCommand(
            "coala",
            "analyzeFile",
            analyze_handler,
            true,
            "Analyze file",
            [{name: "path",
                type: "string",
                description: "Path to file"}],
            [{
                name: "result",
                type: "string",
                description: "The result of the execution"
            }]
        );
        
        _domainManager = domainManager;
    }

    exports.init = init;
}());