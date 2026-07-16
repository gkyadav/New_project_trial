import { useState, useEffect } from "react";
import { supabase, rowToUser, rowToEmail, rowToDraft, rowToPayment, rowToKbCard, rowToKbRevision, rowToAudit, rowToPoint, rowToBotQuestion } from "./supabase";
import {
  Inbox, Bot, ShieldCheck, BookOpen, Lock, ClipboardList, LogOut,
  CheckCircle2, XCircle, Pencil, CreditCard, GraduationCap,
  LayoutDashboard, AlertTriangle, PlusCircle, Search, Globe2, Send,
  ChevronRight, RefreshCw, ListChecks, Repeat, Sparkles, Circle, Check,
  Users, Truck, Package, Wallet, Headphones, Trophy, HelpCircle, UserPlus
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/* Data model (mock, in-memory only — no persistence, no real backend)     */
/* ---------------------------------------------------------------------- */

const REGIONS = {
  uae: { id: "uae", name: "United Arab Emirates", short: "UAE", color: "#e8342a" },
  ksa: { id: "ksa", name: "Saudi Arabia", short: "KSA", color: "#18a558" },
  egypt: { id: "egypt", name: "Egypt", short: "EGY", color: "#64748b" },
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
  { id: "bau", label: "Payments", icon: CreditCard, roles: ["agent", "reviewer", "admin"] },
  { id: "kb", label: "Knowledge base", icon: BookOpen, roles: ["agent", "reviewer", "admin"] },
  { id: "ai", label: "AI workspace", icon: Bot, roles: ["agent", "reviewer", "admin"] },
  { id: "admin", label: "Admin", icon: ShieldCheck, roles: ["reviewer", "admin"] },
];

const STATUS_LABEL = {
  unassigned: "Unassigned", assigned: "Assigned", in_review: "In AI review",
  approved: "Sent (mock)", resolved: "Resolved",
  pending: "Pending", paid: "Paid", failed: "Failed", disputed: "Disputed",
  draft: "Draft", published: "Published",
};

/* Points awarded for knowledge contributions (visible on the SOP Bot tab). */
const POINTS = { newCard: 10, mergedRevision: 5, botAnswer: 3, submitToCard: 5 };

/* Knowledge card bodies are stored one point per line. Headings (lines
   ending in ":"), numbered steps and existing bullets are kept as-is;
   every other non-empty line gets a bullet. */
function toBulletPoints(body) {
  return body
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      if (/^[•\-*]\s*/.test(l)) return "• " + l.replace(/^[•\-*]\s*/, "");
      if (/^\d+[.)]\s/.test(l) || /:$/.test(l)) return l;
      return "• " + l;
    })
    .join("\n");
}

/* Knowledge cards are structured as STEP BLOCKS: every card is a sequence
   of { name, detail } steps — a mandatory step name plus a description,
   one point per line. `body` is kept as derived text (search, bot, gap
   detection); `steps` is the source of truth once a card is saved through
   the step editor. Older cards without stored steps are parsed on the fly. */
const emptyStep = () => ({ name: "", detail: "" });

function stepsToBody(steps) {
  return steps.map(s => `${s.name}:\n${toBulletPoints(s.detail)}`).join("\n");
}

/* Best-effort parser for legacy free-text bodies → step blocks. Headings
   ("NAME: …") and numbered lines start steps; bullets become the detail. */
function parseSteps(body) {
  const steps = [];
  const push = name => steps.push({ name: name.trim().replace(/[:.]$/, ""), detail: "" });
  const addDetail = text => {
    if (!steps.length) push("Overview");
    const s = steps[steps.length - 1];
    const clean = text.replace(/^[•\-*]\s*/, "").trim();
    if (clean) s.detail += (s.detail ? "\n" : "") + "• " + clean;
  };
  (body || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
    if (/^[•\-*]\s/.test(line)) { addDetail(line); return; }
    const num = line.match(/^\d+[.)]\s+(.*)$/);
    if (num) {
      const rest = num[1];
      const cut = rest.search(/[:—.]/);
      if (cut > 4 && cut < 70) { push(rest.slice(0, cut)); addDetail(rest.slice(cut + 1)); }
      else push(rest.slice(0, 70));
      return;
    }
    const head = line.match(/^(.{3,80}?):(.*)$/);
    if (head && !/https?$/i.test(head[1])) { push(head[1]); addDetail(head[2]); return; }
    addDetail(line);
  });
  return steps.length ? steps : [{ name: "Overview", detail: toBulletPoints(body || "") }];
}

/* Steps for a card: stored steps if present, else parsed from the body. */
const cardSteps = card => (card.steps && card.steps.length ? card.steps : parseSteps(card.body));

/* Step name for an answer coming out of the SOP bot. */
function stepNameFor(question) {
  if (/cutoff|deadline/i.test(question)) return "Cutoffs & deadlines";
  if (/escalation|goes wrong|dispute/i.test(question)) return "Escalation path";
  if (/document|attach/i.test(question)) return "Required documents";
  if (/POC|responsible/i.test(question)) return "POCs & ownership";
  if (/step-by-step|thin/i.test(question)) return "Process steps";
  return question.replace(/^There is an open point in this SOP: /i, "").slice(0, 60);
}

/* SOP completeness bot: heuristics that flag what a card is still missing.
   Each gap becomes a question the team answers for points. */
function detectGaps(card) {
  const qs = [];
  const body = card.body;
  const lines = body.split("\n").map(l => l.trim()).filter(Boolean);
  lines
    .filter(l => /\b(TODO|TBD|to be confirmed|pending confirmation|thin evidence|working draft)\b/i.test(l))
    .slice(0, 2)
    .forEach(l => qs.push(`There is an open point in this SOP: "${l.replace(/^•\s*/, "")}". Can you fill in the missing detail?`));
  if (!/cutoff|deadline|by the \d|before \d|\bby \d|payroll input/i.test(body))
    qs.push("What are the cutoff dates / deadlines in this process, and what happens if they are missed?");
  if (!/escalat|dispute|watchout|discrepanc/i.test(body))
    qs.push("What is the escalation path when something goes wrong (disputes, mismatches, delayed payments)?");
  if (!/attach|invoice|document|contract/i.test(body))
    qs.push("Which documents and attachments are mandatory before this payment can be processed?");
  if (!/POC|owner|responsib|admin\b/i.test(body))
    qs.push("Who is the POC responsible for each step of this process?");
  if (lines.length < 6)
    qs.push("This card looks thin — can you lay out the full step-by-step process, from input collection to payment release?");
  return qs.slice(0, 4);
}

/* The bot only accepts answers with enough substance to go into an SOP. */
function answerLooksComplete(text) {
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean);
  const hasSpecific = /\d/.test(t) || /@/.test(t) || /[A-Z][a-z]+ [A-Z][a-z]+/.test(t);
  return t.length >= 40 && words.length >= 8 && hasSpecific;
}

/* ---------------------------------------------------------------------- */

export default function App() {
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("bau");
  const [kbTab, setKbTab] = useState("uae");
  const [kbDept, setKbDept] = useState(null);
  const [kbOpenCardId, setKbOpenCardId] = useState(null);
  const [kbActiveSection, setKbActiveSection] = useState(0);
  const [kbShowSummary, setKbShowSummary] = useState(true);
  const [kbTreeExpanded, setKbTreeExpanded] = useState({});
  const [aiTab, setAiTab] = useState(null);
  const [payView, setPayView] = useState("hub");
  const [adminTab, setAdminTab] = useState("access");
  const [regionFilter, setRegionFilter] = useState("all");
  const [toast, setToast] = useState(null);

  const [users, setUsers] = useState([]);
  const [emails, setEmails] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [kbCards, setKbCards] = useState([]);
  const [kbRevisions, setKbRevisions] = useState([]);
  const [pointsLedger, setPointsLedger] = useState([]);
  const [botQuestions, setBotQuestions] = useState([]);
  const [bauState, setBauState] = useState(() => {
    const init = {};
    BAU_PROCESSES.forEach(p => { init[p.id] = {}; });
    return init;
  });
  const [auditLog, setAuditLog] = useState([]);
  const [dataReady, setDataReady] = useState(false);
  const [newCard, setNewCard] = useState({ title: "", steps: [emptyStep()] });
  const [auditFilters, setAuditFilters] = useState({ actor: "all", action: "all", region: "all" });

  function pushToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  /* Fire a Supabase write and surface failures without blocking the UI. */
  function dbWrite(query) {
    Promise.resolve(query).then(({ error }) => {
      if (error) pushToast("Sync error: " + error.message);
    });
  }

  function bauStateFromRows(rows) {
    const init = {};
    BAU_PROCESSES.forEach(p => { init[p.id] = {}; });
    rows.forEach(r => {
      init[r.process_id] = { ...(init[r.process_id] || {}), [r.stage_id]: { confirmations: r.confirmations || [] } };
    });
    return init;
  }

  /* Auth session: restore on load, track changes. */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthChecked(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  /* Initial load: hydrate all state from Supabase once signed in. */
  useEffect(() => {
    if (!session) { setDataReady(false); setCurrentUser(null); return; }
    let cancelled = false;
    async function loadAll() {
      const [u, e, d, p, k, kr, b, a, pl, bq] = await Promise.all([
        supabase.from("users").select("*").order("id"),
        supabase.from("emails").select("*").order("received_at", { ascending: false }),
        supabase.from("drafts").select("*").order("created_at"),
        supabase.from("payments").select("*").order("id"),
        supabase.from("kb_cards").select("*").order("updated_at", { ascending: false }),
        supabase.from("kb_revisions").select("*").order("created_at", { ascending: false }),
        supabase.from("bau_checks").select("*"),
        supabase.from("audit_log").select("*").order("at", { ascending: false }),
        supabase.from("points_ledger").select("*").order("at", { ascending: false }),
        supabase.from("bot_questions").select("*").order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      const failed = [u, e, d, p, k, kr, b, a, pl, bq].find(r => r.error);
      if (failed) { pushToast("Could not load data: " + failed.error.message); return; }
      setUsers(u.data.map(rowToUser));
      setEmails(e.data.map(rowToEmail));
      setDrafts(d.data.map(rowToDraft));
      setPayments(p.data.map(rowToPayment));
      setKbCards(k.data.map(rowToKbCard));
      setKbRevisions(kr.data.map(rowToKbRevision));
      setBauState(bauStateFromRows(b.data));
      setAuditLog(a.data.map(rowToAudit));
      setPointsLedger(pl.data.map(rowToPoint));
      setBotQuestions(bq.data.map(rowToBotQuestion));
      setDataReady(true);
    }
    loadAll();
    return () => { cancelled = true; };
  }, [session?.user?.email]);

  /* Resolve the signed-in auth account to a team member row. */
  useEffect(() => {
    if (!session || !dataReady || users.length === 0) return;
    const me = users.find(u => u.id === session.user.email);
    if (!me || !me.active) {
      supabase.auth.signOut();
      pushToast("This noon ID is not authorized for the Ops Console. Ask Gaurav to add you as a team member.");
      return;
    }
    setCurrentUser(prev => (prev?.id === me.id ? prev : me));
    if (!currentUser) {
      setView("bau");
      setRegionFilter(me.role === "agent" && me.region ? me.region : "all");
    }
  }, [session, dataReady, users]);

  /* Realtime: apply changes made by other users as they happen. */
  useEffect(() => {
    if (!session) return;
    /* stickyKeys: fields that should never be blanked by an update payload
       that omits them (belt-and-suspenders alongside REPLICA IDENTITY FULL
       — Postgres logical replication can otherwise omit unchanged TOASTed
       columns like long text/jsonb from an UPDATE's "new" record). */
    function upsertBy(setList, mapRow, payload, { prepend = false, stickyKeys = [] } = {}) {
      if (payload.eventType === "DELETE") {
        const oldId = payload.old?.id;
        if (oldId) setList(prev => prev.filter(x => x.id !== oldId));
        return;
      }
      const item = mapRow(payload.new);
      setList(prev => {
        const idx = prev.findIndex(x => x.id === item.id);
        if (idx === -1) return prepend ? [item, ...prev] : [...prev, item];
        const merged = { ...item };
        stickyKeys.forEach(k => {
          const empty = item[k] == null || item[k] === "" || (Array.isArray(item[k]) && item[k].length === 0);
          if (empty && prev[idx][k]) merged[k] = prev[idx][k];
        });
        const next = [...prev];
        next[idx] = merged;
        return next;
      });
    }

    const channel = supabase.channel("ops-console-sync")
      .on("postgres_changes", { event: "*", schema: "public" }, payload => {
        switch (payload.table) {
          case "users": upsertBy(setUsers, rowToUser, payload); break;
          case "emails": upsertBy(setEmails, rowToEmail, payload); break;
          case "drafts": upsertBy(setDrafts, rowToDraft, payload); break;
          case "payments": upsertBy(setPayments, rowToPayment, payload); break;
          case "kb_cards": upsertBy(setKbCards, rowToKbCard, payload, { prepend: true, stickyKeys: ["body", "steps"] }); break;
          case "kb_revisions": upsertBy(setKbRevisions, rowToKbRevision, payload, { prepend: true, stickyKeys: ["body", "steps"] }); break;
          case "audit_log": upsertBy(setAuditLog, rowToAudit, payload, { prepend: true }); break;
          case "points_ledger": upsertBy(setPointsLedger, rowToPoint, payload, { prepend: true }); break;
          case "bot_questions": upsertBy(setBotQuestions, rowToBotQuestion, payload, { prepend: true }); break;
          case "bau_checks": {
            if (payload.eventType === "DELETE") {
              const { process_id, stage_id } = payload.old || {};
              if (!process_id) break;
              setBauState(prev => {
                const proc = { ...(prev[process_id] || {}) };
                if (stage_id) delete proc[stage_id];
                return { ...prev, [process_id]: stage_id ? proc : {} };
              });
            } else {
              const r = payload.new;
              setBauState(prev => ({
                ...prev,
                [r.process_id]: { ...(prev[r.process_id] || {}), [r.stage_id]: { confirmations: r.confirmations || [] } },
              }));
            }
            break;
          }
          default: break;
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.email]);

  function addAudit(action, detail, region) {
    const entry = {
      id: "a" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      at: new Date().toISOString().slice(0, 16).replace("T", " "),
      actor: currentUser.name, action, detail, region: region || "-",
    };
    setAuditLog(prev => [entry, ...prev]);
    dbWrite(supabase.from("audit_log").insert({ id: entry.id, at: entry.at, actor: entry.actor, action: entry.action, detail: entry.detail, region: entry.region }));
  }

  /* Email OTP sign-in: no passwords. A code is emailed to the noon ID;
     shouldCreateUser stays true so a newly-added team member's first
     login provisions their auth account automatically — access itself
     is still gated by the users-table + RLS check above, not by this. */
  async function requestOtp(email) {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@noon\.com$/.test(trimmed)) return "Use your official noon.com email address.";
    const { error } = await supabase.auth.signInWithOtp({ email: trimmed, options: { shouldCreateUser: true } });
    return error ? "Could not send the code: " + error.message : null;
  }

  async function verifyOtp(email, token) {
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: "email" });
    return error ? "Incorrect or expired code — request a new one." : null;
  }

  /* Temporary stopgap while OTP email delivery is being fixed (Supabase
     Site URL / template). Real per-user Supabase Auth session — RLS and
     team-only access are unaffected. Remove once OTP is confirmed working. */
  async function loginWithTempPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    return error ? "Sign-in failed: incorrect noon email or temporary password." : null;
  }

  function logout() {
    supabase.auth.signOut();
    setCurrentUser(null);
  }

  /* ---- admin: onboard a new team member (their first OTP login self-provisions auth) ---- */
  function addTeamMember({ id, name, title, role, regions }) {
    const trimmedId = id.trim().toLowerCase();
    if (!/^[^\s@]+@noon\.com$/.test(trimmedId)) { pushToast("Team member ID must be an official noon.com email address"); return; }
    if (!name.trim()) { pushToast("Name is required"); return; }
    if (users.some(u => u.id === trimmedId)) { pushToast("A team member with that noon ID already exists"); return; }
    const user = { id: trimmedId, name: name.trim(), role, region: regions[0] || null, active: true, title: title.trim(), regions };
    setUsers(prev => [...prev, user]);
    dbWrite(supabase.from("users").insert({ id: user.id, name: user.name, role: user.role, region: user.region, active: true, title: user.title, regions: user.regions }));
    addAudit("Add team member", `${user.name} (${user.id}) added as ${role}`, "-");
    pushToast(`${user.name} added — they can sign in with their noon email once you share the console link`);
  }

  /* ---- payment actions (admin only, outside BAU checklist — direct override) ---- */
  function changePaymentStatus(payment, newStatus) {
    const updatedAt = new Date().toISOString().slice(0, 10);
    setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: newStatus, updatedAt } : p));
    dbWrite(supabase.from("payments").update({ status: newStatus, updated_at: updatedAt }).eq("id", payment.id));
    addAudit("Change payment status", `${payment.customer}: ${STATUS_LABEL[payment.status]} → ${STATUS_LABEL[newStatus]} (mock, manual)`, payment.region);
    pushToast("Payment status updated (mock)");
  }

  /* ---- BAU checkpoint actions ---- */
  function checkStage(processId, stage) {
    const existing = bauState[processId]?.[stage.id]?.confirmations || [];
    if (existing.includes(currentUser.id)) return;
    const confirmations = [...existing, currentUser.id];
    setBauState(prev => ({ ...prev, [processId]: { ...(prev[processId] || {}), [stage.id]: { confirmations } } }));
    dbWrite(supabase.from("bau_checks").upsert({ process_id: processId, stage_id: stage.id, confirmations }));
    const needed = stage.dual ? 2 : 1;
    const willComplete = confirmations.length >= needed;
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
    dbWrite(supabase.from("bau_checks").delete().eq("process_id", processId));
    const process = BAU_PROCESSES.find(p => p.id === processId);
    addAudit("Start new BAU cycle", `${process.name} reset for a new cycle`, "-");
    pushToast(`New cycle started for ${process.name}`);
  }

  /* ---- points ---- */
  function awardPoints(userId, userName, pts, reason, refId) {
    const entry = {
      id: "p" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      userId, userName, points: pts, reason, refId: refId || null,
      at: new Date().toISOString().slice(0, 16).replace("T", " "),
    };
    setPointsLedger(prev => prev.some(p => p.id === entry.id) ? prev : [entry, ...prev]);
    dbWrite(supabase.from("points_ledger").insert({ id: entry.id, user_id: entry.userId, user_name: entry.userName, points: entry.points, reason: entry.reason, ref_id: entry.refId, at: entry.at }));
  }

  /* ---- knowledge base actions ---- */
  /* Every step block must carry a name AND a description — that's the
     mandate that keeps SOPs clean and extensible step by step. */
  function cleanSteps(steps) {
    const clean = (steps || [])
      .map(s => ({ name: s.name.trim(), detail: toBulletPoints(s.detail) }))
      .filter(s => s.name || s.detail);
    if (clean.length === 0) return { error: "Add at least one step" };
    const incomplete = clean.find(s => !s.name || !s.detail);
    if (incomplete) return { error: "Every step needs both a step name and a description" };
    return { steps: clean };
  }

  function createCard(country, section, department) {
    if (!newCard.title.trim()) { pushToast("Card title is required"); return; }
    const { steps, error } = cleanSteps(newCard.steps);
    if (error) { pushToast(error); return; }
    const card = {
      id: "k" + Date.now(), title: newCard.title, body: stepsToBody(steps), steps,
      region: country, country, section, department: department || 'country_policies', owner: currentUser.id,
      status: "draft", author: currentUser.name, updatedAt: new Date().toISOString().slice(0, 10),
    };
    setKbCards(prev => prev.some(c => c.id === card.id) ? prev : [card, ...prev]);
    dbWrite(supabase.from("kb_cards").insert({ id: card.id, title: card.title, body: card.body, steps: card.steps, region: country, country, section, department: card.department, owner: card.owner, status: card.status, author: card.author, updated_at: card.updatedAt }));
    addAudit("Create knowledge card", `Draft created: "${card.title}" (${country.toUpperCase()} / ${section})`, country);
    awardPoints(currentUser.id, currentUser.name, POINTS.newCard, `New knowledge card: "${card.title}"`, card.id);
    setNewCard({ title: "", steps: [emptyStep()] });
    pushToast(`+${POINTS.newCard} pts — ` + (currentUser.role === "admin" ? "draft card saved" : "draft card saved, pending Gaurav's vetting"));
  }

  function publishCard(card) {
    const updatedAt = new Date().toISOString().slice(0, 10);
    setKbCards(prev => prev.map(c => c.id === card.id ? { ...c, status: "published", updatedAt } : c));
    dbWrite(supabase.from("kb_cards").update({ status: "published", updated_at: updatedAt }).eq("id", card.id));
    addAudit("Publish knowledge card", `Published: "${card.title}"`, card.country);
    pushToast("Card published to knowledge base");
  }

  function unpublishCard(card) {
    const updatedAt = new Date().toISOString().slice(0, 10);
    setKbCards(prev => prev.map(c => c.id === card.id ? { ...c, status: "draft", updatedAt } : c));
    dbWrite(supabase.from("kb_cards").update({ status: "draft", updated_at: updatedAt }).eq("id", card.id));
    addAudit("Unpublish knowledge card", `Reverted to draft: "${card.title}"`, card.country);
    pushToast("Card reverted to draft");
  }

  /* Deleting a card cascades to its revisions and bot questions (DB-level
     ON DELETE CASCADE) so nothing is left orphaned. */
  function deleteCard(card) {
    setKbCards(prev => prev.filter(c => c.id !== card.id));
    setKbRevisions(prev => prev.filter(r => r.cardId !== card.id));
    setBotQuestions(prev => prev.filter(q => q.cardId !== card.id));
    dbWrite(supabase.from("kb_cards").delete().eq("id", card.id));
    addAudit("Delete knowledge card", `Deleted: "${card.title}"`, card.country);
    pushToast(`"${card.title}" deleted`);
  }

  /* ---- knowledge base: direct section save (SOP maker marks sections done as they go;
     Gaurav's review happens at publish time, not through a separate merge step) ---- */
  function saveCardSteps(card, steps) {
    const cleaned = steps.map(s => ({ name: (s.name || "").trim(), detail: toBulletPoints(s.detail || ""), status: s.status === "done" ? "done" : "pending" }));
    const body = stepsToBody(cleaned);
    const updatedAt = new Date().toISOString().slice(0, 10);
    setKbCards(prev => prev.map(c => c.id === card.id ? { ...c, body, steps: cleaned, updatedAt } : c));
    dbWrite(supabase.from("kb_cards").update({ body, steps: cleaned, updated_at: updatedAt }).eq("id", card.id));
    addAudit("Edit knowledge card", `Updated "${card.title}"`, card.country);
  }

  function saveCardTitle(card, title) {
    if (!title.trim() || title === card.title) return;
    const updatedAt = new Date().toISOString().slice(0, 10);
    setKbCards(prev => prev.map(c => c.id === card.id ? { ...c, title, updatedAt } : c));
    dbWrite(supabase.from("kb_cards").update({ title, updated_at: updatedAt }).eq("id", card.id));
    addAudit("Rename knowledge card", `Renamed to "${title}"`, card.country);
  }

  function openKbCard(regionId, card, sectionIndex) {
    setView("kb");
    setKbTab(regionId);
    setKbDept(card.department);
    setKbOpenCardId(card.id);
    setKbShowSummary(false);
    setKbTreeExpanded(prev => ({ ...prev, [`r:${regionId}`]: true, [`d:${regionId}:${card.department}`]: true, [`c:${card.id}`]: true }));
    const steps = cardSteps(card);
    let idx = sectionIndex;
    if (idx == null) {
      const firstPending = steps.findIndex(s => s.status !== "done");
      idx = firstPending === -1 ? 0 : firstPending;
    }
    setKbActiveSection(idx);
  }

  function selectKbRegion(regionId) {
    setView("kb");
    setKbTab(regionId);
    setKbDept(null);
    setKbShowSummary(false);
    setKbOpenCardId(null);
  }

  function selectKbDept(regionId, deptId) {
    setView("kb");
    setKbTab(regionId);
    setKbDept(deptId);
    setKbShowSummary(false);
    setKbOpenCardId(null);
  }

  function mergeRevision(rev) {
    const updatedAt = new Date().toISOString().slice(0, 10);
    const decidedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
    /* Merging an edit also clears any open update request on the card. */
    setKbCards(prev => prev.map(c => c.id === rev.cardId ? { ...c, title: rev.title, body: rev.body, steps: rev.steps || c.steps, updatedAt, updateRequest: "", updateRequestedBy: null, updateRequestedAt: null } : c));
    setKbRevisions(prev => prev.map(r => r.id === rev.id ? { ...r, status: "merged", decidedAt, decidedBy: currentUser.name } : r));
    dbWrite(supabase.from("kb_cards").update({ title: rev.title, body: rev.body, steps: rev.steps, updated_at: updatedAt, update_request: "", update_requested_by: null, update_requested_at: null }).eq("id", rev.cardId));
    dbWrite(supabase.from("kb_revisions").update({ status: "merged", decided_at: decidedAt, decided_by: currentUser.name }).eq("id", rev.id));
    addAudit("Merge card revision", `Merged ${rev.authorName}'s edit into "${rev.title}"`, "-");
    awardPoints(rev.authorId, rev.authorName, POINTS.mergedRevision, `Edit merged into "${rev.title}"`, rev.id);
    pushToast(`Merged ${rev.authorName}'s revision (+${POINTS.mergedRevision} pts to ${rev.authorName})`);
  }

  function rejectRevision(rev) {
    const decidedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
    setKbRevisions(prev => prev.map(r => r.id === rev.id ? { ...r, status: "rejected", decidedAt, decidedBy: currentUser.name } : r));
    dbWrite(supabase.from("kb_revisions").update({ status: "rejected", decided_at: decidedAt, decided_by: currentUser.name }).eq("id", rev.id));
    addAudit("Reject card revision", `Rejected ${rev.authorName}'s edit to "${rev.title}"`, "-");
    pushToast(`Rejected ${rev.authorName}'s revision`);
  }

  /* ---- knowledge base: assignment & update requests (admin) ---- */
  function assignCard(card, userId) {
    const assignee = users.find(u => u.id === userId);
    setKbCards(prev => prev.map(c => c.id === card.id ? { ...c, assignedTo: userId || null } : c));
    dbWrite(supabase.from("kb_cards").update({ assigned_to: userId || null }).eq("id", card.id));
    addAudit("Assign knowledge card", userId ? `"${card.title}" assigned to ${assignee?.name || userId}` : `"${card.title}" unassigned`, card.country);
    pushToast(userId ? `Card assigned to ${assignee?.name || userId}` : "Card unassigned");
  }

  function requestCardUpdate(card, note) {
    if (!note.trim()) { pushToast("Describe what needs updating"); return; }
    const at = new Date().toISOString().slice(0, 16).replace("T", " ");
    setKbCards(prev => prev.map(c => c.id === card.id ? { ...c, updateRequest: note, updateRequestedBy: currentUser.name, updateRequestedAt: at } : c));
    dbWrite(supabase.from("kb_cards").update({ update_request: note, update_requested_by: currentUser.name, update_requested_at: at }).eq("id", card.id));
    addAudit("Request card update", `Update requested on "${card.title}": ${note}`, card.country);
    pushToast("Update requested — the assignee will see it on the card");
  }

  function clearUpdateRequest(card) {
    setKbCards(prev => prev.map(c => c.id === card.id ? { ...c, updateRequest: "", updateRequestedBy: null, updateRequestedAt: null } : c));
    dbWrite(supabase.from("kb_cards").update({ update_request: "", update_requested_by: null, update_requested_at: null }).eq("id", card.id));
    addAudit("Clear update request", `Update request cleared on "${card.title}"`, card.country);
    pushToast("Update request cleared");
  }

  /* ---- SOP completeness bot ---- */
  function scanForGaps() {
    const existing = new Set(botQuestions.filter(q => q.status !== "dismissed").map(q => q.cardId + "||" + q.question));
    const createdAt = new Date().toISOString().slice(0, 16).replace("T", " ");
    const created = [];
    kbCards.forEach(card => {
      detectGaps(card).forEach(question => {
        const key = card.id + "||" + question;
        if (existing.has(key)) return;
        existing.add(key);
        created.push({
          id: "q" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
          cardId: card.id, cardTitle: card.title, country: card.country, section: card.section,
          question, status: "open", answer: "", answeredBy: null, answeredByName: null,
          createdAt, answeredAt: null,
        });
      });
    });
    if (created.length === 0) { pushToast("No new gaps found — the SOPs look complete to the bot"); return; }
    setBotQuestions(prev => [...created, ...prev]);
    created.forEach(q => dbWrite(supabase.from("bot_questions").insert({
      id: q.id, card_id: q.cardId, card_title: q.cardTitle, country: q.country, section: q.section,
      question: q.question, status: q.status, created_at: q.createdAt,
    })));
    addAudit("SOP bot scan", `${created.length} new question${created.length > 1 ? "s" : ""} raised across the knowledge base`, "-");
    pushToast(`SOP bot raised ${created.length} question${created.length > 1 ? "s" : ""} — answers earn points`);
  }

  function answerBotQuestion(q, text) {
    const answeredAt = new Date().toISOString().slice(0, 16).replace("T", " ");
    setBotQuestions(prev => prev.map(x => x.id === q.id ? { ...x, status: "answered", answer: text, answeredBy: currentUser.id, answeredByName: currentUser.name, answeredAt } : x));
    dbWrite(supabase.from("bot_questions").update({ status: "answered", answer: text, answered_by: currentUser.id, answered_by_name: currentUser.name, answered_at: answeredAt }).eq("id", q.id));
    addAudit("Answer SOP bot question", `Answered on "${q.cardTitle}": ${q.question}`, q.country);
    awardPoints(currentUser.id, currentUser.name, POINTS.botAnswer, `Answered SOP bot on "${q.cardTitle}"`, q.id);
    pushToast(`Answer accepted — +${POINTS.botAnswer} pts. Submit it to the card for +${POINTS.submitToCard} more.`);
  }

  function submitAnswerToCard(q) {
    const card = kbCards.find(c => c.id === q.cardId);
    if (!card) { pushToast("The card behind this question no longer exists"); return; }
    /* The accepted answer becomes a NEW STEP on the card. */
    const steps = [...cardSteps(card), { name: stepNameFor(q.question), detail: toBulletPoints(q.answer) }];
    const rev = {
      id: "r" + Date.now(), cardId: card.id, title: card.title,
      body: stepsToBody(steps), steps,
      authorId: q.answeredBy, authorName: q.answeredByName, note: `SOP bot: ${q.question}`,
      status: "pending", createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      decidedAt: null, decidedBy: null,
    };
    setKbRevisions(prev => prev.some(r => r.id === rev.id) ? prev : [rev, ...prev]);
    dbWrite(supabase.from("kb_revisions").insert({ id: rev.id, card_id: rev.cardId, title: rev.title, body: rev.body, steps: rev.steps, author_id: rev.authorId, author_name: rev.authorName, note: rev.note, status: "pending", created_at: rev.createdAt }));
    setBotQuestions(prev => prev.map(x => x.id === q.id ? { ...x, status: "submitted" } : x));
    dbWrite(supabase.from("bot_questions").update({ status: "submitted" }).eq("id", q.id));
    addAudit("Submit bot answer to card", `Answer on "${q.cardTitle}" submitted as a revision`, q.country);
    awardPoints(q.answeredBy, q.answeredByName, POINTS.submitToCard, `Answer submitted to "${card.title}"`, q.id);
    pushToast(`+${POINTS.submitToCard} pts to ${q.answeredByName} — revision awaiting Gaurav's merge`);
  }

  function dismissBotQuestion(q) {
    setBotQuestions(prev => prev.map(x => x.id === q.id ? { ...x, status: "dismissed" } : x));
    dbWrite(supabase.from("bot_questions").update({ status: "dismissed" }).eq("id", q.id));
    addAudit("Dismiss SOP bot question", `Dismissed on "${q.cardTitle}": ${q.question}`, q.country);
    pushToast("Question dismissed");
  }

  /* ---- access control actions ---- */
  function toggleUserActive(user) {
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: !u.active } : u));
    dbWrite(supabase.from("users").update({ active: !user.active }).eq("id", user.id));
    addAudit("Toggle user access", `${user.name} set to ${!user.active ? "active" : "inactive"}`, user.region ? REGIONS[user.region].short : "-");
    pushToast(`${user.name} is now ${!user.active ? "active" : "inactive"}`);
  }

  if (!currentUser) return <LoginScreen onRequestOtp={requestOtp} onVerifyOtp={verifyOtp} onTempPassword={loginWithTempPassword} restoring={!authChecked || (!!session && !dataReady)} />;

  const visibleNav = NAV.filter(n => n.roles.includes(currentUser.role));
  const scopedPayments = currentUser.role === "agent"
    ? payments.filter(p => p.region === currentUser.region)
    : (regionFilter === "all" ? payments : payments.filter(p => p.region === regionFilter));

  return (
    <div style={styles.appShell}>
      <style>{CSS}</style>
      {toast && <div className="mo-toast">{toast}</div>}

      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <img src="/noon-minutes-logo.png" alt="noon minutes" style={{ height: 34, width: "auto", display: "block" }} />
          <div>
            <div style={styles.brandSub}>Ops console</div>
          </div>
        </div>

        <nav style={{ marginTop: 28 }}>
          {visibleNav.map(item => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <div key={item.id}>
                <button className="mo-navitem" style={active ? styles.navItemActive : styles.navItem} onClick={() => {
                  setView(item.id);
                  if (item.id === "bau") setPayView("hub");
                  if (item.id === "kb") { setKbShowSummary(true); setKbOpenCardId(null); setKbDept(null); }
                  if (item.id === "ai") setAiTab(null);
                }}>
                  <Icon size={17} style={{ marginRight: 10, flexShrink: 0 }} />
                  {item.label}
                </button>

                {item.id === "kb" && active && (
                  <KbSidebarTree cards={kbCards} kbTab={kbShowSummary ? null : kbTab} kbDept={kbDept} onSelectRegion={selectKbRegion} onSelectDept={selectKbDept}
                    openCardId={kbOpenCardId} onOpenCard={openKbCard}
                    expanded={kbTreeExpanded} setExpanded={setKbTreeExpanded} />
                )}

                {item.id === "ai" && active && (
                  <div style={{ marginLeft: 6, marginBottom: 6 }}>
                    <button className="mo-navitem" style={{ ...styles.navItem, padding: "9px 12px", fontSize: 12.5, border: "none", borderLeft: `3px solid ${aiTab === "chat" ? "var(--mo-accent)" : "transparent"}`, color: aiTab === "chat" ? "var(--mo-accent-2)" : "#475569", ...(aiTab === "chat" ? KB_ACTIVE_STYLE : { background: "none" }) }} onClick={() => setAiTab("chat")}>
                      <Bot size={15} style={{ marginRight: 8, flexShrink: 0 }} />Chatbot
                    </button>
                    <button className="mo-navitem" style={{ ...styles.navItem, padding: "9px 12px", fontSize: 12.5, border: "none", borderLeft: `3px solid ${aiTab === "sopbot" ? "var(--mo-accent)" : "transparent"}`, color: aiTab === "sopbot" ? "var(--mo-accent-2)" : "#475569", ...(aiTab === "sopbot" ? KB_ACTIVE_STYLE : { background: "none" }) }} onClick={() => setAiTab("sopbot")}>
                      <Sparkles size={15} style={{ marginRight: 8, flexShrink: 0 }} />SOP completeness bot
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {view !== "kb" && view !== "ai" && (
          <div style={styles.regionLegend}>
            <div style={{ fontSize: 11, color: "var(--mo-accent)", marginBottom: 6, letterSpacing: "0.14em", fontWeight: 900, textTransform: "uppercase" }}>Regions</div>
            {Object.values(REGIONS).map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", fontSize: 12.5, fontWeight: 700, marginBottom: 3, color: "var(--mo-ink)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, marginRight: 8, flexShrink: 0 }} />
                {r.name}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(15,23,42,0.08)" }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--mo-ink)" }}>{currentUser.role === "admin" ? "Team lead" : "Team member"}</div>
          <div style={{ fontSize: 11, color: "var(--mo-muted)" }}>{currentUser.role === "admin" ? "Reviewer · Publisher" : "Editor · All sections"}</div>
        </div>
      </aside>

      {view === "kb" && kbOpenCardId && (() => {
        const openCard = kbCards.find(c => c.id === kbOpenCardId);
        return openCard ? (
          <KbSectionOutline card={openCard} activeSection={kbActiveSection} setActiveSection={setKbActiveSection} />
        ) : null;
      })()}

      <div style={styles.main}>
        <header style={styles.header}>
          <div>
            <div style={styles.headerTitle}>{NAV.find(n => n.id === view)?.label || "Payments"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--mo-ink)" }}>{currentUser.name}</div>
              <div style={{ fontSize: 12, color: "var(--mo-muted)", textTransform: "capitalize" }}>
                {currentUser.role}{currentUser.region ? ` · ${REGIONS[currentUser.region].short}` : ""}
              </div>
            </div>
            <button className="mo-btn" onClick={logout}><LogOut size={14} style={{ marginRight: 6 }} />Switch user</button>
          </div>
        </header>
        <div style={styles.headerAccent} />

        <main style={styles.content}>
          {view === "bau" && (payView === "status" ? (
            <div>
              <button className="mo-btn mo-btn-sm" style={{ marginBottom: 4 }} onClick={() => setPayView("hub")}>← Back to Payments</button>
              <PaymentStatus payments={scopedPayments} currentUser={currentUser} onChange={changePaymentStatus} />
            </div>
          ) : (
            <PaymentsHub
              onOpenPaymentStatus={() => setPayView("status")}
              onOpenKb={() => selectKbRegion("uae")}
              onLocked={name => pushToast(`"${name}" is coming next — we'll build this out as we proceed`)}
            />
          ))}

          {view === "kb" && (
            kbShowSummary && !kbOpenCardId ? (
              <KbSummaryDashboard cards={kbCards} onSelectRegion={selectKbRegion} />
            ) : (
              <CountryKB key={kbTab} country={kbTab} department={kbDept} cards={kbCards} revisions={kbRevisions} users={users} currentUser={currentUser}
                newCard={newCard} setNewCard={setNewCard} onCreate={createCard} onPublish={publishCard} onUnpublish={unpublishCard} onDelete={deleteCard}
                onSaveSteps={saveCardSteps} onSaveTitle={saveCardTitle} onMerge={mergeRevision} onReject={rejectRevision}
                onAssign={assignCard} onRequestUpdate={requestCardUpdate} onClearUpdate={clearUpdateRequest}
                onOpenCard={openKbCard} openCardId={kbOpenCardId} setOpenCardId={setKbOpenCardId}
                activeSection={kbActiveSection} setActiveSection={setKbActiveSection} />
            )
          )}

          {view === "ai" && (
            <div>
              {aiTab === null && (
                <div className="kb-grid">
                  <PlayingCard
                    tint={CARD_TINT}
                    pip="AI"
                    icon={<Bot size={24} />}
                    title="Chatbot"
                    footer={<span style={{ fontSize: 12, color: "var(--mo-muted)" }}>Ask about payment operations</span>}
                    onOpen={() => setAiTab("chat")}
                  />
                  <PlayingCard
                    tint={CARD_TINT}
                    pip="AI"
                    icon={<Sparkles size={24} />}
                    title="SOP completeness bot"
                    footer={<span style={{ fontSize: 12, color: "var(--mo-muted)" }}>Scans cards, asks the team, fills gaps</span>}
                    onOpen={() => setAiTab("sopbot")}
                  />
                </div>
              )}
              {aiTab === "chat" && <KbBot cards={kbCards} currentUser={currentUser} />}
              {aiTab === "sopbot" && (
                <SopBot questions={botQuestions} users={users} currentUser={currentUser} pointsLedger={pointsLedger}
                  onScan={scanForGaps} onAnswer={answerBotQuestion} onSubmitToCard={submitAnswerToCard} onDismiss={dismissBotQuestion} />
              )}
            </div>
          )}

          {view === "admin" && (
            <div>
              <SubTabs
                tabs={[...(currentUser.role === "admin" ? [{ id: "access", label: "Access control" }] : []), { id: "audit", label: "Audit log" }]}
                active={adminTab} onChange={setAdminTab}
              />
              {adminTab === "access" && currentUser.role === "admin" && <AccessControl users={users} onToggle={toggleUserActive} onAddUser={addTeamMember} />}
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
  { cls: "blue", tag: "PAY", title: "Payments Hub", sub: "Fulfillment and logistics workstreams" },
  { cls: "green", tag: "KB", title: "Knowledge Base", sub: "Step-by-step SOP cards per country" },
  { cls: "orange", tag: "BOT", title: "KB Bot", sub: "Answers straight from the SOP steps" },
  { cls: "purple", tag: "SOP", title: "SOP Completeness Bot", sub: "Finds gaps, asks the team, fills SOPs" },
  { cls: "cyan", tag: "PTS", title: "Knowledge Points", sub: "Earn points for every contribution" },
  { cls: "pink", tag: "AL", title: "Audit Log", sub: "Every action tracked and traceable" },
];

function LoginScreen({ onRequestOtp, onVerifyOtp, onTempPassword, restoring }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function sendCode(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const err = await onRequestOtp(email);
    if (err) setError(err);
    else { setStep("code"); setNotice(`Code sent to ${email.trim()} — check your inbox.`); }
    setBusy(false);
  }

  async function submitCode(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const err = await onVerifyOtp(email, code);
    if (err) setError(err);
    setBusy(false);
  }

  async function resend() {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    const err = await onRequestOtp(email);
    if (err) setError(err);
    else setNotice(`New code sent to ${email.trim()}.`);
    setBusy(false);
  }

  async function submitTempPassword(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const err = await onTempPassword(email, tempPassword);
    if (err) setError(err);
    setBusy(false);
  }

  return (
    <main className="portal-login">
      <style>{CSS}</style>
      <img className="portal-bg" src="/login-hero.png" alt="" />
      <div className="portal-overlay" />

      <header className="portal-header">
        <div className="brand-lockup portal-brand">
          <img className="noon-mark" src="/noon-minutes-logo.png" alt="noon minutes" />
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
          <img className="noon-mark card-mark" src="/noon-minutes-logo.png" alt="noon minutes" />
          <h2>noon Ops Console</h2>
          <p className="portal-card-subtitle">Secure Portal Access</p>
          <div className="card-rule" />
          <h3>Welcome back!</h3>
          <p className="intro">Login to continue to your operations workspace.</p>

          {error && <div className="portal-alert">{error}</div>}
          {!error && notice && <div className="portal-alert" style={{ background: "rgba(232,52,42,0.06)", borderColor: "rgba(232,52,42,0.25)", color: "#c81e1e" }}>{notice}</div>}
          {restoring && <div className="portal-alert" style={{ background: "rgba(232,52,42,0.06)", borderColor: "rgba(232,52,42,0.25)", color: "#c81e1e" }}>Signing you in…</div>}

          {step === "email" && (
            <form onSubmit={sendCode} className="portal-form">
              <label htmlFor="login-email">Official noon email</label>
              <div className="input-shell">
                <span>ID</span>
                <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" placeholder="yourname@noon.com" required />
              </div>

              <button type="submit" disabled={busy}>{busy ? "Sending code…" : "Send verification code"} <span>-&gt;</span></button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={submitCode} className="portal-form">
              <label htmlFor="login-code">6-digit code</label>
              <div className="input-shell">
                <span>OTP</span>
                <input id="login-code" type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} placeholder="123456" required />
              </div>

              <button type="submit" disabled={busy}>{busy ? "Verifying…" : "Verify & sign in"} <span>-&gt;</span></button>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <button type="button" className="sso-button" style={{ width: "auto", padding: "6px 12px", fontSize: 12.5 }} onClick={() => { setStep("email"); setCode(""); setError(""); setNotice(""); }}>Use a different email</button>
                <button type="button" className="sso-button" style={{ width: "auto", padding: "6px 12px", fontSize: 12.5 }} disabled={busy} onClick={resend}>Resend code</button>
              </div>
            </form>
          )}

          {step === "temp" && (
            <form onSubmit={submitTempPassword} className="portal-form">
              <label htmlFor="login-email-temp">Official noon email</label>
              <div className="input-shell">
                <span>ID</span>
                <input id="login-email-temp" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" placeholder="yourname@noon.com" required />
              </div>
              <label htmlFor="login-temp-pw">Temporary password</label>
              <div className="input-shell">
                <span>PW</span>
                <input id="login-temp-pw" type="password" value={tempPassword} onChange={e => setTempPassword(e.target.value)} autoComplete="current-password" placeholder="Ask Gaurav" required />
              </div>

              <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"} <span>-&gt;</span></button>
            </form>
          )}

          {step !== "temp" ? (
            <p className="support-copy">
              Email trouble? <a href="#" onClick={e => { e.preventDefault(); setStep("temp"); setError(""); setNotice(""); }}>Use the temporary password</a> while OTP delivery is being fixed.
            </p>
          ) : (
            <p className="support-copy">
              <a href="#" onClick={e => { e.preventDefault(); setStep("email"); setError(""); setNotice(""); }}>Back to email code sign-in</a>
            </p>
          )}
          <p className="support-copy">Access is limited to noon.com team members added by Gaurav. New here? Ask Gaurav to add your noon ID first.</p>
        </div>
      </section>
    </main>
  );
}

const PAYMENT_CARDS = [
  { id: "upload_summary", title: "Upload summary and send mails", desc: "Upload the cycle summary and trigger vendor mails", icon: Send, tint: "blue" },
  { id: "create_po_srn", title: "Create POs and SRNs", desc: "Raise purchase orders and service receipt notes", icon: PlusCircle, tint: "green" },
  { id: "payment_status", title: "Check payment status", desc: "Live status of vendor payments", icon: CreditCard, tint: "orange" },
  { id: "approve_po_srn", title: "Approve POs and SRNs", desc: "Review and approve pending POs and SRNs", icon: CheckCircle2, tint: "purple" },
  { id: "credit_notes", title: "Credit Note Tracker", desc: "Track credit notes raised and settled", icon: ListChecks, tint: "cyan" },
  { id: "vendor_contracts", title: "Vendor contracts and rate cards", desc: "Contracts and agreed rates by vendor", icon: Pencil, tint: "pink" },
  { id: "consumables", title: "Consumables Contracts, Rate cards and Monthly Budgets", desc: "Consumables agreements and budget tracking", icon: Package, tint: "blue" },
  { id: "adhoc_service", title: "Ad-hoc Service tracking: Car and others", desc: "One-off services and vehicle hire tracking", icon: Truck, tint: "green" },
  { id: "payroll", title: "Payroll processing", desc: "Monthly payroll runs and approvals", icon: Wallet, tint: "orange" },
  { id: "payments_kb", title: "Payments knowledge base", desc: "SOPs and how-tos for payment operations", icon: BookOpen, tint: "purple" },
];

function PaymentsHub({ onOpenPaymentStatus, onOpenKb, onLocked }) {
  const [group, setGroup] = useState("fulfillment");
  const groupLabel = group === "fulfillment" ? "Fulfillment" : "Logistics";

  function handleClick(card) {
    if (card.id === "payment_status") return onOpenPaymentStatus();
    if (card.id === "payments_kb") return onOpenKb();
    onLocked(`${groupLabel} — ${card.title}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 170px)" }}>
      <SubTabs
        tabs={[{ id: "fulfillment", label: "Fulfillment" }, { id: "logistics", label: "Logistics" }]}
        active={group} onChange={setGroup}
      />
      <p style={{ fontSize: 13.5, color: "var(--mo-muted)", margin: "14px 0 0" }}>
        {groupLabel} payment operations — pick a workstream to continue.
      </p>
      <div className="kb-grid">
        {PAYMENT_CARDS.map(card => {
          const Icon = card.icon;
          return (
            <PlayingCard key={card.id}
              tint={CARD_TINT}
              pip="PAY"
              icon={<Icon size={24} />}
              title={card.title}
              footer={<span style={{ fontSize: 12, fontWeight: 800, color: "var(--mo-accent)", display: "inline-flex", alignItems: "center", gap: 4 }}>Open <ChevronRight size={13} /></span>}
              onOpen={() => handleClick(card)}
            />
          );
        })}
      </div>
    </div>
  );
}

function BauConsole({ bauState, currentUser, onCheck, onReset }) {
  const [expanded, setExpanded] = useState(null);
  const palette = { Fulfillment: "#18a558", Logistics: "#64748b" };
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--mo-muted)", marginBottom: 16, maxWidth: 640 }}>
        Recurring spend categories your team runs every cycle. Tap a card to open its checklist.
      </p>
      {BAU_GROUPS.map(group => (
        <div key={group} style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: palette[group] }} />
            <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--mo-ink)", textTransform: "uppercase", letterSpacing: 0.5 }}>{group}</span>
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

function PaymentStatus({ payments, currentUser, onChange }) {
  const canEdit = currentUser.role === "admin";
  return (
    <div>
      <p style={{ fontSize: 13.5, color: "var(--mo-muted)", margin: "14px 0" }}>
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
                <td style={{ fontWeight: 800, color: "var(--mo-ink)" }}>{p.customer}</td>
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

const COUNTRY_LABEL = { uae: "UAE", ksa: "KSA", egypt: "Egypt", global: "Global" };

/* Every card tile uses the same red base tint — color is reserved for status
   (published/done/success), never for card category or identity. */
const CARD_TINT = ["#e8342a", "#c81e1e"];
const deptTint = () => CARD_TINT;
const kbTint = () => CARD_TINT;

/* Shared flip-card tile: used for knowledge cards, payment workstreams and
   the AI workspace picker so every "choose one of these" screen looks the same. */
function PlayingCard({ tint, pip, badges, icon, title, footer, onOpen }) {
  const [c1, c2] = tint;
  return (
    <button className="kb-pcard" style={{ "--kb-c1": c1, "--kb-c2": c2 }} onClick={onOpen}>
      {pip && <span className="kb-pip kb-pip-top">{pip}</span>}
      {pip && <span className="kb-pip kb-pip-bottom">{pip}</span>}
      {badges && <span className="kb-pcard-badges">{badges}</span>}
      <span className="kb-medallion">{icon}</span>
      <span className="kb-pcard-title kb-pcard-title-big">{title}</span>
      {footer && <span className="kb-pcard-foot">{footer}</span>}
    </button>
  );
}

function KbPlayingCard({ card, users, currentUser, pendingCount, onOpen }) {
  const owner = users.find(u => u.id === card.owner);
  const ownerName = owner ? owner.name : card.author;
  const initials = (ownerName || "?").replace(/[^A-Za-z ]/g, "").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const pip = card.section === "fulfillment" ? "FF" : card.section === "logistics" ? "LG" : (COUNTRY_LABEL[card.country] || "").toUpperCase();
  const mine = currentUser && card.assignedTo === currentUser.id;
  return (
    <PlayingCard
      tint={kbTint(card)}
      pip={pip}
      badges={
        <>
          <StatusPill status={card.status} />
          {mine && <span className="mo-pill mo-pill-neutral">Yours</span>}
          {card.updateRequest && <span className="mo-pill mo-pill-warn">Update due</span>}
          {pendingCount > 0 && <span className="mo-pill mo-pill-warn">{pendingCount} pending</span>}
        </>
      }
      icon={<BookOpen size={24} />}
      title={card.title}
      footer={<><span className="kb-avatar">{initials}</span><span className="kb-owner-name">{ownerName}</span></>}
      onOpen={onOpen}
    />
  );
}

function KbBot({ cards, currentUser }) {
  const published = cards.filter(c => c.status === "published");
  const draftCount = cards.length - published.length;
  const [messages, setMessages] = useState([{
    role: "bot",
    text: `Hi ${"" + (currentUser.name || "")}! I'm the Ops KB bot, connected live to the team knowledge base. I can read ${cards.length} card${cards.length === 1 ? "" : "s"} (${published.length} published, ${draftCount} draft) across UAE, KSA and Egypt. Ask me anything about payment operations — I'll answer with the exact points from the cards and cite my sources.`,
    sources: [],
  }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  function answerFor(question) {
    const tokens = (question.toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => t.length > 2);
    if (cards.length === 0) {
      return { text: "My knowledge base is empty right now — I have nothing to learn from yet. Add knowledge cards and I'll start answering from them.", sources: [] };
    }
    /* Score every STEP of every card, so the answer is the specific step
       that matches — never a dump of the whole card. */
    const hits = [];
    cards.forEach(card => {
      const titleHits = tokens.filter(t => card.title.toLowerCase().includes(t)).length;
      cardSteps(card).forEach((s, idx) => {
        let score = titleHits * 2 + (card.status === "published" ? 0.5 : 0);
        tokens.forEach(t => {
          if (s.name.toLowerCase().includes(t)) score += 3;
          if (s.detail.toLowerCase().includes(t)) score += 1;
        });
        if (score >= 2) hits.push({ card, idx, step: s, score });
      });
    });
    hits.sort((a, b) => b.score - a.score);
    if (hits.length === 0) {
      return { text: "I couldn't find anything in the knowledge base about that yet. If you know the answer, add it as a knowledge card — every card makes me smarter. You can also check the SOP Bot tab: answering its questions fills gaps like this one.", sources: [] };
    }
    const bestCard = hits[0].card;
    const fromBest = hits.filter(h => h.card.id === bestCard.id).slice(0, 2).sort((a, b) => a.idx - b.idx);
    const caveat = bestCard.status === "draft" ? " (draft — not yet vetted by Gaurav)" : "";
    const text = `${bestCard.title}${caveat}\n\n` + fromBest
      .map(h => `Step ${h.idx + 1} — ${h.step.name}\n${h.step.detail}`)
      .join("\n\n");
    const sourceCards = [];
    hits.forEach(h => { if (!sourceCards.some(c => c.id === h.card.id)) sourceCards.push(h.card); });
    return { text, sources: sourceCards.slice(0, 2) };
  }

  function send(e) {
    e.preventDefault();
    const q = input.trim();
    if (!q || thinking) return;
    setMessages(prev => [...prev, { role: "user", text: q, sources: [] }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "bot", ...answerFor(q) }]);
      setThinking(false);
    }, 800);
  }

  return (
    <div style={{ maxWidth: 780, margin: "14px auto 0" }}>
      <div className="mo-card" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span className="kb-medallion" style={{ "--kb-c1": "#e8342a", "--kb-c2": "#c81e1e", width: 42, height: 42 }}><Bot size={20} /></span>
        <div>
          <div style={{ fontWeight: 900, fontSize: 15, color: "var(--mo-ink)" }}>Ops KB Bot <span className="mo-pill mo-pill-neutral" style={{ marginLeft: 6 }}>training</span></div>
          <div style={{ fontSize: 12, color: "var(--mo-muted)" }}>
            Connected to the knowledge base: {published.length} published + {draftCount} draft card{draftCount === 1 ? "" : "s"} across UAE, KSA and Egypt.
            Draft answers are flagged until Gaurav publishes them. Long-term goal: enough vetted knowledge for the bot to run the process without a human.
          </div>
        </div>
      </div>

      <div className="mo-card bot-thread">
        {messages.map((m, i) => (
          <div key={i} className={`bot-row ${m.role === "user" ? "bot-row-user" : ""}`}>
            {m.role === "bot" && <span className="bot-avatar"><Bot size={14} /></span>}
            <div className={m.role === "user" ? "bot-bubble-user" : "bot-bubble"}>
              <div style={{ whiteSpace: "pre-line" }}>{m.text}</div>
              {m.sources.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {m.sources.map(s => (
                    <span key={s.id} className="bot-source">
                      <BookOpen size={11} style={{ marginRight: 4 }} />{s.title} · {COUNTRY_LABEL[s.country]}/{s.section}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="bot-row">
            <span className="bot-avatar"><Bot size={14} /></span>
            <div className="bot-bubble" style={{ color: "var(--mo-muted)" }}><RefreshCw size={12} className="mo-spin" style={{ marginRight: 6 }} />reading the knowledge base…</div>
          </div>
        )}
        <form onSubmit={send} style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--mo-border)" }}>
          <input className="mo-input" placeholder="Ask the bot — e.g. how do I verify a bank transfer reference?" value={input} onChange={e => setInput(e.target.value)} />
          <button type="submit" className="mo-btn mo-btn-primary" disabled={thinking || !input.trim()} style={{ flexShrink: 0 }}><Send size={14} style={{ marginRight: 6 }} />Ask</button>
        </form>
      </div>
    </div>
  );
}

/* The SOP completeness bot interrogates the knowledge base: it scans every
   card for gaps, asks the team, and turns accepted answers into card
   revisions. Answers earn points; the leaderboard keeps it competitive. */
/* Group questions by their parent knowledge card so a card with several
   open questions reads as one panel instead of N separate loose boxes. */
function groupQuestionsByCard(list) {
  const order = [];
  const map = new Map();
  list.forEach(q => {
    if (!map.has(q.cardId)) { map.set(q.cardId, { cardId: q.cardId, cardTitle: q.cardTitle, country: q.country, section: q.section, items: [] }); order.push(q.cardId); }
    map.get(q.cardId).items.push(q);
  });
  return order.map(id => map.get(id));
}

function SopBot({ questions, users, currentUser, pointsLedger, onScan, onAnswer, onSubmitToCard, onDismiss }) {
  const [drafts, setDrafts] = useState({});
  const [feedback, setFeedback] = useState({});
  const isManager = currentUser.role === "admin";

  const open = questions.filter(q => q.status === "open");
  const answered = questions.filter(q => q.status === "answered");
  const submitted = questions.filter(q => q.status === "submitted");
  const openGroups = groupQuestionsByCard(open);
  const answeredGroups = groupQuestionsByCard(answered);

  const totals = {};
  pointsLedger.forEach(p => { totals[p.userId] = (totals[p.userId] || 0) + p.points; });
  const board = users.filter(u => u.active).map(u => ({ user: u, pts: totals[u.id] || 0 })).sort((a, b) => b.pts - a.pts);
  const myPts = totals[currentUser.id] || 0;

  function handleAnswer(q) {
    const text = (drafts[q.id] || "").trim();
    if (!text) return;
    if (!answerLooksComplete(text)) {
      setFeedback(f => ({ ...f, [q.id]: "Almost — I need specifics before this can go into an SOP. Add names, dates, amounts or system steps (a couple of full sentences)." }));
      return;
    }
    setFeedback(f => ({ ...f, [q.id]: "" }));
    setDrafts(d => ({ ...d, [q.id]: "" }));
    onAnswer(q, text);
  }

  return (
    <div style={{ maxWidth: 900, margin: "14px auto 0", display: "grid", gap: 14 }}>
      <div className="mo-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="kb-medallion" style={{ "--kb-c1": "#e8342a", "--kb-c2": "#c81e1e", width: 42, height: 42 }}><HelpCircle size={20} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: "var(--mo-ink)" }}>SOP Completeness Bot</div>
          <div style={{ fontSize: 12, color: "var(--mo-muted)" }}>
            I read every knowledge card and assume it's incomplete until proven otherwise. I ask the questions; you answer for points; accepted answers
            become card revisions for Gaurav to merge. When I run out of questions, the SOPs are complete enough to automate.
          </div>
        </div>
        <span className="mo-pill mo-pill-success" style={{ flexShrink: 0 }}><Trophy size={11} style={{ marginRight: 4, verticalAlign: -1 }} />{myPts} pts — you</span>
        {isManager && (
          <button className="mo-btn mo-btn-sm mo-btn-primary" style={{ flexShrink: 0 }} onClick={onScan}>
            <RefreshCw size={13} style={{ marginRight: 6 }} />Scan SOPs for gaps
          </button>
        )}
      </div>

      {/* Leaderboard */}
      <div className="mo-card">
        <div style={{ fontWeight: 900, fontSize: 13.5, marginBottom: 10 }}><Trophy size={14} style={{ marginRight: 6, verticalAlign: -2, color: "var(--mo-gold)" }} />Knowledge leaderboard</div>
        <div style={{ display: "grid", gap: 6 }}>
          {board.map((b, i) => (
            <div key={b.user.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
              <span style={{ width: 22, fontWeight: 900, color: i === 0 && b.pts > 0 ? "var(--mo-gold)" : "var(--mo-muted)" }}>#{i + 1}</span>
              <span style={{ flex: 1, fontWeight: 700 }}>{b.user.name}{b.user.id === currentUser.id && <span style={{ color: "var(--mo-muted)", fontWeight: 600 }}> (you)</span>}</span>
              <div className="mo-progress-track" style={{ width: 160 }}>
                <div className="mo-progress-fill" style={{ width: `${board[0].pts ? (b.pts / board[0].pts) * 100 : 0}%`, background: "linear-gradient(90deg, var(--mo-accent), var(--mo-accent-2))" }} />
              </div>
              <span style={{ fontWeight: 900, minWidth: 52, textAlign: "right" }}>{b.pts} pts</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--mo-muted)", marginTop: 10 }}>
          +{POINTS.newCard} new card · +{POINTS.mergedRevision} merged edit · +{POINTS.botAnswer} bot answer · +{POINTS.submitToCard} answer submitted to a card
        </div>
      </div>

      {/* Open questions — one panel per knowledge card */}
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 900, color: "var(--mo-muted)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "4px 0 10px" }}>
          Open questions ({open.length})
        </div>
        {open.length === 0 && <EmptyState text={isManager ? "No open questions. Run a scan — if nothing comes back, the SOPs look complete." : "No open questions right now. Check back after the next scan."} />}
        <div style={{ display: "grid", gap: 14 }}>
          {openGroups.map(group => (
            <div key={group.cardId} className="mo-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--mo-border)", flexWrap: "wrap" }}>
                <span className="bot-source"><BookOpen size={11} style={{ marginRight: 4 }} />{group.cardTitle} · {COUNTRY_LABEL[group.country] || group.country}/{group.section}</span>
                <span className="mo-pill mo-pill-neutral">{group.items.length} open</span>
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                {group.items.map((q, idx) => (
                  <div key={q.id} style={{ paddingTop: idx > 0 ? 14 : 0, borderTop: idx > 0 ? "1px solid var(--mo-border)" : "none" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span className="bot-avatar" style={{ background: "linear-gradient(135deg, #e8342a, #c81e1e)", flexShrink: 0 }}><HelpCircle size={14} /></span>
                      <div className="bot-bubble" style={{ maxWidth: "100%", flex: 1 }}>{q.question}</div>
                      {isManager && <button className="mo-btn mo-btn-sm" style={{ flexShrink: 0 }} onClick={() => onDismiss(q)} title="Dismiss"><XCircle size={12} /></button>}
                    </div>
                    {feedback[q.id] && (
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 8 }}>
                        <span className="bot-avatar" style={{ background: "linear-gradient(135deg, #e8342a, #c81e1e)" }}><HelpCircle size={14} /></span>
                        <div className="bot-bubble" style={{ maxWidth: "100%", color: "var(--mo-warn)" }}>{feedback[q.id]}</div>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <textarea className="mo-textarea" rows={2} placeholder={`Answer with specifics — earns +${POINTS.botAnswer} pts when the bot accepts it`}
                        value={drafts[q.id] || ""} onChange={e => setDrafts(d => ({ ...d, [q.id]: e.target.value }))} />
                      <button className="mo-btn mo-btn-sm mo-btn-primary" style={{ alignSelf: "flex-end", flexShrink: 0 }} disabled={!(drafts[q.id] || "").trim()} onClick={() => handleAnswer(q)}>
                        <Send size={12} style={{ marginRight: 6 }} />Answer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Answered — awaiting submission to the card, grouped the same way */}
      {answered.length > 0 && (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 900, color: "var(--mo-muted)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "4px 0 10px" }}>
            Accepted answers — ready to add to the knowledge cards ({answered.length})
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {answeredGroups.map(group => (
              <div key={group.cardId} className="mo-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--mo-border)", flexWrap: "wrap" }}>
                  <span className="bot-source"><BookOpen size={11} style={{ marginRight: 4 }} />{group.cardTitle} · {COUNTRY_LABEL[group.country] || group.country}/{group.section}</span>
                  <span className="mo-pill mo-pill-success">{group.items.length} accepted</span>
                </div>
                <div style={{ display: "grid", gap: 14 }}>
                  {group.items.map((q, idx) => (
                    <div key={q.id} style={{ paddingTop: idx > 0 ? 14 : 0, borderTop: idx > 0 ? "1px solid var(--mo-border)" : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12.5, color: "var(--mo-muted)" }}>{q.question}</span>
                        <span style={{ fontSize: 12, color: "var(--mo-muted)", whiteSpace: "nowrap" }}>by <strong>{q.answeredByName}</strong> · {q.answeredAt}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--mo-ink)", whiteSpace: "pre-line", background: "var(--mo-surface-alt)", borderRadius: 10, padding: "8px 10px" }}>{q.answer}</div>
                      {(isManager || q.answeredBy === currentUser.id) && (
                        <button className="mo-btn mo-btn-sm mo-btn-primary" style={{ marginTop: 10 }} onClick={() => onSubmitToCard(q)}>
                          <PlusCircle size={12} style={{ marginRight: 6 }} />Submit to knowledge card (+{POINTS.submitToCard} pts)
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {submitted.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--mo-muted)" }}>
          <CheckCircle2 size={12} style={{ marginRight: 4, verticalAlign: -2, color: "var(--mo-success)" }} />
          {submitted.length} answer{submitted.length > 1 ? "s" : ""} submitted as card revisions — they land in the cards once Gaurav merges them.
        </div>
      )}
    </div>
  );
}

const KB_TREE_REGIONS = [
  { id: "global", label: "Global Policy" },
  { id: "uae", label: "UAE" },
  { id: "ksa", label: "KSA" },
  { id: "egypt", label: "Egypt" },
];
const KB_TREE_DEPTS = [
  { id: "country_policies", label: "Country Policies" },
  { id: "fulfillment", label: "Fulfillment" },
  { id: "logistics", label: "Logistics" },
];

/* Animated integer counter — eases 0 → value whenever value changes. */
function CountUp({ value, duration = 700 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display}</>;
}

function KbSummaryDashboard({ cards, onSelectRegion }) {
  const globalCards = cards.filter(c => c.country === "global");
  const globalPublished = globalCards.filter(c => c.status === "published").length;
  const totalCreated = cards.length;
  const totalPublished = cards.filter(c => c.status === "published").length;

  const countryStats = KB_TREE_REGIONS.filter(r => r.id !== "global").map(region => {
    const regionCards = cards.filter(c => c.country === region.id);
    const depts = KB_TREE_DEPTS.map(dept => {
      const deptCards = regionCards.filter(c => c.department === dept.id);
      return { ...dept, created: deptCards.length, published: deptCards.filter(c => c.status === "published").length };
    });
    return { ...region, created: regionCards.length, published: regionCards.filter(c => c.status === "published").length, depts };
  });

  return (
    <div style={{ marginTop: 14 }}>
      <div className="mo-card kb-summary-anim" style={{ marginBottom: 20, textAlign: "center", padding: "28px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--mo-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Knowledge base overview</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: "var(--mo-ink)" }}>
          <CountUp value={totalPublished} /><span style={{ color: "var(--mo-muted)", fontSize: 22 }}> / <CountUp value={totalCreated} /></span>
        </div>
        <div style={{ fontSize: 13, color: "var(--mo-muted)", fontWeight: 700 }}>SOPs published across your team</div>
      </div>

      <div className="kb-summary-grid">
        <button className="mo-card mo-clickable kb-summary-anim" style={{ textAlign: "left", animationDelay: "0ms" }} onClick={() => onSelectRegion("global")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--mo-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Global Policy</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "8px 0 4px" }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: "var(--mo-ink)" }}><CountUp value={globalCards.length} /></span>
            <span style={{ fontSize: 13, color: "var(--mo-muted)", fontWeight: 700 }}>created</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mo-success)", marginBottom: 8 }}>{globalPublished} published</div>
          <div className="kb-summary-bar"><div className="kb-summary-bar-fill" style={{ width: `${globalCards.length ? Math.round((globalPublished / globalCards.length) * 100) : 0}%`, background: globalCards.length && globalPublished === globalCards.length ? "linear-gradient(90deg, var(--mo-success), #1FBE84)" : "linear-gradient(90deg, var(--mo-accent), var(--mo-accent-2))" }} /></div>
        </button>

        {countryStats.map((region, idx) => (
          <button key={region.id} className="mo-card mo-clickable kb-summary-anim" style={{ textAlign: "left", animationDelay: `${(idx + 1) * 90}ms` }} onClick={() => onSelectRegion(region.id)}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13.5, fontWeight: 900, color: "var(--mo-ink)" }}>{region.label}</span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--mo-success)" }}>{region.published}/{region.created} published</span>
            </div>
            <div style={{ display: "grid", gap: 9 }}>
              {region.depts.map(d => (
                <div key={d.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, color: "var(--mo-muted)", marginBottom: 3 }}>
                    <span>{d.label}</span>
                    <span>{d.published}/{d.created}</span>
                  </div>
                  <div className="kb-summary-bar"><div className="kb-summary-bar-fill" style={{ width: `${d.created ? Math.round((d.published / d.created) * 100) : 0}%`, background: d.created && d.published === d.created ? "linear-gradient(90deg, var(--mo-success), #1FBE84)" : "linear-gradient(90deg, var(--mo-accent), var(--mo-accent-2))" }} /></div>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* Shared accent for the active-hierarchy trail: region, department and the
   open card all get the same tint so the whole path reads as one thread. */
const KB_ACTIVE_STYLE = { background: "linear-gradient(135deg, rgba(232,52,42,0.1), rgba(200,30,30,0.16))", boxShadow: "inset 0 0 0 1px rgba(232,52,42,0.35)" };

function KbSidebarTree({ cards, kbTab, kbDept, onSelectRegion, onSelectDept, openCardId, onOpenCard, expanded, setExpanded }) {
  function toggle(key) { setExpanded(prev => ({ ...prev, [key]: !prev[key] })); }

  return (
    <div style={{ marginLeft: 6, marginBottom: 6 }}>
      {KB_TREE_REGIONS.map(region => {
          const regionKey = `r:${region.id}`;
          const regionCards = cards.filter(c => c.country === region.id);
          const regionOpen = !!expanded[regionKey];
          const regionActive = region.id === kbTab;
          return (
            <div key={region.id} style={{ marginBottom: 4 }}>
              <button onClick={() => { toggle(regionKey); onSelectRegion(region.id); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", border: "none", borderLeft: `3px solid ${regionActive ? "var(--mo-accent)" : "transparent"}`, cursor: "pointer", padding: "8px 8px", borderRadius: 8, color: regionActive ? "var(--mo-accent-2)" : "var(--mo-ink)", transition: "background 0.2s ease", ...(regionActive ? KB_ACTIVE_STYLE : { background: "none" }) }}>
                <span style={{ fontSize: 13.5, fontWeight: 800 }}>{region.label}</span>
                <span style={{ fontSize: 11.5, color: "var(--mo-muted)", fontWeight: 700 }}>{regionCards.length}</span>
              </button>

              {regionOpen && KB_TREE_DEPTS.map(dept => {
                const deptKey = `d:${region.id}:${dept.id}`;
                const deptCards = regionCards.filter(c => c.department === dept.id);
                const deptOpen = !!expanded[deptKey];
                const deptActive = regionActive && dept.id === kbDept;
                return (
                  <div key={dept.id} style={{ marginLeft: 10 }}>
                    <button onClick={() => { toggle(deptKey); onSelectDept(region.id, dept.id); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", border: "none", borderLeft: `3px solid ${deptActive ? "var(--mo-accent)" : "transparent"}`, cursor: "pointer", padding: "7px 8px", borderRadius: 8, color: deptActive ? "var(--mo-accent-2)" : "#475569", marginBottom: 3, transition: "background 0.2s ease", ...(deptActive ? KB_ACTIVE_STYLE : { background: "rgba(15,23,42,0.035)" }) }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800 }}>{dept.label}</span>
                      <span style={{ fontSize: 11, color: "var(--mo-muted)", fontWeight: 700 }}>{deptCards.length}</span>
                    </button>

                    {deptOpen && deptCards.map(card => {
                      const cardActive = openCardId === card.id;
                      return (
                        <div key={card.id} style={{ marginLeft: 10, marginBottom: 4 }}>
                          <button onClick={() => onOpenCard(region.id, card)} style={{ display: "block", width: "100%", border: "none", borderLeft: `3px solid ${cardActive ? "var(--mo-accent)" : "transparent"}`, cursor: "pointer", padding: "8px 8px", borderRadius: 8, textAlign: "left", transition: "background 0.2s ease", ...(cardActive ? KB_ACTIVE_STYLE : { background: "rgba(15,23,42,0.03)" }) }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                              <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--mo-ink)" }}>{card.title}</span>
                              <span style={{ fontSize: 10.5, fontWeight: 800, color: card.progress === 100 ? "#16a34a" : "var(--mo-muted)", whiteSpace: "nowrap" }}>{card.progress}%</span>
                            </div>
                            <div style={{ width: "100%", height: 4, background: "rgba(15,23,42,0.08)", borderRadius: 2, marginTop: 5, overflow: "hidden" }}>
                              <div style={{ width: `${card.progress}%`, height: "100%", background: card.progress === 100 ? "#16a34a" : "#94a3b8" }} />
                            </div>
                          </button>
                        </div>
                      );
                    })}
                    {deptOpen && deptCards.length === 0 && (
                      <div style={{ fontSize: 11, color: "var(--mo-muted)", padding: "4px 8px" }}>No cards yet</div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
    </div>
  );
}

/* Dedicated middle pane for the open card's 16 sections — keeps the region
   tree free of clutter and gives the outline room to breathe on its own. */
function KbSectionOutline({ card, activeSection, setActiveSection }) {
  const steps = cardSteps(card);
  return (
    <aside style={styles.sectionPane}>
      <div style={{ fontSize: 11, fontWeight: 900, color: "var(--mo-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Sections</div>
      <div style={{ fontWeight: 900, fontSize: 14, color: "var(--mo-ink)", marginBottom: 10, lineHeight: 1.3 }}>{card.title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 6, background: "rgba(15,23,42,0.08)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${card.progress}%`, height: "100%", background: card.progress === 100 ? "linear-gradient(90deg, var(--mo-success), #1FBE84)" : "linear-gradient(90deg, var(--mo-accent), var(--mo-accent-2))", transition: "width 0.5s ease" }} />
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--mo-muted)", whiteSpace: "nowrap" }}>{card.doneSections}/16</span>
      </div>
      <div style={{ display: "grid", gap: 2, overflowY: "auto", flex: 1 }}>
        {steps.map((s, i) => {
          const isActive = i === activeSection;
          const isDone = s.status === "done";
          return (
            <button key={i} onClick={() => setActiveSection(i)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none", borderLeft: `3px solid ${isActive ? "var(--mo-accent)" : "transparent"}`, background: isActive ? "rgba(232,52,42,0.06)" : "none", borderRadius: 6, padding: "7px 8px", cursor: "pointer", textAlign: "left", transition: "background 0.15s ease" }}>
              {isDone ? (
                <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Check size={10} color="#fff" />
                </span>
              ) : (
                <span style={{ width: 16, height: 16, borderRadius: "50%", border: `1.5px solid ${isActive ? "var(--mo-accent)" : "#94a3b8"}`, flexShrink: 0 }} />
              )}
              <span style={{ fontSize: 12.5, fontWeight: 700, color: isActive ? "var(--mo-accent-2)" : "var(--mo-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function CountryKB({ country, department, cards, revisions, users, currentUser, newCard, setNewCard, onCreate, onPublish, onUnpublish, onDelete, onSaveSteps, onSaveTitle, onMerge, onReject, onAssign, onRequestUpdate, onClearUpdate, onOpenCard, openCardId, setOpenCardId, activeSection, setActiveSection }) {
  const [showForm, setShowForm] = useState(false);
  const isManager = currentUser.role === "admin";
  const countryCards = cards.filter(c => c.country === country && (!department || c.department === department));
  const openCard = cards.find(c => c.id === openCardId && c.country === country);
  const deptLabel = department ? KB_TREE_DEPTS.find(d => d.id === department)?.label : null;

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "14px 0", flexWrap: "wrap" }}>
        {department ? (
          <button className="mo-btn mo-btn-sm mo-btn-primary" onClick={() => setShowForm(true)}>
            <PlusCircle size={13} style={{ marginRight: 6 }} />Add a card — {COUNTRY_LABEL[country]} / {deptLabel}
          </button>
        ) : (
          <span style={{ fontSize: 12.5, color: "var(--mo-muted)", fontWeight: 700 }}>Pick Country Policies, Fulfillment or Logistics on the left to add a card.</span>
        )}
      </div>

      {!openCard && (
        countryCards.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 0", color: "var(--mo-muted)" }}>
            <BookOpen size={28} style={{ opacity: 0.5, marginBottom: 10 }} />
            <div style={{ fontSize: 13.5 }}>No cards here yet{department ? " — add the first one." : "."}</div>
          </div>
        ) : (
          <div className="kb-grid">
            {countryCards.map(c => (
              <KbPlayingCard key={c.id} card={c} users={users} currentUser={currentUser}
                pendingCount={revisions.filter(r => r.cardId === c.id && r.status === "pending").length}
                onOpen={() => onOpenCard(country, c)} />
            ))}
          </div>
        )
      )}

      {showForm && department && (
        <div className="kb-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="kb-modal" onClick={e => e.stopPropagation()}>
            <div className="mo-card">
              <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4, color: "var(--mo-ink)" }}>New draft card — {COUNTRY_LABEL[country]} / {deptLabel}</div>
              <div style={{ fontSize: 12, color: "var(--mo-muted)", marginBottom: 10 }}>You ({currentUser.name}) will own this card. Build it as steps — every step needs a name and a description (one point per line). It stays a draft until Gaurav publishes it.</div>
              <input className="mo-input" placeholder="Card title" value={newCard.title} onChange={e => setNewCard({ ...newCard, title: e.target.value })} style={{ marginBottom: 10 }} />
              <StepEditor steps={newCard.steps} onChange={steps => setNewCard({ ...newCard, steps })} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="mo-btn mo-btn-sm mo-btn-primary" onClick={() => { onCreate(country, "general", department); setShowForm(false); }}><PlusCircle size={13} style={{ marginRight: 6 }} />Save as draft</button>
                <button className="mo-btn mo-btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {openCard && (
        <div style={{ maxWidth: 820 }}>
          <KbCard key={openCard.id} card={openCard} revisions={revisions.filter(r => r.cardId === openCard.id)} users={users}
            isManager={isManager} currentUser={currentUser} onPublish={onPublish} onUnpublish={onUnpublish}
            onDelete={c => { onDelete(c); setOpenCardId(null); }}
            onSaveSteps={onSaveSteps} onSaveTitle={onSaveTitle} onMerge={onMerge} onReject={onReject}
            onAssign={onAssign} onRequestUpdate={onRequestUpdate} onClearUpdate={onClearUpdate}
            onBack={() => setOpenCardId(null)}
            activeSection={activeSection} setActiveSection={setActiveSection} />
        </div>
      )}
    </div>
  );
}

function KbCard({ card, revisions, users, isManager, currentUser, onPublish, onUnpublish, onDelete, onSaveSteps, onSaveTitle, onMerge, onReject, onAssign, onRequestUpdate, onClearUpdate, onBack, activeSection, setActiveSection }) {
  const steps = cardSteps(card);
  const [dc1, dc2] = deptTint(card.department);
  const [draftTitle, setDraftTitle] = useState(card.title);
  const [draftName, setDraftName] = useState(steps[activeSection]?.name || "");
  const [draftDetail, setDraftDetail] = useState(steps[activeSection]?.detail || "");
  const [showHistory, setShowHistory] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const owner = users.find(u => u.id === card.owner);
  const assignee = users.find(u => u.id === card.assignedTo);
  const pending = revisions.filter(r => r.status === "pending");
  const history = revisions.filter(r => r.status !== "pending");

  useEffect(() => {
    const s = cardSteps(card)[activeSection] || { name: "", detail: "" };
    setDraftName(s.name);
    setDraftDetail(s.detail);
  }, [activeSection, card.id]);

  function saveActiveSection() {
    const updated = cardSteps(card).map((s, i) => i === activeSection ? { ...s, name: draftName, detail: draftDetail } : s);
    onSaveSteps(card, updated);
  }

  function toggleDone() {
    const current = cardSteps(card)[activeSection];
    const nextStatus = current.status === "done" ? "pending" : "done";
    const updated = cardSteps(card).map((s, i) => i === activeSection ? { ...s, name: draftName, detail: draftDetail, status: nextStatus } : s);
    onSaveSteps(card, updated);
  }

  return (
    <div className="mo-card kb-card-anim">
      <div style={{ height: 5, margin: "-16px -18px 16px", borderRadius: "18px 18px 0 0", background: `linear-gradient(90deg, ${dc1}, ${dc2}, ${dc1})`, backgroundSize: "200% 100%", animation: "kbAccentFlow 6s ease infinite" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <button className="mo-btn mo-btn-sm" onClick={onBack}>← {COUNTRY_LABEL[card.country]}</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--mo-ink)" }}>{card.progress}% · {card.doneSections}/16 sections</span>
          <StatusPill status={card.status} />
          {isManager && (
            confirmingDelete ? (
              <span style={{ display: "flex", gap: 6 }}>
                <button className="mo-btn mo-btn-sm mo-btn-danger" onClick={() => onDelete(card)}>Confirm</button>
                <button className="mo-btn mo-btn-sm" onClick={() => setConfirmingDelete(false)}>Cancel</button>
              </span>
            ) : (
              <button className="mo-btn mo-btn-sm mo-btn-danger" title="Delete card" onClick={() => setConfirmingDelete(true)}><XCircle size={13} /></button>
            )
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <RegionDot region={card.country} />
        <input className="mo-input" style={{ maxWidth: 420, fontWeight: 900, fontSize: 14.5 }} value={draftTitle}
          onChange={e => setDraftTitle(e.target.value)}
          onBlur={() => { if (draftTitle.trim() && draftTitle !== card.title) onSaveTitle(card, draftTitle.trim()); }} />
        {isManager && (
          <select className="mo-input" style={{ maxWidth: 160, fontSize: 12, padding: "4px 6px" }} value={card.assignedTo || ""} onChange={e => onAssign(card, e.target.value ? e.target.value : null)}>
            <option value="">Unassigned</option>
            {users.filter(u => u.active).map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}
        {!isManager && assignee && <span className="mo-pill mo-pill-neutral">Assigned: {assignee.name}</span>}
        {card.status === "draft" && isManager && (
          <button className="mo-btn mo-btn-sm mo-btn-primary" onClick={() => onPublish(card)}><Send size={12} style={{ marginRight: 6 }} />Publish</button>
        )}
        {card.status === "published" && isManager && (
          <button className="mo-btn mo-btn-sm" onClick={() => onUnpublish(card)}><XCircle size={12} style={{ marginRight: 6 }} />Unpublish</button>
        )}
        {isManager && !card.updateRequest && (
          <button className="mo-btn mo-btn-sm" onClick={() => setRequesting(r => !r)}><HelpCircle size={12} style={{ marginRight: 6 }} />{requesting ? "Cancel request" : "Request update"}</button>
        )}
        {pending.length > 0 && <span className="mo-pill mo-pill-warn">{pending.length} pending change{pending.length > 1 ? "s" : ""}</span>}
      </div>

      {card.updateRequest && (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, background: "rgba(232,52,42,0.08)", border: "1px solid rgba(232,52,42,0.25)", borderRadius: 10, padding: "8px 10px", margin: "6px 0", fontSize: 12.5 }}>
          <span><AlertTriangle size={12} style={{ marginRight: 6, verticalAlign: -1, color: "var(--mo-warn)" }} />
            <strong>Update requested</strong> by {card.updateRequestedBy} · {card.updateRequestedAt}: {card.updateRequest}
          </span>
          {isManager && <button className="mo-btn mo-btn-sm" onClick={() => onClearUpdate(card)}>Clear</button>}
        </div>
      )}

      {requesting && (
        <div style={{ marginTop: 8, marginBottom: 12 }}>
          <textarea className="mo-textarea" rows={2} placeholder={`What should ${assignee ? assignee.name : "the assignee"} update on this card?`} value={requestNote} onChange={e => setRequestNote(e.target.value)} style={{ marginBottom: 8 }} />
          <button className="mo-btn mo-btn-sm mo-btn-primary" onClick={() => { onRequestUpdate(card, requestNote); setRequesting(false); setRequestNote(""); }}>
            <Send size={12} style={{ marginRight: 6 }} />Send update request
          </button>
        </div>
      )}

      <div style={{ margin: "4px 0 14px" }}>
        <div style={{ width: "100%", height: 7, background: "rgba(0,0,0,0.05)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${card.progress}%`, height: "100%", borderRadius: 4, background: card.progress === 100 ? "linear-gradient(90deg, var(--mo-success), #1FBE84)" : `linear-gradient(90deg, ${dc1}, ${dc2})`, transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)" }} />
        </div>
      </div>

      {(() => {
        const i = activeSection;
        const s = steps[i] || {};
        const isDone = s.status === "done";
        return (
          <div key={i} className="kb-section-anim" style={{ borderRadius: 12, border: `1px solid ${dc1}59`, overflow: "hidden", background: `${dc1}0a` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderLeft: `4px solid ${isDone ? "var(--mo-success)" : dc1}`, flexWrap: "wrap", gap: 8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isDone ? "linear-gradient(135deg, var(--mo-success), #1FBE84)" : `linear-gradient(135deg, ${dc1}, ${dc2})`, color: "#fff", fontSize: 11, fontWeight: 800 }}>
                  {isDone ? <Check size={13} /> : i + 1}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--mo-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Section {i + 1} of {steps.length}</span>
              </span>
              <button className="mo-btn mo-btn-sm mo-btn-primary" onClick={toggleDone}>
                <Check size={12} style={{ marginRight: 6 }} />{isDone ? "Mark pending" : "Mark done"}
              </button>
            </div>
            <div style={{ padding: "12px 14px 14px" }}>
              <input className="mo-input" style={{ marginBottom: 8, fontWeight: 800 }} value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="Section name" />
              <textarea className="mo-textarea" style={{ minHeight: 260 }} placeholder="Write this section — one point per line" value={draftDetail}
                onChange={e => setDraftDetail(e.target.value)}
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="mo-btn mo-btn-sm mo-btn-primary" onClick={saveActiveSection}><Send size={12} style={{ marginRight: 6 }} />Save section</button>
                {i < steps.length - 1 && (
                  <button className="mo-btn mo-btn-sm" onClick={() => setActiveSection(i + 1)}>Next section →</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ fontSize: 11.5, color: "var(--mo-muted)", margin: "10px 0" }}>
        Owner: <strong style={{ color: "var(--mo-ink)" }}>{owner ? `${owner.name} · ${owner.title}` : card.author}</strong> · created by {card.author} · updated {card.updatedAt}
      </div>

      {history.length > 0 && (
        <button className="mo-btn mo-btn-sm" onClick={() => setShowHistory(h => !h)}><ListChecks size={12} style={{ marginRight: 6 }} />History ({history.length})</button>
      )}

      {pending.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--mo-border)", display: "grid", gap: 10 }}>
          {pending.map(r => (
            <div key={r.id} style={{ background: "var(--mo-surface-alt)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5 }}><strong>{r.authorName}</strong> proposed an edit · {r.createdAt}</span>
                {isManager ? (
                  <span style={{ display: "flex", gap: 6 }}>
                    <button className="mo-btn mo-btn-sm mo-btn-primary" onClick={() => onMerge(r)}><CheckCircle2 size={12} style={{ marginRight: 4 }} />Merge</button>
                    <button className="mo-btn mo-btn-sm mo-btn-danger" onClick={() => onReject(r)}><XCircle size={12} style={{ marginRight: 4 }} />Reject</button>
                  </span>
                ) : (
                  <span className="mo-pill mo-pill-warn">Awaiting Gaurav</span>
                )}
              </div>
              {r.note && <div style={{ fontSize: 12, color: "var(--mo-muted)", marginBottom: 4 }}><HelpCircle size={11} style={{ marginRight: 4, verticalAlign: -1 }} />{r.note}</div>}
              {r.title !== card.title && <div style={{ fontSize: 12.5, marginBottom: 4 }}><span style={{ color: "var(--mo-muted)" }}>Title → </span><strong>{r.title}</strong></div>}
              {r.steps && r.steps.length ? (
                <div style={{ display: "grid", gap: 6 }}>
                  {r.steps.map((s, i) => (
                    <div key={i} className="kb-step" style={{ background: "rgba(255,255,255,0.7)" }}>
                      <div className="kb-step-head"><span className="kb-step-num">Step {i + 1}</span><strong style={{ fontSize: 12.5 }}>{s.name}</strong></div>
                      <div style={{ fontSize: 12, color: "var(--mo-ink)", whiteSpace: "pre-line" }}>{s.detail}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: "var(--mo-ink)", whiteSpace: "pre-line" }}>{r.body}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {showHistory && history.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--mo-border)", display: "grid", gap: 6 }}>
          {history.map(r => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12 }}>
              <span><strong>{r.authorName}</strong> · {r.createdAt}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StatusPill status={r.status === "merged" ? "approved" : "failed"} label={r.status === "merged" ? "Merged" : "Rejected"} />
                <span style={{ color: "var(--mo-muted)" }}>by {r.decidedBy} · {r.decidedAt}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccessControl({ users, onToggle, onAddUser }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", title: "", role: "agent", regions: [] });

  function toggleRegion(r) {
    setForm(f => ({ ...f, regions: f.regions.includes(r) ? f.regions.filter(x => x !== r) : [...f.regions, r] }));
  }

  function submit() {
    onAddUser(form);
    setForm({ id: "", name: "", title: "", role: "agent", regions: [] });
    setShowForm(false);
  }

  return (
    <div>
      <p style={{ fontSize: 13.5, color: "var(--mo-muted)", margin: "14px 0" }}>
        Roles are fixed rules, not editable at runtime — this keeps access predictable and auditable. Only official noon.com emails can sign in;
        new team members verify with a one-time code sent to their inbox, no password to manage.
      </p>

      <div style={{ marginBottom: 14 }}>
        <button className="mo-btn mo-btn-sm mo-btn-primary" onClick={() => setShowForm(f => !f)}>
          <PlusCircle size={13} style={{ marginRight: 6 }} />{showForm ? "Cancel" : "Add team member"}
        </button>
      </div>

      {showForm && (
        <div className="mo-card" style={{ marginBottom: 16, display: "grid", gap: 8, maxWidth: 480 }}>
          <input className="mo-input" placeholder="Official noon email (e.g. name@noon.com)" value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} />
          <input className="mo-input" placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="mo-input" placeholder="Title (e.g. Performance Admin)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <select className="mo-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="agent">Agent</option>
            <option value="reviewer">Reviewer</option>
            <option value="admin">Admin</option>
          </select>
          <div style={{ display: "flex", gap: 12, fontSize: 12.5, fontWeight: 700 }}>
            {Object.values(REGIONS).map(r => (
              <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={form.regions.includes(r.id)} onChange={() => toggleRegion(r.id)} />{r.short}
              </label>
            ))}
          </div>
          <button className="mo-btn mo-btn-sm mo-btn-primary" onClick={submit}><PlusCircle size={13} style={{ marginRight: 6 }} />Save team member</button>
        </div>
      )}

      <div className="mo-table-wrap" style={{ marginBottom: 24 }}>
        <table className="mo-table">
          <thead><tr><th>Name</th><th>Role</th><th>Region</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 800, color: "var(--mo-ink)" }}>{u.name}<div className="mo-mono" style={{ fontSize: 11, color: "var(--mo-muted)", fontWeight: 600 }}>{u.id}</div></td>
                <td style={{ textTransform: "capitalize" }}>{u.role}</td>
                <td>{u.region ? <RegionDot region={u.region} /> : <span style={{ color: "var(--mo-muted)", fontSize: 12.5 }}>All regions</span>}</td>
                <td><span className={`mo-pill ${u.active ? "mo-pill-success" : "mo-pill-danger"}`}>{u.active ? "Active" : "Inactive"}</span></td>
                <td><button className="mo-btn mo-btn-sm" onClick={() => onToggle(u)}>{u.active ? "Deactivate" : "Activate"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 900, color: "var(--mo-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Permission matrix (reference — not editable)</div>
      <div className="mo-table-wrap">
        <table className="mo-table">
          <thead><tr><th>Module</th><th>Agent</th><th>Reviewer</th><th>Admin</th></tr></thead>
          <tbody>
            {[
              ["BAU checklist", "Tick own-team stages", "Tick stages, second approver", "Tick stages, second approver, reset cycle"],
              ["Payment status", "Own region, view only", "All regions, view only", "All regions, edit"],
              ["Knowledge cards", "Create drafts, propose edits", "Create drafts, propose edits", "Create, publish, assign, request updates"],
              ["SOP bot & points", "Answer questions, earn points", "Answer questions, earn points", "Scan for gaps, dismiss questions"],
              ["Access control", "No access", "No access", "Full access"],
              ["Audit log", "No access", "View only", "View only"],
            ].map(row => (
              <tr key={row[0]}>{row.map((cell, i) => <td key={i} style={i === 0 ? { fontWeight: 800, color: "var(--mo-ink)" } : { fontSize: 12.5, color: "var(--mo-muted)" }}>{cell}</td>)}</tr>
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
                <td style={{ fontWeight: 800, color: "var(--mo-ink)" }}>{e.actor}</td>
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

/* Step-block editor: the only way card content is written. Each block is a
   mandatory step name + description, so SOPs stay clean and each step can
   be extended later without touching the others. */
function StepEditor({ steps, onChange }) {
  function update(i, patch) { onChange(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s))); }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {steps.map((s, i) => (
        <div key={i} className="kb-step">
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <span className="kb-step-num" style={{ flexShrink: 0 }}>Step {i + 1}</span>
            <input className="mo-input" placeholder="Step name (e.g. Collect attendance inputs)" value={s.name} onChange={e => update(i, { name: e.target.value })} />
            {steps.length > 1 && (
              <button className="mo-btn mo-btn-sm mo-btn-danger" style={{ flexShrink: 0 }} title="Remove step" onClick={() => onChange(steps.filter((_, idx) => idx !== i))}>
                <XCircle size={12} />
              </button>
            )}
          </div>
          <textarea className="mo-textarea" rows={3} placeholder="Step description — one point per line" value={s.detail} onChange={e => update(i, { detail: e.target.value })} />
        </div>
      ))}
      <button className="mo-btn mo-btn-sm" style={{ justifySelf: "start" }} onClick={() => onChange([...steps, emptyStep()])}>
        <PlusCircle size={13} style={{ marginRight: 6 }} />Add step
      </button>
    </div>
  );
}

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
  sidebar: { width: 250, background: "#ffffff", color: "var(--mo-ink)", padding: "24px 16px", display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid rgba(15,23,42,0.08)" },
  sectionPane: { width: 260, background: "#fbfbfc", padding: "20px 14px", display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid rgba(15,23,42,0.08)", overflowY: "auto" },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandMark: { display: "flex", alignItems: "center" },
  brandDot: { width: 14, height: 14, borderRadius: "50%", display: "inline-block", border: "2px solid #fff" },
  brandName: { fontFamily: "var(--mo-display)", fontSize: 16, fontWeight: 900, color: "var(--mo-ink)" },
  brandSub: { fontSize: 11, fontWeight: 800, color: "var(--mo-muted)", marginTop: 2 },
  navItem: { display: "flex", alignItems: "center", width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 10, background: "transparent", border: "none", color: "#475569", fontSize: 13.5, fontWeight: 800, cursor: "pointer", marginBottom: 4 },
  navItemActive: { display: "flex", alignItems: "center", width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 10, background: "linear-gradient(135deg, var(--mo-accent), var(--mo-accent-2))", border: "none", color: "#fff", fontSize: 13.5, cursor: "pointer", marginBottom: 4, fontWeight: 900, boxShadow: "0 12px 26px rgba(232,52,42,0.34)" },
  lockedHeading: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 900, color: "var(--mo-accent)", marginBottom: 8, paddingLeft: 14 },
  phaseTag: { fontSize: 9.5, fontWeight: 800, color: "var(--mo-muted)", border: "1px solid rgba(15,23,42,0.12)", borderRadius: 999, padding: "1px 6px", marginLeft: 6 },
  regionLegend: { marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(15,23,42,0.08)" },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "18px 32px", background: "var(--mo-surface)", borderBottom: "1px solid var(--mo-border)", position: "relative", backdropFilter: "blur(16px)" },
  headerAccent: { height: 3, background: "linear-gradient(90deg, var(--mo-accent), #ff6b57, var(--mo-accent-2))" },
  headerTitle: { fontFamily: "var(--mo-display)", fontSize: 20, fontWeight: 900, color: "var(--mo-ink)" },
  content: { padding: "24px 32px", flex: 1, overflowY: "auto" },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  bauIconWrap: { width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
:root {
  --mo-bg: #f5f6f8;
  --mo-surface: rgba(255,255,255,0.96);
  --mo-surface-strong: #ffffff;
  --mo-surface-alt: #f7f2f1;
  --mo-ink: #16181d;
  --mo-muted: #6b7280;
  --mo-border: rgba(15,23,42,0.1);
  --mo-accent: #e8342a;
  --mo-accent-2: #c81e1e;
  --mo-blue-2: #c81e1e;
  --mo-coral: #64748b;
  --mo-gold: #e8342a;
  --mo-violet: #64748b;
  --mo-success: #18a558;
  --mo-warn: #c81e1e;
  --mo-danger: #dc2626;
  --mo-locked-bg: rgba(255,255,255,0.55);
  --mo-shadow: 0 12px 32px rgba(15,23,42,0.08);
  --mo-shadow-hover: 0 18px 44px rgba(15,23,42,0.12);
  --mo-display: 'Plus Jakarta Sans', system-ui, 'Segoe UI', sans-serif;
  --mo-body: 'Plus Jakarta Sans', system-ui, 'Segoe UI', sans-serif;
  --mo-mono: 'IBM Plex Mono', 'Consolas', monospace;
}
body {
  margin: 0;
  min-height: 100vh;
  background:
    linear-gradient(rgba(232,52,42,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232,52,42,0.05) 1px, transparent 1px),
    radial-gradient(circle at top right, rgba(232,52,42,0.1), transparent 30%),
    radial-gradient(circle at 55% 42%, rgba(200,30,30,0.06), transparent 36%),
    var(--mo-bg);
  background-size: 44px 44px, 44px 44px, auto, auto, auto;
  color: var(--mo-ink);
  font-family: var(--mo-body);
}
button, input, select, textarea { font-family: inherit; }
.mo-navitem { cursor: pointer; }
.mo-navitem:hover { background: linear-gradient(135deg, var(--mo-accent), var(--mo-accent-2)) !important; color: #fff !important; box-shadow: 0 12px 26px rgba(232,52,42,0.34); }
.mo-locked { display:flex; align-items:center; width:100%; text-align:left; padding:8px 14px; border-radius:10px; background:transparent; border:none; color:#8ea4c8; font-size:12px; font-weight:700; cursor:pointer; margin-bottom:2px; }
.mo-locked:hover { background: rgba(255,255,255,0.06); color:#e8f0fd; }
.mo-card { background: var(--mo-surface); border: 1px solid rgba(255,255,255,0.74); border-radius: 18px; padding: 16px 18px; box-shadow: var(--mo-shadow); backdrop-filter: blur(16px); transition: box-shadow 0.15s ease, transform 0.15s ease; }
.mo-clickable { cursor: pointer; text-align: left; width: 100%; font-family: var(--mo-body); }
.mo-clickable:hover { box-shadow: var(--mo-shadow-hover); transform: translateY(-2px); }
.mo-lockedtile { background: var(--mo-locked-bg); border: 1px dashed rgba(98,121,151,0.4); border-radius: 18px; padding: 16px 18px; text-align: left; cursor: pointer; backdrop-filter: blur(10px); }
.mo-lockedtile:hover { border-color: var(--mo-accent); }
.mo-btn { display:inline-flex; align-items:center; background:var(--mo-surface-strong); border:1px solid var(--mo-border); border-radius:10px; padding:8px 14px; font-size:13px; font-weight:800; color:var(--mo-ink); cursor:pointer; font-family:var(--mo-body); transition: all 0.12s ease; }
.mo-btn:hover { background: var(--mo-surface-alt); border-color: rgba(232,52,42,0.55); }
.mo-btn-sm { padding: 6px 10px; font-size: 12.5px; }
.mo-btn-primary { background: linear-gradient(135deg, var(--mo-accent), var(--mo-accent-2)); color: #fff; border-color: transparent; box-shadow: 0 10px 24px rgba(232,52,42,0.24); }
.mo-btn-primary:hover { background: linear-gradient(135deg, var(--mo-accent), var(--mo-accent-2)); filter: brightness(0.96); box-shadow: 0 12px 28px rgba(232,52,42,0.32); }
.mo-btn-danger { color: var(--mo-danger); border-color: rgba(232,52,42,0.4); }
.mo-btn-danger:hover { background: rgba(255,241,242,0.9); border-color: var(--mo-danger); }
.mo-btn:disabled { opacity: 0.6; cursor: default; }
.mo-table-wrap { background: var(--mo-surface); border: 1px solid rgba(255,255,255,0.74); border-radius: 18px; overflow: hidden; box-shadow: var(--mo-shadow); backdrop-filter: blur(16px); }
.mo-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.mo-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 900; color: var(--mo-muted); padding: 11px 14px; border-bottom: 1px solid var(--mo-border); background: rgba(15,23,42,0.03); }
.mo-table td { padding: 11px 14px; border-bottom: 1px solid var(--mo-border); vertical-align: top; }
.mo-table tr:last-child td { border-bottom: none; }
.mo-table tr:hover td { background: rgba(232,52,42,0.04); }
.mo-mono { font-family: var(--mo-mono); color: var(--mo-ink); }
.mo-pill { display:inline-block; font-size: 11.5px; padding: 2px 10px; border-radius: 999px; font-weight: 800; }
.mo-pill-neutral { background: rgba(232,52,42,0.1); color: var(--mo-accent); }
.mo-pill-warn { background: rgba(232,52,42,0.1); color: var(--mo-warn); }
.mo-pill-success { background: rgba(24,181,111,0.14); color: #0e7a4c; }
.mo-pill-danger { background: rgba(232,52,42,0.1); color: var(--mo-danger); }
.mo-select { border: 1px solid var(--mo-border); border-radius: 10px; padding: 7px 10px; font-size: 12.5px; font-family: var(--mo-body); font-weight: 700; color: var(--mo-ink); background: var(--mo-surface-strong); }
.mo-input { width: 100%; border: 1px solid var(--mo-border); border-radius: 10px; padding: 9px 12px; font-size: 13px; font-weight: 600; font-family: var(--mo-body); background: rgba(255,255,255,0.92); color: var(--mo-ink); box-sizing: border-box; }
.mo-input:focus, .mo-textarea:focus, .mo-select:focus { outline: none; border-color: rgba(232,52,42,0.55); box-shadow: 0 0 0 4px rgba(232,52,42,0.12); }
.mo-textarea { width: 100%; border: 1px solid var(--mo-border); border-radius: 10px; padding: 9px 12px; font-size: 13px; font-weight: 600; font-family: var(--mo-body); background: rgba(255,255,255,0.92); color: var(--mo-ink); box-sizing: border-box; resize: vertical; }
.mo-loginrow { display:flex; align-items:center; justify-content:space-between; width:100%; text-align:left; padding:12px 14px; border-radius:12px; border:1px solid var(--mo-border); background:var(--mo-surface-strong); cursor:pointer; transition: all 0.12s ease; }
.mo-loginrow:hover { background: var(--mo-surface-alt); border-color: rgba(232,52,42,0.55); transform: translateY(-1px); box-shadow: var(--mo-shadow); }
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
.kb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 18px; margin-top: 18px; }
.kb-pcard { position: relative; aspect-ratio: 5 / 7; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 9px; padding: 40px 16px 14px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.78); background: linear-gradient(160deg, rgba(255,255,255,0.96), rgba(247,242,241,0.88)); box-shadow: var(--mo-shadow); backdrop-filter: blur(14px); cursor: pointer; font-family: var(--mo-body); overflow: hidden; transition: transform 0.18s ease, box-shadow 0.18s ease; }
.kb-pcard::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 66px; background: linear-gradient(135deg, var(--kb-c1), var(--kb-c2)); opacity: 0.15; pointer-events: none; }
.kb-pcard::after { content: ""; position: absolute; inset: 0; border-radius: 20px; border: 2px solid transparent; background: linear-gradient(135deg, var(--kb-c1), var(--kb-c2)) border-box; -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; opacity: 0; transition: opacity 0.18s ease; pointer-events: none; }
.kb-pcard:hover { transform: translateY(-5px) rotate(-0.6deg); box-shadow: 0 26px 70px rgba(35,56,86,0.22), 0 0 34px rgba(232,52,42,0.28); }
.kb-pcard:hover::after { opacity: 1; }
.kb-pip { position: absolute; font-size: 11px; font-weight: 900; letter-spacing: 0.08em; background: linear-gradient(135deg, var(--kb-c1), var(--kb-c2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.kb-pip-top { top: 10px; left: 12px; }
.kb-pip-bottom { bottom: 10px; right: 12px; transform: rotate(180deg); }
.kb-medallion { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--kb-c1), var(--kb-c2)); color: #fff; box-shadow: 0 12px 26px rgba(232,52,42,0.35); flex-shrink: 0; }
.kb-pcard-title { font-weight: 900; font-size: 14px; line-height: 1.25; color: var(--mo-ink); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.kb-pcard-title-big { font-size: 19px; line-height: 1.3; margin-top: 4px; }
.kb-pcard-foot { margin-top: auto; display: flex; align-items: center; gap: 7px; max-width: 100%; }
.kb-avatar { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, var(--kb-c1), var(--kb-c2)); color: #fff; font-size: 10px; font-weight: 900; flex-shrink: 0; }
.kb-owner-name { font-size: 11.5px; font-weight: 800; color: var(--mo-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kb-pcard-badges { position: absolute; top: 10px; right: 10px; display: flex; gap: 4px; }
.kb-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; }
.kb-summary-anim { opacity: 0; animation: kbFadeInUp 0.5s ease forwards; }
@keyframes kbFadeInUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
.kb-summary-bar { width: 100%; height: 6px; background: rgba(0,0,0,0.06); border-radius: 3px; overflow: hidden; }
.kb-summary-bar-fill { height: 100%; border-radius: 3px; transition: width 1s cubic-bezier(0.16,1,0.3,1); }
.kb-card-anim { animation: kbFadeInUp 0.35s ease; }
@keyframes kbAccentFlow { 0% { background-position: 0% 0; } 100% { background-position: 200% 0; } }
.kb-section-anim { opacity: 0; animation: kbFadeInUp 0.4s ease forwards; }
.kb-addcard { border: 2px dashed rgba(232,52,42,0.35); background: rgba(255,255,255,0.55); justify-content: center; }
.kb-addcard::before, .kb-addcard::after { display: none; }
.kb-addcard:hover { transform: translateY(-5px); border-color: var(--mo-accent); box-shadow: 0 26px 70px rgba(35,56,86,0.2); }
.kb-add-plus { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, var(--mo-accent), var(--mo-accent-2)); color: #fff; box-shadow: 0 14px 30px rgba(232,52,42,0.35); }
.bot-thread { display: flex; flex-direction: column; gap: 12px; }
.bot-row { display: flex; align-items: flex-end; gap: 8px; }
.bot-row-user { justify-content: flex-end; }
.bot-avatar { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, var(--mo-accent), var(--mo-accent-2)); color: #fff; flex-shrink: 0; box-shadow: 0 8px 18px rgba(232,52,42,0.3); }
.bot-bubble { max-width: 78%; background: var(--mo-surface-alt); border: 1px solid var(--mo-border); border-radius: 14px 14px 14px 4px; padding: 10px 14px; font-size: 13px; line-height: 1.5; color: var(--mo-ink); }
.bot-bubble-user { max-width: 78%; background: linear-gradient(135deg, var(--mo-accent), var(--mo-accent-2)); color: #fff; border-radius: 14px 14px 4px 14px; padding: 10px 14px; font-size: 13px; font-weight: 600; line-height: 1.5; box-shadow: 0 10px 24px rgba(232,52,42,0.24); }
.bot-source { display: inline-flex; align-items: center; font-size: 11px; font-weight: 800; color: var(--mo-accent); background: rgba(232,52,42,0.1); border-radius: 999px; padding: 3px 10px; }
.kb-step { border: 1px solid var(--mo-border); border-radius: 10px; padding: 8px 10px; background: var(--mo-surface-alt); }
.kb-step-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.kb-step-num { display: inline-block; font-size: 10.5px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; color: #fff; background: linear-gradient(135deg, var(--mo-accent), var(--mo-accent-2)); border-radius: 999px; padding: 2px 9px; }
.kb-modal-overlay { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; background: rgba(7,18,41,0.45); backdrop-filter: blur(6px); padding: 24px; overflow: auto; }
.kb-modal { width: min(720px, 100%); max-height: 88vh; overflow: auto; border-radius: 22px; }
.kb-modal > .mo-card { box-shadow: 0 40px 120px rgba(0,0,0,0.4); }

/* ---- Portal login (style adopted from Admin Master Dashboard) ---- */
.portal-login { position: relative; display: grid; height: 100vh; overflow: hidden; grid-template-columns: minmax(0, 1.45fr) minmax(410px, 0.55fr); grid-template-rows: auto minmax(0, 1fr); gap: 36px; padding: 30px 48px 24px; color: #fff; font-family: var(--mo-body); }
.portal-bg, .portal-overlay { position: absolute; inset: 0; }
.portal-bg { width: 100%; height: 100%; filter: brightness(1.14) saturate(1.08); object-fit: cover; }
.portal-overlay { background: linear-gradient(90deg, rgba(2,11,33,0.12), rgba(4,15,45,0.03) 54%, rgba(3,9,31,0.64)), radial-gradient(circle at 85% 48%, rgba(232,52,42,0.22), transparent 34%), linear-gradient(180deg, rgba(2,8,29,0.1), rgba(2,8,29,0.48)); }
.portal-header { position: relative; z-index: 1; grid-column: 1 / -1; display: grid; grid-template-columns: minmax(250px, 1fr) auto minmax(250px, 1fr); align-items: center; gap: 20px; }
.brand-lockup { display: flex; align-items: center; gap: 12px; color: #fff; }
.brand-lockup.portal-brand { justify-self: start; }
.brand-lockup strong { display: block; font-weight: 900; }
.brand-lockup div > span { display: block; margin-top: 2px; color: rgba(255,255,255,0.74); font-size: 0.82rem; font-weight: 800; }
.noon-mark { height: 40px; width: auto; display: block; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3)); }
.region-pill { display: flex; align-items: center; gap: 14px; border: 1px solid rgba(255,255,255,0.2); border-radius: 999px; background: rgba(60,10,10,0.48); box-shadow: 0 18px 42px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.16); padding: 10px 20px; backdrop-filter: blur(18px); }
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
.feature-icon.blue { background: linear-gradient(135deg, #e8342a, #c81e1e); }
.feature-icon.green { background: linear-gradient(135deg, #18a558, #0f7a3d); }
.feature-icon.orange { background: linear-gradient(135deg, #94a3b8, #64748b); }
.feature-icon.purple { background: linear-gradient(135deg, #dc2626, #991b1b); }
.feature-icon.cyan { background: linear-gradient(135deg, #64748b, #334155); }
.feature-icon.pink { background: linear-gradient(135deg, #059669, #047857); }
.trust-bar { display: flex; max-width: 100%; align-items: center; gap: 20px; margin-top: 16px; border: 1px solid rgba(255,255,255,0.13); border-radius: 12px; background: rgba(8,17,38,0.34); padding: 12px 16px; color: rgba(255,255,255,0.78); font-size: 0.86rem; font-weight: 700; backdrop-filter: blur(14px); }
.trust-bar strong { color: #fff; font-weight: 900; }
.portal-card-wrap { display: grid; align-items: center; justify-items: center; min-height: 0; }
.portal-card { width: min(100%, 430px); border: 1px solid rgba(255,255,255,0.72); border-radius: 34px; background: linear-gradient(150deg, rgba(255,255,255,0.92), rgba(255,238,237,0.84)), rgba(255,255,255,0.86); box-shadow: 0 0 44px rgba(232,52,42,0.5), 0 26px 80px rgba(0,0,0,0.28); padding: 30px 34px; color: var(--mo-ink); text-align: center; backdrop-filter: blur(22px); }
.portal-card .card-mark { margin: 0 auto 12px; }
.portal-card h2 { margin: 0 0 4px; color: #071a3d; font-size: 1.78rem; font-weight: 900; }
.portal-card-subtitle { margin: 0 0 12px; color: #c81e1e; font-weight: 800; }
.card-rule { width: 210px; height: 1px; margin: 12px auto 18px; background: linear-gradient(90deg, transparent, rgba(80,98,130,0.28), transparent); }
.portal-card h3 { margin: 0 0 6px; color: #081a3a; font-size: 1.22rem; font-weight: 900; }
.portal-card .intro { max-width: 290px; margin: 0 auto 16px; color: #39506d; font-weight: 700; line-height: 1.55; font-size: 0.92rem; }
.portal-alert { margin-bottom: 14px; border: 1px solid rgba(232,52,42,0.28); border-radius: 12px; background: rgba(255,241,242,0.9); color: #c81e1e; padding: 12px 14px; font-size: 0.9rem; font-weight: 800; }
.portal-form { display: grid; gap: 9px; text-align: left; }
.portal-form label { color: #253b59; font-size: 0.84rem; font-weight: 900; }
.input-shell { display: flex; align-items: center; border: 1px solid rgba(95,112,135,0.24); border-radius: 10px; background: rgba(255,255,255,0.86); box-shadow: inset 0 1px 0 rgba(255,255,255,0.8); overflow: hidden; }
.input-shell span { flex: 0 0 48px; color: #31517c; font-weight: 900; font-size: 0.8rem; text-align: center; }
.input-shell input { flex: 1 1 auto; min-width: 0; min-height: 44px; border: 0; background: transparent; box-shadow: none; outline: none; padding: 0 14px 0 0; color: var(--mo-ink); font: inherit; font-weight: 700; }
.input-shell:focus-within { border-color: rgba(232,52,42,0.55); box-shadow: 0 0 0 4px rgba(232,52,42,0.12); }
.forgot-link { justify-self: end; color: #c81e1e; font-size: 0.82rem; font-weight: 800; text-decoration: none; }
.portal-form button { display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 48px; margin-top: 4px; border: 0; border-radius: 10px; background: linear-gradient(135deg, var(--mo-accent), var(--mo-accent-2)); color: #fff; padding: 0 18px; cursor: pointer; font: inherit; font-weight: 900; box-shadow: 0 10px 24px rgba(232,52,42,0.24); }
.portal-form button:hover { filter: brightness(0.96); }
.or-divider { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; margin: 14px 0 12px; color: var(--mo-muted); font-size: 0.88rem; }
.or-divider::before, .or-divider::after { height: 1px; background: linear-gradient(90deg, transparent, rgba(80,98,130,0.2)); content: ""; }
.or-divider::after { background: linear-gradient(90deg, rgba(80,98,130,0.2), transparent); }
.sso-button { width: 100%; min-height: 46px; border: 1px solid rgba(232,52,42,0.18); border-radius: 10px; background: rgba(255,255,255,0.42); color: #071a3d; cursor: pointer; font: inherit; font-weight: 900; box-shadow: none; }
.sso-button:hover { background: rgba(255,255,255,0.62); }
.support-copy { margin: 14px 0 0; color: var(--mo-muted); font-size: 0.9rem; font-weight: 700; }
.support-copy a { color: #c81e1e; font-weight: 900; text-decoration: none; }
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
