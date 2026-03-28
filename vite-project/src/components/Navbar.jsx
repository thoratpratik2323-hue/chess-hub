import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  return (
    <div className="navbar">
      <div className="navbar-brand">IP Chess Hub</div>
      <ul className="navbar-links">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/play">Play Bot</Link></li>
        <li><Link to="/multiplayer">Play with Friend</Link></li>
      </ul>
      <button className="navbar-button" onClick={() => navigate('/multiplayer')}>Get Started</button>
    </div>
  );
};

export default Navbar;
