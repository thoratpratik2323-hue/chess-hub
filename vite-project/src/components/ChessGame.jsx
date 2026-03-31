import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Link, useNavigate } from "react-router-dom";
import Hud from "./Hud";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, RotateCcw, Home, Target } from "lucide-react";

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [isScanning, setIsScanning] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const navigate = useNavigate();

  function makeAMove(move) {
    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn());
    try {
      const result = gameCopy.move(move);
      setGame(gameCopy);
      setMoveHistory([...moveHistory, result.san]);
      return result;
    } catch (e) {
      return null;
    }
  }

  function makeRandomMove() {
    setIsScanning(true);
    setTimeout(() => {
      const possibleMoves = game.moves();
      if (game.isGameOver() || game.isDraw() || possibleMoves.length === 0) {
        setIsScanning(false);
        return;
      }
      const randomIndex = Math.floor(Math.random() * possibleMoves.length);
      makeAMove(possibleMoves[randomIndex]);
      setIsScanning(false);
    }, 800); // Simulate "Thinking" time
  }

  function onDrop(sourceSquare, targetSquare) {
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    if (move === null) return false;
    makeRandomMove();
    return true;
  }

  const resetGame = () => {
    setGame(new Chess());
    setMoveHistory([]);
  };

  return (
    <Hud title="TACTICAL_SIM_0X44">
      <div className="game-wrapper" style={{ padding: "40px 20px", display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "30px", minHeight: "calc(100vh - 80px)" }}>
        
        {/* Left Side: Stats and Info */}
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="stark-stats"
          style={{ width: "300px", background: "rgba(0, 243, 255, 0.05)", border: "1px solid var(--glass-border)", padding: "20px", borderRadius: "10px" }}
        >
          <div className="stats-header" style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--neon-blue)", marginBottom: "20px" }}>
            <Cpu size={20} />
            <h3 style={{ fontSize: "14px", letterSpacing: "2px" }}>CPU_LEVEL: LEGENDARY</h3>
          </div>

          <div className="move-history" style={{ height: "300px", overflowY: "auto", fontFamily: "monospace", fontSize: "12px", color: "rgba(255, 255, 255, 0.6)" }}>
            <p style={{ color: "var(--neon-blue)", marginBottom: "10px" }}>_MOVE_LOG:</p>
            {moveHistory.map((move, i) => (
              <div key={i} style={{ marginBottom: "4px" }}>
                [{i + 1}] EXEC_MOVE: {move}
              </div>
            ))}
          </div>

          <AnimatePresence>
            {isScanning && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ color: "var(--neon-blue)", marginTop: "20px", display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div className="pulse-dot"></div>
                <span style={{ fontSize: "12px" }}>SCANNING_POSSIBILITIES...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Center: Board */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          style={{ width: "100%", maxWidth: "600px", position: "relative" }}
        >
          <div style={{ position: "absolute", inset: "-10px", border: "1px solid rgba(0, 243, 255, 0.2)", pointerEvents: "none", zIndex: -1 }}></div>
          <Chessboard 
            position={game.fen()} 
            onPieceDrop={onDrop} 
            customDarkSquareStyle={{ backgroundColor: "#3b516b" }} 
            customLightSquareStyle={{ backgroundColor: "#d5d9e0" }} 
            boardWidth={Math.min(window.innerWidth - 60, window.innerHeight - 180, 520)}
            id="BasicBoard"
          />
        </motion.div>

        {/* Right Side: Controls */}
        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          style={{ display: "flex", flexDirection: "column", gap: "15px" }}
        >
          <button 
            onClick={resetGame}
            style={{ 
              background: "transparent", 
              border: "1px solid var(--neon-blue)", 
              color: "var(--neon-blue)", 
              padding: "15px", 
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "var(--tech-font)",
              fontSize: "12px",
              width: "200px"
            }}
          >
            <RotateCcw size={16} /> RESTART_ENV
          </button>
          
          <button 
             onClick={() => navigate('/')}
             style={{ 
              background: "transparent", 
              border: "1px solid rgba(255, 255, 255, 0.2)", 
              color: "white", 
              padding: "15px", 
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "var(--tech-font)",
              fontSize: "12px",
              width: "200px"
            }}
          >
            <Home size={16} /> EXIT_STARK_NET
          </button>
        </motion.div>

      </div>
    </Hud>
  );
}
