/**
 * @name KK键盘
 * @desc 解锁无限变声功能
 * @author 怎么肥事
 * @update 2026-05-27
*/

let obj = JSON.parse($response.body);

obj.data = obj.data || {};

const url = $request.url;

if (/checkCount|consumeCount/.test(url)) {
  obj.data.totalCount = 999;
  obj.data.currCount = 999;
}

if (/createTtsAudio/.test(url)) {
  obj.data.freeCount = 999;
}

$done({ body: JSON.stringify(obj) });