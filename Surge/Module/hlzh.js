/*
* 航旅纵横去广告脚本
*/

const url = $request.url;
let body = $response.body;

if (url.indexOf("/advert") !== -1) {
    // 简练功能说明：直接模拟广告配置接口返回失败，让 App 跳过加载
    $done({ status: "HTTP/1.1 404 Not Found", body: "" });
} else if (body && url.indexOf("/init") !== -1) {
    let bodyString = body.toString();
    // 简练功能说明：仅修改超时字段，并开启黑名单逻辑
    bodyString = bodyString.replace(/"advertTimeout":"\d+"/, '"advertTimeout":"0"')
                           .replace(/"advertTotalTimeout":"\d+"/, '"advertTotalTimeout":"0"')
                           .replace(/"adBlackList":"0"/, '"adBlackList":"1"');
    $done({ body: bodyString });
} else {
    $done({ body });
}
