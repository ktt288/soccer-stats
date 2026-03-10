import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const DEFAULT_PLAYERS = [
  { id: 1, name: "れん",       number: 1, position: "GK", starter: true },
  { id: 2, name: "ようしろう", number: 2, position: "DF", starter: true },
  { id: 3, name: "なおと",     number: 3, position: "DF", starter: true },
  { id: 4, name: "はるき",     number: 4, position: "MF", starter: true },
  { id: 5, name: "たすく",     number: 5, position: "MF", starter: true },
  { id: 6, name: "りんたろう", number: 6, position: "MF", starter: true },
  { id: 7, name: "こうたろう", number: 7, position: "FW", starter: true },
  { id: 8, name: "えいと",     number: 8, position: "FW", starter: true },
];

const DEFAULT_EVENTS = [
  { id: "intercept", label: "インターセプト", emoji: "✋", color: "#e91e63", max: 5,  inRadar: true },
  { id: "shot",      label: "シュート",       emoji: "🎯", color: "#2979ff", max: 10, inRadar: true },
  { id: "pass",      label: "パス成功",       emoji: "✅", color: "#00bcd4", max: 20, inRadar: true },
  { id: "dribble",   label: "ドリブル突破",   emoji: "🔥", color: "#ff6d00", max: 10, inRadar: true },
  { id: "press",     label: "プレス",         emoji: "⚡", color: "#ffd600", max: 10, inRadar: true },
  { id: "cover",     label: "カバー",         emoji: "🛡️", color: "#7c4dff", max: 10, inRadar: true },
];

const POS_COLOR = { GK: "#ffd600", DF: "#00bcd4", MF: "#00c853", FW: "#ff6d00" };

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ---- Radar Chart (SVG, no lib) ----
function RadarChart({ data, color, size = 160, events }) {
  const radarEvents = events.filter(ev => ev.inRadar);
  const n = radarEvents.length;
  if (n < 3) return (
    <div style={{ color: "#4a7fa5", fontSize: 12, textAlign: "center", padding: 20 }}>
      レーダーには3項目以上が必要です
    </div>
  );

  const cx = size / 2, cy = size / 2;
  const r = size * 0.36;
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i, ratio) => ({
    x: cx + r * ratio * Math.cos(angle(i)),
    y: cy + r * ratio * Math.sin(angle(i)),
  });
  const grids = [0.25, 0.5, 0.75, 1.0];
  const dataPoints = radarEvents.map((ev, i) => pt(i, Math.min((data[ev.id] || 0) / (ev.max || 10), 1)));
  const polyPoints = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {grids.map((g, gi) => (
        <polygon key={gi}
          points={radarEvents.map((_, i) => { const p = pt(i, g); return `${p.x},${p.y}`; }).join(" ")}
          fill="none" stroke="#1e3a5f" strokeWidth="1"
        />
      ))}
      {radarEvents.map((_, i) => {
        const outer = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#1e3a5f" strokeWidth="1" />;
      })}
      <polygon points={polyPoints} fill={color + "44"} stroke={color} strokeWidth="2" />
      {dataPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />)}
      {radarEvents.map((ev, i) => {
        const lp = pt(i, 1.32);
        return (
          <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="8.5" fill="#7a9bbf" fontFamily="sans-serif">
            {ev.label}
          </text>
        );
      })}
    </svg>
  );
}

// ---- Ranking Bar ----
function RankBar({ players, stats, eventId, color, emoji, label }) {
  const sorted = [...players].sort((a, b) => (stats[b.id]?.[eventId] ?? 0) - (stats[a.id]?.[eventId] ?? 0));
  const max = Math.max(...players.map(p => stats[p.id]?.[eventId] ?? 0), 1);
  return (
    <div style={{ background: "#0d1b2e", border: "1px solid #1e3a5f", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color }}>{label} ランキング</span>
      </div>
      {sorted.map((p, i) => {
        const val = stats[p.id]?.[eventId] ?? 0;
        return (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? "#ffd600" : "#2a4a6a", width: 18, textAlign: "center" }}>
              {i === 0 ? "👑" : i + 1}
            </div>
            <div style={{ fontSize: 11, color: POS_COLOR[p.position], width: 22, textAlign: "right", fontWeight: 700 }}>#{p.number}</div>
            <div style={{ fontSize: 12, width: 60, color: "#c8d8e8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.name.split(" ").at(-1)}
            </div>
            <div style={{ flex: 1, background: "#0a0f1e", borderRadius: 4, height: 8, overflow: "hidden" }}>
              <div style={{
                width: `${(val / max) * 100}%`, height: "100%",
                background: `linear-gradient(90deg, ${color}, ${color}88)`,
                borderRadius: 4, transition: "width 0.5s", minWidth: val > 0 ? 6 : 0,
              }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 900, color: val > 0 ? color : "#2a4a6a", width: 24, textAlign: "right" }}>
              {val}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Player Card (record / radar tab) ----
function PlayerCard({ p, selected, onClick }) {
  const posColor = POS_COLOR[p.position] || "#e8eaf0";
  return (
    <button onClick={onClick} style={{
      background: selected ? `linear-gradient(135deg, ${posColor}33, ${posColor}66)` : "#0d1b2e",
      border: selected ? `2px solid ${posColor}` : "2px solid #1e3a5f",
      borderRadius: 10, padding: "10px 4px", cursor: "pointer", textAlign: "center",
      transition: "all 0.15s", transform: selected ? "scale(1.05)" : "scale(1)",
    }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: selected ? posColor : "#e8eaf0", lineHeight: 1 }}>{p.number}</div>
      <div style={{ fontSize: 9, color: "#4a7fa5", marginTop: 2, lineHeight: 1.2 }}>{p.name.split(" ").at(-1)}</div>
      <div style={{ fontSize: 8, color: posColor, fontWeight: 700, marginTop: 2 }}>{p.position}</div>
    </button>
  );
}

// ---- Event Editor Row ----
function EventEditorRow({ ev, onUpdate, onDelete, canDelete }) {
  return (
    <div style={{ background: "#0d1b2e", border: "1px solid #1e3a5f", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <input
          value={ev.emoji}
          onChange={e => onUpdate("emoji", e.target.value)}
          style={{
            width: 44, background: "#0a0f1e", border: "1px solid #1e3a5f",
            borderRadius: 6, padding: "6px 4px", color: "#e8eaf0",
            fontFamily: "inherit", textAlign: "center", outline: "none",
          }}
          onFocus={e => e.target.style.borderColor = "#00e5ff"}
          onBlur={e => e.target.style.borderColor = "#1e3a5f"}
        />
        <input
          value={ev.label}
          onChange={e => onUpdate("label", e.target.value)}
          placeholder="項目名"
          style={{
            flex: 1, background: "#0a0f1e", border: "1px solid #1e3a5f",
            borderRadius: 6, padding: "6px 10px", color: "#e8eaf0",
            fontFamily: "inherit", outline: "none",
          }}
          onFocus={e => e.target.style.borderColor = "#00e5ff"}
          onBlur={e => e.target.style.borderColor = "#1e3a5f"}
        />
        <input
          type="color"
          value={ev.color}
          onChange={e => onUpdate("color", e.target.value)}
          style={{ width: 36, height: 34, border: "1px solid #1e3a5f", borderRadius: 6, padding: 2, background: "#0a0f1e", cursor: "pointer" }}
          title="色を選択"
        />
        {canDelete && (
          <button onClick={onDelete} style={{ background: "#3a1010", border: "1px solid #7a2020", borderRadius: 6, color: "#f44336", fontSize: 14, padding: "5px 10px", cursor: "pointer", lineHeight: 1 }}>
            ✕
          </button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#4a7fa5" }}>最大値:</span>
          <input
            type="number"
            value={ev.max}
            min={1}
            max={999}
            onChange={e => onUpdate("max", Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              width: 56, background: "#0a0f1e", border: "1px solid #1e3a5f",
              borderRadius: 6, padding: "4px 6px", color: "#e8eaf0",
              fontFamily: "inherit", outline: "none", textAlign: "center",
            }}
            onFocus={e => e.target.style.borderColor = "#00e5ff"}
            onBlur={e => e.target.style.borderColor = "#1e3a5f"}
          />
        </div>
        <button
          onClick={() => onUpdate("inRadar", !ev.inRadar)}
          style={{
            background: ev.inRadar ? "#1e3a5f" : "#0a0f1e",
            border: `1px solid ${ev.inRadar ? "#00e5ff" : "#1e3a5f"}`,
            borderRadius: 6, color: ev.inRadar ? "#00e5ff" : "#4a7fa5",
            fontSize: 11, padding: "4px 10px", cursor: "pointer", fontWeight: ev.inRadar ? 700 : 400,
          }}
        >
          🕸️ レーダーに表示
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("record");
  const [statsSubTab, setStatsSubTab] = useState("ranking");
  const [players, setPlayers] = useState(DEFAULT_PLAYERS);
  const [editPlayers, setEditPlayers] = useState(() =>
    Object.fromEntries(DEFAULT_PLAYERS.map(p => [p.id, { name: p.name, number: p.number, position: p.position, starter: p.starter }]))
  );
  const [events, setEvents] = useState(DEFAULT_EVENTS);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [radarPlayer, setRadarPlayer] = useState(DEFAULT_PLAYERS[0].id);
  const [stats, setStats] = useState(() => {
    const s = {};
    DEFAULT_PLAYERS.forEach(p => { s[p.id] = Object.fromEntries(DEFAULT_EVENTS.map(ev => [ev.id, 0])); });
    return s;
  });
  const [log, setLog] = useState([]);
  const [matchTime, setMatchTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState(null);
  const [timerRef] = useState({ interval: null });
  const [saveModal, setSaveModal] = useState(false);
  const [saveNotes, setSaveNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [historyMatches, setHistoryMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedMatchEvents, setSelectedMatchEvents] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [matchDetailTab, setMatchDetailTab] = useState("log");
  const [matchStatsSubTab, setMatchStatsSubTab] = useState("ranking");
  const [matchRadarPlayerKey, setMatchRadarPlayerKey] = useState(null);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("played_at", { ascending: false })
      .limit(30);
    if (!error) setHistoryMatches(data || []);
    setLoadingHistory(false);
  };

  const loadMatchDetail = async (matchId) => {
    const { data, error } = await supabase
      .from("match_events")
      .select("*")
      .eq("match_id", matchId)
      .order("elapsed_seconds", { ascending: true });
    if (!error) setSelectedMatchEvents(data || []);
  };

  const saveMatch = async () => {
    if (log.length === 0) return;
    setSaving(true);
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .insert({ duration_seconds: matchTime, notes: saveNotes.trim() || null })
      .select()
      .single();
    if (matchError || !matchData) { setSaving(false); return; }
    const eventsToInsert = log.map(entry => {
      const player = players.find(p => p.name === entry.player && p.number === entry.number);
      return {
        match_id: matchData.id,
        player_id: player?.id ?? null,
        player_name: entry.player,
        player_number: entry.number,
        player_position: player?.position ?? null,
        event_id: events.find(e => e.label === entry.event)?.id ?? null,
        event_label: entry.event,
        elapsed_seconds: entry.time,
      };
    });
    await supabase.from("match_events").insert(eventsToInsert);
    setSaving(false);
    setSaveModal(false);
    setSaveNotes("");
    alert("試合データを保存しました！");
  };

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab]);

  const toggleTimer = () => {
    if (running) { clearInterval(timerRef.interval); setRunning(false); }
    else { timerRef.interval = setInterval(() => setMatchTime(t => t + 1), 1000); setRunning(true); }
  };

  const recordEvent = (eventId) => {
    if (!selectedPlayer) return;
    setStats(prev => ({
      ...prev,
      [selectedPlayer]: { ...prev[selectedPlayer], [eventId]: (prev[selectedPlayer][eventId] || 0) + 1 },
    }));
    const event = events.find(e => e.id === eventId);
    const player = players.find(p => p.id === selectedPlayer);
    setLog(prev => [{ time: matchTime, player: player.name, number: player.number, event: event.label, emoji: event.emoji, color: event.color, id: Date.now() }, ...prev]);
    setFlash(eventId);
    setTimeout(() => setFlash(null), 400);
  };

  const setEditPlayer = (id, field, value) => {
    setEditPlayers(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const applyPlayers = () => {
    setPlayers(prev => prev.map(p => {
      const e = editPlayers[p.id];
      return {
        ...p,
        name: e.name.trim() || p.name,
        number: parseInt(e.number) || p.number,
        position: e.position || p.position,
        starter: e.starter,
      };
    }));
  };

  const addPlayer = () => {
    const newId = Date.now();
    const newPlayer = { id: newId, name: "新しい選手", number: 99, position: "MF", starter: false };
    setPlayers(prev => [...prev, newPlayer]);
    setEditPlayers(prev => ({ ...prev, [newId]: { name: newPlayer.name, number: newPlayer.number, position: newPlayer.position, starter: newPlayer.starter } }));
    setStats(prev => ({ ...prev, [newId]: Object.fromEntries(events.map(ev => [ev.id, 0])) }));
  };

  const deletePlayer = (id) => {
    setPlayers(prev => {
      const remaining = prev.filter(p => p.id !== id);
      if (radarPlayer === id && remaining.length > 0) setRadarPlayer(remaining[0].id);
      return remaining;
    });
    setEditPlayers(prev => { const { [id]: _, ...rest } = prev; return rest; });
    setStats(prev => { const { [id]: _, ...rest } = prev; return rest; });
    if (selectedPlayer === id) setSelectedPlayer(null);
  };

  const updateEvent = (id, field, value) => {
    setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, [field]: value } : ev));
  };

  const addEvent = () => {
    const newId = `event_${Date.now()}`;
    const newEvent = { id: newId, label: "新しい項目", emoji: "⭐", color: "#9c27b0", max: 10, inRadar: false };
    setEvents(prev => [...prev, newEvent]);
    setStats(prev => {
      const updated = {};
      Object.keys(prev).forEach(pid => { updated[pid] = { ...prev[pid], [newId]: 0 }; });
      return updated;
    });
  };

  const deleteEvent = (id) => {
    if (events.length <= 1) return;
    setEvents(prev => prev.filter(ev => ev.id !== id));
    setStats(prev => {
      const updated = {};
      Object.keys(prev).forEach(pid => { const { [id]: _, ...rest } = prev[pid]; updated[pid] = rest; });
      return updated;
    });
  };

  const totalFor = (playerId) => {
    const s = stats[playerId] || {};
    return events.reduce((sum, ev) => sum + (s[ev.id] || 0), 0);
  };

  const starters = players.filter(p => p.starter);
  const subs = players.filter(p => !p.starter);
  const overallSorted = [...players].sort((a, b) => totalFor(b.id) - totalFor(a.id));
  const currentRadarPlayer = players.find(p => p.id === radarPlayer) || players[0];

  // 履歴詳細用スタッツ集計
  const mPlayers = [];
  const mStats = {};
  const mEventMap = {};
  selectedMatchEvents.forEach(entry => {
    const key = `${entry.player_number}_${entry.player_name}`;
    if (!mStats[key]) {
      mStats[key] = {};
      mPlayers.push({ id: key, key, name: entry.player_name, number: entry.player_number, position: entry.player_position });
    }
    if (entry.event_id) {
      mStats[key][entry.event_id] = (mStats[key][entry.event_id] || 0) + 1;
      if (!mEventMap[entry.event_id]) mEventMap[entry.event_id] = entry.event_label;
    }
  });
  const mEventList = Object.entries(mEventMap).map(([id, label]) => {
    const ev = events.find(e => e.id === id);
    return { id, label, color: ev?.color || "#4a7fa5", emoji: ev?.emoji || "⭐", max: ev?.max || 10, inRadar: ev?.inRadar ?? true };
  });
  const mTotalFor = (key) => mEventList.reduce((s, ev) => s + (mStats[key]?.[ev.id] || 0), 0);
  const mSorted = [...mPlayers].sort((a, b) => mTotalFor(b.key) - mTotalFor(a.key));
  const mMaxTotal = Math.max(...mSorted.map(p => mTotalFor(p.key)), 1);
  const currentMatchRadarPlayer = mPlayers.find(p => p.key === matchRadarPlayerKey) || mPlayers[0];

  const sectionLabel = (text) => (
    <div style={{ fontSize: 11, color: "#4a7fa5", fontWeight: 700, letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>{text}</div>
  );

  const playerGrid = (list, selectedId, onSelect) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
      {list.map(p => <PlayerCard key={p.id} p={p} selected={selectedId === p.id} onClick={() => onSelect(p.id)} />)}
    </div>
  );

  return (
    <div style={{
      fontFamily: "'Noto Sans JP', sans-serif", background: "#07101f", minHeight: "100svh",
      color: "#e8eaf0", maxWidth: 480, width: "100%", margin: "0 auto",
      display: "flex", flexDirection: "column", boxSizing: "border-box", overflowX: "hidden",
    }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d2137, #0a1628)", padding: "16px 20px 12px", borderBottom: "1px solid #1e3a5f", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#4a7fa5", letterSpacing: 2, fontWeight: 700, textTransform: "uppercase" }}>101FC</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>スタッツ記録</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 900, fontVariantNumeric: "tabular-nums", color: running ? "#00e676" : "#fff", letterSpacing: 2, lineHeight: 1, transition: "color 0.3s" }}>
              {formatTime(matchTime)}
            </div>
            <button onClick={toggleTimer} style={{ marginTop: 4, background: running ? "#c62828" : "#1b5e20", color: "#fff", border: "none", borderRadius: 6, padding: "3px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 1 }}>
              {running ? "⏸ 停止" : "▶ 開始"}
            </button>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#7a9cc0", fontSize: 11, fontWeight: 600, padding: "6px 10px", cursor: "pointer" }}
          >
            ログアウト
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "#0d1b2e", borderBottom: "1px solid #1e3a5f", flexShrink: 0 }}>
        {[{ id: "record", label: "📝 記録" }, { id: "stats", label: "📊 スタッツ" }, { id: "log", label: "📋 ログ" }, { id: "history", label: "📅 履歴" }, { id: "settings", label: "⚙️ 設定" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "12px 0", background: "none", border: "none", color: tab === t.id ? "#00e5ff" : "#4a7fa5", fontWeight: tab === t.id ? 700 : 400, fontSize: 12, cursor: "pointer", borderBottom: tab === t.id ? "2px solid #00e5ff" : "2px solid transparent", transition: "all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px", boxSizing: "border-box" }}>

        {/* ===== RECORD TAB ===== */}
        {tab === "record" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              {/* Starters */}
              {sectionLabel("スタメン")}
              {playerGrid(starters, selectedPlayer, setSelectedPlayer)}

              {/* Subs */}
              {subs.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: "#ff9800", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>控え</div>
                    <div style={{ flex: 1, height: 1, background: "#1e3a5f" }} />
                  </div>
                  {playerGrid(subs, selectedPlayer, setSelectedPlayer)}
                </div>
              )}
            </div>

            <div>
              {sectionLabel("イベントを記録")}
              {!selectedPlayer ? (
                <div style={{ textAlign: "center", padding: "24px", color: "#2a4a6a", fontSize: 14, background: "#0d1b2e", borderRadius: 12, border: "1px dashed #1e3a5f" }}>
                  ↑ まず選手を選んでください
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {events.map(ev => (
                    <button key={ev.id} onClick={() => recordEvent(ev.id)} style={{
                      background: flash === ev.id ? `${ev.color}44` : "#0d1b2e",
                      border: `2px solid ${flash === ev.id ? ev.color : "#1e3a5f"}`,
                      borderRadius: 12, padding: "16px 12px", cursor: "pointer", textAlign: "left",
                      transition: "all 0.1s", transform: flash === ev.id ? "scale(0.97)" : "scale(1)",
                    }}>
                      <div style={{ fontSize: 22 }}>{ev.emoji}</div>
                      <div style={{ fontSize: 12, color: ev.color, fontWeight: 700, marginTop: 4 }}>{ev.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginTop: 2 }}>
                        {stats[selectedPlayer]?.[ev.id] ?? 0}
                        <span style={{ fontSize: 10, color: "#4a7fa5", fontWeight: 400, marginLeft: 2 }}>回</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== STATS TAB ===== */}
        {tab === "stats" && (
          <div>
            <div style={{ display: "flex", background: "#0a0f1e", borderRadius: 10, padding: 4, marginBottom: 16, gap: 4 }}>
              {[{ id: "ranking", label: "🏆 ランキング" }, { id: "radar", label: "🕸️ レーダー" }, { id: "overall", label: "📋 総合" }].map(st => (
                <button key={st.id} onClick={() => setStatsSubTab(st.id)} style={{
                  flex: 1, padding: "8px 4px", background: statsSubTab === st.id ? "#1e3a5f" : "none",
                  border: "none", borderRadius: 7, color: statsSubTab === st.id ? "#00e5ff" : "#4a7fa5",
                  fontWeight: statsSubTab === st.id ? 700 : 400, fontSize: 11, cursor: "pointer", transition: "all 0.2s",
                }}>
                  {st.label}
                </button>
              ))}
            </div>

            {statsSubTab === "ranking" && (
              <div>
                {events.map(ev => (
                  <RankBar key={ev.id} players={players} stats={stats} eventId={ev.id} color={ev.color} emoji={ev.emoji} label={ev.label} />
                ))}
              </div>
            )}

            {statsSubTab === "radar" && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  {sectionLabel("選手を選ぶ")}
                  {playerGrid(players, radarPlayer, setRadarPlayer)}
                </div>
                {currentRadarPlayer && (
                  <div style={{ background: "#0d1b2e", border: `1px solid ${POS_COLOR[currentRadarPlayer.position]}44`, borderRadius: 16, padding: "20px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <div style={{ fontSize: 36, fontWeight: 900, color: POS_COLOR[currentRadarPlayer.position], lineHeight: 1 }}>{currentRadarPlayer.number}</div>
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{currentRadarPlayer.name}</div>
                        <div style={{ fontSize: 11, color: POS_COLOR[currentRadarPlayer.position], fontWeight: 700 }}>{currentRadarPlayer.position}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                      <RadarChart data={stats[radarPlayer] || {}} color={POS_COLOR[currentRadarPlayer.position]} size={200} events={events} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {events.map(ev => (
                        <div key={ev.id} style={{ background: "#0a0f1e", borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: ev.color, fontWeight: 700 }}>{ev.emoji} {ev.label}</span>
                            <span style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{stats[radarPlayer]?.[ev.id] ?? 0}</span>
                          </div>
                          <div style={{ background: "#1e3a5f", borderRadius: 3, height: 4, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(((stats[radarPlayer]?.[ev.id] ?? 0) / (ev.max || 10)) * 100, 100)}%`, height: "100%", background: ev.color, borderRadius: 3, transition: "width 0.5s" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {statsSubTab === "overall" && (
              <div>
                {sectionLabel("総合ランキング")}
                {overallSorted.map((p, rank) => {
                  const s = stats[p.id] || {};
                  const total = totalFor(p.id);
                  const maxTotal = Math.max(...players.map(pl => totalFor(pl.id)), 1);
                  return (
                    <div key={p.id} style={{ background: "#0d1b2e", border: rank === 0 ? `1px solid ${POS_COLOR[p.position]}88` : "1px solid #1e3a5f", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ fontSize: 14, fontWeight: 900, color: rank === 0 ? "#ffd600" : "#2a4a6a", width: 20 }}>
                            {rank === 0 ? "👑" : rank + 1}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>
                              <span style={{ color: POS_COLOR[p.position], marginRight: 6, fontSize: 12 }}>#{p.number}</span>
                              {p.name}
                              {!p.starter && <span style={{ fontSize: 10, color: "#ff9800", marginLeft: 6, fontWeight: 600 }}>控え</span>}
                            </div>
                            <div style={{ fontSize: 10, color: POS_COLOR[p.position] }}>{p.position}</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ background: "#0a0f1e", borderRadius: 4, height: 6, marginBottom: 8, overflow: "hidden" }}>
                        <div style={{ width: `${(total / maxTotal) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${POS_COLOR[p.position]}, ${POS_COLOR[p.position]}88)`, borderRadius: 4, transition: "width 0.5s" }} />
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {events.map(ev => (s[ev.id] ?? 0) > 0 && (
                          <div key={ev.id} style={{ background: `${ev.color}18`, border: `1px solid ${ev.color}44`, borderRadius: 6, padding: "2px 8px", fontSize: 11, color: ev.color, fontWeight: 600 }}>
                            {ev.emoji} {s[ev.id]}
                          </div>
                        ))}
                        {total === 0 && <div style={{ fontSize: 11, color: "#2a4a6a" }}>まだ記録なし</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== HISTORY TAB ===== */}
        {tab === "history" && (
          <div>
            {sectionLabel("試合履歴")}
            {loadingHistory && <div style={{ textAlign: "center", padding: 40, color: "#4a7fa5" }}>読み込み中...</div>}
            {!loadingHistory && historyMatches.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#2a4a6a", fontSize: 14, background: "#0d1b2e", borderRadius: 12, border: "1px dashed #1e3a5f" }}>
                保存された試合がありません
              </div>
            )}
            {!selectedMatch && historyMatches.map(m => (
              <button key={m.id} onClick={() => { setSelectedMatch(m); loadMatchDetail(m.id); }}
                style={{ width: "100%", display: "block", background: "#0d1b2e", border: "1px solid #1e3a5f", borderRadius: 12, padding: "14px 16px", marginBottom: 10, cursor: "pointer", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf0" }}>
                    {new Date(m.played_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div style={{ fontSize: 12, color: "#00e5ff" }}>{formatTime(m.duration_seconds ?? 0)}</div>
                </div>
                {m.notes && <div style={{ fontSize: 11, color: "#4a7fa5", marginTop: 4 }}>{m.notes}</div>}
              </button>
            ))}
            {selectedMatch && (
              <div>
                <button onClick={() => { setSelectedMatch(null); setSelectedMatchEvents([]); setMatchDetailTab("log"); }}
                  style={{ background: "none", border: "1px solid #1e3a5f", borderRadius: 8, color: "#4a7fa5", fontSize: 12, padding: "6px 14px", cursor: "pointer", marginBottom: 14 }}>
                  ← 一覧に戻る
                </button>
                <div style={{ background: "#0d1b2e", border: "1px solid #1e3a5f", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                    {new Date(selectedMatch.played_at).toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div style={{ fontSize: 12, color: "#00e5ff" }}>試合時間: {formatTime(selectedMatch.duration_seconds ?? 0)}</div>
                  {selectedMatch.notes && <div style={{ fontSize: 12, color: "#4a7fa5", marginTop: 4 }}>{selectedMatch.notes}</div>}
                </div>

                {/* サブタブ */}
                <div style={{ display: "flex", background: "#0a0f1e", borderRadius: 10, padding: 4, marginBottom: 16, gap: 4 }}>
                  {[{ id: "log", label: "📋 ログ" }, { id: "stats", label: "📊 スタッツ" }].map(st => (
                    <button key={st.id} onClick={() => setMatchDetailTab(st.id)} style={{
                      flex: 1, padding: "8px 4px", background: matchDetailTab === st.id ? "#1e3a5f" : "none",
                      border: "none", borderRadius: 7, color: matchDetailTab === st.id ? "#00e5ff" : "#4a7fa5",
                      fontWeight: matchDetailTab === st.id ? 700 : 400, fontSize: 12, cursor: "pointer",
                    }}>
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* ログ */}
                {matchDetailTab === "log" && (
                  <>
                    {selectedMatchEvents.length === 0 && (
                      <div style={{ textAlign: "center", padding: "24px", color: "#2a4a6a", fontSize: 13 }}>イベントなし</div>
                    )}
                    {selectedMatchEvents.map((entry, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "#0d1b2e", border: "1px solid #1e3a5f", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: "#00e5ff", fontVariantNumeric: "tabular-nums", minWidth: 40 }}>{formatTime(entry.elapsed_seconds)}</div>
                        <div style={{ background: "#162030", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 700, color: "#e8eaf0", minWidth: 28, textAlign: "center" }}>#{entry.player_number}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.player_name}</div>
                        </div>
                        <div style={{ fontSize: 11, color: "#e8eaf0", fontWeight: 700, background: "#1e3a5f", padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
                          {entry.event_label}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* スタッツ */}
                {matchDetailTab === "stats" && (
                  <div>
                    {selectedMatchEvents.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "24px", color: "#2a4a6a", fontSize: 13 }}>イベントなし</div>
                    ) : (
                      <>
                        {/* スタッツサブタブ */}
                        <div style={{ display: "flex", background: "#0a0f1e", borderRadius: 10, padding: 4, marginBottom: 16, gap: 4 }}>
                          {[{ id: "ranking", label: "🏆 ランキング" }, { id: "radar", label: "🕸️ レーダー" }, { id: "overall", label: "📋 総合" }].map(st => (
                            <button key={st.id} onClick={() => setMatchStatsSubTab(st.id)} style={{
                              flex: 1, padding: "8px 4px", background: matchStatsSubTab === st.id ? "#1e3a5f" : "none",
                              border: "none", borderRadius: 7, color: matchStatsSubTab === st.id ? "#00e5ff" : "#4a7fa5",
                              fontWeight: matchStatsSubTab === st.id ? 700 : 400, fontSize: 11, cursor: "pointer",
                            }}>
                              {st.label}
                            </button>
                          ))}
                        </div>

                        {/* ランキング */}
                        {matchStatsSubTab === "ranking" && mEventList.map(ev => (
                          <RankBar key={ev.id} players={mPlayers} stats={mStats} eventId={ev.id} color={ev.color} emoji={ev.emoji} label={ev.label} />
                        ))}

                        {/* レーダー */}
                        {matchStatsSubTab === "radar" && (
                          <div>
                            <div style={{ marginBottom: 16 }}>
                              {sectionLabel("選手を選ぶ")}
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                                {mPlayers.map(p => (
                                  <PlayerCard key={p.key} p={p} selected={currentMatchRadarPlayer?.key === p.key} onClick={() => setMatchRadarPlayerKey(p.key)} />
                                ))}
                              </div>
                            </div>
                            {currentMatchRadarPlayer && (
                              <div style={{ background: "#0d1b2e", border: `1px solid ${POS_COLOR[currentMatchRadarPlayer.position]}44`, borderRadius: 16, padding: "20px 16px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                  <div style={{ fontSize: 36, fontWeight: 900, color: POS_COLOR[currentMatchRadarPlayer.position], lineHeight: 1 }}>{currentMatchRadarPlayer.number}</div>
                                  <div>
                                    <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{currentMatchRadarPlayer.name}</div>
                                    <div style={{ fontSize: 11, color: POS_COLOR[currentMatchRadarPlayer.position], fontWeight: 700 }}>{currentMatchRadarPlayer.position}</div>
                                  </div>
                                </div>
                                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                                  <RadarChart data={mStats[currentMatchRadarPlayer.key] || {}} color={POS_COLOR[currentMatchRadarPlayer.position]} size={200} events={mEventList} />
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                  {mEventList.map(ev => (
                                    <div key={ev.id} style={{ background: "#0a0f1e", borderRadius: 8, padding: "10px 12px" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, color: ev.color, fontWeight: 700 }}>{ev.emoji} {ev.label}</span>
                                        <span style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{mStats[currentMatchRadarPlayer.key]?.[ev.id] ?? 0}</span>
                                      </div>
                                      <div style={{ background: "#1e3a5f", borderRadius: 3, height: 4, overflow: "hidden" }}>
                                        <div style={{ width: `${Math.min(((mStats[currentMatchRadarPlayer.key]?.[ev.id] ?? 0) / ev.max) * 100, 100)}%`, height: "100%", background: ev.color, borderRadius: 3 }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 総合 */}
                        {matchStatsSubTab === "overall" && mSorted.map((p, rank) => {
                          const s = mStats[p.key] || {};
                          const total = mTotalFor(p.key);
                          const posColor = POS_COLOR[p.position] || "#e8eaf0";
                          return (
                            <div key={p.key} style={{ background: "#0d1b2e", border: rank === 0 ? `1px solid ${posColor}88` : "1px solid #1e3a5f", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                <div style={{ fontSize: 14, fontWeight: 900, color: rank === 0 ? "#ffd600" : "#2a4a6a", width: 20 }}>
                                  {rank === 0 ? "👑" : rank + 1}
                                </div>
                                <div>
                                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                                    <span style={{ color: posColor, marginRight: 6, fontSize: 12 }}>#{p.number}</span>
                                    {p.name}
                                  </div>
                                  <div style={{ fontSize: 10, color: posColor }}>{p.position}</div>
                                </div>
                                <div style={{ marginLeft: "auto", fontSize: 18, fontWeight: 900, color: posColor }}>{total}</div>
                              </div>
                              <div style={{ background: "#0a0f1e", borderRadius: 4, height: 6, marginBottom: 8, overflow: "hidden" }}>
                                <div style={{ width: `${(total / mMaxTotal) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${posColor}, ${posColor}88)`, borderRadius: 4 }} />
                              </div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {mEventList.map(ev => (s[ev.id] ?? 0) > 0 && (
                                  <div key={ev.id} style={{ background: `${ev.color}18`, border: `1px solid ${ev.color}44`, borderRadius: 6, padding: "2px 8px", fontSize: 11, color: ev.color, fontWeight: 600 }}>
                                    {ev.emoji} {s[ev.id]}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== SETTINGS TAB ===== */}
        {tab === "settings" && (
          <div>
            {/* Player Editor */}
            {sectionLabel("選手の編集")}
            {players.map(p => {
              const ep = editPlayers[p.id];
              if (!ep) return null;
              const posColor = POS_COLOR[ep.position] || "#e8eaf0";
              return (
                <div key={p.id} style={{ background: "#0d1b2e", border: `1px solid ${posColor}44`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <input
                      type="number"
                      value={ep.number}
                      min={1} max={99}
                      onChange={e => setEditPlayer(p.id, "number", e.target.value)}
                      style={{ width: 52, background: "#0a0f1e", border: "1px solid #1e3a5f", borderRadius: 6, padding: "6px 4px", color: posColor, fontWeight: 900, fontFamily: "inherit", outline: "none", textAlign: "center" }}
                      onFocus={e => e.target.style.borderColor = "#00e5ff"}
                      onBlur={e => e.target.style.borderColor = "#1e3a5f"}
                    />
                    <select
                      value={ep.position}
                      onChange={e => setEditPlayer(p.id, "position", e.target.value)}
                      style={{ width: 60, background: "#0a0f1e", border: "1px solid #1e3a5f", borderRadius: 6, padding: "6px 4px", color: posColor, fontWeight: 700, fontFamily: "inherit", outline: "none", cursor: "pointer" }}
                      onFocus={e => e.target.style.borderColor = "#00e5ff"}
                      onBlur={e => e.target.style.borderColor = "#1e3a5f"}
                    >
                      {["GK", "DF", "MF", "FW"].map(pos => <option key={pos} value={pos}>{pos}</option>)}
                    </select>
                    <input
                      value={ep.name}
                      onChange={e => setEditPlayer(p.id, "name", e.target.value)}
                      placeholder="選手名"
                      style={{ flex: 1, background: "#0a0f1e", border: "1px solid #1e3a5f", borderRadius: 6, padding: "6px 10px", color: "#e8eaf0", fontFamily: "inherit", outline: "none" }}
                      onFocus={e => e.target.style.borderColor = "#00e5ff"}
                      onBlur={e => e.target.style.borderColor = "#1e3a5f"}
                    />
                    <button
                      onClick={() => deletePlayer(p.id)}
                      style={{ background: "#3a1010", border: "1px solid #7a2020", borderRadius: 6, color: "#f44336", fontSize: 14, padding: "5px 10px", cursor: "pointer", lineHeight: 1, flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                  {/* Starter toggle */}
                  <button
                    onClick={() => setEditPlayer(p.id, "starter", !ep.starter)}
                    style={{
                      background: ep.starter ? "#0d2a1a" : "#1a1a0d",
                      border: `1px solid ${ep.starter ? "#00c853" : "#ff9800"}`,
                      borderRadius: 6, color: ep.starter ? "#00c853" : "#ff9800",
                      fontSize: 11, padding: "4px 12px", cursor: "pointer", fontWeight: 700,
                    }}
                  >
                    {ep.starter ? "✅ スタメン" : "🔄 控え"}
                  </button>
                </div>
              );
            })}
            <button
              onClick={addPlayer}
              style={{ width: "100%", marginTop: 4, padding: "12px", background: "linear-gradient(135deg, #0d2137, #163a5f)", border: "1px dashed #2979ff", borderRadius: 10, color: "#64b5f6", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 1 }}
            >
              ＋ 選手を追加する
            </button>
            <button
              onClick={applyPlayers}
              style={{ width: "100%", marginTop: 8, padding: "14px", background: "linear-gradient(135deg, #00695c, #00897b)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", letterSpacing: 1 }}
            >
              ✅ 選手情報を更新する
            </button>

            {/* Events / Stats Items */}
            <div style={{ marginTop: 28 }}>
              {sectionLabel("スタッツ項目の編集")}
              <div style={{ fontSize: 11, color: "#2a4a6a", marginBottom: 14 }}>絵文字・項目名・色・最大値を自由に変更できます</div>
              {events.map(ev => (
                <EventEditorRow
                  key={ev.id} ev={ev}
                  onUpdate={(field, value) => updateEvent(ev.id, field, value)}
                  onDelete={() => deleteEvent(ev.id)}
                  canDelete={events.length > 1}
                />
              ))}
              <button
                onClick={addEvent}
                style={{ width: "100%", marginTop: 4, padding: "14px", background: "linear-gradient(135deg, #1a237e, #283593)", border: "1px dashed #3949ab", borderRadius: 10, color: "#7986cb", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 1 }}
              >
                ＋ 項目を追加する
              </button>
            </div>
          </div>
        )}

        {/* ===== LOG TAB ===== */}
        {tab === "log" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#4a7fa5", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>イベントログ</div>
              <button
                onClick={() => setSaveModal(true)}
                disabled={log.length === 0}
                style={{ background: log.length > 0 ? "linear-gradient(135deg, #1b5e20, #2e7d32)" : "#0a0f1e", border: `1px solid ${log.length > 0 ? "#00c853" : "#1e3a5f"}`, borderRadius: 8, color: log.length > 0 ? "#00e676" : "#2a4a6a", fontSize: 12, fontWeight: 700, padding: "6px 14px", cursor: log.length > 0 ? "pointer" : "default" }}
              >
                💾 試合を保存
              </button>
            </div>
            {log.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#2a4a6a", fontSize: 14, background: "#0d1b2e", borderRadius: 12, border: "1px dashed #1e3a5f" }}>
                まだイベントが記録されていません
              </div>
            )}
            {log.map(entry => (
              <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#0d1b2e", border: "1px solid #1e3a5f", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#00e5ff", fontVariantNumeric: "tabular-nums", minWidth: 40 }}>{formatTime(entry.time)}</div>
                <div style={{ background: "#162030", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 700, color: "#e8eaf0", minWidth: 28, textAlign: "center" }}>#{entry.number}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.player}</div>
                </div>
                <div style={{ fontSize: 11, color: entry.color, fontWeight: 700, background: `${entry.color}18`, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
                  {entry.emoji} {entry.event}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ===== SAVE MODAL ===== */}
      {saveModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#0d1b2e", border: "1px solid #1e3a5f", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 16 }}>💾 試合を保存</div>
            <div style={{ fontSize: 12, color: "#4a7fa5", marginBottom: 8 }}>対戦相手・メモ（任意）</div>
            <input
              value={saveNotes}
              onChange={e => setSaveNotes(e.target.value)}
              placeholder="例: vs 〇〇FC、練習試合"
              style={{ width: "100%", background: "#0a0f1e", border: "1px solid #1e3a5f", borderRadius: 8, padding: "10px 12px", color: "#e8eaf0", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16 }}
            />
            <div style={{ fontSize: 11, color: "#2a4a6a", marginBottom: 20 }}>
              イベント {log.length}件 / 試合時間 {formatTime(matchTime)} を保存します
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setSaveModal(false)} disabled={saving}
                style={{ flex: 1, padding: "12px", background: "#0a0f1e", border: "1px solid #1e3a5f", borderRadius: 10, color: "#4a7fa5", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                キャンセル
              </button>
              <button onClick={saveMatch} disabled={saving}
                style={{ flex: 1, padding: "12px", background: saving ? "#0a0f1e" : "linear-gradient(135deg, #1b5e20, #2e7d32)", border: "none", borderRadius: 10, color: saving ? "#4a7fa5" : "#fff", fontSize: 14, fontWeight: 800, cursor: saving ? "default" : "pointer" }}>
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
