/*
* 航旅纵横去广告脚本
*/

const url = $request.url;
let body = $response.body;

if (body) {
    // 简练功能说明：针对初始化接口进行安全处理，若非 init 则原样返回避免报错
    if (url.indexOf("/init") !== -1) {
        let bodyString = body.toString();
        // 简练功能说明：置零广告超时，开启黑名单
        bodyString = bodyString.replace(/"advertTimeout":"\d+"/, '"0"')
                               .replace(/"advertTotalTimeout":"\d+"/, '"0"')
                               .replace(/"adBlackList":"0"/, '"1"');
        $done({ body: bodyString });
    } else {
        // 简练功能说明：native等接口直接透传，不作修改以规避 GBP 校验错误
        $done({ body });
    }
} else {
    $done({});
}
