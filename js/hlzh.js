/**
 * @name hlzh
 * @desc 航旅纵横净化
 * @author axkrr
 * @update 2026-05-18
*/

let body = $response.body;
if (body) {
    try {
        let obj = JSON.parse(body);
        let url = $request.url;

        // 处理广告网关接口
        if (url.indexOf("gateway/api/umetrip/advert") !== -1) {
            if (obj.data) {
                // 清空Banner列表
                if (obj.data.bannerList) obj.data.bannerList = [];
                if (obj.data.ads) obj.data.ads = [];
                // 处理弹窗广告
                if (obj.data.popup) obj.data.popup = null;
            }
            if (obj.bannerList) obj.bannerList = [];
            body = JSON.stringify(obj);
        }
    } catch (e) {
        console.log("航旅纵横脚本解析失败");
    }
}
$done({ body });
