#!/usr/bin/env python3
"""Split messages.json into per-date chunks for lazy loading."""

import hashlib
import json
import subprocess
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CONVERSATIONS_DIR = DATA_DIR / "conversations"
OUTPUT_DIR = ROOT / "public" / "data"


def slugify(name: str) -> str:
    """Convert a name to a URL-friendly slug."""
    s = name.lower().strip()
    s = re.sub(r"[àáâãäå]", "a", s)
    s = re.sub(r"[èéêë]", "e", s)
    s = re.sub(r"[ìíîï]", "i", s)
    s = re.sub(r"[òóôõö]", "o", s)
    s = re.sub(r"[ùúûü]", "u", s)
    s = re.sub(r"[ç]", "c", s)
    s = re.sub(r"[ñ]", "n", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s


def load_source_data():
    """Load messages.json and index.json."""
    messages_path = DATA_DIR / "messages.json"
    index_path = DATA_DIR / "index.json"

    if not messages_path.exists():
        print(f"Error: {messages_path} not found")
        sys.exit(1)
    if not index_path.exists():
        print(f"Error: {index_path} not found")
        sys.exit(1)

    print("Loading messages.json...")
    with open(messages_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print("Loading index.json...")
    with open(index_path, "r", encoding="utf-8") as f:
        index = json.load(f)

    return data, index


def load_extra_conversations():
    """Load the conversations built from the IPJ report (data/conversations/).

    Each file already carries its own index, built by scripts/build_ipj_data.py.
    Returns a list of (conv_id, data, index) tuples; empty when the directory
    does not exist, so the Martha-only build keeps working unchanged.
    """
    if not CONVERSATIONS_DIR.is_dir():
        return []

    loaded = []
    for path in sorted(CONVERSATIONS_DIR.glob("*.json")):
        with open(path, "r", encoding="utf-8") as f:
            payload = json.load(f)
        if payload["metadata"].get("publication_ready") is False:
            print(f"Skipping standby conversation {path.name}")
            continue
        loaded.append((path.stem, payload, payload["index"]))
        print(f"Loading conversations/{path.name}...")
    return loaded


def get_conversation_id(metadata):
    """Derive conversation ID from participants (excluding DV)."""
    participants = metadata["participants"]
    other = [p for p in participants if p != "DV"]
    if other:
        return slugify(other[0])
    return slugify("-".join(participants))


def date_key(message):
    return message.get("date") or message.get("reported_date") or "undated"


def sort_time(message):
    key = date_key(message)
    return message.get("timestamp") or (key if key != "undated" else "")


def group_messages_by_date(messages):
    """Group messages by their date field."""
    by_date = defaultdict(list)
    for msg in messages:
        by_date[date_key(msg)].append(msg)
    return by_date


def group_messages_by_month(messages):
    """Group messages by YYYY-MM prefix."""
    by_month = defaultdict(list)
    for msg in messages:
        ym = date_key(msg)[:7]
        by_month[ym].append(msg)
    return by_month


def build_search_index(messages):
    """Build a full-text columnar index; only empty/system messages are omitted."""
    dates_list = []
    date_to_idx = {}
    senders_list = []
    sender_to_idx = {}
    tuples = []

    for msg in messages:
        if msg["type"] == "system":
            continue
        content = (msg.get("content", "") or "").strip()
        if not content:
            continue
        d = date_key(msg)
        s = msg["sender"]

        if d not in date_to_idx:
            date_to_idx[d] = len(dates_list)
            dates_list.append(d)
        if s not in sender_to_idx:
            sender_to_idx[s] = len(senders_list)
            senders_list.append(s)

        tuples.append([msg["id"], date_to_idx[d], sender_to_idx[s], content])

    return {
        "dates": dates_list,
        "senders": senders_list,
        "messages": tuples,
    }


def write_json(path, data):
    """Write JSON to file, creating directories as needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))


def write_global_search_index(sources):
    """One immutable, dictionary-encoded index shared by global and chat search."""
    conversations, dates, senders, messages = [], [], [], []
    date_ids, sender_ids = {}, {}
    ordered = []
    for conversation_index, (conv_id, data, _) in enumerate(sources):
        metadata = data["metadata"]
        others = [p for p in metadata["participants"] if p != "DV"]
        contact = metadata.get("group_name") or (others[0] if others else metadata["participants"][0])
        conversations.append({"id": conv_id, "contact": contact, **({"excerpt": True} if metadata.get("coverage") == "selected_public_excerpts" else {})})
        for message in data["messages"]:
            if message["type"] != "system" and (message.get("content") or "").strip():
                ordered.append((sort_time(message), conversation_index, message))

    # Newest results first, with a stable cursor across pages and conversations.
    ordered.sort(key=lambda item: item[0], reverse=True)
    for _, conversation_index, message in ordered:
        date, sender = date_key(message), message["sender"]
        if date not in date_ids:
            date_ids[date] = len(dates)
            dates.append(date)
        if sender not in sender_ids:
            sender_ids[sender] = len(senders)
            senders.append(sender)
        messages.append([conversation_index, message["id"], date_ids[date], sender_ids[sender], message["content"].strip()])

    payload = {"version": 1, "conversations": conversations, "dates": dates, "senders": senders, "messages": messages}
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    digest = hashlib.sha256(encoded).hexdigest()[:16]
    filename = f"search-index.{digest}.json"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / filename).write_bytes(encoded)
    write_json(OUTPUT_DIR / "search-manifest.json", {"version": 1, "file": filename, "message_count": len(messages)})
    print(f"Global search: {len(messages)} messages, {len(encoded) / (1024 * 1024):.2f} MB, {filename}")


REPORT_PDF = "data/source/IPJ-A-3298613-2026.pdf"
REPORT_PAGES_FALLBACK = 218
REPORT_SHA256_FALLBACK = "23cfdfa410c47ab09cbb2b443965e3a3095d9bc3dc5fb266efff76d6f5192b60"


def describe_report_document():
    """The police report as a document: path, hash and page count.

    Computed here, once, so every consumer (site, export, pre-rendered pages)
    reads the same values from conversations.json instead of recomputing.
    """
    path = ROOT / REPORT_PDF
    sha = REPORT_SHA256_FALLBACK
    pages = REPORT_PAGES_FALLBACK
    if path.exists():
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        try:
            info = subprocess.run(["pdfinfo", str(path)], capture_output=True, text=True, timeout=30)
            m = re.search(r"^Pages:\s+(\d+)", info.stdout, re.M)
            if m:
                pages = int(m.group(1))
        except (OSError, subprocess.SubprocessError):
            pass
    # The path is the repository's; the site does not serve the PDF. Say where it is.
    return {
        "file": REPORT_PDF,
        "url": f"https://github.com/vorcarozap/vorcarozap/blob/main/{REPORT_PDF}",
        "download": f"https://raw.githubusercontent.com/vorcarozap/vorcarozap/main/{REPORT_PDF}",
        "sha256": sha,
        "pages": pages,
    }


CALL_RE_PT = re.compile(r"^Chamada de (voz|v[ií]deo)(?: — duração (\d{1,2}:\d{2}))?( perdida)?", re.I)
CALL_RE_EN = re.compile(r"^(Missed )?(Voice|Video) call(?:, (\d+) (min|sec)|, (No answer)|, (Ended)|, (Tap to call back))?", re.I)


def describe_call(msg):
    """One call as the calls screen needs it: direction, kind, how it ended, how long.

    The Martha export writes calls in English ("Voice call, 3 min", "Missed
    video call, Tap to call back", "Voice call, No answer"); the police report
    in Portuguese ("Chamada de voz — duração 02:49", "Chamada de voz perdida").
    Both become the same record. Returns None for a line that is not a call.
    """
    text = (msg.get("content") or "").strip()
    kind, status, duration = None, None, None
    m = CALL_RE_PT.match(text)
    if m:
        kind = "video" if m.group(1).lower().startswith("v") and "d" in m.group(1).lower() else "voice"
        duration = m.group(2)
        status = "missed" if m.group(3) else ("completed" if duration else "ended")
    else:
        m = CALL_RE_EN.match(text)
        if not m:
            return None
        kind = m.group(2).lower()
        if m.group(1) or m.group(7):
            status = "missed"
        elif m.group(5):
            status = "no_answer"
        elif m.group(3):
            status = "completed"
            duration = f"{m.group(3)} {'min' if m.group(4).lower().startswith('min') else 's'}"
        else:
            status = "ended"
    return {
        "kind": kind,
        "status": status,
        "duration": duration,
        "outgoing": msg.get("sender") == "DV",
    }


def normalise_date_range(date_range):
    """Always {"start": ..., "end": ...}.

    data/messages.json uses that shape; the IPJ builder once emitted a pair.
    Consumers should not have to know which source a conversation came from.
    """
    if isinstance(date_range, dict):
        return {"start": date_range["start"], "end": date_range["end"]}
    start, end = date_range
    return {"start": start, "end": end}


def split_conversation(conv_id, data, index):
    """Write index, search index and per-date chunks for one conversation.

    Returns the entry describing it for conversations.json.
    """
    metadata = data["metadata"]
    messages = data["messages"]
    conv_dir = OUTPUT_DIR / conv_id

    by_date = group_messages_by_date(messages)
    dates = sorted(by_date.keys())
    if metadata.get("schema_version") == 2:
        # Explicit IDs avoid overlapping ranges when precision varies in a chat.
        index = {"dates": [{"date": key, "message_count": len(by_date[key]),
                            "first_message_id": min(m["id"] for m in by_date[key]),
                            "last_message_id": max(m["id"] for m in by_date[key]),
                            "message_ids": [m["id"] for m in by_date[key]]}
                           for key in dates]}

    by_month = group_messages_by_month(messages)
    months = sorted(by_month.keys())

    if conv_dir.exists():
        for old_f in conv_dir.glob("*.json"):
            old_f.unlink()

    write_json(conv_dir / "index.json", index)

    search_index = build_search_index(messages)
    write_json(conv_dir / "search-index.json", search_index)
    size_mb = os.path.getsize(conv_dir / "search-index.json") / (1024 * 1024)

    for ym in months:
        write_json(conv_dir / f"{ym}.json", {"month": ym, "messages": by_month[ym]})

    for msg in messages:
        if msg["type"] != "call":
            continue
        call = describe_call(msg)
        if call:
            CALLS.append({
                "conversation_id": conv_id,
                "message_id": msg["id"],
                "date": msg["date"],
                "timestamp": msg["timestamp"],
                **call,
            })

    print(f"{conv_id}: {len(messages)} messages, {len(dates)} dates, "
          f"search index {size_mb:.1f} MB")

    type_counts = Counter(msg["type"] for msg in messages)

    last_msg = messages[-1] if messages else None
    other = [p for p in metadata["participants"] if p != "DV"]
    entry = {
        "id": conv_id,
        "participants": metadata["participants"],
        # The other side, by name, so nobody has to know "the one that is not DV".
        "contact": other[0] if other else metadata["participants"][0],
        "date_range": normalise_date_range(metadata["date_range"]),
        "total_messages": metadata["total_messages"],
        # Drives the "Mídias, links e documentos" count in the contact drawer.
        "media_counts": {
            "images": type_counts["image"],
            "videos": type_counts["video"],
            "documents": type_counts["document"],
        },
        "last_message": {
            "content": last_msg["content"][:80],
            "timestamp": last_msg["timestamp"],
            "date": date_key(last_msg),
            "sender": last_msg["sender"],
        } if last_msg else None,
    }
    for key in ("phone", "saved_as", "source", "note", "is_group", "group_name", "sources", "context", "limitations", "coverage", "status", "publication_ready", "date_range_complete"):
        if metadata.get(key) is not None:
            entry[key] = metadata[key]
    if metadata.get("schema_version") == 2:
        reported = [key for key in dates if key != "undated"]
        entry["date_range"] = {"start": reported[0] if reported else None,
                               "end": reported[-1] if reported else None}
    if str(metadata.get("source", "")).startswith("IPJ-A") and REPORT_DOCUMENT:
        entry["source_document"] = REPORT_DOCUMENT
    return entry


REPORT_DOCUMENT = None
CALLS = []


def main():
    global REPORT_DOCUMENT
    REPORT_DOCUMENT = describe_report_document()
    data, index = load_source_data()
    sources = [(get_conversation_id(data["metadata"]), data, index)]
    sources.extend(load_extra_conversations())
    print()

    # Two sources sharing an id would overwrite each other's chunks in
    # public/data/<id>/ and produce a duplicate entry in conversations.json.
    seen = set()
    for conv_id, _, _ in sources:
        if conv_id in seen:
            print(f"Error: duplicate conversation id '{conv_id}'")
            sys.exit(1)
        seen.add(conv_id)

    entries = [split_conversation(*source) for source in sources]

    # Most recent conversation first, the way WhatsApp orders the chat list.
    entries.sort(key=lambda e: sort_time(e["last_message"]) if e["last_message"] else "",
                 reverse=True)
    write_json(OUTPUT_DIR / "conversations.json", {"conversations": entries})
    write_global_search_index(sources)

    # Every call, newest first — the calls screen reads this one file.
    CALLS.sort(key=lambda c: c["timestamp"], reverse=True)
    write_json(OUTPUT_DIR / "calls.json", {"calls": CALLS})
    print(f"calls.json: {len(CALLS)} calls")

    total = sum(e["total_messages"] for e in entries)
    print(f"\nDone! {len(entries)} conversations, {total} messages in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
