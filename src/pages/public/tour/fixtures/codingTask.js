// The coding task shown in the tour: TDV-4412 "Alert engine misfiring", the
// real library task at code-library/worlds/tickr/cells/backend-entry-001.
//
// Only the CANDIDATE repo is reproduced here — the same files a recruiter sees
// in the Task Library code view. The hidden tests, the reference solution and
// the internal task spec are deliberately absent; the "final" engine.py below
// is a partial excerpt written for the tour, not the reference solution.
//
// Because this page is public, treat tickr/backend-entry-001 as a demo task and
// keep it out of paid assessments.

const TICKET_MD = `# TDV-4412 — Alert engine misfiring

**Priority:** High · **Component:** alert-engine · **Reporter:** support

## What's happening

Users are complaining, loudly:

1. Alert **#4412** fired **37 times** last night for the same price move on
   NVDA. The user wants one notification when the price crosses their
   threshold, not a notification for every tick while it stays there.
2. A user got an alert this morning for a price the asset hit **an hour
   earlier**. By the time they opened the app the price was nowhere near it.

Support is drowning. Fix the alert engine.

## Where to look

The engine lives in \`app/engine.py\` (\`process_tick\`). It is called by
\`app/feed_consumer.py\` in production and by \`tools/replay.py\` locally.
A recorded slice of last night's real feed is in \`data/feed_recording.jsonl\` —
use it to reproduce the problem (\`python tools/replay.py\`).

Product behavior is specified in \`docs/PRODUCT_NOTES.md\`.

## Acceptance

- The two complaints above cannot recur.
- Visible tests pass: \`pytest tests/ -v\`
- Fill in \`DECISIONS.md\` (two short answers) before submitting.

*Do not change the signature of \`process_tick\` — it has multiple callers.*
`;

const README_MD = `# Tickr alert engine

## Setup
    pip install -r requirements.txt

## Reproduce the bug
    python tools/replay.py        # replays data/feed_recording.jsonl through the engine

## Run tests
    pytest tests/ -v
`;

const DECISIONS_MD = `# Decisions

Answer briefly (3–6 sentences each). These are read by your reviewer.

## 1. State

Fixing this bug requires the engine to remember things between ticks.
What state did you keep, where did you put it, and why there?

## 2. Bad input

The feed is not perfectly clean. When your engine receives a tick it decides
not to act on (duplicate, stale, malformed), what does it do with it, and why?
What are the trade-offs of your choice?
`;

const PRODUCT_NOTES_MD = `# Tickr — product behavior notes (source of truth for support & eng)

These notes describe how alerts are *supposed* to behave. When code and this
document disagree, this document wins — file a ticket.

## Alert semantics

- Alerts are **recurring**. An alert notifies the user every time the price
  *crosses* its threshold in the alert's direction. After firing, an alert
  re-arms once the price moves back to the other side of the threshold, and
  will fire again on the next crossing. Users delete alerts they no longer want.
- Alerts notify on price **movements**, not standing conditions. If a user
  creates an alert whose condition is *already satisfied* by the current price,
  the alert does not fire immediately — it fires on the next fresh crossing.
  (Support gets angry emails when people are notified about "moves" that
  happened before they even created the alert.)

## Feed contract (upstream: MarketPulse v2)

- Ticks are JSON objects:
  \`{"event_id": str, "symbol": str, "price": float, "timestamp": iso8601, "seq": int}\`
- \`timestamp\` has **second granularity**. Multiple legitimate ticks for the
  same symbol routinely share a timestamp during active trading.
- \`seq\` is a per-symbol sequence number, strictly increasing in true market
  order. \`(timestamp, seq)\` is the authoritative ordering for a symbol's ticks.
- Delivery is at-least-once: the same \`event_id\` may be delivered more than
  once. Delivery order is not guaranteed.

## Operational notes

- The alert worker is restarted on every deploy (multiple times per day) and
  may be recycled by the platform at any time. Anything the engine needs to
  remember must survive that.
`;

const SCHEMA_SQL = `-- Tickr database schema
-- Applied automatically by app.db.init_db()

CREATE TABLE IF NOT EXISTS alerts (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL,
    symbol      TEXT    NOT NULL,
    direction   TEXT    NOT NULL CHECK (direction IN ('above', 'below')),
    threshold   REAL    NOT NULL,
    created_at  TEXT    NOT NULL
);

-- One row per alert notification actually sent to a user.
CREATE TABLE IF NOT EXISTS alert_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id    INTEGER NOT NULL REFERENCES alerts(id),
    event_id    TEXT    NOT NULL,
    price       REAL    NOT NULL,
    tick_ts     TEXT    NOT NULL,
    fired_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Durable per-alert engine state. Written by the alert engine so that
-- crossing detection survives process restarts and worker recycling.
CREATE TABLE IF NOT EXISTS alert_state (
    alert_id        INTEGER PRIMARY KEY REFERENCES alerts(id),
    last_condition  INTEGER,          -- 1 if price satisfied the alert condition at last evaluation, else 0
    updated_at      TEXT NOT NULL
);

-- Durable record of processed feed events. Written by the alert engine so
-- that feed re-deliveries are ignored even across process restarts.
CREATE TABLE IF NOT EXISTS processed_events (
    event_id    TEXT PRIMARY KEY,
    symbol      TEXT NOT NULL,
    tick_ts     TEXT NOT NULL,
    seq         INTEGER NOT NULL
);

-- High-water mark per symbol for ordering. (timestamp, seq) of the newest
-- tick the engine has accepted for that symbol.
CREATE TABLE IF NOT EXISTS symbol_watermarks (
    symbol      TEXT PRIMARY KEY,
    tick_ts     TEXT NOT NULL,
    seq         INTEGER NOT NULL
);
`;

const DB_PY = `"""SQLite helpers. The database is the source of truth for everything Tickr
needs to remember — see schema.sql."""

import sqlite3
from pathlib import Path

SCHEMA_PATH = Path(__file__).resolve().parent.parent / "schema.sql"
DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "tickr.db"


def get_conn(db_path=DEFAULT_DB_PATH):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(conn):
    conn.executescript(SCHEMA_PATH.read_text())
    conn.commit()
`;

export const ENGINE_STARTER = `"""Alert engine.

process_tick(tick, alerts, conn) is called once per incoming feed tick by
app/feed_consumer.py (production) and tools/replay.py (local).
"""

from app.notifier import fire_alert


def process_tick(tick, alerts, conn):
    for alert in alerts:
        if alert.symbol != tick["symbol"]:
            continue
        if alert.direction == "above" and tick["price"] >= alert.threshold:
            fire_alert(alert, tick, conn)
        elif alert.direction == "below" and tick["price"] <= alert.threshold:
            fire_alert(alert, tick, conn)
`;

// What the in-IDE assistant proposes from the ticket alone. It passes the
// visible tests and carries the traps the task was built around: state lives
// in process memory, ordering uses the second-granularity timestamp only, and
// a condition that is already true on first sight fires.
export const ENGINE_AI = `"""Alert engine.

process_tick(tick, alerts, conn) is called once per incoming feed tick by
app/feed_consumer.py (production) and tools/replay.py (local).
"""

from app.notifier import fire_alert

# Remember the previous condition per alert so we only fire on a crossing.
_last_condition = {}
_last_ts = {}


def process_tick(tick, alerts, conn):
    symbol = tick["symbol"]

    # Ignore stale or duplicate ticks.
    if symbol in _last_ts and tick["timestamp"] <= _last_ts[symbol]:
        return
    _last_ts[symbol] = tick["timestamp"]

    for alert in alerts:
        if alert.symbol != symbol:
            continue
        if alert.direction == "above":
            condition = tick["price"] >= alert.threshold
        else:
            condition = tick["price"] <= alert.threshold

        if condition and not _last_condition.get(alert.id, False):
            fire_alert(alert, tick, conn)
        _last_condition[alert.id] = condition
`;

// The candidate's rewrite, excerpted. Helper bodies are elided on purpose.
export const ENGINE_FINAL = `"""Alert engine.

process_tick(tick, alerts, conn) is called once per incoming feed tick by
app/feed_consumer.py (production) and tools/replay.py (local).

State lives in SQLite (alert_state, processed_events, symbol_watermarks), not
in this process: the worker restarts on every deploy (docs/PRODUCT_NOTES.md).
"""

import logging

from app.notifier import fire_alert

log = logging.getLogger(__name__)


def process_tick(tick, alerts, conn):
    symbol = tick["symbol"]
    position = (tick["timestamp"], tick["seq"])   # authoritative order, not ts alone

    if _already_processed(conn, tick["event_id"]):
        return                                    # at-least-once delivery
    watermark = _watermark(conn, symbol)
    if watermark is not None and position <= watermark:
        log.info("tick %s rejected reason=stale", tick["event_id"])
        _mark_processed(conn, tick)
        return

    for alert in (a for a in alerts if a.symbol == symbol):
        now = _condition(alert, tick["price"])
        before = _last_condition(conn, alert.id)  # None = first observation
        if before is False and now:
            fire_alert(alert, tick, conn)         # a fresh crossing only
        _save_condition(conn, alert.id, now)

    _save_watermark(conn, symbol, position)
    _mark_processed(conn, tick)
    conn.commit()


# ... _already_processed / _watermark / _condition / _last_condition /
#     _save_condition / _save_watermark / _mark_processed (28 lines)
`;

const FEED_CONSUMER_PY = `"""Production entry point: consumes the MarketPulse feed and hands each tick
to the alert engine. Do not add business logic here."""

import json

from app.db import get_conn, init_db
from app.engine import process_tick
from app.models import load_alerts


def consume(feed_lines, conn):
    alerts = load_alerts(conn)
    for line in feed_lines:
        line = line.strip()
        if not line:
            continue
        tick = json.loads(line)
        process_tick(tick, alerts, conn)


def main(feed_path):  # pragma: no cover
    conn = get_conn()
    init_db(conn)
    with open(feed_path) as f:
        consume(f, conn)
`;

const MODELS_PY = `from dataclasses import dataclass


@dataclass
class Alert:
    id: int
    user_id: int
    symbol: str
    direction: str  # "above" | "below"
    threshold: float
    created_at: str


def load_alerts(conn):
    rows = conn.execute(
        "SELECT id, user_id, symbol, direction, threshold, created_at FROM alerts"
    ).fetchall()
    return [Alert(**dict(r)) for r in rows]
`;

const NOTIFIER_PY = `"""Outbound notifications. Every fired alert is recorded in alert_events —
that row is what actually reaches the user's phone."""


def fire_alert(alert, tick, conn):
    conn.execute(
        "INSERT INTO alert_events (alert_id, event_id, price, tick_ts) VALUES (?, ?, ?, ?)",
        (alert.id, tick["event_id"], tick["price"], tick["timestamp"]),
    )
    conn.commit()
`;

const FEED_JSONL = `{"event_id": "mp-nvda-1001", "symbol": "NVDA", "price": 188.4, "timestamp": "2026-07-14T09:30:01+00:00", "seq": 1001}
{"event_id": "mp-nvda-1002", "symbol": "NVDA", "price": 189.2, "timestamp": "2026-07-14T09:30:04+00:00", "seq": 1002}
{"event_id": "mp-nvda-1003", "symbol": "NVDA", "price": 190.6, "timestamp": "2026-07-14T09:30:07+00:00", "seq": 1003}
{"event_id": "mp-nvda-1004", "symbol": "NVDA", "price": 190.8, "timestamp": "2026-07-14T09:30:10+00:00", "seq": 1004}
{"event_id": "mp-nvda-1005", "symbol": "NVDA", "price": 190.95, "timestamp": "2026-07-14T09:30:11+00:00", "seq": 1005}
{"event_id": "mp-nvda-1006", "symbol": "NVDA", "price": 191.1, "timestamp": "2026-07-14T09:30:12+00:00", "seq": 1006}
`;

const HELPERS_PY = `import importlib
import json
from pathlib import Path

import app.engine
from app.db import get_conn
from app.models import Alert

SCHEMA = (Path(__file__).resolve().parent.parent / "schema.sql").read_text()


def fresh_db():
    conn = get_conn(":memory:")
    conn.executescript(SCHEMA)
    conn.commit()
    return conn


def make_alert(conn, id=1, symbol="NVDA", direction="above", threshold=190.0,
               created_at="2026-07-14T00:00:00+00:00", user_id=1):
    conn.execute(
        "INSERT INTO alerts (id, user_id, symbol, direction, threshold, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (id, user_id, symbol, direction, threshold, created_at),
    )
    conn.commit()
    return Alert(id=id, user_id=user_id, symbol=symbol, direction=direction,
                 threshold=threshold, created_at=created_at)


def tick(event_id, symbol, price, ts, seq):
    return {"event_id": event_id, "symbol": symbol, "price": price,
            "timestamp": ts, "seq": seq}


def engine():
    return importlib.reload(app.engine)


def restart_engine():
    """Simulate a worker restart: any state the engine kept in process memory
    is gone; only the database survives."""
    return importlib.reload(app.engine)


def fires(conn):
    return conn.execute(
        "SELECT alert_id, event_id, price, tick_ts FROM alert_events ORDER BY id"
    ).fetchall()
`;

const TEST_VISIBLE_PY = `"""Visible test suite for TDV-4412. Run: pytest tests/ -v"""

from tests.helpers import fresh_db, make_alert, tick, engine, fires


def test_fires_on_upward_crossing():
    conn, eng = fresh_db(), engine()
    a = make_alert(conn, symbol="NVDA", direction="above", threshold=190.0)
    eng.process_tick(tick("e1", "NVDA", 188.0, "2026-07-14T09:30:01+00:00", 1), [a], conn)
    eng.process_tick(tick("e2", "NVDA", 191.0, "2026-07-14T09:30:05+00:00", 2), [a], conn)
    assert len(fires(conn)) == 1


def test_fires_on_downward_crossing():
    conn, eng = fresh_db(), engine()
    a = make_alert(conn, symbol="AAPL", direction="below", threshold=210.0)
    eng.process_tick(tick("e1", "AAPL", 212.0, "2026-07-14T09:30:01+00:00", 1), [a], conn)
    eng.process_tick(tick("e2", "AAPL", 209.0, "2026-07-14T09:30:05+00:00", 2), [a], conn)
    assert len(fires(conn)) == 1


def test_no_fire_for_other_symbols():
    conn, eng = fresh_db(), engine()
    a = make_alert(conn, symbol="NVDA", direction="above", threshold=190.0)
    eng.process_tick(tick("e1", "TSLA", 999.0, "2026-07-14T09:30:01+00:00", 1), [a], conn)
    assert len(fires(conn)) == 0


def test_no_fire_below_threshold():
    conn, eng = fresh_db(), engine()
    a = make_alert(conn, symbol="NVDA", direction="above", threshold=190.0)
    eng.process_tick(tick("e1", "NVDA", 185.0, "2026-07-14T09:30:01+00:00", 1), [a], conn)
    eng.process_tick(tick("e2", "NVDA", 186.0, "2026-07-14T09:30:05+00:00", 2), [a], conn)
    assert len(fires(conn)) == 0


def test_fires_once_for_sustained_breach():
    """Ticket complaint #1: alert 4412 fired 37 times for one move."""
    conn, eng = fresh_db(), engine()
    a = make_alert(conn, symbol="NVDA", direction="above", threshold=190.0)
    eng.process_tick(tick("e0", "NVDA", 188.0, "2026-07-14T09:30:00+00:00", 100), [a], conn)
    for i in range(37):
        eng.process_tick(
            tick(f"e{i+1}", "NVDA", 191.0 + i * 0.1, f"2026-07-14T09:31:{i:02d}+00:00", 101 + i),
            [a], conn,
        )
    assert len(fires(conn)) == 1, f"expected 1 notification for one move, got {len(fires(conn))}"


def test_stale_tick_does_not_fire():
    """Ticket complaint #2: user alerted for a price from an hour earlier."""
    conn, eng = fresh_db(), engine()
    a = make_alert(conn, symbol="AAPL", direction="below", threshold=210.0)
    eng.process_tick(tick("e1", "AAPL", 213.0, "2026-07-14T10:31:00+00:00", 500), [a], conn)
    # a tick from an hour ago arrives late
    eng.process_tick(tick("e2", "AAPL", 208.0, "2026-07-14T09:31:00+00:00", 400), [a], conn)
    assert len(fires(conn)) == 0
`;

const REPLAY_PY = `"""Replay the recorded feed slice through the engine against a throwaway DB.
Prints every alert_events row so you can see exactly what would have been
sent to users."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import get_conn, init_db
from app.feed_consumer import consume

RECORDING = Path(__file__).resolve().parent.parent / "data" / "feed_recording.jsonl"


def main():
    conn = get_conn(":memory:")
    init_db(conn)
    conn.executescript(
        """
        INSERT INTO alerts (id, user_id, symbol, direction, threshold, created_at) VALUES
          (4412, 101, 'NVDA', 'above', 190.0, '2026-07-14T00:00:00+00:00'),
          (4413, 102, 'AAPL', 'below', 210.0, '2026-07-14T00:00:00+00:00'),
          (4414, 103, 'TSLA', 'above', 250.0, '2026-07-14T09:29:00+00:00');
        """
    )
    conn.commit()
    with open(RECORDING) as f:
        consume(f, conn)
    rows = conn.execute(
        "SELECT alert_id, event_id, price, tick_ts FROM alert_events ORDER BY id"
    ).fetchall()
    print(f"{len(rows)} alert notifications sent:")
    for r in rows:
        print(f"  alert {r['alert_id']}  price={r['price']}  tick_ts={r['tick_ts']}  ({r['event_id']})")


if __name__ == "__main__":
    main()
`;

const file = (path, content, language) => ({ path, content, language, size: content.length });

/** The candidate repo as it is provisioned, before any edits. */
export const TASK_FILES = [
  file('TICKET.md', TICKET_MD, 'markdown'),
  file('README.md', README_MD, 'markdown'),
  file('DECISIONS.md', DECISIONS_MD, 'markdown'),
  file('requirements.txt', 'pytest>=8\n', 'text'),
  file('schema.sql', SCHEMA_SQL, 'sql'),
  file('app/__init__.py', '', 'python'),
  file('app/db.py', DB_PY, 'python'),
  file('app/engine.py', ENGINE_STARTER, 'python'),
  file('app/feed_consumer.py', FEED_CONSUMER_PY, 'python'),
  file('app/models.py', MODELS_PY, 'python'),
  file('app/notifier.py', NOTIFIER_PY, 'python'),
  file('data/feed_recording.jsonl', FEED_JSONL, 'json'),
  file('docs/PRODUCT_NOTES.md', PRODUCT_NOTES_MD, 'markdown'),
  file('tests/helpers.py', HELPERS_PY, 'python'),
  file('tests/test_visible.py', TEST_VISIBLE_PY, 'python'),
  file('tools/replay.py', REPLAY_PY, 'python'),
];

export const TASK_META = {
  id: 'TDV-4412',
  title: 'Alert engine misfiring',
  repo: 'tickr-alert-engine',
  language: 'Python 3.12',
  minutes: 75,
  aiLevel: 'Full AI access',
};

// ── What the candidate says to the in-IDE assistant ─────────────────────────

export const AI_PROMPT =
  "process_tick in app/engine.py fires on every tick while the price stays past the threshold, and it fires on stale ticks. Fix it so an alert fires once per crossing and old ticks are ignored. Don't change the signature.";

export const AI_REPLY =
  'The engine has no memory between ticks, so every tick that satisfies the condition fires. Track the previous condition per alert and fire only on a false → true transition, and drop ticks older than the last one seen for the symbol:';

// ── Terminal transcripts ────────────────────────────────────────────────────

export const TERM_REPLAY_BEFORE = [
  { kind: 'out', text: '30 alert notifications sent:' },
  { kind: 'out', text: '  alert 4412  price=190.6  tick_ts=2026-07-14T09:30:07+00:00  (mp-nvda-1003)' },
  { kind: 'out', text: '  alert 4412  price=190.6  tick_ts=2026-07-14T09:30:07+00:00  (mp-nvda-1003)' },
  { kind: 'out', text: '  alert 4412  price=190.8  tick_ts=2026-07-14T09:30:10+00:00  (mp-nvda-1004)' },
  { kind: 'out', text: '  alert 4412  price=190.95 tick_ts=2026-07-14T09:30:11+00:00  (mp-nvda-1005)' },
  { kind: 'dim', text: '  … 26 more' },
];

export const TERM_PYTEST = [
  { kind: 'out', text: 'tests/test_visible.py::test_fires_on_upward_crossing PASSED' },
  { kind: 'out', text: 'tests/test_visible.py::test_fires_on_downward_crossing PASSED' },
  { kind: 'out', text: 'tests/test_visible.py::test_no_fire_for_other_symbols PASSED' },
  { kind: 'out', text: 'tests/test_visible.py::test_no_fire_below_threshold PASSED' },
  { kind: 'out', text: 'tests/test_visible.py::test_fires_once_for_sustained_breach PASSED' },
  { kind: 'out', text: 'tests/test_visible.py::test_stale_tick_does_not_fire PASSED' },
  { kind: 'ok', text: '======================== 6 passed in 0.41s ========================' },
];

export const TERM_REPLAY_AFTER = [
  { kind: 'out', text: '4 alert notifications sent:' },
  { kind: 'out', text: '  alert 4412  price=190.6  tick_ts=2026-07-14T09:30:07+00:00  (mp-nvda-1003)' },
  { kind: 'out', text: '  alert 4412  price=190.4  tick_ts=2026-07-14T09:31:18+00:00  (mp-nvda-1025)' },
  { kind: 'out', text: '  alert 4413  price=209.7  tick_ts=2026-07-14T10:02:44+00:00  (mp-aapl-2002)' },
  { kind: 'out', text: '  alert 4414  price=251.2  tick_ts=2026-07-14T09:41:09+00:00  (mp-tsla-3004)' },
];
