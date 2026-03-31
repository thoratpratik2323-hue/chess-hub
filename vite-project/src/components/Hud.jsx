import React from 'react';
import './Hud.css';
import { motion } from 'framer-motion';

const Hud = ({ children, title = "SYS_01_CHESS_HUB" }) => {
  return (
    <div className="hud-overlay">
      <div className="scanline"></div>
      
      {/* Corner Brackets */}
      <div className="hud-corner top-left"></div>
      <div className="hud-corner top-right"></div>
      <div className="hud-corner bottom-left"></div>
      <div className="hud-corner bottom-right"></div>

      {/* HUD Header */}
      <div className="hud-header">
        <div className="status-indicator">
          <motion.div 
            animate={{ opacity: [1, 0.4, 1] }} 
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="pulse-dot"
          ></motion.div>
          SYST_ACTIVE
        </div>
        <h1 className="hud-title">{title}</h1>
        <div className="hud-time">
          DATE: 2026.03.31 // NODE_01
        </div>
      </div>

      {/* Main Content Area */}
      <div className="hud-content">
        {children}
      </div>

      {/* HUD Footer */}
      <div className="hud-footer">
        <div className="hud-footer-left">ENCRYPTED_LINK_0X2F</div>
        <div className="hud-footer-right">PROTOCOL: TACTICAL_STRATEGY</div>
      </div>
    </div>
  );
};

export const StarkButton = ({ onClick, children, className = "" }) => (
  <motion.button
    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(0, 243, 255, 0.4)" }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`stark-btn ${className}`}
  >
    <span className="btn-glitch">{children}</span>
  </motion.button>
);

export default Hud;
