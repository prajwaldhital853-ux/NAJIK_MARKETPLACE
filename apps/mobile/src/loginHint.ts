let hint: { message: string; identifier?: string } = { message: "" };

export function setLoginHint(message: string, identifier?: string) {
  hint = { message, identifier };
}

export function takeLoginHint() {
  const next = hint;
  hint = { message: "" };
  return next;
}
