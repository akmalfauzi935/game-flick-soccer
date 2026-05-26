/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, RefreshCw, Trophy, ArrowLeft, Volume2, VolumeX, Coins, Zap } from 'lucide-react';
import { PlayerStats, Defender, Collectable, GameParticle, Vector2D } from '../types';
import { ALL_SKINS } from '../data/skins';
import audioSynth from '../utils/audio';

interface DribbleDashProps {
  stats: PlayerStats;
  onUpdateStats: (newStats: Partial<PlayerStats>) => void;
  onBackToMenu: () => void;
}

export default function DribbleDash({ stats, onUpdateStats, onBackToMenu }: DribbleDashProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sound Config
  const [soundOn, setSoundOn] = useState(audioSynth.getSoundEnabled());

  // Game UI state manager
  const [gameState, setGameState] = useState<'tutorial' | 'dribbling' | 'strike_matrix' | 'gameover'>('tutorial');
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0); // in meters
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [shieldActive, setShieldActive] = useState(false);
  const [speedLevel, setSpeedLevel] = useState(1);
  const [passedDefenders, setPassedDefenders] = useState(0);
  const [feedbackText, setFeedbackText] = useState<{ text: string; sub: string; color: string } | null>(null);

  // References for rendering loops
  const requestRef = useRef<number | null>(null);
  const dimensionsRef = useRef({ width: 380, height: 580 });
  const [dimensions, setDimensions] = useState({ width: 380, height: 580 });

  // Game assets / Entities reference state
  // Ball side coordinate: ranges from X = -140 to +140 inside our track lines
  const ballRef = useRef({
    x: 0,
    targetX: 0,
    y: 430, // bottom screen space positioning
    radius: 18,
    spin: 0,
    shadowScale: 1.0,
    state: 'active' as 'active' | 'tackled' | 'strike',
    // strike shootout sub-mechanics
    shootX: 0, // 3D shootout bx offset
    shootY: 18, // 3D shootout by height
    shootZ: 0, // 3D shootout bz depth
    shootVX: 0,
    shootVY: 0,
    shootVZ: 0,
    shootCurve: 0,
  });

  const defendersRef = useRef<Defender[]>([]);
  const collectablesRef = useRef<Collectable[]>([]);
  const particlesRef = useRef<GameParticle[]>([]);

  // Track scrolling y offset
  const trackOffsetRef = useRef(0);

  // Spawning intervals & game ticks
  const gameTickRef = useRef(0);
  const lastSpawnTick = useRef(0);

  // Target Goal setup when Strike Matrix slows time
  // Strike Matrix slows the field and triggers Swipe to Shoot!
  const strikeKeeperRef = useRef({
    x: 0,
    targetX: 0,
    y: 0,
    speed: 3.5,
    state: 'idle' as 'idle' | 'diving_left' | 'diving_right' | 'saved',
  });

  // Swipe trace indicators for shooting
  const swipePoints = useRef<{ x: number; y: number; time: number }[]>([]);
  const [isSwiping, setIsSwiping] = useState(false);

  // Audio configuration
  const toggleSound = () => {
    const nextVal = !soundOn;
    setSoundOn(nextVal);
    audioSynth.setSoundEnabled(nextVal);
  };

  const activeSkinObj = ALL_SKINS.find(s => s.id === stats.activeSkin) || ALL_SKINS[0];

  // Screen shake frame triggers
  const [shakeFrames, setShakeFrames] = useState(0);

  // Adapt size dynamically matching frame dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        dimensionsRef.current = { width, height };
        setDimensions({ width, height });
        // Place the ball nicely proportional to screen size inside constraints
        ballRef.current.y = height * 0.76;
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const startGame = () => {
    audioSynth.playWhistle();
    setScore(0);
    setDistance(0);
    setCoinsEarned(0);
    setPassedDefenders(0);
    setShieldActive(false);
    setSpeedLevel(1);

    defendersRef.current = [];
    collectablesRef.current = [];
    particlesRef.current = [];
    trackOffsetRef.current = 0;

    ballRef.current = {
      x: 0,
      targetX: 0,
      y: dimensionsRef.current.height * 0.76,
      radius: 17,
      spin: 0,
      shadowScale: 1.0,
      state: 'active',
      shootX: 0,
      shootY: 17,
      shootZ: 0,
      shootVX: 0,
      shootVY: 0,
      shootVZ: 0,
      shootCurve: 0,
    };

    setGameState('dribbling');
    showFeedback('GOCEK MULAI!', 'Geser bola menghindari musuh!', 'text-emerald-400');
  };

  const showFeedback = (text: string, sub: string, color: string = 'text-green-400') => {
    setFeedbackText({ text, sub, color });
    setTimeout(() => {
      setFeedbackText(null);
    }, 1800);
  };

  const spawnExplosion = (x2d: number, y2d: number, color: string, count = 15) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      particlesRef.current.push({
        x: x2d,
        y: y2d,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: Math.random() * 3.5 + 1.5,
        life: 0,
        maxLife: Math.random() * 20 + 20,
      });
    }
  };

  // Main Canvas updates & render loops
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const w = dimensionsRef.current.width;
      const h = dimensionsRef.current.height;

      ctx.clearRect(0, 0, w, h);

      ctx.save();
      if (shakeFrames > 0) {
        setShakeFrames(0); // Settle back to zero instantly with no camera displacement
      }

      // Handle logic sequences
      if (gameState === 'dribbling') {
        updateDribbleScroller(w, h);
        drawTrackFloor(ctx, w, h);
        drawCollectables(ctx, w, h);
        drawDefenders(ctx, w, h);
        drawActiveBall(ctx, w, h);
      } else if (gameState === 'strike_matrix') {
        updateStrikePhysics(w, h);
        drawGoalShootoutScreen(ctx, w, h);

        // Draw predictive trajectory path matching the physics engine
        if (isSwiping && swipePoints.current.length > 1 && ballRef.current.state === 'strike') {
          const firstPt = swipePoints.current[0];
          const lastPt = swipePoints.current[swipePoints.current.length - 1];
          const dx = lastPt.x - firstPt.x;
          const dy = lastPt.y - firstPt.y;

          if (dy < -10) {
            const vyIntensity = Math.abs(dy) * 0.045;
            const vzIntensity = Math.abs(dy) * 0.040;

            let curveIntensity = 0;
            if (swipePoints.current.length >= 5) {
              const midPoint = swipePoints.current[Math.floor(swipePoints.current.length / 2)];
              const projectedMidX = firstPt.x + (lastPt.x - firstPt.x) * 0.5;
              const deviation = midPoint.x - projectedMidX;
              curveIntensity = deviation * 0.045;
            }

            // Sim parameters
            let simVx = dx * 0.055;
            let simVy = Math.min(11, vyIntensity * 1.55);
            let simVz = Math.max(3.8, Math.min(9.5, vzIntensity * 1.55));
            let simCurve = curveIntensity * -0.016;

            let simBx = ballRef.current.shootX;
            let simBy = ballRef.current.shootY;
            let simBz = ballRef.current.shootZ;

            const pathPoints: { x: number; y: number }[] = [];

            for (let step = 0; step < 45; step++) {
              simBx += simVx;
              simBy += simVy;
              simBz += simVz;

              simVx += simCurve;
              simBy -= 0.14; // Gravity is 0.14 in DribbleDash shootout

              if (simBy < 18 && simVy < 0) {
                simBy = 18;
                simVy = -simVy * 0.45;
              }

              const Pt2d = getStrikeProjection(simBx, simBy, simBz, w, h);
              pathPoints.push({ x: Pt2d.x, y: Pt2d.y });

              if (simBz >= 100) break;
            }

            // Draw glowing trajectory dotted line
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = '#C1FF00'; // Theme Neon Green accent
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 6]);
            ctx.shadowColor = '#C1FF00';
            ctx.shadowBlur = 12;

            if (pathPoints.length > 0) {
              ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
              for (let i = 1; i < pathPoints.length; i++) {
                ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
              }
              ctx.stroke();
            }

            // Draw endpoint indicator target
            if (pathPoints.length > 0) {
              const lastPoint = pathPoints[pathPoints.length - 1];
              ctx.setLineDash([]);
              ctx.lineWidth = 2.5;

              // Outer pulsing lock-on ring
              const rPulse = 18 + Math.sin(Date.now() * 0.015) * 3;
              ctx.strokeStyle = '#C1FF00';
              ctx.fillStyle = 'rgba(193, 255, 0, 0.18)';
              ctx.beginPath();
              ctx.arc(lastPoint.x, lastPoint.y, rPulse, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              // Reticle target crosshair
              ctx.beginPath();
              ctx.moveTo(lastPoint.x - rPulse - 5, lastPoint.y);
              ctx.lineTo(lastPoint.x + rPulse + 5, lastPoint.y);
              ctx.moveTo(lastPoint.x, lastPoint.y - rPulse - 5);
              ctx.lineTo(lastPoint.x, lastPoint.y + rPulse + 5);
              ctx.strokeStyle = 'rgba(193, 255, 0, 0.75)';
              ctx.stroke();

              // Central bullseye dot
              ctx.fillStyle = '#C1FF00';
              ctx.beginPath();
              ctx.arc(lastPoint.x, lastPoint.y, 4.5, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        }

        drawStrikeBall(ctx, w, h);
      }

      // Updates particles regardless of states
      updateAndDrawParticles(ctx);

      ctx.restore();
      requestRef.current = requestAnimationFrame(gameLoop);
    };

    // --- GAME ENGINE: DRIBBLING SCROLLER RUN ---
    const updateDribbleScroller = (w: number, h: number) => {
      gameTickRef.current++;

      // Speed scaler
      const baseSpeed = 4.0 + (passedDefenders * 0.18);
      const scrollSpeed = baseSpeed * speedLevel;

      // Scroll background
      trackOffsetRef.current = (trackOffsetRef.current + scrollSpeed) % 150;

      // Increase distance covered
      setDistance(prev => {
        const next = prev + (scrollSpeed * 0.008);
        // Every 85 meters run, slow down into spectacular "Strike Zone!"
        if (Math.floor(next) > 0 && Math.floor(next) % 65 === 0 && Math.floor(next) !== Math.floor(prev)) {
          // Enter Matrix Penalty Shootout!
          enterStrikeMatrix(w, h);
        }
        return next;
      });

      // Smooth interpolation for ball movement (glide towards target)
      const ball = ballRef.current;
      const diffX = ball.targetX - ball.x;
      if (Math.abs(diffX) > 0.1) {
        ball.x += diffX * 0.22;
        ball.spin += Math.sign(diffX) * 0.18;
      }

      // Roll animation particles
      if (gameTickRef.current % 3 === 0 && activeSkinObj.particleType !== 'none') {
        particlesRef.current.push({
          x: w / 2 + ball.x + (Math.random() - 0.5) * 12,
          y: ball.y + 10,
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 2 + 1, // flowing backward
          color: activeSkinObj.color,
          size: Math.random() * 4 + 1.2,
          life: 0,
          maxLife: 20,
        });
      }

      // Generation interval of entities (enemies/coins)
      // Speed increases means spawn spacing shortens
      const spawnCooldown = Math.max(25, 45 - Math.floor(passedDefenders * 0.6));
      if (gameTickRef.current - lastSpawnTick.current > spawnCooldown) {
        lastSpawnTick.current = gameTickRef.current;
        spawnRandomEntity(w);
      }

      // Move and check defenders collisions
      const defs = defendersRef.current;
      for (let i = defs.length - 1; i >= 0; i--) {
        const def = defs[i];
        // Move towards bottom screen
        def.y += scrollSpeed + def.speed;

        // Perform Slide Tackles!
        if (def.state === 'running' && def.y > h * 0.15 && def.y < h * 0.45 && Math.random() < 0.05) {
          // Slide-tackles in direction of ball horizontal lane offset!
          def.state = 'tackling';
          def.targetX = ball.x + (Math.random() - 0.5) * 45;
          def.speed += 2.5; // rush boost
          audioSynth.playSwoosh();
        }

        if (def.state === 'tackling') {
          const moveDiff = def.targetX - def.x;
          if (Math.abs(moveDiff) > 1.2) {
            def.x += Math.sign(moveDiff) * 3.8;
          }
        }

        // Check horizontal pass line
        if (def.y > ball.y + 15 && def.state !== 'passed') {
          def.state = 'passed';
          setPassedDefenders(p => p + 1);
          setScore(p => p + 50);
          audioSynth.playSwoosh();
          // double-score coins drop chance
          if (Math.random() > 0.6) {
            setCoinsEarned(c => c + 1);
          }
        }

        // TACKLE COLLISION DETECTOR
        const ballScreenX = w / 2 + ball.x;
        const defScreenX = w / 2 + def.x;
        const distToBall = Math.sqrt(Math.pow(ballScreenX - defScreenX, 2) + Math.pow(ball.y - def.y, 2));

        if (distToBall < ball.radius + 18 && def.state !== 'passed') {
          if (shieldActive) {
            // Deflect slide with barrier shield!
            setShieldActive(false);
            def.state = 'passed';
            spawnExplosion(defScreenX, def.y, '#38bdf8', 25);
            audioSynth.playGoal();
            showFeedback('PERISAI PECAH 🛡️', 'Selamat dari tackle keras!', 'text-cyan-400');
          } else {
            // GAME OVER - SLIDE TACKLED!
            audioSynth.playSave();
            setShakeFrames(22);
            spawnExplosion(ballScreenX, ball.y, '#f43f5e', 30);
            gameStateTransitionOver();
            return;
          }
        }

        // Delete off-screen
        if (def.y > h + 40) {
          defs.splice(i, 1);
        }
      }

      // Move & check collectables
      const items = collectablesRef.current;
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.y += scrollSpeed;
        item.pulsePhase += 0.08;

        const ballScreenX = w / 2 + ball.x;
        const itemScreenX = w / 2 + item.x;

        const dist = Math.sqrt(Math.pow(ballScreenX - itemScreenX, 2) + Math.pow(ball.y - item.y, 2));
        if (dist < ball.radius + item.radius + 6 && !item.collected) {
          item.collected = true;
          audioSynth.playCoin();
          spawnExplosion(itemScreenX, item.y, '#f59e0b', 12);

          if (item.type === 'coin') {
            const multiplication = Math.floor(2 * activeSkinObj.multiplier);
            setCoinsEarned(c => c + multiplication);
            setScore(p => p + 25);
          } else if (item.type === 'speed') {
            // Boost speed momentarily
            setSpeedLevel(1.55);
            setScore(p => p + 40);
            showFeedback('GEBER CEPAT! ⚡', 'Gerakan dipercepat, poin melesat!', 'text-yellow-400 font-bold');
            setTimeout(() => {
              setSpeedLevel(1.0);
            }, 3000);
          } else if (item.type === 'multiplier') {
            // Double shield
            setShieldActive(true);
            showFeedback('PERISAI AKTIF 🛡️', 'Kebal dari 1 kali tackle musuh!', 'text-cyan-400');
          }

          items.splice(i, 1);
        } else if (item.y > h + 30) {
          items.splice(i, 1);
        }
      }
    };

    const gameStateTransitionOver = () => {
      setGameState('gameover');
      audioSynth.playGameOver();
      // save record score
      const finalStats: Partial<PlayerStats> = {
        coins: stats.coins + coinsEarned,
      };
      if (score > stats.dribbleHighScore) {
        finalStats.dribbleHighScore = score;
      }
      onUpdateStats(finalStats);
    };

    // Spawn mechanism logic
    const spawnRandomEntity = (w: number) => {
      const boundaryRange = 135; // lines width bounds
      const sidePos = (Math.random() - 0.5) * boundaryRange * 2;

      const roll = Math.random();
      if (roll < 0.6) {
        // Spawn standard defender
        defendersRef.current.push({
          id: Date.now() + Math.random(),
          x: sidePos,
          y: -40,
          targetX: sidePos,
          speed: Math.random() * 2 + 0.8,
          width: 38,
          height: 60,
          state: 'running',
          tackleCooldown: 0,
        });
      } else {
        // Spawn active items inside track
        const types: ('coin' | 'speed' | 'multiplier')[] = ['coin', 'coin', 'speed', 'multiplier'];
        const selectedType = types[Math.floor(Math.random() * types.length)];
        collectablesRef.current.push({
          id: Date.now() + Math.random(),
          x: sidePos,
          y: -40,
          type: selectedType,
          radius: 12,
          collected: false,
          pulsePhase: Math.random() * 10,
        });
      }
    };

    const enterStrikeMatrix = (w: number, h: number) => {
      audioSynth.playWhistle();
      setGameState('strike_matrix');
      showFeedback('AREA PENALTI! ⚽', 'Usap bola cepat untuk mencetak gol!', 'text-yellow-400 font-black animate-pulse text-lg');

      // Reset shootout ball coordinate system
      // bx (side offset), by (height), bz (distance depth)
      ballRef.current.shootX = ballRef.current.x; // inherits horizontal location
      ballRef.current.shootY = 18;
      ballRef.current.shootZ = 0;
      ballRef.current.state = 'strike'; // transitions state

      // Reset Matrix Goalkeeper
      strikeKeeperRef.current.x = 0;
      strikeKeeperRef.current.targetX = 0;
      strikeKeeperRef.current.state = 'idle';
      strikeKeeperRef.current.speed = 3.5 + (passedDefenders * 0.12);
    };

    // --- MINI MODULE: STRIKE MATRIX SHOOT PHYSICS ---
    const updateStrikePhysics = (width: number, height: number) => {
      const ball = ballRef.current;
      const gk = strikeKeeperRef.current;

      // 1. Move Keeper standard AI tracks ball
      if (ball.state === 'flight') {
        if (ball.shootZ > 30 && gk.state === 'idle') {
          gk.targetX = Math.max(-125, Math.min(125, ball.shootX * 0.95));
          if (gk.targetX < -25) {
            gk.state = 'diving_left';
          } else if (gk.targetX > 25) {
            gk.state = 'diving_right';
          } else {
            gk.state = 'idle';
          }
        }

        // glide goalkeeper towards target
        const gkDiff = gk.targetX - gk.x;
        if (Math.abs(gkDiff) > 1.2) {
          gk.x += Math.sign(gkDiff) * Math.min(Math.abs(gkDiff), gk.speed);
        }
      }

      // 2. Ball physical update
      if (ball.state === 'flight') {
        ball.shootX += ball.shootVX;
        ball.shootY += ball.shootVY;
        ball.shootZ += ball.shootVZ;

        // Apply curve hook
        ball.shootVX += ball.shootCurve;

        // Apply constant gravity
        ball.shootY -= 0.14;

        // spin
        ball.spin += 0.22;

        // emit sparks
        if (activeSkinObj.particleType !== 'none') {
          const { x: px, y: py, scale } = getStrikeProjection(ball.shootX, ball.shootY, ball.shootZ, width, height);
          particlesRef.current.push({
            x: px + (Math.random() - 0.5) * 10,
            y: py + (Math.random() - 0.5) * 10,
            vx: -ball.shootVX * 0.3,
            vy: -ball.shootVY * 0.3,
            color: activeSkinObj.color,
            size: (Math.random() * 5 + 1.5) * scale,
            life: 0,
            maxLife: 15,
          });
        }

        // ground bounces
        if (ball.shootY < 18 && ball.shootVY < 0) {
          ball.shootY = 18;
          ball.shootVY = -ball.shootVY * 0.45;
          audioSynth.playSave();
        }

        // Collision block with goalkeeper
        if (ball.shootZ >= 93 && ball.shootZ <= 104) {
          const gkBlockWidth = 55;
          const gkBlockHeight = 72;

          const hDist = Math.abs(ball.shootX - gk.x);
          const vDist = Math.abs(ball.shootY - 25); // center chest altitude

          if (hDist < gkBlockWidth && vDist < gkBlockHeight) {
            // SAVED BY GOALKEEPER!
            ball.state = 'saved';
            gk.state = 'saved';
            ball.shootVZ = -ball.shootVZ * 0.4;
            ball.shootVX = Math.sign(ball.shootX - gk.x) * 3;
            ball.shootVY = 2.0;

            audioSynth.playSave();
            setShakeFrames(8);
            showFeedback('DIAMANKAN KIPER!', 'Percobaan meleset!', 'text-amber-500');

            // Resume running to scroller after delay
            setTimeout(() => {
              resumeDribbling();
            }, 2000);
            return;
          }
        }

        // Goal detection line passed (bz >= 100)
        if (ball.shootZ >= 100 && ball.state === 'flight') {
          const isGoal = ball.shootX >= -132 && ball.shootX <= 132 && ball.shootY <= 95 && ball.shootY >= 4;

          if (isGoal) {
            // GOAL SUCCESS CRIPTER!
            ball.state = 'scored';
            audioSynth.playGoal();
            setShakeFrames(18);

            const { x: goal2dX, y: goal2dY } = getStrikeProjection(ball.shootX, ball.shootY, 100, width, height);
            spawnExplosion(goal2dX, goal2dY, activeSkinObj.color, 32);

            // Double coins reward + score multiply
            const addedCoins = Math.floor(15 * activeSkinObj.multiplier);
            setCoinsEarned(c => c + addedCoins);
            setScore(s => s + 250);

            const scorerTeam = stats.team?.name || 'TIM SAYA';
            showFeedback(`GOL INDAH ${scorerTeam}! ⚽`, `+250 Poin • +${addedCoins} Koin 🟡`, 'text-[#C1FF00] font-black italic tracking-tighter uppercase');

            setTimeout(() => {
              resumeDribbling();
            }, 2000);

          } else {
            // Out of bounds / Wide / Post
            ball.state = 'missed';
            audioSynth.playMiss();
            showFeedback('TEMBAKAN MELESKAP!', 'Tembakan keluar dari gawang!', 'text-rose-400');

            setTimeout(() => {
              resumeDribbling();
            }, 2000);
          }
        }
      }
    };

    const resumeDribbling = () => {
      // Clear screen entities to avoid instant hits upon restart
      defendersRef.current = [];
      collectablesRef.current = [];

      ballRef.current.x = 0;
      ballRef.current.targetX = 0;
      ballRef.current.state = 'active';

      setGameState('dribbling');
    };

    // --- DRAWING GRAPHIC MODULES ON CANVAS ---

    // Rolling grass pitch with 2.5D grid lines
    const drawTrackFloor = (context: CanvasRenderingContext2D, w: number, h: number) => {
      // Dark field ground back fill
      context.fillStyle = '#16a34a'; // Grass base green
      context.fillRect(0, 0, w, h);

      // Yard-lines stripe rendering moving downwards
      const stripeIntervalY = 120;
      const numStripes = Math.ceil(h / stripeIntervalY) + 2;

      context.fillStyle = '#15803d'; // alternating dark stripes
      for (let i = -1; i < numStripes; i++) {
        const topY = i * stripeIntervalY + (trackOffsetRef.current % stripeIntervalY);
        context.fillRect(0, topY, w, stripeIntervalY / 2);
      }

      // Draw shiny white sidelines bounds (representing the soccer hallway track!)
      context.strokeStyle = 'rgba(255,255,255,0.6)';
      context.lineWidth = 4;

      context.beginPath();
      // left sideline
      context.moveTo(w / 2 - 145, 0);
      context.lineTo(w / 2 - 145, h);
      // right sideline
      context.moveTo(w / 2 + 145, 0);
      context.lineTo(w / 2 + 145, h);
      context.stroke();

      // Horizontal metric indicators lines (yard-lines markers)
      context.strokeStyle = 'rgba(255,255,255,0.2)';
      context.lineWidth = 1.5;
      context.setLineDash([8, 12]);
      for (let i = -1; i < numStripes; i++) {
        const dividerY = i * stripeIntervalY + (trackOffsetRef.current % stripeIntervalY);
        context.beginPath();
        context.moveTo(w / 2 - 145, dividerY);
        context.lineTo(w / 2 + 145, dividerY);
        context.stroke();
      }
      context.setLineDash([]); // clear dash
    };

    const drawDefenders = (context: CanvasRenderingContext2D, w: number, h: number) => {
      const defs = defendersRef.current;
      defs.forEach(def => {
        const screenX = w / 2 + def.x;

        context.save();
        context.translate(screenX, def.y);

        // draw silhouette running shadow
        context.fillStyle = 'rgba(0,0,0,0.3)';
        context.beginPath();
        context.ellipse(0, 26, 20, 6, 0, 0, Math.PI * 2);
        context.fill();

        // draw opponent jersey details (Vibrant Cyan Blue kits)
        const jerseyKit = '#0284c7';
        const slideRedTackle = '#ef4444';

        // Tackle visual cues (charge arrows glow when sliding!)
        if (def.state === 'tackling') {
          // red dust particles
          context.fillStyle = slideRedTackle;
          context.beginPath();
          context.roundRect(-22, -25, 44, 46, 6);
          context.fill();

          // Spark dust sparks
          if (gameTickRef.current % 3 === 0) {
            particlesRef.current.push({
              x: screenX + (Math.random() - 0.5) * 15,
              y: def.y + 15,
              vx: (Math.random() - 0.5) * 3,
              vy: -1 - Math.random() * 2,
              color: '#f43f5e',
              size: Math.random() * 3 + 1,
              life: 0,
              maxLife: 20,
            });
          }
        } else {
          // Standard standing chest body shape
          context.fillStyle = jerseyKit;
          context.beginPath();
          context.roundRect(-16, -22, 32, 42, 6);
          context.fill();
        }

        // Head and standard hair cap
        context.fillStyle = '#ffedd5'; // skin tint
        context.beginPath();
        context.arc(0, -29, 9, 0, Math.PI * 2);
        context.fill();

        // Face outline cap hair
        context.fillStyle = '#1e293b';
        context.beginPath();
        context.arc(0, -32, 8, Math.PI, 0);
        context.fill();

        // Jersey Numbers drawing (opponent)
        context.fillStyle = '#ffffff';
        context.font = 'bold 12px monospace';
        context.textAlign = 'center';
        context.fillText('9', 0, 0);

        context.restore();
      });
    };

    const drawCollectables = (context: CanvasRenderingContext2D, w: number, h: number) => {
      const items = collectablesRef.current;
      items.forEach(item => {
        const screenX = w / 2 + item.x;
        const pulseRatio = Math.sin(item.pulsePhase) * 2.5;
        const radius = item.radius + pulseRatio;

        context.save();
        context.translate(screenX, item.y);

        // draw shadows on turf
        context.fillStyle = 'rgba(0,0,0,0.18)';
        context.beginPath();
        context.ellipse(0, 12, item.radius, 3, 0, 0, Math.PI * 2);
        context.fill();

        // Draw details depending on category items
        if (item.type === 'coin') {
          // Shiny golden coin spinning
          const gradient = context.createRadialGradient(-2, -2, 2, 0, 0, radius);
          gradient.addColorStop(0, '#fef08a');
          gradient.addColorStop(0.6, '#fbbf24');
          gradient.addColorStop(1, '#ca8a04');

          context.fillStyle = gradient;
          context.beginPath();
          context.arc(0, 0, radius, 0, Math.PI * 2);
          context.fill();

          // Coin stamp detail
          context.strokeStyle = '#f59e0b';
          context.lineWidth = 1.3;
          context.beginPath();
          context.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
          context.stroke();

          // Coins inner indicator star
          context.fillStyle = '#f59e0b';
          context.font = 'bold 8px system-ui';
          context.textAlign = 'center';
          context.fillText('$', 0, 3);

        } else if (item.type === 'speed') {
          // Blue Energy Drink Bolt
          context.fillStyle = '#06b6d4'; // cyan energy capsule
          context.beginPath();
          context.roundRect(-8, -12, 16, 24, 4);
          context.fill();

          // bolt lightning trace
          context.fillStyle = '#ffffff';
          context.beginPath();
          context.moveTo(0, -7);
          context.lineTo(-4, 1);
          context.lineTo(1, 1);
          context.lineTo(-1, 8);
          context.lineTo(4, 0);
          context.lineTo(-1, 0);
          context.closePath();
          context.fill();

        } else {
          // Shield Barrier pill
          context.fillStyle = '#3b82f6'; // royal blue shield
          context.strokeStyle = '#93c5fd';
          context.lineWidth = 2;

          context.beginPath();
          context.moveTo(0, -11);
          context.lineTo(8, -5);
          context.lineTo(6, 6);
          context.lineTo(0, 12);
          context.lineTo(-6, 6);
          context.lineTo(-8, -5);
          context.closePath();
          context.fill();
          context.stroke();

          // star inside
          context.fillStyle = '#ffffff';
          context.beginPath();
          context.arc(0, 0, 3, 0, Math.PI * 2);
          context.fill();
        }

        context.restore();
      });
    };

    const drawActiveBall = (context: CanvasRenderingContext2D, w: number, h: number) => {
      const ball = ballRef.current;
      const screenX = w / 2 + ball.x;

      context.save();
      context.translate(screenX, ball.y);

      // shadow underneath
      context.fillStyle = 'rgba(0,0,0,0.3)';
      context.beginPath();
      context.ellipse(0, ball.radius - 2, ball.radius * 0.95, ball.radius * 0.22, 0, 0, Math.PI * 2);
      context.fill();

      // apply rotation
      context.rotate(ball.spin);

      // draw skin layers
      drawBeautifulSkinBall(context, ball.radius);

      context.restore();

      // Shield overlay ripple barrier if active
      if (shieldActive) {
        context.save();
        context.translate(screenX, ball.y);
        context.strokeStyle = 'rgba(56, 189, 248, 0.75)';
        context.lineWidth = 3;
        context.shadowColor = '#38bdf8';
        context.shadowBlur = 12;

        const barrierRadius = ball.radius + 12 + Math.sin(Date.now() * 0.015) * 2;
        context.beginPath();
        context.arc(0, 0, barrierRadius, 0, Math.PI * 2);
        context.stroke();
        context.restore();
      }
    };

    // --- MINI DRAWINGS: STRIKE SECTION RENDER ---
    const getStrikeProjection = (bx: number, by: number, bz: number, width: number, height: number) => {
      const centerX = width / 2;
      const scale = 300 / (300 + bz);

      const goalY = height * 0.28;
      const kickY = height * 0.83;
      const baseY = kickY - (bz * (kickY - goalY) / 100);

      const x2d = centerX + bx * scale;
      const y2d = baseY - (by * scale);
      const prRadius = 18 * scale;

      return { x: x2d, y: y2d, radius: prRadius, scale };
    };

    const drawGoalShootoutScreen = (context: CanvasRenderingContext2D, w: number, h: number) => {
      // 1. Draw stadium dark sky gradients
      const skyGrad = context.createLinearGradient(0, 0, 0, h * 0.28);
      skyGrad.addColorStop(0, '#020617');
      skyGrad.addColorStop(1, '#0f172a');
      context.fillStyle = skyGrad;
      context.fillRect(0, 0, w, h);

      // 2. Draw grass strips static inside shootout frame
      const horizonY = h * 0.28;
      const bottomY = h;
      for (let i = 0; i < 8; i++) {
        context.fillStyle = (i % 2 === 0) ? '#15803d' : '#16a34a';
        context.beginPath();
        const yTop = horizonY + i * ((bottomY - horizonY) / 8);
        const yBottom = horizonY + (i + 1) * ((bottomY - horizonY) / 8);

        const sTop = (yTop - horizonY) / (bottomY - horizonY);
        const sBottom = (yBottom - horizonY) / (bottomY - horizonY);

        context.moveTo(w * 0.18 * (1 - sTop), yTop);
        context.lineTo(w - w * 0.18 * (1 - sTop), yTop);
        context.lineTo(w - w * 0.18 * (1 - sBottom), yBottom);
        context.lineTo(w * 0.18 * (1 - sBottom), yBottom);
        context.fill();
      }

      // Draw Goal structure (same 135 post bounds at bz = 100)
      const postLBase = getStrikeProjection(-135, 0, 100, w, h);
      const postLTop = getStrikeProjection(-135, 95, 100, w, h);
      const postRBase = getStrikeProjection(135, 0, 100, w, h);
      const postRTop = getStrikeProjection(135, 95, 100, w, h);

      // Net lines base back mesh (bz = 112)
      const backLBase = getStrikeProjection(-135, 0, 112, w, h);
      const backLTop = getStrikeProjection(-135, 85, 112, w, h);
      const backRBase = getStrikeProjection(135, 0, 112, w, h);
      const backRTop = getStrikeProjection(135, 85, 112, w, h);

      // draw net grid mesh outline
      context.strokeStyle = 'rgba(255,255,255,0.18)';
      context.lineWidth = 1;
      for (let i = 1; i < 11; i++) {
        const ratio = i / 11;
        context.beginPath();
        // side mesh
        context.moveTo(postLBase.x, postLBase.y - (postLBase.y - postLTop.y) * ratio);
        context.lineTo(backLBase.x, backLBase.y - (backLBase.y - backLTop.y) * ratio);
        context.moveTo(postRBase.x, postRBase.y - (postRBase.y - postRTop.y) * ratio);
        context.lineTo(backRBase.x, backRBase.y - (backRBase.y - backRTop.y) * ratio);

        // back mesh horizontal
        context.moveTo(backLBase.x, backLBase.y - (backLBase.y - backLTop.y) * ratio);
        context.lineTo(backRBase.x, backRBase.y - (backRBase.y - backRTop.y) * ratio);
        context.stroke();
      }

      // white goalposts
      context.strokeStyle = '#ffffff';
      context.lineWidth = 5.5;
      context.lineCap = 'square';
      context.beginPath();
      // left posts up
      context.moveTo(postLBase.x, postLBase.y);
      context.lineTo(postLTop.x, postLTop.y);
      // bar to right post
      context.lineTo(postRTop.x, postRTop.y);
      // down to right post base
      context.lineTo(postRBase.x, postRBase.y);
      context.stroke();

      // Goalkeeper drawing in strike matrix selection
      drawStrikeGoalkeeper(context, w, h);
    };

    const drawStrikeGoalkeeper = (context: CanvasRenderingContext2D, w: number, h: number) => {
      const gk = strikeKeeperRef.current;
      const { x: cX, y: cY, scale } = getStrikeProjection(gk.x, gk.y, 100, w, h);

      const gkW = 48 * scale;
      const gkH = 70 * scale;

      context.save();
      context.translate(cX, cY);

      // Shadow on base lawn
      context.fillStyle = 'rgba(0,0,0,0.36)';
      context.beginPath();
      context.ellipse(0, 0, gkW * 0.9, 8 * scale, 0, 0, Math.PI * 2);
      context.fill();

      // vibrant glowing Neon Yellow-Orange kits
      const outfitKit = '#f97316';
      const skinTone = '#ffedd5';

      let hOffset = -gkH * 0.84;
      let torsoH = gkH * 0.55;
      let torsoW = gkW * 0.6;
      let lArmX = -torsoW * 0.8;
      let lArmY = -torsoH * 0.6;
      let rArmX = torsoW * 0.8;
      let rArmY = -torsoH * 0.6;

      // Handle angle rotation based states
      if (gk.state === 'diving_left') {
        context.rotate(-Math.PI / 5.5);
        lArmX = -torsoW * 1.35;
        lArmY = -torsoH * 0.9;
      } else if (gk.state === 'diving_right') {
        context.rotate(Math.PI / 5.5);
        rArmX = torsoW * 1.35;
        rArmY = -torsoH * 0.9;
      } else if (gk.state === 'saved') {
        lArmY = -torsoH * 1.25;
        rArmY = -torsoH * 1.25;
      }

      // Torso body jersey
      context.fillStyle = outfitKit;
      context.beginPath();
      context.roundRect(-torsoW / 2, -torsoH, torsoW, torsoH, 6 * scale);
      context.fill();

      // shorts
      context.fillStyle = '#0284c7';
      context.fillRect(-torsoW / 2, -torsoH * 0.22, torsoW, torsoH * 0.32);

      // Head
      context.fillStyle = skinTone;
      context.beginPath();
      context.arc(0, hOffset, 12 * scale, 0, Math.PI * 2);
      context.fill();

      // Hair cap
      context.fillStyle = '#475569';
      context.beginPath();
      context.arc(0, hOffset - 2, 11 * scale, Math.PI, 0);
      context.fill();

      // Gloves lines
      context.strokeStyle = outfitKit;
      context.lineWidth = 6 * scale;
      context.lineCap = 'round';

      // left arm gloves
      context.beginPath();
      context.moveTo(-torsoW * 0.45, -torsoH * 0.8);
      context.lineTo(lArmX, lArmY);
      context.stroke();

      context.fillStyle = '#eab308'; // yellows gloves
      context.beginPath();
      context.arc(lArmX, lArmY, 7 * scale, 0, Math.PI * 2);
      context.fill();

      // right arm gloves
      context.beginPath();
      context.moveTo(torsoW * 0.45, -torsoH * 0.8);
      context.lineTo(rArmX, rArmY);
      context.stroke();

      context.beginPath();
      context.arc(rArmX, rArmY, 7 * scale, 0, Math.PI * 2);
      context.fill();

      // Leg posts
      context.strokeStyle = '#0f172a';
      context.lineWidth = 7.5 * scale;
      context.beginPath();
      context.moveTo(-torsoW * 0.3, 0);
      context.lineTo(-torsoW * 0.3, gkH * 0.12);
      context.moveTo(torsoW * 0.3, 0);
      context.lineTo(torsoW * 0.3, gkH * 0.12);
      context.stroke();

      context.restore();
    };

    const drawStrikeBall = (context: CanvasRenderingContext2D, w: number, h: number) => {
      const b = ballRef.current;
      const { x: t2dX, y: t2dY, radius, scale } = getStrikeProjection(b.shootX, b.shootY, b.shootZ, w, h);

      context.save();
      context.translate(t2dX, t2dY);

      // Shadow overlay if above ground height
      if (b.shootY > 18) {
        context.fillStyle = 'rgba(0,0,0,0.22)';
        context.beginPath();
        const sSize = Math.max(0, 26 - b.shootY * 0.25);
        context.ellipse(0, b.shootY * scale, radius * 0.9 * (sSize / 26), radius * 0.22 * (sSize / 26), 0, 0, Math.PI * 2);
        context.fill();
      }

      // Spin rotation
      context.rotate(b.spin);

      // skin drawing standard properties
      drawBeautifulSkinBall(context, radius);

      context.restore();
    };

    // Shared gorgeous vector skin drawer to maintain absolute DRY code quality
    const drawBeautifulSkinBall = (context: CanvasRenderingContext2D, radius: number) => {
      const sphereShader = context.createRadialGradient(
        -radius * 0.3,
        -radius * 0.3,
        radius * 0.15,
        0,
        0,
        radius
      );

      if (stats.activeSkin === 'classic') {
        sphereShader.addColorStop(0, '#ffffff');
        sphereShader.addColorStop(0.85, '#e2e8f0');
        sphereShader.addColorStop(1, '#94a3b8');

        context.fillStyle = sphereShader;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();

        // draw pentagons pent structure mesh
        context.fillStyle = '#1e293b';
        context.beginPath();
        drawPentagonPoly(context, 0, 0, radius * 0.36);
        drawPentagonPoly(context, -radius * 0.8, -radius * 0.3, radius * 0.2, Math.PI * 0.35);
        drawPentagonPoly(context, radius * 0.8, -radius * 0.3, radius * 0.2, -Math.PI * 0.35);
        drawPentagonPoly(context, 0, radius * 0.8, radius * 0.2, Math.PI);
        context.fill();

      } else if (stats.activeSkin === 'fireball') {
        sphereShader.addColorStop(0, '#fef08a');
        sphereShader.addColorStop(0.4, '#f97316');
        sphereShader.addColorStop(1, '#991b1b');

        context.fillStyle = sphereShader;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();

        context.strokeStyle = '#ef4444';
        context.lineWidth = 2.5;
        context.beginPath();
        context.arc(0, 0, radius * 0.6, 0.2, Math.PI - 0.2);
        context.stroke();

      } else if (stats.activeSkin === 'golden') {
        sphereShader.addColorStop(0, '#fef08a');
        sphereShader.addColorStop(0.4, '#fbbf24');
        sphereShader.addColorStop(0.8, '#d97706');
        sphereShader.addColorStop(1, '#78350f');

        context.fillStyle = sphereShader;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = '#fef3c7';
        context.beginPath();
        context.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
        context.fill();

      } else if (stats.activeSkin === 'batik') {
        sphereShader.addColorStop(0, '#fef3c7');
        sphereShader.addColorStop(0.6, '#b45309');
        sphereShader.addColorStop(1, '#78350f');

        context.fillStyle = sphereShader;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();

        // Elegant Batik line art
        context.strokeStyle = '#fef08a';
        context.lineWidth = 1.3;
        context.beginPath();
        context.arc(0, 0, radius * 0.5, 0, Math.PI, true);
        context.stroke();

      } else {
        // disco colorful
        const hue = (Date.now() / 6) % 360;
        sphereShader.addColorStop(0, '#ffffff');
        sphereShader.addColorStop(0.45, `hsl(${hue}, 95%, 60%)`);
        sphereShader.addColorStop(1, `hsl(${(hue + 120) % 360}, 95%, 35%)`);

        context.fillStyle = sphereShader;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();

        context.strokeStyle = 'rgba(255,255,255,0.4)';
        context.lineWidth = 0.8;
        context.beginPath();
        for (let i = -3; i <= 3; i++) {
          const ratio = i / 4;
          const offsetPos = radius * ratio;
          context.moveTo(offsetPos, -Math.sqrt(radius * radius - offsetPos * offsetPos));
          context.lineTo(offsetPos, Math.sqrt(radius * radius - offsetPos * offsetPos));
          context.moveTo(-Math.sqrt(radius * radius - offsetPos * offsetPos), offsetPos);
          context.lineTo(Math.sqrt(radius * radius - offsetPos * offsetPos), offsetPos);
        }
        context.stroke();
      }

      // Shine reflection glint
      context.fillStyle = 'rgba(255,255,255,0.36)';
      context.beginPath();
      context.arc(-radius * 0.35, -radius * 0.35, radius * 0.25, 0, Math.PI * 2);
      context.fill();
    };

    const drawPentagonPoly = (context: CanvasRenderingContext2D, x: number, y: number, r: number, rot = 0) => {
      context.save();
      context.translate(x, y);
      context.rotate(rot);
      context.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const px = r * Math.cos(angle);
        const py = r * Math.sin(angle);
        if (i === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
      context.restore();
    };

    const updateAndDrawParticles = (context: CanvasRenderingContext2D) => {
      const active = particlesRef.current;
      for (let i = active.length - 1; i >= 0; i--) {
        const p = active[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        context.fillStyle = p.color;
        context.beginPath();
        context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        context.fill();

        if (p.life >= p.maxLife) {
          active.splice(i, 1);
        }
      }
    };

    // RUN TIME SCROLLER BOOT
    gameLoop();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [dimensions, passedDefenders, score, speedLevel, shieldActive, stats.activeSkin, coinsEarned, gameState]);


  // CONTROLS FOR MENGGIRING BOLA (DRIBBLING SIDE MOVEMENTS)
  // Simple Swipe side slide drag, or Tap left/right screen sides to lane move
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (gameState === 'tutorial') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if (e.type.startsWith('touch')) {
      const touchEvent = e as React.TouchEvent;
      if (touchEvent.touches.length === 0) return;
      clientX = touchEvent.touches[0].clientX;
      clientY = touchEvent.touches[0].clientY;
    } else {
      const mouseEvent = e as React.MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }

    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    // --- CASE 1: STRIKE PENALTY REGISTER SHOOT ---
    if (gameState === 'strike_matrix') {
      // Swipe Shoot initiation
      // Check proximity to ball projection (at shootZ = 0, bottom screen)
      const centerX = dimensions.width / 2;
      const kickX = centerX + ballRef.current.shootX;
      const kickY = dimensions.height * 0.83; // ground kick

      const dist = Math.sqrt(Math.pow(clickX - kickX, 2) + Math.pow(clickY - kickY, 2));
      if (dist < 75 && ballRef.current.state === 'strike') {
        audioSynth.playSwoosh();
        setIsSwiping(true);
        swipePoints.current = [{ x: clickX, y: clickY, time: Date.now() }];
      }
      return;
    }

    // --- CASE 2: DRIBBLING LANE DIRECTIONAL TOUCH ---
    // Smooth scroll position updates based on touching horizontal location!
    const widthMargin = dimensions.width;
    const neutralOffset = clickX - (widthMargin / 2);

    // Limit lateral boundaries -135 to +135
    const boundedOffset = Math.max(-133, Math.min(133, neutralOffset));

    ballRef.current.targetX = boundedOffset;
    audioSynth.playSwoosh();
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (gameState !== 'strike_matrix' && gameState !== 'dribbling') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if (e.type.startsWith('touch')) {
      const touchEvent = e as React.TouchEvent;
      if (touchEvent.touches.length === 0) return;
      clientX = touchEvent.touches[0].clientX;
      clientY = touchEvent.touches[0].clientY;
    } else {
      const mouseEvent = e as React.MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }

    const moveX = clientX - rect.left;
    const moveY = clientY - rect.top;

    // Strike matrix sweep tracing
    if (gameState === 'strike_matrix' && isSwiping) {
      swipePoints.current.push({ x: moveX, y: moveY, time: Date.now() });
      if (swipePoints.current.length > 30) {
        swipePoints.current.shift();
      }
      return;
    }

    // Drag-sliding follow in dribbler
    if (gameState === 'dribbling') {
      const widthMargin = dimensions.width;
      const neutralOffset = moveX - (widthMargin / 2);
      const boundedOffset = Math.max(-133, Math.min(133, neutralOffset));
      ballRef.current.targetX = boundedOffset;
    }
  };

  const handleTouchEnd = () => {
    if (gameState === 'strike_matrix' && isSwiping) {
      setIsSwiping(false);
      const points = swipePoints.current;
      if (points.length < 3) return;

      const firstPt = points[0];
      const lastPt = points[points.length - 1];
      const duration = lastPt.time - firstPt.time;

      if (duration < 25) return;

      const dx = lastPt.x - firstPt.x;
      const dy = lastPt.y - firstPt.y;

      if (dy >= -15) return; // must flick up

      // loft speed forces
      const vyIntensity = Math.abs(dy) * 0.045;
      const vzIntensity = Math.abs(dy) * 0.040;

      // curving
      let curveIntensity = 0;
      if (points.length >= 5) {
        const midPoint = points[Math.floor(points.length / 2)];
        const projectedMidX = firstPt.x + (lastPt.x - firstPt.x) * 0.5;
        const deviation = midPoint.x - projectedMidX;
        curveIntensity = deviation * 0.045;
      }

      audioSynth.playKick();

      ballRef.current.state = 'flight';
      ballRef.current.shootVX = dx * 0.055;
      ballRef.current.shootVY = Math.min(11, vyIntensity * 1.55);
      ballRef.current.shootVZ = Math.max(3.8, Math.min(9.5, vzIntensity * 1.55));
      ballRef.current.shootCurve = curveIntensity * -0.016;
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between bg-[#080808] text-white relative font-sans">
      {/* Background Detail Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-5 z-0">
        <div className="absolute left-1/4 top-0 bottom-0 w-[1px] bg-white"></div>
        <div className="absolute right-1/4 top-0 bottom-0 w-[1px] bg-white"></div>
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white"></div>
      </div>

      {/* Massive Background Typography */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 select-none z-0 overflow-hidden">
        <h1 className="text-[30vw] font-black italic tracking-tighter leading-none uppercase text-white">DASH</h1>
      </div>

      {/* HUD Top panel */}
      <div className="flex justify-between items-center px-6 py-4 bg-[#080808] border-b border-white/5 z-10 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              audioSynth.playKick();
              onBackToMenu();
            }}
            id="dribble-back-btn"
            className="w-12 h-12 flex items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white active:scale-95 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-500 block leading-none mb-1">
              GAMEPLAY MODE
            </span>
            <span className="font-extrabold italic text-sm tracking-tight text-white uppercase animate-pulse">
              GOCEK DASH
            </span>
          </div>
        </div>

        {/* Energy levels tracker */}
        {gameState === 'dribbling' && (
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 py-1.5 px-4 rounded-3xl text-[11px] text-[#C1FF00] font-black tracking-wider uppercase leading-none">
            <Zap className="w-4 h-4 text-[#C1FF00] animate-pulse" />
            <span>SPEED x{speedLevel.toFixed(1)}</span>
          </div>
        )}

        {/* Audio Toggle */}
        <button
          onClick={toggleSound}
          id="dribble-sound-btn"
          className="w-12 h-12 flex items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white active:scale-95 transition cursor-pointer"
        >
          {soundOn ? <Volume2 className="w-5 h-5 text-[#C1FF00]" /> : <VolumeX className="w-5 h-5 text-neutral-500" />}
        </button>
      </div>

      {/* Main interaction environment panel */}
      <div
        ref={containerRef}
        className="flex-1 relative w-full overflow-hidden select-none touch-none bg-[#080808] flex items-center justify-center"
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Massive Background Typography Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] select-none z-0">
          <h1 className="text-[25vw] font-black italic tracking-tighter leading-none uppercase text-white font-sans text-center">
            {stats.team?.name || 'DRIBBLE'}
          </h1>
        </div>

        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="bg-transparent block relative z-10"
        />

        {/* Active scroller scoreboard indicators */}
        {(gameState === 'dribbling' || gameState === 'strike_matrix') && (
          <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none z-10 leading-none">
            {/* Left scoreboard */}
            <div className="bg-white/5 py-3 px-4 rounded-3xl border border-white/10 flex flex-col justify-between">
              <span className="text-neutral-500 text-[10px] font-bold tracking-wider leading-none mb-1">SCORE</span>
              <span className="text-2xl font-black italic tracking-tighter text-[#C1FF00]">{score}</span>
            </div>

            {/* Right scoreboard */}
            <div className="flex flex-col items-end gap-2">
              <div className="bg-white/5 py-3 px-4 rounded-3xl border border-white/10 flex items-baseline gap-1">
                <span className="text-2xl font-black italic tracking-tighter text-white">{Math.floor(distance)}</span>
                <span className="text-neutral-500 text-[10px] font-bold tracking-wider">METER</span>
              </div>
              {/* Collected Coins items check */}
              <div className="bg-white/5 border border-white/10 py-2 px-3 rounded-2xl text-[#C1FF00] font-bold text-xs flex items-center gap-1.5">
                <Coins className="w-4 h-4 animate-bounce text-[#C1FF00]" />
                <span>+{coinsEarned}</span>
              </div>
            </div>
          </div>
        )}

        {/* Dribble Tutorial */}
        <AnimatePresence>
          {gameState === 'tutorial' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-x-6 bg-[#080808]/95 border-2 border-white/10 p-8 rounded-[32px] text-center shadow-2xl z-20 mx-auto max-w-sm flex flex-col justify-between"
            >
              <div>
                <span className="text-[12px] uppercase tracking-[0.3em] font-bold text-neutral-500 mb-2 block">
                  TUTORIAL
                </span>
                <span className="text-4xl font-black leading-none italic tracking-tighter uppercase text-white mb-4 block">
                  GOCEK HERO
                </span>
                <p className="text-neutral-400 text-xs leading-relaxed mb-6">
                  Sentuh dan geser jari ke kiri-kanan untuk meluncur membawa bola. Hindari tekel defenders, raih koin koin sultan, cetak gol impian di strike zone!
                </p>

                <div className="bg-white/5 p-4 rounded-3xl border border-white/10 mb-6 flex flex-col gap-3 text-left text-xs text-neutral-300">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#C1FF00] shrink-0" />
                    <span>Ambil tameng biru untuk kekebalan tackle defender.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-white/40 shrink-0" />
                    <span>Botol energi biru memberikan dorongan lari turbo.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C1FF00]"></span>
                    <span>Gunakan skin khusus dengan pengganda koin besar!</span>
                  </div>
                </div>
              </div>

              <button
                onClick={startGame}
                id="dribble-start-btn"
                className="w-full bg-[#C1FF00] hover:bg-[#b5f000] text-black font-black italic text-lg tracking-tight uppercase py-4 px-6 rounded-3xl active:scale-95 transition-all cursor-pointer shadow-[0_10px_30px_rgba(193,255,0,0.2)]"
              >
                MULAI MENGGIRING ➜
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FEEDBACK FLOATING NOTIFICATIONS */}
        <AnimatePresence>
          {feedbackText && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6, y: 15 }}
              animate={{ opacity: 1, scale: 1.15, y: -10 }}
              exit={{ opacity: 0, scale: 0.8, y: -30 }}
              className="absolute pointer-events-none z-30 flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-xs rounded-3xl border border-white/10"
            >
              <div className={`font-display font-black text-3xl tracking-tight text-center text-shadow-game text-shadow-neon uppercase leading-none ${feedbackText.color}`}>
                {feedbackText.text}
              </div>
              <div className="text-white text-[11px] font-medium font-display mt-1 tracking-wide bg-slate-950/85 px-2.5 py-1 rounded-full border border-slate-800/80 text-center shadow-lg">
                {feedbackText.sub}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Swipe visual tracer lines inside Strike Matrix state */}
        {gameState === 'strike_matrix' && isSwiping && swipePoints.current.length > 1 && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Hand Swipe pointer indicators */}
            <div className="absolute top-[85%] left-1/2 -translate-x-1/2 font-sans font-bold text-xs text-black bg-[#C1FF00] py-2 px-4 rounded-full animate-bounce">
              GOSOK CEPAT KE ATAS! ⚡
            </div>
          </div>
        )}

        {/* GAME OVER SCREEN STATS REVIEWS */}
        <AnimatePresence>
          {gameState === 'gameover' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-x-6 bg-[#080808]/95 border-2 border-red-500/30 p-8 rounded-[32px] text-center shadow-2xl z-20 mx-auto max-w-sm flex flex-col justify-between"
            >
              <div>
                <span className="text-[12px] uppercase tracking-[0.3em] font-bold text-red-500 mb-2 block">
                  GAME OVER
                </span>
                <span className="text-4xl font-black leading-none italic tracking-tighter uppercase text-white mb-4 block">
                  TERTEKEL!
                </span>
                <p className="text-neutral-500 text-xs mb-6">
                  Pemain lawan berhasil menyapu bolamu dengan tekel keras.
                </p>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center">
                    <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider leading-none mb-1">
                      Jarak Dribbel
                    </span>
                    <span className="text-xl font-black italic tracking-tighter text-white">
                      {Math.floor(distance)} M
                    </span>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center">
                    <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider leading-none mb-1">
                      Koin Sultan
                    </span>
                    <span className="text-2xl font-black italic tracking-tighter text-[#C1FF00]">
                      +{coinsEarned}
                    </span>
                  </div>
                  <div className="bg-[#C1FF00]/10 border border-[#C1FF00]/25 rounded-2xl p-4 flex flex-col items-center col-span-2">
                    <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider leading-none mb-1">
                      Total Skor Akhir
                    </span>
                    <span className="text-3xl font-black italic tracking-tighter text-[#C1FF00]">
                      {score}
                    </span>
                  </div>
                </div>

                {/* High score beat celebration banner */}
                {score >= stats.dribbleHighScore && score > 0 && (
                  <div className="bg-[#C1FF00]/10 text-[#C1FF00] rounded-2xl py-3 px-4 border border-[#C1FF00]/20 text-xs font-bold uppercase tracking-wider mb-6 flex items-center justify-center gap-1.5 animate-pulse">
                    <Trophy className="w-4 h-4 text-[#C1FF00]" /> REKOR BARU TERCIPTA!
                  </div>
                )}

                {/* Statistics record tracker */}
                <div className="flex justify-between items-center text-neutral-400 text-[11px] font-bold uppercase tracking-wider mb-6 pb-4 border-b border-white/5">
                  <span>Rekor Terbaikmu:</span>
                  <span className="text-white font-black italic tracking-tight">
                    {Math.max(stats.dribbleHighScore, score)} PTS
                  </span>
                </div>
              </div>

              {/* Actions callbacks buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={startGame}
                  id="dribble-retry-btn"
                  className="w-full bg-[#C1FF00] hover:bg-[#b5f000] text-black font-black italic text-base tracking-tight uppercase py-4 px-6 rounded-3xl active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_10px_25px_rgba(193,255,0,0.15)]"
                >
                  <RefreshCw className="w-4 h-4 stroke-[3px]" /> COBA LAGI
                </button>
                <button
                  onClick={() => {
                    audioSynth.playKick();
                    onBackToMenu();
                  }}
                  id="dribble-back-menu-btn"
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest py-3 rounded-2xl border border-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  KEMBALI KE MENU UTAMA
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
