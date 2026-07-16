"""Pure data/logic ported 1:1 from src/App.jsx — no Flask/Supabase imports
here so it stays trivially testable, same as the original functions were
plain JS functions with no side effects."""
import re
import time
import random
import string
from datetime import datetime

REGIONS = {
    "uae": {"id": "uae", "name": "United Arab Emirates", "short": "UAE", "color": "#e8342a"},
    "ksa": {"id": "ksa", "name": "Saudi Arabia", "short": "KSA", "color": "#18a558"},
    "egypt": {"id": "egypt", "name": "Egypt", "short": "EGY", "color": "#64748b"},
}

NAV = [
    {"id": "bau", "label": "Payments", "roles": ["agent", "reviewer", "admin"]},
    {"id": "kb", "label": "Knowledge base", "roles": ["agent", "reviewer", "admin"]},
    {"id": "ai", "label": "AI workspace", "roles": ["agent", "reviewer", "admin"]},
    {"id": "admin", "label": "Admin", "roles": ["reviewer", "admin"]},
]

_ICON_ATTRS = 'width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
NAV_ICONS = {
    "bau": f'<svg xmlns="http://www.w3.org/2000/svg" {_ICON_ATTRS}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
    "kb": f'<svg xmlns="http://www.w3.org/2000/svg" {_ICON_ATTRS}><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/></svg>',
    "ai": f'<svg xmlns="http://www.w3.org/2000/svg" {_ICON_ATTRS}><rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="9" cy="14" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1.2" fill="currentColor" stroke="none"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1" fill="currentColor" stroke="none"/></svg>',
    "admin": f'<svg xmlns="http://www.w3.org/2000/svg" {_ICON_ATTRS}><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/></svg>',
}

STATUS_LABEL = {
    "unassigned": "Unassigned", "assigned": "Assigned", "in_review": "In AI review",
    "approved": "Sent (mock)", "resolved": "Resolved",
    "pending": "Pending", "paid": "Paid", "failed": "Failed", "disputed": "Disputed",
    "draft": "Draft", "published": "Published",
}

STATUS_PILL_TONE = {
    "unassigned": "neutral", "assigned": "warn", "in_review": "warn", "approved": "success", "resolved": "success",
    "pending": "warn", "paid": "success", "failed": "danger", "disputed": "danger",
    "draft": "neutral", "published": "success",
}

POINTS = {"newCard": 10, "mergedRevision": 5, "botAnswer": 3, "submitToCard": 5}

KB_TREE_REGIONS = [
    {"id": "global", "label": "Global Policy"},
    {"id": "uae", "label": "UAE"},
    {"id": "ksa", "label": "KSA"},
    {"id": "egypt", "label": "Egypt"},
]
DEPARTMENTS = [
    {"id": "fulfillment", "label": "Fulfillment"},
    {"id": "logistics", "label": "Logistics"},
    {"id": "country_policies", "label": "Cross Functional"},
]
KB_TREE_DEPTS = DEPARTMENTS
DEPARTMENT_LABEL = {d["id"]: d["label"] for d in DEPARTMENTS}
COUNTRY_LABEL = {"uae": "UAE", "ksa": "KSA", "egypt": "Egypt", "global": "Global"}

PAYMENT_CARDS = [
    {"id": "upload_summary", "title": "Upload summary and send mails", "desc": "Upload the cycle summary and trigger vendor mails", "tint": "blue"},
    {"id": "create_po_srn", "title": "Create POs and SRNs", "desc": "Raise purchase orders and service receipt notes", "tint": "green"},
    {"id": "payment_status", "title": "Check payment status", "desc": "Live status of vendor payments", "tint": "orange"},
    {"id": "approve_po_srn", "title": "Approve POs and SRNs", "desc": "Review and approve pending POs and SRNs", "tint": "purple"},
    {"id": "credit_notes", "title": "Credit Note Tracker", "desc": "Track credit notes raised and settled", "tint": "cyan"},
    {"id": "vendor_contracts", "title": "Vendor contracts and rate cards", "desc": "Contracts and agreed rates by vendor", "tint": "pink"},
    {"id": "consumables", "title": "Consumables Contracts, Rate cards and Monthly Budgets", "desc": "Consumables agreements and budget tracking", "tint": "blue"},
    {"id": "adhoc_service", "title": "Ad-hoc Service tracking: Car and others", "desc": "One-off services and vehicle hire tracking", "tint": "green"},
    {"id": "payroll", "title": "Payroll processing", "desc": "Monthly payroll runs and approvals", "tint": "orange"},
    {"id": "payments_kb", "title": "Payments knowledge base", "desc": "SOPs and how-tos for payment operations", "tint": "purple"},
    {"id": "access_control", "title": "Access control", "desc": "Manage team members, roles and regions", "tint": "pink", "roles": ["admin", "reviewer"]},
]


def new_id(prefix):
    return f"{prefix}{int(time.time() * 1000)}-{''.join(random.choices(string.ascii_lowercase + string.digits, k=5))}"


def now_minutes():
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M")


def today():
    return datetime.utcnow().strftime("%Y-%m-%d")


def to_bullet_points(body):
    lines = [l.strip() for l in re.split(r"\r?\n", body or "") if l.strip()]
    out = []
    for l in lines:
        if re.match(r"^[•\-*]\s*", l):
            out.append("• " + re.sub(r"^[•\-*]\s*", "", l))
        elif re.match(r"^\d+[.)]\s", l) or re.search(r":$", l):
            out.append(l)
        else:
            out.append("• " + l)
    return "\n".join(out)


def empty_step():
    return {"name": "", "detail": ""}


def steps_to_body(steps):
    return "\n".join(f"{s['name']}:\n{to_bullet_points(s['detail'])}" for s in steps)


def parse_steps(body):
    steps = []

    def push(name):
        steps.append({"name": re.sub(r"[:.]$", "", name.strip()), "detail": ""})

    def add_detail(text):
        if not steps:
            push("Overview")
        clean = re.sub(r"^[•\-*]\s*", "", text).strip()
        if clean:
            steps[-1]["detail"] += ("\n" if steps[-1]["detail"] else "") + "• " + clean

    for line in [l.strip() for l in re.split(r"\r?\n", body or "") if l.strip()]:
        if re.match(r"^[•\-*]\s", line):
            add_detail(line)
            continue
        num = re.match(r"^\d+[.)]\s+(.*)$", line)
        if num:
            rest = num.group(1)
            cut = next((i for i, ch in enumerate(rest) if ch in ":—."), -1)
            if 4 < cut < 70:
                push(rest[:cut])
                add_detail(rest[cut + 1:])
            else:
                push(rest[:70])
            continue
        head = re.match(r"^(.{3,80}?):(.*)$", line)
        if head and not re.search(r"https?$", head.group(1), re.I):
            push(head.group(1))
            add_detail(head.group(2))
            continue
        add_detail(line)
    return steps or [{"name": "Overview", "detail": to_bullet_points(body or "")}]


def cleaned_steps(steps):
    """Port of cleanSteps(): every step needs both a name and a description."""
    clean = [{"name": s["name"].strip(), "detail": to_bullet_points(s["detail"])} for s in (steps or [])]
    clean = [s for s in clean if s["name"] or s["detail"]]
    if not clean:
        return None, "Add at least one step"
    if any(not s["name"] or not s["detail"] for s in clean):
        return None, "Every step needs both a step name and a description"
    return clean, None


def card_steps(card):
    steps = card.get("steps")
    return steps if steps else parse_steps(card.get("body", ""))


def step_name_for(question):
    if re.search(r"cutoff|deadline", question, re.I):
        return "Cutoffs & deadlines"
    if re.search(r"escalation|goes wrong|dispute", question, re.I):
        return "Escalation path"
    if re.search(r"document|attach", question, re.I):
        return "Required documents"
    if re.search(r"POC|responsible", question, re.I):
        return "POCs & ownership"
    if re.search(r"step-by-step|thin", question, re.I):
        return "Process steps"
    return re.sub(r"^There is an open point in this SOP: ", "", question, flags=re.I)[:60]


def detect_gaps(card):
    qs = []
    body = card.get("body", "")
    lines = [l.strip() for l in body.split("\n") if l.strip()]
    for l in lines:
        if re.search(r"\b(TODO|TBD|to be confirmed|pending confirmation|thin evidence|working draft)\b", l, re.I):
            cleaned_line = re.sub(r"^•\s*", "", l)
            qs.append(f'There is an open point in this SOP: "{cleaned_line}". Can you fill in the missing detail?')
            if len(qs) >= 2:
                break
    if not re.search(r"cutoff|deadline|by the \d|before \d|\bby \d|payroll input", body, re.I):
        qs.append("What are the cutoff dates / deadlines in this process, and what happens if they are missed?")
    if not re.search(r"escalat|dispute|watchout|discrepanc", body, re.I):
        qs.append("What is the escalation path when something goes wrong (disputes, mismatches, delayed payments)?")
    if not re.search(r"attach|invoice|document|contract", body, re.I):
        qs.append("Which documents and attachments are mandatory before this payment can be processed?")
    if not re.search(r"POC|owner|responsib|admin\b", body, re.I):
        qs.append("Who is the POC responsible for each step of this process?")
    if len(lines) < 6:
        qs.append("This card looks thin — can you lay out the full step-by-step process, from input collection to payment release?")
    return qs[:4]


def answer_looks_complete(text):
    t = text.strip()
    words = [w for w in t.split() if w]
    has_specific = bool(re.search(r"\d", t) or "@" in t or re.search(r"[A-Z][a-z]+ [A-Z][a-z]+", t))
    return len(t) >= 40 and len(words) >= 8 and has_specific


def group_questions_by_card(items):
    order = []
    grouped = {}
    for q in items:
        if q["cardId"] not in grouped:
            grouped[q["cardId"]] = {"cardId": q["cardId"], "cardTitle": q["cardTitle"],
                                     "country": q["country"], "section": q["section"], "items": []}
            order.append(q["cardId"])
        grouped[q["cardId"]]["items"].append(q)
    return [grouped[i] for i in order]


def kb_bot_answer(question, cards):
    """Keyword scoring over card steps — port of KbBot's answerFor()."""
    tokens = [t for t in re.findall(r"[a-z0-9]+", question.lower()) if len(t) > 2]
    if not cards:
        return {"text": "My knowledge base is empty right now — I have nothing to learn from yet. "
                         "Add knowledge cards and I'll start answering from them.", "sources": []}
    hits = []
    for card in cards:
        title_hits = sum(1 for t in tokens if t in card["title"].lower())
        for idx, s in enumerate(card_steps(card)):
            score = title_hits * 2 + (0.5 if card["status"] == "published" else 0)
            for t in tokens:
                if t in s["name"].lower():
                    score += 3
                if t in s["detail"].lower():
                    score += 1
            if score >= 2:
                hits.append({"card": card, "idx": idx, "step": s, "score": score})
    hits.sort(key=lambda h: h["score"], reverse=True)
    if not hits:
        return {"text": "I couldn't find anything in the knowledge base about that yet. If you know the answer, "
                         "add it as a knowledge card — every card makes me smarter. You can also check the SOP Bot "
                         "tab: answering its questions fills gaps like this one.", "sources": []}
    best_card = hits[0]["card"]
    from_best = sorted([h for h in hits if h["card"]["id"] == best_card["id"]][:2], key=lambda h: h["idx"])
    caveat = " (draft — not yet vetted by Gaurav)" if best_card["status"] == "draft" else ""
    text = f"{best_card['title']}{caveat}\n\n" + "\n\n".join(
        f"Step {h['idx'] + 1} — {h['step']['name']}\n{h['step']['detail']}" for h in from_best)
    source_cards = []
    for h in hits:
        if not any(c["id"] == h["card"]["id"] for c in source_cards):
            source_cards.append(h["card"])
    return {"text": text, "sources": source_cards[:2]}
