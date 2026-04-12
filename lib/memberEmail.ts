/** Shared guard: skip member-scoped sends when there is no usable email. No email_logs row when skipped. */
export function skipMemberEmailIfNoAddress(member: {
  full_name: string;
  email: string | null | undefined;
}): { skipped: true } | { skipped: false; to: string } {
  const trimmed = member.email?.trim();
  if (!trimmed) {
    console.log(`Skipping email for ${member.full_name} — no email on file`);
    return { skipped: true };
  }
  return { skipped: false, to: trimmed };
}

export function skipBackupEmailIfNoRecipient(backupEmail: string): { skipped: true } | { skipped: false; to: string } {
  const trimmed = backupEmail.trim();
  if (!trimmed) {
    console.log("Skipping backup email — no email on file");
    return { skipped: true };
  }
  return { skipped: false, to: trimmed };
}
