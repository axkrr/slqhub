/**
 * @name ykxc
 * @desc 一刻相册净化
 * @author axkrr
 * @update 2026-05-18
 */ 

let body = $response.body;
if (!body) {
    $done({});
} else {
    let obj = JSON.parse(body);
    const url = $request.url;

    // 开屏
    if (url.indexOf("api/operation/splash") !== -1) {
        if (obj.data) {
            obj.data.ads = [];
            obj.data.limit_time = 0;
            obj.data.display_time = 0;
            obj.data.timeout = 0;
        }
    }

    // 首页顶部Banner
    if (url.indexOf("api/operation/banner") !== -1) {
        if (obj.data) obj.data = [];
    }

    // 首页信息流/弹窗配置
    if (url.indexOf("api/config") !== -1) {
        if (obj.data && obj.data.ad_config) {
            obj.data.ad_config.show_ads = 0;
            obj.data.ad_config.splash_ad_enabled = 0;
            obj.data.ad_config.banner_ad_enabled = 0;
            obj.data.ad_config.feed_ad_enabled = 0;
        }
    }

    if (url.indexOf("api/user/privilege") !== -1) {
        if (obj.privilege) {
            obj.privilege.jump_open_screen_ad = 1;
            obj.privilege.jump_inner_ad = 1;
        }
    }

    $done({ body: JSON.stringify(obj) });
}
