/**
 * @name videosniff
 * @desc 获取网页视频流跳转SenPlayer播放
 * @author axkrr
 * @update 2026-05-18
*/

const url = $request.url || "";
const headers = $request.headers || {};

const ONCE_KEY = "senplayer_once";
const videoRegex = /\.(m3u8|mp4|mov|avi|flv)(\?.*)?$|playlist\.m3u8/i;
const isQuanX = typeof $task !== "undefined";

// 存储
const getVal = k => isQuanX ? $prefs.valueForKey(k) : $persistentStore.read(k);
const setVal = (k, v) => isQuanX ? $prefs.setValueForKey(v, k) : $persistentStore.write(v, k);

// 通知
const notify = (t, s, b, u) => {
  if (isQuanX) $notify(t, s, b, { "open-url": u });
  else $notification.post(t, s, b, { url: u });
};

// 防循环
const ua = headers["User-Agent"] || headers["user-agent"] || "";
if (ua.toLowerCase().includes("senplayer")) {
  console.log("🚫 SenPlayer内部请求，跳过");
  $done({});
}
const allowUA = ["safari", "applewebkit"];
if (!allowUA.some(k => ua.toLowerCase().includes(k))) {
  console.log("🚫 非浏览器请求");
  $done({});
}

// 冷却锁（30秒）
function isCooling() {
  const last = getVal(ONCE_KEY);
  return last && (Date.now() - parseInt(last) < 30000);
}

// 原始抓取逻辑
if (videoRegex.test(url)) {

  if (/\.m3u8/i.test(url)) {
    // m3u8 时长判断
    fetchM3U8(url).then(duration => {
      if (duration < 60) {
        console.log("🚫 视频时长 < 60秒，跳过");
        $done({});
        return;
      }
      tryNotify(url);
    }).catch(() => $done({}));
  } else {
    tryNotify(url);
  }

} else {
  $done({});
}

// 辅助函数
function fetchM3U8(u) {
  if (isQuanX) {
    return $task.fetch({ url: u }).then(resp => {
      const body = resp.body;
      if (!body) return 0;
      let duration = 0;
      body.split("\n").forEach(line => {
        if (line.startsWith("#EXTINF:")) {
          duration += parseFloat(line.replace("#EXTINF:", ""));
        }
      });
      return duration;
    });
  } else {
    return new Promise((resolve, reject) => {
      $httpClient.get({ url: u }, (err, resp, body) => {
        if (err) reject(err);
        else {
          let duration = 0;
          body.split("\n").forEach(line => {
            if (line.startsWith("#EXTINF:")) duration += parseFloat(line.replace("#EXTINF:", ""));
          });
          resolve(duration);
        }
      });
    });
  }
}

// 自动通知
function tryNotify(playUrl) {
  if (isCooling()) return;

  const senUrl = "senplayer://x-callback-url/play?url=" + encodeURIComponent(playUrl) + "&force=true";
  notify("🎬SenPlayer","发现视频流","点击跳转播放", senUrl);
  setVal(ONCE_KEY, Date.now().toString());
  console.log("✅ 已发送通知");
}
