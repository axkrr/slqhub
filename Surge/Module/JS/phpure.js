/**
 * @name phpure
 * @desc PornHub广告净化
 */

// 存在响应体时才处理
if (typeof $response !== "undefined" && $response.body) {
    let body = $response.body;
    
    // 检查是否为HTML内容
    if (body.includes('<head>')) {
        const cssLink = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/ddgksf2013/Html/pornhub.css" type="text/css">';
        // 注入CSS链接
        body = body.replace(/<head>/, `<head>${cssLink}`);
        $done({ body });
    } else {
        // 不是HTML直接原样返回
        $done({ body });
    }
} else {
    // 没有body直接结束
    $done({});
}
