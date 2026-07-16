export const SHELL_PREFILL_EVENT = "suvo:shell-prefill";
export const OPEN_PALETTE_EVENT = "suvo:open-palette";

/**
 * Fired once per command the visitor actually runs in the shell.
 *
 * The shell dispatches this rather than calling the analytics tracker directly,
 * so the shell keeps knowing nothing about analytics — this stays a plain
 * "something happened" announcement that anything may subscribe to, the same
 * way suvo:achievement already works.
 *
 * `known` distinguishes a real command from a typo. The misses are the more
 * interesting half of the data: they say what people expected the shell to do.
 */
export const SHELL_RUN_EVENT = "suvo:shell-run";

export type ShellRunDetail = { name: string; known: boolean };
