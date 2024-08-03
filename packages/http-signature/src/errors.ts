class HttpSignatureError extends Error {
	constructor(caller: { name: string }, message?: string) {
		super(message);
		this.name = caller.name;
	}
}

export class InvalidAlgorithmError extends HttpSignatureError {
	constructor(message?: string) {
		super(InvalidAlgorithmError, message);
	}
}

export class InvalidRequestError extends HttpSignatureError {
	constructor(message?: string) {
		super(InvalidRequestError, message);
	}
}

export class ExpiredRequestError extends HttpSignatureError {
	constructor(message?: string) {
		super(ExpiredRequestError, message);
	}
}

export class InvalidHeaderError extends HttpSignatureError {
	constructor(message?: string) {
		super(InvalidHeaderError, message);
	}
}

export class InvalidParamsError extends HttpSignatureError {
	constructor(message?: string) {
		super(InvalidParamsError, message);
	}
}

export class MissingHeaderError extends HttpSignatureError {
	constructor(message?: string) {
		super(MissingHeaderError, message);
	}
}

export class StrictParsingError extends HttpSignatureError {
	constructor(message?: string) {
		super(StrictParsingError, message);
	}
}
