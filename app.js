
// ════════════════════════════════════════════
 // Use capture phase to intercept mobile taps cleanly


// ============================================
//  VIVANT App - Main JavaScript
// ============================================

// ════════════════════════════════════════════
//  SPOILER GATE & ACCESS COUNTER
// ════════════════════════════════════════════
const COUNTER_NS  = 'vivant-app-2026';
const COUNTER_API = 'https://api.counterapi.dev/v1';

function getTodayKey()  { return new Date().toISOString().slice(0, 10); }
function getWeekKey()   {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function trackAndShowCounts() {
  const todayKey  = getTodayKey();
  const weekKey   = getWeekKey();

  const statusEl  = document.getElementById('counter-status');
  const cntDaily  = document.getElementById('cnt-daily');
  const cntWeekly = document.getElementById('cnt-weekly');
  const cntTotal  = document.getElementById('cnt-total');

  const fetchOpt = { signal: AbortSignal.timeout(2000) };

  const hitToday  = fetch(`${COUNTER_API}/${COUNTER_NS}/${todayKey}/hit`, fetchOpt).then(r => r.json()).catch(() => null);
  const hitWeek   = fetch(`${COUNTER_API}/${COUNTER_NS}/${weekKey}/hit`, fetchOpt).then(r => r.json()).catch(() => null);
  const hitTotal  = fetch(`${COUNTER_API}/${COUNTER_NS}/total/hit`, fetchOpt).then(r => r.json()).catch(() => null);

  if (statusEl) statusEl.textContent = '集計中...';

  try {
    const [rDay, rWeek, rTotal] = await Promise.all([hitToday, hitWeek, hitTotal]);
    const numDay   = rDay?.value   ?? rDay?.count   ?? 1;
    const numWeek  = rWeek?.value  ?? rWeek?.count  ?? 1;
    const numTotal = rTotal?.value ?? rTotal?.count ?? 1;

    animateCounter(cntDaily,  typeof numDay   === 'number' ? numDay   : null, numDay);
    animateCounter(cntWeekly, typeof numWeek  === 'number' ? numWeek  : null, numWeek);
    animateCounter(cntTotal,  typeof numTotal === 'number' ? numTotal : null, numTotal);

    if (statusEl) statusEl.textContent = `最終更新: ${new Date().toLocaleTimeString('ja-JP')}`;
  } catch {
    if (cntDaily)  cntDaily.textContent  = '1';
    if (cntWeekly) cntWeekly.textContent = '1';
    if (cntTotal)  cntTotal.textContent  = '1';
    if (statusEl)  statusEl.textContent  = 'アクセス集計完了';
  }
}

function animateCounter(el, target, fallback) {
  if (!el) return;
  if (target === null || isNaN(target)) {
    el.textContent = fallback ?? '1';
    return;
  }
  const duration = 1200;
  const start = Date.now();
  function tick() {
    const p = Math.min((Date.now() - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(ease * target).toLocaleString('ja-JP');
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function initSpoilerParticles() {
  const sc = document.getElementById('spoilerCanvas');
  if (!sc) return;
  const sctx = sc.getContext('2d');

  function resize() {
    sc.width  = window.innerWidth;
    sc.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const pts = Array.from({ length: 80 }, () => ({
    x: Math.random() * sc.width,
    y: Math.random() * sc.height,
    r: Math.random() * 1.5 + 0.3,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -Math.random() * 0.5 - 0.1,
    a: Math.random() * 0.35 + 0.05,
  }));

  let raf;
  function draw() {
    if (!document.getElementById('spoilerCanvas')) { cancelAnimationFrame(raf); return; }
    sctx.clearRect(0, 0, sc.width, sc.height);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.a -= 0.0008;
      if (p.a <= 0 || p.y < -10) {
        p.x = Math.random() * sc.width;
        p.y = sc.height + 10;
        p.a = Math.random() * 0.35 + 0.05;
      }
      sctx.save();
      sctx.globalAlpha = p.a;
      sctx.fillStyle = `rgba(200,169,110,${p.a})`;
      sctx.beginPath();
      sctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      sctx.fill();
      sctx.restore();
    });
    raf = requestAnimationFrame(draw);
  }
  draw();
  return () => cancelAnimationFrame(raf);
}

let stopSpoilerParticles = null;

function dismissSpoilerGate() {
  const gate = document.getElementById('spoiler-gate');
  if (!gate) return;
  try { localStorage.setItem('vivant_spoiler_ok', '1'); } catch (e) {}

  gate.classList.add('dismissed');
  gate.style.display = 'none';
  document.body.classList.remove('spoiler-active');
  if (stopSpoilerParticles) stopSpoilerParticles();
  setTimeout(() => { if (gate && gate.parentNode) gate.parentNode.removeChild(gate); }, 300);
}
window.dismissSpoilerGate = dismissSpoilerGate;

(function initSpoilerGate() {
  const gate = document.getElementById('spoiler-gate');
  if (!gate) return;

  const STORAGE_KEY = 'vivant_spoiler_ok';
  let hasConsented = false;
  try { hasConsented = localStorage.getItem(STORAGE_KEY) === '1'; } catch(e) {}

  trackAndShowCounts();

  if (hasConsented) {
    gate.style.display = 'none';
    return;
  }

  document.body.classList.add('spoiler-active');
  stopSpoilerParticles = initSpoilerParticles();
})();


// ════════════════════════════════════════════
//  GLOBAL ORG TAB SWITCHER (100% Direct Trigger)
// ════════════════════════════════════════════
function switchOrgTab(orgId) {
  if (!orgId) return;

  // Toggle Tab active state
  const tabs = document.querySelectorAll('.org-tab');
  tabs.forEach(tab => {
    if (tab.dataset.org === orgId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Hide all panels
  const panels = document.querySelectorAll('.org-panel');
  panels.forEach(panel => {
    panel.classList.remove('active');
    panel.style.setProperty('display', 'none', 'important');
  });

  // Show target panel
  const targetPanel = document.getElementById(`org-${orgId}`);
  if (targetPanel) {
    targetPanel.classList.add('active');
    targetPanel.style.setProperty('display', 'block', 'important');

    // Trigger sequential fade in for cards inside selected panel
    const cards = targetPanel.querySelectorAll('.org-card, .org-info-bar, .monitor-rank-header, .monitor-system-title');
    cards.forEach((c, i) => {
      c.style.opacity = '0';
      c.style.transform = 'translateY(12px)';
      c.style.filter = 'blur(2px)';
      setTimeout(() => {
        c.style.transition = 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), filter 0.25s ease';
        c.style.opacity = '1';
        c.style.transform = 'translateY(0)';
        c.style.filter = 'blur(0)';
      }, i * 35);
    });
  }
}
window.switchOrgTab = switchOrgTab;


// ════════════════════════════════════════════
//  MAIN NAVIGATION & ORG TABS
// ════════════════════════════════════════════
// Main Page Navigation
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-btn');
  if (!btn) return;
  
  const target = btn.dataset.page;
  if (!target) return;

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  btn.classList.add('active');
  const targetPage = document.getElementById(`page-${target}`);
  if (targetPage) {
    targetPage.classList.add('active');
  }

  if (target === 'analysis' && typeof animateStats === 'function') {
    setTimeout(animateStats, 100);
  }

  if (typeof triggerHackerSequentialStream === 'function') {
    triggerHackerSequentialStream();
  }
});

(function initOrgTabs() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.org-tab');
    if (!btn) return;

    const org = btn.dataset.org;
    if (!org) return;

    // Toggle Tab Active Classes
    const tabBar = document.getElementById('org-tabs');
    if (tabBar) {
      tabBar.querySelectorAll('.org-tab').forEach(t => t.classList.remove('active'));
    }
    btn.classList.add('active');

    // Hide all org-panel sections
    document.querySelectorAll('.org-panel').forEach(p => {
      p.classList.remove('active');
      p.style.display = 'none';
    });

    // Show selected panel
    const targetPanel = document.getElementById(`org-${org}`);
    if (targetPanel) {
      targetPanel.classList.add('active');
      targetPanel.style.display = 'block';

      // Reset and trigger sequential scan animation for children
      const cards = targetPanel.querySelectorAll('.org-card, .org-info-bar, .monitor-rank-header, .monitor-system-title');
      cards.forEach((c, i) => {
        c.style.opacity = '0';
        c.style.transform = 'translateY(12px)';
        c.style.filter = 'blur(2px)';

        setTimeout(() => {
          c.style.transition = 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), filter 0.3s ease';
          c.style.opacity = '1';
          c.style.transform = 'translateY(0)';
          c.style.filter = 'blur(0)';
        }, i * 40);
      });
    }
  });
})();

// ════════════════════════════════════════════
//  PARTICLE SYSTEM
// ════════════════════════════════════════════
const canvas = document.getElementById('particleCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

let particles = [];
let animFrame;

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

class Particle {
  constructor() { this.reset(); }
  reset() {
    if (!canvas) return;
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2 + 0.5;
    this.speedX = (Math.random() - 0.5) * 0.5 + 0.2;
    this.speedY = (Math.random() - 0.5) * 0.3;
    this.opacity = Math.random() * 0.5 + 0.1;
    this.life = 0;
    this.maxLife = Math.random() * 300 + 200;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life++;
    if (this.life >= this.maxLife || (canvas && this.x > canvas.width)) {
      this.reset();
      if (canvas) this.x = 0;
    }
  }
  draw() {
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = this.opacity * (1 - this.life / this.maxLife);
    ctx.fillStyle = '#c8a96e';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function initParticles() {
  particles = Array.from({ length: 60 }, () => new Particle());
}

function animateParticles() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  animFrame = requestAnimationFrame(animateParticles);
}

if (canvas) {
  window.addEventListener('resize', () => { resizeCanvas(); });
  resizeCanvas();
  initParticles();
  animateParticles();
}

// ════════════════════════════════════════════
//  CHARACTER DATABASE (全登場人物・モニター詳細データ)
// ════════════════════════════════════════════
const characterMaster = {
  beki: {
    name: 'ノゴーン・ベキ',
    realName: '乃木 卓（のぎ すぐる）',
    actor: '役所 広司',
    org: 'THE TENT 創設者・最高指導者（元：警視庁公安部）',
    position: '【創設者・精神的支柱】元・公安警察官であり、過酷な過去を経て孤児救済のための秘密組織「テント」を立ち上げたカリスマ。',
    profile: '島根県出身。元警察庁警備局外事課（公安）の警察官。バルカでの極秘任務中に日本政府に見殺しに遭い、妻を失い、幼い息子（憂助）とも離れ離れになる。生き延びた後、バルカの孤児たちを育てるために「テント」を創設した。',
    storyline: '【シーズン1】テロ活動で得た資金の多くをバルカの孤児院運営と土地（フローライト鉱脈）購入に充てていた。乃木憂助が実の息子であることを確認し、父子の絆を取り戻すも、国を守る乃木の信念を尊重。最後は乃木の手により銃撃され姿を消す。\n【シーズン2】その遺志と遺したフローライト鉱脈が、ノコルと乃木の共通の目的となり、物語の根幹を支え続けている。',
    relations: ['乃木憂助（実の息子）', 'ノコル（義理の息子・後継者）', 'バトラカ（側近・軍事）', 'ピヨ（側近・護衛）', 'アリ（モニター統括幹部）'],
    googleQuery: 'VIVANT ノゴーンベキ 役所広司'
  },

  nokoru: {
    name: 'ノコル',
    actor: '二宮 和也',
    org: 'THE TENT ナンバー2 / ムルーデル資源開発会社 代表',
    position: '【テント後継指導者】ベキの義理の息子であり、実質的な組織の若きリーダー。高い知性とビジネス手腕を持つ。',
    profile: 'ベキに拾われ実子同然に育てられた。父ベキを深く敬愛し、テントの表の顔であるムルーデル資源開発の代表として、フローライト（蛍石）事業を統括。感情を表に出さない冷静沈着な策士。',
    storyline: '【シーズン1】突如現れたベキの実子・乃木憂助に対して激しい嫉妬と警戒心を抱く。しかし、父の最期を経て乃木の真意とベキの誓いを知り、組織の存続を託される。\n【シーズン2】ベキの意志を継ぎ、テントの平和的転換とフローライト利権を守るため自ら指揮を執る。乃木との「義兄弟」の絆と確執が新たな物語の核。',
    relations: ['ノゴーン・ベキ（義父）', '乃木憂助（義理の兄・別班）', 'ピヨ（絶対の側近）', 'バトラカ（幹部）'],
    googleQuery: 'VIVANT ノコル 二宮和也'
  },

  bataraka: {
    name: 'バトラカ',
    actor: '林 泰文',
    org: 'THE TENT 幹部 / 民間軍事企業「Y2K」代表',
    position: '【軍事・補給統括幹部】テントの軍事行動と資金管理、裏の補給ルートを仕切るベキの最古参側近。',
    profile: 'ベキが初期に救い出した孤児のひとり。表向きは民間軍事会社「Y2K」の代表を務め、組織の武装・兵力調達・作戦参謀として絶対的な信頼を得ている。',
    storyline: '【シーズン1】アリや山本を通じて日本国内での誤送金工作や資金回収を指示。ベキの理念に深く共鳴しており、組織の裏方として冷酷かつ緻密に活動。\n【シーズン2】ノコルの新体制下でも軍事・警備面の実務トップとして組織を強固に防衛。',
    relations: ['ノゴーン・ベキ（絶対の忠誠）', 'ノコル（新指導者）', 'ピヨ（幹部仲間）', 'アリ（モニター統括）'],
    googleQuery: 'VIVANT バトラカ 林泰文'
  },

  piyo: {
    name: 'ピヨ',
    actor: '吉原 光夫',
    org: 'THE TENT 幹部 / ノコル直属側近（狙撃手）',
    position: '【ノコルの絶対的護衛】屈強な体躯と超一流の狙撃技術を持つ、ノコルの最側近武闘派幹部。',
    profile: 'ノコルの身辺警護を専門とし、常にノコルの傍らで脅威を排除する。「ピヨ」という愛らしいコードネームとは裏腹に、無口で冷徹なプロフェッショナル。',
    storyline: '【シーズン1】ノコルの指示のもと数々の危険な局面で狙撃・護衛を担当。乃木がテント内部に入り込んだ際も強い警戒を解かなかった。\n【シーズン2】ノコル率いる新テントにおいても前線護衛の頭脳・拳として活躍。',
    relations: ['ノコル（主君）', 'ベキ（創設者）', 'バトラカ（同僚幹部）'],
    googleQuery: 'VIVANT ピヨ 吉原光夫'
  },

  ali: {
    name: 'アリ',
    realName: 'アリ・カン',
    actor: '山中 崇',
    org: 'THE TENT 日本担当幹部 / GFL社 社長 / モニター統括指揮官',
    position: '【モニター統括幹部】日本担当幹部として、日本国内に潜伏する全モニター（新庄・山本ら）を総括・指示するトップ。',
    profile: '日本とバルカの経済パイプを持ち、GFL社の社長を務めながら、山本や新庄ら日本国内の全モニターへ暗号指令を送る統括役。',
    storyline: '【シーズン1】誤送金発覚後、乃木憂助（F）と野崎による凄惨な尋問を受け、テントのリーダーが「ノゴーン・ベキ」であることを白状させられた。家族の安全と引き換えに証言。',
    relations: ['ノゴーン・ベキ（最高指導者）', '新庄浩太郎（配下モニター・ランク1）', '山本巧（配下モニター・ランク3）', '乃木憂助（尋問者）'],
    googleQuery: 'VIVANT アリ 山中崇'
  },

  yamatomo: {
    name: '山本 巧（やまもと たくみ）',
    actor: '迫田 孝也',
    org: '丸菱商事 業務部 / テントの末端モニター（ランク3）',
    position: '【一番下の末端モニター（ランク3）】丸菱商事に潜伏し、アリの指示を受けて1億ドルの誤送金を操作した末端協力者。',
    profile: '丸菱商事で乃木と同僚・友人として親しく接していたが、裏ではテントの末端モニター（ランク3）として長年潜伏。太田梨花を脅迫・利用してシステムを改ざんさせた。',
    storyline: '【シーズン1】誤送金事件の黒幕として乃木・黒須（別班）に拉致される。乃木が「別班」の本性を現した直後、自白剤を打たれ真相を告白。自死に見せかけて乃木に処刑された。',
    relations: ['乃木憂助（同僚・実は捕獲者）', '太田梨花（脅迫対象）', 'アリ（直属のモニター統括指示役）'],
    googleQuery: 'VIVANT 山本巧 迫田孝也'
  },

  shinjo: {
    name: '新庄 浩太郎（しんじょう こうたろう）',
    actor: '竜星 涼',
    org: '警視庁公安部 外事第4課 / テント高ランクモニター（ランク1）',
    position: '【公安内部の二重スパイ】野崎の部下として潜入。モニター統括・アリの指揮下で公安の機密情報を漏洩させていた高ランクモニター。',
    profile: '警視庁公安部で野崎守の右腕として捜査にあたっていたが、その正体はベキの命で警察機構に潜り込んでいたテントの最高レベル（ランク1）協力者。非常な高能力を持つ。',
    storyline: '【シーズン1】野崎の別班・テント追跡作戦の裏で、常にテントへ情報を漏洩。終盤で正体が発覚し追跡を逃れて姿をくらます。\n【シーズン2】タイへの潜伏が確認され、別班員拉致事件や国外ハッキング勢力との関与が疑われる最重要危険人物。',
    relations: ['野崎守（元・上司・追跡者）', 'アリ（モニター統括指示役）', 'ノゴーン・ベキ（真の主君）'],
    googleQuery: 'VIVANT 新庄浩太郎 竜星涼'
  },

  
  monitor_unknown1: {
    name: '？？？（未判明 ランク1モニター 2/7）',
    realName: 'コードネーム：ランク1・アルファ',
    actor: 'キャスト未発表',
    org: 'THE TENT 潜伏協力者（ランク1：防衛省・中枢潜入疑惑）',
    position: '【ランク1 モニター（全7名のうちの1人）】防衛省・自衛隊中枢に潜み、別班の動向や自衛隊内部の極秘情報を漏洩させているとされる最高位モニター。',
    profile: '作中セリフ「ランク1のモニターは世界に7人存在する」で明かされた最高ランクの潜伏者。国家安全保障に関わるアクセス権限を持つ。',
    storyline: '【考察・分析データ】\n・公安の新庄に続く「第2の国家機関モニター」として強い疑惑が存在。\n・シーズン2で発生した別班員拉致事件において、内部からルートを漏洩させた人物としての可能性が最有力視されている。',
    relations: ['新庄浩太郎（同ランク1モニター）', 'アリ（モニター統括）'],
    googleQuery: 'VIVANT モニター 7人 考察'
  },

  monitor_unknown2: {
    name: '？？？（未判明 ランク1モニター 3/7）',
    realName: 'コードネーム：ランク1・ベータ',
    actor: 'キャスト未発表',
    org: 'THE TENT 潜伏協力者（ランク1：警察・情報機関潜入疑惑）',
    position: '【ランク1 モニター（全7名のうちの1人）】警察庁・情報通信局等に潜入し、新庄と共に警察機構を監視・情報流出させている高ランクモニター。',
    profile: '警察の通信傍受やデジタル捜査を裏で無力化する高度なアクセス権を持つ。新庄の逃亡を裏で手引した可能性が指摘されている。',
    storyline: '【考察・分析データ】\n・新庄浩太郎の警察内部での二重スパイ活動をサポートし、公安の追跡を何度も攪乱した形跡が存在。',
    relations: ['新庄浩太郎（同ランク1モニター）', 'アリ（モニター統括）'],
    googleQuery: 'VIVANT モニター ランク1'
  },

  monitor_unknown3: {
    name: '？？？（未判明 ランク1モニター 4/7）',
    realName: 'コードネーム：ランク1・ガンマ',
    actor: 'キャスト未発表',
    org: 'THE TENT 潜伏協力者（ランク1：外務省・外交ルート潜入疑惑）',
    position: '【ランク1 モニター（全7名のうちの1人）】外務省・大使館等に潜入し、国際的な外交特権や極秘暗号通信ルートを確保する最高位モニター。',
    profile: 'バルカ共和国など海外拠点と日本国内との間での極秘情報・資金移動を外交ルートを通じて支援。',
    storyline: '【考察・分析データ】\n・バルカでの爆破事件や乃木らの逃亡時、外交ルートを通じて極秘情報をテント本部に送っていた疑惑がある。',
    relations: ['アリ（モニター統括）', 'ノゴーン・ベキ（最高指導者）'],
    googleQuery: 'VIVANT 考察 新庄 モニター'
  },

  monitor_unknown4: {
    name: '？？？（未判明 ランク1モニター 5/7）',
    realName: 'コードネーム：ランク1・デルタ',
    actor: 'キャスト未発表',
    org: 'THE TENT 潜伏協力者（ランク1：金融・基幹インフラ潜入疑惑）',
    position: '【ランク1 モニター（全7名のうちの1人）】メガバンク・国際決済送金網（SWIFT等）の中枢に潜伏する最高位金融モニター。',
    profile: '1億ドル誤送金事件の背景にある巨大な国際送金ルートの隠蔽・海外口座開設を裏で統括したプロフェッショナル。',
    storyline: '【考察・分析データ】\n・アリや山本巧（ランク3）の上位として、膨大なテロ資金のマネーロンダリングを完遂させた。',
    relations: ['アリ（モニター統括）', '山本巧（ランク3末端）'],
    googleQuery: 'VIVANT 誤送金 考察'
  },

  monitor_unknown5: {
    name: '？？？（未判明 ランク1モニター 6/7）',
    realName: 'コードネーム：ランク1・イプシロン',
    actor: 'キャスト未発表',
    org: 'THE TENT 潜伏協力者（ランク1：サイバー・高度暗号網潜入疑惑）',
    position: '【ランク1 モニター（全7名のうちの1人）】サイバー空間の最深部に潜み、量子暗号や独立型AI「ハヤト」を操作する最高位ハッカー。',
    profile: '公安の東条実（天才ハッカー）に匹敵、またはそれ以上のサイバースキルを持ち、テントの通信インフラを完全に防壁化。',
    storyline: '【考察・分析データ】\n・シーズン2に登場する独立型AIシステム「ハヤト」の開発・運用に深く関与していると見られている。',
    relations: ['東条実（対峙）', 'ハヤト（AIシステム）'],
    googleQuery: 'VIVANT AI ハヤト 考察'
  },

  monitor_unknown6: {
    name: '？？？（未判明 ランク1モニター 7/7）',
    realName: 'コードネーム：ランク1・ゼータ',
    actor: 'キャスト未発表',
    org: 'THE TENT 潜伏協力者（ランク1：海外・国際機関潜入疑惑）',
    position: '【ランク1 モニター（全7名のうちの1人）】国連・国際治安機関・東南アジア拠点に潜伏する海外版最高位モニター。',
    profile: 'タイやバルカ周辺国に潜伏し、新庄浩太郎などの逃亡した高ランクモニターの海外逃亡アジトや国際手配の抹消を担当。',
    storyline: '【考察・分析データ】\n・新庄浩太郎のタイでの高飛びおよび国際手配からの逃亡を裏で手配した人物。',
    relations: ['新庄浩太郎（タイでの保護対象）', 'アリ（モニター統括）'],
    googleQuery: 'VIVANT 続編 考察'
  },

  mata: {
    name: 'マタ',
    actor: '内村 遥',
    org: 'THE TENT 構成員',
    position: '【現場実動部隊】テントの孤児出身者。作戦活動や通信暗号管理を担当。',
    profile: 'ベキによって救われた孤児のひとり。ベキへの報恩のために組織に身を捧げている。',
    storyline: '【シーズン1】バルカ本部での兵站・通信管理を担当。',
    relations: ['ノゴーン・ベキ（恩人）', 'ノコル（指導者）'],
    googleQuery: 'VIVANT マタ 内村遥'
  },

  shichi: {
    name: 'シチ',
    actor: '井上 肇',
    org: 'THE TENT 構成員',
    position: '【土地・資源管理協力者】バルカ領内での拠点維持や情報収集をサポート。',
    profile: 'テントの理念を支持し、長年組織を裏から支える熟練の構成員。',
    storyline: '【シーズン1】フローライト鉱脈の極秘調査や組織防衛に寄与。',
    relations: ['ノゴーン・ベキ（指導者）'],
    googleQuery: 'VIVANT シチ 井上肇'
  },

  sakurai: {
    name: '桜井 里美（さくらび さとみ）',
    actor: 'キムラ 緑子',
    org: '陸上自衛隊 幕僚監部付情報本部 非公認組織「別班」司令',
    position: '【別班の絶対的指揮官】国の防衛のため、法を超えた特殊工作命令を下す「別班」の最高司令官。',
    profile: '表向きは防衛省の要職。冷徹な判断力と冷酷なまでの国家防衛本能を持ち、乃木や黒須ら工作員をチェスの駒のように指揮する。',
    storyline: '【シーズン1】乃木にテント潜入作戦を命じ、偽装寝返りや仲間撃ちという過酷な密命を与えた。\n【シーズン2】国内外の新たな防衛危機に対し、乃木・黒須・そして新判明したメンバーへ極秘作戦を発動。',
    relations: ['乃木憂助（最精鋭部下）', '黒須駿（部下）', '長野利彦（S2で別班として共闘）'],
    googleQuery: 'VIVANT 桜井里美 キムラ緑子'
  },

  nogi: {
    name: '乃木 憂助（のぎ ゆうすけ）',
    actor: '堺 雅人',
    org: '陸上自衛隊「別班」主任工作員 / 丸菱商事 エネルギー事業部（表の顔）',
    position: '【本作の主人公】冴えない商社マンと、冷徹無比な超一流スパイ「別班」の二つの顔を持つ男。',
    profile: '幼少期に両親と離別し苛烈な環境で育った。特異なミリタリースキルと、絶体絶命の時に現れる大胆不敵な別人格「F」を持つ。ベキ（乃木卓）の生き別れた実の息子。',
    storyline: '【シーズン1】誤送金1億ドル回収のためバルカへ飛び、公安・野崎の追跡を交わしながら別班として覚醒。テントに潜入し、実父ベキと感動と苦悩の再会を果たす。国を守るためベキを射撃。\n【シーズン2】ベキの遺志とフローライトを守るため、義弟ノコルと共に新たな巨大な影に立ち向かう。',
    relations: ['ノゴーン・ベキ（実父）', 'ノコル（義弟）', '野崎守（宿敵であり最大の理解者）', '黒須駿（信頼する相棒）', '柚木薫（愛する人・心の平穏）'],
    googleQuery: 'VIVANT 乃木憂助 堺雅人'
  },

  kurosu: {
    name: '黒須 駿（くろす しゅん）',
    actor: '松坂 桃李',
    org: '陸上自衛隊「別班」工作員',
    position: '【乃木の信頼厚き相棒】武器調達・重火力・エンジニアリングに秀でた別班の若手エリート。',
    profile: '乃木を先輩として深く尊敬。情に厚く直情的な面もあるが、戦闘時・暗殺時の実行力は極めて高い。',
    storyline: '【シーズン1】乃木と共にテント幹部・山本を尋問・処分。テント潜入時、乃木に打たれて捕虜となる演技をさせられ激しく葛藤するが、乃木の真意を知り絆を深める。\n【シーズン2】乃木の右腕として前線で作戦を遂行。',
    relations: ['乃木憂助（尊敬する先輩・相棒）', '桜井里美（司令）'],
    googleQuery: 'VIVANT 黒須駿 松坂桃李'
  },

  nagano: {
    name: '長野 利彦（ながの としひこ）',
    actor: '小日向 文世',
    org: '丸菱商事 専務取締役 / 陸上自衛隊「別班」（S2で発覚）',
    position: '【S2の鍵を握る重要人物】丸菱商事の温厚な幹部役員。しかしその正体は長年潜伏していた「別班員」。',
    profile: '一見、防衛大学校出身のインテリ役員。過去に薬物依存症の更生施設に入所していた経歴があり、公安の野崎からも疑いの目を向けられていた。',
    storyline: '【シーズン1】誤送金事件の社内調査で怪しい動きを見せるも、不倫隠しと主張して追及を逃れていた。\n【シーズン2】第12話にて自ら「別班」であることを乃木らに明かす。しかし独断専行の捜査や新庄との密会など、黒幕（ダブルスパイ）疑惑が強く囁かれている。',
    relations: ['乃木憂助（部下・別班同僚）', '太田梨花（過去の愛人関係）', '新庄浩太郎（裏での密会疑惑）'],
    googleQuery: 'VIVANT 長野利彦 小日向文世'
  },

  sano: {
    name: '佐野 文彦（さの ふみひこ）',
    actor: '坂東 彌十郎',
    org: '警視庁公安部 部長',
    position: '【公安の最高責任者】野崎の上司であり、警察機構における国家治安維持のトップ。',
    profile: '冷静沈着で政治的判断にも長ける。別班の暗躍を警戒しつつも、国家の危機に際しては柔軟な指揮を執る。',
    storyline: '【シーズン1】野崎のバルカ捜査およびテント追跡を全面的に承認・バックアップ。\n【シーズン2】新庄の裏切り発覚を受け、公安内部の徹底清掃と組織再編を指揮。',
    relations: ['野崎守（部下）', '新庄浩太郎（元部下・裏切り者）'],
    googleQuery: 'VIVANT 佐野文彦 坂東彌十郎'
  },

  nozaki: {
    name: '野崎 守（のざき まもる）',
    actor: '阿部 寛',
    org: '警視庁公安部 外事第4課 理事官',
    position: '【追跡者・熱き公安警部】脅威的な洞察力と行動力で「別班」「テント」双方を追い続ける執念の男。',
    profile: '強烈な正義感と人間味を合わせ持つ公安のエリート。「仲間は見捨てない」を信条とし、バルカ警察のチンギスとも強固な信頼関係を築く。乃木の正体（別班）を最初に見抜いた。',
    storyline: '【シーズン1】バルカでの乃木逃亡劇を助けつつ、乃木の挙動から彼が「別班」であると確信。ベキと乃木の父子関係を突き止め、ラストでは乃木と無言の絆を交わす。\n【シーズン2】新庄の逃亡と新たな国際テロの陰謀を追う中で、再び乃木と複雑な協力関係を構築。',
    relations: ['乃木憂助（ライバル・戦友）', 'ドラム（愛用助手）', 'チンギス（バルカの盟友）', '新庄浩太郎（元部下・裏切り者）'],
    googleQuery: 'VIVANT 野崎守 阿部寛'
  },

  tojo: {
    name: '東条 実（とうじょう のぞむ）',
    actor: '濱田 岳',
    org: '警視庁公安部 サイバー犯罪対策課 / 外事第4課協力',
    position: '【超一流ハッカー・サイバー天才】公安が誇るサイバー捜査のスペシャリスト。',
    profile: 'ホワイトハッカーとしての圧倒的スキルを持ち、防犯カメラ解析・サーバー侵入・暗号解読を即座にこなす。アニメ好きでコミカルな一面も。',
    storyline: '【シーズン1】丸菱商事の誤送金サーバーのデータを復元・解析し、山本の改ざん工作を暴いた。\n【シーズン2】新庄の通信ログ解析や謎の国外ハッカー集団のサイバー攻撃防衛で大活躍。',
    relations: ['野崎守（捜査依頼者）', '太田梨花（ハッカー仲間としてのライバル意識）'],
    googleQuery: 'VIVANT 東条実 濱田岳'
  },

  hirose: {
    name: '広瀬 薫（ひろせ かおる）',
    actor: '珠城 りょう',
    org: '丸菱商事 エネルギー事業部 社員',
    position: '【乃木の同僚】丸菱商事での乃木の表の業務を支える同僚社員。',
    profile: '明るく真面目な性格。乃木が誤送金の容疑をかけられた際も心配し続けた。',
    storyline: '【シーズン1】社内での乃木の無実を信じ、データ収集を手助けした。',
    relations: ['乃木憂助（同僚）', '山本巧（元同僚）'],
    googleQuery: 'VIVANT 広瀬薫 珠城りょう'
  },

  cinggis: {
    name: 'チンギス',
    actor: 'Barslkhagva Batbold',
    org: 'バルカ共和国 警察 警視',
    position: '【バルカの執念の警察官】かつて乃木・野崎を容赦なく追いつめたバルカ警察の顔。',
    profile: '圧倒的な現地捜査能力と手下を動員するカリスマを持つ。最初は執拗な敵として立ちはだかったが、孤児院出身でありベキの慈善活動を知ったことで野崎と深い絆を結ぶ。',
    storyline: '【シーズン1】乃木らの逃亡を執念で追うが、日本大使館逃げ込みで作戦失敗。後に野崎と協力し、テントの孤児救済事業を目の当たりにして野崎の最強の味方となる。\n【シーズン2】バルカ国内の警備・検問で野崎・乃木を全面的にバックアップ。',
    relations: ['野崎守（盟友）', 'ノゴーン・ベキ（恩人）'],
    googleQuery: 'VIVANT チンギス'
  },

  jemaine: {
    name: 'ジェメイン',
    actor: 'Erkhembayar Ganbold',
    org: 'バルカ共和国 外務省 / 警察幹部',
    position: '【バルカ政府要人】政府・警察内部で政治的調整を行う幹部。',
    profile: 'フローライト採掘利権をめぐり、政府側の交渉役として動く。',
    storyline: '【シーズン1】テントとの利権交渉や日本政府との外交防衛で暗躍。',
    relations: ['チンギス（部下）', 'ノコル（交渉相手）'],
    googleQuery: 'VIVANT ジェメイン'
  },

  hiromichi: {
    name: 'ヤルノ（広道）',
    actor: '河内 大和',
    org: 'バルカ政府 国家安全保障顧問',
    position: '【バルカ政界の黒幕】バルカ政府の安全保障を統括する冷徹な官僚。',
    profile: '国家の利益を最優先し、テントの持つフローライト資源の奪取を狙う。',
    storyline: '【シーズン1・2】バルカ政府の表と裏の利権を調整。',
    relations: ['ノコル（ビジネス相手）'],
    googleQuery: 'VIVANT ヤルノ 河内大和'
  },

  yuzuki: {
    name: '柚木 薫（ゆずき かおる）',
    actor: '二階堂 ふみ',
    org: '世界医療機構（WHO）医師 / 赤十字病院',
    position: '【ヒロイン・乃木の心の光】バルカで難病の少女ジャミーンを救うために奮闘する熱き医師。',
    profile: '正義感が強く、患者のためならどんな危険も顧みない。バルカでの事件を通じて乃木・野崎と行動を共にし、やがて乃木の深い孤独を理解し愛し合うようになる。',
    storyline: '【シーズン1】バルカでの爆破事件に巻き込まれ乃木・野崎と共に死の砂漠を脱出。日本帰国後、乃木と恋人関係となる。乃木が別班として去った後も彼を信じて待ち続ける。\n【シーズン2】乃木との愛と、ジャミーンの成長を見守るヒロインとして登場。',
    relations: ['乃木憂助（恋人・愛する人）', '野崎守（命の恩人・協力者）', 'ジャミーン（命を救った少女）'],
    googleQuery: 'VIVANT 柚木薫 二階堂ふみ'
  },

  hayato: {
    name: 'ハヤト（AI）',
    actor: '声：????',
    org: '謎の独立型AIシステム / 国際ハッカーネットワーク',
    position: '【S2からの超重要キーポイント】裏社会や軍事暗号を解析する謎のAI高度知能。',
    profile: '高度なディープラーニングにより生成された意思を持つAI。誰が開発したのか、何を目的に稼働しているのか謎に包まれている。',
    storyline: '【シーズン2】別班や公安のサイバー網を掻い潜り、新庄や謎の黒幕勢力に情報提供を行っている可能性が浮上。物語のデジタルテロ展開の核。',
    relations: ['新庄浩太郎（使用関係？）', '東条実（解析対象）'],
    googleQuery: 'VIVANT ハヤト AI'
  },

  ota: {
    name: '太田 梨花（おおた りか）',
    actor: '飯沼 愛',
    org: '丸菱商事 財務部社員 / 天才ハッカー「blue@walker」',
    position: '【天才女性ハッカー】丸菱商事の大人しい社員だが、正体は伝説のハッカー。',
    profile: 'かつてネット世界を揺るがしたハッカー「blue@walker」。山本に脅迫され、丸菱商事の誤送金プログラムを書き換えさせられた。長野専務とも過去に関係があった。',
    storyline: '【シーズン1】山本に利用された後に別班（乃木）に保護・救出され、東条（公安）の協力のもとテントのサーバー解析に貢献。\n【シーズン2】サイバー捜査の助っ人として公安・別班に技術協力。',
    relations: ['乃木憂助（救出者）', '山本巧（脅迫者）', '長野利彦（過去の愛人関係）', '東条実（サイバー仲間）'],
    googleQuery: 'VIVANT 太田梨花 飯沼愛'
  },

  suzuki: {
    name: '鈴木 祥太（すずき しょうた）',
    actor: '岩本 照',
    org: '警視庁公安部 サイバー捜査官',
    position: '【公安サイバーチーム】東条と共にデジタル解析にあたる若手捜査官。',
    profile: '最新のサイバーセキュリティ技術に精通し、現場でのデータ押収や端末解析を担当。',
    storyline: '【シーズン1・2】誤送金データの修復や新庄の通信暗号解析に従事。',
    relations: ['野崎守（上司）', '東条実（先輩）'],
    googleQuery: 'VIVANT 鈴木祥太'
  },

  usami: {
    name: '宇佐美 哲也（うさみ てつや）',
    actor: '市川 猿弥',
    org: '丸菱商事 代表取締役社長',
    position: '【丸菱商事トップ】大手総合商社・丸菱商事の最高責任者。1億ドル（約140億円）誤送金事件で窮地に立たされた。',
    profile: '丸菱商事の代表取締役社長。会社の名誉と株価維持を第一に考え、事件発覚直後は乃木に責任を押し付けようとした典型的な保守派経営者。',
    storyline: '【シーズン1】誤送金事件の発覚により緊急役員会を招集。乃木を追及するも、別班や公安の捜査が進むにつれ社内の暗部（山本・長野・太田）が暴かれ激震を受ける。',
    relations: ['長野利彦（専務）', '水上志郎（常務）', '乃木憂助（部下）'],
    googleQuery: 'VIVANT 宇佐美社長 市川猿弥'
  },

  mizukami: {
    name: '水上 志郎（みずかみ しろう）',
    actor: '古舘 寛治',
    org: '丸菱商事 常務取締役',
    position: '【丸菱商事役員】社内の派閥抗争で専務の長野利彦と鋭く対立する常務取締役。',
    profile: '丸菱商事の常務取締役。長野専務の社内での影響力を抑え込もうと画策。長野の過去の薬物更生施設入所や不倫の噂を裏で探っていた。',
    storyline: '【シーズン1】誤送金事件に乗じて長野専務失脚を狙う社内政治を展開。長野が「別班員」であることが判明したS2においても警戒を強める。',
    relations: ['長野利彦（社内ライバル）', '宇佐美哲也（社長）'],
    googleQuery: 'VIVANT 水上常務 古舘寛治'
  },

  kawai: {
    name: '河合 幸二（かわい こうじ）',
    actor: '渡辺 邦斗',
    org: '丸菱商事 エネルギー事業部 部長',
    position: '【乃木の直属の上司】乃木憂助が所属するエネルギー事業部の部長。保身と出世を最優先する上司。',
    profile: 'エネルギー事業部トップ。バルカでの1億ドル誤送金が起きた際、自分の責任回避のため乃木を真っ先に疑い厳しく追及した。',
    storyline: '【シーズン1】乃木にバルカへの単身乗り込みと誤送金回収を命じた。乃木が無実を証明し別班として覚醒した後、一転して乃木への態度を激変させた。',
    relations: ['乃木憂助（直属の部下）', '広瀬薫（部下）', '水越智洋（部下）'],
    googleQuery: 'VIVANT 河合部長 渡辺邦斗'
  },

  mizukoshi: {
    name: '水越 智洋（みずこし ともひろ）',
    actor: '西山 潤',
    org: '丸菱商事 エネルギー事業部 2課 社員',
    position: '【乃木の同僚】エネルギー事業部2課で乃木・広瀬と共に働く若手社員。',
    profile: '乃木の部下・同僚として業務をサポート。乃木が誤送金容疑を掛けられた際も社内で乃木を心配していた。',
    storyline: '【シーズン1】社内データの手配や乃木の送金データの追跡に協力。',
    relations: ['乃木憂助（上司）', '広瀬薫（同僚）'],
    googleQuery: 'VIVANT 水越智洋 西山潤'
  },

  hara: {
    name: '原 智彦（はら ともひこ）',
    actor: '橋本 さとし',
    org: '丸菱商事 経理部 部長',
    position: '【経理部トップ】誤送金の送金決済・承認プロセスを担当していた経理部長。',
    profile: '会社の財務資金移動を厳重に管理する立場でありながら、山本や太田の改ざんプログラムによって送金ボタンを押させられてしまった。',
    storyline: '【シーズン1】誤送金の手続き最終確認を行った人物として公安・別班の調査対象となった。',
    relations: ['太田梨花（財務部）', '山本巧（業務部）', '宇佐美社長（上司）'],
    googleQuery: 'VIVANT 原部長 橋本さとし'
  }
};

// ════════════════════════════════════════════
//  MODAL SYSTEM
// ════════════════════════════════════════════
window.openModal = openModal;
function openModal(memberId, event) {
  if (event) {
    if (event.target && event.target.closest('a')) {
      return; // Do not open modal if user tapped an <a> link (Google search)
    }
  }

  const data = characterMaster[memberId];
  if (!data) {
    console.warn('No character data for ID:', memberId);
    return;
  }

  const content = document.getElementById('modal-content');
  if (!content) return;

  const googleSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(data.googleQuery || ('VIVANT ' + data.name))}`;

  content.innerHTML = `
    <div class="modal-header-badge">${data.org || '所属不詳'}</div>
    
    <div class="modal-title-row">
      <h2 class="modal-name">${data.name}</h2>
      ${data.realName ? `<span class="modal-realname">（${data.realName}）</span>` : ''}
    </div>
    
    <div class="modal-actor">演：${data.actor || '不明'}</div>
    
    <div class="modal-search-box">
      <a href="${googleSearchUrl}" target="_blank" rel="noopener" class="modal-google-btn">
        <span>🔍 Google画像検索で「${data.name}」を見る</span>
        <span class="modal-btn-arrow">↗</span>
      </a>
    </div>

    <div class="modal-divider"></div>

    <div class="modal-card-block">
      <div class="modal-block-label">◈ 作中でのポジション・役割</div>
      <div class="modal-block-text highlight-box">${data.position}</div>
    </div>

    <div class="modal-card-block">
      <div class="modal-block-label">◈ 人物プロフィール・経歴</div>
      <div class="modal-block-text">${data.profile}</div>
    </div>

    <div class="modal-card-block">
      <div class="modal-block-label">◈ 今までの立ち回り・作中での行動履歴</div>
      <div class="modal-block-text story-line-text">${data.storyline.replace(/\n/g, '<br>')}</div>
    </div>

    ${data.relations && data.relations.length ? `
    <div class="modal-card-block">
      <div class="modal-block-label">◈ 主要人物との関係性</div>
      <div class="modal-relations-list">
        ${data.relations.map(r => `<span class="modal-rel-tag">${r}</span>`).join('')}
      </div>
    </div>
    ` : ''}
  `;

  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.add('visible');
  }
}

function openCharModal(charId) {
  openModal(charId);
}

// ════════════════════════════════════════════
//  GLOBAL EVENT LISTENERS & FILTERING LOGIC
// ════════════════════════════════════════════

// ════════════════════════════════════════════
//  HACKER SEQUENTIAL STREAM LOADING (上から連続表示)
// ════════════════════════════════════════════
function triggerHackerSequentialStream() {
  const activePage = document.querySelector('.page.active') || document.getElementById('page-org');
  if (!activePage) return;

  // Collect top-down sequential elements
  const elements = [];
  
  // Header / Page Title
  const pageHeader = activePage.querySelector('.page-header');
  if (pageHeader) elements.push(pageHeader);

  // Tabs / Filters
  const tabs = activePage.querySelector('.org-tabs') || activePage.querySelector('.filter-bar');
  if (tabs) elements.push(tabs);

  // Info Bar
  const activePanel = activePage.querySelector('.org-panel.active') || activePage;
  const infoBar = activePanel.querySelector('.org-info-bar');
  if (infoBar) elements.push(infoBar);

  // Monitor System Titles & Rank Headers
  const systemTitles = activePanel.querySelectorAll('.monitor-system-title, .monitor-rank-header');
  systemTitles.forEach(t => elements.push(t));

  // Org Card Levels / Individual Cards
  const cards = activePanel.querySelectorAll('.org-card, .char-card, .stat-card, .live-feed-section');
  cards.forEach(c => elements.push(c));

  // Sequentially animate each element from top to bottom
  elements.forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    el.style.filter = 'blur(4px)';
    el.style.transition = 'none';

    setTimeout(() => {
      el.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      el.style.filter = 'blur(0)';
      
      // Cyber scan line flash
      el.classList.add('cyber-scanned');
      setTimeout(() => el.classList.remove('cyber-scanned'), 600);
    }, index * 70); // 70ms sequential delay for hacker stream effect
  });
}
window.triggerHackerSequentialStream = triggerHackerSequentialStream;

// Trigger on tab switch & initial load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (!document.body.classList.contains('spoiler-active')) {
      triggerHackerSequentialStream();
    }
  }, 100);
});


document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('modal-close');
  const overlay  = document.getElementById('modal-overlay');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => overlay.classList.remove('visible'));
  }
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('visible');
    });
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('visible');
  }
});

document.addEventListener('click', (e) => {
  if (e.target.closest('.card-name-link') || e.target.closest('.char-name-link')) return;

  const orgCard = e.target.closest('.org-card[data-member]');
  if (orgCard) {
    const memberId = orgCard.dataset.member;
    if (memberId) openModal(memberId);
    return;
  }

  const charCard = e.target.closest('.char-card[data-id]');
  if (charCard) {
    const charId = charCard.dataset.id;
    if (charId) openModal(charId);
    return;
  }
});

document.addEventListener('click', (e) => {
  const filterBtn = e.target.closest('.filter-btn[data-filter]');
  if (!filterBtn) return;

  const filter = filterBtn.dataset.filter;
  const bar = filterBtn.closest('.filter-bar');
  if (bar) {
    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    filterBtn.classList.add('active');
  }

  document.querySelectorAll('.char-card').forEach(card => {
    if (filter === 'all' || card.dataset.org === filter) {
      card.style.display = 'flex';
      card.style.opacity = '1';
    } else {
      card.style.display = 'none';
    }
  });
});

// ════════════════════════════════════════════
//  X考察分析 - 統計カウンターアニメーション
// ════════════════════════════════════════════
function animateStats() {
  document.querySelectorAll('.stat-num[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    const duration = 1800;
    const start = Date.now();
    const startVal = 0;
    function tick() {
      const p = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.floor(startVal + ease * (target - startVal)).toLocaleString('ja-JP');
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  // トピックバーのアニメーション
  document.querySelectorAll('.topic-bar-fill').forEach(bar => {
    const pct = bar.style.getPropertyValue('--pct') || bar.style['--pct'];
    bar.style.width = '0%';
    setTimeout(() => {
      bar.style.transition = 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
      bar.style.width = pct;
    }, 100);
  });
}

// ════════════════════════════════════════════
//  X考察分析 - リアルX投稿埋め込みフィード
// ════════════════════════════════════════════

// 実際の #VIVANT考察 ツイートID一覧（X検索で取得した実投稿）
const REAL_TWEET_IDS = [
  '2084981990089199978',  // sankaku.ataru - ベキの嫁・乃木明美が昏睡状態考察
  '2084947329090732260',  // こんとれいる@輝 - 新庄との対峙考察
  '2084344811625328718',  // まゆスパ - VIVANT考察投稿
  '2084202398759976960',  // VIVANT考察投稿
  '2083690250724102144',  // VIVANT考察投稿
  '2084064514285506560',  // VIVANT考察投稿
];

let xEmbedLoaded = false;

// X widgets.js を動的ロード
function loadXWidgets() {
  return new Promise((resolve) => {
    if (window.twttr && window.twttr.widgets) {
      resolve(window.twttr);
      return;
    }
    window.twttr = (function(d, s, id) {
      const fjs = d.getElementsByTagName(s)[0];
      const t = window.twttr || {};
      if (d.getElementById(id)) { resolve(t); return t; }
      const js = d.createElement(s);
      js.id = id;
      js.src = 'https://platform.twitter.com/widgets.js';
      js.onload = () => {
        window.twttr.ready(() => resolve(window.twttr));
      };
      fjs.parentNode.insertBefore(js, fjs);
      return t;
    }(document, 'script', 'twitter-wjs'));
  });
}

async function initLiveFeed() {
  const container = document.getElementById('feed-container');
  if (!container) return;

  const loading = document.getElementById('x-feed-loading');

  try {
    const twttr = await loadXWidgets();

    if (loading) loading.remove();

    // 各ツイートを順番に埋め込む
    let loadedCount = 0;
    for (const tweetId of REAL_TWEET_IDS) {
      const wrapper = document.createElement('div');
      wrapper.className = 'x-tweet-wrapper';
      wrapper.style.opacity = '0';
      wrapper.style.transform = 'translateY(10px)';
      container.appendChild(wrapper);

      try {
        await twttr.widgets.createTweet(tweetId, wrapper, {
          theme: 'dark',
          lang: 'ja',
          align: 'center',
          dnt: true,
          conversation: 'none',
        });
        // フェードイン
        setTimeout(() => {
          wrapper.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
          wrapper.style.opacity = '1';
          wrapper.style.transform = 'translateY(0)';
        }, loadedCount * 100);
        loadedCount++;
      } catch (e) {
        // 該当ツイートが削除・非公開の場合はスキップ
        wrapper.remove();
      }
    }

    if (loadedCount === 0) {
      showXFeedFallback(container);
    }

  } catch (err) {
    if (loading) loading.remove();
    showXFeedFallback(container);
  }
}

// X widgets.js が読み込めない場合のフォールバック（Xへのリンクカード）
function showXFeedFallback(container) {
  container.innerHTML = `
    <div class="x-fallback-card">
      <div class="x-fallback-icon">𝕏</div>
      <div class="x-fallback-text">
        X（旧Twitter）の投稿を表示するには<br>ネットワーク接続が必要です。
      </div>
      <a href="https://x.com/search?q=%23VIVANT%E8%80%83%E5%AF%9F&src=typed_query&f=live"
         target="_blank" rel="noopener" class="x-fallback-btn">
        𝕏 #VIVANT考察 をXで見る ↗
      </a>
    </div>
  `;
}

// ════════════════════════════════════════════
//  MINDMAP RELATIONS ENGINE (マインドマップ相関図)
// ════════════════════════════════════════════

const MINDMAP_CONFIG = {
  width: 1900,
  height: 1400,
  centerX: 950,
  centerY: 700
};

// マインドマップのノード配置データ
const MINDMAP_NODES = [
  // 1. 中央ハブ (核)
  { id: 'center_nogi', charId: 'nogi', label: '乃木 憂助', role: '主人公 / 別班 / ベキ実子', type: 'center', org: 'beppan', x: 950, y: 700 },

  // 2. 勢力ハブノード
  { id: 'hub_beppan', label: '別 班 (BEPPAN)', type: 'hub', org: 'beppan', x: 1380, y: 400 },
  { id: 'hub_tent', label: 'テ ン ト (TENT)', type: 'hub', org: 'tent', x: 1420, y: 1020 },
  { id: 'hub_kouan', label: '公 安 警 察', type: 'hub', org: 'kouan', x: 520, y: 380 },
  { id: 'hub_marubishi', label: '丸 菱 商 事', type: 'hub', org: 'marubishi', x: 480, y: 1020 },
  { id: 'hub_other', label: '医療・バルカ・AI', type: 'hub', org: 'other', x: 950, y: 1220 },

  // 3. キャラクターノード — 別班
  { id: 'kurosu', charId: 'kurosu', label: '黒須 駿', role: '別班工作員 / 相棒', org: 'beppan', type: 'char', x: 1680, y: 300, relText: '信頼の相棒' },
  { id: 'sakurai', charId: 'sakurai', label: '桜井 里美', role: '別班 司令', org: 'beppan', type: 'char', x: 1650, y: 480, relText: '直属の上司' },
  { id: 'nagano', charId: 'nagano', label: '長野 利彦', role: '専務 / S2別班員', org: 'beppan', type: 'char', x: 1400, y: 180, relText: 'S2覚醒 / 潜入' },

  // 4. キャラクターノード — テント
  { id: 'beki', charId: 'beki', label: 'ノゴーン・ベキ', role: '創始者 (乃木卓)', org: 'tent', type: 'char', x: 1720, y: 880, relText: '実の父親' },
  { id: 'nokoru', charId: 'nokoru', label: 'ノコル', role: 'テントNo.2 / ムルーデル', org: 'tent', type: 'char', x: 1700, y: 1140, relText: '義理の兄弟' },
  { id: 'ali', charId: 'ali', label: 'アリ', role: '元幹部 / バルカ銀行', org: 'tent', type: 'char', x: 1380, y: 1240, relText: '資金ルート' },

  // 5. キャラクターノード — 公安
  { id: 'nozaki', charId: 'nozaki', label: '野崎 守', role: '公安部 理事官', org: 'kouan', type: 'char', x: 220, y: 300, relText: '対峙・ライバル' },
  { id: 'shinjo', charId: 'shinjo', label: '新庄 浩太郎', role: '公安 / モニター', org: 'kouan', type: 'char', x: 220, y: 480, relText: '二重スパイ' },
  { id: 'toujou', charId: 'toujou', label: '東条 実', role: 'サイバー対策', org: 'kouan', type: 'char', x: 520, y: 180, relText: 'データ解析' },
  { id: 'suzuki', charId: 'suzuki', label: '鈴木 祥太', role: 'サイバー捜査官', org: 'kouan', type: 'char', x: 740, y: 220, relText: 'サイバー追跡' },

  // 6. キャラクターノード — 丸菱商事
  { id: 'usami', charId: 'usami', label: '宇佐美 哲也', role: '社長', org: 'marubishi', type: 'char', x: 200, y: 880, relText: '丸菱トップ' },
  { id: 'mizukami', charId: 'mizukami', label: '水上 志郎', role: '常務', org: 'marubishi', type: 'char', x: 180, y: 1040, relText: '社内抗争' },
  { id: 'ota', charId: 'ota', label: '太田 梨花', role: 'blue@walker', org: 'marubishi', type: 'char', x: 440, y: 1240, relText: '天才ハッカー' },
  { id: 'yamamoto', charId: 'yamamoto', label: '山本 巧', role: '業務部 / モニター', org: 'marubishi', type: 'char', x: 260, y: 1200, relText: '誤送金工作' },
  { id: 'kawai', charId: 'kawai', label: '河合 幸二', role: 'エネルギー部 部長', org: 'marubishi', type: 'char', x: 680, y: 1040, relText: '直属の上司' },

  // 7. キャラクターノード — 医療・バルカ・AI
  { id: 'yuzuki', charId: 'yuzuki', label: '柚木 薫', role: 'WHO 医師', org: 'other', type: 'char', x: 1220, y: 1320, relText: '最愛の理解者' },
  { id: 'hayato', charId: 'hayato', label: 'ハヤト（AI）', role: '高度自律型AI', org: 'other', type: 'char', x: 720, y: 1320, relText: '謎の知能' }
];

// ノード間の関係線（ブランチ＆クロスライン）
const MINDMAP_CONNECTIONS = [
  // 中央 (乃木) ──＞ 各勢力ハブ
  { from: 'center_nogi', to: 'hub_beppan', org: 'beppan', label: '所属 (別班員)' },
  { from: 'center_nogi', to: 'hub_tent', org: 'tent', label: '潜入・血縁関係' },
  { from: 'center_nogi', to: 'hub_kouan', org: 'kouan', label: '捜査・協力関係' },
  { from: 'center_nogi', to: 'hub_marubishi', org: 'marubishi', label: '表の顔 (エネルギー2課)' },
  { from: 'center_nogi', to: 'hub_other', org: 'other', label: '絆・守るべき存在' },

  // ハブ ──＞ 各キャラ
  { from: 'hub_beppan', to: 'kurosu', org: 'beppan' },
  { from: 'hub_beppan', to: 'sakurai', org: 'beppan' },
  { from: 'hub_beppan', to: 'nagano', org: 'beppan' },

  { from: 'hub_tent', to: 'beki', org: 'tent' },
  { from: 'hub_tent', to: 'nokoru', org: 'tent' },
  { from: 'hub_tent', to: 'ali', org: 'tent' },

  { from: 'hub_kouan', to: 'nozaki', org: 'kouan' },
  { from: 'hub_kouan', to: 'shinjo', org: 'kouan' },
  { from: 'hub_kouan', to: 'toujou', org: 'kouan' },
  { from: 'hub_kouan', to: 'suzuki', org: 'kouan' },

  { from: 'hub_marubishi', to: 'usami', org: 'marubishi' },
  { from: 'hub_marubishi', to: 'mizukami', org: 'marubishi' },
  { from: 'hub_marubishi', to: 'ota', org: 'marubishi' },
  { from: 'hub_marubishi', to: 'yamamoto', org: 'marubishi' },
  { from: 'hub_marubishi', to: 'kawai', org: 'marubishi' },

  { from: 'hub_other', to: 'yuzuki', org: 'other' },
  { from: 'hub_other', to: 'hayato', org: 'other' },

  // 重要キャラクター間の直接クロス関係線
  { from: 'center_nogi', to: 'beki', org: 'tent', label: '実父 ⚔️' },
  { from: 'center_nogi', to: 'nokoru', org: 'tent', label: '義弟' },
  { from: 'center_nogi', to: 'nozaki', org: 'kouan', label: '信頼とライバル' },
  { from: 'center_nogi', to: 'yuzuki', org: 'other', label: '恋人 ❤️' },
  { from: 'center_nogi', to: 'kurosu', org: 'beppan', label: '相棒 🤝' },
  { from: 'nagano', to: 'ota', org: 'marubishi', label: '過去の愛人' },
  { from: 'shinjo', to: 'hub_tent', org: 'tent', label: '二重スパイ 🕵️' },
  { from: 'yamamoto', to: 'ota', org: 'marubishi', label: '脅迫関係' }
];

// パン＆ズームの状態変数
let mmState = {
  scale: 0.85,
  panX: 0,
  panY: 0,
  isDragging: false,
  startX: 0,
  startY: 0,
  hasInitialized: false
};

// マインドマップのビジュアル切り替え (mindmap ↔ grid)
function switchRelationsView(viewMode) {
  const btnMindmap = document.getElementById('btn-view-mindmap');
  const btnGrid = document.getElementById('btn-view-grid');
  const viewMindmap = document.getElementById('mindmap-view');
  const viewGrid = document.getElementById('grid-view');

  if (viewMode === 'mindmap') {
    if (btnMindmap) btnMindmap.classList.add('active');
    if (btnGrid) btnGrid.classList.remove('active');
    if (viewMindmap) viewMindmap.classList.add('active');
    if (viewGrid) viewGrid.classList.remove('active');
    if (!mmState.hasInitialized) {
      initMindmap();
    }
  } else {
    if (btnGrid) btnGrid.classList.add('active');
    if (btnMindmap) btnMindmap.classList.remove('active');
    if (viewGrid) viewGrid.classList.add('active');
    if (viewMindmap) viewMindmap.classList.remove('active');
  }
}
window.switchRelationsView = switchRelationsView;

// マインドマップ初期化＆描画
function initMindmap() {
  const viewport = document.getElementById('mindmap-viewport');
  const board = document.getElementById('mindmap-board');
  const svg = document.getElementById('mindmap-svg');
  const nodesContainer = document.getElementById('mindmap-nodes');

  if (!board || !svg || !nodesContainer || !viewport) return;

  mmState.hasInitialized = true;

  // 1. ノードDOM作成
  nodesContainer.innerHTML = '';
  const nodeMap = {};

  MINDMAP_NODES.forEach(n => {
    nodeMap[n.id] = n;
    const el = document.createElement('div');
    el.dataset.nodeId = n.id;
    if (n.charId) el.dataset.charId = n.charId;
    el.dataset.org = n.org;

    if (n.type === 'center') {
      el.className = 'mm-node mm-node-center';
      el.innerHTML = `
        <span class="mm-node-badge">CENTER</span>
        <span class="mm-node-name">${n.label}</span>
        <span class="mm-node-sub">堺 雅人</span>
      `;
    } else if (n.type === 'hub') {
      el.className = `mm-node mm-node-hub ${n.org}`;
      el.innerHTML = `<span>◈ ${n.label}</span>`;
    } else {
      el.className = `mm-node mm-node-char ${n.org}`;
      el.innerHTML = `
        <div class="mm-char-avatar">${n.label.substring(0, 2)}</div>
        <div class="mm-char-info">
          <span class="mm-char-name">${n.label}</span>
          <span class="mm-char-role">${n.role}</span>
          ${n.relText ? `<span class="mm-char-relation">❖ ${n.relText}</span>` : ''}
        </div>
      `;
    }

    el.style.left = `${n.x}px`;
    el.style.top = `${n.y}px`;

    // クリック・ホバーのイベント割り当て
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (n.charId && typeof openModal === 'function') {
        openModal(n.charId, e);
      }
    });

    el.addEventListener('mouseenter', () => highlightMindmapNode(n.id));
    el.addEventListener('mouseleave', () => resetMindmapHighlight());

    nodesContainer.appendChild(el);
  });

  // 2. SVGライン描画
  svg.innerHTML = svg.querySelector('defs')?.outerHTML || '';

  MINDMAP_CONNECTIONS.forEach((c, idx) => {
    const fromNode = nodeMap[c.from];
    const toNode = nodeMap[c.to];
    if (!fromNode || !toNode) return;

    // 滑らかなベジェ曲線の制御点計算
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const cx1 = fromNode.x + dx * 0.4;
    const cy1 = fromNode.y;
    const cx2 = fromNode.x + dx * 0.6;
    const cy2 = toNode.y;

    const pathD = `M ${fromNode.x} ${fromNode.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toNode.x} ${toNode.y}`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('class', `mm-path ${c.org} ${c.from === 'center_nogi' ? 'center' : ''}`);
    path.dataset.from = c.from;
    path.dataset.to = c.to;
    path.dataset.pathId = `path_${idx}`;
    svg.appendChild(path);

    // 関係性ラベルを表示
    if (c.label) {
      const midX = (fromNode.x + toNode.x) / 2;
      const midY = (fromNode.y + toNode.y) / 2;
      const labelLen = c.label.length * 11 + 16;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'mm-label-group');

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', midX - labelLen / 2);
      rect.setAttribute('y', midY - 11);
      rect.setAttribute('width', labelLen);
      rect.setAttribute('height', 22);
      rect.setAttribute('class', 'mm-label-bg');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', midX);
      text.setAttribute('y', midY + 1);
      text.setAttribute('class', 'mm-label-text');
      text.textContent = c.label;

      g.appendChild(rect);
      g.appendChild(text);
      svg.appendChild(g);
    }
  });

  // 3. ビューポートの初期位置センタリング
  centerMindmapBoard();

  // 4. ドラッグ＆パンイベントの設定
  setupMindmapPanAndZoom();
}

// ビューポート中央にセンタリング
function centerMindmapBoard() {
  const viewport = document.getElementById('mindmap-viewport');
  if (!viewport) return;

  const vw = viewport.clientWidth || 900;
  const vh = viewport.clientHeight || 680;

  mmState.scale = Math.min(vw / 1600, 0.85);
  mmState.panX = (vw - MINDMAP_CONFIG.width * mmState.scale) / 2;
  mmState.panY = (vh - MINDMAP_CONFIG.height * mmState.scale) / 2;

  updateMindmapTransform();
}

// Transform更新
function updateMindmapTransform() {
  const board = document.getElementById('mindmap-board');
  if (board) {
    board.style.transform = `translate(${mmState.panX}px, ${mmState.panY}px) scale(${mmState.scale})`;
  }
}

// ズームボタン操作
function zoomMindmap(delta) {
  const newScale = Math.max(0.35, Math.min(2.0, mmState.scale + delta));
  const viewport = document.getElementById('mindmap-viewport');
  if (viewport) {
    const vw = viewport.clientWidth / 2;
    const vh = viewport.clientHeight / 2;
    mmState.panX -= (vw - mmState.panX) * (newScale / mmState.scale - 1);
    mmState.panY -= (vh - mmState.panY) * (newScale / mmState.scale - 1);
  }
  mmState.scale = newScale;
  updateMindmapTransform();
}
function resetMindmapZoom() {
  centerMindmapBoard();
}
window.zoomMindmap = zoomMindmap;
window.resetMindmapZoom = resetMindmapZoom;

// パン＆ドラッグ操作
function setupMindmapPanAndZoom() {
  const viewport = document.getElementById('mindmap-viewport');
  if (!viewport) return;

  viewport.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.mm-node')) return;
    mmState.isDragging = true;
    mmState.startX = e.clientX - mmState.panX;
    mmState.startY = e.clientY - mmState.panY;
    viewport.setPointerCapture(e.pointerId);
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!mmState.isDragging) return;
    mmState.panX = e.clientX - mmState.startX;
    mmState.panY = e.clientY - mmState.startY;
    updateMindmapTransform();
  });

  const stopDrag = (e) => {
    if (mmState.isDragging) {
      mmState.isDragging = false;
      try { viewport.releasePointerCapture(e.pointerId); } catch(ex){}
    }
  };

  viewport.addEventListener('pointerup', stopDrag);
  viewport.addEventListener('pointercancel', stopDrag);

  // マウスホイールズーム
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    zoomMindmap(delta);
  }, { passive: false });
}

// ノードホバー時のハイライト効果
function highlightMindmapNode(nodeId) {
  const paths = document.querySelectorAll('.mm-path');
  const nodes = document.querySelectorAll('.mm-node');

  const relatedNodes = new Set([nodeId]);

  paths.forEach(p => {
    const from = p.dataset.from;
    const to = p.dataset.to;
    if (from === nodeId || to === nodeId) {
      p.classList.add('active');
      p.classList.remove('dimmed');
      relatedNodes.add(from);
      relatedNodes.add(to);
    } else {
      p.classList.remove('active');
      p.classList.add('dimmed');
    }
  });

  nodes.forEach(n => {
    const id = n.dataset.nodeId;
    if (relatedNodes.has(id)) {
      n.classList.add('highlighted');
      n.classList.remove('dimmed');
    } else {
      n.classList.remove('highlighted');
      n.classList.add('dimmed');
    }
  });
}

function resetMindmapHighlight() {
  const paths = document.querySelectorAll('.mm-path');
  const nodes = document.querySelectorAll('.mm-node');

  paths.forEach(p => {
    p.classList.remove('active');
    p.classList.remove('dimmed');
  });

  nodes.forEach(n => {
    n.classList.remove('highlighted');
    n.classList.remove('dimmed');
  });
}

// フィルタリング処理の連動
document.addEventListener('click', (e) => {
  const filterBtn = e.target.closest('#page-relations .filter-btn[data-filter]');
  if (!filterBtn) return;

  const filter = filterBtn.dataset.filter;
  const nodes = document.querySelectorAll('.mm-node');
  const paths = document.querySelectorAll('.mm-path');

  nodes.forEach(n => {
    const org = n.dataset.org;
    if (filter === 'all' || org === filter || n.dataset.nodeId === 'center_nogi') {
      n.classList.remove('dimmed');
    } else {
      n.classList.add('dimmed');
    }
  });

  paths.forEach(p => {
    const org = p.classList.contains(filter);
    if (filter === 'all' || org) {
      p.classList.remove('dimmed');
    } else {
      p.classList.add('dimmed');
    }
  });
});

// ページ切り替え時にマインドマップを初期化
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-btn[data-page="relations"]');
  if (btn) {
    setTimeout(() => {
      const viewMindmap = document.getElementById('mindmap-view');
      if (viewMindmap && viewMindmap.classList.contains('active')) {
        if (!mmState.hasInitialized) {
          initMindmap();
        } else {
          centerMindmapBoard();
        }
      }
    }, 150);
  }
});

// 初期ロード時にもし相関図ページが表示されていたら動かす
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const pageRel = document.getElementById('page-relations');
    if (pageRel && pageRel.classList.contains('active')) {
      initMindmap();
    }
  }, 250);
});



