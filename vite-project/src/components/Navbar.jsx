import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  return (
    <motion.nav 
      initial={{ y: -100 }} 
      animate={{ y: 0 }} 
      className="stark-navbar"
    >
      <div className="navbar-logo stark-glow">IP_CHESS_HUB_v1.0</div>
      <div className="navbar-links">
        <Link to="/">[ HOME ]</Link>
        <Link to="/multiplayer">[ PVP_LINK ]</Link>
      </div>
      <button className="nav-action-btn" onClick={() => navigate('/multiplayer')}>
        ACTIVATE_PVP_PROTOCOL
      </button>
    </motion.nav>
  );
};

export default Navbar;
