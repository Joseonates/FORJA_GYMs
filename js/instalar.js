/* FORJA · aviso para instalar la app en el celular o el computador.
   - Android / Chrome / Edge: botón "Instalar" que abre el instalador del navegador.
   - iPhone / iPad (Safari): instrucciones de 2 pasos (Compartir → Agregar a inicio).
   - No aparece si la app ya está instalada. Si la persona toca "Ahora no", vuelve a salir en 7 días. */
(function () {
  var KEY = "forja.instalar.hasta";
  var deferred = null, shown = false;

  function standalone() {
    return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  }
  function snoozed() {
    try { return Date.now() < Number(localStorage.getItem(KEY) || 0); } catch (e) { return false; }
  }
  function snooze(days) {
    try { localStorage.setItem(KEY, String(Date.now() + days * 864e5)); } catch (e) {}
  }
  var ua = navigator.userAgent || "";
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isSafari = isIOS && !/crios|fxios|edgios/i.test(ua);

  var CSS = ".fj-inst{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:90;max-width:520px;margin:0 auto;background:#0D1730;color:#fff;border-radius:16px;padding:14px 14px 14px 16px;box-shadow:0 18px 40px -16px rgba(5,10,25,.6);display:flex;gap:12px;align-items:center;font-family:Barlow,system-ui,sans-serif;animation:fjUp .35s ease-out}" +
    "@keyframes fjUp{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}" +
    "@media (prefers-reduced-motion:reduce){.fj-inst{animation:none}}" +
    ".fj-inst img{width:46px;height:46px;border-radius:12px;flex:none}" +
    ".fj-inst .fj-t{flex:1;min-width:0;font-size:14px;line-height:1.35}" +
    ".fj-inst .fj-t b{display:block;font-size:15px}" +
    ".fj-inst .fj-b{display:flex;flex-direction:column;gap:6px;flex:none}" +
    ".fj-inst button{font:inherit;font-weight:700;font-size:14px;border:0;border-radius:10px;padding:9px 14px;cursor:pointer}" +
    ".fj-inst .fj-ok{background:#FFD23F;color:#231A00}" +
    ".fj-inst .fj-no{background:transparent;color:#fff;opacity:.75;padding:4px 8px;font-weight:600;font-size:13px}" +
    ".fj-inst .fj-ios{display:inline-flex;vertical-align:-3px;margin:0 2px}" +
    "body.fj-has-nav .fj-inst{bottom:calc(84px + env(safe-area-inset-bottom,0px))}";

  function show(mode) {
    if (shown || standalone() || snoozed()) return;
    shown = true;
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    var box = document.createElement("div");
    box.className = "fj-inst"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Instalar FORJA");
    var shareIcon = '<svg class="fj-ios" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
    var text = mode === "ios"
      ? "<b>Instala FORJA en tu iPhone</b>Toca " + shareIcon + " <b style='display:inline'>Compartir</b> abajo y luego <b style='display:inline'>Agregar a inicio</b>."
      : "<b>Instala FORJA</b>Queda con su ícono como cualquier app y abre más rápido.";
    box.innerHTML = '<img src="icons/icon-192.png" alt=""><div class="fj-t">' + text + '</div><div class="fj-b">' +
      (mode === "ios" ? "" : '<button type="button" class="fj-ok">Instalar</button>') +
      '<button type="button" class="fj-no">' + (mode === "ios" ? "Entendido" : "Ahora no") + "</button></div>";
    document.body.appendChild(box);
    if (document.getElementById("nav") && document.querySelector(".nav") && getComputedStyle(document.querySelector(".nav")).position === "fixed") document.body.classList.add("fj-has-nav");
    var ok = box.querySelector(".fj-ok");
    if (ok) ok.onclick = function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function (c) { if (c && c.outcome !== "accepted") snooze(7); }).catch(function () {});
      deferred = null; box.remove();
    };
    box.querySelector(".fj-no").onclick = function () { snooze(7); box.remove(); };
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); deferred = e;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(function () { show("prompt"); }, 1200); });
    else setTimeout(function () { show("prompt"); }, 1200);
  });
  window.addEventListener("appinstalled", function () { var b = document.querySelector(".fj-inst"); if (b) b.remove(); snooze(3650); });

  // iPhone/iPad en Safari no tiene instalador automático: se muestran las instrucciones
  function iosHint() { if (isSafari) setTimeout(function () { show("ios"); }, 1500); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iosHint); else iosHint();
})();
