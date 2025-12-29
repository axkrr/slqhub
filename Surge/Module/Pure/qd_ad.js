let obj = JSON.parse($response.body || "{}");

// 1. 清空所有广告列表
obj.data = []; 
obj.bid = [];  // 你之前抓到的那个 JSON 里有这个字段
obj.lns = 0;   // 很多聚合 SDK 用这个控制加载
obj.load = 0;  // 设为 0 告诉 App 不要加载
obj.code = 1;
obj.message = "成功";

$done({
    body: JSON.stringify(obj),
    status: 200
});
