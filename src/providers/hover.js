const vscode = require('vscode');
const state = require('../state');

const repl = require('../repl/client');
const message = require('../repl/message');
const {getNamespace, getActualWord} = require('../utilities');

module.exports = class HoverProvider {
    constructor() {
        this.state = state;
    }

    formatDocString(doc) {
        let result = '';
        if (doc !== 'undefined') {
            result += '```clojure\n' + doc.replace(/\s\s+/g, ' ') + '\n```';
        }
        result += '';
        return result.length > 0 ? result : "";
    }

    provideHover(document, position, token) {
        let selected = document.getWordRangeAtPosition(position),
            selectedText = selected !== undefined ? document.getText(new vscode.Range(selected.start, selected.end)) : "",
            text = getActualWord(document, position, selected, selectedText),
            docstring = "",
            scope = this,
            filetypeIndex = (document.fileName.lastIndexOf('.') + 1),
            filetype = document.fileName.substr(filetypeIndex, document.fileName.length);
        if (this.state.deref().get('connected')) {
            return new Promise((resolve, reject) => {
                let current = scope.state.deref(),
                    client = repl.create().once('connect', () => {
                    let msg = message.info(current.get(filetype),
                                           getNamespace(document.getText()), text);
                    client.send(msg, function (results) {
                        for (var r = 0; r < results.length; r++) {
                            let result = results[r];
                            docstring += result.doc;
                        }
                        client.end();
                        if (docstring.length === 0) {
                            reject("Docstring not found for " + text);
                        } else {
                            let result = scope.formatDocString(docstring);
                            if (result.length === 0) {
                                reject("Docstring not found for " + text);
                            } else {
                                resolve(new vscode.Hover(result));
                            }
                        }
                    });
                });
            });
        } else {
            return new vscode.Hover("Not connected to nREPL..");
        }
    }
}
