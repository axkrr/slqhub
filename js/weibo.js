/**
 * 微博每日签到 —— Surge 兼容修复版（基于 fmz200/wool_scripts/Scripts/weibo/weibo_signin.js）
 *
 * 使用前先在 Surge 里确认两件事：
 *
 *  [Script]
 *  # ① 抓 token（type=http-request，必须开 MITM，否则这条永远不触发，存储里就没有 fmz200_weibo_token）
 *  微博-获取cookie = type=http-request, pattern=^https:\/\/m?api\.weibo\.c(n|om)\/\d\/users\/show, script-path=https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/cookie/get_cookie.js, timeout=60
 *  # ② 每日签到（timeout 一定要写！Surge 的脚本默认超时只有 5 秒）
 *  微博每日签到 = type=cron, cronexp="0 8 * * *", script-path=<本文件路径或 URL>, wake-system=true, timeout=60
 *
 *  [MITM]
 *  hostname = %APPEND% api.weibo.cn
 *
 * 相对原版的改动（都是为了排查/规避「Egern 正常、Surge 直接返回 result null」）：
 *  1. !cache 分支补上 return。原版 `if (!cache) { $.msg(); $.done(); }` 没有 return，
 *     接着会 JSON.parse(null) -> null，然后 `for (const item of null)` 抛 TypeError。
 *     脚本一抛异常，Surge 会立刻中止本次运行（uncaught exception aborts the session），
 *     在运行结果里就是「什么都没做 / result null」。这是最容易在 Surge 复现的一条。
 *  2. 每个请求显式带 timeout。Surge 的 $httpClient 默认只有 5 秒；cron 脚本整体默认也只有 5 秒。
 *  3. 签到 URL 不再做 decode -> 重新拼接。原版 parseUrlParams 会 decodeURIComponent，
 *     把 s/gsid 里的 %2B 变成 +、%26 变成 &，重新拼进 URL 就改了签名参数。
 *     现在直接取原 URL 里「仍然带编码」的原始子串，和抓包时一模一样。
 *  4. 不再吞错误：error / 状态码 / 原始 body 全部进日志；失败时通知里带原始返回片段。
 *  5. 签到 POST 失败会自动回退（POST+Cookie -> GET），因为上游几个实现（OreosLab / FoKit）
 *     用的本来就是 GET，回退能一次定位是「方法问题」还是「账号/风控问题」。
 *  6. 开头打印环境自检：运行环境、token 条数、每个账号的 uid 与 header 名（不打印值）。
 */
const $ = new Env("微博签到");

const TOKEN_KEY = "fmz200_weibo_token";
const REQ_TIMEOUT = 30;   // 秒
const UA = "Weibo/52588 (iPhone; iOS 14.5; Scale/3.00)";
const MASK = true;        // 日志里是否打码 s / gsid / Cookie（排查时可改成 false）

function mask(v) { return MASK && v ? `${v.slice(0, 6)}***(${v.length})` : v; }
function cut(s, n) { n = n || 160; return String(s == null ? "" : s).replace(/\s+/g, " ").slice(0, n); }

(async function main() {
  $.log("", `🔔 ${$.name} 开始 · 环境=${$.getEnv()} · 单请求超时=${REQ_TIMEOUT}s`);

  const raw = $.getdata(TOKEN_KEY);
  if (!raw) {
    // 注意：$persistentStore 是「按 App 隔离」的，Egern 里抓到的 token Surge 读不到，反之亦然
    $.msg($.name, "❌ 读不到 " + TOKEN_KEY,
      "当前 App 的持久化存储里没有这个变量。Surge 与 Egern 的存储互不相通，必须在当前 App 里重新抓一次（打开微博 -> 我的 触发 users/show）。");
    return $.done();
  }

  let list;
  try {
    list = JSON.parse(raw);
  } catch (e) {
    $.msg($.name, "❌ token 不是合法 JSON", cut(e) + " | " + cut(raw, 80));
    return $.done();
  }
  if (!Array.isArray(list) || list.length === 0) {
    $.msg($.name, "❌ token 结构不是非空数组", "实际：" + cut(raw, 120));
    return $.done();
  }

  $.log(`token: ${list.length} 个账号`);
  for (const item of list) {
    try {
      await handleOne(item);
    } catch (e) {
      $.log(`🔴 账号处理异常：${e && e.stack ? e.stack : e}`);
      $.msg($.name, "❌ 脚本内部异常", cut(e && e.message ? e.message : e, 120));
    }
  }
  $.done();
})();

async function handleOne(item) {
  const uid = item.weibo_id || "未知账号";
  const signUrl = item.signin_url || "";
  const headers = item.headers || {};
  $.log(`[${uid}] header 字段：${Object.keys(headers).join(", ") || "（空）"}`);
  $.log(`[${uid}] signin_url：${signUrl.replace(/s=[^&]*/, "s=" + mask(rawParam(signUrl, "s")))}`);

  if (!signUrl) {
    $.msg($.name, `[${uid}] ❌ 缺少 signin_url`, "重新抓一次 token");
    return;
  }

  // ---------- 1. 用户信息 ----------
  const info = await req("GET", { url: signUrl, headers: clone(headers) });
  $.log(`[${uid}] 用户信息 HTTP ${status(info)} / ${info.ms}ms / err=${info.error || "无"}`);
  $.log(`[${uid}] 用户信息 body=${cut(info.data)}`);
  if (info.error || info.data == null) {
    $.msg($.name, `[${uid}] ❌ 取用户信息失败（连不上/被拦截）`, cut(info.error || "空响应"));
    return;
  }
  let user = null;
  try { user = JSON.parse(info.data); } catch (e) { /* 交给下面报错 */ }
  if (!user || user.errno) {
    $.msg($.name, `[${uid}] ❌ 用户信息异常，请重新抓 token`, cut(info.data));
    return;
  }

  const username = user.name || uid;
  const avatar = user.avatar_hd || user.avatar_large || user.profile_image_url || "";

  // ---------- 2. 每日签到 ----------
  // 关键：s / gsid / from / uid 直接取原 URL 的原始子串（保留编码），不 decode
  const token = ["from", "uid", "s", "gsid"].map((k) => `${k}=${rawParam(signUrl, k)}`).join("&");
  const url = `https://api.weibo.cn/2/checkin/add?c=iphone&${token}`;
  $.log(`[${uid}] 签到 URL：${url.replace(/s=[^&]*/, "s=" + mask(rawParam(signUrl, "s"))).replace(/gsid=[^&]*/, "gsid=" + mask(rawParam(signUrl, "gsid")))}`);

  const cookie = headers.Cookie || headers.cookie || "";
  const plan = [
    { tag: "POST(仅UA)", method: "POST", headers: { "User-Agent": UA } },
  ];
  if (cookie) plan.push({ tag: "POST(UA+Cookie)", method: "POST", headers: { "User-Agent": UA, Cookie: cookie } });
  plan.push({ tag: "GET(仅UA)", method: "GET", headers: { "User-Agent": UA } });

  let text = "";
  for (const step of plan) {
    const r = await req(step.method, { url, headers: step.headers });
    $.log(`[${uid}] ${step.tag} -> HTTP ${status(r)} / ${r.ms}ms / err=${r.error || "无"}`);
    $.log(`[${uid}] ${step.tag} body=${cut(r.data)}`);
    if (r.error || r.data == null || r.data === "") {
      text = `签到请求失败：${r.error || "空响应"}`;
      continue;
    }
    const t = parseSign(r.data);
    if (t.ok) { text = t.msg; break; }
    text = t.msg;
    if (t.final) break;          // 明确的业务错误（比如风控），不用再换姿势
  }

  $.msg($.name, `[${username}]本次运行结果：${text}`, "", avatar ? { "media-url": avatar } : {});
}

// ---------- 工具 ----------

// 从原始 URL 的 query 里按名取「未解码」的原始值
function rawParam(url, name) {
  const q = String(url).indexOf("?");
  if (q < 0) return "";
  const query = String(url).slice(q + 1).split("#")[0];
  for (const pair of query.split("&")) {
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    if (pair.slice(0, eq) === name) return pair.slice(eq + 1);
  }
  return "";
}

function parseSign(body) {
  let j;
  try {
    j = JSON.parse(body);
  } catch (e) {
    return { ok: false, final: false, msg: `返回不是 JSON：${cut(body, 100)}` };
  }
  if (!j || typeof j !== "object") return { ok: false, final: false, msg: `返回异常：${cut(body, 100)}` };
  if (j.status === 10000 || j.errno === 0) {
    const d = j.data || {};
    const pts = d.title_style && d.title_style.length ? d.title_style[0] : (d.desc || "");
    return { ok: true, final: true, msg: `连续签到[${d.continuous != null ? d.continuous : "?"}]天，本次收益[${pts}]积分` };
  }
  if (j.errno === 30000) return { ok: true, final: true, msg: j.errmsg || "今天已签到" };
  // 其它情况：把原始信息带出来，方便判断是签名/登录态问题还是风控
  const why = j.errmsg || j.msg || JSON.stringify(j);
  return { ok: false, final: false, msg: `签到未成功：${cut(why, 100)}` };
}

function req(method, opts) {
  const o = clone(opts);
  o.timeout = REQ_TIMEOUT;   // Surge $httpClient 默认 5s，必须显式给
  return new Promise((resolve) => {
    const t0 = Date.now();
    const cb = (error, response, data) =>
      resolve({ error, response, data, status: response && (response.status || response.statusCode), ms: Date.now() - t0 });
    try {
      if (method === "GET") $.get(o, cb);
      else $.post(o, cb);
    } catch (e) {
      resolve({ error: e, ms: Date.now() - t0 });
    }
  });
}

function status(r) { return (r && r.status) || "?"; }
function clone(o) { return Object.assign({}, o || {}); }

////////////////////////////////
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;"POST"===e&&(s=this.post);const i=new Promise(((e,i)=>{s.call(this,t,((t,s,o)=>{t?i(t):e(s)}))}));return t.timeout?((t,e=1e3)=>Promise.race([t,new Promise(((t,s)=>{setTimeout((()=>{s(new Error("请求超时"))}),e)}))]))(i,t.timeout):i}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.logLevels={debug:0,info:1,warn:2,error:3},this.logLevelPrefixs={debug:"[DEBUG] ",info:"[INFO] ",warn:"[WARN] ",error:"[ERROR] "},this.logLevel="info",this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null,...s){try{return JSON.stringify(t,...s)}catch{return e}}getjson(t,e){let s=e;if(this.getdata(t))try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise((e=>{this.get({url:t},((t,s,i)=>e(i)))}))}runScript(t,e){return new Promise((s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let o=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");o=o?1*o:20,o=e&&e.timeout?e.timeout:o;const[r,a]=i.split("@"),n={url:`http://${a}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:o},headers:{"X-Key":r,Accept:"*/*"},policy:"DIRECT",timeout:o};this.post(n,((t,e,i)=>s(i)))})).catch((t=>this.logErr(t)))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),o=JSON.stringify(this.data);s?this.fs.writeFileSync(t,o):i?this.fs.writeFileSync(e,o):this.fs.writeFileSync(t,o)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let o=t;for(const t of i)if(o=Object(o)[t],void 0===o)return s;return o}lodash_set(t,e,s){return Object(t)!==t||(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce(((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{}),t)[e[e.length-1]]=s),t}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),o=s?this.getval(s):"";if(o)try{const t=JSON.parse(o);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(e),r=this.getval(i),a=i?"null"===r?null:r||"{}":"{}";try{const e=JSON.parse(a);this.lodash_set(e,o,t),s=this.setval(JSON.stringify(e),i)}catch(e){const r={};this.lodash_set(r,o,t),s=this.setval(JSON.stringify(r),i)}}else s=this.setval(t,e);return s}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.cookie&&void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar)))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),void 0===t.followRedirect||t.followRedirect||((this.isSurge()||this.isLoon())&&(t["auto-redirect"]=!1),this.isQuanX()&&(t.opts?t.opts.redirection=!1:t.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,((t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)}));break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then((t=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=t;e(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)}),(t=>e(t&&t.error||"UndefinedError")));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",((t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}})).then((t=>{const{statusCode:i,statusCode:o,headers:r,rawBody:a}=t,n=s.decode(a,this.encoding);e(null,{status:i,statusCode:o,headers:r,rawBody:a,body:n},n)}),(t=>{const{message:i,response:o}=t;e(i,o,o&&s.decode(o.rawBody,this.encoding))}));break}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),void 0===t.followRedirect||t.followRedirect||((this.isSurge()||this.isLoon())&&(t["auto-redirect"]=!1),this.isQuanX()&&(t.opts?t.opts.redirection=!1:t.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,((t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)}));break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then((t=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=t;e(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)}),(t=>e(t&&t.error||"UndefinedError")));break;case"Node.js":let i=require("iconv-lite");this.initGotEnv(t);const{url:o,...r}=t;this.got[s](o,r).then((t=>{const{statusCode:s,statusCode:o,headers:r,rawBody:a}=t,n=i.decode(a,this.encoding);e(null,{status:s,statusCode:o,headers:r,rawBody:a,body:n},n)}),(t=>{const{message:s,response:o}=t;e(s,o,o&&i.decode(o.rawBody,this.encoding))}));break}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}queryStr(t){let e="";for(const s in t){let i=t[s];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),e+=`${s}=${i}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",i="",o={}){const r=t=>{const{$open:e,$copy:s,$media:i,$mediaMime:o}=t;switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{const r={};let a=t.openUrl||t.url||t["open-url"]||e;a&&Object.assign(r,{action:"open-url",url:a});let n=t["update-pasteboard"]||t.updatePasteboard||s;if(n&&Object.assign(r,{action:"clipboard",text:n}),i){let t,e,s;if(i.startsWith("http"))t=i;else if(i.startsWith("data:")){const[t]=i.split(";"),[,o]=i.split(",");e=o,s=t.replace("data:","")}else{e=i,s=(t=>{const e={JVBERi0:"application/pdf",R0lGODdh:"image/gif",R0lGODlh:"image/gif",iVBORw0KGgo:"image/png","/9j/":"image/jpg"};for(var s in e)if(0===t.indexOf(s))return e[s];return null})(i)}Object.assign(r,{"media-url":t,"media-base64":e,"media-base64-mime":o??s})}return Object.assign(r,{"auto-dismiss":t["auto-dismiss"],sound:t.sound}),r}case"Loon":{const s={};let o=t.openUrl||t.url||t["open-url"]||e;o&&Object.assign(s,{openUrl:o});let r=t.mediaUrl||t["media-url"];return i?.startsWith("http")&&(r=i),r&&Object.assign(s,{mediaUrl:r}),console.log(JSON.stringify(s)),s}case"Quantumult X":{const o={};let r=t["open-url"]||t.url||t.openUrl||e;r&&Object.assign(o,{"open-url":r});let a=t["media-url"]||t.mediaUrl;i?.startsWith("http")&&(a=i),a&&Object.assign(o,{"media-url":a});let n=t["update-pasteboard"]||t.updatePasteboard||s;return n&&Object.assign(o,{"update-pasteboard":n}),console.log(JSON.stringify(o)),o}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,i,r(o));break;case"Quantumult X":$notify(e,s,i,r(o));break;case"Node.js":break}if(!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}debug(...t){this.logLevels[this.logLevel]<=this.logLevels.debug&&(t.length>0&&(this.logs=[...this.logs,...t]),console.log(`${this.logLevelPrefixs.debug}${t.map((t=>t??String(t))).join(this.logSeparator)}`))}info(...t){this.logLevels[this.logLevel]<=this.logLevels.info&&(t.length>0&&(this.logs=[...this.logs,...t]),console.log(`${this.logLevelPrefixs.info}${t.map((t=>t??String(t))).join(this.logSeparator)}`))}warn(...t){this.logLevels[this.logLevel]<=this.logLevels.warn&&(t.length>0&&(this.logs=[...this.logs,...t]),console.log(`${this.logLevelPrefixs.warn}${t.map((t=>t??String(t))).join(this.logSeparator)}`))}error(...t){this.logLevels[this.logLevel]<=this.logLevels.error&&(t.length>0&&(this.logs=[...this.logs,...t]),console.log(`${this.logLevelPrefixs.error}${t.map((t=>t??String(t))).join(this.logSeparator)}`))}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.map((t=>t??String(t))).join(this.logSeparator))}logErr(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,e,t);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,e,void 0!==t.message?t.message:t,t.stack);break}}wait(t){return new Promise((e=>setTimeout(e,t)))}done(t={}){const e=((new Date).getTime()-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${e} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)}
////////////////////////////////
