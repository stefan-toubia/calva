interface Event {
    type: string
}

export class NReplEvaluationStartedEvent implements Event {
    type = "started"
    constructor(public fileName: string, public filePath: string){}
}

export class NReplEvaluationFinishedEvent implements Event {
    type = "finished";
    constructor(public fileName: string, public filePath: string, public error?:string){}
}
