/**
 * @name 海角社区
 * @desc 解锁—金币视频—VIP视频
 * @author ioskcc
 * @update 2026-05-26
*/

let { headers: requestHeaders, url: requestUrl } = $request;

let processedUrl = requestUrl
    .replace(/\/\/(?!long)[^\.]+\./, "//long.")
    .replace(/\.m3u8/, "");

if (requestHeaders['X-Playback-Session-Id']) {
    console.log("X-Playback-Session-Id intercepted");
    
    if (typeof $notify !== 'undefined') {
        $notify('彭于晏提示❗️视频链接捕获成功', '点击跳转播放', '', { 'open-url': processedUrl });
    } else if (typeof $notification !== 'undefined') {
        $notification.post('彭于晏提示❗️视频链接捕获成功', '点击跳转播放', '', {
            'url': processedUrl,
            'openUrl': processedUrl
        });
    }
}

$done({ 'response': { 'headers': requestHeaders } });
