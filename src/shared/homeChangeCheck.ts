/** Whether Settings can save a Home folder and agent: the folder to save, or why not (no error: the user cancelled). */
export type HomeChangeCheck = { ok: true; cwd: string } | { ok: false; error?: string };
