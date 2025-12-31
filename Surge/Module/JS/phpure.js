/**
 * @name PornHub 净化脚本 (Surge 优化版)
 * @desc 修复 $response.body 为空导致的报错，并增强替换逻辑
 */

// 只有当存在响应体时才处理
if (typeof $response !== "undefined" && $response.body) {
    let body = $response.body;
    
    // 检查是否为 HTML 内容 (防止误处理图片或 JS 文件)
    if (body.includes('<head>')) {
        const cssLink = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/ddgksf2013/Html/pornhub.css" type="text/css">';
        // 注入 CSS 链接
        body = body.replace(/<head>/, `<head>${cssLink}`);
        
        // 进阶：如果需要进一步去除页面的悬浮广告，可以在这里添加更多 replace 逻辑
        $done({ body });
    } else {
        // 如果不是 HTML，直接原样返回
        $done({ body });
    }
} else {
    // 如果没有 body (例如 204 No Content)，直接结束
    $done({});
}
