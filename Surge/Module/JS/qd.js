/*
 * @name qdpure_jsfile_v2
 * @description 强化版去哒去广告脚本
 */

let body = $response.body;
if (body) {
    try {
        let obj = JSON.parse(body);
        
        // 1. 清空核心广告位
        obj.data = [];
        obj.bid = [];
        
        // 2. 关键补丁：修改全局配置字段（根据你之前提供的JSON特征）
        // 缩短展示时长或加载时长，强制 App 认为没有广告可播
        if (obj.load) obj.load = 0; 
        if (obj.lns) obj.lns = 0;
        
        // 3. 保持成功状态
        obj.code = 1;
        obj.message = "成功";
        
        $done({ body: JSON.stringify(obj) });
    } catch (e) {
        $done({ body });
    }
} else {
    $done({ body });
}
