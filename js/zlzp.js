/**
 * @name zlzp
 * @desc 智联招聘净化
 * @author axkrr
 * @update 2026-06-22
 */

const url = $request.url;
let body = $response.body;

if (!body) $done({});

let obj;
try {
    obj = JSON.parse(body);
} catch (e) {
    $done({});
}
function clear(o) {
    if (Array.isArray(o)) return [];
    if (typeof o !== 'object' || !o) return o;

    for (let k in o) {
        let key = k.toLowerCase();

        if (
            key.includes('ad') ||
            key.includes('banner') ||
            key.includes('splash') ||
            key.includes('launch') ||
            key.includes('popup')
        ) {
            delete o[k];
            continue;
        }

        if (typeof o[k] === 'object') {
            o[k] = clear(o[k]);
        }
    }
    return o;
}
if (url.includes("operation/ad/bidMainPage")) {
    if (obj.data) obj.data = [];

    obj.splashInterval = 0;
    obj.countdown = 0;
    obj.interval = 0;
    obj.duration = 0;
    obj.skipTime = 0;
}
if (url.includes("operation/ad/getAdRecommend")) {
    if (obj.data) obj.data = [];
}
if (url.includes("bdp/operation/getPopupInfo")) {
    if (obj.data?.items) obj.data.items = [];
}
if (url.includes("operation-ad-slot/getAdvertisement")) {
    obj = { code: 0, data: [] };
}
obj = clear(obj);

$done({ body: JSON.stringify(obj) });