// =====================================================
// utils/shipSystem.js
// =====================================================

const {
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { createCanvas, loadImage } = require("canvas");
const sharp = require("sharp");
const e = require("../utils/emojis");

// =====================================================
// AYARLAR
// =====================================================

const SHIP_BANNER =
  "BURAYA KENDİ SUNUCUNUZUN BANNERİNIN LINKİNİ YAPISTIRIN (PNG, 2048px)";

const WIDTH = 1000;
const HEIGHT = 500;
const AVATAR_SIZE = 180;
const HEART_SIZE = 76;

// Dekor: [x, y, boyut, saydamlık]
const MINI_HEARTS = [
  [185, 88, 8, 0.85],
  [260, 105, 5, 0.65],
  [740, 103, 6, 0.7],
  [818, 87, 8, 0.88]
];

// İpler: [başX, başY, ...bezier]
const ROPES = [
  [110, 78, 250, 120, 355, 55, 425, 108],
  [575, 108, 650, 55, 755, 120, 890, 78]
];

// Yorumlar: [üstSınır, metin] — sınırı aşan skor son satırı alır
const COMMENTS = [
  [10, "Bu ilişki başlamadan bitti."],
  [20, "Bunların yan yana gelmesi hata."],
  [30, "Hiç umut yok gibi..."],
  [40, "Olmayacak bu iş."],
  [50, "Bir şeyler var ama çok az."],
  [60, "Hmm... bir ihtimal var."],
  [70, "Yakışıyorsunuz."],
  [80, "Aşk kokusu geliyor."],
  [90, "Bunlar kesin bir şey yaşıyor."],
  [95, "Düğün hazırlıkları başlasın."],
  [99, "DAVETİYEYİ NE ZAMAN ATIYORSUNUZ?"],
  [100, "SUNUCU DÜĞÜNÜ BAŞLADI! ❤️"]
];

// =====================================================
// SKOR
// Her kullanımda rastgele; ard arda aynı yüzde gelmez.
// =====================================================

let lastScore = null;

function getShipScore() {
  let score;
  do {
    score = Math.floor(Math.random() * 101);
  } while (score === lastScore);

  lastScore = score;
  return score;
}

function getShipComment(score) {
  return COMMENTS.find(([max]) => score <= max)[1];
}

// =====================================================
// EMOJİ  <:isim:id> / <a:isim:id>
// =====================================================

function emojiData(value) {
  const match = String(value ?? "").match(/^<(a?):([^:]+):(\d+)>$/);
  if (!match) return null;

  return { animated: match[1] === "a", name: match[2], id: match[3] };
}

// =====================================================
// BANNER  (her format -> PNG, tek sefer indirilir)
// =====================================================

let bannerPromise = null;

async function fetchBanner(guild) {
  const urls = [SHIP_BANNER, guild?.bannerURL?.({ extension: "webp", size: 2048, forceStatic: true })]
    .filter(url => url && !url.includes("BURAYA_BANNER_LINKINI_YAPISTIR"));

  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const type = response.headers.get("content-type") || "";

      if (!response.ok || !type.startsWith("image/")) {
        console.log(`[SHIP] Banner atlandı (${response.status} ${type})`);
        continue;
      }

      const png = await sharp(Buffer.from(await response.arrayBuffer())).png().toBuffer();
      console.log("[SHIP] Banner hazır.");

      return await loadImage(png);
    } catch (err) {
      console.log("[SHIP] Banner işlenemedi:", err.message);
    }
  }

  return null;
}

async function loadBanner(guild) {
  bannerPromise ??= fetchBanner(guild);

  const banner = await bannerPromise;
  if (!banner) bannerPromise = null; // başarısızsa sonraki ship yeniden dener

  return banner;
}

// =====================================================
// ÇİZİM YARDIMCILARI
// =====================================================

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function heartPath(ctx, size) {
  ctx.beginPath();
  ctx.moveTo(0, size * 0.8);
  ctx.bezierCurveTo(-size * 1.1, size * 0.1, -size * 0.9, -size * 0.9, 0, -size * 0.25);
  ctx.bezierCurveTo(size * 0.9, -size * 0.9, size * 1.1, size * 0.1, 0, size * 0.8);
  ctx.closePath();
}

// =====================================================
// KALP DOLULUĞU
//
// Yüzde, yükseklik değil gerçek kalp ALANI üzerinden hesaplanır:
// %25 -> yaklaşık çeyrek, %50 -> yarım, %100 -> tamamen dolu.
// Satır alanları boyut başına bir kez hesaplanıp saklanır.
// =====================================================

const heartRows = new Map();

function getHeartRows(size) {
  if (heartRows.has(size)) return heartRows.get(size);

  const padding = Math.ceil(size * 1.35);
  const side = padding * 2;

  const ctx = createCanvas(side, side).getContext("2d");
  ctx.translate(padding, padding);
  heartPath(ctx, size);
  ctx.fill();

  const pixels = ctx.getImageData(0, 0, side, side).data;
  const rows = new Array(side).fill(0);
  let total = 0;

  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      if (pixels[(y * side + x) * 4 + 3] > 20) rows[y]++;
    }
    total += rows[y];
  }

  const data = { rows, total, side, padding };
  heartRows.set(size, data);

  return data;
}

// Doluluğun başladığı yerel y koordinatı (kalbin merkezi = 0)
function getHeartFillTop(size, score) {
  const { rows, total, side, padding } = getHeartRows(size);

  if (score >= 100) return -padding;

  const wanted = total * (score / 100);
  let area = 0;

  for (let y = side - 1; y >= 0; y--) {
    area += rows[y];
    if (area >= wanted) return y - padding;
  }

  return side - padding;
}

function drawHeart(ctx, x, y, size, score) {
  ctx.save();
  ctx.translate(x, y);

  // Boş kalp
  heartPath(ctx, size);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fill();

  // Alan oranlı doluluk
  if (score > 0) {
    ctx.save();
    heartPath(ctx, size);
    ctx.clip();

    const bottom = size * 1.5;
    const fillTop = getHeartFillTop(size, score);

    const gradient = ctx.createLinearGradient(0, -bottom, 0, bottom);
    gradient.addColorStop(0, "#ff9eb2");
    gradient.addColorStop(0.45, "#ff4d6d");
    gradient.addColorStop(1, "#c9184a");

    ctx.fillStyle = gradient;
    ctx.fillRect(-bottom, fillTop, size * 3, bottom - fillTop + 5);
    ctx.restore();
  }

  // Çerçeve
  heartPath(ctx, size);
  ctx.strokeStyle = "rgba(255,255,255,0.38)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Işık lekesi
  if (score >= 20) {
    ctx.beginPath();
    ctx.arc(-size * 0.25, -size * 0.2, size * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fill();
  }

  // %100 parlaması
  if (score >= 100) {
    heartPath(ctx, size);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 5;
    ctx.shadowColor = "#ff4d6d";
    ctx.shadowBlur = 28;
    ctx.stroke();
  }

  ctx.restore();
}

function drawMiniHeart(ctx, x, y, size, opacity) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);

  heartPath(ctx, size);
  ctx.fillStyle = "#ff6b81";
  ctx.fill();

  ctx.restore();
}

async function drawAvatar(ctx, member, x, y, size, angle) {
  const avatar = await loadImage(member.displayAvatarURL({ extension: "png", size: 512 }));

  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate(angle);

  // Polaroid çerçeve
  ctx.shadowColor = "rgba(0,0,0,0.38)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 10;

  roundedRect(ctx, -size / 2 - 18, -size / 2 - 18, size + 36, size + 36, 18);
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  // Avatar
  roundedRect(ctx, -size / 2, -size / 2, size, size, 14);
  ctx.clip();
  ctx.drawImage(avatar, -size / 2, -size / 2, size, size);

  ctx.restore();
}

function shortName(text, max = 17) {
  if (!text) return "Bilinmiyor";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

// =====================================================
// SHIP GÖRSELİ
// =====================================================

async function createShipImage({ guild, user1, user2 }) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Arka plan
  const banner = await loadBanner(guild);

  if (banner) {
    const scale = Math.max(WIDTH / banner.width, HEIGHT / banner.height);
    const w = banner.width * scale;
    const h = banner.height * scale;

    ctx.drawImage(banner, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
  } else {
    const fallback = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    fallback.addColorStop(0, "#181a27");
    fallback.addColorStop(1, "#54233e");
    ctx.fillStyle = fallback;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Karartma
  ctx.fillStyle = "rgba(8,7,14,0.48)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Cam kart
  roundedRect(ctx, 24, 24, WIDTH - 48, HEIGHT - 48, 30);
  ctx.fillStyle = "rgba(15,13,24,0.30)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // İpler
  ctx.strokeStyle = "rgba(255,255,255,0.34)";
  ctx.lineWidth = 3;

  for (const [x, y, ...curve] of ROPES) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(...curve);
    ctx.stroke();
  }

  for (const heart of MINI_HEARTS) drawMiniHeart(ctx, ...heart);

  // Avatarlar + kalp
  const score = getShipScore();

  await drawAvatar(ctx, user1, 125, 138, AVATAR_SIZE, -0.075);
  await drawAvatar(ctx, user2, 695, 138, AVATAR_SIZE, 0.075);

  drawHeart(ctx, 500, 205, HEART_SIZE, score);

  // Yüzde
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 31px Arial";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 8;
  ctx.fillText(`%${score}`, 500, 205);

  // İsimler
  ctx.font = "bold 25px Arial";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.fillText(shortName(user1.displayName), 215, 352);
  ctx.fillText(shortName(user2.displayName), 785, 352);
  ctx.shadowBlur = 0;

  drawMiniHeart(ctx, 500, 343, 9, 1);

  // Yorum kutusu
  roundedRect(ctx, 120, 397, 760, 62, 20);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.stroke();

  const comment = getShipComment(score);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 21px Arial";
  ctx.fillText(comment, 500, 428);

  // Başlık
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "bold 17px Arial";
  ctx.fillText("BİZ SHIP", 500, 70);

  return {
    file: new AttachmentBuilder(canvas.toBuffer("image/png"), { name: "ship.png" }),
    components: [buildButtons(user1, user2)],
    score,
    comment
  };
}

// =====================================================
// BUTONLAR
// =====================================================

function buildButtons(user1, user2) {
  const make = (action, label, style, emoji) => {
    const button = new ButtonBuilder()
      .setCustomId(`ship_${action}:${user1.id}:${user2.id}`)
      .setLabel(label)
      .setStyle(style);

    const parsed = emojiData(emoji);
    if (parsed) {
      try {
        button.setEmoji(parsed);
      } catch (err) {
        console.log("[SHIP] Buton emoji eklenemedi:", err.message);
      }
    }

    return button;
  };

  return new ActionRowBuilder().addComponents(
    make("like", "Beğen", ButtonStyle.Secondary, e?.begeni),
    make("again", "Yeniden", ButtonStyle.Primary, e?.yeniden)
  );
}

// =====================================================
// EXPORT
// =====================================================

module.exports = { createShipImage, getShipScore, getShipComment };
