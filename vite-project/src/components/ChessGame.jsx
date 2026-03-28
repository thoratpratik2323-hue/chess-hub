import { useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Link } from "react-router-dom";

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());

  function makeAMove(move) {
    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn());
    try {
      const result = gameCopy.move(move);
      setGame(gameCopy);
      return result; 
    } catch (e) {
      return null;
    }
  }

  function makeRandomMove() {
    const possibleMoves = game.moves();
    if (game.isGameOver() || game.isDraw() || possibleMoves.length === 0)
      return; 
    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    makeAMove(possibleMoves[randomIndex]);
  }

  function onDrop(sourceSquare, targetSquare) {
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q", 
    });

    if (move === null) return false;
    setTimeout(makeRandomMove, 200);
    return true;
  }

  return (
    <div style={{ padding: "50px", display: "flex", flexDirection: "column", alignItems: "center", minHeight: "100vh", backgroundColor: "#1a1a2e", color: "white", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: "20px", fontSize: "2.5rem", letterSpacing: "1px" }}>Play Chess</h1>
      <div style={{ width: "90%", maxWidth: "600px", marginBottom: "30px", boxShadow: "0px 10px 30px rgba(0,0,0,0.5)" }}>
        <Chessboard position={game.fen()} onPieceDrop={onDrop} customDarkSquareStyle={{ backgroundColor: "#4f728c" }} customLightSquareStyle={{ backgroundColor: "#e2e6eb" }} />
      </div>
      <div>
        <button onClick={() => setGame(new Chess())} style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer", marginRight: "10px", backgroundColor: "#fff", color: "#1a1a2e", border: "none", borderRadius: "5px", fontWeight: "bold" }}>Restart Game</button>
        <Link to="/" style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer", backgroundColor: "#3a3a5e", color: "white", textDecoration: "none", borderRadius: "5px" }}>Back to Home</Link>
      </div>
    </div>
  );
}
