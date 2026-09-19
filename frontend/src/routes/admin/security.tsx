import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminHeading } from "@/components/admin/AdminUI";
import { changePassword } from "@/services/authService";
import { getErrorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/security")({ component: SecurityPage });
function SecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mutation = useMutation({ mutationFn: () => changePassword(currentPassword, newPassword), onSuccess: () => { setCurrentPassword(""); setNewPassword(""); setConfirm(""); toast.success("Password changed successfully"); }, onError: (error) => toast.error(getErrorMessage(error, "Could not change password")) });
  const valid = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && newPassword === confirm;
  return <><AdminHeading title="Security" description="Protect the permanent Vendura administrator account." /><section className="max-w-xl rounded-lg border border-border bg-card p-5"><h2 className="font-display text-lg font-bold">Change password</h2><p className="mt-1 text-sm text-muted-foreground">Use a unique password that you do not use for Supabase or your email.</p><form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); if (valid) mutation.mutate(); }}><PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} /><PasswordField label="New password" value={newPassword} onChange={setNewPassword} /><PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} /><p className="text-xs text-muted-foreground">At least 8 characters with an uppercase letter and a number.</p>{confirm && newPassword !== confirm && <p className="text-xs font-medium text-destructive">The new passwords do not match.</p>}<button type="submit" disabled={!currentPassword || !valid || mutation.isPending} className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{mutation.isPending ? "Changing password..." : "Change password"}</button></form></section></>;
}
function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium">{label}</span><input type="password" autoComplete={label === "Current password" ? "current-password" : "new-password"} value={value} onChange={(event) => onChange(event.target.value)} required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></label>; }
