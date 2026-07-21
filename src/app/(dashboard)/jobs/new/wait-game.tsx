"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

const COLORS = {
  bg: "#07090d",
  ground: "rgba(255,255,255,0.15)",
  player: "#3f6ee9",
  obstacle: "#f5f7fa",
  text: "#9aa3b2",
};

function RunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ctx = context;

    const width = canvas.width;
    const height = canvas.height;
    const groundY = height - 20;

    const player = { x: 36, y: 0, w: 26, h: 26, vy: 0 };
    let obstacles: { x: number; w: number; h: number }[] = [];
    let speed = 4;
    let frame = 0;
    let score = 0;
    let alive = true;
    let raf = 0;

    function reset() {
      player.y = groundY - player.h;
      player.vy = 0;
      obstacles = [];
      speed = 4;
      frame = 0;
      score = 0;
    }
    reset();

    function jump() {
      if (player.y >= groundY - player.h) {
        player.vy = -10.5;
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    }
    function onPointer(e: PointerEvent) {
      e.preventDefault();
      jump();
    }

    window.addEventListener("keydown", onKey);
    canvas.addEventListener("pointerdown", onPointer);

    function loop() {
      if (!alive) return;
      frame++;
      score++;

      player.vy += 0.6;
      player.y += player.vy;
      if (player.y >= groundY - player.h) {
        player.y = groundY - player.h;
        player.vy = 0;
      }

      const spawnEvery = Math.max(38, 70 - Math.floor(speed * 2));
      if (frame % spawnEvery === 0) {
        obstacles.push({ x: width + 10, w: 12 + Math.random() * 12, h: 18 + Math.random() * 22 });
      }
      obstacles.forEach((o) => (o.x -= speed));
      obstacles = obstacles.filter((o) => o.x + o.w > 0);

      if (frame % 300 === 0) speed += 0.5;

      for (const o of obstacles) {
        const oy = groundY - o.h;
        if (
          player.x < o.x + o.w &&
          player.x + player.w > o.x &&
          player.y < oy + o.h &&
          player.y + player.h > oy
        ) {
          reset();
          break;
        }
      }

      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = COLORS.ground;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 0.5);
      ctx.lineTo(width, groundY + 0.5);
      ctx.stroke();

      ctx.fillStyle = COLORS.player;
      ctx.beginPath();
      ctx.roundRect(player.x, player.y, player.w, player.h, 6);
      ctx.fill();
      ctx.fillStyle = "#f5f7fa";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("RA", player.x + player.w / 2, player.y + player.h / 2 + 1);

      ctx.fillStyle = COLORS.obstacle;
      obstacles.forEach((o) => ctx.fillRect(o.x, groundY - o.h, o.w, o.h));

      ctx.fillStyle = COLORS.text;
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Score ${Math.floor(score / 10)}`, width - 8, 16);

      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={110}
      className="cursor-pointer touch-none rounded-md border border-border"
    />
  );
}

export function SubmitWaitOverlay() {
  const { pending } = useFormStatus();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  if (!pending) return null;

  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">
        Parsing the job description
        {!reducedMotion && " — press Space or tap to jump"}
      </p>
      {reducedMotion ? null : <RunnerGame />}
    </div>
  );
}
