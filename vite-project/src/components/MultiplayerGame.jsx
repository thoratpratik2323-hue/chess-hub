import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useSearchParams, useNavigate } from "react-router-dom";
import mqtt from "mqtt";
import { Home, Copy, Send, Crown, Users, Plus, LogIn, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MOVE_SOUND = new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3");
const CAPTURE_SOUND = new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3");
const BROKER_URL = "wss://broker.hivemq.com:8884/mqtt";

// ═══ WOODEN THEME ═══════════════════════════
const WOOD_C = {
  bg: "#1a1208",
  bgGrad: "radial-gradient(ellipse at 50% 30%, #2e2010 0%, #1a1208 70%)",
  panel: "rgba(45, 32, 16, 0.95)",
  border: "rgba(180, 140, 70, 0.35)",
  accent: "#c8944a",
  gold: "#d4a548",
  cream: "#f5ead0",
  text: "#e8dcc8",
  dim: "rgba(232, 220, 200, 0.45)",
  dark: "#8B6914",
  light: "#D2B04C",
  btn: "linear-gradient(135deg, #96711a 0%, #c8944a 100%)",
  input: "rgba(20, 14, 6, 0.7)",
  red: "#e53935",
  purple: "#9c27b0",
  green: "#4caf50",
};

const STARK_C = {
  bg: "#020817",
  bgGrad: "radial-gradient(ellipse at 50% 30%, #0c1e3a 0%, #020817 70%)",
  panel: "rgba(10, 25, 47, 0.9)",
  border: "rgba(0, 243, 255, 0.3)",
  accent: "#00f3ff",
  gold: "#00f3ff",
  cream: "#e0faff",
  text: "#b1d1ff",
  dim: "rgba(177, 209, 255, 0.45)",
  dark: "#0a192f",
  light: "#112240",
  btn: "linear-gradient(135deg, #0072ff 0%, #00f3ff 100%)",
  input: "rgba(2, 8, 23, 0.8)",
  red: "#ff4b4b",
  purple: "#bd00ff",
  green: "#00ff9d",
};

const EMOTE_SOUNDS = {
  "👏": new Audio("https://www.myinstants.com/media/sounds/applause-8.mp3"),
  "😂": new Audio("https://www.myinstants.com/media/sounds/laugh.mp3"),
  "🔥": new Audio("https://www.myinstants.com/media/sounds/fire.mp3"),
  "GG": new Audio("https://www.myinstants.com/media/sounds/level-up_4.mp3"),
};
const F = "'Georgia', 'Times New Roman', serif";

export default function MultiplayerGame() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomFromUrl = searchParams.get("room");

  const [phase, setPhase] = useState(roomFromUrl ? "JOIN_LINK" : "PICK_NAME");
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState(roomFromUrl || "");
  const [joinInput, setJoinInput] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [copied, setCopied] = useState(false);

  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState("w");
  const [gameEnded, setGameEnded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const chatEnd = useRef(null);
  const [selSq, setSelSq] = useState(null);
  const [hints, setHints] = useState({});
  const [captured, setCaptured] = useState({ w: [], b: [] });
  const [lastMove, setLastMove] = useState(null);
  const [theme, setTheme] = useState("WOOD");
  const C = theme === "WOOD" ? WOOD_C : STARK_C;

  const mqttRef = useRef(null);
  const [cid] = useState("chess-" + Math.random().toString(36).slice(2, 9));
  const [online, setOnline] = useState(false);

  useEffect(() => () => { if (mqttRef.current) mqttRef.current.end(); }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ═══ MQTT ═══════════════════════════════════
  function connectRoom(id, name, host) {
    if (mqttRef.current) mqttRef.current.end();
    const client = mqtt.connect(BROKER_URL, { clientId: cid });
    mqttRef.current = client;
    const topic = "chess-hub/room/" + id;

    client.on("connect", () => {
      client.subscribe(topic);
      setOnline(true);
      if (!host) {
        setPlayerColor("b");
        client.publish(topic, JSON.stringify({ t: "JOIN", name, sid: cid }));
        setPhase("PLAY");
      }
    });

    client.on("message", (_, raw) => {
      const d = JSON.parse(raw.toString());
      if (d.sid === cid) return;
      switch (d.t) {
        case "JOIN":
          setOpponentName(d.name);
          client.publish(topic, JSON.stringify({ t: "WELCOME", name, sid: cid }));
          setPhase("PLAY");
          break;
        case "WELCOME":
          setOpponentName(d.name);
          setPhase("PLAY");
          break;
        case "MOVE":
          setGame(() => {
            const g = new Chess(d.fen);
            const h = g.history({ verbose: true });
            const last = h[h.length - 1];
            (last?.captured ? CAPTURE_SOUND : MOVE_SOUND).play().catch(() => {});
            
            // Update captured pieces
            const caps = { w: [], b: [] };
            h.forEach(m => {
              if (m.captured) {
                const color = m.color === 'w' ? 'b' : 'w'; // captured piece was opposite color
                caps[color].push(m.captured);
              }
            });
            setCaptured(caps);
            setLastMove({ from: last?.from, to: last?.to });

            if (g.isGameOver()) setGameEnded(true);
            return g;
          });
          break;
        case "EMOTE":
          setMessages(p => [...p, { from: d.name, text: d.emote, isEmote: true }]);
          if (EMOTE_SOUNDS[d.emote]) EMOTE_SOUNDS[d.emote].cloneNode().play().catch(() => {});
          break;
        case "CHAT":
          setMessages(p => [...p, { from: d.name, text: d.text }]);
          break;
        default: break;
      }
    });

    client.on("error", () => setOnline(false));
  }

  // ═══ ACTIONS ════════════════════════════════
  function createRoom() {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    setRoomId(id);
    setPlayerColor("w");
    connectRoom(id, playerName, true);
    setPhase("WAIT");
  }

  function joinRoom() {
    if (!joinInput.trim()) return;
    const id = joinInput.trim().toUpperCase();
    setRoomId(id);
    connectRoom(id, playerName, false);
  }

  function joinViaLink() {
    if (!playerName) return;
    connectRoom(roomFromUrl, playerName, false);
  }

  function copyLink() {
    navigator.clipboard.writeText(
      window.location.origin + window.location.pathname + "#/multiplayer?room=" + roomId
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyId() {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function drop(src, tgt) {
    if (!online || game.turn() !== playerColor || gameEnded) return false;
    try {
      const g = new Chess(game.fen());
      const m = g.move({ from: src, to: tgt, promotion: "q" });
      if (!m) return false;
      setGame(g);
      (m.captured ? CAPTURE_SOUND : MOVE_SOUND).play().catch(() => {});
      
      // Update captured pieces locally
      const caps = { w: [], b: [] };
      g.history({ verbose: true }).forEach(mv => {
        if (mv.captured) {
          const color = mv.color === 'w' ? 'b' : 'w';
          caps[color].push(mv.captured);
        }
      });
      setCaptured(caps);
      setLastMove({ from: src, to: tgt });

      mqttRef.current.publish("chess-hub/room/" + roomId, JSON.stringify({ t: "MOVE", fen: g.fen(), sid: cid }));
      if (g.isGameOver()) setGameEnded(true);
      setSelSq(null);
      setHints({});
      return true;
    } catch { return false; }
  }

  function sendEmote(emote) {
    if (!online) return;
    setMessages(p => [...p, { from: playerName, text: emote, isEmote: true }]);
    mqttRef.current.publish("chess-hub/room/" + roomId, JSON.stringify({ t: "EMOTE", name: playerName, emote, sid: cid }));
    if (EMOTE_SOUNDS[emote]) EMOTE_SOUNDS[emote].cloneNode().play().catch(() => {});
  }

  function clickSquare(sq) {
    if (selSq && hints[sq]) {
      drop(selSq, sq);
      return;
    }
    const moves = game.moves({ square: sq, verbose: true });
    if (moves.length > 0 && game.turn() === playerColor && !gameEnded) {
      const h = {};
      h[sq] = { background: "rgba(255, 69, 0, 0.4)" };
      moves.forEach(m => {
        h[m.to] = {
          background: m.captured
            ? "radial-gradient(circle, rgba(255, 69, 0, 0.8) 65%, transparent 65%)"
            : "radial-gradient(circle, rgba(255, 69, 0, 0.5) 25%, transparent 25%)",
          borderRadius: "50%",
        };
      });
      setSelSq(sq);
      setHints(h);
    } else {
      setSelSq(null);
      setHints({});
    }
  }

  const getCustomSquares = () => {
    const styl = { ...hints };
    
    // Last move highlight
    if (lastMove) {
      styl[lastMove.from] = { ...styl[lastMove.from], background: "rgba(255, 235, 59, 0.2)" };
      styl[lastMove.to] = { ...styl[lastMove.to], border: "2px solid rgba(255, 235, 59, 0.5)" };
    }

    // Check glow
    if (game.inCheck()) {
      const hist = game.history({ verbose: true });
      const last = hist[hist.length - 1];
      // Find king of current turn
      const fen = game.fen().split(' ')[0];
      const turn = game.turn();
      const rows = fen.split('/');
      rows.forEach((row, r) => {
        let c = 0;
        for (let char of row) {
          if (isNaN(char)) {
            if (char === (turn === 'w' ? 'K' : 'k')) {
              const sq = String.fromCharCode(97 + c) + (8 - r);
              styl[sq] = { ...styl[sq], boxShadow: "inset 0 0 25px rgba(255, 0, 0, 0.7)", borderRadius: "10%" };
            }
            c++;
          } else c += parseInt(char);
        }
      });
    }

    return styl;
  };

  function sendChat(e) {
    e.preventDefault();
    if (!inputMsg.trim() || !online) return;
    setMessages(p => [...p, { from: playerName, text: inputMsg }]);
    mqttRef.current.publish("chess-hub/room/" + roomId, JSON.stringify({ t: "CHAT", name: playerName, text: inputMsg, sid: cid }));
    setInputMsg("");
  }

  // ═══════════════════════════════════════════
  // Shared UI helpers
  // ═══════════════════════════════════════════
  const Page = ({ children }) => (
    <div style={{ minHeight: "100vh", background: C.bgGrad, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F, padding: "20px" }}>
      {children}
    </div>
  );

  const Card = ({ children }) => (
    <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} style={{
      background: C.panel, border: "2px solid " + C.border, borderRadius: "16px", padding: "40px",
      maxWidth: "460px", width: "100%", textAlign: "center",
      boxShadow: "0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
    }}>
      {children}
    </motion.div>
  );

  const Btn = ({ children, onClick, outline }) => (
    <button onClick={onClick} style={{
      width: "100%", padding: "16px", fontSize: "15px", fontWeight: "bold", fontFamily: F,
      border: outline ? "2px solid " + C.border : "none", borderRadius: "12px",
      background: outline ? "transparent" : C.btn, color: outline ? C.text : "#fff",
      cursor: "pointer", letterSpacing: "1px", display: "flex", alignItems: "center",
      justifyContent: "center", gap: "10px", boxShadow: outline ? "none" : "0 4px 15px rgba(200,148,74,0.3)",
    }}>
      {children}
    </button>
  );

  const NameBtn = ({ label, emoji, active, color, onClick }) => (
    <button onClick={onClick} style={{
      flex: 1, padding: "16px", fontSize: "17px", fontWeight: "bold", fontFamily: F,
      border: "2px solid " + (active ? color : C.border), borderRadius: "12px",
      background: active ? color + "18" : "transparent",
      color: active ? color : C.dim, cursor: "pointer", transition: "all 0.3s",
    }}>
      {emoji} {label}
    </button>
  );

  // ═══════════════════════════════════════════
  // PHASE: PICK NAME
  // ═══════════════════════════════════════════
  if (phase === "PICK_NAME") {
    return (
      <Page><Card>
        <Crown size={40} color={C.gold} style={{ marginBottom: "15px" }} />
        <h1 style={{ color: C.gold, fontSize: "26px", margin: "0 0 6px", letterSpacing: "2px" }}>♟ Chess Hub</h1>
        <p style={{ color: C.dim, fontSize: "14px", margin: "0 0 28px" }}>Choose your agent</p>

        <div style={{ display: "flex", gap: "14px", marginBottom: "28px" }}>
          <NameBtn label="Agent Red" emoji="🔴" active={playerName === "Agent Red"} color={C.red} onClick={() => setPlayerName("Agent Red")} />
          <NameBtn label="Agent Purple" emoji="🟣" active={playerName === "Agent Purple"} color={C.purple} onClick={() => setPlayerName("Agent Purple")} />
        </div>

        {playerName && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Btn onClick={createRoom}><Plus size={18} /> Create Room</Btn>
            <Btn outline onClick={() => setPhase("JOIN_ID")}><LogIn size={18} /> Join Room</Btn>
          </motion.div>
        )}

        <button onClick={() => navigate("/")} style={{ marginTop: "22px", background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: "13px", fontFamily: F }}>
          ← Back to Lobby
        </button>
      </Card></Page>
    );
  }

  // ═══ JOIN VIA LINK ══════════════════════════
  if (phase === "JOIN_LINK") {
    return (
      <Page><Card>
        <Users size={40} color={C.gold} style={{ marginBottom: "15px" }} />
        <h1 style={{ color: C.gold, fontSize: "26px", margin: "0 0 6px", letterSpacing: "2px" }}>Join Match</h1>
        <p style={{ color: C.dim, fontSize: "14px", margin: "0 0 24px" }}>Room: <span style={{ color: C.gold, fontFamily: "monospace" }}>{roomFromUrl}</span></p>

        <p style={{ color: C.text, fontSize: "15px", margin: "0 0 18px" }}>Who's joining?</p>
        <div style={{ display: "flex", gap: "14px", marginBottom: "24px" }}>
          <NameBtn label="Agent Red" emoji="🔴" active={playerName === "Agent Red"} color={C.red} onClick={() => setPlayerName("Agent Red")} />
          <NameBtn label="Agent Purple" emoji="🟣" active={playerName === "Agent Purple"} color={C.purple} onClick={() => setPlayerName("Agent Purple")} />
        </div>

        {playerName && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Btn onClick={joinViaLink}><LogIn size={18} /> Join as {playerName}</Btn>
          </motion.div>
        )}
      </Card></Page>
    );
  }

  // ═══ JOIN BY ROOM ID ════════════════════════
  if (phase === "JOIN_ID") {
    return (
      <Page><Card>
        <LogIn size={40} color={C.gold} style={{ marginBottom: "15px" }} />
        <h1 style={{ color: C.gold, fontSize: "26px", margin: "0 0 6px", letterSpacing: "2px" }}>Join Room</h1>
        <p style={{ color: C.dim, fontSize: "14px", margin: "0 0 24px" }}>Enter the Room ID shared by your partner</p>

        <input value={joinInput} onChange={e => setJoinInput(e.target.value.toUpperCase())} placeholder="ROOM ID"
          maxLength={6} style={{
            width: "100%", padding: "16px", fontSize: "22px", fontFamily: "monospace", textAlign: "center",
            letterSpacing: "6px", background: C.input, border: "2px solid " + C.border, borderRadius: "12px",
            color: C.cream, outline: "none", boxSizing: "border-box", marginBottom: "20px",
          }}
        />

        <Btn onClick={joinRoom}><LogIn size={18} /> Connect</Btn>

        <button onClick={() => setPhase("PICK_NAME")} style={{ marginTop: "18px", background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: "13px", fontFamily: F }}>
          ← Back
        </button>
      </Card></Page>
    );
  }

  // ═══ WAITING FOR OPPONENT ═══════════════════
  if (phase === "WAIT") {
    return (
      <Page><Card>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }}>
          <Crown size={40} color={C.gold} />
        </motion.div>
        <h1 style={{ color: C.gold, fontSize: "26px", margin: "15px 0 6px", letterSpacing: "2px" }}>Room Created!</h1>
        <p style={{ color: C.dim, fontSize: "14px", margin: "0 0 24px" }}>Share the Room ID or Link with your partner</p>

        <div style={{ background: C.input, border: "2px dashed " + C.accent, borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <p style={{ color: C.dim, fontSize: "11px", letterSpacing: "2px", margin: "0 0 8px" }}>ROOM ID</p>
          <p style={{ color: C.gold, fontSize: "32px", fontFamily: "monospace", letterSpacing: "6px", fontWeight: "bold", margin: 0 }}>{roomId}</p>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <button onClick={copyId} style={{ flex: 1, padding: "14px", fontSize: "14px", fontWeight: "bold", fontFamily: F, border: "2px solid " + C.border, borderRadius: "12px", background: "transparent", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <Copy size={16} /> {copied ? "Copied!" : "Copy ID"}
          </button>
          <button onClick={copyLink} style={{ flex: 1, padding: "14px", fontSize: "14px", fontWeight: "bold", fontFamily: F, border: "none", borderRadius: "12px", background: C.btn, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <Copy size={16} /> {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>

        <motion.p animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} style={{ color: C.accent, fontSize: "14px", marginTop: "18px" }}>
          ⏳ Waiting for opponent...
        </motion.p>
      </Card></Page>
    );
  }

  // ═══════════════════════════════════════════
  // PHASE: PLAYING
  // ═══════════════════════════════════════════
  const bSize = Math.min(window.innerWidth - 60, window.innerHeight - 200, 500);
  const myTurn = game.turn() === playerColor;

  return (
    <div style={{ minHeight: "100vh", background: C.bgGrad, fontFamily: F }}>

      {/* TOP BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderBottom: "1px solid " + C.border }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: "14px", fontFamily: F, display: "flex", alignItems: "center", gap: "6px" }}>
          <Home size={16} /> Lobby
        </button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setTheme(p => p === "WOOD" ? "STARK" : "WOOD")} style={{ background: C.input, border: "1px solid " + C.border, color: C.gold, padding: "5px 12px", borderRadius: "15px", cursor: "pointer", fontSize: "11px", fontFamily: F }}>
            ✨ {theme === "WOOD" ? "Switch to Stark" : "Switch to Wood"}
          </button>
          <span style={{ color: C.gold, fontSize: "13px", fontFamily: "monospace", letterSpacing: "2px", border: "1px solid " + C.border, padding: "4px 10px", borderRadius: "4px" }}>Room: {roomId}</span>
        </div>
        <span style={{ color: C.dim, fontSize: "13px" }}>{playerName} vs {opponentName}</span>
      </div>

      {/* MAIN */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start", gap: "20px", padding: "20px" }}>

        {/* BOARD */}
        <div style={{ position: "relative" }}>
          {/* Opponent Label */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", padding: "8px 14px", background: C.panel, border: "1px solid " + C.border, borderRadius: "10px" }}>
            <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: C.green, boxShadow: "0 0 6px " + C.green }} />
            <span style={{ color: C.text, fontSize: "14px", fontWeight: "bold" }}>{opponentName || "Opponent"}</span>
            <div style={{ display: "flex", gap: "2px", marginLeft: "10px" }}>
              {captured[playerColor === 'w' ? 'b' : 'w'].map((p, i) => (
                <img key={i} src={`https://chessboardjs.com/img/chesspieces/wikipedia/${(playerColor === 'w' ? 'b' : 'w') + p.toUpperCase()}.png`} style={{ width: "18px", opacity: 0.8 }} />
              ))}
            </div>
            <span style={{ color: C.dim, fontSize: "12px", marginLeft: "auto" }}>{playerColor === "w" ? "Black" : "White"}</span>
          </div>

          {/* Board */}
          <div style={{ borderRadius: "10px", overflow: "hidden", border: "3px solid " + C.accent, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            <Chessboard
              position={game.fen()}
              arePiecesDraggable={false}
              onPieceDrop={(s, t) => { setSelSq(null); setHints({}); return drop(s, t); }}
              onSquareClick={clickSquare}
              boardOrientation={playerColor === "b" ? "black" : "white"}
              customDarkSquareStyle={{ backgroundColor: C.dark }}
              customLightSquareStyle={{ backgroundColor: C.light }}
              customSquareStyles={getCustomSquares()}
              boardWidth={bSize}
              animationDuration={200}
            />
          </div>

          {/* Player Label */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px", padding: "8px 14px", background: C.panel, border: "1px solid " + C.border, borderRadius: "10px" }}>
            <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: myTurn ? C.green : C.dim, boxShadow: myTurn ? "0 0 6px " + C.green : "none" }} />
            <span style={{ color: C.gold, fontSize: "14px", fontWeight: "bold" }}>{playerName} (You)</span>
            <div style={{ display: "flex", gap: "2px", marginLeft: "10px" }}>
              {captured[playerColor].map((p, i) => (
                <img key={i} src={`https://chessboardjs.com/img/chesspieces/wikipedia/${playerColor + p.toUpperCase()}.png`} style={{ width: "18px", opacity: 0.8 }} />
              ))}
            </div>
            <span style={{ color: C.dim, fontSize: "12px", marginLeft: "auto" }}>{playerColor === "w" ? "White" : "Black"}</span>
            {myTurn && <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ color: C.green, fontSize: "12px", fontWeight: "bold", marginLeft: "10px" }}>YOUR TURN</motion.span>}
          </div>

          {/* Game Over */}
          {gameEnded && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
                position: "absolute", inset: 0, background: "rgba(26,18,8,0.95)", display: "flex",
                flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10,
                borderRadius: "10px", border: "2px solid " + C.gold,
              }}>
                <Crown size={50} color={C.gold} />
                <h2 style={{ color: C.gold, fontSize: "2rem", margin: "12px 0 4px", letterSpacing: "3px" }}>Game Over!</h2>
                <p style={{ color: C.text, fontSize: "15px" }}>
                  {game.isCheckmate() ? (game.turn() === "w" ? "Black Wins!" : "White Wins!") : "Draw!"}
                </p>
                <button onClick={() => navigate("/")} style={{ marginTop: "18px", padding: "14px 40px", fontSize: "15px", fontFamily: F, fontWeight: "bold", border: "none", borderRadius: "12px", background: C.btn, color: "#fff", cursor: "pointer" }}>
                  Back to Lobby
                </button>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* CHAT */}
        <div style={{ width: "270px", maxHeight: bSize + 70 + "px", display: "flex", flexDirection: "column", background: C.panel, border: "1px solid " + C.border, borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", gap: "8px" }}>
            <MessageCircle size={16} color={C.gold} />
            <span style={{ color: C.gold, fontSize: "14px", fontWeight: "bold" }}>Chat</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {messages.length === 0 && <p style={{ color: C.dim, fontSize: "12px", textAlign: "center", marginTop: "20px" }}>Say hi! 👋</p>}
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.from === playerName ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                <div style={{ fontSize: "10px", color: C.dim, marginBottom: "2px", textAlign: m.from === playerName ? "right" : "left" }}>{m.from}</div>
                <div style={{
                  background: m.from === playerName ? "rgba(200,148,74,0.2)" : "rgba(255,255,255,0.04)",
                  padding: "8px 12px", borderRadius: m.from === playerName ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  fontSize: "13px", color: C.text, border: "1px solid " + (m.from === playerName ? C.border : "rgba(255,255,255,0.06)"),
                }}>{m.text}</div>
              </div>
            ))}
            <div ref={chatEnd} />
          </div>

          <form onSubmit={sendChat} style={{ display: "flex", gap: "6px", padding: "10px", borderTop: "1px solid " + C.border }}>
            <input value={inputMsg} onChange={e => setInputMsg(e.target.value)} placeholder="Type a message..."
              style={{ flex: 1, background: C.input, border: "1px solid " + C.border, color: C.cream, padding: "10px", borderRadius: "8px", outline: "none", fontSize: "13px", fontFamily: F }}
            />
            <button type="submit" style={{ background: C.btn, border: "none", borderRadius: "8px", padding: "0 14px", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <Send size={16} color="#fff" />
            </button>
          </form>

          {/* EMOTES */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px", borderTop: "1px solid " + C.border, background: "rgba(0,0,0,0.2)" }}>
            {["👏", "😂", "🔥", "GG"].map(e => (
              <button key={e} onClick={() => sendEmote(e)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", opacity: 0.7, padding: "4px" }} onMouseEnter={e_ => (e_.target.style.opacity = 1)} onMouseLeave={e_ => (e_.target.style.opacity = 0.7)}>
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
