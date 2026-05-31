/**
 * @name 海角社区
 * @desc 解锁—金币视频—VIP视频
 * @author ioskcc
 * @update 2026-05-26
*/

let { headers, url } = $request,
  isSurge = typeof $task !== "undefined",
  isQX = typeof $httpClient !== "undefined" && !isSurge,
  isLoon = typeof $loon !== "undefined",
  newUrl = url.replace(/\/\/(?!long)[^\.]+\./, "//long.").replace(/\.m3u8/, ".mp4");
 
headers.hasOwnProperty("X-Playback-Session-Id") && (
  console.log("通杀Crack~"),
  isSurge && $notify("彭于晏提示❗️视频链接捕获成功", ">_ 点击此通知可跳转观看 🔞", "", { "open-url": newUrl }),
  isQX && $notification.post("彭于晏提示❗️视频链接捕获成功", ">_ 点击此通知可跳转观看 🔞", "", { "url": newUrl }),
  isLoon && $notification.post("彭于晏提示❗️视频链接捕获成功", ">_ 点击此通知可跳转观看 🔞", "", { "openUrl": newUrl })
);
 
$done({ response: { headers } });