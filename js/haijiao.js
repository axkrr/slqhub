/**
 * @name 海角社区
 * @desc 解锁—金币视频—VIP视频
 * @author ioskcc
 * @update 2026-05-26
*/

let { headers, url } = $request;

// 替换播放域名
let playUrl = url
  .replace(/\/\/(?!long)[^\.]+\./, "//y.js.cn.v7.")
  .replace(/\.m3u8/, ".m3u8");

// 判断是否是真实视频流
if (
  headers["X-Playback-Session-Id"] ||
  headers["x-playback-session-id"]
) {

  console.log("视频链接捕获成功");
  console.log(playUrl);

  // qx
  if (typeof $task !== "undefined") {
    $notify(
      "彭于晏提示❗️视频链接捕获成功",
      "点击跳转播放",
      "",
      {
        "open-url": playUrl
      }
    );
  }

  // surge
  if (
    typeof $httpClient !== "undefined" &&
    typeof $task === "undefined"
  ) {
    $notification.post(
      "彭于晏提示❗️视频链接捕获成功",
      "点击跳转播放",
      playUrl,
      {
        url: playUrl
      }
    );
  }

  // loon
  if (typeof $loon !== "undefined") {
    $notification.post(
      "彭于晏提示❗️视频链接捕获成功",
      "点击跳转播放",
      playUrl,
      {
        openUrl: playUrl
      }
    );
  }
}

$done({
  headers
});