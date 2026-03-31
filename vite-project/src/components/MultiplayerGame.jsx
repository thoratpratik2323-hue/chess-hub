import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Peer } from "peerjs";
import { Home, Share2, MessageSquare, ShieldCheck, Zap } from "lucide-react";
import Hud from "./Hud";

const MOVE_SOUND = new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3");
const CAPTURE_SOUND = new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3");

export default function MultiplayerGame() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomFromUrl = searchParams.get("room");

  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState(""); 
  const [statusText, setStatusText] = useState("Initializing P2P Protocol...");
  const [copied, setCopied] = useState(false);
  
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const chatEndRef = useRef(null);
  const [gameEnded, setGameEnded] = useState(false);
  
  const peerRef = useRef(null);
  const connRef = useRef(null);

  useEffect(() => {
    // Generate IDs: Host uses room ID from URL or random. Guest connects to Host.
    const myId = roomFromUrl ? `peer-${Math.random().toString(36).substr(2, 6)}` : `room-${Math.random().toString(36).substr(2, 9)}`;
    
    const peer = new Peer(myId, {
      host: '0.peerjs.com',
      secure: true,
      port: 443
    });
    peerRef.current = peer;

    peer.on("open", (id) => {
      console.log("My Peer ID:", id);
      if (roomFromUrl) {
        setStatusText("Linking to tactical session...");
        const conn = peer.connect(roomFromUrl);
        setupConnection(conn, "b");
      } else {
        setStatusText("Awaiting partner connection...");
        setPlayerColor("w");
      }
    });

    peer.on("connection", (conn) => {
        if (!connRef.current) {
            setupConnection(conn, "w");
        }
    });

    return () => {
      peer.destroy();
    };
  }, [roomFromUrl]);

  const setupConnection = (conn, color) => {
    connRef.current = conn;
    setPlayerColor(color);

    conn.on("open", () => {
      setStatusText("COMM LINK ESTABLISHED. Game ON.");
      if (color === "w") {
        conn.send({ type: "INIT_COLOR", color: "b" });
      }
    });

    conn.on("data", (data) => {
      if (data.type === "MOVE") {
        setGame((prevGame) => {
            const gameCopy = new Chess(data.fen);
            // Play sounds for remote move
            const history = gameCopy.history({ verbose: true });
            const lastMove = history[history.length - 1];
            if (lastMove?.captured) CAPTURE_SOUND.play().catch(() => {});
            else MOVE_SOUND.play().catch(() => {});
            
            if (gameCopy.isGameOver()) setGameEnded(true);
            return gameCopy;
        });
      } else if (data.type === "CHAT") {
        setMessages((prev) => [...prev, { color: data.color, text: data.text }]);
      } else if (data.type === "INIT_COLOR") {
        setPlayerColor(data.color);
        setStatusText("Ready for battle.");
      }
    });

    conn.on("close", () => {
      setStatusText("COMM LOSS: Partner offline.");
      connRef.current = null;
    });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function onDrop(sourceSquare, targetSquare) {
    if (!connRef.current || game.turn() !== playerColor || gameEnded) return false;

    const moveInfo = { from: sourceSquare, to: targetSquare, promotion: "q" };

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move(moveInfo);
      
      if (move) {
        setGame(gameCopy);
        if (move.captured) CAPTURE_SOUND.play().catch(() => {});
        else MOVE_SOUND.play().catch(() => {});
        
        connRef.current.send({ type: "MOVE", fen: gameCopy.fen() });

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
    if (!inputMsg.trim() || !connRef.current) return;
    
    const msgData = { color: playerColor, text: inputMsg };
    setMessages((prev) => [...prev, msgData]);
    connRef.current.send({ type: "CHAT", ...msgData });
    setInputMsg("");
  };

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${peerRef.current.id}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Hud title={`FAST_P2P_SESSION`}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "30px", padding: "40px 20px", minHeight: "calc(100vh - 80px)" }}>
        
        {/* Sidebar */}
        <div style={{ width: "300px", background: "rgba(0, 243, 255, 0.05)", border: "1px solid var(--glass-border)", padding: "20px", borderRadius: "10px", display: "flex", flexDirection: "column", height: "fit-content" }}>
          
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--neon-blue)", marginBottom: "15px" }}>
              <Zap size={20} className="stark-glow" />
              <h3 style={{ fontSize: "14px", letterSpacing: "2px" }}>FAST_P2P_LINK</h3>
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
