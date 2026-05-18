/**
 * @name dxstj
 * @desc 大学搜题酱净化
 * @author axkrr
 * @update 2026-05-18
*/

let body = $response.body;
if (body) {
    let obj = JSON.parse(body);
    let url = $request.url;

    // 保留依赖旧接口
    if (url.indexOf("init/config/init") !== -1) {
        if (obj.data) {
            if (obj.data.screen_ad) delete obj.data.screen_ad;
            if (obj.data.splash) delete obj.data.splash;
            obj.data.is_show_ad = false; 
            obj.data.ad_config = [];
        }
    }

    if (url.indexOf("init/config/popupconfig") !== -1) {
        if (obj.data) {
            obj.data.popupList = [];
            if (obj.data.vipSales) obj.data.vipSales.needShow = false;
        }
    }

    // 广告全局配置
    if (url.indexOf("adxserver/ad/getconfig") !== -1) {
        if (obj.data) {
            obj.data.adnList = [];
            obj.data.adList = [];
            obj.data.splashShowAdIdMap = {};
            obj.data.feedAdIdMap = {};
            if (obj.data.config) {
                obj.data.config.splashShowReplenishTime = 2147483647;
                obj.data.config.pullIntervalTime = 2147483647;
            }
        }
    }

    // 广告具体载荷
    if (url.indexOf("adxserver/ad/adreq") !== -1) {
        obj.data = {};
    }

    $done({ body: JSON.stringify(obj) });
} else {
    $done({});
}
