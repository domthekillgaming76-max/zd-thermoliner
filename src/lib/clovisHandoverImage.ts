export interface ClovisHandoverInput {
  driverName: string;
  vehicleLabel: string;
  contractRef: string;
  photoUrl?: string | null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Impossible de charger l'image : ${src}`));
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function generateClovisHandoverImage(input: ClovisHandoverInput): Promise<string> {
  const W = 960;
  const H = 640;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponible');
  const context: CanvasRenderingContext2D = ctx;

  try {
    const bg = await loadImage('/clovis/agency-keys.png');
    context.drawImage(bg, 0, 0, W, H);
  } catch {
    const gradient = context.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, '#78350f');
    gradient.addColorStop(0.5, '#1c1917');
    gradient.addColorStop(1, '#0c0a09');
    context.fillStyle = gradient;
    context.fillRect(0, 0, W, H);
  }

  context.fillStyle = 'rgba(0, 0, 0, 0.62)';
  context.fillRect(0, 0, W, H);

  context.fillStyle = 'rgba(245, 158, 11, 0.18)';
  context.fillRect(0, 0, W, 6);

  context.fillStyle = '#fbbf24';
  context.font = 'bold 13px system-ui, Segoe UI, sans-serif';
  context.textAlign = 'center';
  context.fillText('CLOVIS LOCATION — Z&D THERMOLINER', W / 2, 42);

  context.fillStyle = '#ffffff';
  context.font = 'bold 42px system-ui, Segoe UI, sans-serif';
  context.fillText('REMISE DES CLÉS', W / 2, 92);

  const cardX = 72;
  const cardY = 130;
  const cardW = W - 144;
  const cardH = 340;
  drawRoundedRect(context, cardX, cardY, cardW, cardH, 20);
  context.fillStyle = 'rgba(12, 10, 9, 0.82)';
  context.fill();
  context.strokeStyle = 'rgba(245, 158, 11, 0.45)';
  context.lineWidth = 2;
  context.stroke();

  if (input.photoUrl) {
    try {
      const vehicle = await loadImage(input.photoUrl);
      const imgW = 280;
      const imgH = 170;
      const imgX = cardX + cardW - imgW - 28;
      const imgY = cardY + 28;
      drawRoundedRect(context, imgX, imgY, imgW, imgH, 12);
      context.save();
      context.clip();
      context.drawImage(vehicle, imgX, imgY, imgW, imgH);
      context.restore();
      context.strokeStyle = 'rgba(255,255,255,0.15)';
      context.lineWidth = 1;
      drawRoundedRect(context, imgX, imgY, imgW, imgH, 12);
      context.stroke();
    } catch {
      /* ignore vehicle photo load failure */
    }
  }

  const textX = cardX + 32;
  let lineY = cardY + 52;
  const lineGap = 54;

  function drawLabel(label: string, value: string) {
    context.textAlign = 'left';
    context.fillStyle = 'rgba(255,255,255,0.45)';
    context.font = '600 11px system-ui, Segoe UI, sans-serif';
    context.fillText(label.toUpperCase(), textX, lineY);
    context.fillStyle = '#ffffff';
    context.font = 'bold 22px system-ui, Segoe UI, sans-serif';
    context.fillText(value, textX, lineY + 28);
    lineY += lineGap;
  }

  drawLabel('Locataire', input.driverName);
  drawLabel('Véhicule', input.vehicleLabel);
  drawLabel('Contrat', input.contractRef);

  const dateStr = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
  drawLabel('Date de remise', dateStr);

  context.textAlign = 'center';
  context.fillStyle = '#fde68a';
  context.font = 'italic 20px Georgia, serif';
  context.fillText('Clovis vous remercie pour votre location', W / 2, H - 78);

  context.fillStyle = 'rgba(255,255,255,0.35)';
  context.font = '12px system-ui, Segoe UI, sans-serif';
  context.fillText('Prélèvement journalier sur le compte entreprise Z&D Thermoliner', W / 2, H - 48);

  return canvas.toDataURL('image/png');
}

export function downloadClovisHandoverImage(dataUrl: string, contractRef: string): void {
  const safeRef = contractRef.replace(/[^a-zA-Z0-9-]/g, '');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `clovis-remise-cles-${safeRef}.png`;
  link.click();
}
