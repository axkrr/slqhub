/**
 * @name qdpure_jsfile
 * @description 去哒 ad blocking script
 */

let body = $response.body;
if (body) {
    try {
        let obj = JSON.parse(body);
        
        if (obj.data) {
            obj.data = [];
        }
        if (obj.bid) {
            obj.bid = [];
        }
        
        obj.code = 1;
        obj.message = "成功";
        
        $done({ body: JSON.stringify(obj) });
    } catch (e) {
        $done({ body });
    }
} else {
    $done({ body });
}
