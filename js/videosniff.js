/**
 * @name videosniff
 * @desc 获取网页视频流跳转SenPlayer播放
 * @author axkrr,御清弦
*/

const url = $request.url || "";
const ONCE_KEY = "senplayer_once";
const videoRegex = /\.(m3u8|mp4|mov|avi|flv)(\?.*)?$|playlist\.m3u8/i;

if (videoRegex.test(url)) {

  // m3u8时长判断
  if (/\.m3u8/i.test(url)) {
    $task.fetch({ url }).then(resp => {
      const body = resp.body;
      if (!body) {
        $done({});
        return;
      }

      let duration = 0;
      body.split("\n").forEach(line => {
        if (line.startsWith("#EXTINF:")) {
          duration += parseFloat(line.replace("#EXTINF:", ""));
        }
      });

      if (duration < 60) {
        console.log("🚫SenPlayer:视频时长<60秒,跳过");
        $done({});
        return;
      }

      handlePlay();
    }).catch(() => {
      $done({});
    });

  } else {
    handlePlay();
  }

} else {
  $done({});
}

function handlePlay() {
  const lastTime = $prefs.valueForKey(ONCE_KEY);
  const now = Date.now();

  // 60秒内已经弹过窗则跳过
  if (lastTime && (now - parseInt(lastTime) < 60000)) {
    console.log("🚫SenPlayer:冷却中,跳过检测");
    $done({});
  } else {
    // 要么没锁要么锁已经过期
    const playUrl = "senplayer://x-callback-url/play?url=" + encodeURIComponent(url) + "&force=true";

    $notify("🎬SenPlayer","发现视频流", "点击跳转播放", { "open-url": playUrl });

    // 存入当前时间戳作为“锁”
    $prefs.setValueForKey(now.toString(), ONCE_KEY);
    console.log("✅SenPlayer:抓取成功,设置时间戳: " + now);

    $done({});
  }
}