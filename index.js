const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const TOKEN = process.env.BOT_TOKEN || '8265273246:AAGIvj04Qe-DrWrM_CF5rIPvX57V7S4dEDQ';
const ADMIN_ID = 7326526945;
const DB_FILE = './database.json';
const DOWNLOAD_FILE = './download.json';
const KEYS_FILE = './keys.txt';
const bot = new TelegramBot(TOKEN, { polling: true });

// ─── DATABASE ───────────────────────────────────────────
function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
      console.log('⚠️ database.json rusak, membuat ulang...');
      return {};
    }
  }
  console.log('📁 database.json tidak ditemukan, membuat baru...');
  return {};
}

function saveDB() {
  if (fs.existsSync(DB_FILE)) {
    fs.copyFileSync(DB_FILE, './database.backup.json');
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(userDatabase, null, 2));
}

const userDatabase = loadDB();

// ─── KEYS.TXT ────────────────────────────────────────────
function ensureKeysFile() {
  if (!fs.existsSync(KEYS_FILE)) {
    fs.writeFileSync(KEYS_FILE, '');
    console.log('📁 keys.txt tidak ditemukan, membuat baru...');
  }
}

function loadKeys() {
  ensureKeysFile();
  const content = fs.readFileSync(KEYS_FILE, 'utf8');
  return content
    .split('\n')
    .map(k => k.trim())
    .filter(k => k.length > 0);
}

function saveKey(key) {
  ensureKeysFile();
  const existing = loadKeys();
  if (!existing.includes(key)) {
    fs.appendFileSync(KEYS_FILE, key + '\n');
    console.log(`🔑 Key baru disimpan ke keys.txt: ${key}`);
  }
}

// ─── NOTIFY SUBSCRIBERS STORAGE ─────────────────────────
const NOTIFY_FILE = './notify.json';

function loadNotifyList() {
  if (fs.existsSync(NOTIFY_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(NOTIFY_FILE, 'utf8'));
      return data.subscribers || [];
    } catch { return []; }
  }
  return [];
}

function saveNotifyList() {
  fs.writeFileSync(NOTIFY_FILE, JSON.stringify({ subscribers: notifyList }, null, 2));
}

let notifyList = loadNotifyList();

// ─── DRIP STATUS STORAGE ────────────────────────────────
const STATUS_FILE = './dripstatus.json';

function loadDripStatus() {
  if (fs.existsSync(STATUS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
      return data.status || 'safe';
    } catch { return 'safe'; }
  }
  return 'safe';
}

function saveDripStatus(status) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify({ status }, null, 2));
}

let currentDripStatus = loadDripStatus();

function getDripStatusInfo(status) {
  const statusMap = {
    patch: {
      icon: '🔴',
      label: 'PATCH DETECTED',
      title: 'DRIP PATCH NOW',
      lines: [
        `├ 🔴 Status: *PATCH*`,
        `├ 🚫 Login is currently *DISABLED*`,
        `├ ⛔ DO NOT attempt to LOGIN right now`,
        `└ 🕐 Drip Servers are being Patched`,
        ``,
        `💀 *Drip — DONT LOGIN*`,
        `Forced logins during patch = instant ban risk.`,
        `We will resolve this as soon as possible.`,
      ],
    },
    maintenance: {
      icon: '🟡',
      label: 'UNDER MAINTENANCE',
      title: 'SCHEDULED MAINTENANCE',
      lines: [
        `├ 🟡 Status: *MAINTENANCE MODE*`,
        `├ 🌐 We are testing the latest version`,
        `├ ⏳ Updates are being pushed live`,
        `└ 📡 Server sync in progress`,
        ``,
        `🛠️ *Drip — Stay tune!*`,
        `We're optimizing the system for you.`,
        `Wait for green before you play in.`,
      ],
    },
    safe: {
      icon: '🟢',
      label: 'ALL CLEAR',
      title: 'SAFE TO PLAY',
      lines: [
        `├ 🛡️ Anti-Cheat Bypass: *🟢 ON || SAFE*`,
        `├ 🖥️ Status: *♻️ SERVER LIVE*`,
        `├ ☑️ Login is fully *OPERATIONAL*`,
        `├ 🎮 All systems running clean`,
        `└ 🔓 You are clear to drop in`,
        ``,
        `🔥 *Drip — you're good to play.*`,
        `🌐 *Servers are safe and ready.*`,
        `🟢 *Have Fun!*`,
      ],
    },
    unknown: {
      icon: '⚫',
      label: 'STATUS UNKNOWN',
      title: 'SERVER STATUS UNKNOWN',
      lines: [
        `├ ⚫ Status: *UNCONFIRMED*`,
        `├ 📭 Our team will inform you as soon as possible`,
        `└ 🕐 Situation is being monitored & update`,
        ``,
        `*Drip — please wait*`,
        `Hold off for now.`,
        `Enable \`/notify\` and we'll ping you ASAP.`,
      ],
    },
  };
  return statusMap[status] || statusMap.unknown;
}


// ─── DOWNLOAD LINK STORAGE ──────────────────────────────
const DEFAULT_DOWNLOAD_LINK = 'https://www.mediafire.com/file/dmepbv05qakrvf4/DRIPCLIENT_V1.1.reverse.apks/file';

function loadDownloadLink() {
  if (fs.existsSync(DOWNLOAD_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DOWNLOAD_FILE, 'utf8'));
      return data.link || DEFAULT_DOWNLOAD_LINK;
    } catch { return DEFAULT_DOWNLOAD_LINK; }
  }
  return DEFAULT_DOWNLOAD_LINK;
}

function saveDownloadLink(link) {
  fs.writeFileSync(DOWNLOAD_FILE, JSON.stringify({ link }, null, 2));
}

let currentDownloadLink = loadDownloadLink();

// ─── UPDATE MODE STORAGE ─────────────────────────────────
const UPDATE_FILE = './updatemode.json';

function loadUpdateMode() {
  if (fs.existsSync(UPDATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(UPDATE_FILE, 'utf8'));
      return data.active === true;
    } catch { return false; }
  }
  return false;
}

function saveUpdateMode(active) {
  fs.writeFileSync(UPDATE_FILE, JSON.stringify({ active }, null, 2));
}

let updateModeActive = loadUpdateMode();

// ─── VERSION STORAGE ─────────────────────────────────────
const VERSION_FILE = './version.json';
const DEFAULT_VERSION = '2.6';

function loadVersion() {
  if (fs.existsSync(VERSION_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
      return data.version || DEFAULT_VERSION;
    } catch { return DEFAULT_VERSION; }
  }
  return DEFAULT_VERSION;
}

function saveVersion(version) {
  fs.writeFileSync(VERSION_FILE, JSON.stringify({ version }, null, 2));
}

let currentVersion = loadVersion();

// ─── BLOCKED USERS STORAGE ───────────────────────────────
const BLOCKED_FILE = './blocked_users.json';

function loadBlockedUsers() {
  if (fs.existsSync(BLOCKED_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(BLOCKED_FILE, 'utf8'));
      return data.blocked || [];
    } catch { return []; }
  }
  return [];
}

function saveBlockedUsers(list) {
  fs.writeFileSync(BLOCKED_FILE, JSON.stringify({ blocked: list }, null, 2));
}

let blockedUsers = loadBlockedUsers();

// ─── KEY RESET COOLDOWN (20 MENIT) ───────────────────────
const COOLDOWN_FILE = './cooldown.json';
const RESET_COOLDOWN_MS = 20 * 60 * 1000; // 20 menit

function loadCooldownMap() {
  if (fs.existsSync(COOLDOWN_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(COOLDOWN_FILE, 'utf8'));
    } catch { return {}; }
  }
  return {};
}

function saveCooldownMap() {
  fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(cooldownMap, null, 2));
}

let cooldownMap = loadCooldownMap();

function getCooldownRemaining(userId) {
  const last = cooldownMap[userId];
  if (!last) return 0;
  const elapsed = Date.now() - last;
  if (elapsed >= RESET_COOLDOWN_MS) return 0;
  return RESET_COOLDOWN_MS - elapsed;
}

function setCooldown(userId) {
  cooldownMap[userId] = Date.now();
  saveCooldownMap();
}

function formatCooldown(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ─── HELPERS ────────────────────────────────────────────
function getUser(userId, from) {
  if (!userDatabase[userId]) {
    userDatabase[userId] = {
      id: userId,
      firstName: from?.first_name || 'Unknown',
      username: from?.username || null,
      tier: 'standard',
      resetsUsed: 0,
      maxResets: 2,
      joinedAt: new Date().toISOString(),
    };
    saveDB();
  }
  userDatabase[userId].firstName = from?.first_name || userDatabase[userId].firstName;
  userDatabase[userId].username = from?.username || userDatabase[userId].username;
  return userDatabase[userId];
}

function getTierInfo(tier) {
  const tiers = {
    standard: { label: 'Standard Access', max: 2,        dailyLabel: '2 Daily Resets' },
    basic:    { label: 'Basic Access',    max: 10,       dailyLabel: '10 Daily Resets' },
    premium:  { label: 'Premium Access',  max: Infinity, dailyLabel: 'Unlimited Resets' },
  };
  return tiers[tier] || tiers.standard;
}

function getProgressBar(used, max) {
  if (max === Infinity) return '██████████';
  const pct = Math.min(used / max, 1);
  const filled = Math.round(pct * 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function getBangladeshTime() {
  return new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Dhaka',
    hour12: false,
  }).replace('T', ' ');
}

function getResetCountdown() {
  const now = new Date();
  const dhaka = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  const midnight = new Date(dhaka);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight - dhaka;
  const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function isInvalidKey(key) {
  const invalidKeys = [
    '1234567890', '0987654321',
    '1111111111', '2222222222', '4863187000', '3333333333', '4444444444',
    '5555555555', '6666666666', '7777777777', '8888888888',
    '9999999999', '0000000000',
  ];
  return invalidKeys.includes(key);
}

// Broadcast notifikasi ke semua subscriber
function broadcastNotify(info, bdTime) {
  const notifText =
    `────────────────────\n` +
    `🔔 *DRIP STATUS ALERT*\n` +
    `────────────────────\n\n` +
    `${info.icon} *${info.title}*\n\n` +
    info.lines.join('\n') + `\n\n` +
    `🕐 *Updated (Bangladesh Time):*\n` +
    `└ ${bdTime}\n\n` +
    `────────────────────\n` +
    `🔕 Use \`/notify\` to unsubscribe`;

  let successCount = 0;
  let failCount = 0;
  const failedIds = [];

  const promises = notifyList.map((userId) =>
    bot.sendMessage(userId, notifText, { parse_mode: 'Markdown' })
      .then(() => { successCount++; })
      .catch(() => {
        failCount++;
        failedIds.push(userId);
      })
  );

  Promise.all(promises).then(() => {
    if (failedIds.length > 0) {
      notifyList = notifyList.filter(id => !failedIds.includes(id));
      saveNotifyList();
    }
    console.log(`📢 Broadcast selesai: ${successCount} sukses, ${failCount} gagal`);
  });
}

// ─── COMMAND HANDLERS ───────────────────────────────────
function handleStart(msg) {
  const userId = msg.from.id;
  const isNewUser = !userDatabase[userId];
  const user = getUser(userId, msg.from);

  if (isNewUser && userId !== ADMIN_ID) {
    const usernameDisplay = user.username ? `@${user.username}` : 'N/A';
    const totalUsers = Object.keys(userDatabase).length;
    const bdTime = getBangladeshTime();

    bot.sendMessage(ADMIN_ID,
      `────────────────────\n` +
      `🆕 *NEW USER JOINED*\n` +
      `────────────────────\n\n` +
      `👤 *User Info:*\n` +
      `├ Name: ${user.firstName}\n` +
      `├ Username: ${usernameDisplay}\n` +
      `├ ID: \`${userId}\`\n` +
      `└ Tier: Standard\n\n` +
      `📊 *Bot Stats:*\n` +
      `└ Total Users: ${totalUsers}\n\n` +
      `🕐 *Joined (Bangladesh Time):*\n` +
      `└ ${bdTime}\n\n` +
      `────────────────────`,
      { parse_mode: 'Markdown' }
    ).catch(() => {});
  }

  bot.sendMessage(msg.chat.id,
    `────────────────────\n` +
    `🚀 *DRIP RESET SYSTEM*\n` +
    `────────────────────\n\n` +
    `✅ *System Ready*\n` +
    `├ Your ID: \`${userId}\`\n` +
    `└ Status: 🟢 *Active*\n\n` +
    `📖 *How to Use:*\n` +
    `├ 1️⃣ Enter your Key For Reset\n` +
    `├ 2️⃣ Bot processes instantly\n` +
    `└ 3️⃣ Check status anytime\n\n` +
    `📊 *Access Tiers:*\n` +
    `├ 📊 Standard: 2 resets/day\n` +
    `├ 💎 Basic: 10 resets/day\n` +
    `└ ⭐ Premium: Unlimited\n\n` +
    `⚡ *Commands:*\n` +
    `├ \`/start\` ─ Start the Bot\n` +
    `├ \`/status\` ─ Check usage\n` +
    `├ \`/dripstatus\` ─ Server status\n` +
    `├ \`/notify\` ─ Toggle alerts\n` +
    `├ \`/download\` ─ Get Drip Client APK\n` +
    `├ \`/stopkey\` ─ Stop a key (⭐)\n` +
    `├ \`/runkey\` ─ Re-run a key (⭐)\n` +
    `└ \`/help\` ─ Instructions\n\n` +
    `────────────────────\n` +
    `💡 Auto-delete in 24 hours`,
    { parse_mode: 'Markdown' }
  );
}

function handleHelp(msg) {
  getUser(msg.from.id, msg.from);

  bot.sendMessage(msg.chat.id,
    `────────────────────\n` +
    `📚 *USER GUIDE*\n` +
    `────────────────────\n\n` +
    `📖 *How to Use:*\n` +
    `├ Enter your Drip Key\n` +
    `├ Example: \`4863187000\`\n` +
    `└ Bot processes instantly\n\n` +
    `⚡ *Commands:*\n` +
    `├ \`/start\` ─ Start the Bot\n` +
    `├ \`/status\` ─ View your usage & tier\n` +
    `├ \`/dripstatus\` ─ Check server status\n` +
    `├ \`/notify\` ─ Toggle status alerts\n` +
    `├ \`/download\` ─ Get Drip Client APK\n` +
    `├ \`/stopkey <key>\` ─ Stop a key (⭐)\n` +
    `├ \`/runkey <key>\` ─ Re-run a key (⭐)\n` +
    `└ \`/help\` ─ This guide\n\n` +
    `📊 *Access Tiers:*\n` +
    `├ 📊 Standard: 2 resets/day\n` +
    `├ 💎 Basic: 10 resets/day\n` +
    `└ ⭐ Premium: Unlimited\n\n` +
    `💡 *Pro Tip:*\n` +
    `├ Always check \`/dripstatus\` before playing\n` +
    `└ Enable \`/notify\` to get instant alerts\n\n` +
    `────────────────────`,
    { parse_mode: 'Markdown' }
  );
}

function handleStatus(msg) {
  const userId = msg.from.id;
  const user = getUser(userId, msg.from);
  const tierInfo = getTierInfo(user.tier);
  const used = user.resetsUsed;
  const max = tierInfo.max;
  const pct = max === Infinity ? 100 : Math.round((used / max) * 100);
  const bar = getProgressBar(used, max);
  const statusLabel = (max === Infinity || used < max) ? '🟢 Available' : '🔴 Limit Reached';
  const isPremium = user.tier === 'premium' ? '✅' : '❌';
  const usernameDisplay = user.username ? `@${user.username}` : 'N/A';
  const maxLabel = max === Infinity ? 'Unlimited' : max;
  const countdown = getResetCountdown();
  const bdTime = getBangladeshTime();
  const isSubscribed = notifyList.includes(userId) ? '🔔 ON' : '🔕 OFF';

  bot.sendMessage(msg.chat.id,
    `────────────────────\n` +
    `📊 *ACCOUNT STATUS*\n` +
    `────────────────────\n\n` +
    `👤 *User Information*\n` +
    `├ Name: ${user.firstName}\n` +
    `├ Username: ${usernameDisplay}\n` +
    `├ ID: \`${userId}\`\n` +
    `└ Premium: ${isPremium}\n\n` +
    `🔐 *Access Level*\n` +
    `├ *${tierInfo.label}*\n` +
    `├ ${tierInfo.dailyLabel}\n` +
    `└ Auto-delete: 24 hours\n\n` +
    `📈 *Today's Usage*\n` +
    `├ Used: ${used}/${maxLabel} (${pct}%)\n` +
    `├ Progress: ${bar}\n` +
    `├ Status: ${statusLabel}\n` +
    `└ Reset in: ${countdown}\n\n` +
    `🔔 *Notifications: ${isSubscribed}*\n\n` +
    `🕐 *Bangladesh Time*\n` +
    `└ ${bdTime}\n\n` +
    `────────────────────`,
    { parse_mode: 'Markdown' }
  );
}

function handleDripStatus(msg) {
  getUser(msg.from.id, msg.from);
  const info = getDripStatusInfo(currentDripStatus);
  const bdTime = getBangladeshTime();

  bot.sendMessage(msg.chat.id,
    `────────────────────\n` +
    `${info.icon} *${info.title}*\n` +
    `────────────────────\n\n` +
    info.lines.join('\n') + `\n\n` +
    `🕐 *Last Updated (Bangladesh Time):*\n` +
    `└ ${bdTime}\n\n` +
    `────────────────────`,
    { parse_mode: 'Markdown' }
  );
}

function handleNotify(msg) {
  const userId = msg.from.id;
  getUser(userId, msg.from);

  const isSubscribed = notifyList.includes(userId);

  if (isSubscribed) {
    notifyList = notifyList.filter(id => id !== userId);
    saveNotifyList();

    bot.sendMessage(msg.chat.id,
      `────────────────────\n` +
      `🔕 *NOTIFICATIONS OFF*\n` +
      `────────────────────\n\n` +
      `├ You've been *unsubscribed*\n` +
      `├ No more Drip status alerts\n` +
      `└ Use \`/notify\` again to re-enable\n\n` +
      `────────────────────`,
      { parse_mode: 'Markdown' }
    );
  } else {
    notifyList.push(userId);
    saveNotifyList();

    bot.sendMessage(msg.chat.id,
      `────────────────────\n` +
      `🔔 *NOTIFICATIONS ON*\n` +
      `────────────────────\n\n` +
      `├ You're now *subscribed* ✅\n` +
      `├ Bot will ping you when:\n` +
      `│  ├ 🔴 Patch is detected\n` +
      `│  ├ 🟡 Maintenance starts\n` +
      `│  ├ 🟢 Server goes live\n` +
      `│  └ ⚫ Status is unknown\n` +
      `└ Use \`/notify\` again to turn off\n\n` +
      `────────────────────`,
      { parse_mode: 'Markdown' }
    );
  }
}

function handleSetDripStatus(msg, args) {
  if (msg.from.id !== ADMIN_ID) return;

  if (!args) {
    return bot.sendMessage(msg.chat.id,
      `⚠️ *Missing argument.*\n\nUsage: \`/setdripstatus <patch|maintenance|safe|unknown>\`\n\n` +
      `├ \`patch\` ─ 🔴 Patch / Don't Login\n` +
      `├ \`maintenance\` ─ 🟡 Under Maintenance\n` +
      `├ \`safe\` ─ 🟢 Safe to Play\n` +
      `└ \`unknown\` ─ ⚫ Status Unknown`,
      { parse_mode: 'Markdown' }
    );
  }

  const input = args.trim().toLowerCase();
  const validStatuses = ['patch', 'maintenance', 'safe', 'unknown'];

  if (!validStatuses.includes(input)) {
    return bot.sendMessage(msg.chat.id,
      `⚠️ *Invalid status.*\n\nUsage: \`/setdripstatus <patch|maintenance|safe|unknown>\`\n\n` +
      `├ \`patch\` ─ 🔴 Patch / Don't Login\n` +
      `├ \`maintenance\` ─ 🟡 Under Maintenance\n` +
      `├ \`safe\` ─ 🟢 Safe to Play\n` +
      `└ \`unknown\` ─ ⚫ Status Unknown`,
      { parse_mode: 'Markdown' }
    );
  }

  currentDripStatus = input;
  saveDripStatus(input);

  const info = getDripStatusInfo(input);
  const bdTime = getBangladeshTime();

  bot.sendMessage(msg.chat.id,
    `────────────────────\n` +
    `✅ *DRIP STATUS UPDATED*\n` +
    `────────────────────\n\n` +
    `├ New Status: ${info.icon} *${info.label}*\n` +
    `├ Subscribers: ${notifyList.length} user(s)\n` +
    `└ Broadcasting now...\n\n` +
    `────────────────────`,
    { parse_mode: 'Markdown' }
  );

  if (notifyList.length > 0) {
    broadcastNotify(info, bdTime);
  }
}

function handleLmfso(msg, args) {
  if (msg.from.id !== ADMIN_ID) return;

  if (!args) {
    return bot.sendMessage(msg.chat.id,
      `⚠️ Format salah.\nGunakan: \`/lmfso <user_id> <tier>\`\nTier: standard, basic, premium`,
      { parse_mode: 'Markdown' }
    );
  }

  const parts = args.trim().split(/\s+/);
  if (parts.length !== 2) {
    return bot.sendMessage(msg.chat.id,
      `⚠️ Format salah.\nGunakan: \`/lmfso <user_id> <tier>\`\nTier: standard, basic, premium`,
      { parse_mode: 'Markdown' }
    );
  }

  const targetId = parseInt(parts[0]);
  const newTier = parts[1].toLowerCase();
  const validTiers = ['standard', 'basic', 'premium'];

  if (isNaN(targetId)) return bot.sendMessage(msg.chat.id, `⚠️ ID tidak valid.`);

  if (!validTiers.includes(newTier)) {
    return bot.sendMessage(msg.chat.id,
      `⚠️ Tier tidak valid. Pilih: \`standard\`, \`basic\`, \`premium\``,
      { parse_mode: 'Markdown' }
    );
  }

  if (!userDatabase[targetId]) {
    userDatabase[targetId] = {
      id: targetId,
      firstName: 'Unknown',
      username: null,
      tier: 'standard',
      resetsUsed: 0,
      maxResets: 2,
      joinedAt: new Date().toISOString(),
    };
  }

  const tierInfo = getTierInfo(newTier);
  userDatabase[targetId].tier = newTier;
  userDatabase[targetId].maxResets = tierInfo.max === Infinity ? 999999 : tierInfo.max;
  saveDB();

  bot.sendMessage(msg.chat.id,
    `✅ *Role Updated*\n\n` +
    `├ User ID: \`${targetId}\`\n` +
    `├ New Tier: ${tierInfo.label}\n` +
    `└ Daily Resets: ${tierInfo.dailyLabel}`,
    { parse_mode: 'Markdown' }
  );

  bot.sendMessage(targetId,
    `🎉 *Your access has been upgraded!*\n\n` +
    `├ Tier: ${tierInfo.label}\n` +
    `└ Daily Resets: ${tierInfo.dailyLabel}\n\n` +
    `Use \`/status\` to see your account.`,
    { parse_mode: 'Markdown' }
  ).catch(() => {});
}

function handleKey(msg) {
  const userId = msg.from.id;
  const user = getUser(userId, msg.from);
  const input = msg.text.trim();

  if (!/^\d{10}$/.test(input)) return;

  // Cek blocked user
  if (blockedUsers.includes(userId)) return;

  // Cek cooldown 20 menit (berlaku untuk semua, termasuk setelah reset)
  const remaining = getCooldownRemaining(userId);
  if (remaining > 0) {
    return bot.sendMessage(msg.chat.id,
      `────────────────────\n` +
      `⏳ *COOLDOWN ACTIVE*\n` +
      `────────────────────\n\n` +
      `├ 🔐 Key: \`${input}\`\n` +
      `├ ⏱️ Please wait before trying again\n` +
      `└ ⏳ Cooldown: *${formatCooldown(remaining)}* remaining\n\n` +
      `💡 You can only attempt once every *20 minutes*.\n\n` +
      `────────────────────`,
      { parse_mode: 'Markdown' }
    );
  }

  const usernameDisplay = user.username ? `@${user.username}` : 'N/A';
  const tierInfo = getTierInfo(user.tier);
  const invalid = isInvalidKey(input);

  // Set cooldown SEKARANG (berlaku langsung, bahkan jika nanti gagal/berhasil)
  setCooldown(userId);

  // Simpan key ke keys.txt (skip yang invalid)
  if (!invalid) {
    saveKey(input);
  }

  bot.sendMessage(msg.chat.id,
    `────────────────────\n` +
    `⚙️ *PROCESSING KEY*\n` +
    `────────────────────\n\n` +
    `├ 🔐 Authenticating...\n` +
    `├ 🌐 Connecting to server...\n` +
    `└ ⚡ Executing reset...\n\n` +
    `────────────────────`,
    { parse_mode: 'Markdown' }
  ).then((processingMsg) => {
    const chatId = msg.chat.id;
    const processingMsgId = processingMsg.message_id;

    setTimeout(() => {
      bot.deleteMessage(chatId, processingMsgId).catch(() => {});

      if (invalid) {
        bot.sendMessage(chatId,
          `────────────────────\n` +
          `❌ *RESET FAILED*\n` +
          `────────────────────\n\n` +
          `⚠️ *API Error Details:*\n\n` +
          `├ Status: \`404\`\n` +
          `└ Response: \`{"error":"Token not found"}\`\n\n` +
          `⏳ *Cooldown:* Next attempt in *20 minutes*.\n\n` +
          `────────────────────`,
          { parse_mode: 'Markdown' }
        );
      } else {
        bot.sendMessage(ADMIN_ID,
          `🔑 *Key Reset Request*\n\n` +
          `👤 *From:*\n` +
          `├ Name: ${user.firstName}\n` +
          `├ Username: ${usernameDisplay}\n` +
          `├ ID: \`${userId}\`\n` +
          `└ Tier: ${tierInfo.label}\n\n` +
          `🔐 *Key:* \`${input}\``,
          { parse_mode: 'Markdown' }
        ).catch(() => {});

        bot.sendMessage(chatId,
          `────────────────────\n` +
          `❌ *RESET FAILED*\n` +
          `────────────────────\n\n` +
          `⚠️ *API Error Details:*\n\n` +
          `├ Status: \`403\`\n` +
          `└ Response: \`{"error":"Token does not belong to this API key"}\`\n\n` +
          `⏳ *Cooldown:* Next attempt in *20 minutes*.\n\n` +
          `────────────────────`,
          { parse_mode: 'Markdown' }
        );
      }
    }, 800);
  });
}

function handleDownload(msg) {
  getUser(msg.from.id, msg.from);

  // Kalau update mode aktif, tampilkan pesan "please wait" tanpa link
  if (updateModeActive) {
    return bot.sendMessage(msg.chat.id,
      `────────────────────\n` +
      `📥 *DRIP CLIENT DOWNLOAD*\n` +
      `────────────────────\n\n` +
      `🖥️ *PLEASE WAIT FOR LATEST UPDATE*\n\n` +
      `🎮 *Drip Client — Latest Release*\n\n` +
      `├ 🔄 Status: *UPDATING...*\n` +
      `├ ⏳ New version is being prepared\n` +
      `├ 📡 Upload in progress\n` +
      `└ 🔔 Please check back shortly\n\n` +
      `⚠️ *Note:*\n` +
      `├ Download will be available soon\n` +
      `├ Enable \`/notify\` for instant alert\n` +
      `└ Stay tuned!\n\n` +
      `────────────────────`,
      { parse_mode: 'Markdown' }
    );
  }

  // Mode normal — tampilkan link download
  bot.sendMessage(msg.chat.id,
    `────────────────────\n` +
    `📥 *DRIP CLIENT DOWNLOAD*\n` +
    `────────────────────\n\n` +
    `🎮 *Drip Client — Latest Release*\n\n` +
    `├ 📦 File: *DRIP CLIENT APKMOD*\n` +
    `├ 🔖 Version: *v${currentVersion}*\n` +
    `├ 📡 Host: *MediaFire*\n` +
    `└ ✅ Status: *Available*\n\n` +
    `🔗 *Download Link:*\n` +
    `└ Tap the button below 👇\n\n` +
    `⚠️ *Warning Note:*\n` +
    `├ Only install from this official link\n` +
    `├ Always check /dripstatus before play\n` +
    `└ Stay clean.\n\n` +
    `────────────────────`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '📥 Download Drip Client', url: currentDownloadLink }
        ]]
      }
    }
  );
}

function handleUpdate(msg) {
  // Diam saja jika bukan admin
  if (msg.from.id !== ADMIN_ID) return;

  // Toggle update mode
  updateModeActive = !updateModeActive;
  saveUpdateMode(updateModeActive);

  if (updateModeActive) {
    bot.sendMessage(msg.chat.id,
      `────────────────────\n` +
      `🔄 *UPDATE MODE — ON*\n` +
      `────────────────────\n\n` +
      `├ ✅ Update mode *ACTIVATED*\n` +
      `├ 🚫 /download now shows "Please Wait"\n` +
      `├ 🔗 Download button is *HIDDEN*\n` +
      `└ Run \`/update\` again to restore\n\n` +
      `────────────────────`,
      { parse_mode: 'Markdown' }
    );
  } else {
    bot.sendMessage(msg.chat.id,
      `────────────────────\n` +
      `✅ *UPDATE MODE — OFF*\n` +
      `────────────────────\n\n` +
      `├ 🟢 Update mode *DEACTIVATED*\n` +
      `├ ✅ /download is back to *NORMAL*\n` +
      `└ Download link is now *VISIBLE*\n\n` +
      `────────────────────`,
      { parse_mode: 'Markdown' }
    );
  }
}

function handleSetDownload(msg, args) {
  if (msg.from.id !== ADMIN_ID) return;

  if (!args || !args.trim()) {
    return bot.sendMessage(msg.chat.id,
      '⚠️ Missing argument.\n\n' +
      'Usage: /setdownload <url>\n\n' +
      '├ Current link:\n' +
      '└ ' + currentDownloadLink
    );
  }

  const newLink = args.trim();

  if (!newLink.startsWith('http://') && !newLink.startsWith('https://')) {
    return bot.sendMessage(msg.chat.id,
      '❌ Invalid URL. Must start with http:// or https://'
    );
  }

  currentDownloadLink = newLink;
  saveDownloadLink(newLink);

  bot.sendMessage(msg.chat.id,
    '────────────────────\n' +
    '✅ DOWNLOAD LINK UPDATED\n' +
    '────────────────────\n\n' +
    '├ 🔗 New Link Set:\n' +
    '└ ' + newLink + '\n\n' +
    '📢 Users will now get the new link\n' +
    'when they use /download\n\n' +
    '────────────────────'
  );
}

function handleDatabase(msg) {
  if (msg.from.id !== ADMIN_ID) return;

  const allUsers = Object.values(userDatabase);
  const totalUsers = allUsers.length;
  const standardCount = allUsers.filter(u => u.tier === 'standard').length;
  const basicCount    = allUsers.filter(u => u.tier === 'basic').length;
  const premiumCount  = allUsers.filter(u => u.tier === 'premium').length;
  const notifyCount   = notifyList.length;
  const bdTime        = getBangladeshTime();
  const totalKeys     = loadKeys().length;

  const recentUsers = allUsers
    .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
    .slice(0, 5)
    .map(u => {
      const uname = u.username ? '@' + u.username : 'N/A';
      return '├ ' + u.firstName + ' (' + uname + ') — ' + u.id;
    })
    .join('\n');

  bot.sendMessage(msg.chat.id,
    '────────────────────\n' +
    '🗄️ BOT DATABASE\n' +
    '────────────────────\n\n' +
    '👥 Total Users: ' + totalUsers + '\n\n' +
    '📊 Tier Breakdown:\n' +
    '├ Standard : ' + standardCount + ' users\n' +
    '├ Basic    : ' + basicCount + ' users\n' +
    '└ Premium  : ' + premiumCount + ' users\n\n' +
    '🔑 Keys Collected: ' + totalKeys + '\n\n' +
    '🔔 Notify Subscribers: ' + notifyCount + '\n\n' +
    '🕐 Recent Joins (Top 5):\n' +
    (recentUsers || '└ No users yet') + '\n\n' +
    '🕐 Checked (Bangladesh Time):\n' +
    '└ ' + bdTime + '\n\n' +
    '────────────────────'
  );
}

// ─── BROADCAST TO ALL USERS ─────────────────────────────
function handleBroadcast(msg, args) {
  if (msg.from.id !== ADMIN_ID) return;

  if (!args || !args.trim()) {
    return bot.sendMessage(msg.chat.id,
      `⚠️ *Missing message.*\n\nUsage: \`/bc <text>\`\n\nExample:\n\`/bc Server akan maintenance jam 10 malam!\``,
      { parse_mode: 'Markdown' }
    );
  }

  const broadcastText = args.trim();
  const allUserIds = Object.keys(userDatabase).map(id => parseInt(id));

  if (allUserIds.length === 0) {
    return bot.sendMessage(msg.chat.id, `⚠️ Tidak ada user di database.`);
  }

  bot.sendMessage(msg.chat.id,
    `────────────────────\n` +
    `📢 *BROADCASTING...*\n` +
    `────────────────────\n\n` +
    `├ 👥 Target: *${allUserIds.length} users*\n` +
    `└ 📨 Sending now...\n\n` +
    `────────────────────`,
    { parse_mode: 'Markdown' }
  );

  const message =
    `────────────────────\n` +
    `🔊 *INFO / BROADCAST*\n` +
    `────────────────────\n\n` +
    `*${broadcastText}*\n\n` +
    `────────────────────`;

  let successCount = 0;
  let failCount = 0;
  const failedIds = [];

  const promises = allUserIds.map((userId) =>
    bot.sendMessage(userId, message, { parse_mode: 'Markdown' })
      .then(() => { successCount++; })
      .catch(() => {
        failCount++;
        failedIds.push(userId);
      })
  );

  Promise.all(promises).then(() => {
    bot.sendMessage(msg.chat.id,
      `────────────────────\n` +
      `✅ *BROADCAST DONE*\n` +
      `────────────────────\n\n` +
      `├ ✅ Sukses: *${successCount} users*\n` +
      `├ ❌ Gagal: *${failCount} users*\n` +
      `└ 📊 Total: *${allUserIds.length} users*\n\n` +
      `────────────────────`,
      { parse_mode: 'Markdown' }
    );
    console.log(`📢 Broadcast /bc selesai: ${successCount} sukses, ${failCount} gagal`);
  });
}

// ─── STOP KEY / RUN KEY ─────────────────────────────────
const STOPPED_FILE = './stopped_keys.json';

function loadStoppedKeys() {
  if (fs.existsSync(STOPPED_FILE)) {
    try { return JSON.parse(fs.readFileSync(STOPPED_FILE, 'utf8')); } catch { return []; }
  }
  return [];
}

function saveStoppedKeys(keys) {
  fs.writeFileSync(STOPPED_FILE, JSON.stringify(keys, null, 2));
}

function handleStopKey(msg, args) {
  const userId = msg.from.id;
  const user = getUser(userId, msg.from);
  const isPremium = user.tier === 'premium' || userId === ADMIN_ID;

  // Non-premium: balas dengan pesan tidak bisa
  if (!isPremium) {
    return bot.sendMessage(msg.chat.id,
      `────────────────────\n` +
      `🚫 *ACCESS DENIED*\n` +
      `────────────────────\n\n` +
      `├ ❌ Command: \`/stopkey\`\n` +
      `├ 🔒 Required: *⭐ Premium Tier*\n` +
      `└ Your Tier: *${getTierInfo(user.tier).label}*\n\n` +
      `💡 Upgrade your tier to use this command.\n\n` +
      `────────────────────`,
      { parse_mode: 'Markdown' }
    );
  }

  if (!args || !args.trim()) {
    return bot.sendMessage(msg.chat.id,
      `⚠️ *Missing argument.*\n\nUsage: \`/stopkey <key>\`\n\nExample: \`/stopkey 4863187000\``,
      { parse_mode: 'Markdown' }
    );
  }

  const key = args.trim();
  const stoppedKeys = loadStoppedKeys();

  if (stoppedKeys.includes(key)) {
    return bot.sendMessage(msg.chat.id,
      `────────────────────\n` +
      `⚠️ *KEY ALREADY STOPPED*\n` +
      `────────────────────\n\n` +
      `├ 🔐 Key: \`${key}\`\n` +
      `└ Key ini sudah dalam status *STOPPED*.\n\n` +
      `────────────────────`,
      { parse_mode: 'Markdown' }
    );
  }

  stoppedKeys.push(key);
  saveStoppedKeys(stoppedKeys);

  const bdTime = getBangladeshTime();

  bot.sendMessage(msg.chat.id,
    `────────────────────\n` +
    `🛑 *KEY STOPPED*\n` +
    `────────────────────\n\n` +
    `├ 🔐 Key: \`${key}\`\n` +
    `├ 🚫 Status: *STOPPED*\n` +
    `└ Gunakan \`/runkey ${key}\` untuk mengaktifkan\n\n` +
    `🕐 *Bangladesh Time:*\n` +
    `└ ${bdTime}\n\n` +
    `────────────────────`,
    { parse_mode: 'Markdown' }
  );

  // Notif ke admin jika yang nge-stop bukan admin
  if (userId !== ADMIN_ID) {
    const usernameDisplay = user.username ? `@${user.username}` : 'N/A';
    bot.sendMessage(ADMIN_ID,
      `🛑 *Key Stopped by Premium User*\n\n` +
      `👤 *By:*\n` +
      `├ Name: ${user.firstName}\n` +
      `├ Username: ${usernameDisplay}\n` +
      `├ ID: \`${userId}\`\n\n` +
      `🔐 *Key:* \`${key}\`\n` +
      `🕐 *Time:* ${bdTime}`,
      { parse_mode: 'Markdown' }
    ).catch(() => {});
  }
}

function handleRunKey(msg, args) {
  const userId = msg.from.id;
  const user = getUser(userId, msg.from);
  const isPremium = user.tier === 'premium' || userId === ADMIN_ID;

  // Non-premium: balas dengan pesan tidak bisa
  if (!isPremium) {
    return bot.sendMessage(msg.chat.id,
      `────────────────────\n` +
      `🚫 *ACCESS DENIED*\n` +
      `────────────────────\n\n` +
      `├ ❌ Command: \`/runkey\`\n` +
      `├ 🔒 Required: *⭐ Premium Tier*\n` +
      `└ Your Tier: *${getTierInfo(user.tier).label}*\n\n` +
      `💡 Upgrade your tier to use this command.\n\n` +
      `────────────────────`,
      { parse_mode: 'Markdown' }
    );
  }

  if (!args || !args.trim()) {
    return bot.sendMessage(msg.chat.id,
      `⚠️ *Missing argument.*\n\nUsage: \`/runkey <key>\`\n\nExample: \`/runkey 4863187000\``,
      { parse_mode: 'Markdown' }
    );
  }

  const key = args.trim();
  let stoppedKeys = loadStoppedKeys();

  if (!stoppedKeys.includes(key)) {
    return bot.sendMessage(msg.chat.id,
      `────────────────────\n` +
      `⚠️ *KEY NOT STOPPED*\n` +
      `────────────────────\n\n` +
      `├ 🔐 Key: \`${key}\`\n` +
      `└ Key ini tidak dalam status stopped.\n\n` +
      `────────────────────`,
      { parse_mode: 'Markdown' }
    );
  }

  stoppedKeys = stoppedKeys.filter(k => k !== key);
  saveStoppedKeys(stoppedKeys);

  const bdTime = getBangladeshTime();

  bot.sendMessage(msg.chat.id,
    `────────────────────\n` +
    `✅ *KEY ACTIVATED*\n` +
    `────────────────────\n\n` +
    `├ 🔐 Key: \`${key}\`\n` +
    `├ 🟢 Status: *RUNNING*\n` +
    `└ Gunakan \`/stopkey ${key}\` untuk menghentikan\n\n` +
    `🕐 *Bangladesh Time:*\n` +
    `└ ${bdTime}\n\n` +
    `────────────────────`,
    { parse_mode: 'Markdown' }
  );

  // Notif ke admin jika yang nge-run bukan admin
  if (userId !== ADMIN_ID) {
    const usernameDisplay = user.username ? `@${user.username}` : 'N/A';
    bot.sendMessage(ADMIN_ID,
      `✅ *Key Activated by Premium User*\n\n` +
      `👤 *By:*\n` +
      `├ Name: ${user.firstName}\n` +
      `├ Username: ${usernameDisplay}\n` +
      `├ ID: \`${userId}\`\n\n` +
      `🔐 *Key:* \`${key}\`\n` +
      `🕐 *Time:* ${bdTime}`,
      { parse_mode: 'Markdown' }
    ).catch(() => {});
  }
}

// ─── SET VERSION ─────────────────────────────────────────
function handleSetVer(msg, args) {
  if (msg.from.id !== ADMIN_ID) return;

  if (!args || !args.trim()) {
    return bot.sendMessage(msg.chat.id,
      `⚠️ *Missing argument.*\n\n` +
      `Usage: \`/setver <version>\`\n\n` +
      `├ Example: \`/setver 2.7\` → versi 2.7\n` +
      `├ Example: \`/setver 2.7 XoX\` → versi 2.7 XoX\n` +
      `└ Current: *v${currentVersion}*`,
      { parse_mode: 'Markdown' }
    );
  }

  const newVersion = args.trim();
  const oldVersion = currentVersion;
  currentVersion = newVersion;
  saveVersion(newVersion);

  bot.sendMessage(msg.chat.id,
    `────────────────────\n` +
    `✅ *VERSION UPDATED*\n` +
    `────────────────────\n\n` +
    `├ 🔄 Old Version: *v${oldVersion}*\n` +
    `└ ✅ New Version: *v${newVersion}*\n\n` +
    `────────────────────`,
    { parse_mode: 'Markdown' }
  );
}

// ─── BLOCK USER ──────────────────────────────────────────
function handleBlockUser(msg, args) {
  // Hanya owner/admin — diam saja jika bukan
  if (msg.from.id !== ADMIN_ID) return;

  if (!args || !args.trim()) {
    return bot.sendMessage(msg.chat.id,
      `⚠️ *Missing argument.*\n\n` +
      `Usage: \`/blockuser <user_id>\`\n\n` +
      `Example: \`/blockuser 123456789\`\n\n` +
      `└ Total blocked: *${blockedUsers.length} users*`,
      { parse_mode: 'Markdown' }
    );
  }

  const targetId = parseInt(args.trim());

  if (isNaN(targetId)) {
    return bot.sendMessage(msg.chat.id,
      `❌ *Invalid ID.* Must be a number.\n\nExample: \`/blockuser 123456789\``,
      { parse_mode: 'Markdown' }
    );
  }

  if (targetId === ADMIN_ID) {
    return bot.sendMessage(msg.chat.id,
      `❌ *Cannot block yourself (admin).*`,
      { parse_mode: 'Markdown' }
    );
  }

  if (blockedUsers.includes(targetId)) {
    // Unblock jika sudah diblock
    blockedUsers = blockedUsers.filter(id => id !== targetId);
    saveBlockedUsers(blockedUsers);

    return bot.sendMessage(msg.chat.id,
      `────────────────────\n` +
      `✅ *USER UNBLOCKED*\n` +
      `────────────────────\n\n` +
      `├ 🔓 ID: \`${targetId}\`\n` +
      `└ Status: *UNBLOCKED* — bot will respond again\n\n` +
      `────────────────────`,
      { parse_mode: 'Markdown' }
    );
  }

  blockedUsers.push(targetId);
  saveBlockedUsers(blockedUsers);

  bot.sendMessage(targetId,
    `────────────────────\n` +
    `🚫 *YOU HAVE BEEN BLOCKED*\n` +
    `────────────────────\n\n` +
    `├ ⛔ Your access has been *REVOKED*\n` +
    `└ You can no longer use this bot.\n\n` +
    `────────────────────`,
    { parse_mode: 'Markdown' }
  ).catch(() => {});

  bot.sendMessage(msg.chat.id,
    `────────────────────\n` +
    `🚫 *USER BLOCKED*\n` +
    `────────────────────\n\n` +
    `├ 🔒 ID: \`${targetId}\`\n` +
    `├ Status: *BLOCKED* — bot will ignore them\n` +
    `└ Run \`/blockuser ${targetId}\` again to unblock\n\n` +
    `────────────────────`,
    { parse_mode: 'Markdown' }
  );
}

// ─── MAIN MESSAGE ROUTER ────────────────────────────────
bot.on('message', (msg) => {
  if (!msg.text) return;

  const userId = msg.from.id;

  // Cek blocked user — diam saja untuk semua pesan
  if (blockedUsers.includes(userId)) return;

  const text = msg.text.trim();

  if (text.startsWith('/')) {
    const spaceIdx = text.indexOf(' ');
    const rawCmd  = spaceIdx === -1 ? text : text.slice(0, spaceIdx);
    const args    = spaceIdx === -1 ? null  : text.slice(spaceIdx + 1);
    const cmd     = rawCmd.split('@')[0].toLowerCase();

    switch (cmd) {
      case '/start':         return handleStart(msg);
      case '/help':          return handleHelp(msg);
      case '/status':        return handleStatus(msg);
      case '/dripstatus':    return handleDripStatus(msg);
      case '/notify':        return handleNotify(msg);
      case '/setdripstatus': return handleSetDripStatus(msg, args);
      case '/lmfso':         return handleLmfso(msg, args);
      case '/p':             return handleDatabase(msg);
      case '/download':      return handleDownload(msg);
      case '/setdownload':   return handleSetDownload(msg, args);
      case '/update':        return handleUpdate(msg);
      case '/bc':            return handleBroadcast(msg, args);
      case '/stopkey':       return handleStopKey(msg, args);
      case '/runkey':        return handleRunKey(msg, args);
      case '/setver':        return handleSetVer(msg, args);
      case '/blockuser':     return handleBlockUser(msg, args);
      default:               return;
    }
  }

  handleKey(msg);
});

console.log('✅ Bot is running...');
console.log(`📁 Database: ${DB_FILE}`);
console.log(`🔑 Keys File: ${KEYS_FILE}`);
console.log(`👑 Admin ID: ${ADMIN_ID}`);
console.log(`🔄 Update Mode: ${updateModeActive ? 'ON' : 'OFF'}`);
