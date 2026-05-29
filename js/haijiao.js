/**
 * @name 海角社区
 * @desc 解锁—金币视频—VIP视频
 * @author ioskcc
 * @update 2026-05-26
*/

let {headers, url} = $request;
let isQuantumult = typeof $task !== 'undefined';
let isSurge = typeof $httpClient !== 'undefined' && !isQuantumult;
let isLoon = typeof $loon !== 'undefined';

let newUrl = url
  .replace(/\/(?!long)[^\.]+\./, '//long.')
  .replace('.m3u8', '.mp4');

headers.hasOwnProperty('X-Playback-Session-Id') && (
  console.log('彭于晏提示❗️视频链接捕获成功'),
  isQuantumult && $notify('彭于晏提示❗️视频链接捕获成功', '', '', {'open-url': newUrl}),
  isSurge && $notify('彭于晏提示❗️视频链接捕获成功', '', '', {'url': newUrl}),
  isLoon && $notification.post('彭于晏提示❗️视频链接捕获成功', '', '', {'openUrl': newUrl})
);

$done({response: {headers}});