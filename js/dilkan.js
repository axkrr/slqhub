/**
 * @name dilkan_token
 * @desc Dilkan会员token抓取与同步
 * @author axkrr
 * @update 2026-11-27
 */

var K_TOKEN = "dilkan_token";
var K_TV = "dilkan_tv";
var K_PUSHED = "dilkan_pushed";
var K_TRY = "dilkan_try";
var K_UID = "dilkan_uid";
var K_VIP = "dilkan_vip";
var K_SEEN_AT = "dilkan_seen_at";
var K_REJECT = "dilkan_reject";

var TOKEN_RE = /^[A-Za-z0-9_-]{64}$/;
var API_RE = /^https?:\/\/api\.(?:dilkan\.com\.cn|ulunix\.cn)\/apiv[0-9_]+(?:\/[0-9]+)*\/dilkan\//;
var VIP_RE = /"is_vip"\s*:\s*"?(\d+)"?/;
var UID_RE = /"uid"\s*:\s*"?(\d+)"?/;
var LAN_RE = /^http:\/\/([0-9]{1,3}(?:\.[0-9]{1,3}){3}):8199\/([a-z0-9]{6,32})\/?/;
var SECRET_RE = /^[a-z0-9]{6,32}$/;
var RETRY_MS = 60000;

function read(key) {
  try { return $persistentStore.read(key) || ""; } catch (e) { return ""; }
}
function write(key, value) {
  try { $persistentStore.write(value == null ? "" : String(value), key); } catch (e) {}
}
function notify(sub, body) {
  try { $notification.post("dilkan", sub, body); } catch (e) {}
}
function arg(name) {
  try {
    if (typeof $argument !== "string" || !$argument) return "";
    var m = new RegExp("(?:^|&)" + name + "=([^&]*)").exec($argument);
    return m ? decodeURIComponent(m[1]) : "";
  } catch (e) { return ""; }
}
function header(headers, name) {
  for (var k in headers) if (String(k).toLowerCase() === name) return headers[k] || "";
  return "";
}
function mask(token) {
  return token.slice(0, 6) + "…" + token.slice(-4);
}

// 返回失败原因，空串表示通过
function validate(candidate, url) {
  if (!candidate) return "empty";
  if (!API_RE.test(url)) return "not-dilkan-api";
  if (candidate.length !== 64) return "length-" + candidate.length;
  if (!TOKEN_RE.test(candidate)) return "charset";
  return "";
}

function learn(host, secret) {
  var fresh = host + "/" + secret;
  if (read(K_TV) !== fresh) {
    write(K_TV, fresh);
    write(K_PUSHED, "");
    write(K_TRY, "");
    return true;
  }
  return false;
}
function forget() {
  write(K_TV, "");
  write(K_TRY, "");
  write(K_PUSHED, "");
}
function splitTv() {
  var key = read(K_TV);
  var at = key.indexOf("/");
  return at > 0 ? { host: key.slice(0, at), secret: key.slice(at + 1) } : null;
}
function parseTry() {
  try {
    var parsed = JSON.parse(read(K_TRY));
    return parsed && typeof parsed.at === "number" ? parsed : null;
  } catch (e) { return null; }
}

function recordMember(body) {
  if (!body) return;
  var vip = VIP_RE.exec(body);
  var uid = UID_RE.exec(body);
  if (uid) write(K_UID, uid[1]);
  if (vip) write(K_VIP, vip[1] === "1" ? "会员" : "非会员");
}

function push(token, box, stamp, done) {
  write(K_TRY, JSON.stringify({ stamp: stamp, at: Date.now() }));
  $httpClient.post({
    url: "http://" + box.host + ":8199/" + box.secret + "/save",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "token=" + encodeURIComponent(token)
  }, function (error, response, data) {
    var status = response && (response.status || response.statusCode);
    var body = String(data || "");
    if (!error && status === 200 && body.indexOf("已写入电视本机") >= 0) {
      write(K_PUSHED, stamp);
      notify("已写入电视", mask(token));
    } else if (status === 404) {
      forget();
      notify("电视密钥失效", "重新扫描电视二维码");
    } else {
      notify("写入未确认", "稍后自动重试");
    }
    done();
  });
}

function sync(done) {
  var token = read(K_TOKEN);
  var box = splitTv();
  if (!TOKEN_RE.test(token) || !box) { done(); return; }
  var stamp = token + "@" + box.host + "/" + box.secret;
  if (read(K_PUSHED) === stamp) { done(); return; }
  var tried = parseTry();
  if (tried && tried.stamp === stamp && Date.now() - tried.at < RETRY_MS) { done(); return; }
  push(token, box, stamp, done);
}

var request = (typeof $request !== "undefined" && $request) || {};
var headers = request.headers || {};
var url = String(request.url || "");

if (arg("reset") === "1") {
  write(K_TOKEN, "");
  write(K_UID, "");
  write(K_VIP, "");
  write(K_SEEN_AT, "");
  forget();
  notify("已清除", "token与电视地址已重置");
  $done({});
} else {
  var manualUrl = LAN_RE.exec(arg("url"));
  if (manualUrl && SECRET_RE.test(manualUrl[2]) && learn(manualUrl[1], manualUrl[2])) {
    notify("已记住电视", manualUrl[1]);
  }
  var manualHost = arg("tv");
  var manualSecret = arg("secret");
  if (manualHost && SECRET_RE.test(manualSecret) && learn(manualHost, manualSecret)) {
    notify("已记住电视", manualHost);
  }

  var lan = LAN_RE.exec(url);
  if (lan && SECRET_RE.test(lan[2])) {
    if (learn(lan[1], lan[2])) notify("已记住电视", lan[1]);
  } else {
    // 手填只校验格式，抓包需同时来自dilkan接口
    var manual = arg("token");
    var live = manual || header(headers, "authorization");
    var reason = manual ? (TOKEN_RE.test(manual) ? "" : "manual-format") : validate(live, url);
    if (reason) {
      if (live || reason !== "empty") write(K_REJECT, reason + "@" + Date.now());
    } else if (read(K_TOKEN) !== live) {
      write(K_TOKEN, live);
      write(K_PUSHED, "");
      write(K_TRY, "");
      write(K_SEEN_AT, String(Date.now()));
      notify("已抓取token", mask(live));
    }
    if (typeof $response !== "undefined" && $response) {
      recordMember(String($response.body || ""));
    }
  }
  sync(function () { $done({}); });
}