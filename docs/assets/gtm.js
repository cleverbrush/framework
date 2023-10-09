// src/assets/gtm.ts
var scriptEl = document.getElementById("gtm");
if (scriptEl) {
  const gtmId = scriptEl.getAttribute("tagId");
  if (gtmId) {
    (function(w, d, s, l, i) {
      w[l] = w[l] || [];
      w[l].push({ "gtm.start": (/* @__PURE__ */ new Date()).getTime(), event: "gtm.js" });
      var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != "dataLayer" ? "&l=" + l : "";
      j.async = true;
      j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
      f.parentNode.insertBefore(j, f);
    })(window, document, "script", "dataLayer", gtmId);
  }
}
//# sourceMappingURL=gtm.js.map