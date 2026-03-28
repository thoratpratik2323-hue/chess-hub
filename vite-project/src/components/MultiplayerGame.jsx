import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useSearchParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { io } from "socket.io-client";

// Connect to our new backend server via the Vite Proxy
const socket = io();

// Constants for sounds (standard Lichess-style or generic CDN)
const MOVE_SOUND = new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3");
const CAPTURE_SOUND = new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3");

export default function MultiplayerGame() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get("room");

  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState(""); 
  const [statusText, setStatusText] = useState("Connecting...");
  const [copied, setCopied] = useState(false);
  
  // Chat & History states
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const chatEndRef = useRef(null);

  // Timer states (simplified: 10 mins each)
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [gameEnded, setGameEnded] = useState(false);

  useEffect(() => {
    if (!roomId) {
      const newRoom = uuidv4().substring(0, 8);
      navigate(`/multiplayer?room=${newRoom}`, { replace: true });
      return;
    }

    socket.emit("join_room", roomId);

    socket.on("player_color", (color) => {
      setPlayerColor(color);
      setStatusText(color === "w" ? "Waiting for opponent..." : "You are Black. Ready!");
    });

    socket.on("game_ready", (message) => {
      setStatusText(message);
    });

    socket.on("receive_move", (move) => {
      setGame((prevGame) => {
        const gameCopy = new Chess();
        gameCopy.load(prevGame.fen());
        try {
          const result = gameCopy.move(move);
          if (result) {
            if (result.captured) CAPTURE_SOUND.play().catch(() => {});
            else MOVE_SOUND.play().catch(() => {});
          }
          return gameCopy;
        } catch (e) {
          return prevGame;
        }
      });
    });

    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("opponent_disconnected", (msg) => {
      setStatusText(msg);
    });

    return () => {
      socket.off("player_color");
      socket.off("room_full");
      socket.off("game_ready");
      socket.off("receive_move");
      socket.off("receive_message");
      socket.off("opponent_disconnected");
    };
  }, [roomId, navigate]);

  // Timer logic
  useEffect(() => {
    if (statusText !== "Both players joined! Game is ON." || gameEnded) return;

    const interval = setInterval(() => {
      if (game.turn() === "w") {
        setWhiteTime((t) => (t > 0 ? t - 1 : 0));
      } else {
        setBlackTime((t) => (t > 0 ? t - 1 : 0));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game, statusText, gameEnded]);

  useEffect(() => {
    if (whiteTime === 0 || blackTime === 0) setGameEnded(true);
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [whiteTime, blackTime, messages]);

  function onDrop(sourceSquare, targetSquare) {
    if (game.turn() !== playerColor || gameEnded) return false;

    const gameCopy = new Chess();
    gameCopy.load(game.fen());
    const moveInfo = { from: sourceSquare, to: targetSquare, promotion: "q" };

    try {
      const move = gameCopy.move(moveInfo);
      if (move) {
        setGame(gameCopy);
        socket.emit("make_move", { roomId, move: moveInfo });
        if (move.captured) CAPTURE_SOUND.play().catch(() => {});
        else MOVE_SOUND.play().catch(() => {});
        
        if (gameCopy.isGameOver()) setGameEnded(true);
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    socket.emit("send_message", { roomId, message: inputMsg });
    setInputMsg("");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/multiplayer?room=${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Captured pieces logic
  const getCapturedPieces = () => {
    const history = game.history({ verbose: true });
    const whiteCaptured = [];
    const blackCaptured = [];
    history.forEach(m => {
      if (m.captured) {
        if (m.color === 'w') blackCaptured.push(m.captured);
        else whiteCaptured.push(m.captured);
      }
    });
    return { w: whiteCaptured, b: blackCaptured };
  };

  const { w: whiteCaptured, b: blackCaptured } = getCapturedPieces();

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#0f0f1a", color: "white", fontFamily: "'Inter', sans-serif" }}>
      
      {/* Sidebar for Info & Chat */}
      <div style={{ width: "280px", borderRight: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", backgroundColor: "rgba(18, 18, 35, 0.9)", backdropFilter: "blur(10px)" }}>
        
        {/* Connection Status & Room */}
        <div style={{ padding: "15px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "8px", color: "#a5a5e1", fontWeight: "800" }}>IP Chess Hub</h2>
          <div style={{ padding: "8px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "6px", fontSize: "0.8rem", marginBottom: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
             <p style={{ margin: 0, opacity: 0.6 }}>Room: <strong>{roomId}</strong></p>
             <button onClick={handleCopyLink} style={{ marginTop: "8px", width: "100%", padding: "6px", border: "none", borderRadius: "5px", background: "#fff", color: "#000", fontWeight: "bold", cursor: "pointer", fontSize: "0.75rem" }}>
               {copied ? "✓ Copied" : "Invite Friend"}
             </button>
          </div>
          <div style={{ color: "#f39c12", fontWeight: "bold", fontSize: "0.8rem", opacity: 0.9 }}>{statusText}</div>
        </div>

        {/* Move History */}
        <div style={{ flex: 1, overflowY: "auto", padding: "15px" }}>
            <h3 style={{ fontSize: "0.75rem", textTransform: "uppercase", opacity: 0.4, marginBottom: "10px", fontWeight: "700", letterSpacing: "1px" }}>Move History</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "0.8rem" }}>
                {game.history().map((m, i) => (
                    <div key={i} style={{ padding: "4px 8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.03)" }}>
                        {i % 2 === 0 ? `${Math.floor(i/2)+1}. ` : ""}{m}
                    </div>
                ))}
            </div>
        </div>

        {/* Chat Section */}
        <div style={{ height: "200px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", backgroundColor: "rgba(0,0,0,0.2)" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px", display: "flex", flexDirection: "column", gap: "5px" }}>
                {messages.map((m, i) => (
                    <div key={i} style={{ alignSelf: m.color === playerColor ? "flex-end" : "flex-start", background: m.color === playerColor ? "#4f4f8a" : "rgba(255,255,255,0.08)", padding: "4px 10px", borderRadius: "8px", fontSize: "0.8rem", maxWidth: "85%", border: "1px solid rgba(255,255,255,0.05)" }}>
                        {m.text}
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendMessage} style={{ padding: "8px", display: "flex", gap: "5px" }}>
                <input value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} placeholder="Chat..." style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid #333", color: "#fff", padding: "6px 10px", borderRadius: "5px", outline: "none", fontSize: "0.8rem" }} />
                <button type="submit" style={{ padding: "6px 12px", background: "#a5a5e1", border: "none", borderRadius: "5px", color: "#000", fontWeight: "bold", cursor: "pointer", fontSize: "0.75rem" }}>Send</button>
            </form>
        </div>
      </div>

      {/* Main Game Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", padding: "5px" }}>
        
        {/* Opponent Info & Captured Pieces */}
        <div style={{ width: "min(95%, 480px)", display: "flex", justifyContent: "space-between", marginBottom: "8px", padding: "0 5px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: playerColor === 'w' ? '#333' : '#fff', display: "flex", alignItems: "center", justifyContent: "center", color: playerColor === 'w' ? '#fff' : '#000', fontWeight: "bold", fontSize: "0.75rem", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {playerColor === 'w' ? 'B' : 'W'}
                </div>
                <div>
                   <div style={{ fontWeight: "700", fontSize: "0.85rem", opacity: 0.9 }}>Opponent</div>
                   <div style={{ fontSize: "0.7rem", display: "flex", gap: "2px", opacity: 0.5 }}>
                      {(playerColor === 'w' ? blackCaptured : whiteCaptured).length > 0 ? (playerColor === 'w' ? blackCaptured : whiteCaptured).map((p, i) => (
                          <span key={i}>{p}</span>
                      )) : "No captures"}
                   </div>
                </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", padding: "4px 10px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", fontSize: "1.1rem", fontWeight: "800", color: (playerColor === 'w' ? blackTime : whiteTime) < 30 ? "#e74c3c" : "#fff", minWidth: "60px", textAlign: "center" }}>
               {formatTime(playerColor === 'w' ? blackTime : whiteTime)}
            </div>
        </div>

        {/* Board Container - Optimized responsive size */}
        <div style={{ width: "min(90vw - 300px, 98vh - 140px)", maxWidth: "480px", aspectRatio: "1/1", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", borderRadius: "4px", overflow: "hidden", border: "3px solid rgba(255,255,255,0.1)" }}>
          <Chessboard 
              position={game.fen()} 
              onPieceDrop={onDrop} 
              boardOrientation={playerColor === "b" ? "black" : "white"}
              customDarkSquareStyle={{ backgroundColor: "#4f728c" }} 
              customLightSquareStyle={{ backgroundColor: "#e2e6eb" }} 
              animationDuration={200}
          />
        </div>

        {/* Player Info & Captured Pieces */}
        <div style={{ width: "min(95%, 480px)", display: "flex", justifyContent: "space-between", marginTop: "8px", padding: "0 5px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: playerColor === 'w' ? '#fff' : '#333', display: "flex", alignItems: "center", justifyContent: "center", color: playerColor === 'w' ? '#000' : '#fff', fontWeight: "bold", fontSize: "0.75rem", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {playerColor === 'w' ? 'W' : 'B'}
                </div>
                <div>
                   <div style={{ fontWeight: "700", fontSize: "0.85rem", opacity: 0.9 }}>You</div>
                   <div style={{ fontSize: "0.7rem", display: "flex", gap: "2px", opacity: 0.5 }}>
                      {(playerColor === 'w' ? whiteCaptured : blackCaptured).length > 0 ? (playerColor === 'w' ? whiteCaptured : blackCaptured).map((p, i) => (
                          <span key={i}>{p}</span>
                      )) : "No captures"}
                   </div>
                </div>
            </div>
            <div style={{ background: "#fff", color: "#000", padding: "4px 10px", borderRadius: "6px", fontSize: "1.1rem", fontWeight: "900", minWidth: "60px", textAlign: "center" }}>
               {formatTime(playerColor === 'w' ? whiteTime : blackTime)}
            </div>
        </div>

        {/* Game End Overlay */}
        {gameEnded && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(5px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
                <h2 style={{ fontSize: "2.5rem", marginBottom: "15px", fontWeight: "800" }}>Game Over</h2>
                <button onClick={() => navigate("/")} style={{ padding: "12px 30px", background: "#fff", color: "#000", border: "none", borderRadius: "50px", fontWeight: "bold", cursor: "pointer" }}>Back to Lobby</button>
            </div>
        )}

      </div>
    </div>
  );
}
