export const isOwner = (id: number): boolean => {
    return String(id) === process.env.TELEGRAM_USER_TOKEN?.trim();
};
