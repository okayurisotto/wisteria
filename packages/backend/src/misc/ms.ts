export const seconds = (n: number): number => {
	return n * 1000;
};

export const minutes = (n: number): number => {
	return n * 60 * 1000;
};

export const hours = (n: number): number => {
	return n * 60 * 60 * 1000;
};

export const days = (n: number): number => {
	return n * 24 * 60 * 60 * 1000;
};
