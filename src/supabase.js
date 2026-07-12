import { createClient } from "@supabase/supabase-js";

// The publishable key is safe to ship in the client bundle; row access is
// governed by RLS policies on the Supabase side (open for this prototype).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ehljzeocpaxjvdjidext.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_kYYGqGEM5vyXY06_MW0BsA_okd2I8mL";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* Row mappers: snake_case DB rows <-> camelCase app objects */
export const rowToUser = r => ({ id: r.id, name: r.name, role: r.role, region: r.region, active: r.active, title: r.title || "", regions: r.regions || (r.region ? [r.region] : []) });
export const rowToEmail = r => ({ id: r.id, region: r.region, from: r.from_addr, subject: r.subject, category: r.category, body: r.body, receivedAt: r.received_at, status: r.status, assignedTo: r.assigned_to, customerId: r.customer_id });
export const rowToDraft = r => ({ id: r.id, emailId: r.email_id, text: r.text, status: r.status, createdAt: r.created_at, reviewerNote: r.reviewer_note, goodExample: r.good_example });
export const rowToPayment = r => ({ id: r.id, customer: r.customer, region: r.region, amount: Number(r.amount), currency: r.currency, status: r.status, updatedAt: r.updated_at });
export const rowToKbCard = r => ({ id: r.id, title: r.title, body: r.body, region: r.region, country: r.country || r.region, section: r.section || "general", owner: r.owner, status: r.status, author: r.author, updatedAt: r.updated_at, assignedTo: r.assigned_to || null, updateRequest: r.update_request || "", updateRequestedBy: r.update_requested_by || null, updateRequestedAt: r.update_requested_at || null, steps: Array.isArray(r.steps) ? r.steps : null });
export const rowToKbRevision = r => ({ id: r.id, cardId: r.card_id, title: r.title, body: r.body, authorId: r.author_id, authorName: r.author_name, note: r.note, status: r.status, createdAt: r.created_at, decidedAt: r.decided_at, decidedBy: r.decided_by, steps: Array.isArray(r.steps) ? r.steps : null });
export const rowToAudit = r => ({ id: r.id, at: r.at, actor: r.actor, action: r.action, detail: r.detail, region: r.region });
export const rowToPoint = r => ({ id: r.id, userId: r.user_id, userName: r.user_name, points: Number(r.points), reason: r.reason, refId: r.ref_id, at: r.at });
export const rowToBotQuestion = r => ({ id: r.id, cardId: r.card_id, cardTitle: r.card_title, country: r.country, section: r.section, question: r.question, status: r.status, answer: r.answer, answeredBy: r.answered_by, answeredByName: r.answered_by_name, createdAt: r.created_at, answeredAt: r.answered_at });
