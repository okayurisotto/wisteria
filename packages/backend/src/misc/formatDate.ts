export const formatTime = (date: Date) => {
	const HH = date.getHours().toString().padStart(2, '0');
	const mm = date.getMinutes().toString().padStart(2, '0');
	const ss = date.getSeconds().toString().padStart(2, '0');

	return `${HH}-${mm}-${ss}`;
};

export const formatDateTime = (date: Date) => {
	const yyyy = date.getFullYear().toString().padStart(4, '0');
	const MM = (date.getMonth() + 1).toString().padStart(2, '0');
	const dd = date.getDate().toString().padStart(2, '0');
	const HH = date.getHours().toString().padStart(2, '0');
	const mm = date.getMinutes().toString().padStart(2, '0');
	const ss = date.getSeconds().toString().padStart(2, '0');

	return `${yyyy}-${MM}-${dd}-${HH}-${mm}-${ss}`;
};
