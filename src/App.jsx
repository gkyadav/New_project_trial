import { useState } from "react";
import {
  Inbox, Bot, ShieldCheck, BookOpen, Lock, ClipboardList, LogOut,
  CheckCircle2, XCircle, Pencil, CreditCard, GraduationCap,
  LayoutDashboard, AlertTriangle, PlusCircle, Search, Globe2, Send,
  ChevronRight, RefreshCw, ListChecks, Repeat, Sparkles, Circle, Check,
  Users, Truck, Package, Wallet, Headphones
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/* Data model (mock, in-memory only — no persistence, no real backend)     */
/* ---------------------------------------------------------------------- */

const REGIONS = {
  uae: { id: "uae", name: "United Arab Emirates", short: "UAE", color: "#00A19A" },
  ksa: { id: "ksa", name: "Saudi Arabia", short: "KSA", color: "#0B6E4F" },
  egypt: { id: "egypt", name: "Egypt", short: "EGY", color: "#C08A2E" },
};

const CATEGORIES = {
  enquiry: "General enquiry",
  new_request: "New request",
  status: "Status check",
  past_data: "Past data enquiry",
  discrepancy: "Discrepancy resolution",
};

const INITIAL_USERS = [
  { id: "u1", name: "Fatima Al Mazrouei", role: "agent", region: "uae", active: true },
  { id: "u2", name: "Omar Al Qahtani", role: "agent", region: "ksa", active: true },
  { id: "u3", name: "Nour El Sayed", role: "agent", region: "egypt", active: true },
  { id: "u4", name: "Layla Haddad", role: "reviewer", region: null, active: true },
  { id: "u5", name: "Karim Fathy", role: "admin", region: null, active: true },
];

const INITIAL_EMAILS = [
  { id: "e1", region: "uae", from: "a.hassan@buildco.ae", subject: "Invoice #4471 still shows pending", category: "status", body: "We transferred the amount on the 28th but the portal still shows pending. Can you confirm receipt?", receivedAt: "2026-07-01 09:14", status: "unassigned", assignedTo: null, customerId: "c1" },
  { id: "e2", region: "uae", from: "logistics@falconfreight.ae", subject: "Requesting a new vendor account", category: "new_request", body: "We'd like to set up a new vendor account under our parent company for next quarter's contracts.", receivedAt: "2026-07-01 10:02", status: "unassigned", assignedTo: null, customerId: "c2" },
  { id: "e3", region: "uae", from: "finance@dunehotels.ae", subject: "Discrepancy in June statement", category: "discrepancy", body: "Our June statement shows an extra charge of AED 1,200 that we don't recognize. Please advise.", receivedAt: "2026-06-30 16:40", status: "assigned", assignedTo: "u1", customerId: "c3" },
  { id: "e4", region: "ksa", from: "ops@najdtrading.sa", subject: "Where is our March 2025 statement?", category: "past_data", body: "We need a copy of our March 2025 statement for an internal audit. Can this be resent?", receivedAt: "2026-07-02 08:20", status: "unassigned", assignedTo: null, customerId: "c4" },
  { id: "e5", region: "ksa", from: "accounts@haramaingroup.sa", subject: "Payment shows failed but funds left our account", category: "discrepancy", body: "Our bank confirms the transfer went through on the 30th, but your system marked it as failed. Please investigate.", receivedAt: "2026-07-02 09:55", status: "assigned", assignedTo: "u2", customerId: "c5" },
  { id: "e6", region: "ksa", from: "procurement@rubatrade.sa", subject: "General question about renewal terms", category: "enquiry", body: "Could you clarify what changes, if any, apply to our renewal terms this cycle?", receivedAt: "2026-07-02 11:10", status: "unassigned", assignedTo: null, customerId: "c6" },
  { id: "e7", region: "egypt", from: "finance@nilecotton.eg", subject: "New request: split billing across two entities", category: "new_request", body: "We'd like our billing split across our Cairo and Alexandria entities going forward. What's the process?", receivedAt: "2026-07-01 13:30", status: "unassigned", assignedTo: null, customerId: "c7" },
  { id: "e8", region: "egypt", from: "m.tarek@deltaexports.eg", subject: "Status of refund request from May", category: "status", body: "We submitted a refund request in May and haven't heard back. Could you share an update?", receivedAt: "2026-06-29 15:05", status: "assigned", assignedTo: "u3", customerId: "c8" },
  { id: "e9", region: "egypt", from: "admin@cairotex.eg", subject: "Discrepancy: duplicate charge on invoice 9021", category: "discrepancy", body: "Invoice 9021 appears twice on our statement for the same shipment. Please correct.", receivedAt: "2026-07-02 07:44", status: "unassigned", assignedTo: null, customerId: "c9" },
  { id: "e10", region: "uae", from: "ops@zenithlogistics.ae", subject: "Past data enquiry — Q4 2024 breakdown", category: "past_data", body: "Requesting a full transaction breakdown for Q4 2024 for our internal reconciliation.", receivedAt: "2026-06-28 12:00", status: "unassigned", assignedTo: null, customerId: "c10" },
];

const INITIAL_PAYMENTS = [
  { id: "c1", customer: "Buildco LLC", region: "uae", amount: 48500, currency: "AED", status: "pending", updatedAt: "2026-06-28" },
  { id: "c2", customer: "Falcon Freight", region: "uae", amount: 12000, currency: "AED", status: "paid", updatedAt: "2026-06-20" },
  { id: "c3", customer: "Dune Hotels Group", region: "uae", amount: 1200, currency: "AED", status: "disputed", updatedAt: "2026-06-30" },
  { id: "c4", customer: "Najd Trading Co.", region: "ksa", amount: 9800, currency: "SAR", status: "paid", updatedAt: "2026-05-15" },
  { id: "c5", customer: "Haramain Group", region: "ksa", amount: 76200, currency: "SAR", status: "failed", updatedAt: "2026-06-30" },
  { id: "c6", customer: "Ruba Trade Est.", region: "ksa", amount: 5400, currency: "SAR", status: "pending", updatedAt: "2026-07-01" },
  { id: "c7", customer: "Nile Cotton Co.", region: "egypt", amount: 210000, currency: "EGP", status: "paid", updatedAt: "2026-06-25" },
  { id: "c8", customer: "Delta Exports", region: "egypt", amount: 34000, currency: "EGP", status: "disputed", updatedAt: "2026-05-30" },
  { id: "c9", customer: "Cairotex Mills", region: "egypt", amount: 61500, currency: "EGP", status: "pending", updatedAt: "2026-07-02" },
];

const INITIAL_KB = [
  { id: "k1", title: "How to verify a bank transfer reference", region: "all", status: "published", author: "Layla Haddad", updatedAt: "2026-05-10", body: "Ask the customer for the transfer reference and value date, then cross-check it against the settlement report before marking a payment resolved." },
  { id: "k2", title: "UAE VAT invoice discrepancy checklist", region: "uae", status: "published", author: "Fatima Al Mazrouei", updatedAt: "2026-05-22", body: "Confirm the invoice line items, check for duplicate postings, and verify the VAT registration number before escalating a discrepancy." },
  { id: "k3", title: "KSA statement re-issue process", region: "ksa", status: "draft", author: "Omar Al Qahtani", updatedAt: "2026-06-29", body: "For statement re-issue requests older than 12 months, route through the archive team rather than generating from the live ledger." },
  { id: "k4", title: "Egypt split-billing request template", region: "egypt", status: "draft", author: "Nour El Sayed", updatedAt: "2026-07-01", body: "Split billing requests require a signed entity-mapping form before any account changes are made." },
];

const AI_TEMPLATES = {
  enquiry: (r) => `Thank you for reaching out. I've reviewed your question and can confirm the current terms remain unchanged for this cycle in ${r}. I'll follow up separately if anything applies specifically to your account.`,
  new_request: (r) => `Thanks for the request. I've logged this for our ${r} operations team to review. New account/billing changes typically take 3–5 business days once the required documentation is received.`,
  status: (r) => `Thank you for the update. I've checked our records for your account in ${r} and I'm confirming the current status now. I'll follow up with a definitive answer shortly.`,
  past_data: (r) => `Thanks for your patience. I've located the historical records you requested for your ${r} account and will have them compiled and sent over shortly.`,
  discrepancy: (r) => `I understand the concern and I'm sorry for the confusion this has caused. I'm reviewing the transaction in question against our ledger for ${r} now and will confirm the correction or explanation shortly.`,
};

/* BAU: repeatable, enumerable company spend categories. Each stage a person
   ticks today; ticking is the seam automation will later trigger through.
   Approval and payment-release stages keep a permanent second, different-
   person confirmation — that control doesn't go away even once the rest
   of the cycle is automated. */
const BAU_STAGE_TEMPLATE = [
  { id: "s1", name: "Compile cycle data", dual: false },
  { id: "s2", name: "Verify against source records", dual: false },
  { id: "s3", name: "Approve", dual: true },
  { id: "s4", name: "Generate FINDOC", dual: false },
  { id: "s5", name: "Release payment", dual: true },
];

const BAU_PROCESSES = [
  {
    id: "fulfillment_temp_staff", name: "Fulfillment — Temp staff", group: "Fulfillment", icon: Users,
    description: "Monthly payments for temporary fulfillment center staff.",
    stages: BAU_STAGE_TEMPLATE,
  },
  {
    id: "fulfillment_middle_mile", name: "Fulfillment — Middle mile", group: "Fulfillment", icon: Truck,
    description: "Middle-mile transportation costs between fulfillment nodes.",
    stages: BAU_STAGE_TEMPLATE,
  },
  {
    id: "fulfillment_consumables", name: "Fulfillment — Consumables", group: "Fulfillment", icon: Package,
    description: "Recurring consumables spend across fulfillment centers.",
    stages: BAU_STAGE_TEMPLATE,
  },
  {
    id: "logistics_rider_salary", name: "Logistics — Rider salary", group: "Logistics", icon: Wallet,
    description: "Monthly salary payments for delivery riders.",
    stages: BAU_STAGE_TEMPLATE,
  },
  {
    id: "logistics_la_support", name: "Logistics — LA and Support", group: "Logistics", icon: Headphones,
    description: "Last-mile agent and support staff costs.",
    stages: BAU_STAGE_TEMPLATE,
  },
  {
    id: "logistics_consumables", name: "Logistics — Consumables", group: "Logistics", icon: Package,
    description: "Recurring consumables spend across logistics operations.",
    stages: BAU_STAGE_TEMPLATE,
  },
];

const BAU_GROUPS = ["Fulfillment", "Logistics"];

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["agent", "reviewer", "admin"] },
  { id: "bau", label: "BAU", icon: Repeat, roles: ["agent", "reviewer", "admin"] },
  { id: "adhoc", label: "Adhoc", icon: Inbox, roles: ["agent", "reviewer", "admin"] },
  { id: "kb", label: "Knowledge base", icon: BookOpen, roles: ["agent", "reviewer", "admin"] },
  { id: "training", label: "Training & SOPs", icon: GraduationCap, roles: ["agent", "reviewer", "admin"] },
  { id: "admin", label: "Admin", icon: ShieldCheck, roles: ["reviewer", "admin"] },
];

const LOCKED_MODULES = [
  { name: "Customer self-service portal", phase: "Phase 2" },
  { name: "Zero-touch ticket approval & release", phase: "Phase 3" },
  { name: "Fully automated adhoc replies (auto-send)", phase: "Phase 3" },
  { name: "Analytics & reporting", phase: "Phase 2" },
  { name: "Multi-language AI drafting", phase: "Phase 3" },
];

const STATUS_LABEL = {
  unassigned: "Unassigned", assigned: "Assigned", in_review: "In AI review",
  approved: "Sent (mock)", resolved: "Resolved",
  pending: "Pending", paid: "Paid", failed: "Failed", disputed: "Disputed",
  draft: "Draft", published: "Published",
};

/* ---------------------------------------------------------------------- */

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("dashboard");
  const [adhocTab, setAdhocTab] = useState("queue");
  const [kbTab, setKbTab] = useState("cards");
  const [adminTab, setAdminTab] = useState("access");
  const [regionFilter, setRegionFilter] = useState("all");
  const [toast, setToast] = useState(null);

  const [users, setUsers] = useState(INITIAL_USERS);
  const [emails, setEmails] = useState(INITIAL_EMAILS);
  const [drafts, setDrafts] = useState([]);
  const [payments, setPayments] = useState(INITIAL_PAYMENTS);
  const [kbCards, setKbCards] = useState(INITIAL_KB);
  const [bauState, setBauState] = useState(() => {
    const init = {};
    BAU_PROCESSES.forEach(p => { init[p.id] = {}; });
    return init;
  });
  const [auditLog, setAuditLog] = useState([
    { id: "a0", at: "2026-06-15 08:00", actor: "System", action: "seed", detail: "Prototype data initialized", region: "-" },
  ]);
  const [newCard, setNewCard] = useState({ title: "", body: "", region: "all" });
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [auditFilters, setAuditFilters] = useState({ actor: "all", action: "all", region: "all" });
  const [genLoading, setGenLoading] = useState(null);

  function pushToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  function addAudit(action, detail, region) {
    setAuditLog(prev => [
      { id: "a" + (prev.length + 1) + "-" + Date.now(), at: new Date().toISOString().slice(0, 16).replace("T", " "), actor: currentUser.name, action, detail, region: region || "-" },
      ...prev,
    ]);
  }

  function login(user) {
    setCurrentUser(user);
    setView("dashboard");
    setRegionFilter(user.role === "agent" ? user.region : "all");
  }

  function logout() { setCurrentUser(null); }

  /* ---- adhoc: email queue actions ---- */
  function assignEmail(email) {
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, status: "assigned", assignedTo: currentUser.id } : e));
    addAudit("Assign email", `${email.subject} assigned to ${currentUser.name}`, email.region);
  }

  function generateDraft(email) {
    setGenLoading(email.id);
    setTimeout(() => {
      const text = AI_TEMPLATES[email.category](REGIONS[email.region].short);
      setDrafts(prev => [...prev, {
        id: "d" + Date.now(), emailId: email.id, text, status: "pending",
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        reviewerNote: "", goodExample: false,
      }]);
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, status: "in_review" } : e));
      addAudit("Generate AI draft", `Draft created for "${email.subject}"`, email.region);
      setGenLoading(null);
      pushToast("AI draft generated — sent to review queue");
    }, 700);
  }

  /* ---- adhoc: review queue actions ---- */
  function approveDraft(draft, textOverride) {
    const email = emails.find(e => e.id === draft.emailId);
    setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, status: "approved", text: textOverride || d.text } : d));
    setEmails(prev => prev.map(e => e.id === draft.emailId ? { ...e, status: "approved" } : e));
    addAudit("Approve AI draft", `Reply to "${email.subject}" approved and marked sent (mock — no real email sent)`, email.region);
    pushToast("Draft approved — marked as sent (mock)");
    setEditingDraftId(null);
  }

  function rejectDraft(draft, note) {
    const email = emails.find(e => e.id === draft.emailId);
    setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, status: "rejected", reviewerNote: note } : d));
    setEmails(prev => prev.map(e => e.id === draft.emailId ? { ...e, status: "assigned" } : e));
    addAudit("Reject AI draft", `Draft for "${email.subject}" rejected: ${note || "no comment"}`, email.region);
    pushToast("Draft rejected — returned to agent");
    setRejectingId(null);
    setRejectNote("");
  }

  function toggleGoodExample(draft) {
    setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, goodExample: !d.goodExample } : d));
    const email = emails.find(e => e.id === draft.emailId);
    addAudit("Curate training example", `${!draft.goodExample ? "Marked" : "Unmarked"} reply to "${email?.subject}" as a good example`, email?.region);
  }

  /* ---- payment actions (admin only, outside BAU checklist — direct override) ---- */
  function changePaymentStatus(payment, newStatus) {
    setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: newStatus, updatedAt: new Date().toISOString().slice(0, 10) } : p));
    addAudit("Change payment status", `${payment.customer}: ${STATUS_LABEL[payment.status]} → ${STATUS_LABEL[newStatus]} (mock, manual)`, payment.region);
    pushToast("Payment status updated (mock)");
  }

  /* ---- BAU checkpoint actions ---- */
  function checkStage(processId, stage) {
    setBauState(prev => {
      const proc = prev[processId] || {};
      const existing = proc[stage.id] || { confirmations: [] };
      if (existing.confirmations.includes(currentUser.id)) return prev;
      const confirmations = [...existing.confirmations, currentUser.id];
      return { ...prev, [processId]: { ...proc, [stage.id]: { confirmations } } };
    });
    const needed = stage.dual ? 2 : 1;
    const already = (bauState[processId]?.[stage.id]?.confirmations || []).length;
    const willComplete = already + 1 >= needed;
    const process = BAU_PROCESSES.find(p => p.id === processId);
    addAudit(
      stage.dual ? "BAU dual-control confirmation" : "BAU checkpoint completed",
      `${process.name} — "${stage.name}"${willComplete ? " (stage complete)" : " (awaiting second approver)"}`,
      "-"
    );
    pushToast(willComplete ? `"${stage.name}" complete` : `Confirmed — waiting on a second approver for "${stage.name}"`);
  }

  function resetCycle(processId) {
    setBauState(prev => ({ ...prev, [processId]: {} }));
    const process = BAU_PROCESSES.find(p => p.id === processId);
    addAudit("Start new BAU cycle", `${process.name} reset for a new cycle`, "-");
    pushToast(`New cycle started for ${process.name}`);
  }

  /* ---- knowledge base actions ---- */
  function createCard() {
    if (!newCard.title.trim() || !newCard.body.trim()) { pushToast("Title and body are required"); return; }
    const card = { id: "k" + Date.now(), title: newCard.title, body: newCard.body, region: newCard.region, status: "draft", author: currentUser.name, updatedAt: new Date().toISOString().slice(0, 10) };
    setKbCards(prev => [card, ...prev]);
    addAudit("Create knowledge card", `Draft created: "${card.title}"`, card.region);
    setNewCard({ title: "", body: "", region: "all" });
    pushToast("Draft card saved");
  }

  function publishCard(card) {
    setKbCards(prev => prev.map(c => c.id === card.id ? { ...c, status: "published", updatedAt: new Date().toISOString().slice(0, 10) } : c));
    addAudit("Publish knowledge card", `Published: "${card.title}"`, card.region);
    pushToast("Card published to knowledge base");
  }

  /* ---- access control actions ---- */
  function toggleUserActive(user) {
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: !u.active } : u));
    addAudit("Toggle user access", `${user.name} set to ${!user.active ? "active" : "inactive"}`, user.region ? REGIONS[user.region].short : "-");
    pushToast(`${user.name} is now ${!user.active ? "active" : "inactive"}`);
  }

  if (!currentUser) return <LoginScreen onLogin={login} defaultUser={users.find(u => u.id === "u5")} />;

  const visibleNav = NAV.filter(n => n.roles.includes(currentUser.role));
  const scopedEmails = currentUser.role === "agent"
    ? emails.filter(e => e.region === currentUser.region)
    : (regionFilter === "all" ? emails : emails.filter(e => e.region === regionFilter));
  const scopedPayments = currentUser.role === "agent"
    ? payments.filter(p => p.region === currentUser.region)
    : (regionFilter === "all" ? payments : payments.filter(p => p.region === regionFilter));

  return (
    <div style={styles.appShell}>
      <style>{CSS}</style>
      {toast && <div className="mo-toast">{toast}</div>}

      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.sidebarNoonBadge}>noon</div>
          <div>
            <div style={styles.brandSub}>Ops console</div>
          </div>
        </div>

        <nav style={{ marginTop: 28 }}>
          {visibleNav.map(item => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button key={item.id} className="mo-navitem" style={active ? styles.navItemActive : styles.navItem} onClick={() => setView(item.id)}>
                <Icon size={17} style={{ marginRight: 10, flexShrink: 0 }} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: 20 }}>
          <div style={styles.lockedHeading}>Coming later</div>
          {LOCKED_MODULES.map(m => (
            <button key={m.name} className="mo-locked" onClick={() => pushToast(`"${m.name}" is planned for ${m.phase} — not built in this prototype`)}>
              <Lock size={13} style={{ marginRight: 8, flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: "left" }}>{m.name}</span>
              <span style={styles.phaseTag}>{m.phase}</span>
            </button>
          ))}
        </div>

        <div style={styles.regionLegend}>
          <div style={{ fontSize: 11, color: "#86d8ff", marginBottom: 6, letterSpacing: "0.14em", fontWeight: 900, textTransform: "uppercase" }}>Regions</div>
          {Object.values(REGIONS).map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", fontSize: 12.5, fontWeight: 700, marginBottom: 3, color: "#d5e2f7" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, marginRight: 8, flexShrink: 0 }} />
              {r.name}
            </div>
          ))}
        </div>
      </aside>

      <div style={styles.main}>
        <header style={styles.header}>
          <div>
            <div style={styles.headerTitle}>{NAV.find(n => n.id === view)?.label || "Dashboard"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--mo-ink)" }}>{currentUser.name}</div>
              <div style={{ fontSize: 12, color: "var(--mo-muted)", textTransform: "capitalize" }}>
                {currentUser.role}{currentUser.region ? ` · ${REGIONS[currentUser.region].short}` : ""}
              </div>
            </div>
            <button className="mo-btn" onClick={logout}><LogOut size={14} style={{ marginRight: 6 }} />Switch user</button>
          </div>
        </header>
        <div style={styles.headerAccent} />

        <main style={styles.content}>
          {view === "dashboard" && (
            <Dashboard emails={emails} drafts={drafts} payments={payments} kbCards={kbCards} bauState={bauState}
              onNavigate={setView} onLockedClick={m => pushToast(`"${m}" is planned for a later phase — not built in this prototype`)} />
          )}

          {view === "bau" && (
            <BauConsole bauState={bauState} currentUser={currentUser} onCheck={checkStage} onReset={resetCycle} />
          )}

          {view === "adhoc" && (
            <div>
              <SubTabs
                tabs={[{ id: "queue", label: "Inbox" }, ...(currentUser.role !== "agent" ? [{ id: "review", label: "Review queue" }] : [])]}
                active={adhocTab} onChange={setAdhocTab}
                trailing={currentUser.role !== "agent" && (
                  <RegionSelect value={regionFilter} onChange={setRegionFilter} allowAll />
                )}
              />
              {adhocTab === "queue" && (
                <EmailQueue emails={scopedEmails} currentUser={currentUser} genLoading={genLoading} onAssign={assignEmail} onGenerate={generateDraft} drafts={drafts} />
              )}
              {adhocTab === "review" && currentUser.role !== "agent" && (
                <ReviewQueue
                  drafts={drafts} emails={emails} regionFilter={regionFilter}
                  rejectingId={rejectingId} rejectNote={rejectNote} setRejectingId={setRejectingId} setRejectNote={setRejectNote}
                  editingDraftId={editingDraftId} editingText={editingText} setEditingDraftId={setEditingDraftId} setEditingText={setEditingText}
                  onApprove={approveDraft} onReject={rejectDraft} onToggleGoodExample={toggleGoodExample}
                />
              )}
            </div>
          )}

          {view === "kb" && (
            <div>
              <SubTabs tabs={[{ id: "cards", label: "Knowledge cards" }, { id: "published", label: "Published KB" }, { id: "payments", label: "Payment status" }]} active={kbTab} onChange={setKbTab} />
              {kbTab === "cards" && <KnowledgeCards cards={kbCards} currentUser={currentUser} newCard={newCard} setNewCard={setNewCard} onCreate={createCard} onPublish={publishCard} />}
              {kbTab === "published" && <PublishedKB cards={kbCards} />}
              {kbTab === "payments" && <PaymentStatus payments={scopedPayments} currentUser={currentUser} onChange={changePaymentStatus} />}
            </div>
          )}

          {view === "training" && <Training />}

          {view === "admin" && (
            <div>
              <SubTabs
                tabs={[...(currentUser.role === "admin" ? [{ id: "access", label: "Access control" }] : []), { id: "audit", label: "Audit log" }]}
                active={adminTab} onChange={setAdminTab}
              />
              {adminTab === "access" && currentUser.role === "admin" && <AccessControl users={users} onToggle={toggleUserActive} />}
              {adminTab === "audit" && <AuditLogView entries={auditLog} users={users} filters={auditFilters} setFilters={setAuditFilters} />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Screens                                                                  */
/* ---------------------------------------------------------------------- */

const LOGIN_FEATURES = [
  { cls: "blue", tag: "EQ", title: "Regional Email Queue", sub: "UAE, KSA and Egypt inboxes in one place" },
  { cls: "green", tag: "AI", title: "AI Review Queue", sub: "AI drafts reviewed before they go out" },
  { cls: "orange", tag: "BAU", title: "BAU Checklists", sub: "Fulfillment and logistics runbooks" },
  { cls: "purple", tag: "KB", title: "Knowledge Base", sub: "Curated cards and published answers" },
  { cls: "cyan", tag: "AC", title: "Access Control", sub: "Roles and regional permissions" },
  { cls: "pink", tag: "AL", title: "Audit Log", sub: "Every action tracked and traceable" },
];

function LoginScreen({ onLogin, defaultUser }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    if (username === "admin123" && password === "admin123") {
      setError("");
      onLogin(defaultUser);
    } else {
      setError("Incorrect username or password.");
    }
  }

  return (
    <main className="portal-login">
      <style>{CSS}</style>
      <img className="portal-bg" src="/login-hero.png" alt="" />
      <div className="portal-overlay" />

      <header className="portal-header">
        <div className="brand-lockup portal-brand">
          <span className="noon-mark">noon</span>
          <div>
            <strong>noon Ops Console</strong>
            <span>BAU &amp; Adhoc Operations</span>
          </div>
        </div>

        <div className="region-pill" aria-label="Supported regions">
          <span><b>AE</b> UAE</span>
          <i />
          <span><b>SA</b> KSA</span>
          <i />
          <span><b>EG</b> EGYPT</span>
        </div>
      </header>

      <section className="portal-copy">
        <h1>One Console for BAU and Adhoc Operations</h1>
        <p>Regional email queues, AI-assisted replies, BAU checklists, knowledge base, access control and audit — unified across UAE, KSA and Egypt.</p>

        <div className="feature-grid">
          {LOGIN_FEATURES.map(f => (
            <article key={f.tag}>
              <span className={`feature-icon ${f.cls}`}>{f.tag}</span>
              <strong>{f.title}</strong>
              <small>{f.sub}</small>
            </article>
          ))}
        </div>

        <div className="trust-bar">
          <strong>Secure. Reliable. Compliant.</strong>
          <span>Enterprise Security</span>
          <span>ISO 27001 Compliant</span>
          <span>Your Data is Protected</span>
        </div>
      </section>

      <section className="portal-card-wrap">
        <div className="portal-card">
          <span className="noon-mark card-mark">noon</span>
          <h2>noon Ops Console</h2>
          <p className="portal-card-subtitle">Secure Portal Access</p>
          <div className="card-rule" />
          <h3>Welcome back!</h3>
          <p className="intro">Login to continue to your operations workspace.</p>

          {error && <div className="portal-alert">{error}</div>}

          <form onSubmit={submit} className="portal-form">
            <label htmlFor="login-user">Username</label>
            <div className="input-shell">
              <span>ID</span>
              <input id="login-user" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" placeholder="Enter your username" required />
            </div>

            <label htmlFor="login-pass">Password</label>
            <div className="input-shell">
              <span>PW</span>
              <input id="login-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password" required />
            </div>
            <a className="forgot-link" href="#" onClick={e => e.preventDefault()}>Forgot password?</a>

            <button type="submit">Login to Console <span>-&gt;</span></button>
          </form>

          <div className="or-divider"><span>or</span></div>
          <button className="sso-button" type="button" onClick={() => setError("SSO is not available in this prototype.")}>Login with SSO</button>
          <p className="support-copy">Need help? <a href="#" onClick={e => e.preventDefault()}>Contact support</a></p>

          <details className="demo-logins">
            <summary>Demo account</summary>
            <div className="demo-grid">
              <div>
                <strong>Admin</strong>
                <span>admin123</span>
                <code>admin123</code>
              </div>
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}

function Dashboard({ emails, drafts, payments, kbCards, bauState, onNavigate, onLockedClick }) {
  const openEmails = emails.filter(e => !["approved", "resolved"].includes(e.status)).length;
  const pendingReviews = drafts.filter(d => d.status === "pending").length;
  const publishedCount = kbCards.filter(c => c.status === "published").length;
  const curatedCount = drafts.filter(d => d.goodExample).length;

  const bauProgress = BAU_PROCESSES.map(p => {
    const total = p.stages.length;
    const done = p.stages.filter(s => {
      const need = s.dual ? 2 : 1;
      return (bauState[p.id]?.[s.id]?.confirmations || []).length >= need;
    }).length;
    return { ...p, done, total };
  });

  return (
    <div>
      <p style={{ fontSize: 14, color: "var(--mo-muted)", margin: "0 0 20px", maxWidth: 640 }}>
        Everything your team touches day to day lives in two places: <strong style={{ color: "var(--mo-ink)" }}>BAU</strong> for the recurring
        company processes, and <strong style={{ color: "var(--mo-ink)" }}>Adhoc</strong> for customer enquiries that need judgment. Knowledge base and
        training keep both grounded in one shared source of truth.
      </p>

      <div style={styles.grid4}>
        <button className="mo-card mo-clickable" style={{ borderTop: "3px solid #6C4FE0" }} onClick={() => onNavigate("bau")}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: "#6C4FE01A", display: "flex", alignItems: "center", justifyContent: "center" }}><Repeat size={14} color="#6C4FE0" /></span>
            <span style={{ fontSize: 12.5, color: "var(--mo-muted)" }}>BAU cycles in progress</span>
          </div>
          <div style={{ fontSize: 26, fontFamily: "var(--mo-display)", color: "var(--mo-ink)" }}>{bauProgress.filter(p => p.done > 0 && p.done < p.total).length}</div>
          <div style={{ fontSize: 12, color: "var(--mo-muted)" }}>of {BAU_PROCESSES.length} processes</div>
        </button>
        <button className="mo-card mo-clickable" style={{ borderTop: "3px solid #FF6B5E" }} onClick={() => onNavigate("adhoc")}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: "#FF6B5E1A", display: "flex", alignItems: "center", justifyContent: "center" }}><Inbox size={14} color="#FF6B5E" /></span>
            <span style={{ fontSize: 12.5, color: "var(--mo-muted)" }}>Open adhoc emails</span>
          </div>
          <div style={{ fontSize: 26, fontFamily: "var(--mo-display)", color: "var(--mo-ink)" }}>{openEmails}</div>
          <div style={{ fontSize: 12, color: "var(--mo-muted)" }}>across all regions</div>
        </button>
        <button className="mo-card mo-clickable" style={{ borderTop: "3px solid #8B5CF6" }} onClick={() => onNavigate("adhoc")}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: "#8B5CF61A", display: "flex", alignItems: "center", justifyContent: "center" }}><Bot size={14} color="#8B5CF6" /></span>
            <span style={{ fontSize: 12.5, color: "var(--mo-muted)" }}>Pending AI review</span>
          </div>
          <div style={{ fontSize: 26, fontFamily: "var(--mo-display)", color: "var(--mo-ink)" }}>{pendingReviews}</div>
          <div style={{ fontSize: 12, color: "var(--mo-muted)" }}>drafts awaiting a decision</div>
        </button>
        <button className="mo-card mo-clickable" style={{ borderTop: "3px solid #00B8A9" }} onClick={() => onNavigate("kb")}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: "#00B8A91A", display: "flex", alignItems: "center", justifyContent: "center" }}><BookOpen size={14} color="#00B8A9" /></span>
            <span style={{ fontSize: 12.5, color: "var(--mo-muted)" }}>Published knowledge cards</span>
          </div>
          <div style={{ fontSize: 26, fontFamily: "var(--mo-display)", color: "var(--mo-ink)" }}>{publishedCount}</div>
          <div style={{ fontSize: 12, color: "var(--mo-muted)" }}>{curatedCount} curated reply examples too</div>
        </button>
      </div>

      <div style={{ marginTop: 24, marginBottom: 10, fontSize: 12.5, color: "var(--mo-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>This month's BAU cycles</div>
      <div style={styles.grid4}>
        {bauProgress.map(p => {
          const tint = p.group === "Fulfillment" ? "#6C4FE0" : "#00B8A9";
          return (
            <button key={p.id} className="mo-card mo-clickable" style={{ borderTop: `3px solid ${tint}` }} onClick={() => onNavigate("bau")}>
              <div style={{ fontSize: 10.5, color: tint, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>{p.group}</div>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--mo-ink)", marginBottom: 8 }}>{p.name.split("— ")[1] || p.name}</div>
              <ProgressBar done={p.done} total={p.total} color={tint} />
              <div style={{ fontSize: 11.5, color: "var(--mo-muted)", marginTop: 6 }}>{p.done} of {p.total} stages complete</div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 24, marginBottom: 10, fontSize: 12.5, color: "var(--mo-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Not part of this prototype</div>
      <div style={styles.grid4}>
        {LOCKED_MODULES.map(m => (
          <button key={m.name} className="mo-lockedtile" onClick={() => onLockedClick(m.name)}>
            <Lock size={16} style={{ marginBottom: 8, color: "var(--mo-muted)" }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mo-ink)" }}>{m.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--mo-muted)", marginTop: 4 }}>{m.phase}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function BauConsole({ bauState, currentUser, onCheck, onReset }) {
  const [expanded, setExpanded] = useState(null);
  const palette = { Fulfillment: "#6C4FE0", Logistics: "#00B8A9" };
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--mo-muted)", marginBottom: 16, maxWidth: 640 }}>
        Recurring spend categories your team runs every cycle. Tap a card to open its checklist.
      </p>
      {BAU_GROUPS.map(group => (
        <div key={group} style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: palette[group] }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--mo-ink)", textTransform: "uppercase", letterSpacing: 0.5 }}>{group}</span>
          </div>
          <div style={styles.grid3}>
            {BAU_PROCESSES.filter(p => p.group === group).map(p => {
              const Icon = p.icon;
              const tint = palette[group];
              const total = p.stages.length;
              const done = p.stages.filter(s => {
                const need = s.dual ? 2 : 1;
                return (bauState[p.id]?.[s.id]?.confirmations || []).length >= need;
              }).length;
              const complete = done === total;
              const isOpen = expanded === p.id;
              return (
                <div key={p.id} className="mo-card" style={{ borderLeft: `3px solid ${tint}` }}>
                  <button className="mo-clickable" style={{ background: "none", border: "none", padding: 0, boxShadow: "none" }} onClick={() => setExpanded(isOpen ? null : p.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ ...styles.bauIconWrap, background: tint + "1A" }}><Icon size={16} color={tint} /></div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--mo-ink)" }}>{p.name.split("— ")[1] || p.name}</div>
                    </div>
                    <div style={{ marginTop: 12 }}><ProgressBar done={done} total={total} color={tint} /></div>
                    <div style={{ fontSize: 11.5, color: "var(--mo-muted)", marginTop: 6 }}>{done} of {total} stages complete</div>
                  </button>

                  {isOpen && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--mo-border)" }}>
                      <div style={{ fontSize: 12.5, color: "var(--mo-muted)", marginBottom: 10 }}>{p.description}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {p.stages.map(s => {
                          const confirmations = bauState[p.id]?.[s.id]?.confirmations || [];
                          const need = s.dual ? 2 : 1;
                          const isDone = confirmations.length >= need;
                          const iHaveConfirmed = confirmations.includes(currentUser.id);
                          return (
                            <div key={s.id} className="mo-stagerow">
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span className={`mo-stage-icon ${isDone ? "mo-stage-done" : ""}`}>{isDone ? <Check size={12} /> : <Circle size={10} />}</span>
                                <span style={{ fontSize: 13, color: isDone ? "var(--mo-muted)" : "var(--mo-ink)", textDecoration: isDone ? "line-through" : "none" }}>{s.name}</span>
                                {s.dual && <span className="mo-pill mo-pill-warn" style={{ marginLeft: 4 }}>Two-person check</span>}
                              </div>
                              {!isDone && (
                                iHaveConfirmed
                                  ? <span style={{ fontSize: 12, color: "var(--mo-muted)" }}>Waiting on a second approver</span>
                                  : <button className="mo-btn mo-btn-sm" onClick={() => onCheck(p.id, s)}>{s.dual && confirmations.length === 1 ? "Confirm (2nd approver)" : "Mark done"}</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {complete && currentUser.role === "admin" && (
                        <button className="mo-btn mo-btn-sm" style={{ marginTop: 10 }} onClick={() => onReset(p.id)}>Start new cycle</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailQueue({ emails, currentUser, genLoading, onAssign, onGenerate, drafts }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--mo-muted)", margin: "14px 0" }}>
        {currentUser.role === "agent"
          ? `Showing enquiries for ${REGIONS[currentUser.region].name} only.`
          : "Showing all regions unless filtered above. Read access only — assignment is performed by the owning region's agent."}
      </p>
      <div className="mo-table-wrap">
        <table className="mo-table">
          <thead>
            <tr><th>Region</th><th>From</th><th>Subject</th><th>Category</th><th>Received</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {emails.map(e => (
              <tr key={e.id}>
                <td><RegionDot region={e.region} /></td>
                <td className="mo-mono">{e.from}</td>
                <td>
                  <div style={{ fontWeight: 600, color: "var(--mo-ink)" }}>{e.subject}</div>
                  <div style={{ fontSize: 12, color: "var(--mo-muted)", maxWidth: 340 }}>{e.body}</div>
                </td>
                <td><span className="mo-pill mo-pill-neutral">{CATEGORIES[e.category]}</span></td>
                <td className="mo-mono" style={{ fontSize: 12 }}>{e.receivedAt}</td>
                <td><StatusPill status={e.status} /></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {e.status === "unassigned" && currentUser.role !== "reviewer" && (
                    <button className="mo-btn mo-btn-sm" onClick={() => onAssign(e)}>Assign to me</button>
                  )}
                  {e.status === "assigned" && e.assignedTo === currentUser.id && (
                    <button className="mo-btn mo-btn-sm" disabled={genLoading === e.id} onClick={() => onGenerate(e)}>
                      {genLoading === e.id ? <><RefreshCw size={12} className="mo-spin" style={{ marginRight: 6 }} />Generating…</> : <><Bot size={12} style={{ marginRight: 6 }} />Generate AI draft</>}
                    </button>
                  )}
                  {e.status === "in_review" && <span style={{ fontSize: 12, color: "var(--mo-muted)" }}>Awaiting reviewer</span>}
                  {e.status === "approved" && <span style={{ fontSize: 12, color: "var(--mo-success)" }}>Marked sent (mock)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewQueue({ drafts, emails, regionFilter, rejectingId, rejectNote, setRejectingId, setRejectNote, editingDraftId, editingText, setEditingDraftId, setEditingText, onApprove, onReject, onToggleGoodExample }) {
  const withEmail = drafts.map(d => ({ ...d, email: emails.find(e => e.id === d.emailId) }))
    .filter(d => regionFilter === "all" || d.email.region === regionFilter);
  const pending = withEmail.filter(d => d.status === "pending");
  const decided = withEmail.filter(d => d.status !== "pending").slice(0, 8);

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--mo-muted)", margin: "14px 0" }}>
        Every AI-drafted reply stops here before anything is considered "sent." Approval only marks the reply as sent (mock) — nothing in this
        prototype delivers real email. Marking a good reply as an example is how the team starts curating what the AI should learn from over time.
      </p>
      {pending.length === 0 && <EmptyState text="No drafts waiting on review right now." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pending.map(d => (
          <div key={d.id} className="mo-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <RegionDot region={d.email.region} />
                  <span style={{ fontWeight: 600, fontSize: 14, color: "var(--mo-ink)" }}>{d.email.subject}</span>
                </div>
                <div className="mo-mono" style={{ fontSize: 12, color: "var(--mo-muted)" }}>{d.email.from} · drafted {d.createdAt}</div>
              </div>
              <span className="mo-pill mo-pill-neutral">{CATEGORIES[d.email.category]}</span>
            </div>

            <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--mo-surface-alt)", borderRadius: 8, fontSize: 13.5, color: "var(--mo-ink)" }}>
              {editingDraftId === d.id ? (
                <textarea className="mo-textarea" rows={4} value={editingText} onChange={ev => setEditingText(ev.target.value)} />
              ) : d.text}
            </div>

            {rejectingId === d.id && (
              <div style={{ marginTop: 10 }}>
                <textarea className="mo-textarea" rows={2} placeholder="Why is this being rejected? (visible to the agent)" value={rejectNote} onChange={ev => setRejectNote(ev.target.value)} />
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {editingDraftId === d.id ? (
                <>
                  <button className="mo-btn mo-btn-sm mo-btn-primary" onClick={() => onApprove(d, editingText)}><CheckCircle2 size={13} style={{ marginRight: 6 }} />Save & approve</button>
                  <button className="mo-btn mo-btn-sm" onClick={() => setEditingDraftId(null)}>Cancel edit</button>
                </>
              ) : rejectingId === d.id ? (
                <>
                  <button className="mo-btn mo-btn-sm mo-btn-danger" onClick={() => onReject(d, rejectNote)}><XCircle size={13} style={{ marginRight: 6 }} />Confirm reject</button>
                  <button className="mo-btn mo-btn-sm" onClick={() => setRejectingId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="mo-btn mo-btn-sm mo-btn-primary" onClick={() => onApprove(d)}><CheckCircle2 size={13} style={{ marginRight: 6 }} />Approve</button>
                  <button className="mo-btn mo-btn-sm" onClick={() => { setEditingDraftId(d.id); setEditingText(d.text); }}><Pencil size={13} style={{ marginRight: 6 }} />Edit</button>
                  <button className="mo-btn mo-btn-sm mo-btn-danger" onClick={() => setRejectingId(d.id)}><XCircle size={13} style={{ marginRight: 6 }} />Reject</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {decided.length > 0 && (
        <>
          <div style={{ marginTop: 24, marginBottom: 10, fontSize: 12.5, color: "var(--mo-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Recently decided</div>
          <div className="mo-table-wrap">
            <table className="mo-table">
              <thead><tr><th>Region</th><th>Subject</th><th>Outcome</th><th>Note</th><th>Example</th></tr></thead>
              <tbody>
                {decided.map(d => (
                  <tr key={d.id}>
                    <td><RegionDot region={d.email.region} /></td>
                    <td>{d.email.subject}</td>
                    <td><StatusPill status={d.status === "approved" ? "approved" : "failed"} label={d.status === "approved" ? "Approved" : "Rejected"} /></td>
                    <td style={{ fontSize: 12.5, color: "var(--mo-muted)" }}>{d.reviewerNote || "—"}</td>
                    <td>
                      {d.status === "approved" ? (
                        <button className={`mo-btn mo-btn-sm ${d.goodExample ? "mo-btn-primary" : ""}`} onClick={() => onToggleGoodExample(d)}>
                          <Sparkles size={12} style={{ marginRight: 6 }} />{d.goodExample ? "Curated" : "Mark as example"}
                        </button>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function PaymentStatus({ payments, currentUser, onChange }) {
  const canEdit = currentUser.role === "admin";
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--mo-muted)", margin: "14px 0" }}>
        Mock workflow only — not connected to a real payment provider. Ordinary releases happen through the BAU checklist with its own two-person
        confirmation; this table is a direct admin override for demo purposes only.
      </p>
      <div className="mo-table-wrap">
        <table className="mo-table">
          <thead><tr><th>Region</th><th>Customer</th><th>Amount</th><th>Status</th><th>Updated</th>{canEdit && <th></th>}</tr></thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td><RegionDot region={p.region} /></td>
                <td style={{ fontWeight: 600, color: "var(--mo-ink)" }}>{p.customer}</td>
                <td className="mo-mono">{p.amount.toLocaleString()} {p.currency}</td>
                <td><StatusPill status={p.status} /></td>
                <td className="mo-mono" style={{ fontSize: 12 }}>{p.updatedAt}</td>
                {canEdit && (
                  <td>
                    <select className="mo-select" value={p.status} onChange={ev => onChange(p, ev.target.value)}>
                      {["pending", "paid", "failed", "disputed"].map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KnowledgeCards({ cards, currentUser, newCard, setNewCard, onCreate, onPublish }) {
  const canPublish = currentUser.role === "admin";
  return (
    <div>
      <div className="mo-card" style={{ marginBottom: 18, marginTop: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 10, color: "var(--mo-ink)" }}>New draft card</div>
        <input className="mo-input" placeholder="Card title" value={newCard.title} onChange={e => setNewCard({ ...newCard, title: e.target.value })} style={{ marginBottom: 8 }} />
        <textarea className="mo-textarea" rows={3} placeholder="Card content — what should an agent know?" value={newCard.body} onChange={e => setNewCard({ ...newCard, body: e.target.value })} style={{ marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select className="mo-select" value={newCard.region} onChange={e => setNewCard({ ...newCard, region: e.target.value })}>
            <option value="all">All regions</option>
            {Object.values(REGIONS).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button className="mo-btn mo-btn-primary mo-btn-sm" onClick={onCreate}><PlusCircle size={13} style={{ marginRight: 6 }} />Save as draft</button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cards.map(c => (
          <div key={c.id} className="mo-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  {c.region === "all" ? <Globe2 size={13} color="var(--mo-muted)" /> : <RegionDot region={c.region} />}
                  <span style={{ fontWeight: 600, color: "var(--mo-ink)" }}>{c.title}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--mo-muted)", maxWidth: 520 }}>{c.body}</div>
                <div style={{ fontSize: 11.5, color: "var(--mo-muted)", marginTop: 6 }}>By {c.author} · updated {c.updatedAt}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <StatusPill status={c.status} />
                {c.status === "draft" && canPublish && (
                  <button className="mo-btn mo-btn-sm mo-btn-primary" onClick={() => onPublish(c)}><Send size={12} style={{ marginRight: 6 }} />Publish</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PublishedKB({ cards }) {
  const [q, setQ] = useState("");
  const published = cards.filter(c => c.status === "published" && (c.title + c.body).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div style={{ position: "relative", margin: "14px 0 16px", maxWidth: 340 }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--mo-muted)" }} />
        <input className="mo-input" style={{ paddingLeft: 30 }} placeholder="Search the knowledge base" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {published.length === 0 && <EmptyState text="No published cards match your search." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {published.map(c => (
          <div key={c.id} className="mo-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              {c.region === "all" ? <Globe2 size={13} color="var(--mo-muted)" /> : <RegionDot region={c.region} />}
              <span style={{ fontWeight: 600, color: "var(--mo-ink)" }}>{c.title}</span>
            </div>
            <div style={{ fontSize: 13.5, color: "var(--mo-ink)" }}>{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Training() {
  const topics = ["Regional compliance basics", "Handling discrepancy escalations", "Working the AI review queue", "BAU checklist walkthroughs"];
  return (
    <div>
      <div className="mo-card" style={{ margin: "14px 0 16px", background: "var(--mo-locked-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Lock size={14} color="var(--mo-muted)" />
          <span style={{ fontWeight: 600, color: "var(--mo-ink)" }}>Structured training is a placeholder in this prototype</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--mo-muted)", margin: 0 }}>
          The goal is a single place a new team member can learn the SOPs without asking around — built from knowledge cards and real email history.
          Lessons, quizzes, and certification tracking are planned for Phase 2; the topics below show intended scope only.
        </p>
      </div>
      <div style={styles.grid4}>
        {topics.map(t => (
          <div key={t} className="mo-lockedtile" style={{ cursor: "default" }}>
            <GraduationCap size={16} style={{ marginBottom: 8, color: "var(--mo-muted)" }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mo-ink)" }}>{t}</div>
            <div style={{ fontSize: 11.5, color: "var(--mo-muted)", marginTop: 4 }}>Phase 2</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccessControl({ users, onToggle }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--mo-muted)", margin: "14px 0" }}>
        Roles and permissions are fixed rules, not editable at runtime — this keeps access control predictable and auditable. You can only activate or deactivate accounts here.
      </p>
      <div className="mo-table-wrap" style={{ marginBottom: 24 }}>
        <table className="mo-table">
          <thead><tr><th>Name</th><th>Role</th><th>Region</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600, color: "var(--mo-ink)" }}>{u.name}</td>
                <td style={{ textTransform: "capitalize" }}>{u.role}</td>
                <td>{u.region ? <RegionDot region={u.region} /> : <span style={{ color: "var(--mo-muted)", fontSize: 12.5 }}>All regions</span>}</td>
                <td><span className={`mo-pill ${u.active ? "mo-pill-success" : "mo-pill-danger"}`}>{u.active ? "Active" : "Inactive"}</span></td>
                <td><button className="mo-btn mo-btn-sm" onClick={() => onToggle(u)}>{u.active ? "Deactivate" : "Activate"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12.5, color: "var(--mo-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Permission matrix (reference — not editable)</div>
      <div className="mo-table-wrap">
        <table className="mo-table">
          <thead><tr><th>Module</th><th>Agent</th><th>Reviewer</th><th>Admin</th></tr></thead>
          <tbody>
            {[
              ["BAU checklist", "Tick own-team stages", "Tick stages, second approver", "Tick stages, second approver, reset cycle"],
              ["Adhoc inbox", "Own region, assign & draft", "All regions, view only", "All regions, view only"],
              ["AI review queue", "No access", "Approve / edit / reject", "Approve / edit / reject"],
              ["Payment status", "Own region, view only", "All regions, view only", "All regions, edit"],
              ["Knowledge cards", "Create drafts", "Create drafts", "Create drafts, publish"],
              ["Access control", "No access", "No access", "Full access"],
              ["Audit log", "No access", "View only", "View only"],
            ].map(row => (
              <tr key={row[0]}>{row.map((cell, i) => <td key={i} style={i === 0 ? { fontWeight: 600, color: "var(--mo-ink)" } : { fontSize: 12.5, color: "var(--mo-muted)" }}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditLogView({ entries, users, filters, setFilters }) {
  const actors = ["all", ...new Set(users.map(u => u.name))];
  const actions = ["all", ...new Set(entries.map(e => e.action))];
  const filtered = entries.filter(e =>
    (filters.actor === "all" || e.actor === filters.actor) &&
    (filters.action === "all" || e.action === filters.action) &&
    (filters.region === "all" || e.region.toLowerCase() === REGIONS[filters.region]?.short.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, margin: "14px 0", flexWrap: "wrap" }}>
        <select className="mo-select" value={filters.actor} onChange={e => setFilters({ ...filters, actor: e.target.value })}>
          {actors.map(a => <option key={a} value={a}>{a === "all" ? "All actors" : a}</option>)}
        </select>
        <select className="mo-select" value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })}>
          {actions.map(a => <option key={a} value={a}>{a === "all" ? "All actions" : a}</option>)}
        </select>
        <select className="mo-select" value={filters.region} onChange={e => setFilters({ ...filters, region: e.target.value })}>
          <option value="all">All regions</option>
          {Object.values(REGIONS).map(r => <option key={r.id} value={r.id}>{r.short}</option>)}
        </select>
      </div>
      <div className="mo-table-wrap">
        <table className="mo-table">
          <thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Detail</th><th>Region</th></tr></thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id}>
                <td className="mo-mono" style={{ fontSize: 12 }}>{e.at}</td>
                <td style={{ fontWeight: 600, color: "var(--mo-ink)" }}>{e.actor}</td>
                <td><span className="mo-pill mo-pill-neutral">{e.action}</span></td>
                <td style={{ fontSize: 12.5, color: "var(--mo-muted)" }}>{e.detail}</td>
                <td className="mo-mono" style={{ fontSize: 12 }}>{e.region}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5}><EmptyState text="No audit entries match these filters." /></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--mo-muted)", marginTop: 12 }}>Append-only in this prototype — no delete or edit action exists for log entries, by design.</p>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Small shared components                                                  */
/* ---------------------------------------------------------------------- */

function SubTabs({ tabs, active, onChange, trailing }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--mo-border)", marginBottom: 4 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {tabs.map(t => (
          <button key={t.id} className={`mo-subtab ${active === t.id ? "mo-subtab-active" : ""}`} onClick={() => onChange(t.id)}>{t.label}</button>
        ))}
      </div>
      {trailing}
    </div>
  );
}

function ProgressBar({ done, total, color }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="mo-progress-track">
      <div className="mo-progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? "linear-gradient(90deg, var(--mo-success), #1FBE84)" : (color || "linear-gradient(90deg, var(--mo-accent), var(--mo-accent-2))") }} />
    </div>
  );
}

function RegionSelect({ value, onChange, allowAll }) {
  return (
    <select className="mo-select" value={value} onChange={e => onChange(e.target.value)}>
      {allowAll && <option value="all">All regions</option>}
      {Object.values(REGIONS).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
  );
}

function RegionDot({ region }) {
  const r = REGIONS[region];
  if (!r) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 12.5, color: "var(--mo-ink)" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, marginRight: 6, flexShrink: 0 }} />
      {r.short}
    </span>
  );
}

function StatusPill({ status, label }) {
  const map = {
    unassigned: "neutral", assigned: "warn", in_review: "warn", approved: "success", resolved: "success",
    pending: "warn", paid: "success", failed: "danger", disputed: "danger",
    draft: "neutral", published: "success",
  };
  return <span className={`mo-pill mo-pill-${map[status] || "neutral"}`}>{label || STATUS_LABEL[status] || status}</span>;
}

function EmptyState({ text }) {
  return (
    <div style={{ padding: "28px 0", textAlign: "center", color: "var(--mo-muted)", fontSize: 13 }}>
      <AlertTriangle size={18} style={{ marginBottom: 8, opacity: 0.6 }} />
      <div>{text}</div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Styles                                                                   */
/* ---------------------------------------------------------------------- */

const styles = {
  appShell: { display: "flex", minHeight: "100vh", background: "transparent", fontFamily: "var(--mo-body)", color: "var(--mo-ink)" },
  sidebar: { width: 250, background: "linear-gradient(180deg, rgba(14,31,70,0.96), rgba(7,18,41,1))", color: "#fff", padding: "24px 16px", display: "flex", flexDirection: "column", flexShrink: 0 },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandMark: { display: "flex", alignItems: "center" },
  brandDot: { width: 14, height: 14, borderRadius: "50%", display: "inline-block", border: "2px solid #0b1734" },
  brandName: { fontFamily: "var(--mo-display)", fontSize: 16, fontWeight: 900, color: "#fff" },
  brandSub: { fontSize: 11, fontWeight: 800, color: "#9fb6dd", marginTop: 2 },
  sidebarNoonBadge: { fontFamily: "var(--mo-display)", fontWeight: 900, fontSize: 16, letterSpacing: -0.5, color: "#1A1A1A", background: "#FEDE00", padding: "6px 12px", borderRadius: 10, display: "inline-block", boxShadow: "0 14px 30px rgba(0,0,0,0.28)" },
  navItem: { display: "flex", alignItems: "center", width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 10, background: "transparent", border: "none", color: "#d5e2f7", fontSize: 13.5, fontWeight: 800, cursor: "pointer", marginBottom: 4 },
  navItemActive: { display: "flex", alignItems: "center", width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 10, background: "linear-gradient(135deg, var(--mo-accent), var(--mo-accent-2))", border: "none", color: "#fff", fontSize: 13.5, cursor: "pointer", marginBottom: 4, fontWeight: 900, boxShadow: "0 12px 26px rgba(79,70,229,0.34)" },
  lockedHeading: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 900, color: "#86d8ff", marginBottom: 8, paddingLeft: 14 },
  phaseTag: { fontSize: 9.5, fontWeight: 800, color: "#9fb6dd", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "1px 6px", marginLeft: 6 },
  regionLegend: { marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "18px 32px", background: "var(--mo-surface)", borderBottom: "1px solid var(--mo-border)", position: "relative", backdropFilter: "blur(16px)" },
  headerAccent: { height: 3, background: "linear-gradient(90deg, var(--mo-accent), var(--mo-blue-2), var(--mo-accent-2), #38bdf8)" },
  headerTitle: { fontFamily: "var(--mo-display)", fontSize: 20, fontWeight: 900, color: "var(--mo-ink)" },
  content: { padding: "24px 32px", flex: 1, overflowY: "auto" },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  bauIconWrap: { width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500&display=swap');
:root {
  --mo-bg: #edf5fb;
  --mo-surface: rgba(255,255,255,0.9);
  --mo-surface-strong: #ffffff;
  --mo-surface-alt: #eef5fc;
  --mo-ink: #071a3d;
  --mo-muted: #5f7087;
  --mo-border: rgba(98,121,151,0.2);
  --mo-accent: #2563eb;
  --mo-accent-2: #7c3aed;
  --mo-blue-2: #4f46e5;
  --mo-coral: #f97316;
  --mo-gold: #f59e0b;
  --mo-violet: #8b5cf6;
  --mo-success: #18b56f;
  --mo-warn: #b45309;
  --mo-danger: #e11d48;
  --mo-locked-bg: rgba(255,255,255,0.55);
  --mo-shadow: 0 22px 60px rgba(35,56,86,0.13);
  --mo-shadow-hover: 0 26px 70px rgba(35,56,86,0.2);
  --mo-display: 'Inter', system-ui, 'Segoe UI', sans-serif;
  --mo-body: 'Inter', system-ui, 'Segoe UI', sans-serif;
  --mo-mono: 'IBM Plex Mono', 'Consolas', monospace;
}
body {
  margin: 0;
  min-height: 100vh;
  background:
    linear-gradient(rgba(20,77,130,0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(20,77,130,0.045) 1px, transparent 1px),
    radial-gradient(circle at top right, rgba(104,189,255,0.34), transparent 30%),
    radial-gradient(circle at 55% 42%, rgba(226,244,235,0.72), transparent 36%),
    var(--mo-bg);
  background-size: 44px 44px, 44px 44px, auto, auto, auto;
  color: var(--mo-ink);
  font-family: var(--mo-body);
}
.mo-navitem { cursor: pointer; }
.mo-navitem:hover { background: linear-gradient(135deg, var(--mo-accent), var(--mo-accent-2)) !important; color: #fff !important; box-shadow: 0 12px 26px rgba(79,70,229,0.34); }
.mo-locked { display:flex; align-items:center; width:100%; text-align:left; padding:8px 14px; border-radius:10px; background:transparent; border:none; color:#8ea4c8; font-size:12px; font-weight:700; cursor:pointer; margin-bottom:2px; }
.mo-locked:hover { background: rgba(255,255,255,0.06); color:#e8f0fd; }
.mo-card { background: var(--mo-surface); border: 1px solid rgba(255,255,255,0.74); border-radius: 18px; padding: 16px 18px; box-shadow: var(--mo-shadow); backdrop-filter: blur(16px); transition: box-shadow 0.15s ease, transform 0.15s ease; }
.mo-clickable { cursor: pointer; text-align: left; width: 100%; font-family: var(--mo-body); }
.mo-clickable:hover { box-shadow: var(--mo-shadow-hover); transform: translateY(-2px); }
.mo-lockedtile { background: var(--mo-locked-bg); border: 1px dashed rgba(98,121,151,0.4); border-radius: 18px; padding: 16px 18px; text-align: left; cursor: pointer; backdrop-filter: blur(10px); }
.mo-lockedtile:hover { border-color: var(--mo-accent); }
.mo-btn { display:inline-flex; align-items:center; background:var(--mo-surface-strong); border:1px solid var(--mo-border); border-radius:10px; padding:8px 14px; font-size:13px; font-weight:800; color:var(--mo-ink); cursor:pointer; font-family:var(--mo-body); transition: all 0.12s ease; }
.mo-btn:hover { background: var(--mo-surface-alt); border-color: rgba(79,70,229,0.55); }
.mo-btn-sm { padding: 6px 10px; font-size: 12.5px; }
.mo-btn-primary { background: linear-gradient(135deg, var(--mo-accent), var(--mo-accent-2)); color: #fff; border-color: transparent; box-shadow: 0 10px 24px rgba(79,70,229,0.24); }
.mo-btn-primary:hover { background: linear-gradient(135deg, var(--mo-accent), var(--mo-accent-2)); filter: brightness(0.96); box-shadow: 0 12px 28px rgba(79,70,229,0.32); }
.mo-btn-danger { color: var(--mo-danger); border-color: rgba(251,113,133,0.4); }
.mo-btn-danger:hover { background: rgba(255,241,242,0.9); border-color: var(--mo-danger); }
.mo-btn:disabled { opacity: 0.6; cursor: default; }
.mo-table-wrap { background: var(--mo-surface); border: 1px solid rgba(255,255,255,0.74); border-radius: 18px; overflow: hidden; box-shadow: var(--mo-shadow); backdrop-filter: blur(16px); }
.mo-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.mo-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 900; color: var(--mo-muted); padding: 11px 14px; border-bottom: 1px solid var(--mo-border); background: rgba(238,245,252,0.85); }
.mo-table td { padding: 11px 14px; border-bottom: 1px solid var(--mo-border); vertical-align: top; }
.mo-table tr:last-child td { border-bottom: none; }
.mo-table tr:hover td { background: rgba(37,99,235,0.04); }
.mo-mono { font-family: var(--mo-mono); color: var(--mo-ink); }
.mo-pill { display:inline-block; font-size: 11.5px; padding: 2px 10px; border-radius: 999px; font-weight: 800; }
.mo-pill-neutral { background: rgba(37,99,235,0.1); color: var(--mo-accent); }
.mo-pill-warn { background: rgba(249,115,22,0.13); color: var(--mo-warn); }
.mo-pill-success { background: rgba(24,181,111,0.14); color: #0e7a4c; }
.mo-pill-danger { background: rgba(225,29,72,0.1); color: var(--mo-danger); }
.mo-select { border: 1px solid var(--mo-border); border-radius: 10px; padding: 7px 10px; font-size: 12.5px; font-family: var(--mo-body); font-weight: 700; color: var(--mo-ink); background: var(--mo-surface-strong); }
.mo-input { width: 100%; border: 1px solid var(--mo-border); border-radius: 10px; padding: 9px 12px; font-size: 13px; font-weight: 600; font-family: var(--mo-body); background: rgba(255,255,255,0.92); color: var(--mo-ink); box-sizing: border-box; }
.mo-input:focus, .mo-textarea:focus, .mo-select:focus { outline: none; border-color: rgba(79,70,229,0.55); box-shadow: 0 0 0 4px rgba(79,70,229,0.12); }
.mo-textarea { width: 100%; border: 1px solid var(--mo-border); border-radius: 10px; padding: 9px 12px; font-size: 13px; font-weight: 600; font-family: var(--mo-body); background: rgba(255,255,255,0.92); color: var(--mo-ink); box-sizing: border-box; resize: vertical; }
.mo-loginrow { display:flex; align-items:center; justify-content:space-between; width:100%; text-align:left; padding:12px 14px; border-radius:12px; border:1px solid var(--mo-border); background:var(--mo-surface-strong); cursor:pointer; transition: all 0.12s ease; }
.mo-loginrow:hover { background: var(--mo-surface-alt); border-color: rgba(79,70,229,0.55); transform: translateY(-1px); box-shadow: var(--mo-shadow); }
.mo-loginrow:disabled { opacity: 0.5; cursor: default; transform: none; box-shadow: none; }
.mo-toast { position: fixed; top: 18px; right: 18px; background: var(--mo-ink); color: #fff; padding: 10px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; z-index: 50; max-width: 320px; box-shadow: 0 18px 42px rgba(0,0,0,0.25); }
.mo-spin { animation: mo-spin 1s linear infinite; }
@keyframes mo-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.mo-subtab { background: none; border: none; padding: 10px 14px; font-size: 13.5px; font-weight: 700; color: var(--mo-muted); cursor: pointer; border-bottom: 2px solid transparent; font-family: var(--mo-body); }
.mo-subtab:hover { color: var(--mo-ink); }
.mo-subtab-active { color: var(--mo-accent); font-weight: 900; border-bottom-color: var(--mo-accent); }
.mo-progress-track { height: 6px; background: rgba(98,121,151,0.16); border-radius: 999px; overflow: hidden; }
.mo-progress-fill { height: 100%; border-radius: 999px; transition: width 0.3s ease; }
.mo-stagerow { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--mo-border); }
.mo-stagerow:last-child { border-bottom: none; }
.mo-stage-icon { display:flex; align-items:center; justify-content:center; width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid var(--mo-border); color: var(--mo-muted); flex-shrink: 0; }
.mo-stage-done { background: linear-gradient(135deg, var(--mo-success), #22c55e); border-color: transparent; color: #fff; }

/* ---- Portal login (style adopted from Admin Master Dashboard) ---- */
.portal-login { position: relative; display: grid; height: 100vh; overflow: hidden; grid-template-columns: minmax(0, 1.45fr) minmax(410px, 0.55fr); grid-template-rows: auto minmax(0, 1fr); gap: 36px; padding: 30px 48px 24px; color: #fff; font-family: var(--mo-body); }
.portal-bg, .portal-overlay { position: absolute; inset: 0; }
.portal-bg { width: 100%; height: 100%; filter: brightness(1.14) saturate(1.08); object-fit: cover; }
.portal-overlay { background: linear-gradient(90deg, rgba(2,11,33,0.12), rgba(4,15,45,0.03) 54%, rgba(3,9,31,0.64)), radial-gradient(circle at 85% 48%, rgba(29,78,216,0.22), transparent 34%), linear-gradient(180deg, rgba(2,8,29,0.1), rgba(2,8,29,0.48)); }
.portal-header { position: relative; z-index: 1; grid-column: 1 / -1; display: grid; grid-template-columns: minmax(250px, 1fr) auto minmax(250px, 1fr); align-items: center; gap: 20px; }
.brand-lockup { display: flex; align-items: center; gap: 12px; color: #fff; }
.brand-lockup.portal-brand { justify-self: start; }
.brand-lockup strong { display: block; font-weight: 900; }
.brand-lockup div > span { display: block; margin-top: 2px; color: rgba(255,255,255,0.74); font-size: 0.82rem; font-weight: 800; }
.noon-mark { display: inline-grid; place-items: center; padding: 8px 14px; border-radius: 12px; background: #FEDE00; color: #1A1A1A; font-weight: 900; font-size: 1.05rem; letter-spacing: -0.5px; box-shadow: 0 14px 30px rgba(0,0,0,0.3); }
.region-pill { display: flex; align-items: center; gap: 14px; border: 1px solid rgba(255,255,255,0.2); border-radius: 999px; background: rgba(14,54,128,0.48); box-shadow: 0 18px 42px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.16); padding: 10px 20px; backdrop-filter: blur(18px); }
.region-pill span { display: flex; align-items: center; gap: 8px; color: #fff; font-weight: 900; }
.region-pill b { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; background: rgba(255,255,255,0.12); font-size: 0.85rem; }
.region-pill i { width: 1px; height: 22px; background: rgba(255,255,255,0.42); }
.portal-copy, .portal-card-wrap { position: relative; z-index: 1; }
.portal-copy { display: flex; min-height: 0; max-width: 1000px; flex-direction: column; justify-content: flex-end; align-self: stretch; }
.portal-copy h1 { max-width: 620px; margin: 0 0 14px; color: #fff; font-size: clamp(2rem, 3.25vw, 3.15rem); font-weight: 900; line-height: 1.02; text-shadow: 0 12px 34px rgba(0,0,0,0.28); }
.portal-copy > p { max-width: 680px; margin: 0 0 28px; color: rgba(255,255,255,0.9); font-size: 1.04rem; font-weight: 700; line-height: 1.45; }
.feature-grid { display: grid; max-width: 100%; grid-template-columns: repeat(6, minmax(126px, 1fr)); gap: 8px; }
.feature-grid article { display: block; min-height: 126px; border: 1px solid rgba(255,255,255,0.16); border-radius: 14px; background: rgba(10,18,38,0.42); box-shadow: 0 18px 42px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.12); padding: 12px; backdrop-filter: blur(14px); }
.feature-grid strong { display: block; color: #fff; font-size: 0.82rem; font-weight: 900; line-height: 1.25; }
.feature-grid small { display: block; margin-top: 8px; color: rgba(255,255,255,0.72); font-size: 0.7rem; font-weight: 700; line-height: 1.25; }
.feature-icon { display: grid; width: 38px; height: 38px; margin-bottom: 10px; place-items: center; border-radius: 50%; color: #fff; font-size: 0.78rem; font-weight: 900; }
.feature-icon.blue { background: linear-gradient(135deg, #0ea5e9, #2563eb); }
.feature-icon.green { background: linear-gradient(135deg, #10b981, #059669); }
.feature-icon.orange { background: linear-gradient(135deg, #fb923c, #f97316); }
.feature-icon.purple { background: linear-gradient(135deg, #8b5cf6, #6d28d9); }
.feature-icon.cyan { background: linear-gradient(135deg, #22d3ee, #0891b2); }
.feature-icon.pink { background: linear-gradient(135deg, #ec4899, #be185d); }
.trust-bar { display: flex; max-width: 100%; align-items: center; gap: 20px; margin-top: 16px; border: 1px solid rgba(255,255,255,0.13); border-radius: 12px; background: rgba(8,17,38,0.34); padding: 12px 16px; color: rgba(255,255,255,0.78); font-size: 0.86rem; font-weight: 700; backdrop-filter: blur(14px); }
.trust-bar strong { color: #fff; font-weight: 900; }
.portal-card-wrap { display: grid; align-items: center; justify-items: center; min-height: 0; }
.portal-card { width: min(100%, 430px); border: 1px solid rgba(255,255,255,0.72); border-radius: 34px; background: linear-gradient(150deg, rgba(255,255,255,0.92), rgba(232,241,255,0.84)), rgba(255,255,255,0.86); box-shadow: 0 0 44px rgba(59,130,246,0.62), 0 26px 80px rgba(0,0,0,0.28); padding: 30px 34px; color: var(--mo-ink); text-align: center; backdrop-filter: blur(22px); }
.portal-card .card-mark { margin: 0 auto 12px; }
.portal-card h2 { margin: 0 0 4px; color: #071a3d; font-size: 1.78rem; font-weight: 900; }
.portal-card-subtitle { margin: 0 0 12px; color: #1155d9; font-weight: 800; }
.card-rule { width: 210px; height: 1px; margin: 12px auto 18px; background: linear-gradient(90deg, transparent, rgba(80,98,130,0.28), transparent); }
.portal-card h3 { margin: 0 0 6px; color: #081a3a; font-size: 1.22rem; font-weight: 900; }
.portal-card .intro { max-width: 290px; margin: 0 auto 16px; color: #39506d; font-weight: 700; line-height: 1.55; font-size: 0.92rem; }
.portal-alert { margin-bottom: 14px; border: 1px solid rgba(251,113,133,0.28); border-radius: 12px; background: rgba(255,241,242,0.9); color: #9f1239; padding: 12px 14px; font-size: 0.9rem; font-weight: 800; }
.portal-form { display: grid; gap: 9px; text-align: left; }
.portal-form label { color: #253b59; font-size: 0.84rem; font-weight: 900; }
.input-shell { display: flex; align-items: center; border: 1px solid rgba(95,112,135,0.24); border-radius: 10px; background: rgba(255,255,255,0.86); box-shadow: inset 0 1px 0 rgba(255,255,255,0.8); overflow: hidden; }
.input-shell span { flex: 0 0 48px; color: #31517c; font-weight: 900; font-size: 0.8rem; text-align: center; }
.input-shell input { flex: 1 1 auto; min-width: 0; min-height: 44px; border: 0; background: transparent; box-shadow: none; outline: none; padding: 0 14px 0 0; color: var(--mo-ink); font: inherit; font-weight: 700; }
.input-shell:focus-within { border-color: rgba(79,70,229,0.55); box-shadow: 0 0 0 4px rgba(79,70,229,0.12); }
.forgot-link { justify-self: end; color: #1155d9; font-size: 0.82rem; font-weight: 800; text-decoration: none; }
.portal-form button { display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 48px; margin-top: 4px; border: 0; border-radius: 10px; background: linear-gradient(135deg, var(--mo-accent), var(--mo-accent-2)); color: #fff; padding: 0 18px; cursor: pointer; font: inherit; font-weight: 900; box-shadow: 0 10px 24px rgba(79,70,229,0.24); }
.portal-form button:hover { filter: brightness(0.96); }
.or-divider { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; margin: 14px 0 12px; color: var(--mo-muted); font-size: 0.88rem; }
.or-divider::before, .or-divider::after { height: 1px; background: linear-gradient(90deg, transparent, rgba(80,98,130,0.2)); content: ""; }
.or-divider::after { background: linear-gradient(90deg, rgba(80,98,130,0.2), transparent); }
.sso-button { width: 100%; min-height: 46px; border: 1px solid rgba(79,70,229,0.18); border-radius: 10px; background: rgba(255,255,255,0.42); color: #071a3d; cursor: pointer; font: inherit; font-weight: 900; box-shadow: none; }
.sso-button:hover { background: rgba(255,255,255,0.62); }
.support-copy { margin: 14px 0 0; color: var(--mo-muted); font-size: 0.9rem; font-weight: 700; }
.support-copy a { color: #1155d9; font-weight: 900; text-decoration: none; }
.demo-logins { margin-top: 14px; border-top: 1px solid var(--mo-border); padding-top: 12px; text-align: left; }
.demo-logins summary { cursor: pointer; color: var(--mo-muted); font-weight: 900; font-size: 0.88rem; }
.demo-grid { display: grid; gap: 10px; margin-top: 14px; }
.demo-grid div { display: grid; gap: 4px; border: 1px solid var(--mo-border); border-radius: 12px; background: #fff; padding: 12px; }
.demo-grid strong { font-size: 0.86rem; }
.demo-grid span, .demo-grid code { color: var(--mo-muted); font-size: 0.82rem; }
@media (min-width: 981px) and (max-height: 820px) {
  .portal-login { gap: 24px; padding: 24px 46px 18px; }
  .portal-copy h1 { max-width: 540px; margin-bottom: 12px; font-size: clamp(1.85rem, 3vw, 2.85rem); }
  .portal-copy > p { max-width: 620px; margin-bottom: 20px; font-size: 0.96rem; }
  .feature-grid article { min-height: 82px; padding: 10px; }
  .feature-icon { width: 36px; height: 36px; }
  .trust-bar { margin-top: 16px; padding: 10px 14px; }
  .portal-card { width: min(100%, 420px); border-radius: 28px; padding: 22px 28px; }
  .portal-card h2 { font-size: 1.55rem; }
  .portal-card .intro, .portal-card-subtitle, .support-copy { font-size: 0.84rem; }
  .card-rule { margin: 10px auto 14px; }
  .input-shell input { min-height: 40px; }
  .portal-form button { min-height: 44px; }
  .demo-logins { margin-top: 10px; padding-top: 10px; }
}
@media (min-width: 981px) and (max-height: 700px) {
  .feature-grid small { display: none; }
  .feature-grid article { min-height: 90px; }
  .trust-bar { display: none; }
}
@media (max-width: 980px) {
  .portal-login { grid-template-columns: 1fr; height: auto; min-height: 100vh; overflow: visible; padding: 28px 24px; }
  .portal-header { grid-template-columns: 1fr; gap: 18px; }
  .region-pill { justify-self: start; flex-wrap: wrap; }
  .portal-copy { align-self: start; padding-top: 24px; }
  .feature-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 720px) {
  .feature-grid { grid-template-columns: 1fr; }
  .portal-card { padding: 34px 24px; }
  .trust-bar { align-items: flex-start; flex-direction: column; gap: 10px; }
}
`;
