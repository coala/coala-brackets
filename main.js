define(function (require, exports, module) {
    "use strict";

    var AppInit = brackets.getModule("utils/AppInit");
    var ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
    var CommandManager = brackets.getModule("command/CommandManager");
    var CodeInspection  = brackets.getModule('language/CodeInspection');
    var LanguageManager = brackets.getModule('language/LanguageManager');
    var ProjectManager  = brackets.getModule('project/ProjectManager');
    var NodeDomain      = brackets.getModule('utils/NodeDomain');
    var PreferencesManager = brackets.getModule("preferences/PreferencesManager");
    var Reporter = require("reporter");
    var EditorManager = brackets.getModule("editor/EditorManager");
    var CodeMirror = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror");
    
    var integration = new NodeDomain("coala", ExtensionUtils.getModulePath(module, "node/domain"));
    var prefs = PreferencesManager.getExtensionPrefs("coala.brackets");
    var reporter = new Reporter();
    
    var CMD_SHOW_LINE_DETAILS = "coala.brackets.showLineDetails";

    ExtensionUtils.loadStyleSheet(module, "style.less");
    CommandManager.register("Show Line Details", CMD_SHOW_LINE_DETAILS, handleToggleLineDetails);
    
    prefs.definePreference("executable", "string", "coala");
    
    function addGutter(editor) {
        var cm = editor._codeMirror;
        var gutters = cm.getOption("gutters").slice(0);
        if (gutters.indexOf("coala-brackets-gutter") === -1) {
            gutters.unshift("coala-brackets-gutter");
            cm.setOption("gutters", gutters);
        }
    }
    
    function activateEditor(editor) {
        editor._codeMirror.on("gutterClick", gutterClick);
    }

    function deactivateEditor(editor) {
        editor._codeMirror.off("gutterClick", gutterClick);
    }

    function gutterClick(cm, lineIndex, gutterId) {
        if (gutterId === "coala-brackets-gutter") {
            reporter.toggleLineDetails(lineIndex);
        }
    }

    function handleToggleLineDetails() {
        reporter.toggleLineDetails();
    }
    
    function analyzeFile(text, filePath)
    {
        var deferred = new $.Deferred();
        console.log(filePath);
        integration.exec("analyzeFile", filePath)
            .then(function (result) {
                console.log(result)
                var activeEditor = EditorManager.getActiveEditor();
                var errors = result.split('\n');
                var cm = activeEditor._codeMirror;
                var messages_reporter = [];
                var messages = {
                    errors: []
                };
                errors.forEach(function(error){
                    var array = error.split(':');
                    if(array.length != 7) return;
                    function convert_type(type)
                    {
                        switch(type)
                        {
                            case "0": return ["error", "problem_type_error"];
                            case "1": return ["warning", "problem_type_warning"];
                            case "2": return ["info", "problem_type_meta"];
                        }
                    }
                    messages_reporter.push({
                        "id": array[5],
                        "code": array[5],
                        "type": convert_type(array[4])[0],
                        "message": array[6],
                        "token": {
                            "start": {
                                "line": array[0] - 1,
                                "ch": array[1]
                            },
                            "end": {
                                "line": array[2] - 1,
                                "ch": array[3]
                            }
                        },
                        "pos": {
                            "line": array[0],
                            "ch": array[1]
                        }
                    });
                    messages.errors.push({
                        pos: {
                            line: array[0] - 1,
                            ch: array[1]
                        },
                        endPos: {
                            line: array[2] - 1,
                            ch: array[3]
                        },
                        message: array[6],
                        type: convert_type(array[4])[1],
                        rule: array[5]
                    });
                });
                var cm = activeEditor._codeMirror;
                reporter.report(cm, messages_reporter);
                reporter.toggleLineDetails();
                deactivateEditor(EditorManager.getActiveEditor());
                activateEditor(EditorManager.getActiveEditor());
                addGutter(EditorManager.getActiveEditor());
                console.log(messages_reporter);
                
            
                return deferred.resolve(messages);
            }, function (err) {
                deferred.reject(err);
            });
        return deferred.promise();
    }
    
    AppInit.appReady(function () {
        integration.exec("init", ProjectManager.getProjectRoot().fullPath, prefs.get("executable")).then(function(data){
            // TODO: Parse .coafile and add listeners for all languages
            CodeInspection.register("coffeescript", {
                name: "Coala",
                scanFileAsync: analyzeFile
            });
            activateEditor(EditorManager.getActiveEditor());
        });
    });
});