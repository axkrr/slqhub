/*
* 航旅纵横去广告脚本
*/

const url = $request.url;
let body = $response.body;

if (body) {
    let bodyString = body.toString();

    // 简练功能说明：处理初始化及核心配置接口，采用等长替换规避 GBP 校验错误
    if (url.indexOf("/native") !== -1 || url.indexOf("/init") !== -1) {
        
        // 1. 屏蔽广告超时设置（保持四位数字/三位数字长度不变，置零）
        bodyString = bodyString.replace(/"advertTimeout":"\d+"/, '"advertTimeout":"0000"')
                               .replace(/"advertTotalTimeout":"\d+"/, '"advertTotalTimeout":"0000"')
                               .replace(/"advertImageTimeout":"\d+"/, '"advertImageTimeout":"0000"');
        
        // 2. 开启广告黑名单（长度不变）
        bodyString = bodyString.replace(/"adBlackList":"0"/, '"adBlackList":"1"');
        
        // 3. 关闭首页弹窗推送（长度不变）
        bodyString = bodyString.replace(/"popSwitch":"1"/, '"popSwitch":"0"');

        $done({ body: bodyString });
    } else {
        $done({ body });
    }
} else {
    $done({});
}
