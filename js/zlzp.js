/**
 * @name zlzp
 * @desc 智联招聘净化
 * @update 2026-05-18
 */

const url = $request.url;
let body = $response.body;

if (body) {
    let obj = JSON.parse(body);

    if (url.indexOf("operation/ad/bidMainPage") !== -1) {
        if (obj.data) obj.data = [];
        if (obj.splashInterval) obj.splashInterval = 0;
    } 

    if (url.indexOf("operation/ad/getAdRecommend") !== -1) {
        if (obj.data) {
            if (Array.isArray(obj.data)) {
                obj.data = [];
            } else if (typeof obj.data === 'object') {
                for (let key in obj.data) {
                    if (key.toLowerCase().includes('ad') || key.toLowerCase().includes('banner')) {
                        delete obj.data[key];
                    }
                }
            }
        }
    }

    if (url.indexOf("bdp/operation/getPopupInfo") !== -1) {
        if (obj.data && obj.data.items) obj.data.items = [];
    }

    $done({ body: JSON.stringify(obj) });
} else {
    $done({});
}
