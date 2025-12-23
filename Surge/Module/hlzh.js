/*
* 航旅纵横去广告脚本
*/

let body = $response.body;
let url = $request.url;

if (body) {
    let bodyString = body.toString();

    // 简练功能说明：仅在初始化接口做最小化修改，防止解析失败
    if (url.indexOf("/init") !== -1) {
        // 保持长度一致的替换
        bodyString = bodyString.replace(/"advertTimeout":"\d+"/, '"advertTimeout":"0"')
                               .replace(/"advertTotalTimeout":"\d+"/, '"advertTotalTimeout":"0"')
                               .replace(/"adBlackList":"0"/, '"adBlackList":"1"');
    }

    $done({ body: bodyString });
} else {
    $done({});
}
