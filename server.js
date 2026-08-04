// ============================================
//  VIVANT - X API Proxy Server
//  X API v2 を使ってVIVANT関連ツイートを取得し
//  フロントエンドにCORSで配信するプロキシサーバー
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const BEARER_TOKEN = process.env.X_BEARER_TOKEN;

// CORS & JSON
app.use(cors());
app.use(express.json());

// 静的ファイル（index.html, style.css, app.js）を配信
app.use(express.static(path.join(__dirname)));

// ── キャッシュ ──────────────────────────────────
let cache = {
  tweets: [],
  lastFetch: null,
  CACHE_TTL: 15 * 1000, // 15秒（API節約）
};

// ── X API v2 検索クエリ ─────────────────────────
const SEARCH_QUERIES = [
  '#VIVANT -is:retweet lang:ja',
  '#VIVANT考察 -is:retweet lang:ja',
  'VIVANT テント 乃木 -is:retweet lang:ja',
];

// ── X API 呼び出し ──────────────────────────────
async function fetchXTweets(query, maxResults = 10) {
  if (!BEARER_TOKEN || BEARER_TOKEN === 'ここにBearer_Tokenを貼り付け') {
    throw new Error('BEARER_TOKEN_NOT_SET');
  }

  const params = new URLSearchParams({
    query,
    max_results: Math.min(maxResults, 10).toString(), // Free plan: max 10
    'tweet.fields': 'created_at,public_metrics,author_id,text',
    'user.fields': 'username,name,profile_image_url,verified',
    expansions: 'author_id',
    sort_order: 'recency',
  });

  const url = `https://api.twitter.com/2/tweets/search/recent?${params}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${BEARER_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`X API Error ${res.status}: ${errText}`);
  }

  return res.json();
}

// ── ツイートの整形 ──────────────────────────────
function formatTweets(apiData) {
  if (!apiData || !apiData.data) return [];

  const users = {};
  if (apiData.includes && apiData.includes.users) {
    apiData.includes.users.forEach(u => {
      users[u.id] = u;
    });
  }

  return apiData.data.map(tweet => {
    const user = users[tweet.author_id] || {};
    const metrics = tweet.public_metrics || {};

    // ハイライトワード
    const highlights = [
      'VIVANT', 'テント', '乃木', 'ノコル', 'ベキ', '別班', '野崎',
      '長野', '新庄', '考察', '黒幕', '伏線', 'F', 'ハヤト',
    ];
    let highlightedText = tweet.text;
    highlights.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      highlightedText = highlightedText.replace(
        regex,
        '<span class="highlight">$1</span>'
      );
    });

    return {
      id: tweet.id,
      text: highlightedText,
      rawText: tweet.text,
      username: user.username ? `@${user.username}` : '@vivant_fan',
      displayName: user.name || 'VIVANTファン',
      profileImage: user.profile_image_url || null,
      createdAt: tweet.created_at,
      metrics: {
        likes: metrics.like_count || 0,
        retweets: metrics.retweet_count || 0,
        replies: metrics.reply_count || 0,
      },
      url: `https://twitter.com/i/web/status/${tweet.id}`,
    };
  });
}

// ── メインAPIエンドポイント ─────────────────────
// GET /api/tweets?q=VIVANT&count=10
app.get('/api/tweets', async (req, res) => {
  // キャッシュ有効なら返す
  if (
    cache.lastFetch &&
    Date.now() - cache.lastFetch < cache.CACHE_TTL &&
    cache.tweets.length > 0
  ) {
    return res.json({
      success: true,
      source: 'cache',
      count: cache.tweets.length,
      tweets: cache.tweets,
    });
  }

  if (!BEARER_TOKEN || BEARER_TOKEN === 'ここにBearer_Tokenを貼り付け') {
    return res.status(401).json({
      success: false,
      error: 'bearer_token_not_set',
      message: '.env ファイルに X_BEARER_TOKEN を設定してください。',
      guide: 'https://developer.twitter.com/en/portal/dashboard',
    });
  }

  try {
    // 2つのクエリを並行で叩く（Free plan節約のため少なめ）
    const query = req.query.q || '#VIVANT -is:retweet lang:ja';
    const maxResults = Math.min(parseInt(req.query.count) || 10, 10);

    const data = await fetchXTweets(query, maxResults);
    const tweets = formatTweets(data);

    // キャッシュ更新
    cache.tweets = tweets;
    cache.lastFetch = Date.now();

    res.json({
      success: true,
      source: 'api',
      count: tweets.length,
      tweets,
    });
  } catch (err) {
    console.error('[X API Error]', err.message);

    // レート制限エラー
    if (err.message.includes('429') || err.message.includes('Rate limit')) {
      return res.status(429).json({
        success: false,
        error: 'rate_limit',
        message: 'X APIのレート制限に達しました。しばらくお待ちください。',
        retryAfter: 900, // 15分
      });
    }

    res.status(500).json({
      success: false,
      error: 'api_error',
      message: err.message,
    });
  }
});

// ── ステータス確認エンドポイント ────────────────
app.get('/api/status', (req, res) => {
  const hasToken =
    BEARER_TOKEN && BEARER_TOKEN !== 'ここにBearer_Tokenを貼り付け';
  res.json({
    status: 'running',
    tokenConfigured: hasToken,
    cacheAge: cache.lastFetch
      ? Math.floor((Date.now() - cache.lastFetch) / 1000) + '秒前'
      : 'キャッシュなし',
    cachedCount: cache.tweets.length,
  });
});

// ── ルートはindex.htmlを配信 ────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── 起動 ────────────────────────────────────────
app.listen(PORT, () => {
  const hasToken =
    BEARER_TOKEN && BEARER_TOKEN !== 'ここにBearer_Tokenを貼り付け';

  console.log(`
╔══════════════════════════════════════════════╗
║         VIVANT 情報分析システム 起動         ║
╠══════════════════════════════════════════════╣
║  URL: http://localhost:${PORT}                   ║
║  API: http://localhost:${PORT}/api/tweets         ║
╠══════════════════════════════════════════════╣
║  X API トークン: ${hasToken ? '✅ 設定済み           ' : '❌ 未設定 → .env を確認'}  ║
╚══════════════════════════════════════════════╝
  `);

  if (!hasToken) {
    console.log('\n⚠️  Bearer Tokenが設定されていません。');
    console.log('   1. https://developer.twitter.com にアクセス');
    console.log('   2. アプリを作成してBearer Tokenを取得');
    console.log('   3. .env ファイルの X_BEARER_TOKEN= に貼り付け\n');
  }
});
