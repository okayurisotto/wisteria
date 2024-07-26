import { ApiError } from '@/server/api/error.js';

export class AuthenticationError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'AuthenticationError';
	}

	public serialize() {
		const message =
			'Authentication failed. Please ensure your token is correct.';

		return new ApiError(
			{
				message,
				code: 'AUTHENTICATION_FAILED',
				id: 'b0a7f5f8-dc2f-4171-b91f-de88ad238e14',
				httpStatusCode: 401,
			},
			undefined,
			new Map([
				[
					'WWW-Authenticate',
					`Bearer realm="Misskey", error="invalid_token", error_description="${message}"`,
				],
			]),
		).serialize();
	}
}
