/**
 * @name yjs
 * @desc 应届生求职净化
 * @author axkrr
 * @update 2026-11-10
*/
var CFG = {
  preset: 'full',   // splash只清开屏|full默认|aggressive连运营tab
  fill: 'empty',    // []或null
  verbose: true
};

function log(s) { if (CFG.verbose) { try { console.log('[yjs] ' + s); } catch (e) {} } }

function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
function isObj(v) { return v !== null && typeof v === 'object' && !isArr(v); }

// 清空数组字段
function emptyArr(owner, key) {
  if (!isObj(owner)) return 0;
  if (!isArr(owner[key])) return 0;
  if (owner[key].length === 0) return 0;
  owner[key] = CFG.fill === 'null' ? null : [];
  return 1;
}

// 计数归零
function zeroCount(owner) {
  if (!isObj(owner)) return 0;
  var n = 0, keys = ['totalCount', 'totalcount'], i, k, v;
  for (i = 0; i < keys.length; i++) {
    k = keys[i];
    if (typeof owner[k] === 'undefined') continue;
    v = owner[k];
    if (v === 0 || v === '0' || v === null) continue;
    owner[k] = 0;
    n++;
  }
  return n;
}

function body(o) { return isObj(o) ? o.resultbody : null; }

// 开屏
function cleanSplash(o) {
  var rb = body(o); if (!rb) return 0;
  var n = emptyArr(rb, 'items');
  if (n) n += zeroCount(rb);
  return n;
}

// 运营位
function cleanOperationSlot(o) {
  var rb = body(o); if (!rb) return 0;
  var n = emptyArr(rb, 'items');
  if (n) n += zeroCount(rb);
  return n;
}

// 首页banner推荐
function cleanBannerRecommend(o) {
  var rb = body(o); if (!rb) return 0;
  var ob = rb.operationBanners; if (!isObj(ob)) return 0;
  var n = emptyArr(ob, 'items');
  if (n) n += zeroCount(ob);
  return n;
}

// 横幅列表
function cleanBannerList(o) {
  var rb = body(o); if (!rb) return 0;
  return emptyArr(rb, 'banners');
}

// 我的页banner
function cleanMyPageBanner(o) {
  var rb = body(o); if (!rb) return 0;
  return emptyArr(rb, 'bannerList');
}

// 广告主公司位
function cleanAdvCompany(o) {
  var rb = body(o); if (!rb) return 0;
  return emptyArr(rb, 'advCompanyItemVOList');
}

// 活动流广告位
function cleanAdsFeeds(o) {
  var rb = body(o); if (!rb) return 0;
  return emptyArr(rb, 'adsTabFeeds');
}

// 首页弹窗
function cleanHomePopup(o) {
  var rb = body(o);
  if (rb === null) {
    if (isArr(o.resultbody) && o.resultbody.length) { o.resultbody = []; return 1; }
    return 0;
  }
  var n = emptyArr(rb, 'popupList');
  n += emptyArr(rb, 'actionPopupList');
  n += emptyArr(rb, 'popups');
  n += emptyArr(rb, 'list');
  if (n) n += zeroCount(rb);
  return n;
}

// 活动页弹窗
function cleanActivityPopup(o) {
  var d = isObj(o.data) ? o.data : null; if (!d) return 0;
  var pc = d.popupConfigDTO; if (!isObj(pc)) return 0;
  return emptyArr(pc, 'actionPopupList');
}

// 好职页运营区
function cleanGoodJobModules(o) {
  var rb = body(o); if (!rb) return 0;
  var n = emptyArr(rb, 'kingKongList');
  n += emptyArr(rb, 'zoneList');
  n += emptyArr(rb, 'bannerList');
  return n;
}

// 导航栏活动tab
function cleanNavbarActivity(o) {
  var rb = body(o); if (!rb) return 0;
  if (!rb.adId) return 0;
  var k;
  for (k in rb) { if (Object.prototype.hasOwnProperty.call(rb, k)) delete rb[k]; }
  return 1;
}

// 路由表
var RULES = {
  '/open/noauth/operation/start':              { fn: cleanSplash,        min: 'splash' },
  '/open/noauth/operation/config':             { fn: cleanOperationSlot, min: 'full' },
  '/open/noauth/operation/welfare':            { fn: cleanOperationSlot, min: 'full' },
  '/open/noauth/operation/banner/recommend':   { fn: cleanBannerRecommend, min: 'full' },
  '/open/operation/get/latest/banner-list':    { fn: cleanBannerList,    min: 'full' },
  '/open/yjs/my-v2/basic_info':                { fn: cleanMyPageBanner,  min: 'full' },
  '/job/advCompany':                           { fn: cleanAdvCompany,    min: 'full' },
  '/open/51job-activities/master-doctor/yjs-query-jobs': { fn: cleanAdsFeeds, min: 'full' },
  '/launch-hub/open/noauth/popUp/getHomePagePopUp':      { fn: cleanHomePopup, min: 'full' },
  '/open/noauth/bcop-activity/activityPageInfoQuery':    { fn: cleanActivityPopup, min: 'full' },
  '/open/tab/good-job/modules':                { fn: cleanGoodJobModules, min: 'aggressive' },
  '/open/navbar/yjs/activity':                 { fn: cleanNavbarActivity, min: 'aggressive' }
};

function presetRank(p) {
  if (p === 'splash') return 1;
  if (p === 'aggressive') return 3;
  return 2;
}

function pathOf(url) {
  if (!url) return '';
  var s = String(url), i, j, q;
  i = s.indexOf('://');
  if (i >= 0) { j = s.indexOf('/', i + 3); s = j < 0 ? '/' : s.substring(j); }
  q = s.indexOf('?');
  if (q >= 0) s = s.substring(0, q);
  return s;
}

function applyClean(url, text) {
  var path = pathOf(url);
  var rule = RULES[path];
  if (!rule) return null;
  if (presetRank(CFG.preset) < presetRank(rule.min)) { log(path + '低于preset'); return null; }

  var obj;
  try { obj = JSON.parse(text); } catch (e) { log(path + '非JSON'); return null; }
  if (!isObj(obj)) { log(path + '非对象'); return null; }

  var n = 0;
  try { n = rule.fn(obj); } catch (e) { log(path + '异常'); return null; }

  if (!n) { log(path + '无广告字段'); return null; }
  var out = JSON.stringify(obj);
  if (!out || out.charAt(0) !== '{') { log(path + '编码异常'); return null; }
  log(path + '已清' + n);
  return out;
}

// 入口
function headerMap(list) {
  var m = {}, i;
  if (!list) return m;
  if (isArr(list)) {
    for (i = 0; i < list.length; i++) if (list[i] && list[i].name) m[list[i].name] = list[i].value;
  } else if (isObj(list)) {
    for (i in list) if (Object.prototype.hasOwnProperty.call(list, i)) m[i] = list[i];
  }
  return m;
}

function finish(v) { if (typeof $done === 'function') $done(v || {}); }

function main() {
  var resp = typeof $response !== 'undefined' ? $response : null;
  if (!resp) { finish({}); return; }

  var req = typeof $request !== 'undefined' ? $request : null;
  var url = (req && (req.url || req.URL)) || (resp.url || '') || '';
  if (!url) { log('无URL'); finish({}); return; }

  var text = resp.body !== undefined && resp.body !== null ? resp.body : resp.bodyBytes;
  if (typeof text !== 'string') {
    if (text && text.length !== undefined && text.length > 0) {
      if (typeof utf8dec === 'function') text = utf8dec(text);
      else { log('无解码器'); finish({}); return; }
    } else { log('空body'); finish({}); return; }
  }
  if (!text || !text.length) { log('空body'); finish({}); return; }
  text = text.replace(/^\s+|\s+$/g, '');

  var out = applyClean(url, text);
  if (!out) { finish({}); return; }

  var hdr = headerMap(resp.headers), k;
  for (k in hdr) {
    if (!Object.prototype.hasOwnProperty.call(hdr, k)) continue;
    var lk = k.toLowerCase();
    if (lk === 'content-encoding' || lk === 'content-length' ||
        lk === 'transfer-encoding' || lk === 'cache-control') delete hdr[k];
  }
  hdr['Content-Type'] = 'application/json; charset=utf-8';
  hdr['Cache-Control'] = 'no-store';

  finish({ status: resp.status || resp.statusCode || 200, headers: hdr, body: out });
}

try { main(); } catch (e) { log('异常'); finish({}); }
