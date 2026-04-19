export const truncateFileName = (name: string, maxLength = 20) => {
    if (!name) return "";

    const extIndex = name.lastIndexOf(".");
    if (extIndex === -1) return name;

    const ext = name.slice(extIndex);
    const base = name.slice(0, extIndex);

    if (name.length <= maxLength) return name;

    const keep = Math.floor((maxLength - ext.length - 3) / 2);

    return `${base.slice(0, keep)}...${base.slice(-keep)}${ext}`;
};