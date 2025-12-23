/*
* 处理初始化接口中的广告参数
*/

let body = $response.body;

// 简练功能说明：匹配并替换广告超时参数为0
body = body.replace(/"advertTimeout":"\d+"/, '"advertTimeout":"0"')
           .replace(/"advertTotalTimeout":"\d+"/, '"advertTotalTimeout":"0"')
           .replace(/"advertImageTimeout":"\d+"/, '"advertImageTimeout":"0"')
           .replace(/"adBlackList":"0"/, '"adBlackList":"1"');

// 简练功能说明：屏蔽启动弹窗消息
if (body.indexOf("msgList") !== -1) {
    body = body.replace(/"popSwitch":"1"/g, '"popSwitch":"0"');
}

$done({ body });
