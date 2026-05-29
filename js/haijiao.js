/**
 * @name 海角社区
 * @desc 解锁—金币视频—VIP视频
 * @author ioskcc
 * @update 2026-05-26
*/

const url = $request.url;
const headers = $request.headers;

// 替换 host 防止部分限制
let videoUrl = url.replace(/\/\/(?!long)[^\.]+\./, 'y.js.cn.v7').replace(/\.m3u8/, '.m3u8');
console.log('视频链接捕获成功:', videoUrl);
// Surge 通知
if (typeof $notification !== 'undefined') {
    $notification.post(
        '彭于晏提示❗️视频链接捕获成功',
        '点击跳转播放',
        videoUrl,
        { url: videoUrl }
    );
}

// 完成请求处理
$done({ response: { headers } });