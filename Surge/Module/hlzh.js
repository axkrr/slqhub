/*
* 航旅纵横去广告脚本
*/

let body = $response.body;

if (body) {
    let bodyString = body.toString();

    // 简练功能说明：初始化接口去广告逻辑
    if ($request.url.indexOf("/init") !== -1) {
        bodyString = bodyString.replace(/"advertTimeout":"\d+"/, '"advertTimeout":"0"')
                               .replace(/"advertTotalTimeout":"\d+"/, '"advertTotalTimeout":"0"')
                               .replace(/"adBlackList":"0"/, '"adBlackList":"1"');
    }

    // 简练功能说明：首页Native接口去广告逻辑（针对抓包数据）
    if ($request.url.indexOf("/native") !== -1) {
        // 抹除广告标识
        bodyString = bodyString.replace(/"trackName":"advert"/g, '"trackName":"none"')
                               .replace(/"adSign":"true"/g, '"adSign":"false"')
                               .replace(/"department":"advert"/g, '"department":"none"');
        
        // 简练功能说明：清理首页弹窗及活动浮窗
        if (bodyString.indexOf("msgList") !== -1) {
            bodyString = bodyString.replace(/"popSwitch":"1"/g, '"popSwitch":"0"');
        }
    }

    $done({ body: bodyString });
} else {
    $done({});
}
