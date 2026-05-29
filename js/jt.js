/**
 * @name 加藤视频
 * @desc 解锁部分会员视频
 * @author Yu9191
 * @update 2025-11-15
*/

const isReq   = typeof $request !== 'undefined';
const isQX    = typeof $task !== 'undefined';
const isSurge = typeof $httpClient !== 'undefined';

function notify(title, sub, msg){ (isQX ? $notify : $notification.post)(title, sub||'', msg||''); }
function done(v){ if (typeof $done==='function') $done(v); }

if (isReq && $request.url) {
  const url = $request.url;
  const reg = /\/asy\/.*\/?try\.m3u8$/;
  if (reg.test(url)) {
    const newUrl = url.replace("/try.m3u8", "/trailer.m3u8");
    // notify("匹配成功", `原 URL: ${url}`, `新 URL: ${newUrl}`);
    done({ url: newUrl });
  } else {
    notify("未匹配", "没有URL", url);
    done({});
  }
} else {
  notify("请求错误", "替换失败", "没有URL");
  done({});
}