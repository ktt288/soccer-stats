import { useState } from "react";

const DEFAULT_PLAYERS = [
  { id: 1, name: "田中 蓮",   number: 1, position: "GK" },
  { id: 2, name: "佐藤 颯",   number: 2, position: "DF" },
  { id: 3, name: "鈴木 大翔", number: 3, position: "DF" },
  { id: 4, name: "高橋 悠真", number: 4, position: "MF" },
  { id: 5, name: "伊藤 蒼",   number: 5, position: "MF" },
  { id: 6, name: "渡辺 陽太", number: 6, position: "MF" },
  { id: 7, name: "山本 翔",   number: 7, position: "FW" },
  { id: 8, name: "中村 隼",   number: 8, position: "FW" },
];

const EVENTS = [
  { id: "goal",    label: "ゴール",     emoji: "⚽", color: "#00c853" },
  { id: "shot",    label: "シュート",   emoji: "🎯", color: "#2979ff" },
  { id: "pass",    label: "パス成功",   emoji: "✅", color: "#00bcd4" },
  { id: "dribble", label: "ドリブル突破", emoji: "🔥", color: "#ff6d00" },
  { id: "tackle",  label: "タックル",   emoji: "🛡️", color: "#7c4dff" },
  { id: "foul",    label: "ファウル",   emoji: "⚠️", color: "#f44336" },
];

const POS_COLOR = { GK: "#ffd600", DF: "#00bcd4", MF: "#00c853", FW: "#ff6d00" };

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ---- Radar Chart (SVG, no lib) ----
// 各項目の絶対最大値（満点）
const RADAR_MAX = { goal: 5, shot: 10, pass: 20, dribble: 10, tackle: 10 };

function RadarChart({ data, color, size = 160 }) {
  const keys = ["goal", "shot", "pass", "dribble", "tackle"];
  const labels = ["ゴール", "シュート", "パス", "ドリブル", "タックル"];
  const cx = size / 2, cy = size / 2;
  const r = size * 0.36;
  const n = keys.length;

  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i, ratio) => ({
    x: cx + r * ratio * Math.cos(angle(i)),
    y: cy + r * ratio * Math.sin(angle(i)),
  });

  // Grid circles
  const grids = [0.25, 0.5, 0.75, 1.0];

  const dataPoints = keys.map((k, i) => pt(i, Math.min(data[k] / RADAR_MAX[k], 1)));
  const polyPoints = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {grids.map((g, gi) => (
        <polygon
          key={gi}
          points={keys.map((_, i) => { const p = pt(i, g); return `${p.x},${p.y}`; }).join(" ")}
          fill="none"
          stroke="#1e3a5f"
          strokeWidth="1"
        />
      ))}
      {/* Axes */}
      {keys.map((_, i) => {
        const outer = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#1e3a5f" strokeWidth="1" />;
      })}
      {/* Data polygon */}
      <polygon points={polyPoints} fill={color + "44"} stroke={color} strokeWidth="2" />
      {/* Dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
      {/* Labels with max value */}
      {keys.map((k, i) => {
        const lp = pt(i, 1.32);
        return (
          <text
            key={i}
            x={lp.x}
            y={lp.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8.5"
            fill="#7a9bbf"
            fontFamily="sans-serif"
          >
            {labels[i]}
          </text>
        );
      })}
      {/* Max value hint on top axis */}
      <text x={cx} y={cy - r - 6} textAnchor="middle" fontSize="7" fill="#2a4a6a" fontFamily="sans-serif">
        満点
      </text>
    </svg>
  );
}

// ---- Ranking Bar ----
function RankBar({ players, stats, eventId, color, emoji, label }) {
  const sorted = [...players].sort((a, b) => stats[b.id][eventId] - stats[a.id][eventId]);
  const max = Math.max(...players.map(p => stats[p.id][eventId]), 1);
  return (
    <div style={{ background: "#0d1b2e", border: "1px solid #1e3a5f", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color }}>{label} ランキング</span>
      </div>
      {sorted.map((p, i) => (
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
              width: `${(stats[p.id][eventId] / max) * 100}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${color}, ${color}88)`,
              borderRadius: 4,
              transition: "width 0.5s",
              minWidth: stats[p.id][eventId] > 0 ? 6 : 0,
            }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 900, color: stats[p.id][eventId] > 0 ? color : "#2a4a6a", width: 24, textAlign: "right" }}>
            {stats[p.id][eventId]}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("record");
  const [statsSubTab, setStatsSubTab] = useState("ranking"); // ranking | radar
  const [players, setPlayers] = useState(DEFAULT_PLAYERS);
  const [editNames, setEditNames] = useState(() => Object.fromEntries(DEFAULT_PLAYERS.map(p => [p.id, p.name])));
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [radarPlayer, setRadarPlayer] = useState(DEFAULT_PLAYERS[0].id);
  const [stats, setStats] = useState(() => {
    const s = {};
    DEFAULT_PLAYERS.forEach(p => { s[p.id] = { goal: 0, shot: 0, pass: 0, dribble: 0, tackle: 0, foul: 0 }; });
    return s;
  });
  const [log, setLog] = useState([]);
  const [matchTime, setMatchTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState(null);
  const [timerRef] = useState({ interval: null });

  const toggleTimer = () => {
    if (running) { clearInterval(timerRef.interval); setRunning(false); }
    else { timerRef.interval = setInterval(() => setMatchTime(t => t + 1), 1000); setRunning(true); }
  };

  const recordEvent = (eventId) => {
    if (!selectedPlayer) return;
    setStats(prev => ({
      ...prev,
      [selectedPlayer]: { ...prev[selectedPlayer], [eventId]: prev[selectedPlayer][eventId] + 1 },
    }));
    const event = EVENTS.find(e => e.id === eventId);
    const player = players.find(p => p.id === selectedPlayer);
    setLog(prev => [{ time: matchTime, player: player.name, number: player.number, event: event.label, emoji: event.emoji, color: event.color, id: Date.now() }, ...prev]);
    setFlash(eventId);
    setTimeout(() => setFlash(null), 400);
  };

  const applyNames = () => {
    setPlayers(prev => prev.map(p => ({ ...p, name: editNames[p.id].trim() || p.name })));
  };

  const totalFor = (playerId) => {
    const s = stats[playerId];
    return s.goal * 3 + s.shot + s.pass + s.dribble + s.tackle;
  };

  const overallSorted = [...players].sort((a, b) => totalFor(b.id) - totalFor(a.id));
  const currentRadarPlayer = players.find(p => p.id === radarPlayer);

  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif", background: "#07101f", minHeight: "100vh", color: "#e8eaf0", maxWidth: 480, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d2137, #0a1628)", padding: "16px 20px 12px", borderBottom: "1px solid #1e3a5f", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#4a7fa5", letterSpacing: 2, fontWeight: 700, textTransform: "uppercase" }}>少年サッカー</div>
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
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "#0d1b2e", borderBottom: "1px solid #1e3a5f" }}>
        {[{ id: "record", label: "📝 記録" }, { id: "stats", label: "📊 スタッツ" }, { id: "log", label: "📋 ログ" }, { id: "settings", label: "⚙️ 設定" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "12px 0", background: "none", border: "none", color: tab === t.id ? "#00e5ff" : "#4a7fa5", fontWeight: tab === t.id ? 700 : 400, fontSize: 12, cursor: "pointer", borderBottom: tab === t.id ? "2px solid #00e5ff" : "2px solid transparent", transition: "all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

        {/* ===== RECORD TAB ===== */}
        {tab === "record" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#4a7fa5", fontWeight: 700, letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>選手を選ぶ</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {players.map(p => (
                  <button key={p.id} onClick={() => setSelectedPlayer(p.id)} style={{
                    background: selectedPlayer === p.id ? `linear-gradient(135deg, ${POS_COLOR[p.position]}33, ${POS_COLOR[p.position]}66)` : "#0d1b2e",
                    border: selectedPlayer === p.id ? `2px solid ${POS_COLOR[p.position]}` : "2px solid #1e3a5f",
                    borderRadius: 10, padding: "10px 4px", cursor: "pointer", textAlign: "center",
                    transition: "all 0.15s", transform: selectedPlayer === p.id ? "scale(1.05)" : "scale(1)",
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: selectedPlayer === p.id ? POS_COLOR[p.position] : "#e8eaf0", lineHeight: 1 }}>{p.number}</div>
                    <div style={{ fontSize: 9, color: "#4a7fa5", marginTop: 2, lineHeight: 1.2 }}>{p.name.split(" ").at(-1)}</div>
                    <div style={{ fontSize: 8, color: POS_COLOR[p.position], fontWeight: 700, marginTop: 2 }}>{p.position}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#4a7fa5", fontWeight: 700, letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>イベントを記録</div>
              {!selectedPlayer ? (
                <div style={{ textAlign: "center", padding: "24px", color: "#2a4a6a", fontSize: 14, background: "#0d1b2e", borderRadius: 12, border: "1px dashed #1e3a5f" }}>
                  ↑ まず選手を選んでください
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {EVENTS.map(ev => (
                    <button key={ev.id} onClick={() => recordEvent(ev.id)} style={{
                      background: flash === ev.id ? `${ev.color}44` : "#0d1b2e",
                      border: `2px solid ${flash === ev.id ? ev.color : "#1e3a5f"}`,
                      borderRadius: 12, padding: "16px 12px", cursor: "pointer", textAlign: "left",
                      transition: "all 0.1s", transform: flash === ev.id ? "scale(0.97)" : "scale(1)",
                    }}>
                      <div style={{ fontSize: 22 }}>{ev.emoji}</div>
                      <div style={{ fontSize: 12, color: ev.color, fontWeight: 700, marginTop: 4 }}>{ev.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginTop: 2 }}>
                        {stats[selectedPlayer][ev.id]}
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
            {/* Sub tabs */}
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

            {/* --- RANKING SUB TAB --- */}
            {statsSubTab === "ranking" && (
              <div>
                {EVENTS.map(ev => (
                  <RankBar key={ev.id} players={players} stats={stats} eventId={ev.id} color={ev.color} emoji={ev.emoji} label={ev.label} />
                ))}
              </div>
            )}

            {/* --- RADAR SUB TAB --- */}
            {statsSubTab === "radar" && (
              <div>
                {/* Player selector */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#4a7fa5", fontWeight: 700, letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>選手を選ぶ</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {players.map(p => (
                      <button key={p.id} onClick={() => setRadarPlayer(p.id)} style={{
                        background: radarPlayer === p.id ? `linear-gradient(135deg, ${POS_COLOR[p.position]}33, ${POS_COLOR[p.position]}66)` : "#0d1b2e",
                        border: radarPlayer === p.id ? `2px solid ${POS_COLOR[p.position]}` : "2px solid #1e3a5f",
                        borderRadius: 10, padding: "10px 4px", cursor: "pointer", textAlign: "center",
                        transform: radarPlayer === p.id ? "scale(1.05)" : "scale(1)", transition: "all 0.15s",
                      }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: radarPlayer === p.id ? POS_COLOR[p.position] : "#e8eaf0" }}>{p.number}</div>
                        <div style={{ fontSize: 9, color: "#4a7fa5", marginTop: 2 }}>{p.name.split(" ").at(-1)}</div>
                        <div style={{ fontSize: 8, color: POS_COLOR[p.position], fontWeight: 700, marginTop: 2 }}>{p.position}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Radar */}
                <div style={{ background: "#0d1b2e", border: `1px solid ${POS_COLOR[currentRadarPlayer.position]}44`, borderRadius: 16, padding: "20px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color: POS_COLOR[currentRadarPlayer.position], lineHeight: 1 }}>{currentRadarPlayer.number}</div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{currentRadarPlayer.name}</div>
                      <div style={{ fontSize: 11, color: POS_COLOR[currentRadarPlayer.position], fontWeight: 700 }}>{currentRadarPlayer.position}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                    <RadarChart data={stats[radarPlayer]} color={POS_COLOR[currentRadarPlayer.position]} size={200} />
                  </div>

                  {/* Stat bars under radar */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {EVENTS.map(ev => (
                      <div key={ev.id} style={{ background: "#0a0f1e", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: ev.color, fontWeight: 700 }}>{ev.emoji} {ev.label}</span>
                          <span style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{stats[radarPlayer][ev.id]}</span>
                        </div>
                        <div style={{ background: "#1e3a5f", borderRadius: 3, height: 4, overflow: "hidden" }}>
                          <div style={{
                            width: `${Math.min((stats[radarPlayer][ev.id] / (RADAR_MAX[ev.id] ?? 10)) * 100, 100)}%`,
                            height: "100%", background: ev.color, borderRadius: 3, transition: "width 0.5s",
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- OVERALL SUB TAB --- */}
            {statsSubTab === "overall" && (
              <div>
                <div style={{ fontSize: 11, color: "#4a7fa5", fontWeight: 700, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>総合ランキング</div>
                {overallSorted.map((p, rank) => {
                  const s = stats[p.id];
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
                            </div>
                            <div style={{ fontSize: 10, color: POS_COLOR[p.position] }}>{p.position}</div>
                          </div>
                        </div>
                        {s.goal > 0 && <div style={{ fontSize: 13, color: "#00c853", fontWeight: 700 }}>⚽ {s.goal}G</div>}
                      </div>
                      <div style={{ background: "#0a0f1e", borderRadius: 4, height: 6, marginBottom: 8, overflow: "hidden" }}>
                        <div style={{ width: `${(total / maxTotal) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${POS_COLOR[p.position]}, ${POS_COLOR[p.position]}88)`, borderRadius: 4, transition: "width 0.5s" }} />
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {EVENTS.map(ev => s[ev.id] > 0 && (
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

        {/* ===== SETTINGS TAB ===== */}
        {tab === "settings" && (
          <div>
            <div style={{ fontSize: 11, color: "#4a7fa5", fontWeight: 700, letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" }}>選手名の編集</div>
            {players.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#0d1b2e", border: "1px solid #1e3a5f", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: POS_COLOR[p.position], minWidth: 28, textAlign: "center" }}>{p.number}</div>
                <div style={{ fontSize: 10, color: POS_COLOR[p.position], fontWeight: 700, minWidth: 26 }}>{p.position}</div>
                <input
                  value={editNames[p.id]}
                  onChange={e => setEditNames(prev => ({ ...prev, [p.id]: e.target.value }))}
                  style={{
                    flex: 1, background: "#0a0f1e", border: "1px solid #1e3a5f", borderRadius: 6,
                    padding: "6px 10px", color: "#e8eaf0", fontSize: 14, fontFamily: "inherit", outline: "none",
                  }}
                  onFocus={e => e.target.style.borderColor = "#00e5ff"}
                  onBlur={e => e.target.style.borderColor = "#1e3a5f"}
                />
              </div>
            ))}
            <button
              onClick={applyNames}
              style={{
                width: "100%", marginTop: 8, padding: "14px", background: "linear-gradient(135deg, #00695c, #00897b)",
                border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 800,
                cursor: "pointer", letterSpacing: 1,
              }}
            >
              ✅ 選手名を更新する
            </button>
          </div>
        )}

        {/* ===== LOG TAB ===== */}
        {tab === "log" && (
          <div>
            <div style={{ fontSize: 11, color: "#4a7fa5", fontWeight: 700, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>イベントログ</div>
            {log.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#2a4a6a", fontSize: 14, background: "#0d1b2e", borderRadius: 12, border: "1px dashed #1e3a5f" }}>
                まだイベントが記録されていません
              </div>
            )}
            {log.map(entry => (
              <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#0d1b2e", border: "1px solid #1e3a5f", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#00e5ff", fontVariantNumeric: "tabular-nums", minWidth: 40 }}>{formatTime(entry.time)}</div>
                <div style={{ background: "#162030", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 700, color: "#e8eaf0", minWidth: 28, textAlign: "center" }}>#{entry.number}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{entry.player}</div>
                </div>
                <div style={{ fontSize: 11, color: entry.color, fontWeight: 700, background: `${entry.color}18`, padding: "3px 8px", borderRadius: 6 }}>
                  {entry.emoji} {entry.event}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
