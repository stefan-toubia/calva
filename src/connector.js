const vscode = require('vscode');
const state = require ('./state');
const statusbar = require('./statusbar');
const repl = require('./repl/client');
const message = require('./repl/message');

function findSession(session, sessions) {
    let current = state.deref();
    console.log("STATE?!");
    console.log(current);

    let client = repl.create()
    .once('connect', function () {
        let msg = message.testSession(sessions[session]);
        client.send(msg, function (results) {
            for (var i = 0; i < results.length; i++) {
                let result = results[i];
                if (result.value && result.value === "3.14") {
                    state.cursor.set("cljs", sessions[session]);
                } else if (result.ex) {
                    state.cursor.set("clj", sessions[session]);
                }
            }
            client.end();
        });
    })
    .once('end', function () {
        //If last session, check if found
        if (session === (sessions.length - 1) && current.get("cljs") === null) {
            //Default to first session if no cljs-session is found, and treat it as a clj-session
            if (sessions.length > 0) {
                state.cursor.set("clj", sessions[session]);
            }
        } else if (current.get("cljs") === null || current.get("clj") === null) {
            findSession((session + 1), sessions);
        } else {
            //Check the initial file where the command is called from
            //TODO FIXME -clojureEvaluation.evaluateFile(state);
        }
        statusbar.update();
    });
};

function connect() {
    let current = state.deref();
    vscode.window.showInputBox({
        placeHolder: "Enter existing nREPL hostname:port here...",
        prompt: "Add port to nREPL if localhost, otherwise 'hostname:port'",
        value: "localhost:",
        ignoreFocusOut: true
    })
    .then(function (url) {
        let [hostname, port] = url.split(':');
        state.cursor.set("hostname", hostname);
        state.cursor.set("port", port);
        console.log("CONNECTING!");
        console.log(state.deref());
        let client = repl.create({hostname, port}).once('connect', function () {
            state.cursor.set("connected", true);
            let msg = message.listSessions();
            client.send(msg, function (results) {
                findSession(0, results[0].sessions);
                client.end();
            });
        });
    });
};

module.exports = {
    connect
};
