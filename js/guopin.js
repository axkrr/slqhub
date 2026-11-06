/**
 * @name gp
 * @desc 国聘净化
 * @author axkrr
 * @update 2026-11-06
*/

var CFG = {
  // 'full'       : 开屏(8000) + 首页广告位(8012) + 我的页 banner(8009)
  //                + 职位列表浮窗(8221) + 订阅页广告(8687)  ← 默认，真机验证过不留白
  // 'splash'     : 只清开屏（action 8000 的 3 个 splash_* 字段）
  preset:  'full',

  // splash_* 字段的清理方式：
  // 'delete' : 整个 key 从 JSON 里删掉（默认，最稳）
  //            ObjC 取不到 key 得到 nil，nil.length==0，任何写法都会跳过开屏。
  // 'empty'  : 置为空字符串。少数 App 用 if (url) 判空（空串在 ObjC 里是"真"），
  //            可能仍会走开屏分支去加载空图，出现白屏。优先用 delete。
  splashFill: 'delete',

  // 对象型广告字段（8221 window_floating_ad / 8687 major_job_ad、gp_subscription_ad）的清理方式：
  // 'delete' : 删 key，App 取到 nil（默认，与 splash 同一套已验证机制）
  // 'null'   : 置 null。服务端自己就会给 gp_subscription_ad 发 null，
  //            说明 App 的模型能接受 null。若删 key 后出现灰块，改这个。
  adFill: 'delete',

  // false = 只记「已清 N 项」这类关键行（省日志）
  // true  = 另外记录每条响应的 action 判定结果（真机排查用）
  verbose: true
};

var HOST_API = 'appv5-api.iguopin.com';

// 单条响应最大处理上限
var MAX_BODY = 600000;

var KEY_STR = 'ly@9Hzp4hi$4T#Jhg@Y^cDayE!iqtSli';

function log(s) { if (CFG.verbose) { try { console.log('[国聘净化] ' + s); } catch (e) {} } }

/* ---------------- base64 ---------------- */
var B64C = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
var B64M = (function () {
  var m = {}, i;
  for (i = 0; i < 64; i++) m[B64C.charAt(i)] = i;
  m['-'] = 62; m['_'] = 63; m['='] = 0;
  return m;
})();

function b64dec(s) {
  var n = s.length, pad = 0, i, c;
  // 预估输出长度
  var cap = (n * 3) >> 2;
  var out = new Uint8Array(cap), o = 0, buf = 0, bits = 0, v;
  for (i = 0; i < n; i++) {
    c = s.charCodeAt(i);
    // 快速跳过空白的常用分支
    if (c === 61) { pad++; continue; }          // '='
    if (c === 10 || c === 13 || c === 32 || c === 9) continue;
    v = B64M[s.charAt(i)];
    if (v === undefined) continue;
    buf = (buf << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (buf >> bits) & 0xFF; }
  }
  return out.subarray(0, o);
}

var B64CH = (function () {
  var a = new Array(64), i;
  for (i = 0; i < 64; i++) a[i] = B64C.charAt(i);
  return a;
})();

function b64enc(u8) {
  var len = u8.length, nTri = (len / 3) | 0, rem = len - nTri * 3;
  var parts = [], CH = B64CH, i, b0, b1, b2, o = 0;
  var chunk = new Array(4096);
  for (i = 0; i < nTri; i++) {
    b0 = u8[o++]; b1 = u8[o++]; b2 = u8[o++];
    chunk[(i & 1023) * 4]     = CH[b0 >> 2];
    chunk[(i & 1023) * 4 + 1] = CH[((b0 & 3) << 4) | (b1 >> 4)];
    chunk[(i & 1023) * 4 + 2] = CH[((b1 & 15) << 2) | (b2 >> 6)];
    chunk[(i & 1023) * 4 + 3] = CH[b2 & 63];
    if ((i & 1023) === 1023) { parts.push(chunk.join('')); chunk = new Array(4096); }
  }
  if ((nTri & 1023) !== 0) parts.push(chunk.slice(0, (nTri & 1023) * 4).join(''));
  var tail = '';
  if (rem === 1) {
    b0 = u8[o];
    tail = CH[b0 >> 2] + CH[(b0 & 3) << 4] + '==';
  } else if (rem === 2) {
    b0 = u8[o]; b1 = u8[o + 1];
    tail = CH[b0 >> 2] + CH[((b0 & 3) << 4) | (b1 >> 4)] + CH[(b1 & 15) << 2] + '=';
  }
  return parts.join('') + tail;
}

/* ---------------- utf8 ---------------- */
function utf8enc(str) {
  var out = [], i, c, c2;
  for (i = 0; i < str.length; i++) {
    c = str.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) { out.push(0xC0 | (c >> 6), 0x80 | (c & 63)); }
    else if (c >= 0xD800 && c <= 0xDBFF) {
      c2 = str.charCodeAt(i + 1);
      if (c2 >= 0xDC00 && c2 <= 0xDFFF) {
        i++;
        c = 0x10000 + ((c - 0xD800) << 10) + (c2 - 0xDC00);
        out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      } else { out.push(0xEF, 0xBF, 0xBD); }
    } else if (c >= 0xDC00 && c <= 0xDFFF) { out.push(0xEF, 0xBF, 0xBD); }
    else { out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
  }
  return new Uint8Array(out);
}

function utf8dec(u8) {
  var out = '', i = 0, c, c2, c3, c4;
  while (i < u8.length) {
    c = u8[i++];
    if (c < 0x80) out += String.fromCharCode(c);
    else if (c < 0xE0) { c2 = u8[i++]; out += String.fromCharCode(((c & 31) << 6) | (c2 & 63)); }
    else if (c < 0xF0) {
      c2 = u8[i++]; c3 = u8[i++];
      out += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
    } else {
      c2 = u8[i++]; c3 = u8[i++]; c4 = u8[i++];
      c = (((c & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) - 0x10000;
      out += String.fromCharCode(0xD800 + (c >> 10), 0xDC00 + (c & 1023));
    }
  }
  return out;
}

/* ---------------- AES-256（T-table 高性能实现） ---------------- */

/* ================= 高性能 AES-256（T-table 实现） ================= */

var SBOX = (function () {
  var h = '637c777bf26b6fc53001672bfed7ab76ca82c97dfa5947f0add4a2af9ca472c0' +
          'b7fd9326363ff7cc34a5e5f171d8311504c723c31896059a071280e2eb27b275' +
          '09832c1a1b6e5aa0523bd6b329e32f8453d100ed20fcb15b6acbbe394a4c58cf' +
          'd0efaafb434d338545f9027f503c9fa851a3408f929d38f5bcb6da2110fff3d2' +
          'cd0c13ec5f974417c4a77e3d645d197360814fdc222a908846eeb814de5e0bdb' +
          'e0323a0a4906245cc2d3ac629195e479e7c8376d8dd54ea96c56f4ea657aae08' +
          'ba78252e1ca6b4c6e8dd741f4bbd8b8a703eb5664803f60e613557b986c11d9e' +
          'e1f8981169d98e949b1e87e9ce5528df8ca1890dbfe6426841992d0fb054bb16';
  var a = new Uint8Array(256), i;
  for (i = 0; i < 256; i++) a[i] = parseInt(h.substr(i * 2, 2), 16);
  return a;
})();

var INV_SBOX = (function () {
  var a = new Uint8Array(256), i;
  for (i = 0; i < 256; i++) a[SBOX[i]] = i;
  return a;
})();

var Te0 = new Uint32Array(256), Te1 = new Uint32Array(256),
    Te2 = new Uint32Array(256), Te3 = new Uint32Array(256),
    Td0 = new Uint32Array(256), Td1 = new Uint32Array(256),
    Td2 = new Uint32Array(256), Td3 = new Uint32Array(256);

(function () {
  function xt(a) { return ((a << 1) ^ (a & 0x80 ? 0x1b : 0)) & 0xFF; }
  function gmul(a, b) {
    var p = 0;
    while (b) { if (b & 1) p ^= a; a = xt(a); b >>= 1; }
    return p & 0xFF;
  }
  var x, s, s2, s3, s9, s11, s13, s14;
  for (x = 0; x < 256; x++) {
    s = SBOX[x];
    s2 = xt(s); s3 = s2 ^ s;
    Te0[x] = (s2 << 24) | (s << 16) | (s << 8) | s3;
    Te1[x] = (s3 << 24) | (s2 << 16) | (s << 8) | s;
    Te2[x] = (s << 24) | (s3 << 16) | (s2 << 8) | s;
    Te3[x] = (s << 24) | (s << 16) | (s3 << 8) | s2;

    s = INV_SBOX[x];
    s9 = gmul(s, 9); s11 = gmul(s, 11); s13 = gmul(s, 13); s14 = gmul(s, 14);
    Td0[x] = (s14 << 24) | (s9 << 16) | (s13 << 8) | s11;
    Td1[x] = (s11 << 24) | (s14 << 16) | (s9 << 8) | s13;
    Td2[x] = (s13 << 24) | (s11 << 16) | (s14 << 8) | s9;
    Td3[x] = (s9 << 24) | (s13 << 16) | (s11 << 8) | s14;
  }
})();

// AES-256：Nk=8, Nr=14, 轮密钥 60 个字
function expandKeyU32(keyU8) {
  var Nk = 8, Nr = 14, total = 4 * (Nr + 1);
  var w = new Uint32Array(total), i, t, t0, t1, t2, t3;

  for (i = 0; i < Nk; i++) {
    w[i] = (keyU8[i * 4] << 24) | (keyU8[i * 4 + 1] << 16) | (keyU8[i * 4 + 2] << 8) | keyU8[i * 4 + 3];
  }

  var rcon = 1;
  for (i = Nk; i < total; i++) {
    t = w[i - 1];
    if (i % Nk === 0) {
      // RotWord + SubWord + Rcon
      t = ((t << 8) | (t >>> 24)) >>> 0;
      w[i] = (w[i - Nk] ^
              (SBOX[(t >>> 24) & 0xFF] << 24) ^
              (SBOX[(t >>> 16) & 0xFF] << 16) ^
              (SBOX[(t >>> 8) & 0xFF] << 8) ^
              SBOX[t & 0xFF] ^
              (rcon << 24)) >>> 0;
      rcon = xt(rcon);
    } else if (i % Nk === 4) {
      w[i] = (w[i - Nk] ^
              (SBOX[(t >>> 24) & 0xFF] << 24) ^
              (SBOX[(t >>> 16) & 0xFF] << 16) ^
              (SBOX[(t >>> 8) & 0xFF] << 8) ^
              SBOX[t & 0xFF]) >>> 0;
    } else {
      w[i] = (w[i - Nk] ^ t) >>> 0;
    }
  }
  return w;
}

function xt(a) { return ((a << 1) ^ (a & 0x80 ? 0x1b : 0)) & 0xFF; }

// 就地加密一个块：s 是 16 字节，写到 out（偏移 off）
function encBlock(s, w, out, off) {
  var s0 = ((s[0] << 24) | (s[1] << 16) | (s[2] << 8) | s[3]) ^ w[0];
  var s1 = ((s[4] << 24) | (s[5] << 16) | (s[6] << 8) | s[7]) ^ w[1];
  var s2 = ((s[8] << 24) | (s[9] << 16) | (s[10] << 8) | s[11]) ^ w[2];
  var s3 = ((s[12] << 24) | (s[13] << 16) | (s[14] << 8) | s[15]) ^ w[3];
  var t0, t1, t2, t3, r, o;

  for (r = 1; r < 14; r++) {
    o = r << 2;
    t0 = Te0[s0 >>> 24] ^ Te1[(s1 >>> 16) & 0xFF] ^ Te2[(s2 >>> 8) & 0xFF] ^ Te3[s3 & 0xFF] ^ w[o];
    t1 = Te0[s1 >>> 24] ^ Te1[(s2 >>> 16) & 0xFF] ^ Te2[(s3 >>> 8) & 0xFF] ^ Te3[s0 & 0xFF] ^ w[o + 1];
    t2 = Te0[s2 >>> 24] ^ Te1[(s3 >>> 16) & 0xFF] ^ Te2[(s0 >>> 8) & 0xFF] ^ Te3[s1 & 0xFF] ^ w[o + 2];
    t3 = Te0[s3 >>> 24] ^ Te1[(s0 >>> 16) & 0xFF] ^ Te2[(s1 >>> 8) & 0xFF] ^ Te3[s2 & 0xFF] ^ w[o + 3];
    s0 = t0; s1 = t1; s2 = t2; s3 = t3;
  }

  o = 56;
  t0 = ((SBOX[s0 >>> 24] << 24) | (SBOX[(s1 >>> 16) & 0xFF] << 16) | (SBOX[(s2 >>> 8) & 0xFF] << 8) | SBOX[s3 & 0xFF]) ^ w[o];
  t1 = ((SBOX[s1 >>> 24] << 24) | (SBOX[(s2 >>> 16) & 0xFF] << 16) | (SBOX[(s3 >>> 8) & 0xFF] << 8) | SBOX[s0 & 0xFF]) ^ w[o + 1];
  t2 = ((SBOX[s2 >>> 24] << 24) | (SBOX[(s3 >>> 16) & 0xFF] << 16) | (SBOX[(s0 >>> 8) & 0xFF] << 8) | SBOX[s1 & 0xFF]) ^ w[o + 2];
  t3 = ((SBOX[s3 >>> 24] << 24) | (SBOX[(s0 >>> 16) & 0xFF] << 16) | (SBOX[(s1 >>> 8) & 0xFF] << 8) | SBOX[s2 & 0xFF]) ^ w[o + 3];

  out[off]     = (t0 >>> 24) & 0xFF; out[off + 1] = (t0 >>> 16) & 0xFF;
  out[off + 2] = (t0 >>> 8) & 0xFF;  out[off + 3] = t0 & 0xFF;
  out[off + 4] = (t1 >>> 24) & 0xFF; out[off + 5] = (t1 >>> 16) & 0xFF;
  out[off + 6] = (t1 >>> 8) & 0xFF;  out[off + 7] = t1 & 0xFF;
  out[off + 8] = (t2 >>> 24) & 0xFF; out[off + 9] = (t2 >>> 16) & 0xFF;
  out[off + 10] = (t2 >>> 8) & 0xFF; out[off + 11] = t2 & 0xFF;
  out[off + 12] = (t3 >>> 24) & 0xFF; out[off + 13] = (t3 >>> 16) & 0xFF;
  out[off + 14] = (t3 >>> 8) & 0xFF;  out[off + 15] = t3 & 0xFF;
}

function decBlock(inU8, off, w, out, outOff) {
  var dk = w.__dec || (w.__dec = expandKeyDec(w));
  var s0 = ((inU8[off] << 24) | (inU8[off + 1] << 16) | (inU8[off + 2] << 8) | inU8[off + 3]) ^ dk[56];
  var s1 = ((inU8[off + 4] << 24) | (inU8[off + 5] << 16) | (inU8[off + 6] << 8) | inU8[off + 7]) ^ dk[57];
  var s2 = ((inU8[off + 8] << 24) | (inU8[off + 9] << 16) | (inU8[off + 10] << 8) | inU8[off + 11]) ^ dk[58];
  var s3 = ((inU8[off + 12] << 24) | (inU8[off + 13] << 16) | (inU8[off + 14] << 8) | inU8[off + 15]) ^ dk[59];
  var t0, t1, t2, t3, r, o;

  for (r = 13; r >= 1; r--) {
    o = r << 2;
    t0 = Td0[s0 >>> 24] ^ Td1[(s3 >>> 16) & 0xFF] ^ Td2[(s2 >>> 8) & 0xFF] ^ Td3[s1 & 0xFF] ^ dk[o];
    t1 = Td0[s1 >>> 24] ^ Td1[(s0 >>> 16) & 0xFF] ^ Td2[(s3 >>> 8) & 0xFF] ^ Td3[s2 & 0xFF] ^ dk[o + 1];
    t2 = Td0[s2 >>> 24] ^ Td1[(s1 >>> 16) & 0xFF] ^ Td2[(s0 >>> 8) & 0xFF] ^ Td3[s3 & 0xFF] ^ dk[o + 2];
    t3 = Td0[s3 >>> 24] ^ Td1[(s2 >>> 16) & 0xFF] ^ Td2[(s1 >>> 8) & 0xFF] ^ Td3[s0 & 0xFF] ^ dk[o + 3];
    s0 = t0; s1 = t1; s2 = t2; s3 = t3;
  }

  t0 = ((INV_SBOX[s0 >>> 24] << 24) | (INV_SBOX[(s3 >>> 16) & 0xFF] << 16) | (INV_SBOX[(s2 >>> 8) & 0xFF] << 8) | INV_SBOX[s1 & 0xFF]) ^ dk[0];
  t1 = ((INV_SBOX[s1 >>> 24] << 24) | (INV_SBOX[(s0 >>> 16) & 0xFF] << 16) | (INV_SBOX[(s3 >>> 8) & 0xFF] << 8) | INV_SBOX[s2 & 0xFF]) ^ dk[1];
  t2 = ((INV_SBOX[s2 >>> 24] << 24) | (INV_SBOX[(s1 >>> 16) & 0xFF] << 16) | (INV_SBOX[(s0 >>> 8) & 0xFF] << 8) | INV_SBOX[s3 & 0xFF]) ^ dk[2];
  t3 = ((INV_SBOX[s3 >>> 24] << 24) | (INV_SBOX[(s2 >>> 16) & 0xFF] << 16) | (INV_SBOX[(s1 >>> 8) & 0xFF] << 8) | INV_SBOX[s0 & 0xFF]) ^ dk[3];

  out[outOff]      = (t0 >>> 24) & 0xFF; out[outOff + 1]  = (t0 >>> 16) & 0xFF;
  out[outOff + 2]  = (t0 >>> 8) & 0xFF;  out[outOff + 3]  = t0 & 0xFF;
  out[outOff + 4]  = (t1 >>> 24) & 0xFF; out[outOff + 5]  = (t1 >>> 16) & 0xFF;
  out[outOff + 6]  = (t1 >>> 8) & 0xFF;  out[outOff + 7]  = t1 & 0xFF;
  out[outOff + 8]  = (t2 >>> 24) & 0xFF; out[outOff + 9]  = (t2 >>> 16) & 0xFF;
  out[outOff + 10] = (t2 >>> 8) & 0xFF;  out[outOff + 11] = t2 & 0xFF;
  out[outOff + 12] = (t3 >>> 24) & 0xFF; out[outOff + 13] = (t3 >>> 16) & 0xFF;
  out[outOff + 14] = (t3 >>> 8) & 0xFF;  out[outOff + 15] = t3 & 0xFF;
}

function invMixWord(w) {
  var a0 = (w >>> 24) & 0xFF, a1 = (w >>> 16) & 0xFF, a2 = (w >>> 8) & 0xFF, a3 = w & 0xFF;
  var b0 = gmul8(a0,14) ^ gmul8(a1,11) ^ gmul8(a2,13) ^ gmul8(a3,9);
  var b1 = gmul8(a0,9)  ^ gmul8(a1,14) ^ gmul8(a2,11) ^ gmul8(a3,13);
  var b2 = gmul8(a0,13) ^ gmul8(a1,9)  ^ gmul8(a2,14) ^ gmul8(a3,11);
  var b3 = gmul8(a0,11) ^ gmul8(a1,13) ^ gmul8(a2,9)  ^ gmul8(a3,14);
  return ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
}

function gmul8(a, b) {
  var p = 0;
  while (b) { if (b & 1) p ^= a; a = ((a << 1) ^ (a & 0x80 ? 0x1b : 0)) & 0xFF; b >>= 1; }
  return p & 0xFF;
}

// 生成解密轮密钥（等价逆密码：中间轮密钥先 InvMixColumns）
function expandKeyDec(w) {
  var d = new Uint32Array(w.length), i;
  d[0] = w[0]; d[1] = w[1]; d[2] = w[2]; d[3] = w[3];
  for (i = 4; i < 56; i++) d[i] = invMixWord(w[i]);
  d[56] = w[56]; d[57] = w[57]; d[58] = w[58]; d[59] = w[59];
  return d;
}
var _WK = null, _WKSRC = null;
function expandKey(keyU8) {
  if (_WK && _WKSRC === keyU8) return _WK;
  var w = expandKeyU32(keyU8);
  w.__dec = expandKeyDec(w);
  _WK = w; _WKSRC = keyU8;
  return w;
}

function cbcEncrypt(plainU8, keyU8, ivU8) {
  var w = expandKey(keyU8);
  var pad = 16 - (plainU8.length % 16);
  var buf = new Uint8Array(plainU8.length + pad);
  buf.set(plainU8);
  for (var i = plainU8.length; i < buf.length; i++) buf[i] = pad;
  var out = new Uint8Array(buf.length), prev = ivU8, blk = new Uint8Array(16);
  for (var off = 0; off < buf.length; off += 16) {
    for (var j = 0; j < 16; j++) blk[j] = buf[off + j] ^ prev[j];
    encBlock(blk, w, out, off);
    prev = out.subarray(off, off + 16);
  }
  return out;
}

function cbcDecrypt(ciphU8, keyU8, ivU8) {
  var w = expandKey(keyU8);
  var n = ciphU8.length;
  if (!n || n % 16) return null;
  var out = new Uint8Array(n);
  var prev = new Uint8Array(16);
  prev.set(ivU8);
  for (var off = 0; off < n; off += 16) {
    decBlock(ciphU8, off, w, out, off);
    for (var k = 0; k < 16; k++) out[off + k] ^= prev[k];
    prev.set(ciphU8.subarray(off, off + 16));
  }
  var pad = out[n - 1];
  if (pad < 1 || pad > 16 || pad > n) return null;
  for (var q = n - pad; q < n; q++) if (out[q] !== pad) return null;
  return out.subarray(0, n - pad);
}

/* ---------------- 业务 ---------------- */
var KEY_U8 = null, IV_U8 = null;

function initKey() {
  if (KEY_U8) return;
  KEY_U8 = utf8enc(KEY_STR);
  IV_U8 = KEY_U8.subarray(0, 16);
}

// 尝试用固定钥匙解一层
function aesDecodeOnce(b64) {
  var raw = b64dec(String(b64).replace(/[\s\r\n]/g, ''));
  if (!raw.length || raw.length % 16 !== 0) return null;
  var plain;
  try { plain = cbcDecrypt(raw, KEY_U8, IV_U8); } catch (e) { return null; }
  return plain ? utf8dec(plain) : null;
}

function looksJson(s) {
  if (!s) return false;
  var t = s.replace(/^[\s\uFEFF]+/, '');
  var c = t.charAt(0);
  return c === '{' || c === '[';
}

/* ---------------- 快照嗅探：只解前几块，O(1) 判定 action ---------------- */

// 把若干密文块按 CBC 解出来（IV 取自钥匙前 16 字节，块间用密文自身链接）
function peekBlocks(ct, nBlocks) {
  var w = expandKey(KEY_U8);
  var out = new Uint8Array(nBlocks * 16);
  var prev = IV_U8, pv = new Uint8Array(16), i, j;
  for (i = 0; i < nBlocks; i++) {
    decBlock(ct, i * 16, w, out, i * 16);
    for (j = 0; j < 16; j++) out[i * 16 + j] ^= prev[j];
    pv.set(ct.subarray(i * 16, i * 16 + 16));
    prev = pv;
    pv = new Uint8Array(16);
  }
  return out;
}

// 取密文前 144 字节并解出前 96 字节明文
function headPlainFrom(cipherB64Head) {
  var raw = b64dec(cipherB64Head);
  var usable = (raw.length >> 4) << 4;
  if (usable < 32) return null;
  return utf8dec(peekBlocks(raw, usable / 16));
}

// 返回 { layers, action } 或 null。只看头部，不解全文。
function peekAction(text) {
  initKey();
  var s = String(text).replace(/^[\s\r\n]+|[\s\r\n]+$/g, '');

  // 第 1 层：密文 base64 直接是响应体
  var h1 = headPlainFrom(s.slice(0, 192));
  if (h1 && looksJson(h1)) {
    return { layers: 1, action: readAction(h1) };
  }

  // 第 2 层：响应体是「密文 base64 再 base64 一次」
  var innerHeadRaw = b64dec(s.slice(0, 192));
  if (innerHeadRaw.length >= 32) {
    var innerB64Head = utf8dec(innerHeadRaw);
    var h2 = headPlainFrom(innerB64Head);
    if (h2 && looksJson(h2)) {
      return { layers: 2, action: readAction(h2) };
    }
  }
  return null;
}

function readAction(headText) {
  var m = /"action"\s*:\s*(\d+)/.exec(headText);
  return m ? parseInt(m[1], 10) : -1;
}

/* ---------------- 完整编解码（只对目标 action 调用） ---------------- */

function decodeBody(text) {
  initKey();
  var s = String(text).replace(/^[\s\r\n]+|[\s\r\n]+$/g, '');

  var p1 = aesDecodeOnce(s);
  if (p1 && looksJson(p1)) return { plain: p1, layers: 1 };

  var inner = utf8dec(b64dec(s));
  if (inner) {
    var p2 = aesDecodeOnce(inner.replace(/[\s\r\n]/g, ''));
    if (p2 && looksJson(p2)) return { plain: p2, layers: 2 };
  }
  return null;
}

function encodeBody(txt, layers) {
  initKey();
  var enc = b64enc(cbcEncrypt(utf8enc(txt), KEY_U8, IV_U8));
  if (layers === 2) enc = b64enc(utf8enc(enc));
  return enc;
}

/* ---------------- 业务清理 ---------------- */

function parseJson(txt) { try { return JSON.parse(txt); } catch (e) { return null; } }

var SPLASH_KEYS = ['splash_img_url', 'splash_img_qm_url', 'splash_url'];

function cleanSplash(obj) {
  var d = obj.data;
  if (!d || typeof d !== 'object') return 0;
  var n = 0, i, k;
  for (i = 0; i < SPLASH_KEYS.length; i++) {
    k = SPLASH_KEYS[i];
    if (!Object.prototype.hasOwnProperty.call(d, k)) continue;
    if (CFG.splashFill === 'empty') {
      if (typeof d[k] === 'string' && d[k] !== '') { d[k] = ''; n++; }
    } else {
      delete d[k]; n++;
    }
  }
  return n;
}

function cleanHomeAd(obj) {
  var d = obj.data;
  if (!d || !d.ad || typeof d.ad !== 'object') return 0;
  var n = 0, k;
  for (k in d.ad) {
    if (Object.prototype.hasOwnProperty.call(d.ad, k) && Array.isArray(d.ad[k]) && d.ad[k].length) {
      d.ad[k] = []; n++;
    }
  }
  return n;
}

function cleanMineBanner(obj) {
  var d = obj.data;
  if (!d || !Array.isArray(d.banner) || !d.banner.length) return 0;
  var n = d.banner.length;
  d.banner = [];
  return n;
}

// 职位列表浮窗广告（8221 data.window_floating_ad）
// 同一层还有 is_subscribe / expired_time / live_info / dictionary 等业务字段，只动这一个 key
var JOBLIST_AD_KEYS = ['window_floating_ad'];

function cleanJobListAd(obj) {
  var d = obj.data;
  if (!d || typeof d !== 'object') return 0;
  var n = 0, i, k, v;
  for (i = 0; i < JOBLIST_AD_KEYS.length; i++) {
    k = JOBLIST_AD_KEYS[i];
    if (!Object.prototype.hasOwnProperty.call(d, k)) continue;
    v = d[k];
    if (v === null || v === undefined) continue;   // 服务端本来就没广告，不计入
    if (typeof v !== 'object' && typeof v !== 'string') continue;
    if (v === '') continue;
    if (CFG.adFill === 'null') { d[k] = null; n++; }
    else { delete d[k]; n++; }
  }
  return n;
}

// 订阅页两个广告位（8687 data.major_job_ad / data.gp_subscription_ad）
// 同层 announcement / major_job / gp_subscription / permission_* 是业务开关，必须保留
var SUBSCRIBE_AD_KEYS = ['major_job_ad', 'gp_subscription_ad'];

function cleanSubscribeAd(obj) {
  var d = obj.data;
  if (!d || typeof d !== 'object') return 0;
  var n = 0, i, k, v;
  for (i = 0; i < SUBSCRIBE_AD_KEYS.length; i++) {
    k = SUBSCRIBE_AD_KEYS[i];
    if (!Object.prototype.hasOwnProperty.call(d, k)) continue;
    v = d[k];
    // 实测 gp_subscription_ad 服务端本身就发 null；null/空值不算「清了广告」
    if (v === null || v === undefined) continue;
    if (typeof v === 'object' && Object.keys(v).length === 0) continue;
    if (CFG.adFill === 'null') { d[k] = null; n++; }
    else { delete d[k]; n++; }
  }
  return n;
}

function isTargetAction(act) {
  if (act === 8000) return true;
  if (CFG.preset === 'full') {
    if (act === 8012 || act === 8009 || act === 8221 || act === 8687) return true;
  }
  return false;
}

// 按 action 分发到具体清理函数，返回改变的字段数
function applyClean(obj) {
  var act = obj.action;
  if (act === 8000) return { n: cleanSplash(obj), what: '开屏' };
  if (act === 8012) return { n: cleanHomeAd(obj), what: '首页广告位' };
  if (act === 8009) return { n: cleanMineBanner(obj), what: '我的页 banner' };
  if (act === 8221) return { n: cleanJobListAd(obj), what: '职位列表浮窗' };
  if (act === 8687) return { n: cleanSubscribeAd(obj), what: '订阅页广告位' };
  return { n: 0, what: '' };
}

function runApi(bodyText) {
  if (bodyText.length > MAX_BODY) { log('响应过大(' + bodyText.length + 'B)，跳过'); return null; }

  // 快照判定：解不动或不是目标 action，立刻放行，不做任何全量解密
  var peek = peekAction(bodyText);

  // 明文兜底：服务端哪天关了加密，本模块依然有效（只在头部像 JSON 时才试）
  if (!peek) {
    var raw = bodyText.replace(/^\s+|\s+$/g, '');
    if (raw.charAt(0) === '{') {
      var o0 = parseJson(raw);
      if (o0 && isTargetAction(o0.action)) {
        var c0 = applyClean(o0);
        if (c0.n) {
          var j0 = JSON.stringify(o0);
          if (parseJson(j0)) {
            log('action ' + o0.action + ' 已清' + c0.what + ' ' + c0.n + ' 项（明文响应 ' + bodyText.length + 'B→' + j0.length + 'B）');
            return j0;
          }
        }
      }
    }
    log('无法识别响应格式，原样放行');
    return null;
  }
  if (!isTargetAction(peek.action)) return null;

  var got = decodeBody(bodyText);
  if (!got) { log('解密失败，原样放行'); return null; }

  var obj = parseJson(got.plain);
  if (!obj) { log('明文非 JSON，原样放行'); return null; }

  var act = obj.action, res = applyClean(obj), changed = res.n, what = res.what;

  if (!changed) { log('action ' + act + ' 无广告字段（已干净）'); return null; }

  var out = JSON.stringify(obj);
  if (!parseJson(out)) { log('重编码异常，原样放行'); return null; }

  var enc = encodeBody(out, got.layers);
  if (!enc) { log('重加密失败，原样放行'); return null; }

  var back = decodeBody(enc);
  if (!back || back.plain !== out) { log('自检失败，原样放行'); return null; }

  log('action ' + act + ' 已清' + what + ' ' + changed + ' 项 (' + bodyText.length + 'B→' + enc.length + 'B)');
  return enc;
}
/* ---------------- 入口 ---------------- */

var finished = false;
function finish(o) { if (finished) return; finished = true; try { $done(o); } catch (e) {} }

function headerMap(h) {
  var out = {}, k;
  try {
    for (k in h) if (Object.prototype.hasOwnProperty.call(h, k)) out[k] = h[k];
  } catch (e) {}
  return out;
}

function main() {
  var req  = (typeof $request  !== 'undefined' && $request)  ? $request  : null;
  var resp = (typeof $response !== 'undefined' && $response) ? $response : null;
  if (!resp) { finish({}); return; }

  var url = (req && (req.url || req.URL)) || resp.url || '';
  var host = url ? String(url).replace(/^https?:\/\//, '').split('/')[0].split(':')[0] : '';

  /* --- 1) 主通道：解密 /api 响应 --- */
  // 模块规则已把脚本限定在 HOST_API 上；个别客户端在 http-response 阶段
  // 不提供 $request，此处拿不到 host。此时信任模块规则继续处理，
  // 否则会静默失效（有脚本、有日志、就是不净化）。
  if (!host || host === HOST_API) {
    var body = resp.body;
    if (body === undefined || body === null) body = resp.bodyBytes;

    var text = null;
    if (typeof body === 'string') text = body;
    else if (body && body.length !== undefined && body.length > 0) text = utf8dec(body);

    if (!text || !text.length) { log('拿到空响应体，放行（检查模块是否 requires-body=1）'); finish({}); return; }
    // gzip 等二进制兜底：不是 base64 文本就放行
    if (text.charCodeAt(0) === 0x1f && text.charCodeAt(1) === 0x8b) { log('响应为 gzip 二进制，放行'); finish({}); return; }

    var outBody = runApi(text.replace(/^\s+|\s+$/g, ''));
    if (!outBody) { finish({}); return; }

    // 头处理：响应体已被我们重写成明文 base64 文本，必须去掉 gzip/length/transfer 相关头。
    // content-type 也一起去掉（各客户端大小写归一化不一致，留着会出现重复头）。
    var hdr = headerMap(resp.headers), k;
    for (k in hdr) {
      if (!Object.prototype.hasOwnProperty.call(hdr, k)) continue;
      var lk = k.toLowerCase();
      if (lk === 'content-encoding' || lk === 'content-length' || lk === 'transfer-encoding' ||
          lk === 'content-type' || lk === 'cache-control') delete hdr[k];
    }
    hdr['Content-Type'] = 'text/html; charset=utf-8';
    hdr['Cache-Control'] = 'no-store';

    finish({ status: resp.status || resp.statusCode || 200, headers: hdr, body: outBody });
    return;
  }

  finish({});
}

try { main(); } catch (e) { log('异常: ' + (e && e.message ? e.message : e)); finish({}); }
