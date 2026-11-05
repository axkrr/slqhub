/**
 * @name gp
 * @desc 国聘净化
 * @author axkrr
 * @update 2026-11-05
*/

var CFG = {
  preset: 'splash',
  action: 'status',
  status: 404,
  verbose: true,
  iconMaxPx: 400,
  adMinPx: 600,
  adMinBytes: 30000,
  splashAspect: 1.35,
  splashMinPx: 1000
};

var HOST_BASE = 'iguopin-base.oss-cn-beijing.aliyuncs.com';
var HOST_ACT  = 'hdjz-private.oss-cn-beijing.aliyuncs.com';
var PROTECT_RE = /\/avatar[\/%]|\/logo[\/%]|app\/icon-/i;
function emptyBody() { return ''; }

function splitUrl(url) {
  var m = /^(?:https?:)?\/\/([^\/?#]+)([^?#]*)/i.exec(url || '');
  if (!m) return null;
  return { host: m[1].toLowerCase(), path: m[2] || '/' };
}
function decodePath(p) {
  try { return decodeURIComponent(p); } catch (e) { return p; }
}

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

function imageSize(b) {
  if (!b || b.length < 24) return null;

  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    var pw = ((b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19]) >>> 0;
    var ph = ((b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]) >>> 0;
    return (pw && ph) ? { w: pw, h: ph } : null;
  }

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

function verdict(sz, n, host) {
  var maxEdge = Math.max(sz.w, sz.h);
  var ar = sz.h / sz.w;

  if (maxEdge <= CFG.iconMaxPx) return { act: 'PASS', why: 'icon' };
  if (n < CFG.adMinBytes)       return { act: 'PASS', why: 'small' };
  if (maxEdge < CFG.adMinPx)    return { act: 'PASS', why: 'edge' };
  if (ar >= CFG.splashAspect && maxEdge >= CFG.splashMinPx) {
    return { act: 'KILL', why: 'splash' };
  }
  if (CFG.preset === 'splash') return { act: 'PASS', why: 'preset-splash' };
  if (host === HOST_BASE) return { act: 'KILL', why: 'banner' };
  if (host === HOST_ACT)  return { act: 'KILL', why: 'activity' };
  return { act: 'PASS', why: 'host' };
}

function fail() {
  if (CFG.action === 'redirect') {
    return $done({
      status: 302,
      headers: { 'Location': 'http://127.0.0.1:9/_', 'Content-Length': '0' },
      body: emptyBody()
    });
  }
  if (CFG.action === 'empty') {
    return $done({ status: 200, headers: { 'Content-Length': '0' }, body: emptyBody() });
  }
  return $done({
    status: CFG.status,
    headers: { 'Content-Length': '0', 'Cache-Control': 'public, max-age=86400' },
    body: emptyBody()
  });
}

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
  if (!sz) return $done({}); 

  var v = verdict(sz, bytes.length, host);

  if (CFG.verbose) {
    console.log('[国聘净化] ' + v.act + ' ' + v.why + ' ' +
      sz.w + 'x' + sz.h + ' ' + bytes.length + 'B ' + host.split('.')[0]);
  }

  if (v.act === 'KILL') return fail();
  return $done({});
})();
