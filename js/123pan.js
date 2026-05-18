/**
 * @name 123panpure
 * @desc 123云盘净化
 * @author axkrr
*/

const url = $request.url;
let body = $response.body;

try {
    let obj = JSON.parse(body);

    // 处理Placement配置
    if (url.indexOf('open/placement') !== -1) {
        obj.data = {};
        obj.msg = "Success";
        obj.code = 0;
    } 
    // 处理Bid竞价
    else if (url.indexOf('/bid') !== -1) {
        obj.data = [];
        obj.msg = "success";
        obj.code = 0;
    } 
    // 处理最新的Request广告内容请求
    else if (url.indexOf('/request') !== -1) {
        if (obj.data) {
            obj.data.seatbid = []; // 清空广告位列表
        }
        obj.msg = "success";
        obj.code = 0;
    }
    // 处理领野广告Map
    else if (url.indexOf('ad/map') !== -1) {
        obj.data = [];
        obj.bid = [];
        obj.code = 1;
        obj.message = "成功";
    }

    $done({ body: JSON.stringify(obj) });
} catch (e) {
    $done({ body });
}
