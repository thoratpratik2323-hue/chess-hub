import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useSearchParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Home, Share2, MessageSquare, ShieldCheck } from "lucide-react";
import Hud from "./Hud";

const SOCKET_URL = window.location.hostname === "localhost" 
  ? "http://localhost:3001" 
  : window.location.origin;

const MOVE_SOUND = new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3");
const CAPTURE_SOUND = new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3");

export default function MultiplayerGame() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get("room");

  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState(""); 
  const [statusText, setStatusText] = useState("Establishing Connection...");
  const [copied, setCopied] = useState(false);
  
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const chatEndRef = useRef(null);
  const [gameEnded, setGameEnded] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!roomId) {
      const newRoom = Math.random().toString(36).substring(2, 9);
      navigate(`/multiplayer?room=${newRoom}`, { replace: true });
      return;
    }

    // Connect to Socket.io
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to server");
      socket.emit("join_room", roomId);
    });

    socket.on("player_color", (color) => {
      setPlayerColor(color);
      setStatusText(color === "w" ? "Signed as White. Waiting for opponent..." : "Signed as Black. Ready for battle.");
    });

    socket.on("game_ready", () => {
      setStatusText("Game is ON.");
    });

    socket.on("room_full", () => {
      setStatusText("Room is Full!");
    });

    socket.on("receive_move", (move) => {
        setGame((prevGame) => {
            const gameCopy = new Chess(prevGame.fen());
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

    socket.on("receive_message", (msg) => {
        setMessages((prev) => [...prev, msg]);
    });

    socket.on("opponent_disconnected", () => {
        setStatusText("Opponent disconnected.");
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function onDrop(sourceSquare, targetSquare) {
    if (game.turn() !== playerColor || gameEnded) return false;

    const moveInfo = { from: sourceSquare, to: targetSquare, promotion: "q" };

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move(moveInfo);
      
      if (move) {
        setGame(gameCopy);
        if (move.captured) CAPTURE_SOUND.play().catch(() => {});
        else MOVE_SOUND.play().catch(() => {});
        
        socketRef.current.emit("make_move", { roomId, move: moveInfo });

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
    
    socketRef.current.emit("send_message", { roomId, message: inputMsg });
    setInputMsg("");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Hud title={`MULTIPLAYER_SESSION_${roomId?.toUpperCase()}`}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "30px", padding: "40px 20px", minHeight: "calc(100vh - 80px)" }}>
        
        {/* Sidebar */}
        <div style={{ width: "300px", background: "rgba(0, 243, 255, 0.05)", border: "1px solid var(--glass-border)", padding: "20px", borderRadius: "10px", display: "flex", flexDirection: "column", height: "fit-content" }}>
          
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--neon-blue)", marginBottom: "15px" }}>
              <ShieldCheck size={20} />
              <h3 style={{ fontSize: "14px", letterSpacing: "2px" }}>SESSION_STATUS</h3>
            </div>
            
            <div style={{ color: "#a5a5e1", fontSize: "0.8rem", marginBottom: "15px" }}>
              {statusText}
            </div>

            <button 
                onClick={handleCopyLink} 
                className="stark-btn" 
                style={{ width: "100%", padding: "10px", marginBottom: "10px", fontSize: "0.7rem" }}
            >
              <Share2 size={12} style={{ marginRight: "8px" }} /> {copied ? "INVITE_HASH_COPIED" : "SEND_INVITE_LINK"}
            </button>
          </div>

          <div style={{ height: "200px", overflowY: "auto", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "15px", display: "flex", flexDirection: "column", gap: "5px" }}>
             <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginBottom: "5px" }}>_CHAT_DECRYPT:</p>
             {messages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.color === playerColor ? "flex-end" : "flex-start", background: m.color === playerColor ? "rgba(0, 243, 255, 0.2)" : "rgba(255,255,255,0.05)", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    {m.text}
                </div>
             ))}
             <div ref={chatEndRef} />
          </div>

          <form onSubmit={sendMessage} style={{ marginTop: "10px", display: "flex", gap: "5px" }}>
             <input 
                value={inputMsg} 
                onChange={(e) => setInputMsg(e.target.value)} 
                placeholder="SEND_ENCRYPTED..." 
                style={{ flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid var(--glass-border)", color: "#fff", padding: "8px", borderRadius: "5px", outline: "none", fontSize: "12px" }} 
             />
             <button type="submit" style={{ background: "var(--neon-blue)", color: "black", border: "none", borderRadius: "5px", padding: "0 15px", cursor: "pointer" }}>
                <MessageSquare size={14} />
             </button>
          </form>
        </div>

        {/* Board */}
        <div style={{ width: "100%", maxWidth: "560px", position: "relative" }}>
           <Chessboard 
              position={game.fen()} 
              onPieceDrop={onDrop} 
              boardOrientation={playerColor === "b" ? "black" : "white"}
              customDarkSquareStyle={{ backgroundColor: "#3b516b" }} 
              customLightSquareStyle={{ backgroundColor: "#d5d9e0" }} 
              boardWidth={Math.min(window.innerWidth - 60, window.innerHeight - 240, 480)}
           />
           {gameEnded && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                 <h2 className="stark-glow" style={{ fontSize: "2rem" }}>GAME_OVER</h2>
                 <button className="stark-btn" style={{ marginTop: "20px" }} onClick={() => navigate("/")}>INITIATE_LOBBY_RETURN</button>
              </div>
           )}
        </div>

        {/* Home Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
           <button 
              onClick={() => navigate('/')}
              className="stark-btn"
              style={{ padding: "15px", width: "200px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "white" }}
           >
              <Home size={16} /> EXIT_SESSION
           </button>
        </div>

      </div>
    </Hud>
  );
}
