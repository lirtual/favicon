export default {
  async fetch(request) {
    const init = {
      headers: {
        "content-type": "text/html;charset=UTF-8"
      },
      redirect: "follow"
    };

    // 从请求路径中解析出目标URL
    const urlPath = new URL(request.url).pathname.slice(1);
    if (!urlPath) {
      return new Response("Please provide a URL in the path", {
        status: 400
      });
    }

    let targetURL;
    try {
      targetURL = new URL(urlPath);
    } catch (e) {
      return new Response("Invalid URL format", {
        status: 400
      });
    }

    let favicon = "";

    const response = await fetch(targetURL.origin, init).catch(() => {
      console.log("failed");
    });

    let newResponse = new HTMLRewriter().on('link[rel*="icon"]', {
      async element(element) {
        if (element.getAttribute("rel") === "mask-icon" || favicon)
          return;
        favicon = element.getAttribute("href");
        if (favicon.startsWith("/")) {
          const prefix = favicon.startsWith("//") ? "https:" : targetURL.origin;
          favicon = prefix + favicon;
        } else if (!favicon.startsWith("http")) {
          favicon = targetURL.origin + "/" + favicon;
        }
      }
    }).transform(response);

    await newResponse.text();

    if (!favicon) {
      const fav = await fetch(targetURL.origin + "/favicon.ico");
      if (fav.status === 200) {
        const resss = new Response(fav.body, { headers: fav.headers });
        resss.headers.set("Cache-Control", "max-age=86400");
        return resss;
      }
      const defaultIconSvg = `<svg viewBox="0 0 20 20"><path fill="currentColor" d="M5.719 14.75a.997.997 0 0 1-.664-.252L-.005 10l5.341-4.748a1 1 0 0 1 1.328 1.495L3.005 10l3.378 3.002a1 1 0 0 1-.664 1.748zm8.945-.002L20.005 10l-5.06-4.498a.999.999 0 1 0-1.328 1.495L16.995 10l-3.659 3.252a1 1 0 0 0 1.328 1.496zm-4.678 1.417 2-12a1 1 0 1 0-1.972-.329l-2 12a1 1 0 1 0 1.972.329z"></path></svg>`;
      const defaultIcon = new Response(defaultIconSvg, {
        headers: {
          "content-type": "image/svg+xml"
        }
      });
      defaultIcon.headers.set("Cache-Control", "max-age=36000");
      return defaultIcon;
    }

    const isRaw = new URL(request.url).searchParams.get("raw");
    if (isRaw !== null) {
      const ic = new Response(favicon);
      ic.headers.set("Cache-Control", "max-age=86400");
      return ic;
    }

    let icon = await fetch(favicon);
    const svgFavicon = "data:image/svg+xml,";
    if (favicon.includes(svgFavicon)) {
      return new Response(decodeURI(favicon.split(svgFavicon)[1]), {
        headers: {
          "content-type": "image/svg+xml"
        }
      });
    }

    const ct = icon.headers.get("content-type");
    if (ct.includes("application") || ct.includes("text")) {
      icon = await fetch(`https://www.google.com/s2/favicons?domain=${targetURL.origin}`);
    }

    const iconRes = new Response(icon.body);
    iconRes.headers.set("Cache-Control", "max-age=86400");
    iconRes.headers.set("Content-Type", icon.headers.get("content-type"));
    return iconRes;
  }
};
