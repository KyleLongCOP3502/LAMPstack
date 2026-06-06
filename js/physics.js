// ─────────────────────────────────────────────────────────
//  js/physics.js
//  SIDEBAR_W must match --sw in styles.css
// ─────────────────────────────────────────────────────────

window.PhysicsLayer = (function () {
  'use strict';

  const SIDEBAR_W = 300;   // sync with CSS --sw
  const R         = 34;    // body radius
  const ZONE_H    = 120;   // filter zone height at bottom of canvas

  /* ── State ────────────────────────────────────────────── */
  let canvas, ctx;
  let engine, world, runner;
  let mouseObj, mc;
  let walls = [];
  let bodies  = {};      // id → { body, contact }
  let zoneSet = new Set();   // ids of bodies frozen in filter zone
  let zoneSlots = {};        // id → slot index

  let dirHeadEl = null;
  let dragging  = false;
  let tick      = 0;

  /* ── Slot geometry ────────────────────────────────────── */
  function zoneY()       { return canvas.height - ZONE_H; }
  function getSlotPos(i) { return { x: 55 + i * 82, y: zoneY() + ZONE_H / 2 }; }
  function assignSlot(id) {
    const used = new Set(Object.values(zoneSlots));
    let s = 0; while (used.has(s)) s++;
    zoneSlots[id] = s;
  }
  function updateDirectory() {
    window.XV_zoneContacts = [...zoneSet]
      .filter(id => bodies[id])
      .map(id => bodies[id].contact);
    if (typeof doSearch === 'function') doSearch();
  }

  /* ── Init ─────────────────────────────────────────────── */
  function init() {
    canvas    = document.getElementById('physicsCanvas');
    dirHeadEl = document.getElementById('dirHead');
    if (!canvas || typeof Matter === 'undefined') { console.warn('PhysicsLayer: missing canvas or Matter.js'); return; }
    ctx = canvas.getContext('2d');

    const M = Matter;
    engine = M.Engine.create({ gravity: { x: 0, y: 0 } });
    world  = engine.world;
    runner = M.Runner.create();
    M.Runner.run(runner, engine);

    /* Mouse constraint — higher stiffness for responsive throws */
    mouseObj = M.Mouse.create(canvas);
    mc = M.MouseConstraint.create(engine, {
      mouse: mouseObj,
      constraint: { stiffness: 0.45, damping: 0.0 },
    });
    M.World.add(world, mc);

    /* Drag events */
    M.Events.on(mc, 'startdrag', function (e) {
      if (e.body && e.body.cd) { dragging = true; }
    });

    M.Events.on(mc, 'enddrag', function (e) {
      dragging = false;
      if (!e.body || !e.body.cd) return;
      const body = e.body;
      const id   = String(body.cd.id);

      /* Just released — allow fast travel for 2 seconds */
      body.justReleased = true;
      setTimeout(() => { if (body) body.justReleased = false; }, 2000);

      /* Determine if shape ended up inside the filter zone */
      if (body.position.y > zoneY() - 10) {
        // Entered the zone
        if (!zoneSet.has(id)) {
          zoneSet.add(id);
          assignSlot(id);
        }
        const pos = getSlotPos(zoneSlots[id]);
        M.Body.setPosition(body, pos);
        M.Body.setVelocity(body, { x: 0, y: 0 });
        M.Body.setAngularVelocity(body, 0);
        updateDirectory();
        if (dirHeadEl) {
          dirHeadEl.classList.add('flash');
          setTimeout(() => dirHeadEl.classList.remove('flash'), 800);
        }
      } else {
        // Outside zone — remove if it was in zone
        if (zoneSet.has(id)) {
          zoneSet.delete(id);
          delete zoneSlots[id];
          // Renumber remaining slots
          const remaining = [...zoneSet].filter(sid => bodies[sid]);
          remaining.forEach((sid, i) => { zoneSlots[sid] = i; });
          updateDirectory();
        }
      }
    });

    /* Per-frame speed control and drift */
    M.Events.on(engine, 'beforeUpdate', function () {
      Object.values(bodies).forEach(({ body }) => {
        const id       = String(body.cd.id);
        const inZone   = zoneSet.has(id);
        const isDragged = body === mc.body;

        /* Zone shapes: keep frozen and snapped to slot */
        if (inZone && !isDragged) {
          M.Body.setVelocity(body, { x: 0, y: 0 });
          M.Body.setAngularVelocity(body, 0);
          if (zoneSlots[id] !== undefined) {
            const pos = getSlotPos(zoneSlots[id]);
            M.Body.setPosition(body, pos);
          }
          return;
        }

        if (isDragged) return; // mouse constraint handles dragged bodies

        /* Soft zone wall: push free bodies back if they approach zone */
        const zy = zoneY();
        if (body.position.y > zy - R - 2 && !inZone) {
          M.Body.setVelocity(body, {
            x: body.velocity.x,
            y: -Math.abs(body.velocity.y || 0.6) * 0.85,
          });
          M.Body.setPosition(body, { x: body.position.x, y: zy - R - 3 });
          /* Steer drift upward away from zone wall */
          body.driftAngle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
          body.driftTimer = 0;
        }

        /* Wall-proximity direction correction — prevents gliding stuck on edges */
        const margin = R + 8;
        const nearLeft  = body.position.x < margin;
        const nearRight = body.position.x > canvas.width - margin;
        const nearTop   = body.position.y < margin;
        const nearBot   = body.position.y > zy - margin;
        if (nearLeft || nearRight || nearTop || nearBot) {
          const sp = Math.hypot(body.velocity.x, body.velocity.y);
          if (sp > 0.05) {
            /* Steer drift to match current (post-bounce) velocity direction */
            body.driftAngle = Math.atan2(body.velocity.y, body.velocity.x);
          } else {
            /* No velocity — point inward from the nearest wall */
            const ax = nearLeft ? 1 : nearRight ? -1 : 0;
            const ay = nearTop  ? 1 : nearBot   ? -1 : 0;
            body.driftAngle = Math.atan2(ay, ax) + (Math.random() - 0.5) * 0.4;
          }
          body.driftTimer = 0;
        }

        /* Drift logic: each body has a persistent drift direction */
        body.driftTimer = (body.driftTimer || 0) + 1;
        if (body.driftTimer >= (body.driftInterval || 300)) {
          /* Gradual direction change — no sudden reversals */
          body.driftAngle += (Math.random() - 0.5) * Math.PI * 0.9;
          body.driftTimer = 0;
        }

        /* Constant gentle force in drift direction */
        M.Body.applyForce(body, body.position, {
          x: Math.cos(body.driftAngle) * 0.000009,
          y: Math.sin(body.driftAngle) * 0.000009,
        });

        /* Speed management */
        const sp = Math.hypot(body.velocity.x, body.velocity.y);
        if (body.justReleased) {
          /* After a throw: only hard cap to prevent explosions */
          if (sp > 28) {
            M.Body.setVelocity(body, {
              x: body.velocity.x * (28 / sp),
              y: body.velocity.y * (28 / sp),
            });
          }
        } else {
          /* Normal floating: gently rein in if too fast */
          if (sp > 1.8) {
            M.Body.setVelocity(body, {
              x: body.velocity.x * 0.97,
              y: body.velocity.y * 0.97,
            });
          }
          /* Nudge if almost stationary */
          if (sp < 0.15) {
            M.Body.setVelocity(body, {
              x: Math.cos(body.driftAngle) * 0.45,
              y: Math.sin(body.driftAngle) * 0.45,
            });
          }
        }
      });
    });

    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    requestAnimationFrame(loop);
  }

  /* ── Canvas sizing ────────────────────────────────────── */
  function sizeCanvas() {
    if (!canvas) return;
    canvas.width  = Math.max(200, window.innerWidth  - SIDEBAR_W);
    canvas.height = Math.max(200, window.innerHeight);
    rebuildWalls();
    /* Clamp ALL free bodies back into the new bounds */
    clampAllBodies();
    /* Re-snap zone shapes */
    zoneSet.forEach(id => {
      if (bodies[id] && zoneSlots[id] !== undefined) {
        Matter.Body.setPosition(bodies[id].body, getSlotPos(zoneSlots[id]));
      }
    });
  }

  function clampAllBodies() {
    const M  = Matter;
    const w  = canvas.width;
    const zy = zoneY();
    Object.values(bodies).forEach(({ body }) => {
      const id = String(body.cd.id);
      if (zoneSet.has(id)) return; // zone bodies managed separately
      const px = body.position.x, py = body.position.y;
      const cx = Math.max(R + 4, Math.min(w  - R - 4, px));
      const cy2 = Math.max(R + 4, Math.min(zy - R - 4, py));
      if (cx !== px || cy2 !== py) {
        M.Body.setPosition(body, { x: cx, y: cy2 });
        /* Reverse the relevant velocity component so the body bounces inward */
        M.Body.setVelocity(body, {
          x: cx !== px ? -body.velocity.x : body.velocity.x,
          y: cy2 !== py ? -body.velocity.y : body.velocity.y,
        });
        /* Update drift angle to point inward */
        body.driftAngle = Math.atan2(cy2 !== py ? (py < R ? 1 : -1) : body.velocity.y,
                                     cx  !== px ? (px < R ? 1 : -1) : body.velocity.x);
        body.driftTimer = 0;
      }
    });
  }

  function rebuildWalls() {
    const M = Matter;
    const w = canvas.width, h = canvas.height, t = 60;
    walls.forEach(b => M.World.remove(world, b));
    const opt = { isStatic: true, restitution: 0.9, friction: 0 };
    walls = [
      M.Bodies.rectangle(w / 2, -t / 2,    w + 200, t, opt),
      M.Bodies.rectangle(w / 2, h + t / 2, w + 200, t, opt),
      M.Bodies.rectangle(-t / 2,    h / 2, t, h + 200, opt),
      M.Bodies.rectangle(w + t / 2, h / 2, t, h + 200, opt),
    ];
    M.World.add(world, walls);
  }

  /* ── Contact management ───────────────────────────────── */
  function syncContacts(contacts) {
    const M   = Matter;
    const ids = new Set(contacts.map(c => String(c.id)));
    Object.keys(bodies).forEach(id => {
      if (!ids.has(id)) {
        M.World.remove(world, bodies[id].body);
        zoneSet.delete(id);
        delete zoneSlots[id];
        delete bodies[id];
      }
    });
    contacts.forEach(c => { if (!bodies[String(c.id)]) addBody(c); });
  }

  function addBody(contact) {
    if (!canvas || !engine) return;
    const id = String(contact.id);
    if (bodies[id]) return;

    const M   = Matter;
    const s   = XV_shapeOf(contact);
    const hue = XV_hueOf(contact);
    const zy  = zoneY();
    const pad = R + 20;
    const x   = pad + Math.random() * Math.max(10, canvas.width  - pad * 2);
    /* Spawn only in the area above the zone */
    const y   = pad + Math.random() * Math.max(10, zy - pad * 2);
    const opt = { restitution: 0.75, frictionAir: 0.002, friction: 0.03 };

    let body;
    switch (s) {
      /* ── Native polygon bodies ─────────────────────── */
      case 'circle':        body = M.Bodies.circle(x, y, R, opt); break;
      case 'triangle':      body = M.Bodies.polygon(x, y, 3, R*1.1, opt); break;
      case 'pentagon':      body = M.Bodies.polygon(x, y, 5, R, opt); break;
      case 'hexagon':       body = M.Bodies.polygon(x, y, 6, R, opt); break;
      case 'octagon':       body = M.Bodies.polygon(x, y, 8, R, opt); break;
      case 'decagon':       body = M.Bodies.polygon(x, y, 10, R, opt); break;
      case 'star6':         body = M.Bodies.polygon(x, y, 6, R, opt); break;
      case 'shield':        body = M.Bodies.polygon(x, y, 6, R, opt); break;
      case 'house':         body = M.Bodies.polygon(x, y, 5, R, opt); break;
      case 'kite':          body = M.Bodies.polygon(x, y, 4, R, opt); break;
      /* ── Rectangle bodies ──────────────────────────── */
      case 'square':
        body = M.Bodies.rectangle(x, y, R*1.6, R*1.6, opt);
        M.Body.setAngle(body, (Math.random()-0.5)*0.5);
        break;
      case 'diamond':
        body = M.Bodies.rectangle(x, y, R*1.5, R*1.5, opt);
        M.Body.setAngle(body, Math.PI/4);
        break;
      case 'trapezoid':     body = M.Bodies.rectangle(x, y, R*1.7, R*1.4, opt); break;
      case 'parallelogram': body = M.Bodies.rectangle(x, y, R*1.7, R*1.4, opt); break;
      case 'tag':           body = M.Bodies.rectangle(x, y, R*1.8, R*1.4, opt); break;
      /* ── Cross compound body ───────────────────────── */
      case 'cross': {
        const v1 = M.Bodies.rectangle(x, y, R*0.55, R*2.0);
        const v2 = M.Bodies.rectangle(x, y, R*2.0, R*0.55);
        body = M.Body.create({ parts: [v1, v2], ...opt });
        break;
      }
      /* ── Spinning star5 ────────────────────────────── */
      case 'star5':
        body = M.Bodies.circle(x, y, R, opt);
        M.Body.setAngularVelocity(body, (Math.random()<0.5?1:-1)*0.022);
        break;
      /* ── Circle-physics for everything else ────────── */
      default:
        body = M.Bodies.circle(x, y, R, opt);
        break;
    }

    /* Persistent drift properties — smooth gliding */
    body.driftAngle    = Math.random() * Math.PI * 2;
    body.driftTimer    = Math.floor(Math.random() * 300); // stagger so they don't turn together
    body.driftInterval = 260 + Math.floor(Math.random() * 200); // 4-8 sec between direction shifts

    body.cd        = contact;
    body.hue       = hue;
    body.shapeType = s;
    body.initials  = ((contact.firstName[0] || '') + (contact.lastName[0] || '')).toUpperCase();

    /* Initial velocity — glide, not vibrate */
    M.Body.setVelocity(body, {
      x: Math.cos(body.driftAngle) * 0.7,
      y: Math.sin(body.driftAngle) * 0.7,
    });

    M.World.add(world, body);
    bodies[id] = { body, contact };
  }

  /* ── Render loop ──────────────────────────────────────── */
  function loop() {
    requestAnimationFrame(loop);
    if (!ctx || !canvas || canvas.width < 10) return;
    tick++;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawZone();

    Object.values(bodies).forEach(({ body }) => drawBody(body));

    /* Name labels for zone shapes */
    zoneSet.forEach(id => {
      if (!bodies[id]) return;
      const { body } = bodies[id];
      ctx.save();
      ctx.fillStyle = `hsl(${body.hue},80%,72%)`;
      ctx.font = '500 9px Figtree,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(body.cd.firstName, body.position.x, body.position.y + R + 4);
      ctx.restore();
    });
  }

  /* ── Filter zone visual ───────────────────────────────── */
  function drawZone() {
    const zy = zoneY();

    /* Background */
    ctx.fillStyle = 'rgba(8,8,10,0.88)';
    ctx.fillRect(0, zy, canvas.width, ZONE_H);

    /* Top yellow border */
    ctx.fillStyle = `rgba(245,197,24,${dragging ? 0.7 : 0.45})`;
    ctx.fillRect(0, zy, canvas.width, 2);

    /* Label */
    ctx.fillStyle = 'rgba(245,197,24,0.5)';
    ctx.font = '600 9px Figtree,sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('FILTER ZONE', 12, zy + 7);

    /* Empty hint */
    if (zoneSet.size === 0) {
      ctx.fillStyle = 'rgba(245,197,24,0.2)';
      ctx.font = 'italic 11px Figtree,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('drag contact shapes here to filter the directory', canvas.width / 2, zy + ZONE_H / 2 + 4);
    }

    /* Slot outlines (dashed circles for visual guidance) */
    if (dragging) {
      for (let i = 0; i < Math.min(8, Math.floor(canvas.width / 82)); i++) {
        if (zoneSlots && Object.values(zoneSlots).includes(i)) continue; // occupied
        const pos = getSlotPos(i);
        ctx.save();
        ctx.strokeStyle = 'rgba(245,197,24,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
  }

  /* ── Body drawing ─────────────────────────────────────── */
  function drawBody(body) {
    const s      = body.shapeType;
    const hue    = body.hue;
    const drag   = mc && mc.body === body;
    const inZone = zoneSet.has(String(body.cd.id));
    const fa     = drag || inZone ? 0.44 : 0.16;
    const sa     = drag || inZone ? 1.00 : 0.72;
    const lw     = drag || inZone ? 3    : 1.8;
    const shAlp  = drag ? 0.7 : (inZone ? 0.4 : 0.2);
    const shBlr  = drag ? 26  : (inZone ? 16  : 10);

    ctx.save();
    ctx.shadowColor = `hsla(${hue},80%,65%,${shAlp})`;
    ctx.shadowBlur  = shBlr;
    ctx.fillStyle   = `hsla(${hue},70%,52%,${fa})`;
    ctx.strokeStyle = `hsla(${hue},80%,65%,${sa})`;
    ctx.lineWidth   = lw;

    /* Shapes where we draw the native Matter.js polygon vertices */
    const vertShapes = ['triangle','pentagon','hexagon','octagon','decagon'];

    if (vertShapes.includes(s)) {
      const v = body.vertices;
      ctx.beginPath();
      ctx.moveTo(v[0].x, v[0].y);
      for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else {
      /* All others: translate to body centre, rotate, draw at origin */
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);
      const R2 = body.circleRadius || R;

      switch (s) {
        case 'circle':
          ctx.beginPath(); ctx.arc(0,0,R2,0,Math.PI*2);
          ctx.fill(); ctx.stroke(); break;

        case 'square':
          ctx.beginPath(); ctx.rect(-R*0.82,-R*0.82,R*1.64,R*1.64);
          ctx.fill(); ctx.stroke(); break;

        case 'diamond':
          ctx.beginPath(); ctx.rect(-R*0.78,-R*0.78,R*1.56,R*1.56);
          ctx.fill(); ctx.stroke(); break;

        /* Stars */
        case 'star3': starPath(ctx,0,0,R,R*0.32,3); ctx.fill(); ctx.stroke(); break;
        case 'star4': starPath(ctx,0,0,R,R*0.33,4); ctx.fill(); ctx.stroke(); break;
        case 'star5': starPath(ctx,0,0,R,R*0.42,5); ctx.fill(); ctx.stroke(); break;
        case 'star6': starPath(ctx,0,0,R,R*0.50,6); ctx.fill(); ctx.stroke(); break;
        case 'star8': starPath(ctx,0,0,R,R*0.40,8); ctx.fill(); ctx.stroke(); break;

        /* Directional */
        case 'arrow':   arrowPath(ctx,0,0,R);       ctx.fill(); ctx.stroke(); break;

        /* Quadrilaterals */
        case 'kite':          kitePath(ctx,0,0,R);         ctx.fill(); ctx.stroke(); break;
        case 'trapezoid':     trapPath(ctx,0,0,R);         ctx.fill(); ctx.stroke(); break;
        case 'parallelogram': parallelPath(ctx,0,0,R);     ctx.fill(); ctx.stroke(); break;

        /* Architectural */
        case 'house':  housePath(ctx,0,0,R);        ctx.fill(); ctx.stroke(); break;
        case 'cross':  crossPath(ctx,0,0,R);        ctx.fill(); ctx.stroke(); break;
        case 'shield': shieldPath(ctx,0,0,R);       ctx.fill(); ctx.stroke(); break;

        /* Organic */
        case 'teardrop':   teardropPath(ctx,0,0,R2); ctx.fill(); ctx.stroke(); break;
        case 'leaf':       leafPath(ctx,0,0,R2);     ctx.fill(); ctx.stroke(); break;
        case 'egg':
          ctx.beginPath(); ctx.ellipse(0, R*0.1, R*0.76, R, 0, 0, Math.PI*2);
          ctx.fill(); ctx.stroke(); break;
        case 'fan':    fanPath(ctx,0,0,R2);          ctx.fill(); ctx.stroke(); break;

        /* Misc */
        case 'tag':       tagPath(ctx,0,0,R);        ctx.fill(); ctx.stroke(); break;

        default:
          ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2);
          ctx.fill(); ctx.stroke(); break;
      }
    }

    ctx.restore();

    /* Initials — always upright */
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.fillStyle  = `hsl(${hue},85%,78%)`;
    const fs = body.initials.length > 1 ? 11 : 13;
    ctx.font = `700 ${fs}px 'Syne',sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(body.initials, body.position.x, body.position.y);
    ctx.restore();
  }

  /* ── Path helpers (all at origin cx,cy, radius r) ─────── */
  function polyAtOrigin(ctx, n, r) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = -Math.PI/2 + (Math.PI*2/n)*i;
      i===0 ? ctx.moveTo(r*Math.cos(a),r*Math.sin(a)) : ctx.lineTo(r*Math.cos(a),r*Math.sin(a));
    }
    ctx.closePath();
  }
  function starPath(ctx,cx,cy,ro,ri,n) {
    ctx.beginPath();
    for (let i=0;i<n*2;i++) {
      const a=-Math.PI/2+(Math.PI/n)*i, r=i%2===0?ro:ri;
      i===0?ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));
    }
    ctx.closePath();
  }
  function arrowPath(ctx,cx,cy,r) {
    ctx.beginPath();
    ctx.moveTo(cx,       cy-r);
    ctx.lineTo(cx+r*0.85,cy);
    ctx.lineTo(cx+r*0.4, cy);
    ctx.lineTo(cx+r*0.4, cy+r);
    ctx.lineTo(cx-r*0.4, cy+r);
    ctx.lineTo(cx-r*0.4, cy);
    ctx.lineTo(cx-r*0.85,cy);
    ctx.closePath();
  }
  function chevronPath(ctx,cx,cy,r) {
    ctx.beginPath();
    ctx.moveTo(cx,        cy-r);
    ctx.lineTo(cx+r,      cy+r*0.6);
    ctx.lineTo(cx+r*0.48, cy+r*0.6);
    ctx.lineTo(cx,        cy-r*0.22);
    ctx.lineTo(cx-r*0.48, cy+r*0.6);
    ctx.lineTo(cx-r,      cy+r*0.6);
    ctx.closePath();
  }
  function boltPath(ctx,cx,cy,r) {
    ctx.beginPath();
    ctx.moveTo(cx+r*0.28,  cy-r);
    ctx.lineTo(cx-r*0.40,  cy+r*0.06);
    ctx.lineTo(cx+r*0.10,  cy+r*0.06);
    ctx.lineTo(cx-r*0.28,  cy+r);
    ctx.lineTo(cx+r*0.40,  cy-r*0.06);
    ctx.lineTo(cx-r*0.10,  cy-r*0.06);
    ctx.closePath();
  }
  function kitePath(ctx,cx,cy,r) {
    // kite: wide across at ~25% from top, narrow base
    ctx.beginPath();
    ctx.moveTo(cx,      cy-r);
    ctx.lineTo(cx+r*0.88, cy+r*0.22);
    ctx.lineTo(cx,      cy+r);
    ctx.lineTo(cx-r*0.88, cy+r*0.22);
    ctx.closePath();
  }
  function trapPath(ctx,cx,cy,r) {
    ctx.beginPath();
    ctx.moveTo(cx-r*0.48, cy-r);
    ctx.lineTo(cx+r*0.48, cy-r);
    ctx.lineTo(cx+r,      cy+r);
    ctx.lineTo(cx-r,      cy+r);
    ctx.closePath();
  }
  function parallelPath(ctx,cx,cy,r) {
    ctx.beginPath();
    ctx.moveTo(cx-r*0.70, cy-r);
    ctx.lineTo(cx+r,      cy-r);
    ctx.lineTo(cx+r*0.70, cy+r);
    ctx.lineTo(cx-r,      cy+r);
    ctx.closePath();
  }
  function housePath(ctx,cx,cy,r) {
    ctx.beginPath();
    ctx.moveTo(cx,       cy-r);
    ctx.lineTo(cx+r*0.9, cy-r*0.08);
    ctx.lineTo(cx+r*0.9, cy+r);
    ctx.lineTo(cx-r*0.9, cy+r);
    ctx.lineTo(cx-r*0.9, cy-r*0.08);
    ctx.closePath();
  }
  function crossPath(ctx,cx,cy,r) {
    const a=r*0.34;
    ctx.beginPath();
    ctx.moveTo(cx-a,cy-r);ctx.lineTo(cx+a,cy-r);ctx.lineTo(cx+a,cy-a);ctx.lineTo(cx+r,cy-a);
    ctx.lineTo(cx+r,cy+a);ctx.lineTo(cx+a,cy+a);ctx.lineTo(cx+a,cy+r);ctx.lineTo(cx-a,cy+r);
    ctx.lineTo(cx-a,cy+a);ctx.lineTo(cx-r,cy+a);ctx.lineTo(cx-r,cy-a);ctx.lineTo(cx-a,cy-a);
    ctx.closePath();
  }
  function shieldPath(ctx,cx,cy,r) {
    ctx.beginPath();
    ctx.moveTo(cx-r*0.76,cy-r*0.78);ctx.lineTo(cx+r*0.76,cy-r*0.78);
    ctx.quadraticCurveTo(cx+r,cy-r*0.45,cx+r,cy-r*0.05);
    ctx.lineTo(cx,cy+r);ctx.lineTo(cx-r,cy-r*0.05);
    ctx.quadraticCurveTo(cx-r,cy-r*0.45,cx-r*0.76,cy-r*0.78);
    ctx.closePath();
  }
  function teardropPath(ctx,cx,cy,r) {
    // round top, pointed bottom
    ctx.beginPath();
    ctx.moveTo(cx, cy+r);
    ctx.bezierCurveTo(cx-r*0.88, cy+r*0.35, cx-r*0.88, cy-r*0.65, cx, cy-r);
    ctx.bezierCurveTo(cx+r*0.88, cy-r*0.65, cx+r*0.88, cy+r*0.35, cx, cy+r);
    ctx.closePath();
  }
  function leafPath(ctx,cx,cy,r) {
    // lens / eye — both ends pointed
    ctx.beginPath();
    ctx.moveTo(cx, cy-r);
    ctx.quadraticCurveTo(cx+r*0.9, cy, cx, cy+r);
    ctx.quadraticCurveTo(cx-r*0.9, cy, cx, cy-r);
    ctx.closePath();
  }

  function fanPath(ctx,cx,cy,r) {
    // Sector pointing UP. Arc centre shifted DOWN by centroid distance
    // so the visual centroid lands on (cx,cy).
    const ha = Math.PI*0.55; // half-angle ≈ 99°
    const dc = 2*r*Math.sin(ha)/(3*ha); // ≈ 0.381 r
    ctx.beginPath();
    ctx.moveTo(cx, cy+dc);  // tip (below centroid)
    ctx.arc(cx, cy+dc, r, -Math.PI/2-ha, -Math.PI/2+ha);
    ctx.closePath();
  }
  function tagPath(ctx,cx,cy,r) {
    ctx.beginPath();
    ctx.moveTo(cx-r,      cy-r*0.65);
    ctx.lineTo(cx+r*0.55, cy-r*0.65);
    ctx.lineTo(cx+r,      cy);
    ctx.lineTo(cx+r*0.55, cy+r*0.65);
    ctx.lineTo(cx-r,      cy+r*0.65);
    ctx.closePath();
  }
  function rightTriPath(ctx,cx,cy,r) {
    // right angle at bottom-left
    ctx.beginPath();
    ctx.moveTo(cx-r, cy+r);
    ctx.lineTo(cx-r, cy-r);
    ctx.lineTo(cx+r, cy+r);
    ctx.closePath();
  }
  function wideTriPath(ctx,cx,cy,r) {
    // wide flat equilateral
    ctx.beginPath();
    ctx.moveTo(cx,    cy-r*0.5);
    ctx.lineTo(cx+r,  cy+r*0.7);
    ctx.lineTo(cx-r,  cy+r*0.7);
    ctx.closePath();
  }

  return { init, syncContacts, addBody };

})();
