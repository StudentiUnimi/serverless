addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});

const encodeGetParams = p =>
    Object.entries(p).map(kv => kv.map(encodeURIComponent).join("=")).join("&");

async function tgReq(path, params) {
    let resp = await fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/"
        + path + "?" + encodeGetParams(params), {
        method: "GET",
        body: null
    });
    return await resp.json();
}

async function handleRequest(request) {
    let cache = await caches.open("studentiunimi-profile-pictures");
    let cachedResp = await cache.match(request);
    if (cachedResp !== null && cachedResp !== undefined) {
        return cachedResp;
    }

    const { searchParams } = new URL(request.url);
    let chatID = searchParams.get("chat_id");
    if (!chatID || chatID === "")
        chatID = request.url.split("/").pop().replace(".png", "")

    try {
        let chatInfo = await tgReq("getChat", { "chat_id": chatID });
        let file = await tgReq("getFile", { "file_id": chatInfo.result.photo.small_file_id });
        let photo = await fetch("https://api.telegram.org/file/bot" + BOT_TOKEN + "/" + file.result.file_path);
        let resp = new Response(photo.body, { status: 200 });
        resp.headers.set("Cache-Control", "public, max-age=86400");
        resp.headers.set("Content-Type", "image/png");
        await cache.put(request, resp.clone());
        return resp;
    } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: "Bad chat_id" }), { status: 403 });
    }
}
