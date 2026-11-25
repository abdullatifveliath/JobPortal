// Turns user text into a literal regex, so "C++" or "(remote)" are searched
// as plain text instead of crashing / running a slow pattern.
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
