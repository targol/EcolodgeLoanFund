import { toPersianDigits } from "./jalali";

export interface LotteryVideoParams {
  fundName: string;
  monthName: string;
  candidates: { id: string; name: string }[];
  winnerName: string;
  winnerId: string;
  amountStr: string;
  dateStr: string;
  loanTypeStr?: string;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
}

export async function generateLotteryVideo(
  params: LotteryVideoParams,
  onProgress?: (percent: number) => void
): Promise<{ videoBlob: Blob; videoUrl: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      const width = 720;
      const height = 720;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("امکان دسترسی به کانتکست گرافیکی مرورگر وجود ندارد.");
      }

      // Check MediaRecorder support
      let mimeType = "video/webm;codecs=vp9";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/mp4";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = ""; // default
      }

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 2500000 } : undefined);
      const recordedChunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunks, { type: mimeType || "video/webm" });
        const videoUrl = URL.createObjectURL(finalBlob);
        const fileName = `lottery_${params.monthName.replace(/\s+/g, "_")}.webm`;
        resolve({ videoBlob: finalBlob, videoUrl, fileName });
      };

      recorder.start();

      // Confetti generation
      const confettiColors = ["#f59e0b", "#10b981", "#38bdf8", "#ec4899", "#fbbf24", "#6366f1", "#ffffff"];
      const confettiList: ConfettiParticle[] = [];
      for (let i = 0; i < 90; i++) {
        confettiList.push({
          x: Math.random() * width,
          y: Math.random() * -height,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 4 + 3,
          size: Math.random() * 8 + 4,
          color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
          rotation: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 10
        });
      }

      const fps = 30;
      const totalFrames = fps * 5; // 5 seconds total animation
      let currentFrame = 0;
      const candidatesList = params.candidates.length > 0 ? params.candidates.map(c => c.name) : [params.winnerName];

      // Drawing function
      const renderFrame = () => {
        const progress = currentFrame / totalFrames; // 0.0 to 1.0
        if (onProgress) {
          onProgress(Math.min(100, Math.round(progress * 100)));
        }

        // 1. Background gradient
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#042f2e");
        bgGrad.addColorStop(0.5, "#0f172a");
        bgGrad.addColorStop(1, "#022c22");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // 2. Gold Border Frame
        ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
        ctx.lineWidth = 4;
        ctx.strokeRect(24, 24, width - 48, height - 48);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(32, 32, width - 64, height - 64);

        // Corner accents
        const cornerLen = 28;
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 4;
        // Top-left
        ctx.beginPath(); ctx.moveTo(24, 24 + cornerLen); ctx.lineTo(24, 24); ctx.lineTo(24 + cornerLen, 24); ctx.stroke();
        // Top-right
        ctx.beginPath(); ctx.moveTo(width - 24 - cornerLen, 24); ctx.lineTo(width - 24, 24); ctx.lineTo(width - 24, 24 + cornerLen); ctx.stroke();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(24, height - 24 - cornerLen); ctx.lineTo(24, height - 24); ctx.lineTo(24 + cornerLen, height - 24); ctx.stroke();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(width - 24 - cornerLen, height - 24); ctx.lineTo(width - 24, height - 24); ctx.lineTo(width - 24, height - 24 - cornerLen); ctx.stroke();

        // 3. Header Section
        ctx.textAlign = "center";
        ctx.direction = "rtl";

        // Fund Name Badge
        ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
        ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
        ctx.lineWidth = 1.5;
        roundRect(ctx, width / 2 - 160, 50, 320, 38, 19, true, true);

        ctx.font = "bold 16px 'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif";
        ctx.fillStyle = "#34d399";
        ctx.fillText(`🏛️ صندوق قرض‌الحسنه ${params.fundName}`, width / 2, 75);

        // Main Title
        ctx.font = "900 28px 'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`قرعه‌کشی تسهیلات ماه ${params.monthName}`, width / 2, 125);

        // Subtitle / Loan type
        ctx.font = "bold 15px 'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(params.loanTypeStr || "تخصیص وام قرض‌الحسنه ماهانه", width / 2, 155);

        // Check if we are in SPINNING PHASE (< 3.2s) or WINNER REVEAL PHASE (>= 3.2s)
        const spinDuration = 3.2; // seconds
        const isSpinning = (currentFrame / fps) < spinDuration;

        if (isSpinning) {
          // --- SPINNING PHASE ---
          const spinProgress = (currentFrame / fps) / spinDuration; // 0 to 1

          // Roulette Box Container
          const boxX = 70;
          const boxY = 200;
          const boxW = width - 140;
          const boxH = 340;

          // Outer Glow box
          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 3;
          roundRect(ctx, boxX, boxY, boxW, boxH, 20, true, true);

          // Center Selection Target highlight
          const targetY = boxY + boxH / 2 - 40;
          const targetH = 80;
          ctx.fillStyle = "rgba(245, 158, 11, 0.18)";
          ctx.strokeStyle = "rgba(245, 158, 11, 0.9)";
          ctx.lineWidth = 2;
          roundRect(ctx, boxX + 10, targetY, boxW - 20, targetH, 12, true, true);

          // Side Indicators (Lasers)
          ctx.fillStyle = "#f59e0b";
          // Left arrow
          ctx.beginPath();
          ctx.moveTo(boxX + 24, targetY + targetH / 2);
          ctx.lineTo(boxX + 10, targetY + targetH / 2 - 14);
          ctx.lineTo(boxX + 10, targetY + targetH / 2 + 14);
          ctx.closePath();
          ctx.fill();

          // Right arrow
          ctx.beginPath();
          ctx.moveTo(boxX + boxW - 24, targetY + targetH / 2);
          ctx.lineTo(boxX + boxW - 10, targetY + targetH / 2 - 14);
          ctx.lineTo(boxX + boxW - 10, targetY + targetH / 2 + 14);
          ctx.closePath();
          ctx.fill();

          // Clip to slot box
          ctx.save();
          ctx.beginPath();
          roundRect(ctx, boxX + 4, boxY + 4, boxW - 8, boxH - 8, 16, false, false);
          ctx.clip();

          // Calculate slot item offset with easing deceleration
          const itemHeight = 70;
          // Non-linear easing for smooth slowdown
          const easedOffset = Math.pow(spinProgress, 0.6) * (candidatesList.length * 12 + 0.5) * itemHeight;
          const centerY = boxY + boxH / 2;

          for (let i = -4; i <= 4; i++) {
            const rawIndex = Math.floor((easedOffset / itemHeight) + i);
            const nameIndex = ((rawIndex % candidatesList.length) + candidatesList.length) % candidatesList.length;
            const name = candidatesList[nameIndex];
            const itemY = centerY + (i * itemHeight) - (easedOffset % itemHeight);

            const distFromCenter = Math.abs(itemY - centerY);
            const alpha = Math.max(0.15, 1 - distFromCenter / (boxH / 1.8));

            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            if (distFromCenter < 35) {
              ctx.font = "bold 32px 'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif";
              ctx.fillStyle = "#fef08a";
            } else {
              ctx.font = "bold 22px 'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif";
            }
            ctx.fillText(name, width / 2, itemY + 10);
          }

          ctx.restore();

          // Bottom prompt
          ctx.font = "bold 16px 'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif";
          ctx.fillStyle = "#38bdf8";
          ctx.fillText("⚡ در حال چرخش و انتخاب تصادفی عضو برنده...", width / 2, 600);

          // Amount badge
          ctx.font = "bold 15px 'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif";
          ctx.fillStyle = "#94a3b8";
          ctx.fillText(`مبلغ وام این دوره: ${params.amountStr}`, width / 2, 640);

        } else {
          // --- WINNER REVEAL & CELEBRATION PHASE ---
          const revealTime = (currentFrame / fps) - spinDuration; // 0 to 1.8s
          const popScale = Math.min(1.0, revealTime * 3);

          // Render rotating rays behind winner
          ctx.save();
          ctx.translate(width / 2, 280);
          const angle = revealTime * 1.5;
          ctx.rotate(angle);
          for (let r = 0; r < 12; r++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, 360, (r * Math.PI) / 6, (r * Math.PI) / 6 + Math.PI / 18);
            ctx.closePath();
            ctx.fillStyle = "rgba(245, 158, 11, 0.08)";
            ctx.fill();
          }
          ctx.restore();

          // Winner Display Box
          const cardX = 60;
          const cardY = 190;
          const cardW = width - 120;
          const cardH = 390;

          // Glowing Card
          ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 4;
          roundRect(ctx, cardX, cardY, cardW, cardH, 24, true, true);

          // Inner gold banner
          ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
          roundRect(ctx, cardX + 16, cardY + 16, cardW - 32, 50, 14, true, false);

          ctx.font = "900 18px 'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif";
          ctx.fillStyle = "#fbbf24";
          ctx.fillText("🎉 برنده خوش‌شانس این دوره 🎉", width / 2, cardY + 48);

          // Trophy Emoji / Icon
          ctx.font = "56px sans-serif";
          ctx.fillText("🏆", width / 2, cardY + 130);

          // Winner Name (Large & Vibrant)
          ctx.font = "900 38px 'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "rgba(245, 158, 11, 0.8)";
          ctx.shadowBlur = 15;
          ctx.fillText(params.winnerName, width / 2, cardY + 195);
          ctx.shadowBlur = 0; // reset shadow

          // Amount Box inside card
          ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
          ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
          ctx.lineWidth = 1.5;
          roundRect(ctx, cardX + 40, cardY + 230, cardW - 80, 85, 16, true, true);

          ctx.font = "bold 15px 'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif";
          ctx.fillStyle = "#6ee7b7";
          ctx.fillText("مبلغ تسهیلات واریزی:", width / 2, cardY + 262);

          ctx.font = "900 24px 'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.fillText(params.amountStr, width / 2, cardY + 295);

          // Draw Date & Congratulations
          ctx.font = "bold 14px 'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif";
          ctx.fillStyle = "#cbd5e1";
          ctx.fillText(`تاریخ برگزاری: ${params.dateStr} | صمیمانه تبریک می‌گوییم! ✨`, width / 2, cardY + 355);

          // Animated Confetti fluttering
          confettiList.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.vRot;

            if (p.y > height) {
              p.y = -20;
              p.x = Math.random() * width;
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
          });

          // Bottom congratulations bar
          ctx.font = "bold 15px 'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif";
          ctx.fillStyle = "#34d399";
          ctx.fillText("✨ با آرزوی برکت و بهترین‌ها برای برنده گرامی 🙏", width / 2, 630);
        }

        currentFrame++;

        if (currentFrame < totalFrames) {
          requestAnimationFrame(renderFrame);
        } else {
          // Finish recording
          setTimeout(() => {
            try {
              recorder.stop();
            } catch (err) {
              console.error("Error stopping recorder", err);
            }
          }, 200);
        }
      };

      // Helper function to draw rounded rectangles
      function roundRect(
        c: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
        fill: boolean,
        stroke: boolean
      ) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
        if (fill) c.fill();
        if (stroke) c.stroke();
      }

      // Start rendering loop
      renderFrame();

    } catch (err) {
      reject(err);
    }
  });
}
