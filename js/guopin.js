/**
 * 国聘 App 广告净化器 v3.1
 * Surge 5 / Loon 3.x · http-response 脚本 · 单请求 · 零跨请求状态
 * ================================================================
 * 一、为什么不能按域名或按 /ads/ 路径拉黑
 *   iguopin-base 的 87 张图全部落在 /ads/ 目录下，其中 24 张是 105~320px 的
 *   功能图标（首页金刚区、设置页图标），63 张才是 600~8268px 的广告大图。
 *   同一个域、同一个目录、同一个租户、同样的扩展名 —— 路径层面完全不可分。
 *   任何按域名 / 按 /ads/ 的拦截都会连带杀掉图标，
 *   这就是 v1「首页一堆空占位 + 设置页图标消失」的真实机制。
 *
 * 二、真正的判据是「图片真实像素尺寸」
 *   只读文件头：PNG 的 IHDR、JPEG 的 SOF0/1/2。不解码像素，单张 < 1ms。
 *   两份抓包 121 个唯一图片样本，分布有干净分界：
 *       功能图标  105x105 ~ 320x320，体积   2980 ~ 18332 B
 *       广告大图  600x686 ~ 8268x2185，体积 18006 ~ 999995 B
 *       400~600px 区间：0 个样本（天然分界线）
 *
 * 三、为什么命中后必须返回失败，绝不能返回 1x1 透明图
 *   返回 200 + tinygif，加载器判定「图片加载成功」，SDK 继续走成功分支：
 *   容器保留 → 信息流留白块常驻；开屏 VC 照建 → 倒计时照跑。
 *   这就是 v1「图拦住了、倒计时还在、一堆空占位」的机制，不是玄学。
 *   返回失败才会走加载失败分支：预取失败 → 开屏整块跳过 → 直接进主页。
 *
 * 四、零跨请求状态
 *   v1 用 persistentStore 做时间窗，Loon 日志出现 +98668ms，
 *   说明计时根本没走对，命中永远是 "-"。本版删除所有跨请求状态，
 *   每张图独立判定，不依赖先后顺序、不依赖会话。
 * ================================================================
 */

var CFG = {
  /* ── 净化范围 ──────────────────────────────────────────────
   * preset 'splash' : 只杀开屏全屏竖图 —— 装上先跑这个，验证开屏是否直进主页
   * preset 'full'   : 开屏 + 信息流横幅 + 活动弹窗 —— 验证通过后改这里
   */
  preset: 'splash',

  /* ── 失败方式（按顺序试，一般停在第一步）───────────────────
   * action 'status'   : 直接返回 CFG.status（默认 404）—— 首选，最快
   * action 'redirect' : 302 跳到 127.0.0.1:9，连接立刻被拒 ——
   *                     某些 SDK 只在「网络错误」时跳过广告，
   *                     对 404 反而重试，这种情况改这一行
   * action 'empty'    : 返回 200 + 0 字节 —— 最后手段
   */
  action: 'status',
  status: 404,

  /* ── 日志：verbose=true 时每张图打一行，装完先看日志确认命中 ── */
  verbose: true,

  /* ── 阈值（不要动，全部由 121 张实测样本反推）──────────────
   * iconMaxPx    400   最长边 ≤400px 一律放行，实测功能图标最大 320px
   * adMinPx      600   最长边 <600px 不动，实测 400~600 区间零样本
   * adMinBytes 30000   体积 <30KB 不动，实测图标最大 18332B、广告最小 56097B
   * splashAspect 1.35  高/宽 ≥1.35 视为竖图
   * splashMinPx  1000  且最长边 ≥1000px → 开屏全屏图（实测 2000x3557，ar=1.78）
   */
  iconMaxPx: 400,
  adMinPx: 600,
  adMinBytes: 30000,
  splashAspect: 1.35,
  splashMinPx: 1000
};

/* 只治理这两个真正承载广告素材的 OSS 域；其余域一个字节都不碰 */
var HOST_BASE = 'iguopin-base.oss-cn-beijing.aliyuncs.com';
var HOST_ACT  = 'hdjz-private.oss-cn-beijing.aliyuncs.com';

/* 路径保护：用户头像 / 企业 logo / App 内置图标，永久放行 */
var PROTECT_RE = /\/avatar[\/%]|\/logo[\/%]|app\/icon-/i;

/* 空 body：用空字符串最稳，Surge/Loon 都按 0 字节处理 */
function emptyBody() { return ''; }

/* ---------------------------------------------------------------
 * URL 拆分（不依赖全局 URL 对象，Surge/Loon 的 JS 引擎不一定有）
 * --------------------------------------------------------------- */
function splitUrl(url) {
  var m = /^(?:https?:)?\/\/([^\/?#]+)([^?#]*)/i.exec(url || '');
  if (!m) return null;
  return { host: m[1].toLowerCase(), path: m[2] || '/' };
}
function decodePath(p) {
  try { return decodeURIComponent(p); } catch (e) { return p; }
}

/* ---------------------------------------------------------------
 * body 归一化
 *   Surge: binary-body-mode=1 时 $response.body 是 Uint8Array
 *   Loon : binary-body-mode=true 时同样是字节数组；字符串按 latin1 还原
 * --------------------------------------------------------------- */
function toBytes(body) {
  if (!body) return null;
  if (typeof body === 'string') {
    var n = body.length, out = new Uint8Array(n);
    for (var i = 0; i < n; i++) out[i] = body.charCodeAt(i) & 0xff;
    return out;
  }
  if (typeof ArrayBuffer !== 'undefined') {
    if (body instanceof ArrayBuffer) return new Uint8Array(body);
    if (ArrayBuffer.isView && ArrayBuffer.isView(body)) {
      return new Uint8Array(body.buffer, body.byteOffset || 0, body.byteLength);
    }
  }
  return null;
}

/* ---------------------------------------------------------------
 * 只读文件头求尺寸
 * --------------------------------------------------------------- */
function imageSize(b) {
  if (!b || b.length < 24) return null;

  /* PNG: 89 50 4E 47 ... IHDR 的宽高在偏移 16 / 20 */
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    var pw = ((b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19]) >>> 0;
    var ph = ((b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]) >>> 0;
    return (pw && ph) ? { w: pw, h: ph } : null;
  }

  /* JPEG: FF D8 ... 扫到 SOF0/SOF1/SOF2 取宽高 */
  if (b[0] === 0xff && b[1] === 0xd8) {
    var i = 2, guard = 0;
    while (i < b.length - 9 && guard++ < 8192) {
      if (b[i] !== 0xff) { i++; continue; }
      var m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        var hh = (b[i + 5] << 8) | b[i + 6];
        var ww = (b[i + 7] << 8) | b[i + 8];
        return (ww && hh) ? { w: ww, h: hh } : null;
      }
      if (m === 0xd8 || m === 0xd9 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      var seg = (b[i + 2] << 8) | b[i + 3];
      if (seg < 2) return null;
      i += 2 + seg;
    }
  }
  return null;
}

/* ---------------------------------------------------------------
 * 判定
 * --------------------------------------------------------------- */
function verdict(sz, n, host) {
  var maxEdge = Math.max(sz.w, sz.h);
  var ar = sz.h / sz.w;

  if (maxEdge <= CFG.iconMaxPx) return { act: 'PASS', why: 'icon' };
  if (n < CFG.adMinBytes)       return { act: 'PASS', why: 'small' };
  if (maxEdge < CFG.adMinPx)    return { act: 'PASS', why: 'edge' };

  /* 开屏全屏竖图 —— 主目标，两个 preset 都杀 */
  if (ar >= CFG.splashAspect && maxEdge >= CFG.splashMinPx) {
    return { act: 'KILL', why: 'splash' };
  }
  /* 其余按预设决定 */
  if (CFG.preset === 'splash') return { act: 'PASS', why: 'preset-splash' };
  if (host === HOST_BASE) return { act: 'KILL', why: 'banner' };
  if (host === HOST_ACT)  return { act: 'KILL', why: 'activity' };
  return { act: 'PASS', why: 'host' };
}

/* ---------------------------------------------------------------
 * 构造失败响应
 * --------------------------------------------------------------- */
function fail() {
  if (CFG.action === 'redirect') {
    /* 跳到本地死端口：NSURLSession 立刻拿到 connection refused，
       比 HTTP 404 更像「网络错误」，SDK 更容易走 skip 分支 */
    return $done({
      status: 302,
      headers: { 'Location': 'http://127.0.0.1:9/_', 'Content-Length': '0' },
      body: emptyBody()
    });
  }
  if (CFG.action === 'empty') {
    return $done({ status: 200, headers: { 'Content-Length': '0' }, body: emptyBody() });
  }
  /* 默认：硬失败。带长缓存，重试时秒失败，不再打到 OSS */
  return $done({
    status: CFG.status,
    headers: { 'Content-Length': '0', 'Cache-Control': 'public, max-age=86400' },
    body: emptyBody()
  });
}

/* ---------------------------------------------------------------
 * 主流程
 * --------------------------------------------------------------- */
(function main() {
  var req = null, resp = null;
  try { req = $request; } catch (e) {}
  try { resp = $response; } catch (e) {}

  var hp = splitUrl((req && req.url) || '');
  if (!hp) return $done({});

  var host = hp.host;
  if (host !== HOST_BASE && host !== HOST_ACT) return $done({});

  var path = decodePath(hp.path);
  if (PROTECT_RE.test(path)) {
    if (CFG.verbose) console.log('[国聘净化] PASS protect ' + path.slice(-36));
    return $done({});
  }

  var code = (resp && (resp.status || resp.statusCode)) || 200;
  if (code !== 200 && code !== 206) return $done({});

  var raw = resp ? (resp.body !== undefined && resp.body !== null ? resp.body : resp.bodyBytes) : null;
  var bytes = toBytes(raw);
  if (!bytes || bytes.length < 64) {
    if (CFG.verbose) {
      console.log('[国聘净化] PASS no-body(' + (bytes ? bytes.length : 0) +
        ') 检查脚本参数 binary-body-mode / requires-body');
    }
    return $done({});
  }

  var sz = imageSize(bytes);
  if (!sz) return $done({});   /* WebP / 其它格式原样放行，绝不误伤 */

  var v = verdict(sz, bytes.length, host);

  if (CFG.verbose) {
    console.log('[国聘净化] ' + v.act + ' ' + v.why + ' ' +
      sz.w + 'x' + sz.h + ' ' + bytes.length + 'B ' + host.split('.')[0]);
  }

  if (v.act === 'KILL') return fail();
  return $done({});
})();
