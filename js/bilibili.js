/*
哔哩哔哩扫码登录 - QuanX 分段版 (2026-08-29)
配套 ClydeTime/BiliBili 的 BiliBiliDailyBonus.js 使用(每日任务不受影响)

段1: script-response-body 触发 → 生成二维码并推送(约0.5秒完成, 不触发QuanX重写10秒超时)
段2: script-request-header 匹配 app.bilibili.com 任意请求 → APP流量驱动轮询(秒级)
段3: 定时任务(* * * * *) → 兜底轮询(每分钟, 每5秒一次×3)

QuanX 配置:
[rewrite_local]
^https?:\/\/app\.bilibili\.com\/x\/resource\/fingerprint\? url script-response-body https://raw.githubusercontent.com/axkrr/slqhub/main/js/bilibili.js
^https?:\/\/app\.bilibili\.com\/ url script-request-header https://raw.githubusercontent.com/axkrr/slqhub/main/js/bilibili.js

[task_local]
* * * * * https://raw.githubusercontent.com/axkrr/slqhub/main/js/bilibili.js, tag=B站扫码轮询兜底, enabled=true
30 7 * * * https://raw.githubusercontent.com/ClydeTime/BiliBili/main/js/BiliBiliDailyBonus.js, tag=B站每日等级任务, img-url=https://raw.githubusercontent.com/HuiDoY/Icon/main/mini/Color/bilibili.png, enabled=true

[MITM]
hostname = app.bilibili.com
*/

const $ = new Env("bilibili扫码");
const STORE_KEY = "bilibili_daily_bonus"; // 与每日任务共用的存储键
const PENDING_KEY = "bilibili_qr_pending"; // 待确认二维码
const QR_TTL = 5 * 60 * 1000; // 二维码有效期5分钟

const string2object = cookie => {
    let obj = {};
    cookie.split("; ").forEach(val => {
        const array = val.split("=");
        obj[array[0]] = array[1];
    });
    return obj;
};

const generateSign = body => md5(
    $.queryStr(Object.fromEntries(new Map(Array.from(Object.entries(body)).sort())))
    + 'c2ed53a74eeefe3cf99fbd01d8c9c375'
);

!(async () => {
    if ("object" === typeof $response) {
        await genQr();          // 段1: 重写-响应 → 生成二维码并推送
    } else if ("object" === typeof $request) {
        await pollQrOnce();     // 段2: 重写-请求 → APP流量驱动轮询(秒级)
    } else {
        await pollQrLoop();     // 段3: 定时任务 → 兜底轮询(每分钟)
    }
})()
    .catch((e) => $.logErr(e))
    .finally(() => $.done());

// ===== 段1: 生成二维码(重写触发, 必须1秒内结束) =====
async function genQr() {
    const now = Date.now();
    const old = $.getItem(PENDING_KEY, null);
    if (old && old.ts && now - old.ts < 10000) return $.log("- Blocked: interval <10s"); // 防连发

    const body = {
        appkey: "27eb53fc9058f8c3",
        local_id: 0,
        ts: $.getTimestamp(),
        mobi_app: 'iphone'
    };
    body.sign = generateSign(body);
    const resp = await $.fetch({
        url: "https://passport.bilibili.com/x/passport-tv-login/qrcode/auth_code",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: $.queryStr(body)
    });
    const json = $.toObj(resp.body);
    if (json.code === 0 && (json.message === "OK" || json.message === "0")) {
        const auth_code = json.data.auth_code;
        const media_url = `https://tool.lu/qrcode/basic.html?text=${encodeURIComponent("https://passport.bilibili.com/x/passport-tv-login/h5/qrcode/auth?auth_code=" + auth_code + "&mobi_app=iphone")}`;
        $.setItem(PENDING_KEY, $.toStr({ auth_code, ts: Date.now() }));
        $.msg("bilibili扫码", "使用客户端扫描以下二维码", "请5分钟内完成扫码,长按推送可放大二维码", { 'open-url': media_url, 'media-url': media_url });
        $.log("- 二维码已生成, 等待扫码确认");
    } else {
        $.msg("bilibili扫码", "- 获取二维码失败", $.toStr(json));
    }
}

// ===== 段2: APP流量驱动轮询(重写触发, 每次只轮询一次, ~0.3s, 不碰10s超时) =====
async function pollQrOnce() {
    const pending = $.getItem(PENDING_KEY, null);
    if (!pending || !pending.auth_code) return $.log("- 无待确认的扫码任务");
    if (Date.now() - pending.ts > QR_TTL) {
        $.setItem(PENDING_KEY, "");
        return $.msg("bilibili扫码", "- 二维码已过期", "请重新打开B站APP获取新二维码");
    }
    if (await tryConfirm(pending.auth_code)) {
        $.setItem(PENDING_KEY, "");
        return $.msg("bilibili扫码", "✅ 扫码确认成功", "cookie已写入, 每日任务将自动运行");
    }
}

// ===== 段3: 定时任务兜底(每分钟触发, 每5秒轮询一次, 共3次/轮) =====
async function pollQrLoop() {
    const pending = $.getItem(PENDING_KEY, null);
    if (!pending || !pending.auth_code) return $.log("- 无待确认的扫码任务");

    for (let i = 0; i < 3; i++) {
        if (Date.now() - pending.ts > QR_TTL) {
            $.setItem(PENDING_KEY, "");
            return $.msg("bilibili扫码", "- 二维码已过期", "请重新打开B站APP获取新二维码");
        }
        if (await tryConfirm(pending.auth_code)) {
            $.setItem(PENDING_KEY, "");
            return $.msg("bilibili扫码", "✅ 扫码确认成功", "cookie已写入, 每日任务将自动运行");
        }
        await $.wait(5000);
    }
    $.log("- 本轮兜底轮询未确认");
}

async function tryConfirm(auth_code) {
    const body = {
        appkey: "27eb53fc9058f8c3",
        auth_code,
        local_id: 0,
        ts: $.getTimestamp()
    };
    body.sign = generateSign(body);
    const resp = await $.fetch({
        url: "https://passport.bilibili.com/x/passport-tv-login/qrcode/poll",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: $.queryStr(body)
    });
    const json = $.toObj(resp.body);
    if (json.code === 0 && (json.message === "OK" || json.message === "0")) {
        const cookieStr = json.data.cookie_info.cookies.map(c => `${c.name}=${c.value}`).join('; ');
        const store = $.getItem(STORE_KEY, {}) || {};
        store.cookie = string2object(cookieStr);
        store.cookieStr = cookieStr;
        store.key = json.data.access_token;
        ['user', 'watch', 'share', 'coins'].forEach(k => store[k] = store[k] || {});
        $.setItem(STORE_KEY, $.toStr(store));
        $.log("- 确认登录成功, cookie已写入 " + STORE_KEY);
        return true;
    }
    switch (json.code) {
        case 86038: $.log("- 二维码已失效"); break;
        case 86039: $.log("- 等待扫码..."); break;
        case 86090: $.log("- 已扫码, 等待确认..."); break;
        default: $.log("- 轮询返回: " + $.toStr(json)); break;
    }
    return false;
}

// md5(32位) - 与 BiliBiliDailyBonus.js 一致
function md5(r) {
    function n(r, n) { return r << n | r >>> 32 - n }
    function t(r, n) { var t, o, e, u, f; return e = 2147483648 & r, u = 2147483648 & n, t = 1073741824 & r, o = 1073741824 & n, f = (1073741823 & r) + (1073741823 & n), t & o ? 2147483648 ^ f ^ e ^ u : t | o ? 1073741824 & f ? 3221225472 ^ f ^ e ^ u : 1073741824 ^ f ^ e ^ u : f ^ e ^ u }
    function o(r, n, t) { return r & n | ~r & t }
    function e(r, n, t) { return r & t | n & ~t }
    function u(r, n, t) { return r ^ n ^ t }
    function f(r, n, t) { return n ^ (r | ~t) }
    function i(r, e, u, f, i, a, c) { return r = t(r, t(t(o(e, u, f), i), c)), t(n(r, a), e) }
    function a(r, o, u, f, i, a, c) { return r = t(r, t(t(e(o, u, f), i), c)), t(n(r, a), o) }
    function c(r, o, e, f, i, a, c) { return r = t(r, t(t(u(o, e, f), i), c)), t(n(r, a), o) }
    function C(r, o, e, u, i, a, c) { return r = t(r, t(t(f(o, e, u), i), c)), t(n(r, a), o) }
    function g(r) { for (var n, t = r.length, o = t + 8, e = (o - o % 64) / 64, u = 16 * (e + 1), f = Array(u - 1), i = 0, a = 0; a < t;) n = (a - a % 4) / 4, i = a % 4 * 8, f[n] = f[n] | r.charCodeAt(a) << i, a++; return n = (a - a % 4) / 4, i = a % 4 * 8, f[n] = f[n] | 128 << i, f[u - 2] = t << 3, f[u - 1] = t >>> 29, f }
    function h(r) { var n, t, o = "", e = ""; for (t = 0; t <= 3; t++) n = r >>> 8 * t & 255, e = "0" + n.toString(16), o += e.slice(-2); return o }
    function d(r) { r = r.replace(/\r\n/g, "\n"); for (var n = "", t = 0; t < r.length; t++) { var o = r.charCodeAt(t); o < 128 ? n += String.fromCharCode(o) : o > 127 && o < 2048 ? (n += String.fromCharCode(o >> 6 | 192), n += String.fromCharCode(63 & o | 128)) : (n += String.fromCharCode(o >> 12 | 224), n += String.fromCharCode(o >> 6 & 63 | 128), n += String.fromCharCode(63 & o | 128)) } return n }
    var m, S, v, l, A, s, y, p, w, L = Array(), b = 7, j = 12, k = 17, q = 22, x = 5, z = 9, B = 14, D = 20, E = 4, F = 11, G = 16, H = 23, I = 6, J = 10, K = 15, M = 21;
    for (r = d(r), L = g(r), s = 1732584193, y = 4023233417, p = 2562383102, w = 271733878, m = 0; m < L.length; m += 16) S = s, v = y, l = p, A = w, s = i(s, y, p, w, L[m + 0], b, 3614090360), w = i(w, s, y, p, L[m + 1], j, 3905402710), p = i(p, w, s, y, L[m + 2], k, 606105819), y = i(y, p, w, s, L[m + 3], q, 3250441966), s = i(s, y, p, w, L[m + 4], b, 4118548399), w = i(w, s, y, p, L[m + 5], j, 1200080426), p = i(p, w, s, y, L[m + 6], k, 2821735955), y = i(y, p, w, s, L[m + 7], q, 4249261313), s = i(s, y, p, w, L[m + 8], b, 1770035416), w = i(w, s, y, p, L[m + 9], j, 2336552879), p = i(p, w, s, y, L[m + 10], k, 4294925233), y = i(y, p, w, s, L[m + 11], q, 2304563134), s = i(s, y, p, w, L[m + 12], b, 1804603682), w = i(w, s, y, p, L[m + 13], j, 4254626195), p = i(p, w, s, y, L[m + 14], k, 2792965006), y = i(y, p, w, s, L[m + 15], q, 1236535329), s = a(s, y, p, w, L[m + 1], x, 4129170786), w = a(w, s, y, p, L[m + 6], z, 3225465664), p = a(p, w, s, y, L[m + 11], B, 643717713), y = a(y, p, w, s, L[m + 0], D, 3921069994), s = a(s, y, p, w, L[m + 5], x, 3593408605), w = a(w, s, y, p, L[m + 10], z, 38016083), p = a(p, w, s, y, L[m + 15], B, 3634488961), y = a(y, p, w, s, L[m + 4], D, 3889429448), s = a(s, y, p, w, L[m + 9], x, 568446438), w = a(w, s, y, p, L[m + 14], z, 3275163606), p = a(p, w, s, y, L[m + 3], B, 4107603335), y = a(y, p, w, s, L[m + 8], D, 1163531501), s = a(s, y, p, w, L[m + 13], x, 2850285829), w = a(w, s, y, p, L[m + 2], z, 4243563512), p = a(p, w, s, y, L[m + 7], B, 1735328473), y = a(y, p, w, s, L[m + 12], D, 2368359562), s = c(s, y, p, w, L[m + 5], E, 4294588738), w = c(w, s, y, p, L[m + 8], F, 2272392833), p = c(p, w, s, y, L[m + 11], G, 1839030562), y = c(y, p, w, s, L[m + 14], H, 4259657740), s = c(s, y, p, w, L[m + 1], E, 2763975236), w = c(w, s, y, p, L[m + 4], F, 1272893353), p = c(p, w, s, y, L[m + 7], G, 4139469664), y = c(y, p, w, s, L[m + 10], H, 3200236656), s = c(s, y, p, w, L[m + 13], E, 681279174), w = c(w, s, y, p, L[m + 0], F, 3936430074), p = c(p, w, s, y, L[m + 3], G, 3572445317), y = c(y, p, w, s, L[m + 6], H, 76029189), s = c(s, y, p, w, L[m + 9], E, 3654602809), w = c(w, s, y, p, L[m + 12], F, 3873151461), p = c(p, w, s, y, L[m + 15], G, 530742520), y = c(y, p, w, s, L[m + 2], H, 3299628645), s = C(s, y, p, w, L[m + 0], I, 4096336452), w = C(w, s, y, p, L[m + 7], J, 1126891415), p = C(p, w, s, y, L[m + 14], K, 2878612391), y = C(y, p, w, s, L[m + 5], M, 4237533241), s = C(s, y, p, w, L[m + 12], I, 1700485571), w = C(w, s, y, p, L[m + 3], J, 2399980690), p = C(p, w, s, y, L[m + 10], K, 4293915773), y = C(y, p, w, s, L[m + 1], M, 2240044497), s = C(s, y, p, w, L[m + 8], I, 1873313359), w = C(w, s, y, p, L[m + 15], J, 4264355552), p = C(p, w, s, y, L[m + 6], K, 2734768916), y = C(y, p, w, s, L[m + 13], M, 1309151649), s = C(s, y, p, w, L[m + 4], I, 4149444226), w = C(w, s, y, p, L[m + 11], J, 3174756917), p = C(p, w, s, y, L[m + 2], K, 718787259), y = C(y, p, w, s, L[m + 9], M, 3951481745), s = t(s, S), y = t(y, v), p = t(p, l), w = t(w, A);
    return (h(s) + h(y) + h(p) + h(w)).toLowerCase()
}
function Env(e,t){return new class{constructor(e,t){this.name=e,this.version="1.7.5",this.data=null,this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,t),this.log("",`🔔${this.name}, 开始!`)}platform(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":"undefined"!=typeof Egern?"Egern":void 0}isQuanX(){return"Quantumult X"===this.platform()}isSurge(){return"Surge"===this.platform()}isLoon(){return"Loon"===this.platform()}isShadowrocket(){return"Shadowrocket"===this.platform()}isStash(){return"Stash"===this.platform()}isEgern(){return"Egern"===this.platform()}toObj(e,t=null){try{return JSON.parse(e)}catch{return t}}toStr(e,t=null){try{return JSON.stringify(e)}catch{return t}}lodash_get(e={},t="",s){Array.isArray(t)||(t=this.toPath(t));const a=t.reduce(((e,t)=>Object(e)[t]),e);return void 0===a?s:a}lodash_set(e={},t="",s){return Array.isArray(t)||(t=this.toPath(t)),t.slice(0,-1).reduce(((e,s,a)=>Object(e[s])===e[s]?e[s]:e[s]=/^\d+$/.test(t[a+1])?[]:{}),e)[t[t.length-1]]=s,e}toPath(e){return e.replace(/\[(\d+)\]/g,".$1").split(".").filter(Boolean)}getItem(e=new String,t=null){let s=t;switch(e.startsWith("@")){case!0:const{key:t,path:a}=e.match(/^@(?<key>[^.]+)(?:\.(?<path>.*))?$/)?.groups;e=t;let o=this.getItem(e,{});"object"!=typeof o&&(o={}),s=this.lodash_get(o,a);try{s=JSON.parse(s)}catch(e){}break;default:switch(this.platform()){case"Surge":case"Loon":case"Stash":case"Egern":case"Shadowrocket":s=$persistentStore.read(e);break;case"Quantumult X":s=$prefs.valueForKey(e);break;default:s=this.data?.[e]||null;break}try{s=JSON.parse(s)}catch(e){}break}return s??t}setItem(e=new String,t=new String){let s=!1;switch(typeof t){case"object":t=JSON.stringify(t);break;default:t=String(t);break}switch(e.startsWith("@")){case!0:const{key:a,path:o}=e.match(/^@(?<key>[^.]+)(?:\.(?<path>.*))?$/)?.groups;e=a;let r=this.getItem(e,{});"object"!=typeof r&&(r={}),this.lodash_set(r,o,t),s=this.setItem(e,r);break;default:switch(this.platform()){case"Surge":case"Loon":case"Stash":case"Egern":case"Shadowrocket":s=$persistentStore.write(t,e);break;case"Quantumult X":s=$prefs.setValueForKey(t,e);break;default:s=this.data?.[e]||null;break}break}return s}async fetch(e={}||"",t={}){switch(e.constructor){case Object:e={...e,...t};break;case String:e={url:e,...t};break}e.method||(e.method=e.body??e.bodyBytes?"POST":"GET"),e.headers?.Host,e.headers?.[":authority"],e.headers?.["Content-Length"],e.headers?.["content-length"];const s=e.method.toLocaleLowerCase();switch(this.platform()){case"Loon":case"Surge":case"Stash":case"Egern":case"Shadowrocket":default:return e.policy&&(this.isLoon()&&(e.node=e.policy),this.isStash()&&this.lodash_set(e,"headers.X-Stash-Selected-Proxy",encodeURI(e.policy))),e.followRedirect&&((this.isSurge()||this.isLoon())&&(e["auto-redirect"]=!1),this.isQuanX()&&(e.opts?e.opts.redirection=!1:e.opts={redirection:!1})),e.bodyBytes&&!e.body&&(e.body=e.bodyBytes,delete e.bodyBytes),await new Promise(((t,a)=>{$httpClient[s](e,((s,o,r)=>{s?a(s):(o.ok=/^2\d\d$/.test(o.status),o.statusCode=o.status,r&&(o.body=r,1==e["binary-mode"]&&(o.bodyBytes=r)),t(o))}))}));case"Quantumult X":return e.policy&&this.lodash_set(e,"opts.policy",e.policy),"boolean"==typeof e["auto-redirect"]&&this.lodash_set(e,"opts.redirection",e["auto-redirect"]),e.body instanceof ArrayBuffer?(e.bodyBytes=e.body,delete e.body):ArrayBuffer.isView(e.body)?(e.bodyBytes=e.body.buffer.slice(e.body.byteOffset,e.body.byteLength+e.body.byteOffset),delete object.body):e.body&&delete e.bodyBytes,await $task.fetch(e).then((e=>(e.ok=/^2\d\d$/.test(e.statusCode),e.status=e.statusCode,e)),(e=>Promise.reject(e.error)))}}time(e,t=null){const s=t?new Date(t):new Date;let a={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(e)&&(e=e.replace(RegExp.$1,(s.getFullYear()+"").slice(4-RegExp.$1.length)));for(let t in a)new RegExp("("+t+")").test(e)&&(e=e.replace(RegExp.$1,1==RegExp.$1.length?a[t]:("00"+a[t]).slice((""+a[t]).length)));return e}getBaseURL(e){return e.replace(/[?#].*$/,"")}isAbsoluteURL(e){return/^[a-z][a-z0-9+.-]*:/.test(e)}getURLParameters(e){return(e.match(/([^?=&]+)(=([^&]*))/g)||[]).reduce(((e,t)=>(e[t.slice(0,t.indexOf("="))]=t.slice(t.indexOf("=")+1),e)),{})}getTimestamp(e=new Date){return Math.floor(e.getTime()/1e3)}queryStr(e){let t=[];for(let s in e)e.hasOwnProperty(s)&&t.push(`${s}=${e[s]}`);return t.join("&")}queryObj(e){let t={},s=e.split("&");for(let e of s){let s=e.split("="),a=s[0],o=s[1]||"";a&&(t[a]=o)}return t}msg(e=this.name,t="",s="",a={}){const o=e=>{const{$open:t,$copy:s,$media:a,$mediaMime:o}=e;switch(typeof e){case void 0:return e;case"string":switch(this.platform()){case"Surge":case"Stash":case"Egern":default:return{url:e};case"Loon":case"Shadowrocket":return e;case"Quantumult X":return{"open-url":e}}case"object":switch(this.platform()){case"Surge":case"Stash":case"Egern":case"Shadowrocket":default:{const r={};let i=e.openUrl||e.url||e["open-url"]||t;i&&Object.assign(r,{action:"open-url",url:i});let n=e["update-pasteboard"]||e.updatePasteboard||s;n&&Object.assign(r,{action:"clipboard",text:n});let l=e.mediaUrl||e["media-url"]||a;if(l){let e,t;if(l.startsWith("http"));else if(l.startsWith("data:")){const[s]=l.split(";"),[,a]=l.split(",");e=a,t=s.replace("data:","")}else{e=l,t=(e=>{const t={JVBERi0:"application/pdf",R0lGODdh:"image/gif",R0lGODlh:"image/gif",iVBORw0KGgo:"image/png","/9j/":"image/jpg"};for(var s in t)if(0===e.indexOf(s))return t[s];return null})(l)}Object.assign(r,{"media-url":l,"media-base64":e,"media-base64-mime":o??t})}return Object.assign(r,{"auto-dismiss":e["auto-dismiss"],sound:e.sound}),r}case"Loon":{const o={};let r=e.openUrl||e.url||e["open-url"]||t;r&&Object.assign(o,{openUrl:r});let i=e.mediaUrl||e["media-url"]||a;i&&Object.assign(o,{mediaUrl:i});let n=e["update-pasteboard"]||e.updatePasteboard||s;return n&&Object.assign(o,{clipboard:n}),o}case"Quantumult X":{const o={};let r=e["open-url"]||e.url||e.openUrl||t;r&&Object.assign(o,{"open-url":r});let i=e.mediaUrl||e["media-url"]||a;i&&Object.assign(o,{"media-url":i});let n=e["update-pasteboard"]||e.updatePasteboard||s;return n&&Object.assign(o,{"update-pasteboard":n}),o}}default:return}};if(!this.isMute)switch(this.platform()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,t,s,o(a));break;case"Quantumult X":$notify(e,t,s,o(a));break}}log(...e){e.length>0&&(this.logs=[...this.logs,...e]),console.log(e.join(this.logSeparator))}logErr(e,t){switch(this.platform()){case"Surge":case"Loon":case"Stash":case"Egern":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,e,t);break}}wait(e){return new Promise((t=>setTimeout(t,e)))}done(e={}){const t=((new Date).getTime()-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${t} 秒`),this.platform()){case"Surge":e.policy&&this.lodash_set(e,"headers.X-Surge-Policy",e.policy),$done(e);break;case"Loon":e.policy&&(e.node=e.policy),$done(e);break;case"Stash":e.policy&&this.lodash_set(e,"headers.X-Stash-Selected-Proxy",encodeURI(e.policy)),$done(e);break;case"Egern":$done(e);break;case"Shadowrocket":default:$done(e);break;case"Quantumult X":e.policy&&this.lodash_set(e,"opts.policy",e.policy),delete e["auto-redirect"],delete e["auto-cookie"],delete e["binary-mode"],delete e.charset,delete e.host,delete e.insecure,delete e.method,delete e.opt,delete e.path,delete e.policy,delete e["policy-descriptor"],delete e.scheme,delete e.sessionIndex,delete e.statusCode,delete e.timeout,e.body instanceof ArrayBuffer?(e.bodyBytes=e.body,delete e.body):ArrayBuffer.isView(e.body)?(e.bodyBytes=e.body.buffer.slice(e.body.byteOffset,e.body.byteLength+e.body.byteOffset),delete e.body):e.body&&delete e.bodyBytes,$done(e);break}}}(e,t)}
