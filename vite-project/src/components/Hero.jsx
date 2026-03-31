import React, { useRef, useEffect } from 'react';
import './Hero.css';
import './HeroStark.css';
import Navbar from './Navbar';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Tilt from 'react-parallax-tilt';
import { useNavigate } from 'react-router-dom';
gsap.registerPlugin(ScrollTrigger);

const ScrollScanner = () => (
  <div className="scroll-scanner">
    <div className="scanner-line"></div>
    <div className="scanner-text">INITIALIZING_SCAN...</div>
  </div>
);

const Hero = () => {
  const navigate = useNavigate();
  const kingRef = useRef(null);
  const heroRef = useRef(null);
  const section1Ref = useRef(null);
  const section2Ref = useRef(null);
  const section3Ref = useRef(null);
  useEffect(() => {
    const h1 = document.querySelector('.hero-heading');
    const p = document.querySelector('.hero-subtext');
    const btn = document.querySelector('.stark-btn');
  
    gsap.set([h1, p, btn], { y: 80, opacity: 0 });
  
    gsap.to(h1, {
      y: 0,
      opacity: 1,
      delay: 3,
      duration: 1,
      ease: 'power3.out',
    });
  
    gsap.to(p, {
      y: 0,
      opacity: 1,
      delay: 3.3,
      duration: 1,
      ease: 'power3.out',
    });
  
    gsap.to(btn, {
      y: 0,
      opacity: 1,
      delay: 3.6,
      duration: 1,
      ease: 'power3.out',
    });
  }, []);
  
  useEffect(() => {
    const heading = document.querySelector('.section1-heading');
    const para = document.querySelector('.section1-para');
  
    if (!heading || !para) return;
  
    gsap.set([heading, para], { opacity: 0, x: 100 });
  
    gsap.to(heading, {
      scrollTrigger: {
        trigger: section1Ref.current,
        start: 'top 50%',
        toggleActions: 'play none none none',
      },
      opacity: 1,
      x: 0,
      duration: 1,
      ease: 'power3.out',
    });
  
    gsap.to(para, {
      scrollTrigger: {
        trigger: section1Ref.current,
        start: 'top 50%',
        toggleActions: 'play none none none',
      },
      opacity: 1,
      x: 0,
      duration: 1,
      delay: 0.3,
      ease: 'power3.out',
    });
  }, []);
  
  useEffect(() => {
    const heading = document.querySelector('.section2-heading');
    const para = document.querySelector('.section2-para');
  
    if (!heading || !para) return;
  
    gsap.set([heading, para], { opacity: 0, y: 60 });
  
    gsap.to(heading, {
      scrollTrigger: {
        trigger: section2Ref.current,
        start: 'top 50%',
        toggleActions: 'play none none none',
      },
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
    });
  
    gsap.to(para, {
      scrollTrigger: {
        trigger: section2Ref.current,
        start: 'top 45%',
        toggleActions: 'play none none none',
      },
      opacity: 1,
      y: 0,
      duration: 1,
      delay: 0.2,
      ease: 'power3.out',
    });
  }, []);
  
  useEffect(() => {
    const overlay = document.querySelector('.section3-overlay');
    const h1 = overlay.querySelector('h1');
    const p = overlay.querySelector('p');
    const btn = overlay.querySelector('button');
  
    const showOverlay = gsap.timeline({ paused: true });
  
    showOverlay.to(overlay, {
      opacity: 1,
      duration: 1,
      delay: 3,
      pointerEvents: 'auto',
    });
  
    showOverlay.to(h1, {
      y: 0,
      opacity: 1,
      duration: 1,
      delay: 0.3,
      ease: 'power3.out',
    });
  
    showOverlay.to(p, {
      y: 0,
      opacity: 1,
      duration: 1,
      delay: 0.3,
      ease: 'power3.out',
    });
  
    showOverlay.to(btn, {
      y: 0,
      opacity: 1,
      duration: 1,
      delay: 0.3,
      ease: 'power3.out',
    });

    ScrollTrigger.create({
      trigger: section3Ref.current,
      start: 'top center',
      end: 'bottom top',
      onEnter: () => showOverlay.play(),
      onLeaveBack: () => {
        gsap.to(overlay, {
          opacity: 0,
          duration: 0.5,
          pointerEvents: 'none',
        });
        gsap.set([h1, p, btn], {
          opacity: 0,
          y: 80,
        });
        showOverlay.pause(0); 
      },
     
    });
  }, []);
  

  useEffect(() => {
    const heroImg = kingRef.current;
    const section1 = section1Ref.current;
    const section2 = section2Ref.current;
    const section3 = document.querySelector('.section3'); 
  
    if (!heroImg || !section1 || !section2 || !section3) return;
  
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section1,
        start: 'top 70%',
        endTrigger: section3,
        end: 'top center',
        scrub: true,
        
      },
    });
  
    
    tl.to(heroImg, {
      x: 700,
      y: 810,
      scale: 1.0,
      rotate: -30,
      ease: 'power2.out',
    });
  
    tl.to(heroImg, {
      x: 1250,
      y: 1110,
      scale: 0.87,
      rotate: 10,
      ease: 'power2.inOut',
    });
  
    tl.to(heroImg, {
      x: 1830,
      y: 1890,
      scale: 1.9,
      rotate: -30,
      ease: 'power2.inOut',
    });
  
  }, []);
  

  return (
  <>
    <div className="hero-container" ref={heroRef}>
      <Navbar />
      <video className="hero-video" autoPlay muted loop playsInline>
        <source src="videos/hero.mp4" type="video/mp4" />
      </video>    
      <div className="hero-content">
        <ScrollScanner />
        <Tilt
          className="tilt-wrapper"
          tiltMaxAngleX={20}
          tiltMaxAngleY={20}
          scale={1.03}
          gyroscope={true}
          transitionSpeed={2000}
          perspective={2000}
          style={{ width: 'fit-content', margin: '0 auto' }}
        >
          <div className="stark-header">
            <h1 className="hero-heading stark-glow">IP CHESS HUB</h1>
            <div className="hud-line"></div>
            <p className="hero-subtext">FROM SCATTERED CHAOS TO TACTICAL DOMINANCE</p>
            <button className="stark-btn" onClick={() => navigate('/multiplayer')}>
              <span className="btn-content">INITIALIZE_PVP_01</span>
            </button>
          </div>
        </Tilt>
      </div>
    </div>

    <div className="hero-model1">
      <img
        src="images/king.png"
        alt="Tactical King"
        className="hero-img stark-img"
        ref={kingRef}
      />
    </div>

    <div className="section1" ref={section1Ref}>
      <div className="section1-left"></div>
      <div className="section1-right glass-card">
        <h1 className="section1-heading">SYSTEM_DECODE: MOVE_LOG</h1>
        <p className="section1-para">
          In the digital matrix of chess, every bit counts. We help you decode the tactical streams — from timeless theory to modern algorithmic strategies. <br /><br />
          _INIT_PROTOCOL: COMMAND_NOT_FOLLOW.
        </p>
      </div>
    </div>

    <div className="section2" ref={section2Ref}>
      <div className="section2-top">
        <img src="images/section2.png" alt="Tactical Engine" className="king-img stark-glow" />
      </div>
      <h1 className="section2-heading">NEURAL_BATTLE_ENGAGED</h1>
      <p className="section2-para">A timeless clash where AI meets intuition. Precision. Power. Protocol.</p>
    </div>

    <div className="section3" ref={section3Ref}>
      <img src="images/section3-1.png" alt="Checkmate Simulation" className="section3-img" />
      <div className="section3-overlay stark-overlay">
        <Tilt
          className="tilt-wrapper"
          tiltMaxAngleX={15}
          tiltMaxAngleY={15}
        >
          <h1 className="stark-glow">TERMINAL_STATE: CHECKMATE</h1>
          <p>STRATEGY_COMPLETE. TOTAL_LOG_DOMINANCE_ACHIEVED.</p>
          <button className="stark-btn-large" onClick={() => navigate('/play')}>ACTIVATE_NEURAL_LINK</button>
        </Tilt>
      </div>
    </div>


</>

  );
};

export default Hero;
