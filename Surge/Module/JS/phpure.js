/**
 * @name PornHub净化脚本修正版
 */

let body = $response.body;

// 只有当 body 存在时才进行替换
if (body) {
    // 检查是否包含 <head> 标签，避免对非 HTML 内容进行误操作
    if (body.indexOf('<head>') !== -1) {
        body = body.replace(/<head>/, '<head><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/ddgksf2013/Html/pornhub.css" type="text/css">');
    }
    $done({ body });
} else {
    // 如果没有 body，直接结束，不进行任何操作
    $done({});
}
