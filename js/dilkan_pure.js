/**
 * @name dilkan_ios_clean
 * @desc Dilkan iOS端净化
 * @author axkrr
 * @update 2026-11-28
 */

var AD_KEYS = ["welcome", "user_center_header", "user_center_footer", "dialog_ad", "dialog_messenge",
               "afterElan", "selecttvElan", "footerElan"];

var CIPHER_KEYS = (function () {
  var k = "9285740461331009", out = [];
  for (var i = 0; i < 16; i++) out.push(k.charCodeAt(i));
  return out;
})();

var SBOX = [], INV_SBOX = [], RCON = [];
(function () {
  var p = 1, q = 1;
  do {
    p = p ^ ((p << 1) & 0xff) ^ (p & 0x80 ? 0x1b : 0);
    q ^= q << 1; q ^= q << 2; q ^= q << 4; q &= 0xff;
    if (q & 0x80) q ^= 0x09;
    var x = q ^ ((q << 1) | (q >> 7)) ^ ((q << 2) | (q >> 6)) ^ ((q << 3) | (q >> 5)) ^ ((q << 4) | (q >> 4));
    SBOX[p] = (x ^ 0x63) & 0xff;
  } while (p !== 1);
  SBOX[0] = 0x63;
  for (var i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i;
  var r = 1;
  for (var j = 0; j < 10; j++) { RCON[j] = r; r = ((r << 1) ^ (r & 0x80 ? 0x1b : 0)) & 0xff; }
})();

function xtime(a) { return ((a << 1) ^ (a & 0x80 ? 0x1b : 0)) & 0xff; }
function mul(a, b) {
  var out = 0;
  while (b) {
    if (b & 1) out ^= a;
    a = xtime(a);
    b >>= 1;
  }
  return out;
}

function expandKey(key) {
  var w = [], i, t;
  for (i = 0; i < 4; i++) w.push([key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]]);
  for (i = 4; i < 44; i++) {
    t = w[i - 1].slice();
    if (i % 4 === 0) {
      t.push(t.shift());
      t = t.map(function (b) { return SBOX[b]; });
      t[0] ^= RCON[i / 4 - 1];
    }
    w.push([w[i - 4][0] ^ t[0], w[i - 4][1] ^ t[1], w[i - 4][2] ^ t[2], w[i - 4][3] ^ t[3]]);
  }
  return w;
}

function addRoundKey(s, w, round) {
  for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) s[c * 4 + r] ^= w[round * 4 + c][r];
}

function encryptBlock(input, w) {
  var s = input.slice(), r, c, t;
  addRoundKey(s, w, 0);
  for (var round = 1; round <= 10; round++) {
    for (var i = 0; i < 16; i++) s[i] = SBOX[s[i]];
    t = s.slice();
    for (c = 0; c < 4; c++) for (r = 0; r < 4; r++) s[c * 4 + r] = t[((c + r) % 4) * 4 + r];
    if (round !== 10) {
      t = s.slice();
      for (c = 0; c < 4; c++) {
        var a0 = t[c * 4], a1 = t[c * 4 + 1], a2 = t[c * 4 + 2], a3 = t[c * 4 + 3];
        s[c * 4] = mul(a0, 2) ^ mul(a1, 3) ^ a2 ^ a3;
        s[c * 4 + 1] = a0 ^ mul(a1, 2) ^ mul(a2, 3) ^ a3;
        s[c * 4 + 2] = a0 ^ a1 ^ mul(a2, 2) ^ mul(a3, 3);
        s[c * 4 + 3] = mul(a0, 3) ^ a1 ^ a2 ^ mul(a3, 2);
      }
    }
    addRoundKey(s, w, round);
  }
  return s;
}

function decryptBlock(input, w) {
  var s = input.slice(), r, c, t;
  addRoundKey(s, w, 10);
  for (var round = 9; round >= 0; round--) {
    t = s.slice();
    for (c = 0; c < 4; c++) for (r = 0; r < 4; r++) s[((c + r) % 4) * 4 + r] = t[c * 4 + r];
    for (var i = 0; i < 16; i++) s[i] = INV_SBOX[s[i]];
    addRoundKey(s, w, round);
    if (round !== 0) {
      t = s.slice();
      for (c = 0; c < 4; c++) {
        var a0 = t[c * 4], a1 = t[c * 4 + 1], a2 = t[c * 4 + 2], a3 = t[c * 4 + 3];
        s[c * 4] = mul(a0, 14) ^ mul(a1, 11) ^ mul(a2, 13) ^ mul(a3, 9);
        s[c * 4 + 1] = mul(a0, 9) ^ mul(a1, 14) ^ mul(a2, 11) ^ mul(a3, 13);
        s[c * 4 + 2] = mul(a0, 13) ^ mul(a1, 9) ^ mul(a2, 14) ^ mul(a3, 11);
        s[c * 4 + 3] = mul(a0, 11) ^ mul(a1, 13) ^ mul(a2, 9) ^ mul(a3, 14);
      }
    }
  }
  return s;
}

function b64decode(text) {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var clean = text.replace(/[^A-Za-z0-9+/]/g, "");
  var groups = Math.floor(clean.length / 4);
  var rem = clean.length % 4;
  var out = [];
  for (var i = 0; i < groups; i++) {
    var n = 0;
    for (var j = 0; j < 4; j++) n = (n << 6) | chars.indexOf(clean.charAt(i * 4 + j));
    out.push((n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
  }
  if (rem >= 2) {
    var m = 0, c;
    for (c = 0; c < rem; c++) m = (m << 6) | chars.indexOf(clean.charAt(groups * 4 + c));
    m <<= (4 - rem) * 6;
    out.push((m >> 16) & 0xff);
    if (rem === 3) out.push((m >> 8) & 0xff);
  }
  return out;
}

function b64encode(bytes) {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var out = "";
  for (var i = 0; i < bytes.length; i += 3) {
    var b0 = bytes[i], b1 = i + 1 < bytes.length ? bytes[i + 1] : -1, b2 = i + 2 < bytes.length ? bytes[i + 2] : -1;
    out += chars.charAt(b0 >> 2);
    out += chars.charAt(((b0 & 3) << 4) | ((b1 < 0 ? 0 : b1) >> 4));
    out += b1 < 0 ? "=" : chars.charAt(((b1 & 15) << 2) | ((b2 < 0 ? 0 : b2) >> 6));
    out += b2 < 0 ? "=" : chars.charAt(b2 & 63);
  }
  return out;
}

function utf8ToBytes(text) {
  var out = [], i, c;
  for (i = 0; i < text.length; i++) {
    c = text.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) { out.push(0xc0 | (c >> 6)); out.push(0x80 | (c & 63)); }
    else if (c < 0xd800 || c >= 0xe000) { out.push(0xe0 | (c >> 12)); out.push(0x80 | ((c >> 6) & 63)); out.push(0x80 | (c & 63)); }
    else {
      i++;
      var cc = 0x10000 + (((c & 0x3ff) << 10) | (text.charCodeAt(i) & 0x3ff));
      out.push(0xf0 | (cc >> 18)); out.push(0x80 | ((cc >> 12) & 63));
      out.push(0x80 | ((cc >> 6) & 63)); out.push(0x80 | (cc & 63));
    }
  }
  return out;
}

function bytesToUtf8(bytes) {
  var out = "", i = 0, b;
  while (i < bytes.length) {
    b = bytes[i++];
    if (b < 0x80) out += String.fromCharCode(b);
    else if (b < 0xe0) out += String.fromCharCode(((b & 31) << 6) | (bytes[i++] & 63));
    else if (b < 0xf0) out += String.fromCharCode(((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63));
    else {
      var cc = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
      cc -= 0x10000;
      out += String.fromCharCode(0xd800 + (cc >> 10), 0xdc00 + (cc & 1023));
    }
  }
  return out;
}

function aesDecrypt(bytes, w) {
  var out = [];
  for (var off = 0; off < bytes.length; off += 16) {
    var block = decryptBlock(bytes.slice(off, off + 16), w);
    for (var i = 0; i < 16; i++) out.push(block[i]);
  }
  var pad = out[out.length - 1];
  if (pad >= 1 && pad <= 16 && out.length >= pad) out = out.slice(0, out.length - pad);
  return out;
}

function aesEncrypt(bytes, w) {
  var pad = 16 - (bytes.length % 16);
  var data = bytes.slice();
  for (var i = 0; i < pad; i++) data.push(pad);
  var out = [];
  for (var off = 0; off < data.length; off += 16) {
    var block = encryptBlock(data.slice(off, off + 16), w);
    for (var j = 0; j < 16; j++) out.push(block[j]);
  }
  return out;
}

function isAd(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return false;
  return node.type === "elan" || typeof node.elan_text === "string";
}

function clean(node, depth) {
  if (!node || typeof node !== "object" || depth > 8) return node;
  if (Array.isArray(node)) {
    for (var i = 0; i < node.length; i++) clean(node[i], depth + 1);
    return node;
  }
  for (var k in node) {
    if (AD_KEYS.indexOf(k) >= 0) {
      var value = node[k];
      if (Array.isArray(value)) {
        node[k] = value.filter(function (item) { return !isAd(item); });
      } else if (typeof value === "boolean") {
        node[k] = false;
      } else if (isAd(value)) {
        node[k] = null;
      }
    } else if (k === "ads" && node[k] === true) {
      node[k] = false;
    } else {
      clean(node[k], depth + 1);
    }
  }
  return node;
}

// 上报拦截
var BLOCK_RE = /^https?:\/\/(?:[a-z0-9-]+\.)?(?:umeng\.com|jpush\.cn|oceanengine\.com|bdurl\.net)\//;
var reqUrl = (typeof $request !== "undefined" && $request && $request.url) || "";

function handle() {
  var raw = typeof $response !== "undefined" && $response ? $response.body : "";
  if (raw === undefined || raw === null || raw === "") {
    $done({});
    return;
  }
  var body = String(raw);
  var head = body.replace(/^\s+/, "").charAt(0);

  if (head === "{") {
    try {
      var plain = JSON.parse(body);
      clean(plain, 0);
      $done({ body: JSON.stringify(plain) });
    } catch (e) {
      $done({});
    }
    return;
  }

  try {
    var key = expandKey(CIPHER_KEYS);
    var bytes = aesDecrypt(b64decode(body.trim()), key);
    var text = bytesToUtf8(bytes);
    var obj = JSON.parse(text);
    clean(obj, 0);
    var packed = JSON.stringify(obj).replace(/\//g, "\\/");
    var sealed = aesEncrypt(utf8ToBytes(packed), key);
    $done({ body: b64encode(sealed) });
  } catch (e) {
    // 记录失败原因
    try { $persistentStore.write(String(e), "dilkan_clean_err"); } catch (ignore) {}
    $done({});
  }
}

if (reqUrl && BLOCK_RE.test(reqUrl)) {
  // 角标放行
  if (/^https?:\/\/user\.jpush\.cn\//.test(reqUrl)) {
    $done({});
  } else {
    // 须包裹返回
    $done({ response: { status: 200, headers: { "Content-Type": "application/json" }, body: "{}" } });
  }
} else {
  handle();
}