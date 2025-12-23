/*
* 航旅纵横首页及启动去广告
*/

let body = $response.body;

if (body) {
    // 简练功能说明：处理二进制数据流中的JSON部分
    let bodyString = body.toString();
    
    // 1. 消除启动倒计时逻辑
    bodyString = bodyString.replace(/"advertTimeout":"\d+"/, '"advertTimeout":"0"')
                           .replace(/"advertTotalTimeout":"\d+"/, '"advertTotalTimeout":"0"');

    // 2. 针对首页混排广告 (Native 接口)
    // 简练功能说明：识别并抹除包含ADVERT标识的服务块
    if (bodyString.indexOf("ADVERT") !== -1 || bodyString.indexOf("adSign") !== -1) {
        // 匹配包含 advert 信息的 JSON 结构并将其关键参数置空
        bodyString = bodyString.replace(/"trackName":"advert"/g, '"trackName":"none"')
                               .replace(/"adSign":"true"/g, '"adSign":"false"')
                               .replace(/"department":"advert"/g, '"department":"none"');
                               
        // 简练功能说明：抹除图片链接防止加载
        bodyString = bodyString.replace(/https:\/\/oss\.umetrip\.com\/fs\/advert\/[^\"]+/g, "");
    }

    $done({ body: bodyString });
} else {
    $done({});
}
