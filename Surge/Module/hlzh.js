/*
* 航旅纵横去广告脚本
*/

let body = $response.body;

try {
    // 简练功能说明：处理混有二进制前缀的JSON数据
    let startIndex = body.indexOf('{');
    let endIndex = body.lastIndexOf('}') + 1;
    
    if (startIndex !== -1 && endIndex !== -1) {
        let jsonStr = body.substring(startIndex, endIndex);
        let obj = JSON.parse(jsonStr);

        // 简练功能说明：彻底删除广告相关字段
        delete obj.advertTimeout;
        delete obj.advertTotalTimeout;
        delete obj.advertImageTimeout;
        delete obj.advertLogBlacklist;
        delete obj.advertSdkBlacklist;
        
        // 简练功能说明：置空广告黑名单并开启
        obj.adBlackList = "1";
        
        // 简练功能说明：清理弹窗消息列表中的广告位
        if (obj.msgList) {
            let msg = JSON.parse(obj.msgList);
            const keys = ["home", "homeWithoutJourney", "order", "flightstatus"];
            keys.forEach(key => {
                if (msg[key]) msg[key].popSwitch = "0";
            });
            obj.msgList = JSON.stringify(msg);
        }

        // 重新组合回原始格式
        body = body.substring(0, startIndex) + JSON.stringify(obj) + body.substring(endIndex);
    }
} catch (e) {
    console.log("hlzh script error: " + e);
}

$done({ body });
