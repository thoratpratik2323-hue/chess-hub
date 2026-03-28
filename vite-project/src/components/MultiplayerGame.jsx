import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useSearchParams, useNavigate } from "react-router-dom";

// JSONBlob API Endpoint
const API_URL = "https://jsonblob.com/api/jsonBlob";

// Constants for sounds
const MOVE_SOUND = new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3");
const CAPTURE_SOUND = new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3");

export default function MultiplayerGame() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const blobId = searchParams.get("room");

  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState(""); 
  const [statusText, setStatusText] = useState("Loading game...");
  const [copied, setCopied] = useState(false);
  
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const chatEndRef = useRef(null);
  const [gameEnded, setGameEnded] = useState(false);

  // Identity to distinguish between White and Black
  const myId = useRef(localStorage.getItem("chess_player_id") || Math.random().toString(36).substring(7));
  
  useEffect(() => {
    localStorage.setItem("chess_player_id", myId.current);
  }, []);

  // --- Initial Room Setup ---
  useEffect(() => {
    if (!blobId) {
      // Create a new Room (JSON Blob)
      const initialState = {
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        whiteId: myId.current,
        blackId: null,
        messages: [],
        timestamp: Date.now()
      };

      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initialState)
      })
      .then(res => {
        const url = res.headers.get("Location");
        const id = url.split("/").pop();
        navigate(`/multiplayer?room=${id}`, { replace: true });
      })
      .catch(err => setStatusText("Error creating room."));
      
      return;
    }

    // Polling logic
    const interval = setInterval(() => {
      syncGame();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [blobId, navigate]);

  const syncGame = async () => {
    if (!blobId) return;
    try {
      const res = await fetch(`${API_URL}/${blobId}`);
      if (!res.ok) return;
      const data = await res.json();

      // Determine My Color
      if (data.whiteId === myId.current) {
        setPlayerColor("w");
      } else if (!data.blackId || data.blackId === myId.current) {
        // If black is empty, I take it
        if (!data.blackId) {
          data.blackId = myId.current;
          updateBlob(data);
        }
        setPlayerColor("b");
      } else {
        setStatusText("Room is full!");
        return;
      }

      // Update Local Game State if changed
      if (data.fen !== game.fen()) {
        const newGame = new Chess(data.fen);
        setGame(newGame);
        MOVE_SOUND.play().catch(() => {});
      }

      // Update Messages
      if (data.messages.length !== messages.length) {
        setMessages(data.messages);
      }

      // Status text
      if (!data.blackId) {
        setStatusText("Waiting for opponent...");
      } else {
        setStatusText("Game is ON.");
      }

      if (game.isGameOver()) setGameEnded(true);

    } catch (e) {
      console.error("Sync failed", e);
    }
  };

  const updateBlob = async (newState) => {
    if (!blobId) return;
    try {
      await fetch(`${API_URL}/${blobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newState)
      });
    } catch (e) {
      console.error("Update failed", e);
    }
  };

  function onDrop(sourceSquare, targetSquare) {
    if (game.turn() !== playerColor || gameEnded) return false;

    const gameCopy = new Chess(game.fen());
    const moveInfo = { from: sourceSquare, to: targetSquare, promotion: "q" };

    try {
      const move = gameCopy.move(moveInfo);
      if (move) {
        setGame(gameCopy);
        if (move.captured) CAPTURE_SOUND.play().catch(() => {});
        else MOVE_SOUND.play().catch(() => {});
        
        // Save to blob
        fetch(`${API_URL}/${blobId}`).then(r => r.json()).then(data => {
            data.fen = gameCopy.fen();
            data.timestamp = Date.now();
            updateBlob(data);
        });

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
    
    fetch(`${API_URL}/${blobId}`).then(r => r.json()).then(data => {
        const newMessage = { color: playerColor, text: inputMsg };
        data.messages.push(newMessage);
        updateBlob(data);
        setInputMsg("");
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#0f0f1a", color: "white", fontFamily: "'Inter', sans-serif" }}>
      
      {/* Sidebar */}
      <div style={{ width: "280px", borderRight: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", backgroundColor: "rgba(18, 18, 35, 0.9)", backdropFilter: "blur(10px)" }}>
        
        <div style={{ padding: "15px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "8px", color: "#a5a5e1", fontWeight: "800" }}>IP Chess Hub (Serverless)</h2>
          <div style={{ padding: "8px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "6px", fontSize: "0.8rem", marginBottom: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
             <p style={{ margin: 0, opacity: 0.6 }}>ID: <strong>{blobId || "Creating..."}</strong></p>
             <button onClick={handleCopyLink} style={{ marginTop: "8px", width: "100%", padding: "6px", border: "none", borderRadius: "5px", background: "#fff", color: "#000", fontWeight: "bold", cursor: "pointer", fontSize: "0.75rem" }}>
               {copied ? "✓ Copied" : "Invite Friend"}
             </button>
          </div>
          <div style={{ color: "#f39c12", fontWeight: "bold", fontSize: "0.8rem", opacity: 0.9 }}>{statusText}</div>
        </div>

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

      {/* Main Game */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", padding: "5px" }}>
        
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
