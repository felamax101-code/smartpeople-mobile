


export function getAvatarColor(username: string) {
    if (!username) return "hsl(210, 65%, 55%)";

    const hash = username
        .split("")
        .reduce((acc, char) => acc * 31 + char.charCodeAt(0), 0);

    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
}