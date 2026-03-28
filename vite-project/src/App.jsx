import { BrowserRouter, Routes, Route } from "react-router-dom";
import Hero from "./components/Hero";
import ChessGame from "./components/ChessGame";
import MultiplayerGame from "./components/MultiplayerGame";
import './lenis';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/play" element={<ChessGame />} />
        <Route path="/multiplayer" element={<MultiplayerGame />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
