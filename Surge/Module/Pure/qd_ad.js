/*
去哒广告劫持脚本
*/

let obj = JSON.parse($response.body || "{}");

// 强制清空所有可能存在的广告配置
obj.data = []; 
obj.code = 1; // 1 通常代表成功
obj.msg = "success";

$done({
    body: JSON.stringify(obj),
    status: 200 // 必须返回 200，让 App 觉得请求成功了
});
