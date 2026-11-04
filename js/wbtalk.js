/**********
 微博超话签到修改版
 适配新版微博客户端 (16.x+)
 更新时间：2026-09-08

⚠️ 若从旧版升级，请先在BoxJS或代理工具中清空旧cookie（wb_delete_cookie=true），再重新获取。
⚠️ 新版列表请求为POST，必须配置 requires-body=true（QX用script-request-body），否则无法捕获POST body。

🐬作者
@Evilbutcher。 https://github.com/evilbutcher
@toulanboy。https://github.com/toulanboy/scripts
@fmz200 重构代码，支持多账号和青龙环境

📌不定期更新各种签到、有趣的脚本，欢迎star🌟

***********************************
【配置步骤，请认真阅读，每一个细节都很重要】
***********************************
1. 根据你当前的软件，配置好script。由于是远程文件，记得顺便更新文件。
2. 打开微博APP --> 底部栏"我的" --> 中间的"超话社区" --> 底部栏"我的" --> "关注"，弹出通知，提示获取已关注超话列表成功。
3. 点进一个超话页面，手动签到一次。弹出通知，提示获取超话签到链接成功。 若之前所有已经签到，请关注一个新超话进行签到。
4. 回到quanx等软件，关掉获取cookie的rewrite。（loon是关掉获取cookie的脚本）

📌 配置第2个账号方法：第1个账号获取cookie结束后。在微博app中切换到第2个号，进行相同的获取逻辑。

***************************************
【boxjs 订阅， 用于修改脚本配置】
***************************************
box订阅链接：https://raw.githubusercontent.com/toulanboy/scripts/master/toulanboy.boxjs.json
订阅后，可以在box里面进行 cookie清空、通知个数、签到延迟 等设置.

*************************
【Surge 4.2+ 脚本配置】
*************************
微博超话cookie获取 = type=http-request,pattern=^https?://m?api\.weibo\.c(n|om)\/2\/(flowlist|page\/button),requires-body=true,script-path=https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/weibo/weibotalk.cookie.js
微博超话 = type=cron,cronexp="5 0  * * *",script-path=https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/weibo/weibotalk_signin.js,wake-system=true,timeout=600

*************************
【Loon 2.1+ 脚本配置】
*************************
[script]
cron "5 0 * * *" script-path=https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/weibo/weibotalk_signin.js, timeout=600, tag=微博超话
http-request ^https?://m?api\.weibo\.c(n|om)\/2\/(flowlist|page\/button) script-path=https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/weibo/weibotalk.cookie.js,requires-body=true, tag=微博超话cookie获取

*************************
【 QX 1.0.10+ 脚本配置 】
*************************
[rewrite_local]
^https?://m?api\.weibo\.c(n|om)\/2\/(flowlist|page\/button) url script-request-body https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/weibo/weibotalk.cookie.js
[task]
5 0 * * * https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/weibo/weibotalk_signin.js, tag=微博超话


[MITM]
hostname = api.weibo.cn, mapi.weibo.com

*************************
【Shadowrocket 脚本配置】
*************************
[Script]
微博超话cookie获取 = type=http-request,pattern=^https?://m?api\.weibo\.c(n|om)\/2\/(flowlist|page\/button),requires-body=true,script-path=https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/weibo/weibotalk.cookie.js
微博超话 = type=cron,cronexp="5 0  * * *",script-path=https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/weibo/weibotalk_signin.js,wake-system=true,timeout=600

[MITM]
hostname = api.weibo.cn, mapi.weibo.com

*********/

// 通知美化版：自动昵称/缓存、三类统计、纯文字通知；原签到请求参数不变。
const $ = new Env("微博超话签到");
const isNode = $.isNode();
const notify = isNode ? require('../qinglong/sendNotify') : '';
$.nodeNotifyMsg = [];
$.totals = { success: 0, already: 0, fail: 0 };
const wb_delete_cookie = isNode ? process.env["wb_delete_cookie"] : $.getdata("wb_delete_cookie");
const wb_msg_max_num = isNode ? process.env["wb_msg_max_num"] : $.getdata("wb_msg_max_num");
const wb_request_time = isNode ? process.env["wb_request_time"] : $.getdata("wb_request_time");
const tokenList = isNode ? process.env["fmz200_weibotalk_token"] : $.getdata("fmz200_weibotalk_token");
const REQUEST_TIMEOUT = 15000;
const NICKNAME_CACHE_KEY = 'fmz200_weibotalk_nickname_cache';
const NICKNAME_TTL = 7 * 24 * 60 * 60 * 1000;
const NICKNAME_TIMEOUT = 5000;
$.delete_cookie = String(wb_delete_cookie) === 'true';
$.msg_max_num = Number.isFinite(Number(wb_msg_max_num)) && Number(wb_msg_max_num) >= 1 ? Math.floor(Number(wb_msg_max_num)) : 50;
$.interval_time = wb_request_time * 1 || 3000;

!(async () => {
  if ($.delete_cookie) {
    $.setdata('[]', 'fmz200_weibotalk_token');
    $.setdata('false', 'wb_delete_cookie');
    $.setdata('{}', NICKNAME_CACHE_KEY);
    await sendMsg('✅ 已清空登录信息\n请按原流程重新获取。', {});
    return;
  }
  let tokens;
  try { tokens = JSON.parse(tokenList || '[]'); } catch (_) {
    await sendMsg('⚠️ 登录信息格式错误\n请重新获取微博超话 Cookie。', {});
    return;
  }
  if (!Array.isArray(tokens) || !tokens.length) {
    await sendMsg('⚠️ 尚未获取登录信息\n请先获取微博超话 Cookie。', {});
    return;
  }
  $.nicknameCache = readNicknameCache();
  console.log(`🌟 账号数 = ${tokens.length}`);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    $.currentToken = token;
    $.userId = token && token.userId;
    $.userLabel = savedAccountName(token) || `账号 ${i + 1}`;
    init_env();
    try {
      if (!token || !validateObject(token)) {
        accountNotice('⚠️ 登录信息不完整', '请按原流程重新获取微博超话 Cookie。');
        continue;
      }
      $.userLabel = await resolveAccountName(token, i);
      await get_all_topics();
      console.log(`🌟 get_all_topics 执行完成，共 ${$.name_list.length} 个超话`);
      if (!$.name_list.length) {
        accountNotice('⚠️ 未获取到关注的超话', $.listError || '请检查是否已关注超话，以及登录信息是否有效。');
        continue;
      }
      for (let j = 0; j < $.name_list.length; j++) {
        await checkin($.id_list[j], $.name_list[j]);
        await $.wait($.interval_time);
      }
      output();
    } catch (e) {
      console.log(`❌ 账号执行异常: ${e && e.message ? e.message : e}`);
      accountNotice('⚠️ 本次执行异常', '请查看运行日志，确认网络和登录信息后重试。');
    }
    if (i < tokens.length - 1) await $.wait($.interval_time);
  }
  if (isNode) {
    const t = $.totals;
    const summary = `📊 ${tokens.length} 个账号 · 新签 ${t.success} · 已签 ${t.already} · 失败 ${t.fail}`;
    await sendMsg([summary, ...$.nodeNotifyMsg].join('\n\n'), {});
  }
})().catch(e => {
  $.logErr(e);
}).finally(() => $.done());

function init_env() {
  $.message = [];
  $.name_list = [];
  $.id_list = [];
  $.val_list = [];
  $.seenIds = new Set();
  $.successNum = 0;
  $.alreadyNum = 0;
  $.failNum = 0;
  $.allnumber = 0;
  $.listError = '';
}

function notificationTitle() { return `${$.name} · ${$.userLabel}`; }
function accountNotice(subtitle, body) {
  if (isNode) $.nodeNotifyMsg.push([notificationTitle(), subtitle, body].filter(Boolean).join('\n'));
  else $.msg(notificationTitle(), subtitle, body, {});
}
function output() {
  const summary = `✅ 新签 ${$.successNum}　☑️ 已签 ${$.alreadyNum}　❌ 失败 ${$.failNum}`;
  $.totals.success += $.successNum;
  $.totals.already += $.alreadyNum;
  $.totals.fail += $.failNum;
  const warning = $.listError ? `⚠️ 超话列表可能不完整：${$.listError}` : '';
  if (isNode) {
    $.nodeNotifyMsg.push([notificationTitle(), summary, ...$.message, warning].filter(Boolean).join('\n'));
    return;
  }
  if (!$.message.length) {
    accountNotice(summary, warning || '该账号没有签到结果');
    return;
  }
  const pages = Math.ceil($.message.length / $.msg_max_num);
  for (let page = 0; page < pages; page++) {
    const details = $.message.slice(page * $.msg_max_num, (page + 1) * $.msg_max_num);
    if (warning) details.push(warning);
    const subtitle = summary + (pages > 1 ? ` · 第 ${page + 1}/${pages} 页` : '');
    accountNotice(subtitle, details.join('\n'));
  }
}

function recordResult(name, kind, text) {
  const topic = cleanText(String(name || '').replace(/超话$/, '')) || '未命名超话';
  const icon = kind === 'success' ? '✅' : kind === 'already' ? '☑️' : '❌';
  if (kind === 'success') $.successNum++;
  else if (kind === 'already') $.alreadyNum++;
  else $.failNum++;
  const line = `${icon} ${topic} · ${cleanText(text) || '未知结果'}`;
  $.message.push(line);
  console.log(line);
}
function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 150);
}

// 昵称仅使用微博官方接口；不上传登录信息到第三方，也不改动原 token。
function parseObject(value) {
  try {
    const obj = typeof value === 'string' ? JSON.parse(value) : value;
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  } catch (_) { return {}; }
}
function readNicknameCache() { return parseObject($.getdata(NICKNAME_CACHE_KEY)); }
function savedAccountName(token) {
  if (!token || !/^\d+$/.test(String(token.userId || ''))) return '';
  const direct = cleanText(token.screen_name) || cleanText(token.nickname) || cleanText(token.name);
  if (direct) return direct;
  const cached = $.nicknameCache && $.nicknameCache[String(token.userId)];
  return cached ? cleanText(cached.name) : '';
}
function rawQueryParam(query, key) {
  for (const pair of String(query || '').split('&')) {
    const eq = pair.indexOf('=');
    if (eq >= 0 && pair.slice(0, eq) === key) return pair.slice(eq + 1);
  }
  return '';
}
function queryOf(url) {
  const pos = String(url || '').indexOf('?');
  return pos < 0 ? '' : String(url).slice(pos + 1).split('#')[0];
}
function nicknameRequestOptions(url, headers) {
  const h = Object.assign({}, parseObject(headers));
  for (const key of Object.keys(h)) {
    if (/^(host|content-length|content-type|connection)$/i.test(key)) delete h[key];
  }
  return {
    url, headers: h,
    timeout: (isNode || $.isLoon() || $.isQuanX()) ? NICKNAME_TIMEOUT : NICKNAME_TIMEOUT / 1000,
    followRedirect: false,
    'auto-redirect': false,
    opts: { redirection: false }
  };
}
function buildNicknameRequest(token) {
  const uid = String(token.userId || '');
  if (!/^\d+$/.test(uid)) return null;
  // 如果同一 App 已抓过微博每日签到资料接口，优先复用完整签名 URL。
  try {
    const dailyRaw = isNode ? process.env.fmz200_weibo_token : $.getdata('fmz200_weibo_token');
    const daily = JSON.parse(dailyRaw || '[]');
    if (Array.isArray(daily)) {
      const match = daily.find(item => item && String(item.weibo_id) === uid &&
        /^https:\/\/(api\.weibo\.cn|mapi\.weibo\.com)\/2\/users\/show\?/.test(item.signin_url || ''));
      if (match) return nicknameRequestOptions(match.signin_url, match.headers);
    }
  } catch (_) { /* 每日签到资料不存在或损坏不影响超话签到。 */ }
  // 否则从当前超话抓取数据中取登录参数。保留 %2B/%2F/%3D 等原始编码。
  const candidates = [
    { url: token.tokenUrl, body: token.tokenBody, headers: token.tokenHeaders },
    { url: token.checkinurl, body: '', headers: token.checkinHeaders }
  ];
  for (const candidate of candidates) {
    const host = String(candidate.url || '').match(/^https:\/\/(api\.weibo\.cn|mapi\.weibo\.com)\/2\//);
    if (!host) continue;
    const query = queryOf(candidate.url);
    const get = key => rawQueryParam(query, key) || rawQueryParam(candidate.body, key);
    if (!get('gsid') && !get('s')) continue;
    const pairs = [];
    for (const key of ['c', 'from', 's', 'gsid', 'source', 'aid', 'wm', 'oldwm', 'lang', 'v_f', 'v_p', 'ua']) {
      const value = get(key);
      if (value) pairs.push(`${key}=${value}`);
    }
    if (!get('c')) pairs.unshift('c=iphone');
    pairs.push(`uid=${encodeURIComponent(uid)}`);
    return nicknameRequestOptions(`https://${host[1]}/2/users/show?${pairs.join('&')}`, candidate.headers);
  }
  return null;
}
async function resolveAccountName(token, index) {
  const uid = String(token.userId || '');
  const fallback = savedAccountName(token) || `账号 ${index + 1}`;
  if (!/^\d+$/.test(uid)) return fallback;
  const direct = cleanText(token.screen_name) || cleanText(token.nickname) || cleanText(token.name);
  if (direct) return direct;
  const cached = $.nicknameCache[uid];
  if (cached && cleanText(cached.name) && Date.now() - Number(cached.updatedAt) >= 0 &&
      Date.now() - Number(cached.updatedAt) < NICKNAME_TTL) return cleanText(cached.name);
  try {
    const request = buildNicknameRequest(token);
    if (!request) return fallback;
    const name = await new Promise(resolve => {
      let finished = false;
      let timer;
      function finish(value) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve(value);
      }
      timer = setTimeout(() => finish(''), NICKNAME_TIMEOUT);
      try {
        $.get(request, (error, response, data) => {
          if (finished) return;
          try {
            if (error || !response || Number(response.statusCode || response.status) !== 200) return finish('');
            const user = parseObject(data == null ? response.body : data);
            if (user.errno || user.errcode || user.errmsg || String(user.idstr || user.id || '') !== uid) return finish('');
            finish(cleanText(user.screen_name) || cleanText(user.name));
          } catch (_) { finish(''); }
        });
      } catch (_) { finish(''); }
    });
    if (!name) {
      console.log('ℹ️ 昵称查询未成功，使用缓存名称或账号序号，不影响签到。');
      return fallback;
    }
    $.nicknameCache[uid] = { name, updatedAt: Date.now() };
    try { $.setdata(JSON.stringify($.nicknameCache), NICKNAME_CACHE_KEY); } catch (_) { /* 缓存写入失败不影响本次昵称。 */ }
    return name;
  } catch (_) { return fallback; }
}

// 获取所有关注的超话（新版API: POST /2/flowlist）
async function get_all_topics() {
  let page = 1;
  let sinceId = '';
  let maxId = '';
  let hasMore = true;
  const maxPages = 10; // 安全限制

  while (hasMore && page <= maxPages) {
    let body = $.currentToken.tokenBody;
    if (page > 1) {
      body = modifyBodyForPagination(body, page, sinceId, maxId);
    }
    if (page > 1 && body === $.currentToken.tokenBody) {
      console.log("❌ 分页body未变化，停止获取后续超话列表");
      break;
    }

    console.log(`🌟 获取超话列表，第${page}页`);
    let response = await postRequest($.currentToken.tokenUrl, $.currentToken.tokenHeaders, body);
    if (!response || !response.body) {
      console.log("❌ 获取超话列表失败，无响应");
      $.listError = "获取列表失败，请检查网络后重试";
      break;
    }

    const listStatus = Number(response.statusCode || response.status);
    if (listStatus !== 200) {
      $.listError = listStatus === 418 ? '操作频繁，请稍后再试' :
        listStatus === 511 ? '需要身份验证，请打开微博处理' : '获取列表失败，服务器响应异常';
      break;
    }
    let obj;
    try {
      obj = JSON.parse(response.body);
    } catch (e) {
      console.log("❌ 解析超话列表响应失败");
      $.listError = "列表响应解析失败，请稍后重试";
      break;
    }

    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      $.listError = '列表响应格式异常，请稍后重试';
      break;
    }
    if (obj.errmsg) {
      $.listError = cleanText(obj.errmsg) || '登录信息可能已失效，请重新获取 Cookie';
      break;
    }

    // 从响应中提取 card_type=8 的超话卡片
    let foundCount = extractTopics(obj);
    console.log(`🌟 第${page}页找到 ${foundCount} 个超话`);

    if (foundCount === 0) {
      if (page === 1) {
        console.log("❌ 第1页未找到超话，可能无关注超话或token已过期");
      }
      hasMore = false;
      break;
    }

    // 检查是否有更多页
    let moreInfo = obj.moreInfo || {};
    if (moreInfo.params && moreInfo.params.since_id) {
      // 兼容两种分页机制：
      // - flowlist: 无 page 参数，仅 since_id 递增
      // - container_timeline_topicsub: page + since_id 同时递增
      const nextPage = parseInt(moreInfo.params.page || '0');
      if (nextPage && nextPage !== page) {
        page = nextPage;
      } else {
        page = page + 1;
      }
      sinceId = moreInfo.params.since_id;
      maxId = moreInfo.params.max_id || '';
    } else {
      hasMore = false;
    }
  }

  $.allnumber = $.name_list.length;
  console.log(`🌟 共获取 ${$.allnumber} 个关注超话`);
}

// 从响应中提取超话信息（card_type=8 的卡片）
function extractTopics(obj) {
  let count = 0;
  if (!obj.items) return count;
  if (!$.seenIds) $.seenIds = new Set();

  for (const item of obj.items) {
    if (item.category !== 'group' || !item.items) continue;

    for (const sub of item.items) {
      if (sub.category !== 'card' || !sub.data) continue;
      const data = sub.data;
      if (data.card_type !== 8) continue;

      // 从 scheme 中提取超话ID: sinaweibo://pageinfo?containerid=100808xxx
      let match = (data.scheme || '').match(/containerid=([a-f0-9]+)/);
      if (!match) continue;

      let id = match[1];
      // 去重：同一超话可能在不同分组中重复出现
      if ($.seenIds.has(id)) {
        console.log(`⏭️ 跳过重复超话: ${data.title_sub || id}`);
        continue;
      }
      $.seenIds.add(id);

      let name = data.title_sub || '';
      let desc = data.desc1 || data.desc || '';

      $.name_list.push(name);
      $.id_list.push(id);
      $.val_list.push(desc);
      count++;
      console.log(name, desc, id);
    }
  }
  return count;
}

// 修改POST body用于分页请求
function modifyBodyForPagination(body, page, sinceId, maxId) {
  let pairs = body.split('&');
  let result = [];
  let foundTaskType = false;
  let addedManualType = false;
  let addedInvokeType = false;
  let foundPage = false;
  let foundSinceId = false;
  let foundMaxId = false;
  let foundPagingType = false;

  for (let pair of pairs) {
    let idx = pair.indexOf('=');
    let key = idx > -1 ? pair.substring(0, idx) : pair;
    let value = idx > -1 ? pair.substring(idx + 1) : '';

    if (key === 'taskType') {
      foundTaskType = true;
      result.push('taskType=loadMore');
      continue;
    }
    if (key === 'manualType') { addedManualType = true; result.push('manualType=scroll'); continue; }
    if (key === 'invokeType') { addedInvokeType = true; result.push('invokeType=manual'); continue; }
    if (key === 'since_id') { foundSinceId = true; result.push('since_id=' + sinceId); continue; }
    // flowlist 不使用 page 参数，移除原有的 page 值
    if (key === 'page') { foundPage = true; continue; }
    // max_id 在 flowlist 中始终为0，保留原值
    if (key === 'max_id') { foundMaxId = true; result.push(pair); continue; }
    if (key === 'pagingType') { foundPagingType = true; result.push('pagingType=cursor'); continue; }
    result.push(pair);
  }

  if (!foundTaskType) result.push('taskType=loadMore');
  if (!addedManualType) result.push('manualType=scroll');
  if (!addedInvokeType) result.push('invokeType=manual');
  if (!foundSinceId) result.push('since_id=' + sinceId);
  if (!foundPagingType) result.push('pagingType=cursor');

  return result.join('&');
}

// POST 请求封装
function postRequest(url, headersStr, body) {
  return new Promise((resolve) => {
    let headers;
    try {
      headers = JSON.parse(headersStr);
    } catch (e) {
      headers = {};
    }
    let request = {
      url: url,
      headers: headers,
      body: body
    };
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      console.log(`❌ POST请求超时: ${url.slice(0, 80)}`);
      resolve(null);
    }, REQUEST_TIMEOUT);
    $.post(request, (error, response, data) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (error) {
        console.log(`❌ POST请求失败: ${error}`);
        resolve(null);
      } else {
        resolve(response);
      }
    });
  });
}

// 签到：URL、请求头及调用方式沿用原版，仅调整结果记录和通知文案。
function checkin(id, name) {
  let sendCheckinUrl = $.currentToken.checkinurl
    .replace(/fid=[a-f0-9]+/, "fid=" + id)
    .replace(/pageid%3D[a-f0-9]+/, "pageid%3D" + id);
  let headers;
  try { headers = JSON.parse($.currentToken.checkinHeaders); } catch (_) { headers = {}; }
  let request = { url: sendCheckinUrl, headers };
  return new Promise(resolve => {
    let done = false;
    let timer;
    function finish(kind, text) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      recordResult(name, kind, text);
      resolve();
    }
    timer = setTimeout(() => finish('fail', '请求超时'), REQUEST_TIMEOUT);
    try {
      $.get(request, (error, response, data) => {
        if (done) return;
        if (error) { finish('fail', '请求失败，请检查网络'); return; }
        const status = response && Number(response.statusCode || response.status);
        if (status === 200) {
          let info;
          try { info = JSON.parse(response.body == null ? data : response.body); } catch (_) {
            finish('fail', '响应解析失败'); return;
          }
          if (!info || typeof info !== 'object' || Array.isArray(info)) {
            finish('fail', '响应格式异常'); return;
          }
          if (String(info.errcode) === '382004') {
            finish('already', '今日已签到');
          } else if (Object.prototype.hasOwnProperty.call(info, 'errmsg')) {
            finish('fail', info.errmsg || '签到失败');
          } else if (info.result == 1) {
            finish('success', '签到成功');
          } else {
            finish('fail', '签到失败，接口返回异常');
          }
        } else if (status === 418) {
          finish('fail', '操作频繁，请稍后再试');
        } else if (status === 511) {
          finish('fail', '需要身份验证，请打开微博处理');
        } else {
          finish('fail', '签到失败，服务器响应异常');
        }
      });
    } catch (_) { finish('fail', '请求失败，请检查网络'); }
  });
}

// 简单的判断对象的所有属性都不为空，所有属性都符合条件才返回 true
function validateObject(obj) {
  const required = ['userId', 'tokenUrl', 'tokenHeaders', 'tokenBody', 'checkinurl', 'checkinHeaders'];
  return required.every(key =>
    obj[key] !== null &&
    obj[key] !== undefined &&
    (typeof obj[key] !== 'string' || obj[key].trim() !== '')
  );
}

// API start
async function sendMsg(desc, opts) { $.isNode() ? await notify.sendNotify($.name, desc) : $.msg($.name, $.subTitle || "", desc, opts) }
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;"POST"===e&&(s=this.post);const i=new Promise(((e,i)=>{s.call(this,t,((t,s,o)=>{t?i(t):e(s)}))}));return t.timeout?((t,e=1e3)=>Promise.race([t,new Promise(((t,s)=>{setTimeout((()=>{s(new Error("请求超时"))}),e)}))]))(i,t.timeout):i}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.logLevels={debug:0,info:1,warn:2,error:3},this.logLevelPrefixs={debug:"[DEBUG] ",info:"[INFO] ",warn:"[WARN] ",error:"[ERROR] "},this.logLevel="info",this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null,...s){try{return JSON.stringify(t,...s)}catch{return e}}getjson(t,e){let s=e;if(this.getdata(t))try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise((e=>{this.get({url:t},((t,s,i)=>e(i)))}))}runScript(t,e){return new Promise((s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let o=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");o=o?1*o:20,o=e&&e.timeout?e.timeout:o;const[r,a]=i.split("@"),n={url:`http://${a}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:o},headers:{"X-Key":r,Accept:"*/*"},policy:"DIRECT",timeout:o};this.post(n,((t,e,i)=>s(i)))})).catch((t=>this.logErr(t)))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),o=JSON.stringify(this.data);s?this.fs.writeFileSync(t,o):i?this.fs.writeFileSync(e,o):this.fs.writeFileSync(t,o)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let o=t;for(const t of i)if(o=Object(o)[t],void 0===o)return s;return o}lodash_set(t,e,s){return Object(t)!==t||(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce(((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{}),t)[e[e.length-1]]=s),t}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),o=s?this.getval(s):"";if(o)try{const t=JSON.parse(o);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(e),r=this.getval(i),a=i?"null"===r?null:r||"{}":"{}";try{const e=JSON.parse(a);this.lodash_set(e,o,t),s=this.setval(JSON.stringify(e),i)}catch(e){const r={};this.lodash_set(r,o,t),s=this.setval(JSON.stringify(r),i)}}else s=this.setval(t,e);return s}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.cookie&&void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar)))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),void 0===t.followRedirect||t.followRedirect||((this.isSurge()||this.isLoon())&&(t["auto-redirect"]=!1),this.isQuanX()&&(t.opts?t.opts.redirection=!1:t.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,((t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)}));break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then((t=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=t;e(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)}),(t=>e(t&&t.error||"UndefinedError")));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",((t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}})).then((t=>{const{statusCode:i,statusCode:o,headers:r,rawBody:a}=t,n=s.decode(a,this.encoding);e(null,{status:i,statusCode:o,headers:r,rawBody:a,body:n},n)}),(t=>{const{message:i,response:o}=t;e(i,o,o&&s.decode(o.rawBody,this.encoding))}));break}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),void 0===t.followRedirect||t.followRedirect||((this.isSurge()||this.isLoon())&&(t["auto-redirect"]=!1),this.isQuanX()&&(t.opts?t.opts.redirection=!1:t.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,((t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)}));break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then((t=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=t;e(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)}),(t=>e(t&&t.error||"UndefinedError")));break;case"Node.js":let i=require("iconv-lite");this.initGotEnv(t);const{url:o,...r}=t;this.got[s](o,r).then((t=>{const{statusCode:s,statusCode:o,headers:r,rawBody:a}=t,n=i.decode(a,this.encoding);e(null,{status:s,statusCode:o,headers:r,rawBody:a,body:n},n)}),(t=>{const{message:s,response:o}=t;e(s,o,o&&i.decode(o.rawBody,this.encoding))}));break}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}queryStr(t){let e="";for(const s in t){let i=t[s];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),e+=`${s}=${i}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",i="",o={}){const r=t=>{const{$open:e,$copy:s,$media:i,$mediaMime:o}=t;switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{const r={};let a=t.openUrl||t.url||t["open-url"]||e;a&&Object.assign(r,{action:"open-url",url:a});let n=t["update-pasteboard"]||t.updatePasteboard||s;if(n&&Object.assign(r,{action:"clipboard",text:n}),i){let t,e,s;if(i.startsWith("http"))t=i;else if(i.startsWith("data:")){const[t]=i.split(";"),[,o]=i.split(",");e=o,s=t.replace("data:","")}else{e=i,s=(t=>{const e={JVBERi0:"application/pdf",R0lGODdh:"image/gif",R0lGODlh:"image/gif",iVBORw0KGgo:"image/png","/9j/":"image/jpg"};for(var s in e)if(0===t.indexOf(s))return e[s];return null})(i)}Object.assign(r,{"media-url":t,"media-base64":e,"media-base64-mime":o??s})}return Object.assign(r,{"auto-dismiss":t["auto-dismiss"],sound:t.sound}),r}case"Loon":{const s={};let o=t.openUrl||t.url||t["open-url"]||e;o&&Object.assign(s,{openUrl:o});let r=t.mediaUrl||t["media-url"];return i?.startsWith("http")&&(r=i),r&&Object.assign(s,{mediaUrl:r}),console.log(JSON.stringify(s)),s}case"Quantumult X":{const o={};let r=t["open-url"]||t.url||t.openUrl||e;r&&Object.assign(o,{"open-url":r});let a=t["media-url"]||t.mediaUrl;i?.startsWith("http")&&(a=i),a&&Object.assign(o,{"media-url":a});let n=t["update-pasteboard"]||t.updatePasteboard||s;return n&&Object.assign(o,{"update-pasteboard":n}),console.log(JSON.stringify(o)),o}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,i,r(o));break;case"Quantumult X":$notify(e,s,i,r(o));break;case"Node.js":break}if(!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}debug(...t){this.logLevels[this.logLevel]<=this.logLevels.debug&&(t.length>0&&(this.logs=[...this.logs,...t]),console.log(`${this.logLevelPrefixs.debug}${t.map((t=>t??String(t))).join(this.logSeparator)}`))}info(...t){this.logLevels[this.logLevel]<=this.logLevels.info&&(t.length>0&&(this.logs=[...this.logs,...t]),console.log(`${this.logLevelPrefixs.info}${t.map((t=>t??String(t))).join(this.logSeparator)}`))}warn(...t){this.logLevels[this.logLevel]<=this.logLevels.warn&&(t.length>0&&(this.logs=[...this.logs,...t]),console.log(`${this.logLevelPrefixs.warn}${t.map((t=>t??String(t))).join(this.logSeparator)}`))}error(...t){this.logLevels[this.logLevel]<=this.logLevels.error&&(t.length>0&&(this.logs=[...this.logs,...t]),console.log(`${this.logLevelPrefixs.error}${t.map((t=>t??String(t))).join(this.logSeparator)}`))}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.map((t=>t??String(t))).join(this.logSeparator))}logErr(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,e,t);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,e,void 0!==t.message?t.message:t,t.stack);break}}wait(t){return new Promise((e=>setTimeout(e,t)))}done(t={}){const e=((new Date).getTime()-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${e} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)}
// API end
