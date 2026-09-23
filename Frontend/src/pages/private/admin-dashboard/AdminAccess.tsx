import { useState } from "react";
import type React from "react";
import { useMutation, useQuery } from "@apollo/client";
import { Copy, Link as LinkIcon, Plus, ShieldCheck, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { CREATE_SIGNUP_LINK, DELETE_SIGNUP_LINK, GET_ALL_SIGNUP_LINKS } from "../../../graphql/mutations/auth";
import { AdminButton, AdminPage, AdminPageHeader, AdminSection, AdminState, AdminStatus, formatAdminDate } from "../../../components/admin/AdminPrimitives";
import { AdminModal } from "../../../components/admin/AdminModal";

export default function AdminAccess() {
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const { data, loading, error, refetch } = useQuery(GET_ALL_SIGNUP_LINKS, { fetchPolicy: "cache-and-network" });
  const [createLink, { loading: creating }] = useMutation(CREATE_SIGNUP_LINK);
  const [deleteLink] = useMutation(DELETE_SIGNUP_LINK);
  const links = data?.getAllSignupLinks || [];
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!firstName.trim() || !lastName.trim() || !email.trim() || !agreed) { toast.error("Complete the fields and accept the terms before inviting an Admin."); return; } try { await createLink({ variables: { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() } }); toast.success("Admin invitation created"); setFirstName(""); setLastName(""); setEmail(""); setAgreed(false); setShowForm(false); await refetch(); } catch { toast.error("Could not create the invitation"); } };
  const remove = async (id: string) => { try { await deleteLink({ variables: { id } }); toast.success("Invitation removed"); await refetch(); } catch { toast.error("Could not remove the invitation"); } };
  if (loading && !data) return <AdminPage><AdminState type="loading" title="Loading Admin access" description="Preparing invitation records." /></AdminPage>;
  if (error && !data) return <AdminPage><AdminState type="error" title="We couldn’t load Admin access" description="Refresh the page and try again." onRetry={() => void refetch()} /></AdminPage>;
  return <AdminPage>
    <AdminPageHeader title="Admin access" description="Manage dashboard access and Administrator invitations." action={<AdminButton icon={Plus} onClick={() => setShowForm(true)}>Invite Admin</AdminButton>} />
    <section className="dsp-admin-metrics" aria-label="Admin access summary"><AdminMetric label="Active invitations" value={links.filter((link: { pending?: boolean }) => !link.pending).length} helper="Accepted or active access records" /><AdminMetric label="Pending invitations" value={links.filter((link: { pending?: boolean }) => link.pending).length} helper="Awaiting signup" /></section>
    <AdminSection title="Admin invitations" description="Invitation links are managed with the existing Admin access flow.">
      <div className="dsp-admin-table-wrap"><table className="dsp-admin-table"><thead><tr><th>Name</th><th>Email</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead><tbody>{links.map((link: { id: string; firstName?: string; lastName?: string; email?: string; signupDate?: string; pending?: boolean; signupLink?: string }) => <tr key={link.id}><td><div className="dsp-admin-table__person"><span className="dsp-admin-avatar dsp-admin-avatar--sm"><ShieldCheck size={15} /></span><div><strong>{`${link.firstName || "Admin"} ${link.lastName || ""}`.trim()}</strong><span>Administrator</span></div></div></td><td>{link.email || "—"}</td><td>{formatAdminDate(link.signupDate)}</td><td><AdminStatus tone={link.pending ? "warning" : "success"}>{link.pending ? "Pending" : "Active"}</AdminStatus></td><td><div className="dsp-admin-table__actions"><AdminButton variant="ghost" onClick={() => { if (link.signupLink) { void navigator.clipboard.writeText(link.signupLink); toast.success("Invitation link copied"); } }}><Copy size={15} />Copy</AdminButton>{link.signupLink && <a className="dsp-admin-button dsp-admin-button--ghost" href={link.signupLink} target="_blank" rel="noreferrer" aria-label={`Open invitation for ${link.email}`}><LinkIcon size={15} /></a>}<AdminButton variant="danger" onClick={() => void remove(link.id)}><Trash2 size={15} /></AdminButton></div></td></tr>)}</tbody></table>{!links.length && <AdminState type="empty" title="No Admin invitations yet" description="Invite another Administrator when your team needs additional platform access." action={<AdminButton icon={Plus} onClick={() => setShowForm(true)}>Invite Admin</AdminButton>} />}</div>
    </AdminSection>
    <AdminModal open={showForm} onClose={() => setShowForm(false)} title="Invite Admin" subtitle="Create a secure invitation using the existing signup flow." size="md" footer={<><AdminButton type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</AdminButton><AdminButton type="submit" form="invite-admin-form" disabled={creating}>{creating ? "Creating…" : "Create invitation"}</AdminButton></>}>
      <form id="invite-admin-form" onSubmit={submit}>
        <div className="dsp-admin-form-grid"><label>First name<input className="dsp-admin-input" value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label><label>Last name<input className="dsp-admin-input" value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label></div>
        <label className="dsp-admin-form-field">Email address<input className="dsp-admin-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="dsp-admin-check"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} required />I have read and agree to the Terms of Use and Privacy Policy.</label>
      </form>
    </AdminModal>
  </AdminPage>;
}

function AdminMetric({ label, value, helper }: { label: string; value: number; helper: string }) {
  return <div className="dsp-admin-metric dsp-admin-metric--violet"><span className="dsp-admin-metric__icon dsp-admin-metric__icon--violet"><ShieldCheck size={19} /></span><span className="dsp-admin-metric__copy"><span className="dsp-admin-metric__label">{label}</span><strong>{value}</strong><small>{helper}</small></span></div>;
}
