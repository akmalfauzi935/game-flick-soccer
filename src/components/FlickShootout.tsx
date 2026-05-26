/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Trophy, RefreshCw, Volume2, VolumeX, ArrowLeft, Wind, Coins } from 'lucide-react';
import { PlayerStats, ShootTarget, GameParticle, Vector2D } from '../types';
import { ALL_SKINS } from '../data/skins';
import audioSynth from '../utils/audio';

interface FlickShootoutProps {
  stats: PlayerStats;
  onUpdateStats: (newStats: Partial<PlayerStats>) => void;
  onBackToMenu: () => void;
}

export default function FlickShootout({ stats, onUpdateStats, onBackToMenu }: FlickShootoutProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sound state
  const [soundOn, setSoundOn] = useState(audioSynth.getSoundEnabled());

  // Game gameplay state
  const [gameState, setGameState] = useState<'tutorial' | 'playing' | 'gameover'>('tutorial');
  const [score, setScore] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [feedbackText, setFeedbackText] = useState<{ text: string; sub: string; color: string } | null>(null);

  // References for game loops
  const requestRef = useRef<number | null>(null);

  // Wind setup: speed (-20 to 20 px/s, representing current drift offset) and label description
  const [wind, setWind] = useState<{ force: number; desc: string; isLeft: boolean }>({ force: 0, desc: 'Tenang', isLeft: false });

  // Load the active skin
  const activeSkinObj = ALL_SKINS.find(s => s.id === stats.activeSkin) || ALL_SKINS[0];

  // Particle list
  const particlesRef = useRef<GameParticle[]>([]);

  // Goalkeeper Position & Stats
  const goalKeeperRef = useRef({
    x: 0, // bx offset, goal is at bz = 100, span goes from -120 to +120
    targetX: 0,
    y: 0, // height
    width: 48,
    height: 70,
    diveTimer: 0,
    state: 'idle' as 'idle' | 'diving_left' | 'diving_right' | 'standing_tall' | 'saved',
    speed: 4.5,
  });

  // Goal targets
  const targetsRef = useRef<ShootTarget[]>([
    { x: -90, y: 55, radius: 22, points: 200, active: true, label: 'POJOK KIRI 🔥' },
    { x: 90, y: 55, radius: 22, points: 200, active: true, label: 'POJOK KANAN 🔥' },
  ]);

  // Ball Physics State
  const ballRef = useRef({
    // 3D coordinates: bx (horizontal offset from center), by (height above ground), bz (depth from 0 to 100)
    bx: 0,
    by: 22, // radius is 22 in canvas perspective
    bz: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    curve: 0, // horizontal spin coefficient applied to vx mid-air
    gravity: 0.16,
    radius: 22,
    state: 'ground' as 'ground' | 'dragging' | 'flight' | 'scored' | 'missed' | 'saved' | 'resetting',
    trailTimer: 0,
    bounces: 0,
    rotation: 0,
  });

  // Screen shake frames tracking
  const [shakeFrames, setShakeFrames] = useState(0);

  // High quality touch tracking
  const swipePoints = useRef<{ x: number; y: number; time: number }[]>([]);
  const [isSwiping, setIsSwiping] = useState(false);

  // Handle resizing dynamically
  const [dimensions, setDimensions] = useState({ width: 380, height: 580 });

  // Sound Toggle handler
  const toggleSound = () => {
    const nextVal = !soundOn;
    setSoundOn(nextVal);
    audioSynth.setSoundEnabled(nextVal);
  };

  // Generate Wind randomly
  const regenerateWind = () => {
    const r = Math.random();
    if (r < 0.25) {
      setWind({ force: 0, desc: 'Tenang 🍃', isLeft: false });
    } else {
      const forceVal = Math.floor(Math.random() * 15) + 3; // 3 to 17
      const left = Math.random() < 0.5;
      const desc = `${left ? '⬅️ Kiri' : '➡️ Kanan'} ${forceVal} km/h`;
      setWind({
        force: left ? -forceVal * 0.11 : forceVal * 0.11,
        desc,
        isLeft: left,
      });
    }
  };

  useEffect(() => {
    regenerateWind();
  }, [score]);

  // Handle ResizeObserver to fit canvas to relative parent width/height
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Keep portrait-oriented Aspect Ratio close to 9:16 bounded
        const calculatedWidth = width;
        const calculatedHeight = height;
        setDimensions({
          width: calculatedWidth,
          height: calculatedHeight,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Update Stats when player gains coins or gets record
  const persistProgress = (addedScore: number, finalCoins: number) => {
    const updatedStats: Partial<PlayerStats> = {
      coins: stats.coins + finalCoins,
    };
    if (addedScore > stats.shootoutHighScore) {
      updatedStats.shootoutHighScore = addedScore;
    }
    onUpdateStats(updatedStats);
  };

  // Sound triggering on game start
  const startGame = () => {
    audioSynth.playWhistle();
    setScore(0);
    setLives(3);
    setCoinsEarned(0);
    setCurrentStreak(0);
    setGameState('playing');
    resetBall();
    // targets
    resetTargets();
  };

  const resetTargets = () => {
    targetsRef.current.forEach(t => {
      t.active = Math.random() > 0.15; // 85% chance to be active
      // slightly offset them
      t.y = 52 + Math.random() * 10;
    });
  };

  const resetBall = () => {
    ballRef.current = {
      bx: 0,
      by: 18,
      bz: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      curve: 0,
      gravity: 0.16,
      radius: 18,
      state: 'ground',
      trailTimer: 0,
      bounces: 0,
      rotation: 0,
    };
    swipePoints.current = [];

    // Reset goalkeeper position to center ground
    goalKeeperRef.current.x = 0;
    goalKeeperRef.current.y = 0;
    goalKeeperRef.current.targetX = 0;
    goalKeeperRef.current.state = 'idle';
  };

  // Display fun feedback banners
  const showFeedback = (text: string, sub: string, color: string = 'text-green-400') => {
    setFeedbackText({ text, sub, color });
    setTimeout(() => {
      setFeedbackText(null);
    }, 1800);
  };

  // Spark Generator
  const spawnExplosion = (x2d: number, y2d: number, color: string, count = 20) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particlesRef.current.push({
        x: x2d,
        y: y2d,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 2), // upward bias
        color: color,
        size: Math.random() * 4 + 2,
        life: 0,
        maxLife: Math.random() * 30 + 30,
        shape: Math.random() > 0.8 ? 'star' : 'circle',
      });
    }
  };

  // Main canvas loop handling physics, math projections & render layout
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localShake = 0;

    const gameLoop = () => {
      // Clear canvas with full visual details
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Apply screen shake (disabled for perfectly smooth gameplay)
      ctx.save();
      if (shakeFrames > 0) {
        setShakeFrames(0); // Instantly settle back to zero with no translation offsets
      }

      // Draw beautiful soccer field and background elements
      drawStadiumBackground(ctx, dimensions.width, dimensions.height);

      // Handle Game Physics & States
      updatePhysics(dimensions.width, dimensions.height);

      // Render goal posts, net, goalkeeper and active target indicators
      drawGoalAndNet(ctx, dimensions.width, dimensions.height);
      drawTargets(ctx, dimensions.width, dimensions.height);
      drawGoalkeeper(ctx, dimensions.width, dimensions.height);

      // Draw trailing particle effects (fire, neon, golden stars, dust)
      updateAndDrawParticles(ctx);

      // Render the ball based on projection mapping
      drawBall(ctx, dimensions.width, dimensions.height);

      // Draw predictive real-time trajectory curve path line
      if (ballRef.current.state === 'dragging' && swipePoints.current.length > 1) {
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

          // Compute exact future physical simulation matching the shootout flight engine
          let simVx = dx * 0.055;
          let simVy = Math.min(11, vyIntensity * 1.5);
          let simVz = Math.max(3.8, Math.min(9.5, vzIntensity * 1.5));
          let simCurve = curveIntensity * -0.016;

          let simBx = ballRef.current.bx;
          let simBy = ballRef.current.by;
          let simBz = ballRef.current.bz;

          const pathPoints: { x: number; y: number }[] = [];

          for (let step = 0; step < 45; step++) {
            simBx += simVx;
            simBy += simVy;
            simBz += simVz;

            simVx += simCurve;
            simVy -= ballRef.current.gravity;
            simBx += wind.force * 0.8;

            if (simBy < ballRef.current.radius && simVy < 0) {
              simBy = ballRef.current.radius;
              simVy = -simVy * 0.5;
            }

            const Pt2d = getProjectionPoints(simBx, simBy, simBz, dimensions.width, dimensions.height);
            pathPoints.push({ x: Pt2d.x, y: Pt2d.y });

            if (simBz >= 101) break;
          }

          // Draw the beautiful neon trajectory dashed line
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = '#C1FF00'; // Sleek Neon Green accent
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

          // Draw terminal target crosshair locking indicator at the goal depth
          if (pathPoints.length > 0) {
            const lastPoint = pathPoints[pathPoints.length - 1];
            ctx.setLineDash([]);
            ctx.lineWidth = 2.5;

            // Outer pulsing target circle
            const rPulse = 18 + Math.sin(Date.now() * 0.015) * 3;
            ctx.strokeStyle = '#C1FF00';
            ctx.fillStyle = 'rgba(193, 255, 0, 0.18)';
            ctx.beginPath();
            ctx.arc(lastPoint.x, lastPoint.y, rPulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Scope reticle crosshair lines
            ctx.beginPath();
            ctx.moveTo(lastPoint.x - rPulse - 5, lastPoint.y);
            ctx.lineTo(lastPoint.x + rPulse + 5, lastPoint.y);
            ctx.moveTo(lastPoint.x, lastPoint.y - rPulse - 5);
            ctx.lineTo(lastPoint.x, lastPoint.y + rPulse + 5);
            ctx.strokeStyle = 'rgba(193, 255, 0, 0.75)';
            ctx.stroke();

            // Center target bullseye dot
            ctx.fillStyle = '#C1FF00';
            ctx.beginPath();
            ctx.arc(lastPoint.x, lastPoint.y, 4.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      } else if (isSwiping && swipePoints.current.length > 1) {
        // Classic finger gesture line backup
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 10;
        ctx.moveTo(swipePoints.current[0].x, swipePoints.current[0].y);
        for (let i = 1; i < swipePoints.current.length; i++) {
          ctx.lineTo(swipePoints.current[i].x, swipePoints.current[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      requestRef.current = requestAnimationFrame(gameLoop);
    };

    // Projection mapping helper
    // 3D -> 2D coords
    const getProjectionPoints = (bx: number, by: number, bz: number, width: number, height: number) => {
      const centerX = width / 2;
      // bz ranges from 0 (shoot spot) to 100 (goal line)
      // Perspective scale factor
      const scale = 300 / (300 + bz);

      // Goal Y position perspective
      const goalY = height * 0.28;
      const kickY = height * 0.83;
      const baseY = kickY - (bz * (kickY - goalY) / 100);

      const x2d = centerX + bx * scale;
      const xRadius = 18 * scale;
      const y2d = baseY - (by * scale);

      return { x: x2d, y: y2d, radius: xRadius, scale };
    };

    const updatePhysics = (width: number, height: number) => {
      const ball = ballRef.current;
      const gk = goalKeeperRef.current;

      // 1. Move Keepers AI
      if (ball.state === 'flight') {
        // Goalkeeper starts to track the ball as it goes past half depth (bz > 40)
        if (ball.bz > 35 && gk.state === 'idle') {
          // Goalie calculates intercept spot
          const interceptX = ball.bx * 0.95;
          gk.targetX = Math.max(-130, Math.min(130, interceptX));

          // Set dive speed and animation type
          const speedMultiplier = Math.min(2.0, 1.0 + (score * 0.1));
          gk.speed = 4.0 * speedMultiplier;

          if (gk.targetX < -25) {
            gk.state = 'diving_left';
          } else if (gk.targetX > 25) {
            gk.state = 'diving_right';
          } else {
            gk.state = 'standing_tall';
          }
        }

        // Keep updating goalie position
        if (gk.state !== 'idle') {
          const diff = gk.targetX - gk.x;
          if (Math.abs(diff) > 2) {
            gk.x += Math.sign(diff) * Math.min(Math.abs(diff), gk.speed);
          }
        }
      }

      // 2. Move Ball
      if (ball.state === 'flight') {
        // Apply velocity
        ball.bx += ball.vx;
        ball.by += ball.vy;
        ball.bz += ball.vz;

        // Apply curve spin
        ball.vx += ball.curve;

        // Apply gravity
        ball.vy -= ball.gravity;

        // Apply wind factor
        ball.bx += wind.force * 0.8;

        // Spin rotation animation
        ball.rotation += 0.25;

        // Emit particles based on active skin
        if (activeSkinObj.particleType !== 'none') {
          ball.trailTimer++;
          if (ball.trailTimer % 1 === 0) {
            const { x: x2d, y: y2d, radius, scale } = getProjectionPoints(ball.bx, ball.by, ball.bz, width, height);

            let pCol = activeSkinObj.color;
            let shape: 'circle' | 'spark' | 'star' = 'circle';
            if (activeSkinObj.particleType === 'fire') {
              pCol = Math.random() > 0.5 ? '#f97316' : '#ef4444';
              shape = 'spark';
            } else if (activeSkinObj.particleType === 'gold') {
              pCol = '#fbbf24';
              shape = 'star';
            } else if (activeSkinObj.particleType === 'neon') {
              pCol = `hsl(${Date.now() % 360}, 100%, 60%)`;
              shape = 'spark';
            }

            particlesRef.current.push({
              x: x2d + (Math.random() - 0.5) * radius * 0.6,
              y: y2d + (Math.random() - 0.5) * radius * 0.6,
              vx: -ball.vx * 0.6 + (Math.random() - 0.5) * 1.5,
              vy: -ball.vy * 0.4 + (Math.random() - 0.5) * 1,
              color: pCol,
              size: (Math.random() * 5 + 2) * scale,
              life: 0,
              maxLife: Math.random() * 20 + 15,
              shape: shape,
            });
          }
        }

        // Bouncing on pitch floor
        if (ball.by < ball.radius && ball.vy < 0) {
          ball.by = ball.radius;
          ball.vy = -ball.vy * 0.5; // bounce attenuation
          ball.bounces++;
          audioSynth.playSave(); // play low impact bounce
        }

        // CHECK COLLISION WITH GOALKEEPER (at bz around 95 - 105)
        if (ball.bz >= 95 && ball.bz <= 104 && ball.state === 'flight') {
          const gkWidthSpan = 52; // physical block box
          const gkHeightSpan = 70;

          // Check if ball falls within Keeper's block shape
          const gkX = gk.x;
          const gkY = gk.y + 25; // center vertical block point

          const distHorizontal = Math.abs(ball.bx - gkX);
          const distVertical = Math.abs(ball.by - gkY);

          if (distHorizontal < gkWidthSpan && distVertical < gkHeightSpan && ball.state === 'flight') {
            // SAVED BY GOALIE!
            ball.state = 'saved';
            gk.state = 'saved';
            // Bounce the ball back in deflection direction
            ball.vz = -ball.vz * 0.5;
            ball.vx = Math.sign(ball.bx - gkX) * 2;
            ball.vy = 2.5;
            audioSynth.playSave();
            setShakeFrames(6);

            // Streak lost
            setCurrentStreak(0);
            loseLife();
            showFeedback('DITANGKIS!', 'Penjaga gawang bergerak cepat!', 'text-amber-500');

            // Save state check back to ground in 1.8 seconds
            setTimeout(() => {
              resetBall();
            }, 1800);
          }
        }

        // CHECK AT COORD TRANSITION FOR GOAL (bz reaches 100)
        // Goal mouth specifications in our 3D coordinates:
        // Left post: bx = -135, Right post: bx = 135
        // Crossbar height: by = 95
        if (ball.bz >= 101 && ball.bz < 112 && ball.state === 'flight') {
          const isBetweenPost = ball.bx >= -134 && ball.bx <= 134;
          const isUnderCrossbar = ball.by <= 94 && ball.by >= 5;

          if (isBetweenPost && isUnderCrossbar) {
            // GOAL SCRIPTERS SUCCESS!
            ball.state = 'scored';
            audioSynth.playGoal();
            setShakeFrames(15);

            // Screen location for explosion particles
            const { x: x2d, y: y2d } = getProjectionPoints(ball.bx, Math.min(85, ball.by), 101, width, height);
            spawnExplosion(x2d, y2d, activeSkinObj.color, 35);

            // Double explosion for corner target hits!
            let scoredPoints = 100;
            let targetLabelHit = '';

            targetsRef.current.forEach(t => {
              if (t.active) {
                const distToTarget = Math.sqrt(Math.pow(ball.bx - t.x, 2) + Math.pow(ball.by - t.y, 2));
                if (distToTarget < t.radius + 15) {
                  scoredPoints = t.points;
                  targetLabelHit = t.label;
                  t.active = false;
                  // golden sparkles explosion
                  spawnExplosion(x2d, y2d, '#f59e0b', 30);
                }
              }
            });

            // Calculate active combo
            const newStreak = currentStreak + 1;
            setCurrentStreak(newStreak);
            if (newStreak > bestStreak) {
              setBestStreak(newStreak);
            }

            // Streak multiplier
            const streakBonus = Math.floor((newStreak - 1) * 25);
            const totalRoundPoints = scoredPoints + streakBonus;

            // Earn Coins calculations (using active skin multiplier!)
            const earnedCoins = Math.floor((scoredPoints / 10) * activeSkinObj.multiplier * (newStreak > 2 ? 1.5 : 1.0));
            setCoinsEarned(p => p + earnedCoins);
            setScore(p => p + totalRoundPoints);

            if (targetLabelHit) {
              showFeedback(targetLabelHit, `+${totalRoundPoints} Poin • +${earnedCoins} Koin 🟡`, 'text-yellow-400 font-extrabold animate-bounce');
            } else {
              const teamName = stats.team?.name || 'TIM KITA';
              showFeedback(newStreak > 2 ? `GOL COMBO x${newStreak}! ⚽` : `GOL UNTUK ${teamName}! ⚽`, `+${totalRoundPoints} Poin • +${earnedCoins} Koin 🟡`, 'text-[#C1FF00] font-black italic tracking-tighter uppercase');
            }

            // Move ball past net slightly and rest
            setTimeout(() => {
              resetBall();
              resetTargets();
            }, 2000);

          } else {
            // MISSED OR HIT POST
            const hitLeftPost = Math.abs(ball.bx - (-135)) < 15 && ball.by <= 100;
            const hitRightPost = Math.abs(ball.bx - 135) < 15 && ball.by <= 100;
            const hitCrossbar = Math.abs(ball.by - 95) < 12 && ball.bx >= -140 && ball.bx <= 140;

            if (hitLeftPost || hitRightPost || hitCrossbar) {
              ball.state = 'missed';
              ball.vz = -ball.vz * 0.3; // deflect slightly outward
              ball.vx = hitLeftPost ? -2 : hitRightPost ? 2 : ball.vx;
              ball.vy = Math.min(-1, -ball.vy * 0.4);
              audioSynth.playSave();
              setShakeFrames(20);
              loseLife();
              setCurrentStreak(0);
              showFeedback('Kena Tiang Gawang! 💥', 'Hampir saja masuk!', 'text-rose-500');
            } else {
              // Missed wide
              ball.state = 'missed';
              audioSynth.playMiss();
              loseLife();
              setCurrentStreak(0);
              showFeedback('Tembakan Melebar 🌪️', 'Kurang akurat!', 'text-rose-400');
            }

            setTimeout(() => {
              resetBall();
            }, 2000);
          }
        }
      }
    };

    const loseLife = () => {
      setLives(p => {
        const next = p - 1;
        if (next <= 0) {
          // Play Game over melody
          setTimeout(() => {
            audioSynth.playGameOver();
            setGameState('gameover');
            // Persist statistical progress
            persistProgress(score, coinsEarned);
          }, 800);
        }
        return next;
      });
    };

    // Particles system update
    const updateAndDrawParticles = (context: CanvasRenderingContext2D) => {
      const active = particlesRef.current;
      for (let i = active.length - 1; i >= 0; i--) {
        const p = active[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        // Draw particle representation
        context.fillStyle = p.color;
        if (p.shape === 'star') {
          // draw nice simple gold star
          context.beginPath();
          context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          context.fill();
        } else if (p.shape === 'spark') {
          // draw flame spark
          context.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        } else {
          // simple circle glow
          context.beginPath();
          context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          context.fill();
        }

        if (p.life >= p.maxLife) {
          active.splice(i, 1);
        }
      }
    };

    // DRAWING RENDER FUNCTIONS
    const drawStadiumBackground = (context: CanvasRenderingContext2D, w: number, h: number) => {
      // Sky gradient
      const skyGrad = context.createLinearGradient(0, 0, 0, h * 0.28);
      skyGrad.addColorStop(0, '#020617'); // Pitch twilight
      skyGrad.addColorStop(1, '#0f172a');
      context.fillStyle = skyGrad;
      context.fillRect(0, 0, w, h * 0.28);

      // Distant stadium floodlights & crowd outlines
      context.fillStyle = 'rgba(30, 41, 59, 0.4)';
      context.beginPath();
      // Draw grandstands rows
      context.moveTo(0, h * 0.28);
      context.lineTo(w * 0.08, h * 0.18);
      context.lineTo(w * 0.92, h * 0.18);
      context.lineTo(w, h * 0.28);
      context.fill();

      // Floodlights flares
      context.fillStyle = 'rgba(253, 253, 253, 0.08)';
      // draw 4 floodlights
      const spots = [w * 0.1, w * 0.35, w * 0.65, w * 0.9];
      spots.forEach(spX => {
        context.beginPath();
        context.arc(spX, h * 0.12, 28, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'rgba(255,255,255,0.7)';
        context.fillRect(spX - 6, h * 0.11, 12, 3);
        context.fillStyle = 'rgba(253, 253, 253, 0.08)';
      });

      // Drawn grass strips
      const horizonY = h * 0.28;
      const bottomY = h;
      const numStrips = 8;
      const stripHeight = (bottomY - horizonY) / numStrips;

      for (let i = 0; i < numStrips; i++) {
        // Shifting shades of lush grass colors
        context.fillStyle = (i % 2 === 0) ? '#15803d' : '#16a34a';
        context.beginPath();
        // Perspective quad trapezoid
        const yTop = horizonY + i * stripHeight;
        const yBottom = horizonY + (i + 1) * stripHeight;

        // Perspective scale ratio
        const scaleTop = (yTop - horizonY) / (bottomY - horizonY);
        const scaleBottom = (yBottom - horizonY) / (bottomY - horizonY);

        const xLeftTop = w * 0.18 * (1 - scaleTop);
        const xRightTop = w - w * 0.18 * (1 - scaleTop);
        const xLeftBottom = w * 0.18 * (1 - scaleBottom);
        const xRightBottom = w - w * 0.18 * (1 - scaleBottom);

        context.moveTo(xLeftTop, yTop);
        context.lineTo(xRightTop, yTop);
        context.lineTo(xRightBottom, yBottom);
        context.lineTo(xLeftBottom, yBottom);
        context.fill();
      }

      // Half Circle Box of penalty area (proj to 2D)
      context.strokeStyle = 'rgba(255,255,255,0.45)';
      context.lineWidth = 3;
      context.beginPath();
      // Draw standard curved penalty line
      const { x: arcX, y: arcY } = getProjectionPoints(0, 0, 45, w, h);
      const { x: leftSideX, y: leftSideY } = getProjectionPoints(-110, 0, 45, w, h);
      const { x: rightSideX, y: rightSideY } = getProjectionPoints(110, 0, 45, w, h);

      context.moveTo(leftSideX, leftSideY);
      context.bezierCurveTo(leftSideX, leftSideY + 30, rightSideX, rightSideY + 30, rightSideX, rightSideY);
      context.stroke();
    };

    const drawGoalAndNet = (context: CanvasRenderingContext2D, w: number, h: number) => {
      // Coordinates of key corners in our projection (bz = 101, x from -135 to 135, y up to 95)
      const postL_Base3D = { x: -135, y: 0, z: 101 };
      const postL_Top3D = { x: -135, y: 95, z: 101 };
      const postR_Base3D = { x: 135, y: 0, z: 101 };
      const postR_Top3D = { x: 135, y: 95, z: 101 };

      const c_L_Base = getProjectionPoints(postL_Base3D.x, postL_Base3D.y, postL_Base3D.z, w, h);
      const c_L_Top = getProjectionPoints(postL_Top3D.x, postL_Top3D.y, postL_Top3D.z, w, h);
      const c_R_Base = getProjectionPoints(postR_Base3D.x, postR_Base3D.y, postR_Base3D.z, w, h);
      const c_R_Top = getProjectionPoints(postR_Top3D.x, postR_Top3D.y, postR_Top3D.z, w, h);

      // Back support lines of nets (drawn inside the pitch frame, further depth bz = 115)
      const netBackL_Base = getProjectionPoints(-135, 0, 114, w, h);
      const netBackL_Top = getProjectionPoints(-135, 87, 114, w, h);
      const netBackR_Base = getProjectionPoints(135, 0, 114, w, h);
      const netBackR_Top = getProjectionPoints(135, 87, 114, w, h);

      // Draw Net Mesh
      context.strokeStyle = 'rgba(241, 245, 249, 0.22)';
      context.lineWidth = 1;

      const horizontalRows = 12;
      const verticalRows = 15;

      // Draw horizontal lines across the back/sides of net
      for (let i = 1; i < horizontalRows; i++) {
        const ratio = i / horizontalRows;
        context.beginPath();
        // Left side mesh row
        const lSideStart = { x: c_L_Base.x, y: c_L_Base.y - (c_L_Base.y - c_L_Top.y) * ratio };
        const lSideEnd = { x: netBackL_Base.x, y: netBackL_Base.y - (netBackL_Base.y - netBackL_Top.y) * ratio };
        context.moveTo(lSideStart.x, lSideStart.y);
        context.lineTo(lSideEnd.x, lSideEnd.y);

        // Right side mesh row
        const rSideStart = { x: c_R_Base.x, y: c_R_Base.y - (c_R_Base.y - c_R_Top.y) * ratio };
        const rSideEnd = { x: netBackR_Base.x, y: netBackR_Base.y - (netBackR_Base.y - netBackR_Top.y) * ratio };
        context.moveTo(rSideStart.x, rSideStart.y);
        context.lineTo(rSideEnd.x, rSideEnd.y);

        // Back mesh row
        context.moveTo(lSideEnd.x, lSideEnd.y);
        context.lineTo(rSideEnd.x, rSideEnd.y);
        context.stroke();
      }

      // Draw vertical lines
      for (let i = 1; i < verticalRows; i++) {
        const ratio = i / verticalRows;
        // Back vertical lines
        context.beginPath();
        const topBX = netBackL_Top.x + (netBackR_Top.x - netBackL_Top.x) * ratio;
        const topBY = netBackL_Top.y + (netBackR_Top.y - netBackL_Top.y) * ratio;
        const bottomBX = netBackL_Base.x + (netBackR_Base.x - netBackL_Base.x) * ratio;
        const bottomBY = netBackL_Base.y + (netBackR_Base.y - netBackR_Base.y) * ratio;

        context.moveTo(topBX, topBY);
        context.lineTo(bottomBX, bottomBY);
        context.stroke();
      }

      // Draw Goalposts (Shiny thick white lines)
      context.strokeStyle = '#ffffff';
      context.lineWidth = 6;
      context.lineCap = 'square';
      context.shadowColor = 'rgba(255, 255, 255, 0.4)';
      context.shadowBlur = 4;

      context.beginPath();
      // Left post base up
      context.moveTo(c_L_Base.x, c_L_Base.y);
      context.lineTo(c_L_Top.x, c_L_Top.y);
      // Crossbars to right post
      context.lineTo(c_R_Top.x, c_R_Top.y);
      // Down to right base
      context.lineTo(c_R_Base.x, c_R_Base.y);
      context.stroke();

      context.shadowBlur = 0; // reset
    };

    const drawTargets = (context: CanvasRenderingContext2D, w: number, h: number) => {
      targetsRef.current.forEach(t => {
        if (!t.active) return;
        const { x: t2dX, y: t2dY, radius } = getProjectionPoints(t.x, t.y, 101, w, h);

        // Rotating target ring
        const pulse = Math.sin(Date.now() * 0.01) * 3;
        const finalRadius = radius + pulse;

        // Outer neon glow ring
        context.strokeStyle = '#fbbf24';
        context.lineWidth = 3.5;
        context.shadowColor = '#f59e0b';
        context.shadowBlur = 10;
        context.beginPath();
        context.arc(t2dX, t2dY, finalRadius, 0, Math.PI * 2);
        context.stroke();

        // Inner circle indicators
        context.fillStyle = 'rgba(251, 191, 36, 0.15)';
        context.beginPath();
        context.arc(t2dX, t2dY, finalRadius, 0, Math.PI * 2);
        context.fill();

        // Bulls-eye Center
        context.fillStyle = '#f59e0b';
        context.beginPath();
        context.arc(t2dX, t2dY, 5, 0, Math.PI * 2);
        context.fill();

        // Score bonus text
        context.fillStyle = '#ffffff';
        context.font = 'bold 9px sans-serif';
        context.textAlign = 'center';
        context.fillText('200', t2dX, t2dY - finalRadius - 4);

        context.shadowBlur = 0; // reset
      });
    };

    const drawGoalkeeper = (context: CanvasRenderingContext2D, w: number, h: number) => {
      const gk = goalKeeperRef.current;
      // Proj goalie height and width
      const { x: cX, y: cY, scale } = getProjectionPoints(gk.x, gk.y, 100, w, h);

      // Scale goalie proportions
      const gkW = gk.width * scale * 1.05;
      const gkH = gk.height * scale * 1.05;

      context.save();
      context.translate(cX, cY);

      // Goalkeeper Shadow on lawn
      context.fillStyle = 'rgba(0,0,0,0.4)';
      context.beginPath();
      context.ellipse(0, 0, gkW * 0.9, 8 * scale, 0, 0, Math.PI * 2);
      context.fill();

      // Goalkeeper drawing: Body parts using beautiful vector sketches
      // Let's decide jersey theme (Bright Magenta/Cyan so it pops!)
      const jerseyCol = '#e11d48'; // vibrant rose/pink jersey
      const skinCol = '#fbcfe8';
      const gloveCol = '#eab308'; // golden yellow gloves!

      let headOffset = -gkH * 0.85;
      let bodyH = gkH * 0.55;
      let bodyW = gkW * 0.6;
      let leftHandX = -bodyW * 0.8;
      let leftHandY = -bodyH * 0.5;
      let rightHandX = bodyW * 0.8;
      let rightHandY = -bodyH * 0.5;

      // React to specific goalkeeper state
      if (gk.state === 'diving_left') {
        context.rotate(-Math.PI / 6);
        leftHandX = -bodyW * 1.3;
        leftHandY = -bodyH * 0.8;
      } else if (gk.state === 'diving_right') {
        context.rotate(Math.PI / 6);
        rightHandX = bodyW * 1.3;
        rightHandY = -bodyH * 0.8;
      } else if (gk.state === 'saved') {
        // block success animation! arms wide open up
        leftHandY = -bodyH * 1.2;
        rightHandY = -bodyH * 1.2;
      }

      // Torso / Jersey
      context.fillStyle = jerseyCol;
      context.beginPath();
      context.roundRect(-bodyW / 2, -bodyH, bodyW, bodyH, 8 * scale);
      context.fill();

      // Jersey Shorts
      context.fillStyle = '#0f172a';
      context.beginPath();
      context.fillRect(-bodyW / 2, -bodyH * 0.2, bodyW, bodyH * 0.3);

      // Head
      context.fillStyle = skinCol;
      context.beginPath();
      context.arc(0, headOffset, 12 * scale, 0, Math.PI * 2);
      context.fill();

      // Hair
      context.fillStyle = '#1e1b4b';
      context.beginPath();
      context.arc(0, headOffset - 3, 11 * scale, Math.PI, 0);
      context.fill();

      // Hands and Gloves (Drawn as lines/caps with yellow circles)
      context.strokeStyle = jerseyCol;
      context.lineWidth = 7 * scale;
      context.lineCap = 'round';

      // Left Arm
      context.beginPath();
      context.moveTo(-bodyW * 0.45, -bodyH * 0.8);
      context.lineTo(leftHandX, leftHandY);
      context.stroke();

      // Left Glove
      context.fillStyle = gloveCol;
      context.beginPath();
      context.arc(leftHandX, leftHandY, 8 * scale, 0, Math.PI * 2);
      context.fill();

      // Right Arm
      context.beginPath();
      context.moveTo(bodyW * 0.45, -bodyH * 0.8);
      context.lineTo(rightHandX, rightHandY);
      context.stroke();

      // Right Glove
      context.fillStyle = gloveCol;
      context.beginPath();
      context.arc(rightHandX, rightHandY, 8 * scale, 0, Math.PI * 2);
      context.fill();

      // Legs
      context.strokeStyle = '#1e293b';
      context.lineWidth = 8 * scale;
      // Left leg
      context.beginPath();
      context.moveTo(-bodyW * 0.3, 0);
      context.lineTo(-bodyW * 0.3, gkH * 0.1);
      context.stroke();
      // Right leg
      context.beginPath();
      context.moveTo(bodyW * 0.3, 0);
      context.lineTo(bodyW * 0.3, gkH * 0.1);
      context.stroke();

      context.restore();
    };

    const drawBall = (context: CanvasRenderingContext2D, w: number, h: number) => {
      const b = ballRef.current;
      const { x: t2dX, y: t2dY, radius, scale } = getProjectionPoints(b.bx, b.by, b.bz, w, h);

      context.save();
      context.translate(t2dX, t2dY);

      // Draw real grass shadow under ball (if above ground)
      if (b.by > b.radius) {
        context.fillStyle = 'rgba(0,0,0,0.3)';
        context.beginPath();
        // shadow shrinks and blurs as ball gets higher
        const shadowBlurSize = Math.max(0, 30 - b.by * 0.3);
        const shadowScale = scale * (1 - (b.by * 0.003));
        context.ellipse(0, b.by * scale, radius * 0.85 * shadowScale, radius * 0.25 * shadowScale, 0, 0, Math.PI * 2);
        context.fill();
      }

      // Ball core rotation rotation
      context.rotate(b.rotation);

      // Sphere shading overlay (radial gradient for 3D depth)
      const grad = context.createRadialGradient(
        -radius * 0.3,
        -radius * 0.3,
        radius * 0.1,
        0,
        0,
        radius
      );

      // Skin specific colors
      if (stats.activeSkin === 'classic') {
        grad.addColorStop(0, '#ffffff'); // pure classic shading
        grad.addColorStop(0.85, '#e2e8f0');
        grad.addColorStop(1, '#94a3b8');

        // Draw classic white ball details
        context.fillStyle = grad;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();

        // Pentagons
        context.fillStyle = '#1e293b';
        context.beginPath();
        // center pentagon
        drawPentagon(context, 0, 0, radius * 0.35);

        // partial peripheral hexagons/pentagons
        drawPentagon(context, -radius * 0.85, -radius * 0.35, radius * 0.2, Math.PI * 0.4);
        drawPentagon(context, radius * 0.85, -radius * 0.35, radius * 0.2, -Math.PI * 0.4);
        drawPentagon(context, 0, radius * 0.8, radius * 0.2, Math.PI);
        context.fill();

      } else if (stats.activeSkin === 'fireball') {
        grad.addColorStop(0, '#fef08a'); // Super heated fireball glow
        grad.addColorStop(0.5, '#f97316');
        grad.addColorStop(1, '#991b1b');

        context.fillStyle = grad;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();

        // draw solar flames lines
        context.strokeStyle = '#ef4444';
        context.lineWidth = 2.5;
        context.beginPath();
        context.moveTo(-radius * 0.5, 0);
        context.quadraticCurveTo(0, radius * 0.4, radius * 0.5, 0);
        context.moveTo(-radius * 0.3, -radius * 0.3);
        context.quadraticCurveTo(0, -radius * 0.1, radius * 0.3, -radius * 0.3);
        context.stroke();

      } else if (stats.activeSkin === 'golden') {
        grad.addColorStop(0, '#fef08a'); // Metallic gold sheen
        grad.addColorStop(0.4, '#fbbf24');
        grad.addColorStop(0.8, '#ca8a04');
        grad.addColorStop(1, '#78350f');

        context.fillStyle = grad;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();

        // Highlight stars
        context.fillStyle = '#fef3c7';
        context.beginPath();
        context.arc(0, 0, radius * 0.22, 0, Math.PI * 2);
        context.fill();

      } else if (stats.activeSkin === 'batik') {
        grad.addColorStop(0, '#fef3c7'); // Elegant cream base
        grad.addColorStop(0.6, '#b45309'); // bronze batik brown
        grad.addColorStop(1, '#78350f');

        context.fillStyle = grad;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();

        // Decorative Batik swirling curves
        context.strokeStyle = '#fef08a';
        context.lineWidth = 1.5;
        context.beginPath();
        // megamendung nested swooshes
        context.arc(0, 0, radius * 0.5, 0, Math.PI, true);
        context.stroke();
        context.beginPath();
        context.arc(-radius * 0.2, radius * 0.1, radius * 0.3, 0, Math.PI * 2);
        context.stroke();

      } else {
        // Rhythm disco: Shifting rainbow hue rotate!
        const shiftHue = (Date.now() / 6) % 360;
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, `hsl(${shiftHue}, 90%, 65%)`);
        grad.addColorStop(1, `hsl(${(shiftHue + 180) % 360}, 90%, 35%)`);

        context.fillStyle = grad;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();

        // Disco grid squares lines
        context.strokeStyle = 'rgba(255,255,255,0.45)';
        context.lineWidth = 1;
        context.beginPath();
        for (let i = -4; i <= 4; i++) {
          const ratio = i / 5;
          const xPos = radius * ratio;
          context.moveTo(xPos, -Math.sqrt(radius * radius - xPos * xPos));
          context.lineTo(xPos, Math.sqrt(radius * radius - xPos * xPos));
          context.moveTo(-Math.sqrt(radius * radius - xPos * xPos), xPos);
          context.lineTo(Math.sqrt(radius * radius - xPos * xPos), xPos);
        }
        context.stroke();
      }

      // Shine reflection glint (gives 3D glossy realism)
      context.fillStyle = 'rgba(255,255,255,0.38)';
      context.beginPath();
      context.arc(-radius * 0.35, -radius * 0.35, radius * 0.25, 0, Math.PI * 2);
      context.fill();

      context.restore();
    };

    // helper to draw micro pentagons for ball skin
    const drawPentagon = (context: CanvasRenderingContext2D, x: number, y: number, r: number, rotation = 0) => {
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.beginPath();
      for (let i = 0; i < 5; i++) {
        const theta = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const px = r * Math.cos(theta);
        const py = r * Math.sin(theta);
        if (i === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
      context.restore();
    };

    // START RUNTIME
    gameLoop();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [dimensions, score, stats.activeSkin, wind.force]);

  // TOUCH / TOUCH GESTURE RECOGNITIONS (SWIPE CONTROLS)
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (gameState !== 'playing') return;
    // Don't register swipe if ball already in flight
    if (ballRef.current.state !== 'ground') return;

    const coords = getEventCoords(e);
    if (!coords) return;

    // Verify distance to the mapped 2D position of ground kickoff ball
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Projected Kick Position is at center horizontally, Y = height * 0.83
    const kickX = dimensions.width / 2;
    const kickY = dimensions.height * 0.83;

    const distToKickOffBall = Math.sqrt(Math.pow(coords.x - kickX, 2) + Math.pow(coords.y - kickY, 2));

    // Allow margin for easier touch on mobile
    if (distToKickOffBall < 75) {
      audioSynth.playSwoosh();
      ballRef.current.state = 'dragging';
      setIsSwiping(true);
      swipePoints.current = [{ x: coords.x, y: coords.y, time: Date.now() }];
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (gameState !== 'playing' || !isSwiping) return;

    const coords = getEventCoords(e);
    if (!coords) return;

    // Appending touch track trace
    swipePoints.current.push({ x: coords.x, y: coords.y, time: Date.now() });

    // Restrict trace size
    if (swipePoints.current.length > 30) {
      swipePoints.current.shift();
    }
  };

  const handleTouchEnd = () => {
    if (gameState !== 'playing' || !isSwiping) return;
    setIsSwiping(false);

    const points = swipePoints.current;
    if (points.length < 3) {
      // Swipe too short, cancel strike
      ballRef.current.state = 'ground';
      return;
    }

    const firstPt = points[0];
    const lastPt = points[points.length - 1];
    const duration = lastPt.time - firstPt.time;

    if (duration < 25) {
      // Too short check, reset
      ballRef.current.state = 'ground';
      return;
    }

    // Swipe calculations
    const dx = lastPt.x - firstPt.x;
    const dy = lastPt.y - firstPt.y; // note: dragging UP yields negative dy

    if (dy >= -15) {
      // Must drag upwards, reset if dragging downwards
      ballRef.current.state = 'ground';
      return;
    }

    // Target loft vectors
    const vyIntensity = Math.abs(dy) * 0.045; // Height lofting
    const vzIntensity = Math.abs(dy) * 0.040; // Depth velocity pushing to goal (bz reaches 100)

    // Side curves calculation (Check curvature bend mid-swipe path!)
    let curveIntensity = 0;
    if (points.length >= 5) {
      const midPoint = points[Math.floor(points.length / 2)];
      // Linear projection on mid ratio
      const projectedMidX = firstPt.x + (lastPt.x - firstPt.x) * 0.5;
      const deviation = midPoint.x - projectedMidX;
      curveIntensity = deviation * 0.045;
    }

    // Pitch & Shoot sound and release
    audioSynth.playKick();

    ballRef.current.state = 'flight';
    ballRef.current.vx = dx * 0.055;
    ballRef.current.vy = Math.min(11, vyIntensity * 1.5);
    ballRef.current.vz = Math.max(3.8, Math.min(9.5, vzIntensity * 1.5));
    ballRef.current.curve = curveIntensity * -0.016; // curve acceleration coefficient matching bend
  };

  const getEventCoords = (e: React.TouchEvent | React.MouseEvent): Vector2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if (e.type.startsWith('touch')) {
      const touchEvent = e as React.TouchEvent;
      if (touchEvent.touches.length === 0) return null;
      clientX = touchEvent.touches[0].clientX;
      clientY = touchEvent.touches[0].clientY;
    } else {
      const mouseEvent = e as React.MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
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
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none z-0 overflow-hidden">
        <h1 className="text-[35vw] font-black italic tracking-tighter leading-none uppercase">GOAL</h1>
      </div>

      {/* Top Navbar */}
      <div className="flex justify-between items-center px-6 py-4 bg-[#080808] border-b border-white/5 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              audioSynth.playKick();
              onBackToMenu();
            }}
            id="back-menu-btn"
            className="w-12 h-12 flex items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-500 block leading-none mb-1">
              GAMEPLAY MODE
            </span>
            <span className="font-extrabold italic text-sm tracking-tight text-white uppercase">
              TENDANGAN BEBAS
            </span>
          </div>
        </div>

        {/* HUD Wind info */}
        <div className="flex items-center gap-1.5 bg-white/5 py-1.5 px-4 rounded-3xl border border-white/10 shrink-0 text-[11px] text-white font-bold uppercase tracking-wider">
          <Wind className="w-4 h-4 text-[#C1FF00] animate-pulse" />
          <span>{wind.desc}</span>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={toggleSound}
          id="sound-toggle-btn"
          className="w-12 h-12 flex items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white active:scale-95 transition cursor-pointer"
        >
          {soundOn ? <Volume2 className="w-5 h-5 text-[#C1FF00]" /> : <VolumeX className="w-5 h-5 text-neutral-500" />}
        </button>
      </div>

      {/* Main Game Interface Sandbox */}
      <div
        ref={containerRef}
        className="flex-1 relative w-full overflow-hidden select-none touch-none bg-[#080808] active:cursor-grabbing flex items-center justify-center"
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
            {stats.team?.name || 'GOAL'}
          </h1>
        </div>

        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="bg-transparent touch-none block relative z-10"
        />

        {/* Dynamic score and lives floating overlays */}
        {gameState === 'playing' && (
          <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none z-10 leading-none">
            {/* Score & Multiplier Streak */}
            <div className="flex flex-col drop-shadow-md">
              <span className="text-[12px] uppercase tracking-[0.3em] font-bold text-neutral-500 mb-1">
                SKOR SEKARANG
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black leading-none italic tracking-tighter text-[#C1FF00]">
                  {score}
                </span>
                {currentStreak > 1 && (
                  <span className="text-xs font-black italic text-black bg-[#C1FF00] py-1 px-2 rounded-full uppercase tracking-wider animate-bounce">
                    x{currentStreak} Combo
                  </span>
                )}
              </div>
            </div>

            {/* Lives and accumulated Coins */}
            <div className="flex flex-col items-end gap-2">
              <span className="text-[12px] uppercase tracking-[0.3em] font-bold text-slate-500 mb-1">
                LIVES & KOIN
              </span>
              {/* Hearts Lives */}
              <div className="flex items-center gap-1.5 bg-white/5 py-2 px-3 rounded-2xl border border-white/10">
                {[1, 2, 3].map(num => (
                  <Heart
                    key={num}
                    className={`w-5 h-5 transition-transform ${
                      num <= lives
                        ? 'text-red-500 fill-red-500 scale-100 animate-pulse'
                        : 'text-neutral-700 fill-neutral-800 scale-90'
                    }`}
                  />
                ))}
              </div>

              {/* Gold Counter */}
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-2xl border border-white/10 bg-white/5 text-[#C1FF00] text-sm font-black italic tracking-tight">
                <Coins className="w-4 h-4 text-[#C1FF00]" />
                <span>+{coinsEarned}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tutorial Splash */}
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
                  FREE KICK
                </span>
                <p className="text-neutral-400 text-xs leading-relaxed mb-6">
                  Usap layar dari arah bola ke gawang untuk melakukan tembakan luar biasa! Lengungkan usapanmu untuk memberi efek putar bola menyilang yang mematikan.
                </p>

                <div className="bg-white/5 p-4 rounded-3xl border border-white/10 mb-6 flex flex-col gap-3 text-left text-xs text-neutral-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C1FF00]"></span>
                    <span>Target pojok memberikan bonus skor berlipat ganda!</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/40"></span>
                    <span>Deru angin akan mengubah jalur laju bola.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span>3 Kesempatan meleset sebelum permainan berakhir.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={startGame}
                id="start-kick-btn"
                className="w-full bg-[#C1FF00] hover:bg-[#b5f000] text-black font-black italic text-lg tracking-tight uppercase py-4 px-6 rounded-3xl active:scale-95 transition-all cursor-pointer shadow-[0_10px_30px_rgba(193,255,0,0.2)]"
              >
                MULAI MENEMBAK
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FEEDBACK CORNER TEXT OVERLAYS */}
        <AnimatePresence>
          {feedbackText && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 15 }}
              animate={{ opacity: 1, scale: 1.1, y: -10 }}
              exit={{ opacity: 0, scale: 0.8, y: -25 }}
              className="absolute pointer-events-none z-30 flex flex-col items-center justify-center"
            >
              <div className={`font-display font-black text-3xl tracking-tight text-center text-shadow-game text-shadow-neon uppercase ${feedbackText.color}`}>
                {feedbackText.text}
              </div>
              <div className="text-white text-xs font-medium font-display mt-1 tracking-wide bg-slate-950/80 px-2.5 py-1 rounded-full border border-slate-800/60 text-center shadow-lg">
                {feedbackText.sub}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GAME OVER CARD SCRIPTER */}
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
                  SELESAI!
                </span>
                <p className="text-neutral-500 text-xs mb-6">
                  Peluang tendangan bebasmu telah habis.
                </p>

                {/* Stats Review row */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center">
                    <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider leading-none mb-1">
                      Skor Akhir
                    </span>
                    <span className="text-2xl font-black italic tracking-tighter text-white">
                      {score}
                    </span>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center">
                    <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider leading-none mb-1">
                      Bonus Koin
                    </span>
                    <span className="text-2xl font-black italic tracking-tighter text-[#C1FF00]">
                      +{coinsEarned}
                    </span>
                  </div>
                </div>

                {/* Record beat celebration */}
                {score >= stats.shootoutHighScore && score > 0 && (
                  <div className="bg-[#C1FF00]/10 text-[#C1FF00] rounded-2xl py-3 px-4 border border-[#C1FF00]/20 text-xs font-bold uppercase tracking-wider mb-6 flex items-center justify-center gap-1.5 animate-pulse">
                    <Trophy className="w-4 h-4" /> REKOR BARU TERCIPTA!
                  </div>
                )}

                {/* Active record statistics tracker */}
                <div className="flex justify-between items-center text-neutral-400 text-[11px] font-bold uppercase tracking-wider mb-6 pb-4 border-b border-white/5">
                  <span>Rekor Terbaikmu:</span>
                  <span className="text-white font-black italic tracking-tight">
                    {Math.max(stats.shootoutHighScore, score)} PTS
                  </span>
                </div>
              </div>

              {/* Call to Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={startGame}
                  id="shootout-retry-btn"
                  className="w-full bg-[#C1FF00] hover:bg-[#b5f000] text-black font-black italic text-base tracking-tight uppercase py-4 px-6 rounded-3xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_10px_25px_rgba(193,255,0,0.15)]"
                >
                  <RefreshCw className="w-4 h-4 stroke-[3px]" /> COBA LAGI
                </button>
                <button
                  onClick={() => {
                    audioSynth.playKick();
                    onBackToMenu();
                  }}
                  id="shootout-quit-btn"
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
