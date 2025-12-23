/*
* 航旅纵横去广告脚本
*/

const url = $request.url;
let body = $response.body;

if (body) {
    // 简练功能说明：处理初始化接口，使用安全替换防止破坏二进制结构
    if (url.indexOf("/init") !== -1) {
        let bodyString = body.toString();
        // 仅修改数值，不改变字符串总长度，避免触发 GBP 错误
        bodyString = bodyString.replace(/"advertTimeout":"\d+"/, '"advertTimeout":"0"')
                               .replace(/"advertTotalTimeout":"\d+"/, '"advertTotalTimeout":"0"');
        $done({ body: bodyString });
    } else {
        $done({ body });
    }
} else {
    $done({});
}
