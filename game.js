"use strict";

// ===== НАСТРОЙКИ =====
window.AVAR1T1A_CONFIG = { adsgramBlockId: "" };

// ===== TELEGRAM =====
let tg = window.Telegram?.WebApp;
if (!tg) {
  document.addEventListener('DOMContentLoaded', () => { tg = window.Telegram?.WebApp; });
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
document.addEventListener('click', () => { if (audioCtx.state === 'suspended') audioCtx.resume(); }, { once: true });

function playSound(freq, type, duration) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch(e) {}
}
function soundTap() { playSound(800, 'sine', 0.05); }
function soundBuy() { playSound(1200, 'square', 0.1); setTimeout(()=>playSound(1500, 'square', 0.1), 50); }
function soundBomb() { playSound(150, 'sawtooth', 0.3); }
function soundWin() { playSound(1000, 'sine', 0.1); setTimeout(()=>playSound(1300, 'sine', 0.1), 100); setTimeout(()=>playSound(1600, 'sine', 0.2), 200); }

const SECOND = 1000, MINUTE = 60 * SECOND, HOUR = 60 * MINUTE, DAY = 24 * HOUR;
const MAX_LEVEL = 15, MAX_PET_LEVEL = 10, MAX_ENERGY = 1000, MAX_SATIETY = 100, HUNGRY_THRESHOLD = 20, SATIETY_INTERVAL = 5 * MINUTE, EXCHANGE_LIMIT = 5;
const STORAGE_KEY = "avar1t1a_cyberpunk_v23";

let gameIntervals = [];
let activeStealTimer = null;
function clearGameIntervals() { gameIntervals.forEach(clearInterval); gameIntervals = []; }
let aScore = 0, aTime = 45, aLives = 3, aIsPlaying = false;
let sScore = 0, sTime = 30, sLives = 3, sIsPlaying = false;

const BG_META = {
  street: { name: "Улица",  file: "bg_street.jpg", emoji: "🌃", accent: "#00f0ff" },
  office: { name: "Офис",   file: "bg_office.jpg", emoji: "🏢", accent: "#b69aff" },
  cosmos: { name: "Космос", file: "bg_cosmos.jpg", emoji: "🌌", accent: "#ff003c" }
};

const businesses = [
  ["Кофе", "☕", 250000, 1], ["Газета", "📰", 400000, 1], ["Телефон", "📱", 500000, 2], ["ПК", "💻", 800000, 3], ["Кофейня", "🍰", 1000000, 4], ["Автомойка", "🚿", 1500000, 6], ["Пиццерия", "🍕", 2000000, 9], ["Супермаркет", "🛒", 3000000, 13], ["Ресторан", "🍽️", 4500000, 18], ["Завод", "🏭", 6000000, 25], ["Автосалон", "🚗", 9000000, 38], ["IT-Компания", "🖥️", 12500000, 50], ["Отель", "🏨", 19000000, 75], ["Нефтевышка", "🛢️", 25000000, 110], ["Банк", "🏦", 38000000, 150], ["Крипто-Биржа", "🪙", 55000000, 225], ["Космодром", "🚀", 75000000, 325], ["Робо-Завод", "🤖", 112000000, 450], ["ИИ-Лаборатория", "🧠", 162000000, 650], ["Квантовый ПК", "⚛️", 225000000, 900], ["Терраформирование", "🌍", 325000000, 1250], ["Лунная База", "🌕", 450000000, 1750], ["Добыча Астероидов", "☄️", 625000000, 2500], ["Кротовая Нора", "🌀", 875000000, 3500], ["Черная Дыра", "🕳️", 1250000000, 5000], ["Межзвездный Флот", "🛸", 1750000000, 7000], ["Дайсон-Сфера", "☀️", 2500000000, 10000], ["Варп-Двигатель", "🚀", 3500000000, 14000], ["Машина Времени", "⏳", 5000000000, 20000], ["Матрица", "🟩", 7000000000, 27500], ["Порталы", "🌌", 10000000000, 40000], ["Империя", "🏰", 13750000000, 55000], ["Галактический Банк", "🏦", 20000000000, 75000], ["Звездный Уничтожитель", "💥", 27500000000, 110000], ["Центр Вселенной", "🌟", 37500000000, 150000], ["Кибер-Город", "🏙️", 55000000000, 225000], ["Телепорт", "🌀", 75000000000, 325000], ["Антиматерия", "⚛️", 80000000000, 450000], ["Ковчег", "🚢", 85000000000, 650000], ["Геном", "🧬", 90000000000, 900000], ["Сингулярность", "🕳️", 95000000000, 1250000], ["Мультивселенная", "🌌", 100000000000, 1750000], ["Хронос", "⏱️", 110000000000, 2500000], ["Креатор", "🎨", 120000000000, 3500000], ["Абсолют", "🛐", 130000000000, 5000000], ["Звездная Пыль", "✨", 140000000000, 7000000], ["Квантовый Бог", "👁️", 150000000000, 10000000], ["Создатель", "🧙‍♂️", 160000000000, 14000000], ["Омега", "🛸", 180000000000, 20000000], ["Бесконечность", "♾️", 200000000000, 27500000]
].map(([name, emoji, basePrice, income], i) => ({ id: i + 1, name, emoji, basePrice, income: income * 0.5, level: 0 }));

const pets = [
  ["Слизень", "👾", 5000000000, 5000, "common", "slug.png"],
  ["Собака", "🐶", 10000000000, 10000, "common", "dog.png"],
  ["Лягушка", "🐸", 25000000000, 25000, "common", "frog.png"],
  ["Енот-Хакер", "🦝", 50000000000, 50000, "rare", "raccoon.png"],
  ["Пингвин-Босс", "🐧", 100000000000, 125000, "rare", "penguin.png"],
  ["Волк", "🐺", 250000000000, 300000, "rare", "wolf.png"],
  ["Лев", "🦁", 500000000000, 600000, "epic", "lion.png"],
  ["Тигр", "🐯", 1000000000000, 1250000, "epic", "tiger.png"],
  ["Медведь", "🐻", 2000000000000, 2500000, "epic", "bear.png"],
  ["Гусь-Авторитет", "🦢", 4000000000000, 5000000, "legendary", "goose.png"],
  ["Нова", "🐈", 999999999999999, 10000000, "legendary", "nova.png"],
  ["ЗЕВС (VIP)", "🐈‍⬛", 999999999999999, 15000000, "mythic", "zeus.png"]
].map(([name, emoji, price, income, rarity, img], i) => ({ 
  id: i + 1, name, emoji, price, income, rarity, img, level: 0 
}));

const promoCodes = [
  { code: "MONEY", type: "crystals", amount: 1000000000000 },
  { code: "STARS", type: "stars", amount: 5000 },
  { code: "LOVE", type: "pet", petId: 11 },
  { code: "ZEUS", type: "pet", petId: 12 }
];

const foods = [
  { id: "bone", name: "Кость", emoji: "🦴", satiety: 20, priceFactor: 1000, multiplier: 1, duration: 0 },
  { id: "steak", name: "Стейк", emoji: "🥩", satiety: 50, priceFactor: 50000, multiplier: 1.5, duration: HOUR },
  { id: "icecream", name: "Мороженое", emoji: "🍦", satiety: 30, priceFactor: 10000, multiplier: 1, duration: 0 },
  { id: "pastry", name: "Пирожное", emoji: "🍰", satiety: 40, priceFactor: 100000, multiplier: 2, duration: HOUR },
  { id: "cake", name: "Торт", emoji: "🎂", satiety: 100, priceFactor: 1000000, multiplier: 3, duration: 2 * HOUR },
  { id: "elixir", name: "Эликсир", emoji: "🧪", satiety: 100, priceFactor: 10000000, multiplier: 4, duration: 3 * HOUR },
  { id: "apple", name: "Зол. яблоко", emoji: "🍎", satiety: 100, priceFactor: 100000000, multiplier: 6, duration: 5 * HOUR },
  { id: "cherry", name: "Вишня", emoji: "🍒", satiety: 15, priceFactor: 5000, multiplier: 1, duration: 0 },
  { id: "pizza", name: "Пицца", emoji: "🍕", satiety: 60, priceFactor: 200000, multiplier: 2, duration: 1.5 * HOUR },
  { id: "sushi", name: "Суши", emoji: "🍣", satiety: 80, priceFactor: 500000, multiplier: 2.5, duration: 2 * HOUR },
  { id: "burger", name: "Бургер", emoji: "🍔", satiety: 70, priceFactor: 300000, multiplier: 2, duration: 1.5 * HOUR },
  { id: "shawarma", name: "Шаурма", emoji: "🌯", satiety: 90, priceFactor: 800000, multiplier: 3, duration: 2 * HOUR }
];

const starShopItems = [
  { id: "crystals_1", name: "Пачка кристаллов", emoji: "💎", price: 1, desc: "+10 000 000 кристаллов" },
  { id: "energy_full", name: "Полный заряд", emoji: "⚡", price: 1, desc: "Восстановление энергии" },
  { id: "boost_24h", name: "Мега Буст ×5", emoji: "🔥", price: 5, desc: "Доход ×5 на 24 часа" },
  { id: "crystals_mega", name: "Гора кристаллов", emoji: "🏔️", price: 50, desc: "+10 триллионов" },
  { id: "upgrade_zeus", name: "Прокачка Зевса", emoji: "⬆️", price: 200, desc: "Зевс получает 10 ур." },
  { id: "zeus_vip", name: "Зевс VIP", emoji: "🐈‍⬛", price: 5000, desc: "Самый мощный питомец" }
];

const chests = [
  { id: "bronze", name: "Бронзовый", cost: 1000000, color: "#d97706", emoji: "📦" },
  { id: "silver", name: "Серебряный", cost: 10000000, color: "#94a3b8", emoji: "🎁" },
  { id: "gold", name: "Золотой", cost: 100000000, color: "#fbbf24", emoji: "👑" }
];

const allQuests = [
  { id: "taps100", text: "Сделать 100 тапов", target: 100, type: "taps", reward: 5000000 },
  { id: "taps500", text: "Сделать 500 тапов", target: 500, type: "taps", reward: 25000000 },
  { id: "buy5", text: "Купить 5 бизнесов", target: 5, type: "buys", reward: 10000000 },
  { id: "feed3", text: "Покормить питомца 3 раза", target: 3, type: "feeds", reward: 15000000 },
  { id: "game1", text: "Сыграть в аркаду", target: 1, type: "games", reward: 20000000 }
];

const battlePassRewards = Array.from({length: 30}, (_, i) => {
  const lvl = i + 1;
  if (lvl === 10) return { lvl, type: "stars", val: 10, emoji: "⭐" };
  if (lvl === 20) return { lvl, type: "stars", val: 25, emoji: "⭐" };
  if (lvl === 30) return { lvl, type: "stars", val: 50, emoji: "⭐" };
  if (lvl % 5 === 0) return { lvl, type: "boost", val: 1 * HOUR, emoji: "🔥" };
  if (lvl % 3 === 0) return { lvl, type: "energy", val: MAX_ENERGY, emoji: "⚡" };
  return { lvl, type: "crystals", val: Math.floor(1000000 * Math.pow(1.6, i)), emoji: "💎" };
});

const socialQuests = [
  { id: "tg_main", name: "Подпишись на канал AVAR1T1A", emoji: "📢", url: "https://t.me/avar1t1a", reward: 5 },
  { id: "tiktok", name: "Подпишись на TikTok", emoji: "🎵", url: "https://tiktok.com/@avar1t1a", reward: 5 },
  { id: "youtube", name: "Подпишись на YouTube", emoji: "▶️", url: "https://youtube.com/@avar1t1a", reward: 5 },
  { id: "tg_chat", name: "Вступи в чат игроков", emoji: "💬", url: "https://t.me/avar1t1a_chat", reward: 10 }
];

const fakeClans = [
  { id: 1, name: "Neon Wolves", emoji: "🐺", minIncome: 1000000, baseScore: 50000000, color: "#00f0ff" },
  { id: 2, name: "Cyber Kings", emoji: "👑", minIncome: 5000000, baseScore: 200000000, color: "#ff003c" },
  { id: 3, name: "Void Hackers", emoji: "💀", minIncome: 10000000, baseScore: 800000000, color: "#b69aff" },
  { id: 4, name: "Ghost Protocol", emoji: "👻", minIncome: 50000000, baseScore: 3000000000, color: "#34d399" },
  { id: 5, name: "Zero Day", emoji: "🕳️", minIncome: 100000000, baseScore: 12000000000, color: "#f59e0b" }
];

const achievementsList = [
  { id: "tap1000", title: "Тапальщик", desc: "1000 тапов", icon: "🥉" },
  { id: "biz10", title: "Бизнесмен", desc: "10 уровней бизнесов", icon: "💼" },
  { id: "pet1", title: "Зоолог", desc: "Купить 1 питомца", icon: "🐾" },
  { id: "rich", title: "Миллионер", desc: "1M кристаллов", icon: "💰" },
  { id: "hacker", title: "Хакер", desc: "Пройти взлом", icon: "💀" },
  { id: "gamer", title: "Геймер", desc: "Сыграть в аркаду", icon: "🎮" }
];

const fakePlayers = [
  { name: "Neo_2077", baseIncome: 5000000 },
  { name: "CryptoKing", baseIncome: 3500000 },
  { name: "CyberPunk", baseIncome: 2000000 },
  { name: "V_Netrunner", baseIncome: 1200000 },
  { name: "Alt_2077", baseIncome: 800000 }
];

const $ = id => document.getElementById(id);
const format = (v) => {
  if (!Number.isFinite(v)) return "—";
  for (const [size, suffix] of [[1e15, "Q"], [1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]]) {
    if (Math.abs(v) >= size) return String(Math.trunc(v / size * 100) / 100) + suffix;
  }
  return String(Math.trunc(v));
};

const _animIds = new WeakMap();
function animateValue(obj, start, end, duration) {
  if (!obj) return;
  const prevId = _animIds.get(obj);
  if (prevId) cancelAnimationFrame(prevId);
  if (start === end) { obj.textContent = format(end); _animIds.delete(obj); return; }
  const startTime = performance.now();
  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const current = Math.round(start + (end - start) * progress);
    obj.textContent = format(current);
    if (progress < 1) _animIds.set(obj, requestAnimationFrame(step));
    else _animIds.delete(obj);
  };
  _animIds.set(obj, requestAnimationFrame(step));
}

function spawnHearts(count, emoji) {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "heart-particle";
    el.textContent = emoji;
    const dx  = (Math.random() - 0.5) * 320;
    const dy  = Math.random() * 220;
    const rot = (Math.random() - 0.5) * 120;
    const delay = Math.random() * 0.4;
    const size  = 20 + Math.random() * 24;
    el.style.left = cx + "px";
    el.style.top  = cy + "px";
    el.style.fontSize = size + "px";
    el.style.animationDelay = delay + "s";
    el.style.setProperty("--dx",  dx  + "px");
    el.style.setProperty("--dy",  dy  + "px");
    el.style.setProperty("--rot", rot + "deg");
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }
}

const defaultState = {
  crystals: 0, stars: 0, energy: MAX_ENERGY, tapLevel: 1, prestigeLevel: 0,
  ownedPets: [], activePetId: null, satiety: MAX_SATIETY, satietyUpdatedAt: Date.now(),
  foodInventory: { bone: 0, steak: 0, icecream: 0, pastry: 0, cake: 0, elixir: 0, apple: 0, cherry: 0, pizza: 0, sushi: 0, burger: 0, shawarma: 0 },
  lastAdRewardAt: 0, lastHackEventAt: 0, lastBlackMarketDay: 0, blackMarketOpens: 0, lastLotteryAt: 0, lastWheelAt: 0,
  autoClickerUntil: 0, overdriveUntil: 0, lastOverdriveAt: 0, boostUntil: 0, megaBoostUntil: 0, foodBuffUntil: 0, foodBuffMultiplier: 1,
  dailyQuestsDate: 0, dailyQuests: [],
  lastLoginAt: 0, loginStreak: 0,
  lastChestAt: 0, chestStreak: 0,
  comboBoostUntil: 0,
  petOfDayDate: 0, petOfDayId: null,
  tutorialStep: 0,
  bpLevel: 0, bpXP: 0, bpClaimed: [], bpDayDate: 0, bpDayXP: 0,
  socialClaimed: [],
  clanId: null,
  stealDayDate: 0, stealsToday: 0, shieldUntil: 0,
  totalEarned: 0, totalGames: 0, totalTaps: 0,
  singularityCores: 0,
  prestigeUpgrades: { cyberHand: 0, neuroBoost: 0, megaOverdrive: 0, richStart: 0 },
  arcadeRecords: { arcade: 0, shooter: 0 },
  quests: { taps: 0, buys: 0, feeds: 0, games: 0, claimed: [] },
  achievements: [],
  bizLevels: [], petLevels: [], usedPromos: [],
  bgs: {
    street: { owned: true,  selected: true,  adFragments: 0, adGoal: 3,  starPrice: 0,  crystalPrice: 0 },
    office: { owned: false, selected: false, adFragments: 0, adGoal: 5,  starPrice: 25, crystalPrice: 10000000 },
    cosmos: { owned: false, selected: false, adFragments: 0, adGoal: 10, starPrice: 50, crystalPrice: 50000000 }
  },
  lastAccrual: Date.now()
};

const state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || JSON.parse(JSON.stringify(defaultState));

if (state.totalTaps === undefined) state.totalTaps = state.quests?.taps || 0;
if (state.singularityCores === undefined) state.singularityCores = 0;
if (!state.prestigeUpgrades) state.prestigeUpgrades = { cyberHand: 0, neuroBoost: 0, megaOverdrive: 0, richStart: 0 };
if (!state.arcadeRecords) state.arcadeRecords = { arcade: 0, shooter: 0 };
if (!state.quests) state.quests = { taps: 0, buys: 0, feeds: 0, games: 0, claimed: [] };
if (!state.usedPromos) state.usedPromos = [];
if (!state.bizLevels) state.bizLevels = [];
if (!state.petLevels) state.petLevels = [];
if (state.lastChestAt === undefined) state.lastChestAt = 0;
if (state.chestStreak === undefined) state.chestStreak = 0;
if (state.comboBoostUntil === undefined) state.comboBoostUntil = 0;
if (state.petOfDayDate === undefined) state.petOfDayDate = 0;
if (state.petOfDayId === undefined) state.petOfDayId = null;
if (state.tutorialStep === undefined) state.tutorialStep = state.totalTaps > 0 ? 4 : 0;
if (state.bpLevel === undefined) state.bpLevel = 0;
if (state.bpXP === undefined) state.bpXP = 0;
if (!state.bpClaimed) state.bpClaimed = [];
if (state.bpDayDate === undefined) state.bpDayDate = 0;
if (state.bpDayXP === undefined) state.bpDayXP = 0;
if (!state.socialClaimed) state.socialClaimed = [];
if (state.clanId === undefined) state.clanId = null;
if (state.stealDayDate === undefined) state.stealDayDate = 0;
if (state.stealsToday === undefined) state.stealsToday = 0;
if (state.shieldUntil === undefined) state.shieldUntil = 0;

if (!state.bgs || typeof state.bgs !== 'object') {
  state.bgs = JSON.parse(JSON.stringify(defaultState.bgs));
} else {
  for (const id in defaultState.bgs) {
    if (!state.bgs[id]) {
      state.bgs[id] = JSON.parse(JSON.stringify(defaultState.bgs[id]));
    } else {
      for (const k in defaultState.bgs[id]) {
        if (state.bgs[id][k] === undefined) state.bgs[id][k] = defaultState.bgs[id][k];
      }
    }
  }
}
if (!Object.values(state.bgs).some(b => b.selected)) {
  state.bgs.street.selected = true;
  state.bgs.street.owned = true;
}

businesses.forEach((b, i) => b.level = state.bizLevels[i] ?? 0);
pets.forEach((p, i) => p.level = state.petLevels[i] ?? 0);

const RARITY_INFO = {
  common:    { label: "Обычный",     color: "#94a3b8", bonus: 1.0 },
  rare:      { label: "Редкий",      color: "#3b82f6", bonus: 1.2 },
  epic:      { label: "Эпический",   color: "#a855f7", bonus: 1.5 },
  legendary: { label: "Легендарный", color: "#f59e0b", bonus: 2.0 },
  mythic:    { label: "Мифический",  color: "#ec4899", bonus: 3.0 }
};

function syncLevelsToState() {
  state.bizLevels = businesses.map(b => b.level);
  state.petLevels = pets.map(p => p.level);
}

function initDailyQuests() {
  const today = new Date().setHours(0,0,0,0);
  if (state.dailyQuestsDate !== today) {
    state.dailyQuestsDate = today;
    state.quests.taps = 0;
    state.quests.buys = 0;
    state.quests.feeds = 0;
    state.quests.games = 0;
    state.quests.claimed = []; 
    const shuffled = [...allQuests].sort(() => 0.5 - Math.random());
    state.dailyQuests = shuffled.slice(0, 3).map(q => q.id);
    return true;
  }
  return false;
}

function initPetOfDay() {
  const today = new Date().setHours(0,0,0,0);
  if (state.petOfDayDate !== today) {
    state.petOfDayDate = today;
    const pool = state.ownedPets.length > 0 ? state.ownedPets : pets.slice(0, 10).map(p => p.id);
    state.petOfDayId = pool[Math.floor(Math.random() * pool.length)];
    return true;
  }
  return false;
}

function showTutorial() {
  if (state.tutorialStep >= 4) return;
  const steps = [
    { title: "👋 Добро пожаловать в AVAR1T1A!", text: "Тапни кота 10 раз, чтобы заработать первые 💎" },
    { title: "🛒 Купи первый бизнес", text: "Зайди в 'Прокачка' и купи 'Кофе' за 250K 💎" },
    { title: "🎁 Забери сундук", text: "Нажми на золотую кнопку 'СУНДУК' на главной" },
    { title: "🎮 Попробуй аркаду!", text: "Открой 'Задания' → 'КИБЕР-ЛОВЕЦ'. Это весело!" }
  ];
  const s = steps[state.tutorialStep];
  if (!s) return;
  $("modal-title").textContent = "📖 ОБУЧЕНИЕ";
  $("modal-body").innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <h2 style="font-size: 22px; margin-bottom: 10px;">${s.title}</h2>
      <p style="font-size: 15px; color: var(--cyan); margin-bottom: 20px; line-height: 1.5;">${s.text}</p>
      <div style="font-size: 12px; color: var(--muted); margin-bottom: 15px;">Шаг ${state.tutorialStep + 1} из 4</div>
      <button class="btn btn-gold" onclick="$('modal').close()">ПОНЯЛ</button>
    </div>
  `;
  if (!$("modal").open) $("modal").showModal();
}

initDailyQuests();
initPetOfDay();

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

(function checkReferralBonus() {
  const applyBonus = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const startParam = (window.Telegram?.WebApp?.initDataUnsafe?.start_param) || urlParams.get('startapp') || urlParams.get('ref');
      const myId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!startParam) return;
      if (myId !== undefined && String(startParam) === String(myId)) return;
      const refKey = `avar_ref_bonus_${startParam}`;
      if (localStorage.getItem(refKey)) return;
      localStorage.setItem(refKey, '1');
      state.crystals += 1000000;
      state.totalEarned = (state.totalEarned || 0) + 1000000;
      save();
      if (typeof render === 'function') { try { render(); } catch(_){} }
      setTimeout(() => toast("👋 Тебя пригласил друг! Бонус +1M 💎"), 2000);
    } catch(e) { console.warn('Referral error:', e); }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBonus);
  } else {
    applyBonus();
  }
})();

function activePet() { return pets.find(p => p.id === state.activePetId); }

function getSynergyText(p) {
  if (!p) return "";
  if (p.id === 1) return "⚡ +20% к Кофейне";
  if (p.id === 4) return "⚡ +50% к IT-Компании";
  if (p.id === 10) return "⚡ +50% к Банку";
  return "";
}

function getIncome() {
  const p = activePet();
  const isPetOfDay = p && p.id === state.petOfDayId;
  const rarityBonus = p ? (RARITY_INFO[p.rarity]?.bonus || 1) : 1;
  const petInc = p ? p.income * (1 + 0.1 * p.level) * (isPetOfDay ? 3 : 1) * rarityBonus : 0;
  let bizInc = businesses.reduce((s, b) => s + b.income * b.level, 0);
  if (p && p.id === 1) bizInc += businesses[4].income * businesses[4].level * 0.2;
  if (p && p.id === 4) bizInc += businesses[11].income * businesses[11].level * 0.5;
  if (p && p.id === 10) bizInc += businesses[14].income * businesses[14].level * 0.5;
  const hunger = state.satiety < HUNGRY_THRESHOLD ? 0.5 : 1;
  const prestigeMult = 1 + (state.prestigeLevel || 0) * 0.5;
  const normalPets = pets.filter(pp => pp.id <= 10);
  const collectionBonus = normalPets.every(pp => state.ownedPets.includes(pp.id)) ? 2 : 1;
  const neuroBoost = 1 + (state.prestigeUpgrades.neuroBoost || 0) * 0.2;
  const megaBoost = (state.megaBoostUntil && Date.now() < state.megaBoostUntil) ? 5 : 1;
  const adBoost = (state.boostUntil && Date.now() < state.boostUntil) ? 2 : 1;
  const foodBoost = (state.foodBuffUntil && Date.now() < state.foodBuffUntil) ? state.foodBuffMultiplier : 1;
  return (bizInc + petInc) * 10 * hunger * prestigeMult * megaBoost * adBoost * foodBoost * collectionBonus * neuroBoost;
}

function getTapReward() {
  const cyberHandBonus = 1 + (state.prestigeUpgrades.cyberHand || 0) * 0.5;
  let reward = (1 + state.tapLevel * 1.2) * cyberHandBonus;
  if (state.overdriveUntil > Date.now()) reward *= 10;
  if (state.comboBoostUntil > Date.now()) reward *= 2;
  return Math.floor(reward);
}

let _lastBalanceShown = null;
function renderHud() {
  if (_lastBalanceShown === null) {
    _lastBalanceShown = state.crystals;
    $("balance").textContent = format(state.crystals);
  } else if (_lastBalanceShown !== state.crystals) {
    animateValue($("balance"), _lastBalanceShown, state.crystals, 400);
    _lastBalanceShown = state.crystals;
  }
  $("stars").textContent = format(state.stars);
  $("income").textContent = format(getIncome());
  $("energy").textContent = state.energy;
  $("energy-bar").value = state.energy;
  if (state.comboBoostUntil > Date.now()) {
    $("tap-reward").textContent = `+${getTapReward()} 💎 (×2 КОМБО!)`;
    $("tap-reward").style.color = "var(--gold)";
  } else {
    $("tap-reward").textContent = `+${getTapReward()} 💎 ЗА ТАП`;
    $("tap-reward").style.color = "var(--cyan)";
  }
  if (Date.now() < state.autoClickerUntil) {
    $("auto-btn").classList.add("active");
    $("auto-btn").textContent = `🤖 (${Math.ceil((state.autoClickerUntil - Date.now())/1000)}с)`;
  } else {
    $("auto-btn").classList.remove("active");
    $("auto-btn").textContent = `🤖 АВТО (5м)`;
  }
  if (Date.now() < state.overdriveUntil) {
    $("overdrive-btn").disabled = true;
    $("overdrive-btn").textContent = `🔥 (${Math.ceil((state.overdriveUntil - Date.now())/1000)}с)`;
  } else if (state.lastOverdriveAt && Date.now() - state.lastOverdriveAt < 2 * MINUTE) {
    $("overdrive-btn").disabled = true;
    $("overdrive-btn").textContent = `🔥 ОТКАТ (${Math.ceil((state.lastOverdriveAt + 2*MINUTE - Date.now())/1000)}с)`;
  } else {
    $("overdrive-btn").disabled = false;
    $("overdrive-btn").textContent = `🔥 ОВЕРДРАЙВ`;
  }
  const chestToday = state.lastChestAt && new Date(state.lastChestAt).setHours(0,0,0,0) === new Date().setHours(0,0,0,0);
  if ($("chest-label")) $("chest-label").textContent = chestToday ? "СУНДУК ОТКРЫТ ✓" : `СУНДУК (стрик ${state.chestStreak}/7)`;
  if ($("bp-badge")) $("bp-badge").textContent = `${state.bpLevel}/30`;
  if ($("social-badge")) $("social-badge").textContent = `${state.socialClaimed.length}/4`;
  if ($("steal-badge")) {
    const today = new Date().setHours(0,0,0,0);
    const stealsLeft = state.stealDayDate === today ? Math.max(0, 3 - state.stealsToday) : 3;
    $("steal-badge").textContent = `${stealsLeft}/3`;
  }
}

function settle() {
  const now = Date.now();
  const elapsed = (now - state.lastAccrual) / 1000;
  if (elapsed > 0) {
    if (initDailyQuests()) { save(); toast("🎯 Новые ежедневные задания!"); }
    if (initPetOfDay()) { save(); toast("🐾 Новый питомец дня!"); }
    state.crystals += Math.floor(getIncome() * elapsed);
    state.totalEarned += Math.floor(getIncome() * elapsed);
    state.energy = Math.min(MAX_ENERGY, state.energy + Math.floor(elapsed));
    let autoTaps = 0;
    if (state.autoClickerUntil > state.lastAccrual) {
      const autoEndTime = Math.min(now, state.autoClickerUntil);
      const autoElapsed = autoEndTime - state.lastAccrual;
      if (autoElapsed > 0) autoTaps = Math.floor(autoElapsed / 1000);
    }
    if (autoTaps > 0) {
      const realTaps = Math.min(autoTaps, state.energy); 
      if (realTaps > 0) {
        state.energy -= realTaps;
        let overdriveActiveTaps = 0;
        if (state.overdriveUntil > state.lastAccrual) {
           const overdriveEndTime = Math.min(autoEndTime, state.overdriveUntil);
           overdriveActiveTaps = Math.floor((overdriveEndTime - state.lastAccrual) / 1000);
        }
        overdriveActiveTaps = Math.min(overdriveActiveTaps, realTaps);
        const normalTaps = realTaps - overdriveActiveTaps;
        const cyberHandBonus = 1 + (state.prestigeUpgrades.cyberHand || 0) * 0.5;
        const baseReward = Math.floor((1 + state.tapLevel * 1.2) * cyberHandBonus);
        const earned = (normalTaps * baseReward) + (overdriveActiveTaps * baseReward * 10);
        state.crystals += earned;
        state.totalEarned += earned;
        state.quests.taps += realTaps;
        state.totalTaps += realTaps;
      }
    }
    const satietySteps = Math.floor((now - state.satietyUpdatedAt) / SATIETY_INTERVAL);
    if (satietySteps > 0) {
      state.satiety = Math.max(0, state.satiety - satietySteps);
      state.satietyUpdatedAt += satietySteps * SATIETY_INTERVAL;
    }
    state.lastAccrual = now;
    renderHud();
  }
}

let _currentBg = '';
const BG_GRADIENT = {
  street: 'radial-gradient(circle at 50% 0%, #0a1f2c 0%, #090b14 70%)',
  office: 'radial-gradient(circle at 50% 0%, #1e1338 0%, #090b14 70%)',
  cosmos: 'radial-gradient(circle at 50% 0%, #3a0a3a 0%, #090b14 70%)'
};
function updateBackground() {
  let bgId = 'street';
  for (const id in state.bgs) {
    if (state.bgs[id].selected) { bgId = id; break; }
  }
  if (_currentBg === bgId) return;
  _currentBg = bgId;
  const file = BG_META[bgId]?.file || 'bg_street.jpg';
  const img = new Image();
  img.src = file;
  img.onload = () => {
    document.body.style.backgroundImage = `url('${file}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
  };
  img.onerror = () => {
    document.body.style.backgroundImage = BG_GRADIENT[bgId] || BG_GRADIENT.street;
  };
}

let _bgAdInProgress = false;

function renderBgShop() {
  const container = $("bg-shop-list");
  if (!container) return;
  
  let html = "";
  for (const bgId in state.bgs) {
    const bg = state.bgs[bgId];
    const meta = BG_META[bgId];
    if (!meta) continue;
    
    const isSelected = bg.selected;
    const isOwned = bg.owned;
    const previewBg = `background-image: url('${meta.file}'); background-size: cover; background-position: center; background-color: #1e1338;`;
    
    let statusBadge = "";
    if (isSelected) {
      statusBadge = `<div style="position: absolute; top: 8px; right: 8px; padding: 3px 8px; background: rgba(255,219,131,0.25); border: 1px solid var(--gold); border-radius: 99px; font-size: 9px; font-weight: 900; color: var(--gold); backdrop-filter: blur(4px);">★ АКТИВЕН</div>`;
    } else if (isOwned) {
      statusBadge = `<div style="position: absolute; top: 8px; right: 8px; padding: 3px 8px; background: rgba(52,211,153,0.2); border: 1px solid #34d399; border-radius: 99px; font-size: 9px; font-weight: 900; color: #34d399; backdrop-filter: blur(4px);">✓ КУПЛЕНО</div>`;
    }
    
    let progressHtml = "";
    if (!isOwned) {
      const pct = Math.min(100, (bg.adFragments / bg.adGoal) * 100);
      progressHtml = `
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin: 8px 0 4px;">
          <span style="color: var(--muted);">🧩 Осколки фона</span>
          <span style="color: var(--gold);">${bg.adFragments} / ${bg.adGoal}</span>
        </div>
        <progress value="${bg.adFragments}" max="${bg.adGoal}" style="margin-bottom: 8px;"></progress>
      `;
    }
    
    let buttonsHtml = "";
    if (isOwned) {
      if (isSelected) {
        buttonsHtml = `<button class="btn btn-gold" disabled style="margin-top: 8px; font-size: 12px;">★ АКТИВЕН</button>`;
      } else {
        buttonsHtml = `<button class="btn btn-green" onclick="selectBg('${bgId}')" style="margin-top: 8px; font-size: 12px;">ВЫБРАТЬ</button>`;
      }
    } else {
      buttonsHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 8px;">
          <button class="btn btn-purple" onclick="watchAdForBg('${bgId}')" style="padding: 8px 4px; font-size: 10px; letter-spacing: 0;">🎬 Реклама</button>
          <button class="btn btn-green" onclick="buyBgWithCrystals('${bgId}')" style="padding: 8px 4px; font-size: 10px; letter-spacing: 0;">💎 ${format(bg.crystalPrice)}</button>
          <button class="btn btn-gold" onclick="buyBgWithStars('${bgId}')" style="padding: 8px 4px; font-size: 10px; letter-spacing: 0;">⭐ ${bg.starPrice}</button>
        </div>
      `;
    }
    
    html += `
      <div class="card" style="padding: 10px; margin-bottom: 10px; border-color: ${isSelected ? 'var(--gold)' : (isOwned ? 'rgba(52,211,153,0.6)' : 'rgba(255,255,255,0.1)')}; ${isSelected ? 'box-shadow: 0 0 20px rgba(255,219,131,0.4);' : ''}">
        <div style="position: relative; height: 78px; border-radius: 10px; overflow: hidden; ${previewBg}">
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(10,15,24,0.9) 100%);"></div>
          ${statusBadge}
          <div style="position: absolute; bottom: 6px; left: 10px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 22px; filter: drop-shadow(0 0 6px rgba(0,0,0,0.8));">${meta.emoji}</span>
            <span style="font-weight: 900; font-size: 15px; text-shadow: 0 0 8px black; color: #fff;">${meta.name}</span>
          </div>
        </div>
        ${progressHtml}
        ${buttonsHtml}
      </div>
    `;
  }
  container.innerHTML = html;
}

window.watchAdForBg = (bgId) => {
  const bg = state.bgs[bgId];
  if (!bg || bg.owned) return;
  if (bg.adFragments >= bg.adGoal) return;
  if (_bgAdInProgress) return toast("🎬 Реклама уже загружается...");
  
  _bgAdInProgress = true;
  console.log("Show Adsgram ad");
  toast("🎬 Реклама загружается...");
  
  setTimeout(() => {
    _bgAdInProgress = false;
    bg.adFragments++;
    
    if (bg.adFragments >= bg.adGoal) {
      bg.owned = true;
      soundWin();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
      $("modal-title").textContent = "🎉 ФОН РАЗБЛОКИРОВАН!";
      $("modal-body").innerHTML = `
        <div style="text-align: center; padding: 25px;">
          <div style="font-size: 60px; margin-bottom: 12px;">${BG_META[bgId].emoji}</div>
          <h2 style="color: var(--gold); font-size: 22px; margin-bottom: 8px;">${BG_META[bgId].name}</h2>
          <p style="font-size: 14px; color: var(--cyan); margin-bottom: 20px;">Ты собрал все ${bg.adGoal} осколков!</p>
          <button class="btn btn-gold" onclick="$('modal').close(); selectBg('${bgId}')">ПРИМЕНИТЬ СРАЗУ</button>
          <button class="btn btn-green" style="margin-top: 8px;" onclick="$('modal').close()">ПОЗЖЕ</button>
        </div>
      `;
      if (!$("modal").open) $("modal").showModal();
    } else {
      soundTap();
      tg?.HapticFeedback?.notificationOccurred('success');
      toast(`🎬 +1 осколок! (${bg.adFragments}/${bg.adGoal})`);
    }
    save();
    renderBgShop();
  }, 1800);
};

window.buyBgWithCrystals = (bgId) => {
  const bg = state.bgs[bgId];
  if (!bg || bg.owned) return;
  if (state.crystals < bg.crystalPrice) {
    return toast(`Нужно ${format(bg.crystalPrice)} 💎`);
  }
  state.crystals -= bg.crystalPrice;
  bg.owned = true;
  soundWin();
  tg?.HapticFeedback?.notificationOccurred('success');
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  toast(`🎉 Фон "${BG_META[bgId].name}" куплен!`);
  save();
  renderBgShop();
  renderHud();
};

window.buyBgWithStars = (bgId) => {
  const bg = state.bgs[bgId];
  if (!bg || bg.owned) return;
  if (state.stars < bg.starPrice) {
    return toast(`Нужно ${bg.starPrice} ⭐`);
  }
  state.stars -= bg.starPrice;
  bg.owned = true;
  soundWin();
  tg?.HapticFeedback?.notificationOccurred('success');
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  toast(`🎉 Фон "${BG_META[bgId].name}" куплен за ${bg.starPrice} ⭐!`);
  save();
  renderBgShop();
  renderHud();
};

window.selectBg = (bgId) => {
  const bg = state.bgs[bgId];
  if (!bg || !bg.owned) return;
  if (bg.selected) return;
  for (const id in state.bgs) state.bgs[id].selected = false;
  bg.selected = true;
  _currentBg = '';
  updateBackground();
  soundWin();
  toast(`🖼️ Фон "${BG_META[bgId].name}" применён`);
  save();
  renderBgShop();
};

let comboCount = 0;
let comboTimer = null;
function handleCombo() {
  comboCount++;
  const display = $("combo-display");
  display.textContent = `x${comboCount}`;
  display.classList.add("combo-active");
  clearTimeout(comboTimer);
  comboTimer = setTimeout(() => {
    comboCount = 0;
    display.classList.remove("combo-active");
  }, 1500);
  if (comboCount >= 10 && state.comboBoostUntil < Date.now()) {
    state.comboBoostUntil = Date.now() + 5000;
    toast("⚡ КОМБО ×2 НА 5 СЕК!");
    soundWin();
    if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
    save();
  }
}

function checkAchievements() {
  const unlock = (id) => {
    if (!state.achievements.includes(id)) {
      state.achievements.push(id);
      state.stars += 1; 
      toast(`🏅 Достижение: ${achievementsList.find(a=>a.id===id).title} (+1 ⭐)`);
      soundWin();
      save();
    }
  };
  if (state.totalTaps >= 1000) unlock("tap1000");
  if (businesses.reduce((s,b)=>s+b.level,0) >= 10) unlock("biz10");
  if (state.ownedPets.length >= 1) unlock("pet1");
  if (state.crystals >= 1000000) unlock("rich");
  if (state.totalGames >= 1) unlock("gamer");
}

let toastTimer = null;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.hidden = true, 3000);
}

function showWin(msg) {
  const winDiv = $("modal-win-msg");
  if ($("modal").open) {
    winDiv.textContent = msg;
    winDiv.hidden = false;
    setTimeout(() => { winDiv.hidden = true; }, 4000);
  } else { toast(msg); }
}

function checkDailyLogin() {
  const now = Date.now();
  const today = new Date().setHours(0,0,0,0);
  const lastDay = state.lastLoginAt ? new Date(state.lastLoginAt).setHours(0,0,0,0) : 0;
  const daysDiff = lastDay ? Math.round((today - lastDay) / DAY) : 999;
  if (state.lastLoginAt === 0 || daysDiff >= 1) {
      if (daysDiff >= 2 || state.lastLoginAt === 0) state.loginStreak = 1;
      else state.loginStreak++;
      state.lastLoginAt = now;
      let rewardText = "", rewardAmt = 0;
      if (state.loginStreak === 1) { rewardAmt = 1000000; rewardText = "1M 💎"; }
      else if (state.loginStreak === 2) { rewardAmt = 5000000; rewardText = "5M 💎"; }
      else if (state.loginStreak === 3) { state.stars += 1; rewardText = "1 ⭐"; }
      else if (state.loginStreak >= 7) { 
          rewardAmt = 50000000; 
          rewardText = "50M 💎 + Мега Буст!";
          state.megaBoostUntil = now + DAY;
          state.loginStreak = 0;
      } else { rewardAmt = 10000000; rewardText = "10M 💎"; }
      if (rewardAmt > 0) { state.crystals += rewardAmt; state.totalEarned += rewardAmt; }
      save();
      $("modal-title").textContent = "🎁 ЕЖЕДНЕВНЫЙ ВХОД";
      $("modal-body").innerHTML = `
          <div style="text-align: center; padding: 20px;">
              <h2 style="font-size: 40px; margin-bottom: 10px;">🔥</h2>
              <p style="font-size: 18px; margin-bottom: 5px;">Серия: <b>${state.loginStreak} дней</b></p>
              <p style="font-size: 20px; margin-bottom: 20px; color: var(--gold); font-weight: bold;">Награда: ${rewardText}</p>
              <button class="btn btn-gold" onclick="$('modal').close()">ЗАБРАТЬ</button>
          </div>
      `;
      if (!$("modal").open) $("modal").showModal();
  }
}

function addBPXP(amount) {
  if (state.bpLevel >= 30) return;
  const today = new Date().setHours(0,0,0,0);
  if (state.bpDayDate !== today) {
    state.bpDayDate = today;
    state.bpDayXP = 0;
  }
  if (state.bpDayXP >= 800) return;
  const realAmount = Math.min(amount, 800 - state.bpDayXP);
  state.bpXP += realAmount;
  state.bpDayXP += realAmount;
  let xpNeeded = 100 + state.bpLevel * 50;
  while (state.bpXP >= xpNeeded && state.bpLevel < 30) {
    state.bpXP -= xpNeeded;
    state.bpLevel++;
    xpNeeded = 100 + state.bpLevel * 50;
    toast(`🎫 Battle Pass: Уровень ${state.bpLevel}!`);
    soundWin();
  }
  save();
  renderHud();
}

window.openBattlePass = () => {
  const xpNeeded = 100 + state.bpLevel * 50;
  $("modal-title").textContent = "🎫 BATTLE PASS";
  let html = `
    <div style="text-align: center; padding: 15px; background: rgba(0,240,255,0.1); border-radius: 12px; margin-bottom: 15px;">
      <div style="font-size: 36px; font-weight: 900; color: var(--cyan); text-shadow: 0 0 20px var(--cyan);">${state.bpLevel} / 30</div>
      <progress value="${state.bpXP}" max="${xpNeeded}" style="margin-top: 10px;"></progress>
      <div style="font-size: 11px; color: var(--muted); margin-top: 5px;">${state.bpXP} / ${xpNeeded} XP (${state.bpDayXP}/800 сегодня)</div>
    </div>`;
  battlePassRewards.forEach(r => {
    const unlocked = state.bpLevel >= r.lvl;
    const claimed = state.bpClaimed.includes(r.lvl);
    const canClaim = unlocked && !claimed;
    html += `
      <div class="card" style="padding: 10px; ${unlocked ? 'border-color: var(--cyan);' : 'opacity: 0.5;'}">
        <div class="card-top">
          <div class="icon">${r.emoji}</div>
          <div class="card-info">
            <div class="card-name">Уровень ${r.lvl}</div>
            <div class="card-income">${r.type === 'crystals' ? format(r.val) + ' 💎' : r.type === 'stars' ? r.val + ' ⭐' : r.type === 'energy' ? 'Полный заряд' : 'Буст ×2 (1ч)'}</div>
          </div>
          ${canClaim ? `<button class="btn btn-gold" style="width:auto; padding: 6px 12px; font-size:11px;" onclick="claimBP(${r.lvl})">ЗАБРАТЬ</button>` : claimed ? `<span style="color: #34d399; font-size: 20px;">✓</span>` : `<span style="color: var(--muted);">🔒</span>`}
        </div>
      </div>`;
  });
  $("modal-body").innerHTML = html;
  if (!$("modal").open) $("modal").showModal();
};

window.claimBP = (lvl) => {
  if (state.bpLevel < lvl || state.bpClaimed.includes(lvl)) return;
  const r = battlePassRewards.find(x => x.lvl === lvl);
  if (!r) return;
  state.bpClaimed.push(lvl);
  if (r.type === "crystals") { state.crystals += r.val; state.totalEarned += r.val; }
  if (r.type === "energy") state.energy = MAX_ENERGY;
  if (r.type === "boost") state.boostUntil = Date.now() + r.val;
  if (r.type === "stars") state.stars += r.val;
  soundWin();
  save(); render(); openBattlePass();
};

window.openSocial = () => {
  $("modal-title").textContent = "📱 СОЦ. ЗАДАНИЯ";
  let html = `<p style="font-size: 12px; color: var(--muted); text-align: center; margin-bottom: 15px;">Подпишись и забери звёзды. Одноразово.</p>`;
  socialQuests.forEach(q => {
    const claimed = state.socialClaimed.includes(q.id);
    html += `
      <div class="card" style="padding: 12px; ${claimed ? 'opacity: 0.5;' : 'border-color: var(--gold);'}">
        <div class="card-top">
          <div class="icon">${q.emoji}</div>
          <div class="card-info">
            <div class="card-name">${q.name}</div>
            <div class="card-income">+${q.reward} ⭐</div>
          </div>
          ${claimed 
            ? `<span style="color: #34d399; font-size: 20px;">✓</span>` 
            : `<button class="btn btn-gold" style="width:auto; padding: 6px 12px; font-size:11px;" onclick="claimSocial('${q.id}', '${q.url}', ${q.reward})">ПОЛУЧИТЬ</button>`
          }
        </div>
      </div>
    `;
  });
  $("modal-body").innerHTML = html;
  if (!$("modal").open) $("modal").showModal();
};

window.claimSocial = (id, url, reward) => {
  if (state.socialClaimed.includes(id)) return;
  window.open(url, "_blank");
  toast("Проверяем подписку...");
  setTimeout(() => {
    state.socialClaimed.push(id);
    state.stars += reward;
    soundWin();
    toast(`+${reward} ⭐ за подписку!`);
    save(); render(); openSocial();
  }, 5000);
};

window.openClans = () => {
  const myIncome = getIncome();
  const myClan = fakeClans.find(c => c.id === state.clanId);
  if (myClan) {
    $("modal-title").textContent = `🛡️ ${myClan.name}`;
    const totalScore = myClan.baseScore + myIncome * 3600;
    let html = `
      <div style="text-align: center; padding: 20px; background: rgba(0,240,255,0.1); border-radius: 12px; margin-bottom: 15px; border: 2px solid ${myClan.color};">
        <div style="font-size: 60px; margin-bottom: 10px;">${myClan.emoji}</div>
        <div style="font-size: 22px; font-weight: 900; color: ${myClan.color};">${myClan.name}</div>
        <div style="font-size: 14px; color: var(--muted); margin-top: 5px;">Общий счёт клана</div>
        <div style="font-size: 24px; font-weight: 900; color: var(--gold); margin-top: 5px;">${format(totalScore)}</div>
      </div>
      <a href="https://t.me/avar1t1a_chat" target="_blank" style="text-decoration: none;">
        <button class="btn btn-purple" style="margin-bottom: 10px;">💬 ОТКРЫТЬ ЧАТ КЛАНА</button>
      </a>
      <button class="btn btn-red" onclick="leaveClan()">ПОКИНУТЬ КЛАН</button>
    `;
    $("modal-body").innerHTML = html;
  } else {
    $("modal-title").textContent = "🛡️ КЛАНЫ";
    let html = `<p style="font-size: 12px; color: var(--muted); text-align: center; margin-bottom: 15px;">Вступи в клан, чтобы соревноваться с другими.</p>`;
    fakeClans.forEach(c => {
      const canJoin = myIncome >= c.minIncome;
      html += `
        <div class="card" style="border-color: ${c.color};">
          <div class="card-top">
            <div class="icon" style="border-color: ${c.color}; font-size: 28px;">${c.emoji}</div>
            <div class="card-info">
              <div class="card-name" style="color: ${c.color};">${c.name}</div>
              <div class="card-income">Мин. доход: ${format(c.minIncome)}/с</div>
              <div style="font-size: 11px; color: var(--gold); margin-top: 3px;">Очки: ${format(c.baseScore)}</div>
            </div>
            <button class="btn ${canJoin ? 'btn-green' : 'btn-red'}" style="width:auto; padding: 8px 14px; font-size:11px;" onclick="joinClan(${c.id})" ${canJoin ? '' : 'disabled'}>${canJoin ? 'ВСТУПИТЬ' : 'МАЛО 💎'}</button>
          </div>
        </div>
      `;
    });
    $("modal-body").innerHTML = html;
  }
  if (!$("modal").open) $("modal").showModal();
};

window.joinClan = (id) => {
  const c = fakeClans.find(x => x.id === id);
  if (!c) return;
  if (getIncome() < c.minIncome) return toast("Мало дохода!");
  state.clanId = id;
  soundWin();
  toast(`🛡️ Добро пожаловать в ${c.name}!`);
  save(); render(); openClans();
};

window.leaveClan = () => {
  if (!confirm("Точно покинуть клан?")) return;
  state.clanId = null;
  save(); render(); openClans();
};

window.openSteal = () => {
  const today = new Date().setHours(0,0,0,0);
  if (state.stealDayDate !== today) { state.stealDayDate = today; state.stealsToday = 0; }
  $("modal-title").textContent = "🤑 ВОРОВСТВО";
  const shieldActive = state.shieldUntil > Date.now();
  let html = `
    <div style="text-align: center; padding: 15px; background: rgba(255,0,60,0.1); border-radius: 10px; margin-bottom: 15px; border: 1px solid var(--magenta);">
      <div style="font-size: 11px; color: var(--muted);">Атак сегодня</div>
      <div style="font-size: 24px; font-weight: 900; color: var(--magenta);">${state.stealsToday} / 3</div>
      ${shieldActive ? `<div style="font-size: 12px; color: #34d399; margin-top: 5px;">🛡️ Щит до ${new Date(state.shieldUntil).toLocaleTimeString()}</div>` : ""}
    </div>
    <button class="btn btn-purple" style="margin-bottom: 15px;" onclick="buyShield()">🛡️ Купить щит (1⭐ на 24ч)</button>
  `;
  if (state.stealsToday >= 3) {
    html += `<p style="text-align: center; color: var(--muted); padding: 20px;">Лимит атак на сегодня исчерпан</p>`;
  } else {
    const baseIncome = Math.max(1000, getIncome());
    fakeClans.forEach((clan, i) => {
      const victimIncome = Math.min(1e15, Math.floor(baseIncome * (0.5 + ((i * 7 + state.stealsToday * 13) % 20) / 10)));
      html += `
        <div class="card" style="border-color: ${clan.color}; padding: 10px;">
          <div class="card-top">
            <div class="icon" style="border-color: ${clan.color};">${clan.emoji}</div>
            <div class="card-info">
              <div class="card-name">Игрок #${1000 + i}</div>
              <div class="card-income">Доход: ${format(victimIncome)}/с</div>
            </div>
            <button class="btn btn-red" style="width:auto; padding: 8px 14px; font-size:11px;" onclick="startSteal(${victimIncome}, '${clan.name}')">АТАКОВАТЬ</button>
          </div>
        </div>
      `;
    });
  }
  $("modal-body").innerHTML = html;
  if (!$("modal").open) $("modal").showModal();
};

window.startSteal = (victimIncome, name) => {
  if (state.stealsToday >= 3) return toast("Лимит атак");
  if (activeStealTimer) { clearInterval(activeStealTimer); activeStealTimer = null; }
  $("modal-title").textContent = "⚡ ВЗЛОМ";
  $("modal-body").innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <h2 style="font-size: 18px; margin-bottom: 10px;">Тапни 15 раз за 10 секунд!</h2>
      <p style="font-size: 12px; color: var(--muted); margin-bottom: 20px;">Цель: ${name}</p>
      <div style="font-size: 60px; font-weight: 900; color: var(--cyan); margin: 20px 0;" id="steal-counter">0 / 15</div>
      <div style="font-size: 24px; font-weight: 900; color: var(--magenta); margin-bottom: 20px;" id="steal-timer">10</div>
      <button class="btn btn-red" id="steal-tap-btn" style="height: 100px; font-size: 24px;">ТАПАТЬ</button>
    </div>
  `;
  let count = 0, timeLeft = 10;
  const btn = $("steal-tap-btn");
  btn.onclick = () => {
    count++;
    $("steal-counter").textContent = `${count} / 15`;
    soundTap();
    if (count >= 15) {
      if (activeStealTimer) { clearInterval(activeStealTimer); activeStealTimer = null; }
      btn.disabled = true;
      if ($("modal").open) stealSuccess(victimIncome);
    }
  };
  activeStealTimer = setInterval(() => {
    timeLeft--;
    if ($("steal-timer")) $("steal-timer").textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(activeStealTimer);
      activeStealTimer = null;
      if ($("modal").open) stealFail();
    }
  }, 1000);
};

function stealSuccess(victimIncome) {
  state.stealsToday++;
  const stolen = Math.floor(victimIncome * 0.1 * 3600);
  state.crystals += stolen;
  state.totalEarned += stolen;
  soundWin();
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  $("modal-body").innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <h2 style="color: var(--gold); font-size: 28px;">💰 УСПЕХ!</h2>
      <p style="font-size: 20px; color: var(--cyan); margin: 20px 0;">+${format(stolen)} 💎</p>
      <button class="btn btn-gold" onclick="$('modal').close()">ЗАБРАТЬ</button>
    </div>
  `;
  save(); render();
}

function stealFail() {
  state.stealsToday++;
  const lost = Math.floor(getIncome() * 0.05 * 3600);
  state.crystals = Math.max(0, state.crystals - lost);
  soundBomb();
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  $("modal-body").innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <h2 style="color: var(--magenta); font-size: 28px;">💀 ПРОВАЛ</h2>
      <p style="font-size: 20px; color: var(--magenta); margin: 20px 0;">-${format(lost)} 💎</p>
      <button class="btn btn-red" onclick="$('modal').close()">ЗАКРЫТЬ</button>
    </div>
  `;
  save(); render();
}

window.buyShield = () => {
  if (state.shieldUntil > Date.now()) return toast("Щит уже активен");
  if (state.stars < 1) return toast("Нужна 1 ⭐");
  state.stars -= 1;
  state.shieldUntil = Date.now() + DAY;
  toast("🛡️ Щит активен 24 часа");
  soundWin();
  save(); render(); openSteal();
};

window.openDailyChest = () => {
  const now = Date.now();
  const today = new Date().setHours(0,0,0,0);
  const lastDay = state.lastChestAt ? new Date(state.lastChestAt).setHours(0,0,0,0) : 0;
  const daysDiff = lastDay ? Math.round((today - lastDay) / DAY) : 999;
  if (daysDiff === 0) return toast("🎁 Сундук уже открыт сегодня");
  console.log("Show Adsgram ad");
  if (daysDiff >= 2 || state.lastChestAt === 0) state.chestStreak = 1;
  else state.chestStreak = state.chestStreak >= 7 ? 1 : state.chestStreak + 1;
  state.lastChestAt = now;
  const rewards = {
    1: { type: "crystals", val: Math.max(100000, Math.floor(getIncome() * 30)), text: "💎 Кристаллы" },
    2: { type: "crystals", val: Math.max(200000, Math.floor(getIncome() * 60)), text: "💎 Кристаллы" },
    3: { type: "energy",  val: MAX_ENERGY, text: "⚡ Полный заряд" },
    4: { type: "crystals", val: Math.max(500000, Math.floor(getIncome() * 120)), text: "💎 Кристаллы" },
    5: { type: "food",    val: foods[Math.floor(Math.random() * foods.length)].id, text: "🍔 Еда" },
    6: { type: "crystals", val: Math.max(1500000, Math.floor(getIncome() * 300)), text: "💎 Много кристаллов" },
    7: { type: "stars",   val: 1, text: "⭐ Звезда!" }
  };
  const r = rewards[state.chestStreak];
  if (r.type === "crystals") { state.crystals += r.val; state.totalEarned += r.val; }
  if (r.type === "energy") { state.energy = MAX_ENERGY; }
  if (r.type === "food") { state.foodInventory[r.val]++; }
  if (r.type === "stars") { state.stars += 1; }
  soundWin();
  if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
  $("modal-title").textContent = "🎁 ЕЖЕДНЕВНЫЙ СУНДУК";
  $("modal-body").innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <h2 style="font-size: 40px; margin-bottom: 10px;">📦</h2>
      <p style="font-size: 14px; color: var(--muted);">Стрик: <b style="color: var(--gold);">${state.chestStreak} / 7</b></p>
      <p style="font-size: 22px; margin: 20px 0; color: var(--cyan); font-weight: 900;">${r.text}</p>
      ${r.type === "crystals" ? `<p style="font-size: 16px; color: var(--gold);">+${format(r.val)} 💎</p>` : ""}
      <button class="btn btn-gold" style="margin-top: 20px;" onclick="$('modal').close()">ЗАБРАТЬ</button>
    </div>
  `;
  if (!$("modal").open) $("modal").showModal();
  save(); render();
  if (state.tutorialStep === 2) {
    state.tutorialStep = 3;
    save();
    setTimeout(() => showTutorial(), 800);
  }
};

window.openStats = () => {
  $("modal-title").textContent = "📊 СТАТИСТИКА";
  $("modal-body").innerHTML = `
    <div class="card" style="display:flex; justify-content:space-between; border-color:var(--purple);"><span>Всего тапов:</span> <b>${format(state.totalTaps)}</b></div>
    <div class="card" style="display:flex; justify-content:space-between; border-color:var(--gold);"><span>Всего заработано:</span> <b class="gold">${format(state.totalEarned)} 💎</b></div>
    <div class="card" style="display:flex; justify-content:space-between; border-color:var(--cyan);"><span>Игр в аркадах:</span> <b class="green">${state.totalGames}</b></div>
    <div class="card" style="display:flex; justify-content:space-between; border-color:var(--magenta);"><span>Реинкарнаций:</span> <b style="color:var(--magenta)">${state.prestigeLevel || 0}</b></div>
    <div class="card" style="display:flex; justify-content:space-between; border-color:var(--purple);"><span>Ядер:</span> <b style="color:var(--purple)">${state.singularityCores}</b></div>
    <div class="card" style="display:flex; justify-content:space-between; border-color:var(--cyan);"><span>Battle Pass:</span> <b class="green">${state.bpLevel}/30</b></div>
    <div class="card" style="display:flex; justify-content:space-between; border-color:var(--gold);"><span>Рекорд "Ловец":</span> <b class="gold">${state.arcadeRecords.arcade}</b></div>
    <div class="card" style="display:flex; justify-content:space-between; border-color:var(--magenta);"><span>Рекорд "Тир":</span> <b style="color:var(--magenta)">${state.arcadeRecords.shooter}</b></div>
  `;
  if (!$("modal").open) $("modal").showModal();
};

function render() {
  renderHud();
  const lvl = Math.floor(Math.sqrt(state.totalTaps / 100)) + 1;
  $("header-level").textContent = lvl;
  $("pet-level").textContent = `Ур. ${lvl}`;
  updateBackground();
  
  $("satiety-val").textContent = `${state.satiety} / 100`;
  $("satiety-bar").value = state.satiety;
  $("satiety-text").textContent = state.satiety < 20 ? "Питомец голоден! Доход x0.5" : "Питомец сыт";
  
  const p = activePet();
  if (p) {
    const isPetOfDay = p.id === state.petOfDayId;
    const topRar = RARITY_INFO[p.rarity] || { bonus: 1 };
    const topIncome = p.income * 10 * (1 + 0.1 * p.level) * (isPetOfDay ? 3 : 1) * topRar.bonus;
    $("pet-name").textContent = p.name + (isPetOfDay ? " ⭐" : "");
    $("pet-income").textContent = `Доход: +${format(topIncome)} 💎/сек${isPetOfDay ? " (×3)" : ""}`;
    const el = $("pet-emoji");
    if (!el.querySelector("img") || el.dataset.petId !== String(p.id)) {
      el.dataset.petId = p.id;
      el.classList.toggle('multiply-bg', p.id === 11);
      el.innerHTML = `<img class="pet-img" src="${p.img}" onerror="this.outerHTML='${p.emoji}'">`;
    }
  } else {
    $("pet-emoji").classList.remove('multiply-bg');
  }
  
  $("tap-upgrade-price").textContent = format(Math.floor(100 * Math.pow(1.6, state.tapLevel - 1))) + " 💎";
  $("tap-level-badge").textContent = "Ур. " + state.tapLevel;
  $("exchange-price").textContent = format(state.stars === 0 ? 1000000 : (state.stars === 1 ? 10000000 : 100000000)) + " 💎 = 1 ⭐";
  const bmCost = Math.max(5000000, Math.floor(getIncome() * 60));
  if ($("bm-cost-text")) $("bm-cost-text").textContent = `Стоимость: ${format(bmCost)} 💎`;
  if ($("prestige-mult")) $("prestige-mult").textContent = "x" + (1 + (state.prestigeLevel || 0) * 0.5);
  if ($("cores-count")) $("cores-count").textContent = state.singularityCores;
  $("hack-btn").hidden = Date.now() - state.lastHackEventAt < HOUR;
  
  renderLists();
  renderQuests();
  renderStarShop();
  renderBgShop();
  renderAchievements();
  renderLeaderboard();
  checkAchievements();
}

window.activateAuto = () => {
  if (Date.now() < state.autoClickerUntil) return toast("Уже активен!");
  console.log("Show Adsgram ad");
  toast("Реклама загружается...");
  setTimeout(() => {
    state.autoClickerUntil = Date.now() + 5 * MINUTE;
    toast("Автокликер активирован на 5 минут!");
    save(); render();
  }, 2000);
};

window.activateOverdrive = () => {
    const bonus = (state.prestigeUpgrades.megaOverdrive || 0) * 10;
    state.overdriveUntil = Date.now() + (15 + bonus) * SECOND;
    state.lastOverdriveAt = Date.now();
    toast(`🔥 ОВЕРДРАЙВ ${15+bonus}С! x10 К ТАПАМ!`);
    soundWin();
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    save(); render();
};

function renderLists() {
  let bizHtml = "";
  businesses.forEach((b, i) => {
    const price = Math.ceil(b.basePrice * Math.pow(1.65, b.level));
    const locked = i > 0 && businesses[i - 1].level < MAX_LEVEL;
    bizHtml += `
      <div class="card ${locked ? 'locked' : ''}" style="${locked ? 'opacity:0.5;' : ''}">
        <div class="card-top">
          <div class="icon">${b.emoji}</div>
          <div class="card-info">
            <div class="card-name">${b.name}</div>
            <div class="card-income">+${format(b.income * 10)} 💎/сек</div>
          </div>
          <div class="badge">Ур. ${b.level}/${MAX_LEVEL}</div>
        </div>
        <div class="card-bottom">
          <div class="price">${format(price)} 💎</div>
          <div style="display:flex; gap:5px;">
            ${b.level > 0 && b.level < MAX_LEVEL ? `<button class="btn btn-gold" style="width: auto; padding: 8px 12px; font-size: 12px;" onclick="buyBizMax(${i})">MAX</button>` : ''}
            <button class="btn btn-green" style="width: auto; padding: 8px 16px; font-size: 12px;" onclick="buyBiz(${i})" ${locked || b.level >= MAX_LEVEL ? 'disabled' : ''}>${b.level === 0 ? 'Купить' : 'Улучшить'}</button>
          </div>
        </div>
      </div>
    `;
  });
  $("list-biz").innerHTML = bizHtml;

  let petHtml = "";
  pets.forEach((p, i) => {
    const owned = state.ownedPets.includes(p.id);
    const active = state.activePetId === p.id;
    const ex = p.id >= 11;
    const synergy = getSynergyText(p);
    const isDaily = p.id === state.petOfDayId;
    const rar = RARITY_INFO[p.rarity];
    const realIncome = p.income * 10 * (1 + 0.1 * p.level) * (isDaily ? 3 : 1) * rar.bonus;
    petHtml += `
      <div class="card" style="border-color: ${owned || isDaily ? rar.color : 'rgba(255,255,255,0.1)'};">
        <div class="card-top">
          <div class="icon" style="border-color: ${rar.color};">${p.emoji}</div>
          <div class="card-info">
            <div class="card-name">${p.name} <span style="color:${rar.color}; font-size:10px; margin-left:5px;">[${rar.label}]</span></div>
            <div class="card-income" ${isDaily ? 'style="color:var(--gold); font-weight:bold;"' : ''}>+${format(realIncome)} 💎/сек ${isDaily ? '⭐' : ''}</div>
            ${synergy ? `<div class="synergy-tag">${synergy}</div>` : ''}
          </div>
          <div class="badge" style="border-color:${rar.color}; color:${rar.color};">${isDaily ? '⭐ ДНЯ' : active ? 'Активен' : owned ? 'В коллекции' : ex ? 'VIP' : 'Купить'}</div>
        </div>
        <div class="card-bottom">
          <div class="price" style="color:${owned ? rar.color : 'var(--gold)'};">${owned ? `Ур. ${p.level}/10 (×${rar.bonus})` : ex ? 'Эксклюзив' : format(p.price) + ' 💎'}</div>
          <div style="display:flex; gap:5px;">
             ${owned ? `<button class="btn btn-purple" style="width: auto; padding: 8px 12px; font-size: 12px;" onclick="upgPet(${i})" ${p.level >= 10 ? 'disabled' : ''}>Улучшить</button>` : ''}
             <button class="btn btn-green" style="width: auto; padding: 8px 12px; font-size: 12px;" onclick="buyPet(${i})" ${active || (!owned && !ex && state.crystals < p.price) ? 'disabled' : ''}>${active ? 'Активен' : owned ? 'Выбрать' : 'Купить'}</button>
          </div>
        </div>
      </div>
    `;
  });
  $("list-pets").innerHTML = petHtml;
}

window.buyBiz = (i) => {
  const b = businesses[i];
  const price = Math.ceil(b.basePrice * Math.pow(1.65, b.level));
  if (state.crystals < price) return toast("Мало 💎");
  state.crystals -= price;
  b.level++;
  state.quests.buys++;
  tg?.HapticFeedback?.notificationOccurred('success');
  soundBuy();
  for (let k = 0; k < 4; k++) {
    setTimeout(() => {
      const el = document.createElement("div");
      el.className = "tap-particle";
      el.textContent = "💎";
      el.style.color = "#10b981";
      el.style.left = (30 + Math.random() * 40) + "%";
      el.style.top = (50 + Math.random() * 20) + "%";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 800);
    }, k * 50);
  }
  syncLevelsToState();
  save(); render();
  if (state.tutorialStep === 1 && i === 0) {
    state.tutorialStep = 2;
    save();
    setTimeout(() => showTutorial(), 500);
  }
};

window.buyBizMax = (i) => {
  const b = businesses[i];
  let bought = 0;
  while (b.level < MAX_LEVEL) {
    const price = Math.ceil(b.basePrice * Math.pow(1.65, b.level));
    if (state.crystals >= price) {
      state.crystals -= price;
      b.level++;
      bought++;
    } else { break; }
  }
  if (bought > 0) { 
    state.quests.buys += 1;
    syncLevelsToState();
    soundBuy(); save(); render(); 
    toast(`Куплено ${bought} ур.`);
  }
  else toast("Мало 💎");
};

window.buyPet = (i) => {
  const p = pets[i];
  if (!state.ownedPets.includes(p.id)) {
    if (p.id >= 11) return toast("Эксклюзив! Введи промокод.");
    if (state.crystals < p.price) return toast("Мало 💎");
    state.crystals -= p.price;
    state.ownedPets.push(p.id);
  }
  state.activePetId = p.id;
  tg?.HapticFeedback?.notificationOccurred('success');
  soundBuy();
  syncLevelsToState();
  save(); render();
};

window.upgPet = (i) => {
  const p = pets[i];
  const price = p.price * Math.pow(2, p.level);
  if (state.crystals < price) return toast("Мало 💎");
  state.crystals -= price;
  p.level++;
  soundBuy();
  syncLevelsToState();
  save(); render();
};

window.claimQuest = (qId, reward) => {
  if (state.quests.claimed.includes(qId)) return;
  state.quests.claimed.push(qId);
  state.crystals += reward;
  state.totalEarned += reward;
  soundWin();
  toast(`Награда получена: +${format(reward)} 💎`);
  addBPXP(20);
  save(); render();
};

window.buyStarItem = (id) => {
  const item = starShopItems.find(x => x.id === id);
  if (state.stars < item.price) return toast("Мало ⭐");
  state.stars -= item.price;
  if (id === "crystals_1") state.crystals += 10000000;
  if (id === "energy_full") state.energy = MAX_ENERGY;
  if (id === "boost_24h") state.megaBoostUntil = Date.now() + DAY; 
  if (id === "crystals_mega") state.crystals += 10000000000000;
  if (id === "upgrade_zeus") {
    pets[11].level = MAX_PET_LEVEL;
    if (!state.ownedPets.includes(12)) state.ownedPets.push(12);
  }
  if (id === "zeus_vip") {
    if (!state.ownedPets.includes(12)) state.ownedPets.push(12);
    state.activePetId = 12;
  }
  soundWin();
  syncLevelsToState();
  toast("Покупка успешна!");
  save(); render();
};

window.doPrestige = () => {
  const cost = 100000000000;
  if (state.crystals < cost) return toast(`Нужно ${format(cost)} 💎 для реинкарнации`);
  $("modal-title").textContent = "🔥 РЕИНКАРНАЦИЯ";
  $("modal-body").innerHTML = `
    <p style="text-align:center; font-size: 14px; margin-bottom: 20px;">Реинкарнация даст <b>+50% к доходу</b> и <b>+1 Ядро Сингулярности</b>, но сбросит прогресс. Ты уверен?</p>
    <div style="display:flex; gap:10px;">
      <button class="btn btn-green" onclick="confirmPrestige()">ДА, СБРОСИТЬ</button>
      <button class="btn btn-red" onclick="$('modal').close()">ОТМЕНА</button>
    </div>
  `;
  if (!$("modal").open) $("modal").showModal();
}

window.confirmPrestige = () => {
  state.prestigeLevel = (state.prestigeLevel || 0) + 1;
  state.singularityCores = (state.singularityCores || 0) + 1;
  state.crystals = 0;
  state.energy = MAX_ENERGY;
  state.ownedPets = [];
  state.activePetId = null;
  businesses.forEach(b => b.level = 0);
  pets.forEach(p => p.level = 0);
  state.tapLevel = 1;
  const richStart = state.prestigeUpgrades.richStart || 0;
  if (richStart > 0) state.crystals = 1000000 * richStart;
  state.bizLevels = [];
  state.petLevels = [];
  state.comboBoostUntil = 0;
  _lastBalanceShown = null;
  soundWin();
  save(); render(); $("modal").close();
  toast(`🔥 Реинкарнация #${state.prestigeLevel}! +1 Ядро Сингулярности`);
}

window.openPrestigeTree = () => {
  const upgrades = [
      { id: "cyberHand", name: "Кибер-Рука", icon: "🦾", desc: "+50% к силе тапа за ур.", cost: 1 },
      { id: "neuroBoost", name: "Нейро-Сеть", icon: "🧠", desc: "+20% к пассивному доходу за ур.", cost: 1 },
      { id: "megaOverdrive", name: "Мега-Овердрайв", icon: "🔥", desc: "+10 сек к Овердрайву за ур.", cost: 1 },
      { id: "richStart", name: "Богатый Старт", icon: "💎", desc: "+1M 💎 после реинкарнации за ур.", cost: 1 }
  ];
  let html = `<div style="text-align:center; margin-bottom:15px; padding:10px; background:rgba(182,154,255,0.1); border-radius:10px; border:1px solid var(--purple);">
      <span style="font-size:14px;">Ядер Сингулярности:</span> 
      <b style="font-size:20px; color:var(--purple);">${state.singularityCores}</b>
  </div>`;
  upgrades.forEach(u => {
      const lvl = state.prestigeUpgrades[u.id] || 0;
      html += `
          <div class="card" style="border-color:var(--purple);">
              <div class="card-top">
                  <div class="icon" style="border-color:var(--purple); background:rgba(182,154,255,0.15);">${u.icon}</div>
                  <div class="card-info">
                      <div class="card-name">${u.name}</div>
                      <div class="card-income">${u.desc}</div>
                  </div>
                  <div class="badge" style="border-color:var(--purple); color:var(--purple); background:rgba(182,154,255,0.15);">Ур. ${lvl}</div>
              </div>
              <div class="card-bottom">
                  <div class="price">${u.cost} Ядро</div>
                  <button class="btn btn-purple" style="width:auto; padding:8px 16px; font-size:12px;" onclick="buyPrestigeUpgrade('${u.id}', ${u.cost})" ${state.singularityCores < u.cost ? 'disabled' : ''}>Купить</button>
              </div>
          </div>
      `;
  });
  $("modal-title").textContent = "🌌 ДРЕВО ТАЛЕНТОВ";
  $("modal-body").innerHTML = html;
  if (!$("modal").open) $("modal").showModal();
};

window.buyPrestigeUpgrade = (id, cost) => {
  if (state.singularityCores < cost) return toast("Мало ядер!");
  state.singularityCores -= cost;
  state.prestigeUpgrades[id] = (state.prestigeUpgrades[id] || 0) + 1;
  soundWin();
  save(); render(); openPrestigeTree();
};

function tap(e) {
  if (state.energy < 1) return toast("Нет энергии");
  tg?.HapticFeedback?.impactOccurred('light');
  state.energy--;
  const earned = getTapReward();
  state.crystals += earned;
  state.totalEarned += earned;
  state.quests.taps++;
  state.totalTaps++;
  handleCombo();
  soundTap();
  addBPXP(1);
  const el = document.createElement("div");
  el.className = "tap-particle";
  el.textContent = `+${format(earned)} 💎`;
  const px = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  const py = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
  el.style.left = px + "px";
  el.style.top = py + "px";
  if (state.overdriveUntil > Date.now()) el.style.color = "var(--gold)";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
  renderHud();
  if (state.totalTaps % 50 === 0) checkAchievements();
  if (state.tutorialStep === 0 && state.totalTaps >= 10) {
    state.tutorialStep = 1;
    save();
    setTimeout(() => showTutorial(), 300);
  }
}

function startArcade() {
  clearGameIntervals();
  aScore = 0; aTime = 45; aLives = 3; aIsPlaying = false;
  $("modal-title").textContent = "🕹️ КИБЕР-ЛОВЕЦ";
  $("modal-win-msg").hidden = true;
  $("modal-body").innerHTML = `
    <div class="arcade-ui">
      <div class="lives" id="arcade-lives">❤️❤️❤️</div>
      <div>Счет: <span id="arcade-score">0</span></div>
      <div>Время: <span id="arcade-timer">45</span>с</div>
    </div>
    <p style="text-align:center; font-size:11px; color:var(--gold); margin:5px 0;">🏆 Рекорд: ${state.arcadeRecords.arcade}</p>
    <div class="arcade-container" id="arcade-board">
      <div class="arcade-player" id="arcade-player"></div>
      <div class="arcade-start-overlay" id="arcade-overlay">
        <h2 style="color: var(--cyan); text-shadow: 0 0 10px var(--cyan);">ПРИГОТОВЬСЯ!</h2>
        <p style="font-size: 12px; color: #aaa; text-align: center; padding: 0 20px;">Двигай платформу пальцем. Лови 💎 и ⭐, избегай 💣.</p>
        <button class="btn btn-green" style="width: auto; padding: 10px 30px; margin-top: 10px;" onclick="runArcadeGame(false)">СТАРТ</button>
      </div>
    </div>
  `;
  $("modal").showModal();
}

window.runArcadeGame = (isRevive) => {
  if(!isRevive) {
      $("arcade-overlay").hidden = true;
      $("arcade-board").querySelectorAll('.falling-item').forEach(el => el.remove());
  }
  aIsPlaying = true;
  const board = $("arcade-board");
  const player = $("arcade-player");
  const updateUI = () => {
      $("arcade-lives").textContent = "❤️".repeat(aLives) + "🖤".repeat(3 - aLives);
      $("arcade-score").textContent = aScore;
      $("arcade-timer").textContent = aTime;
  }
  updateUI();
  const movePlayer = (e) => {
    if (!aIsPlaying) return;
    const rect = board.getBoundingClientRect();
    let clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    let x = clientX - rect.left;
    x = Math.max(30, Math.min(rect.width - 30, x));
    player.style.left = x + "px";
  };
  board.addEventListener("mousemove", movePlayer);
  board.addEventListener("touchmove", movePlayer, {passive: false});
  const spawnInterval = setInterval(() => {
    if (!aIsPlaying) return;
    const item = document.createElement("div");
    item.className = "falling-item";
    const type = Math.random();
    let emoji = "💎", isBomb = false;
    if (type > 0.8) { emoji = "💣"; isBomb = true; }
    else if (type > 0.7) { emoji = "❤️"; }
    else if (type > 0.4) { emoji = "⭐"; }
    item.textContent = emoji;
    item.style.left = (Math.random() * 80 + 10) + "%";
    item.style.top = "-40px";
    board.appendChild(item);
    let top = -40;
    const fallSpeed = 2.5 + Math.random() * 3;
    const fallInterval = setInterval(() => {
      if (!aIsPlaying) { clearInterval(fallInterval); item.remove(); return; }
      top += fallSpeed;
      item.style.top = top + "px";
      const boardRect = board.getBoundingClientRect();
      const playerRect = player.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      if (itemRect.bottom >= playerRect.top && itemRect.top <= playerRect.bottom) {
        if (itemRect.left + 20 > playerRect.left && itemRect.left < playerRect.right) {
          clearInterval(fallInterval);
          item.remove();
          if (isBomb) {
            aLives--; updateUI(); soundBomb(); if (navigator.vibrate) navigator.vibrate(100);
            if (aLives <= 0) endGame();
          } else if (emoji === "❤️") {
            if (aLives < 3) { aLives++; updateUI(); }
          } else {
            aScore += 10; updateUI();
          }
        }
      }
      if (top > boardRect.height) {
        clearInterval(fallInterval); item.remove();
      }
    }, 16);
    gameIntervals.push(fallInterval); 
  }, 450);
  gameIntervals.push(spawnInterval);
  const gameTimer = setInterval(() => {
    if (!aIsPlaying) return;
    aTime--; updateUI();
    if (aTime <= 0) endGame();
  }, 1000);
  gameIntervals.push(gameTimer);
  const endGame = () => {
    aIsPlaying = false;
    clearGameIntervals();
    const isNewRecord = aScore > state.arcadeRecords.arcade;
    if (isNewRecord) {
      state.arcadeRecords.arcade = aScore;
      save();
    }
    const reward = aScore * 10000 + Math.floor(getIncome() * 5);
    $("modal-body").innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: var(--gold); font-size: 28px; margin-bottom: 10px; text-shadow: 0 0 10px var(--gold);">ИГРА ОКОНЧЕНА</h2>
        ${isNewRecord ? '<p style="color:var(--gold); font-weight:900; margin:5px 0;">🏆 НОВЫЙ РЕКОРД!</p>' : ''}
        <p style="font-size: 18px; margin-bottom: 5px;">Счет: <b>${aScore}</b></p>
        <p style="font-size: 18px; margin-bottom: 20px; color: var(--cyan);">Награда: +${format(reward)} 💎</p>
        <button class="btn btn-green" style="margin-bottom: 10px;" onclick="claimArcadeReward(${reward})">ЗАБРАТЬ</button>
        <button class="btn btn-red" onclick="reviveArcade()">▶ ПРОДОЛЖИТЬ (+3 ❤️) ЗА РЕКЛАМУ</button>
      </div>
    `;
  };
  window.claimArcadeReward = (reward) => {
    state.crystals += reward;
    state.totalEarned += reward;
    state.quests.games++;
    state.totalGames++;
    soundWin();
    addBPXP(15);
    save(); render();
    $("modal").close();
    if (state.tutorialStep === 3) {
      state.tutorialStep = 4;
      state.crystals += 5000000;
      state.stars += 1;
      save(); render();
      setTimeout(() => {
        $("modal-title").textContent = "🎉 ОБУЧЕНИЕ ПРОЙДЕНО!";
        $("modal-body").innerHTML = `
          <div style="text-align: center; padding: 25px;">
            <div style="font-size: 60px; margin-bottom: 15px;">🏆</div>
            <h2 style="color: var(--gold); font-size: 22px; margin-bottom: 10px;">Ты справился!</h2>
            <p style="font-size: 15px; margin-bottom: 15px;">Держи бонус за обучение:</p>
            <p style="font-size: 20px; color: var(--cyan); font-weight: 900;">+5 000 000 💎</p>
            <p style="font-size: 18px; color: var(--gold); font-weight: 900;">+1 ⭐</p>
            <button class="btn btn-gold" style="margin-top: 15px;" onclick="$('modal').close()">ИГРАТЬ</button>
          </div>
        `;
        if (!$("modal").open) $("modal").showModal();
        soundWin();
      }, 800);
    }
  };
  window.reviveArcade = () => {
    console.log("Show Adsgram ad");
    toast("Смотрим рекламу...");
    setTimeout(() => {
      aLives = 3; aIsPlaying = true; aTime += 15;
      $("modal-title").textContent = "🕹️ КИБЕР-ЛОВЕЦ";
      $("modal-body").innerHTML = `
        <div class="arcade-ui">
          <div class="lives" id="arcade-lives">❤️❤️❤️</div>
          <div>Счет: <span id="arcade-score">${aScore}</span></div>
          <div>Время: <span id="arcade-timer">${aTime}</span>с</div>
        </div>
        <div class="arcade-container" id="arcade-board">
          <div class="arcade-player" id="arcade-player"></div>
        </div>
      `;
      runArcadeGame(true);
    }, 1500);
  };
};

function startShooter() {
  clearGameIntervals();
  sScore = 0; sTime = 30; sLives = 3; sIsPlaying = false;
  $("modal-title").textContent = "🎯 КИБЕР-ТИР";
  $("modal-win-msg").hidden = true;
  $("modal-body").innerHTML = `
    <div class="arcade-ui">
      <div class="lives" id="shooter-lives">❤️❤️❤️</div>
      <div>Счет: <span id="shooter-score">0</span></div>
      <div>Время: <span id="shooter-timer">30</span>с</div>
    </div>
    <p style="text-align:center; font-size:11px; color:var(--gold); margin:5px 0;">🏆 Рекорд: ${state.arcadeRecords.shooter}</p>
    <div class="game-board" id="shooter-board"></div>
    <div class="arcade-start-overlay" id="shooter-overlay" style="border-radius: 16px;">
      <h2 style="color: var(--magenta); text-shadow: 0 0 10px var(--magenta);">ОГОНЬ!</h2>
      <p style="font-size: 12px; color: #aaa; text-align: center; padding: 0 20px;">Нажимай на вирусы 🦠. Избегай бомб 💣.</p>
      <button class="btn btn-red" style="width: auto; padding: 10px 30px; margin-top: 10px;" onclick="runShooterGame(false)">НАЧАТЬ</button>
    </div>
  `;
  $("modal").showModal();
}

window.runShooterGame = (isRevive) => {
  if(!isRevive) {
      $("shooter-overlay").hidden = true;
      $("shooter-board").querySelectorAll('.target').forEach(el => el.remove());
  }
  sIsPlaying = true;
  const board = $("shooter-board");
  const updateUI = () => {
      $("shooter-lives").textContent = "❤️".repeat(sLives) + "🖤".repeat(3 - sLives);
      $("shooter-score").textContent = sScore;
      $("shooter-timer").textContent = sTime;
  }
  updateUI();
  const spawn = setInterval(() => {
    if (!sIsPlaying) return;
    const isBomb = Math.random() < 0.3;
    const b = document.createElement("button");
    b.className = "target " + (isBomb ? "bomb" : "virus");
    b.textContent = isBomb ? "💣" : "🦠";
    b.style.left = Math.random() * 80 + 10 + "%";
    b.style.top = Math.random() * 80 + 10 + "%";
    b.onclick = () => {
      b.remove();
      if (isBomb) {
        sLives--; updateUI(); soundBomb(); if (navigator.vibrate) navigator.vibrate(100);
        if (sLives <= 0) endGame();
      } else { sScore += 10; updateUI(); soundTap(); }
    };
    board.appendChild(b);
    setTimeout(() => b.remove(), 800);
  }, 400);
  gameIntervals.push(spawn);
  const timer = setInterval(() => {
    if (!sIsPlaying) return;
    sTime--; updateUI();
    if (sTime <= 0) endGame();
  }, 1000);
  gameIntervals.push(timer);
  const endGame = () => {
    sIsPlaying = false;
    clearGameIntervals();
    const isNewRecord = sScore > state.arcadeRecords.shooter;
    if (isNewRecord) {
      state.arcadeRecords.shooter = sScore;
      save();
    }
    const reward = sScore * 15000 + Math.floor(getIncome() * 10);
    $("modal-body").innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: var(--magenta); font-size: 28px; margin-bottom: 10px; text-shadow: 0 0 10px var(--magenta);">ТИР ЗАКРЫТ</h2>
        ${isNewRecord ? '<p style="color:var(--gold); font-weight:900; margin:5px 0;">🏆 НОВЫЙ РЕКОРД!</p>' : ''}
        <p style="font-size: 18px; margin-bottom: 5px;">Счет: <b>${sScore}</b></p>
        <p style="font-size: 18px; margin-bottom: 20px; color: var(--cyan);">Награда: +${format(reward)} 💎</p>
        <button class="btn btn-green" style="margin-bottom: 10px;" onclick="claimShooterReward(${reward})">ЗАБРАТЬ</button>
        <button class="btn btn-red" onclick="reviveShooter()">▶ ПРОДОЛЖИТЬ (+3 ❤️) ЗА РЕКЛАМУ</button>
      </div>
    `;
  };
  window.claimShooterReward = (reward) => {
    state.crystals += reward;
    state.totalEarned += reward;
    state.quests.games++;
    state.totalGames++;
    soundWin();
    addBPXP(15);
    save(); render();
    $("modal").close();
  };
  window.reviveShooter = () => {
    console.log("Show Adsgram ad");
    toast("Смотрим рекламу...");
    setTimeout(() => {
      sLives = 3; sIsPlaying = true; sTime += 15;
      $("modal-title").textContent = "🎯 КИБЕР-ТИР";
      $("modal-body").innerHTML = `
        <div class="arcade-ui">
          <div class="lives" id="shooter-lives">❤️❤️❤️</div>
          <div>Счет: <span id="shooter-score">${sScore}</span></div>
          <div>Время: <span id="shooter-timer">${sTime}</span>с</div>
        </div>
        <div class="game-board" id="shooter-board"></div>
      `;
      runShooterGame(true);
    }, 1500);
  };
};

function openChests(keepWinMsg = false) {
  $("modal-title").textContent = "🎁 СУНДУКИ";
  if (!keepWinMsg) $("modal-win-msg").hidden = true;
  let html = "";
  chests.forEach(c => {
    html += `
      <div class="card" style="border-color: ${c.color}; margin-bottom: 10px;">
        <div class="card-top">
          <div class="icon" style="background: ${c.color}30; border-color: ${c.color};">${c.emoji}</div>
          <div class="card-info"><div class="card-name" style="color: ${c.color}">${c.name} сундук</div><div class="card-income">Шанс на редкую награду</div></div>
        </div>
        <div class="card-bottom">
          <div class="price">${format(c.cost)} 💎</div>
          <button class="btn" style="width: auto; padding: 8px 16px; font-size: 12px; background: ${c.color}; color: #000; box-shadow: 0 0 15px ${c.color}80;" onclick="openChest('${c.id}')" ${state.crystals < c.cost ? 'disabled' : ''}>ОТКРЫТЬ</button>
        </div>
      </div>
    `;
  });
  $("modal-body").innerHTML = html;
  if (!$("modal").open) $("modal").showModal();
}

window.openChest = (id) => {
  const c = chests.find(x => x.id === id);
  if (state.crystals < c.cost) return toast("Мало 💎");
  state.crystals -= c.cost;
  const roll = Math.random() * 100;
  if (roll > 95) {
    state.stars += id === "gold" ? 5 : (id === "silver" ? 2 : 1);
    showWin("🌟 ДЖЕКПОТ! Выпали Звезды!"); soundWin();
  } else if (roll > 60) {
    const win = Math.floor(c.cost * 1.5 + getIncome() * 100);
    state.crystals += win; state.totalEarned += win;
    showWin(`💎 Выпало ${format(win)} кристаллов!`); soundWin();
  } else if (roll > 30) {
    const f = foods[Math.floor(Math.random() * foods.length)];
    state.foodInventory[f.id]++;
    showWin(`🍔 Выпала еда: ${f.name}!`); soundTap();
  } else {
    showWin("☠️ Сундук оказался пустым..."); soundBomb();
  }
  save(); render(); openChests(true);
};

function openBlackMarket() {
  const now = Date.now();
  if (!state.lastBlackMarketDay || now - state.lastBlackMarketDay > DAY) {
    state.lastBlackMarketDay = now; state.blackMarketOpens = 0;
  }
  if (state.blackMarketOpens >= 3) return toast("☠️ Лимит 3 раза в день!");
  const cost = Math.max(5000000, Math.floor(getIncome() * 60));
  if (state.crystals < cost) return toast(`Нужно ${format(cost)} 💎`);
  state.crystals -= cost; state.blackMarketOpens++;
  const roll = Math.random() * 100;
  if (roll < 5) {
    const win = cost * 5; 
    state.crystals += win; state.totalEarned += win;
    toast(`🎉 ДЖЕКПОТ! +${format(win)} 💎`); soundWin();
  } else if (roll < 30) {
    const win = cost * 2; 
    state.crystals += win; state.totalEarned += win;
    toast(`🔥 +${format(win)} 💎`); soundWin();
  } else { toast("☠️ Пусто..."); soundBomb(); }
  save(); render();
}

function openLottery() {
  const now = Date.now();
  if (state.lastLotteryAt && now - state.lastLotteryAt < DAY) return toast("Жди завтра!");
  const ticketPrice = Math.max(5000000, Math.floor(getIncome() * 20));
  if (state.crystals < ticketPrice) return toast(`Билет стоит ${format(ticketPrice)} 💎`);
  state.crystals -= ticketPrice; state.lastLotteryAt = now;
  if (Math.random() < 0.01) { 
    const win = ticketPrice * 10;
    state.crystals += win; state.totalEarned += win;
    state.stars += 10;
    toast(`👑 СУПЕР ДЖЕКПОТ! +${format(win)} 💎 и 10 ⭐`); soundWin();
  } else {
    const win = ticketPrice * 2;
    state.crystals += win; state.totalEarned += win;
    toast(`🎁 Выигрыш ${format(win)} 💎`); soundTap();
  }
  save(); render();
}

function openWheel() {
  const now = Date.now();
  if (state.lastWheelAt && now - state.lastWheelAt < 4 * HOUR) return toast("Колесо будет доступно позже!");
  state.lastWheelAt = now;
  const base = Math.max(100000, Math.floor(getIncome() * 2));
  const prizes = [
    { name: `${format(base)} 💎`, type: "crystals", val: base },
    { name: `${format(base * 3)} 💎`, type: "crystals", val: base * 3 },
    { name: `${format(base * 5)} 💎`, type: "crystals", val: base * 5 },
    { name: "1 ⭐", type: "stars", val: 1 },
    { name: "Буст x2 (10 мин)", type: "boost", val: 10 * MINUTE }
  ];
  const prize = prizes[Math.floor(Math.random() * prizes.length)];
  if (prize.type === "crystals") { state.crystals += prize.val; state.totalEarned += prize.val; }
  if (prize.type === "stars") state.stars += prize.val;
  if (prize.type === "boost") state.boostUntil = Date.now() + prize.val;
  toast(`🎡 Выпало: ${prize.name}`);
  soundWin();
  save(); render();
}

function openFood() {
  $("modal-title").textContent = "🍔 ЕДА";
  $("modal-win-msg").hidden = true;
  let html = "";
  foods.forEach(f => {
    const price = Math.floor(f.priceFactor * (1 + getIncome() / 1000000));
    html += `
      <div class="card" style="padding:10px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:20px">${f.emoji}</div>
          <div class="card-name">${f.name}</div>
          <div style="font-size:10px; color:var(--gold)">В сумке: ${state.foodInventory[f.id]}</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:5px;">
          <button class="btn btn-green" style="padding:6px 10px; font-size:11px;" onclick="buyF('${f.id}', ${price})">${format(price)} 💎</button>
          <button class="btn btn-purple" style="padding:6px 10px; font-size:11px;" onclick="feedF('${f.id}')" ${state.foodInventory[f.id] < 1 ? 'disabled' : ''}>Скормить</button>
        </div>
      </div>
    `;
  });
  $("modal-body").innerHTML = html;
  if (!$("modal").open) $("modal").showModal();
}

window.buyF = (id, price) => {
  if (state.crystals < price) return toast("Мало 💎");
  state.crystals -= price; state.foodInventory[id]++;
  soundBuy();
  save(); openFood();
};

window.feedF = (id) => {
  if (state.foodInventory[id] < 1) return;
  state.foodInventory[id]--;
  const f = foods.find(x => x.id === id);
  state.satiety = Math.min(100, state.satiety + f.satiety);
  if (f.multiplier > 1) { 
    state.foodBuffMultiplier = f.multiplier; 
    state.foodBuffUntil = Date.now() + f.duration; 
  }
  state.quests.feeds++;
  soundBuy();
  $("modal").close(); switchTab("home");
  save(); render();
  if (state.activePetId === 11) {
    setTimeout(() => {
      if (id === "cherry") {
        spawnHearts(101, "❤️");
      } else {
        spawnHearts(51, "💖");
      }
    }, 2500);
  }
};

function switchTab(id) {
  ["home", "upgrade", "shop", "tasks", "profile"].forEach(tab => {
    $("view-" + tab).hidden = tab !== id;
    document.querySelector(`[data-target="${tab}"]`).classList.toggle("active", tab === id);
  });
}

function renderStarShop() {
  let html = "";
  starShopItems.forEach(item => {
    html += `
      <div class="card" style="border-color: var(--gold);">
        <div class="card-top">
          <div class="icon" style="border-color: var(--gold); background: rgba(255,219,131,0.1);">${item.emoji}</div>
          <div class="card-info"><div class="card-name">${item.name}</div><div class="card-income">${item.desc}</div></div>
        </div>
        <div class="card-bottom">
          <div class="price">${item.price} ⭐</div>
          <button class="btn btn-gold" style="width: auto; padding: 8px 16px; font-size: 12px;" onclick="buyStarItem('${item.id}')" ${state.stars < item.price ? 'disabled' : ''}>Купить</button>
        </div>
      </div>
    `;
  });
  $("star-shop-list").innerHTML = html;
}

function renderQuests() {
  let qHtml = "";
  state.dailyQuests.forEach(qId => {
    const quest = allQuests.find(q => q.id === qId);
    if(!quest) return;
    const progress = state.quests[quest.type] || 0;
    const isClaimed = state.quests.claimed.includes(quest.id);
    const canClaim = progress >= quest.target && !isClaimed;
    qHtml += `
      <div class="card" style="padding: 10px;">
        <div class="card-top">
          <div class="icon">📜</div>
          <div class="card-info"><div class="card-name">${quest.text}</div><div class="card-income">Прогресс: ${Math.min(progress, quest.target)} / ${quest.target}</div></div>
          <button class="btn ${isClaimed ? 'btn-green' : 'btn-gold'}" style="width: auto; padding: 6px 10px; font-size: 10px;" onclick="claimQuest('${quest.id}', ${quest.reward})" ${!canClaim ? 'disabled' : ''}>${isClaimed ? '✓' : 'Забрать'}</button>
        </div>
      </div>
    `;
  });
  $("quest-list").innerHTML = qHtml;
}

function renderAchievements() {
  let html = "";
  achievementsList.forEach(ach => {
    const unlocked = state.achievements.includes(ach.id);
    html += `
      <div class="achievement-item ${unlocked ? 'unlocked' : ''}">
        <div class="ach-icon">${ach.icon}</div>
        <div class="ach-name">${ach.title}</div>
      </div>
    `;
  });
  $("achievements-list").innerHTML = html;
}

function renderLeaderboard() {
  const timeFactor = 1 + (Date.now() % 86400000) / 86400000 * 5; 
  let players = fakePlayers.map(p => ({ name: p.name, income: p.baseIncome * timeFactor }));
  const myIncome = getIncome();
  players.push({ name: "Ты (Игрок)", income: myIncome, isMe: true });
  players.sort((a,b) => b.income - a.income);
  let html = "";
  players.forEach((p, index) => {
    html += `
      <div class="leaderboard-row ${p.isMe ? 'me' : ''}">
        <div class="lb-rank">#${index + 1}</div>
        <div class="lb-name">${p.name}</div>
        <div class="lb-score">${format(p.income)}/с</div>
      </div>
    `;
  });
  $("leaderboard-list").innerHTML = html;
}

window.shareProfile = () => {
  const text = `Я играю в AVAR1T1A и мой доход уже ${format(getIncome())} в секунду! Попробуй побить мой рекорд!`;
  if (navigator.share) navigator.share({ title: 'AVAR1T1A', text: text, url: window.location.href });
  else { navigator.clipboard.writeText(text + " " + window.location.href); toast("Текст скопирован!"); }
};

document.querySelectorAll(".nav-btn").forEach(btn => btn.onclick = () => switchTab(btn.dataset.target));
$("tab-biz").onclick = () => { $("tab-biz").classList.add("active"); $("tab-pets").classList.remove("active"); $("list-biz").hidden = false; $("list-pets").hidden = true; };
$("tab-pets").onclick = () => { $("tab-pets").classList.add("active"); $("tab-biz").classList.remove("active"); $("list-pets").hidden = false; $("list-biz").hidden = true; };

$("pet-emoji").addEventListener("pointerdown", tap);

$("upgrade-tap").onclick = () => {
  const price = Math.floor(100 * Math.pow(1.6, state.tapLevel - 1));
  if (state.crystals < price) return toast("Мало 💎");
  state.crystals -= price; state.tapLevel++;
  soundBuy();
  save(); render();
};

$("btn-arcade").onclick = startArcade;
$("btn-shooter").onclick = startShooter;
$("btn-chests").onclick = () => openChests(false);
$("btn-blackmarket").onclick = openBlackMarket;
$("btn-lottery").onclick = openLottery;
$("btn-wheel").onclick = openWheel;
$("btn-food").onclick = openFood;

$("exchange-btn").onclick = () => {
  const price = state.stars === 0 ? 1000000 : (state.stars === 1 ? 10000000 : 100000000);
  if (state.crystals < price) return toast("Мало 💎");
  state.crystals -= price; state.stars++;
  soundWin();
  save(); render(); toast("Обмен успешен! +1 ⭐");
};

$("promo-form").onsubmit = (e) => {
  e.preventDefault();
  const code = $("promo-input").value.trim().toUpperCase();
  const promo = promoCodes.find(x => x.code === code);
  if (!promo) return toast("Неверный промокод");
  if (state.usedPromos.includes(code)) return toast("Промокод уже использован");
  state.usedPromos.push(code);
  if (promo.type === "crystals") state.crystals += promo.amount;
  if (promo.type === "stars") state.stars += promo.amount;
  if (promo.type === "pet") { if(!state.ownedPets.includes(promo.petId)) state.ownedPets.push(promo.petId); state.activePetId = promo.petId; }
  soundWin();
  save(); render(); $("promo-input").value = "";
  toast("Промокод активирован!");
};

$("modal-close").onclick = () => { 
  $("modal").close(); 
  clearGameIntervals(); 
  if (activeStealTimer) { clearInterval(activeStealTimer); activeStealTimer = null; }
  aIsPlaying = false; sIsPlaying = false;
  $("modal-win-msg").hidden = true; 
};

settle();
setInterval(settle, 1000);
setInterval(save, 15000);

function startHack() {
  $("modal-title").textContent = "⚠️ ВЗЛОМ СИСТЕМЫ";
  $("modal-win-msg").hidden = true;
  $("modal-body").innerHTML = `
    <div class="lives" id="hack-lives" style="text-align:center; font-size:24px; margin-bottom:10px; color:var(--magenta);">❤️❤️❤️</div>
    <p style="font-size:12px; text-align:center; color:var(--cyan); margin-bottom:15px;">Повтори последовательность. Ошибка = -1 жизнь.</p>
    <div class="hack-pattern" id="hack-pattern"></div>
    <div class="hack-buttons" id="hack-buttons"></div>
    <div class="hack-status" id="hack-status" style="color: var(--cyan);">Уровень 1</div>
  `;
  $("modal").showModal();
  let lives = 3, level = 1, input = [], pattern = [];
  const symbols = ["🔴", "🔵", "🟢"];
  const nextLevel = () => {
    input = []; level++;
    pattern = Array.from({length: level + 1}, () => symbols[Math.floor(Math.random()*3)]);
    $("hack-pattern").textContent = pattern.join("");
    $("hack-status").textContent = "Уровень " + level;
    $("hack-status").style.color = "var(--cyan)";
    const bc = $("hack-buttons");
    bc.innerHTML = "";
    symbols.forEach(sym => {
      const btn = document.createElement("button");
      btn.textContent = sym; btn.className = "btn btn-purple"; btn.style.fontSize = "32px"; btn.style.padding = "15px";
      btn.onclick = () => handleInput(sym);
      bc.appendChild(btn);
    });
  };
  const handleInput = (sym) => {
    input.push(sym);
    $("hack-status").textContent = "Введено: " + input.join("");
    if (input[input.length-1] !== pattern[input.length-1]) {
      lives--;
      $("hack-lives").textContent = "❤️".repeat(lives) + "🖤".repeat(3 - lives);
      $("hack-status").textContent = "❌ ОШИБКА!"; $("hack-status").style.color = "var(--magenta)";
      soundBomb();
      if (lives <= 0) {
        state.lastHackEventAt = Date.now(); save(); 
        setTimeout(() => { $("modal").close(); render(); }, 1500);
      } else { setTimeout(() => nextLevel(), 1000); }
    } else if (input.length === pattern.length) {
      $("hack-status").textContent = "✅ РАУНД ПРОЙДЕН!"; $("hack-status").style.color = "#34d399";
      state.crystals += getIncome() * 20;
      soundWin();
      if (!state.achievements.includes("hacker")) { state.achievements.push("hacker"); save(); }
      setTimeout(() => nextLevel(), 1000);
    }
  };
  nextLevel();
}

$("hack-btn").onclick = startHack;

checkDailyLogin(); 
render();

if (state.tutorialStep < 4 && state.totalTaps === 0) {
  setTimeout(() => showTutorial(), 1200);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      }
