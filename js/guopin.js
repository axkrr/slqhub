/**
 * 国聘 /api 广告配置接口净化脚本（Surge / Loon 共用）
 * 只处理 https://appv5-api.iguopin.com/api 的响应，其余一律放行。
 *
 * 两态：
 *   MODE = "discover" —— 记录模式：原样放行，打印每条响应的「相对启动时ms / b64len / 前缀」，
 *                        用来确认脚本生效并对照 API_FINGERPRINTS.md 锁定广告接口。
 *   MODE = "enforce"  —— 生产模式：命中 RULES 的响应，body 换成中性密文（或整体 REJECT），
 *                        让开屏/广告位数据源为空，触发 App 无广告兜底 → 跳过倒计时、直达主页。
 *
 * 为什么用密文替换而非改字段：/api 全站 AES256，MITM 只见 base64 密文，看不到明文 JSON。
 */

var MODE   = "discover";        // 改这里：discover / enforce
var ACTION = "replace";         // replace=换成中性密文(更自然) / reject=让接口失败(走兜底)
var SESSION_GAP_MS = 30000;     // 距上一条 /api 超过 30s 视为一次新的冷启动，自动重置计时

/* 中性密文：来自真实抓包的最短幂等合法密文（f234e9e2, dec=144）。
   若 App 有异常，从 neutral_bodies.json 里换另一个 body 填到这里。 */
var NEUTRAL = "WyWZiC+G3vACcLVZXFPo7k0Qo8XB8HYud0Rxw0I/WOytlZ9qzPQqK9D9AqMPActQ9tv78GvhzhF3GrSnMDPskV2SLTOHi9zjHhU4oNtGy2P2ch+S+I4Qtx5Rg6KzRbMbJ4+smhKWH1Wu/HeK9VXyywaP1Nwdlvw71/PlftJf1iYEl1Or5LqHF6GcdlSgp4mp";

/* 锁定规则（确定性纯数据）。判定函数只依赖 (elapsedMs, b64len)，可单测。
   来自本次抓包推断；以 discover 实测为准，按需增删。
   minLen/maxLen 是 $response.body（base64 文本）长度，见 API_FINGERPRINTS.md。
   name 仅用于日志标注。 */
var RULES = [
  // 首要：+1484ms / b64len=86016 的广告素材/广告位清单接口（广告图下载前 380ms）
  { name: "splash-ad-list", minMs: 300,  maxMs: 2600, minLen: 80000, maxLen: 92000, action: "replace" },
  // 可选：全局开关（b64len=3328，重复 4 次，可能含开屏总开关/倒计时秒数）。默认注释，实测再开。
  // { name: "global-switch", minMs: 0, maxMs: 20000, minLen: 3000, maxLen: 3600, action: "replace" },
  // 可选：启动首个大配置（b64len=50412）。默认注释，实测再开。
  // { name: "launch-config", minMs: 0, maxMs: 1200, minLen: 48000, maxLen: 53000, action: "replace" }
];

/* ===== 判定：纯函数，不依赖运行时环境，test_rules.py 里等价复刻并单测 ===== */
function classify(elapsedMs, b64len) {
  for (var i = 0; i < RULES.length; i++) {
    var r = RULES[i];
    if (elapsedMs >= r.minMs && elapsedMs <= r.maxMs &&
        b64len  >= r.minLen && b64len  <= r.maxLen) return r;
  }
  return null;
}

/* ===== 冷启动计时（跨请求持久化；无 $persistentStore 时退化到单实例内存） ===== */
var store = (typeof $persistentStore !== "undefined" && $persistentStore) ? $persistentStore : null;
function readNum(k) {
  var v = store ? store.read(k) : (globalThis && globalThis.__GP ? globalThis.__GP[k] : null);
  return v ? Number(v) : 0;
}
function writeNum(k, v) {
  if (store) { store.write(String(v), k); }
  else { globalThis.__GP = globalThis.__GP || {}; globalThis.__GP[k] = v; }
}
function log(s) { if (typeof console !== "undefined" && console.log) console.log(s); }

var now   = Date.now();
var last  = readNum("gp_last_api_ts");
var start = readNum("gp_launch_ts");
if (!start || !last || (now - last) > SESSION_GAP_MS) { start = now; writeNum("gp_launch_ts", start); }
writeNum("gp_last_api_ts", now);
var elapsedMs = now - start;

/* ===== 取响应体长度（base64 文本）。Surge/Loon 的 $response.body 通常为已解压字符串 ===== */
var body = (typeof $response !== "undefined" && $response && $response.body != null) ? String($response.body) : "";
var b64len = body.length;
var prefix = body.slice(0, 28);

function cleanedHeaders(headers) {
  var h = {}, k, lk;
  for (k in headers) {
    if (!Object.prototype.hasOwnProperty.call(headers, k)) continue;
    lk = String(k).toLowerCase();
    // 去掉传输层编码/长度，避免客户端对替换后的非 gzip 数据二次解压出错；保留 data-encrypt
    if (lk === "content-encoding" || lk === "content-length" || lk === "transfer-encoding") continue;
    h[k] = headers[k];
  }
  return h;
}
function finish(newBody) {
  var headers = cleanedHeaders((typeof $response !== "undefined" && $response && $response.headers) ? $response.headers : {});
  // 显式置 data-encrypt，确保 App 仍按加密分支处理中性密文
  headers["data-encrypt"] = "AES256";
  $done({ body: newBody, headers: headers });
}

var rule = classify(elapsedMs, b64len);

if (MODE === "discover") {
  log("[国聘 discover] +" + elapsedMs + "ms b64len=" + b64len + " prefix=" + prefix +
      " hit=" + (rule ? rule.name : "-") + " (本模式原样放行)");
  $done({});
} else if (rule) {
  log("[国聘 enforce] 命中 " + rule.name + " +" + elapsedMs + "ms b64len=" + b64len);
  if (ACTION === "reject") {
    $done({ status: "HTTP/1.1 204 No Content", headers: {}, body: "" });
  } else {
    finish(NEUTRAL);
  }
} else {
  $done({});  // 未命中（含首页职位流大响应）原样放行
}
