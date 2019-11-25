import { window, StatusBarAlignment, StatusBarItem } from "vscode";
import { activeReplWindow } from '../repl-window';

import { onNReplEvent } from "../nrepl";
import { NReplEvaluationStartedEvent, NReplEvaluationFinishedEvent } from "../nrepl/events";

import configReader from "../configReader";
import * as state from '../state';
import * as util from '../utilities';

export interface EvaluationError {
    fileName: string;
    filePath: string;
    message: string;
}

export class FileTypeStatusBarItem {
    private statusBarItem: StatusBarItem;

    private activeEvals = new Array<string>();

    private errors = new Array<EvaluationError>();

    private get isEvaluating() {
        return this.activeEvals.length > 0;
    }

    private get hasErrors(){
        return this.errors.length > 0;
    }

    constructor(alignment: StatusBarAlignment) {
        this.statusBarItem = window.createStatusBarItem(alignment);
        // TODO: Event handling and resulting state should be moved to global state
        onNReplEvent(this.handleNreplEvent);
    }

    update() {
        const connected = state.deref().get("connected");
        const doc = util.getDocument({});
        const fileType = util.getFileType(doc);
        const sessionType = util.getREPLSessionType();

        let command = null;
        let text = "Disconnected";
        let tooltip = "No active REPL session";
        let color = configReader.colors.disconnected;

        if(connected) {
            if (fileType == 'cljc' && sessionType !== null && !activeReplWindow()) {
                text = this.statusTextDecorator("cljc/" + sessionType);
                if (util.getSession('clj') !== null && util.getSession('cljs') !== null) {
                    command = "calva.toggleCLJCSession";
                    tooltip = `Click to use ${(sessionType === 'clj' ? 'cljs' : 'clj')} REPL for cljc`;
                }
            } else if (sessionType === 'cljs') {
                text = this.statusTextDecorator("cljs");
                tooltip = "Connected to ClojureScript REPL";
            } else if (sessionType === 'clj') {
                text = this.statusTextDecorator("clj");
                tooltip = "Connected to Clojure REPL";
            }
            color = this.connectedStatusColor();
            if(this.hasErrors) {
                tooltip = this.errorTooltip();
            }
        }

        this.statusBarItem.command = command;
        this.statusBarItem.text = text;
        this.statusBarItem.tooltip = tooltip;
        this.statusBarItem.color = color
        this.statusBarItem.show();
    }

    private statusTextDecorator(text): string {
        if(this.hasErrors) {
            const c = this.errors.length;
            text = `${text} $(alert) ${c > 1 ? c : ""}`
        }
        if(this.isEvaluating) {
            text = text + " $(gear~spin)";
        }
        return text;
    }

    private connectedStatusColor(): string {
        const c = configReader.colors;
        if(this.hasErrors) {
            return c.error;
        } else if (this.isEvaluating) {
            return c.launching;
        }
        return c.typeStatus;
    }

    private errorTooltip(): string {
        if(this.errors.length > 1){
            return "There are errors in multiple files";
        }
        const err = this.errors[0];
        return `Error: ${err.fileName}: ${err.message}`;
    }

    private handleNreplEvent = (e: NReplEvaluationStartedEvent | NReplEvaluationFinishedEvent) => {
        switch(e.type){
            case "started":
                this.removeError(e.filePath);
                this.activeEvals.push(e.filePath);
                break;
            case "finished":
                this.removeActive(e.filePath);
                const fe = <NReplEvaluationFinishedEvent> e;
                if(fe.error) {
                    this.errors.push({
                        fileName: fe.fileName,
                        filePath: fe.filePath,
                        message: fe.error
                    });
                }
                break;
        }
        this.update();
    }

    private removeActive(filePath: string) {
        const idx = this.activeEvals.indexOf(filePath);
        if(idx !== -1) {
            this.activeEvals.splice(idx, 1);
        }
    }

    private removeError(filePath: string) {
        const idx = this.errors.findIndex(e => e.filePath === filePath);
        if(idx !== -1) {
            this.errors.splice(idx, 1);
        }
    }

    dispose() {
        this.statusBarItem.dispose();
    }
}
