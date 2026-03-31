import { HashRouter, Routes, Route } from "react-router-dom";
import Hero from "./components/Hero";
import ChessGame from "./components/ChessGame";
import MultiplayerGame from "./components/MultiplayerGame";
import './lenis';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/play" element={<ChessGame />} />
        <Route path="/multiplayer" element={<MultiplayerGame />} />
      </Routes>
    </HashRouter>
  )
}

export default App
