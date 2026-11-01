(function(){
  "use strict";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
  var path = location.pathname.toLowerCase();
  var isHub = path === "/" || path.endsWith("/index.html") || !/roflix|rotruyen|roedu/.test(path);
  var world = path.indexOf("roflix") >= 0 ? "flix" : path.indexOf("rotruyen") >= 0 ? "story" : path.indexOf("roedu") >= 0 ? "edu" : "";
  if (world) {
    document.documentElement.classList.add("rh-world", "rh-" + world);
    var names = {flix:"ROFLIX", story:"ROTRUYỆN", edu:"ROEDU"};
    var links = [
      ["roflix.html","RoFlix","flix"],
      ["rotruyen.html","RoTruyện","story"],
      ["roedu.html","RoEdu","edu"]
    ];
    var bar = document.createElement("div");
    bar.className = "rh-bridge";
    bar.innerHTML = '<a class="rh-bridge-brand" href="index.html"><i>R</i> RoHub</a><span class="rh-bridge-here">' + names[world] + '</span><nav>' +
      links.map(function(item){
        return '<a href="' + item[0] + '"' + (item[2]===world ? ' aria-current="page"' : '') + '>' + item[1] + '</a>';
      }).join("") + '</nav>';
    document.body.prepend(bar);
  } else if (isHub) {
    document.documentElement.classList.add("rh-world", "rh-hub");
  }

  var style = document.createElement("style");
  style.textContent = `
    .rh-world .rh-bridge{position:relative;z-index:30;display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:10px clamp(14px,3vw,34px);border-bottom:1px solid rgba(255,255,255,.09);background:rgba(8,10,18,.82);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
    .rh-bridge-brand{display:inline-flex;align-items:center;gap:8px;color:#f8fafc;text-decoration:none;font-weight:850;letter-spacing:-.3px}
    .rh-bridge-brand i{display:grid;place-items:center;width:27px;height:27px;border-radius:9px;background:linear-gradient(135deg,#f59e0b,#8b5cf6);font-style:normal;color:#090b12;box-shadow:0 5px 18px rgba(139,92,246,.25)}
    .rh-bridge-here{font-size:10px;letter-spacing:1.7px;font-weight:800;color:#a5b4fc}
    .rh-bridge nav{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-left:auto}
    .rh-bridge nav a{padding:7px 10px;border:1px solid rgba(255,255,255,.08);border-radius:999px;color:#cbd5e1;text-decoration:none;font-size:12px;transition:background .18s,border-color .18s,color .18s}
    .rh-bridge nav a:hover,.rh-bridge nav a[aria-current="page"]{border-color:rgba(245,158,11,.45);background:rgba(245,158,11,.1);color:#fff}
    .rh-world .portal,.rh-world .feature,.rh-world .topic-card,.rh-world .stat-card,.rh-world .pull-card,.rh-world .pull-movie,.rh-world .story,.rh-world .subject-card,.rh-world .source-card,.rh-world .quest-card,.rh-world .hero-console,.rh-world .panel,.rh-world .filter-panel,.rh-world .detail-card,.rh-world .submit-story-card,.rh-world .quiz-panel,.rh-world .library,.rh-world .card-grid>*,.rh-world .subject-grid>*{transition:transform .14s cubic-bezier(.2,.75,.25,1),border-color .18s ease}
    .rh-world .rh-tilting{will-change:transform;transform-style:preserve-3d}
    .rh-hub .portal,.rh-hub .feature{transform-style:preserve-3d}
    @media(max-width:560px){.rh-bridge{gap:9px!important}.rh-bridge nav{width:100%;margin-left:0}.rh-bridge nav a{font-size:11px;padding:7px 9px}}
    @media(prefers-reduced-motion:reduce){.rh-world .rh-bridge nav a,.rh-world .portal,.rh-world .feature,.rh-world .topic-card,.rh-world .stat-card,.rh-world .pull-card,.rh-world .pull-movie,.rh-world .story,.rh-world .subject-card,.rh-world .source-card,.rh-world .quest-card,.rh-world .hero-console,.rh-world .panel,.rh-world .filter-panel,.rh-world .detail-card,.rh-world .submit-story-card,.rh-world .quiz-panel,.rh-world .library,.rh-world .card-grid>*,.rh-world .subject-grid>*{transition:none!important}}
  `;
  document.head.appendChild(style);
  if (reduceMotion || !finePointer || isHub) return;

  /* Keep the 3D effect on the single hovered surface only. */
  var sel = ".portal,.feature,.topic-card,.stat-card,.pull-card,.pull-movie,.story,.subject-card,.source-card,.quest-card,.hero-console,.panel,.filter-panel,.detail-card,.submit-story-card,.quiz-panel,.library,.card-grid>*,.subject-grid>*";
  var active = null;
  var frame = 0;
  var pointerX = 0;
  var pointerY = 0;

  function reset(card){
    if (!card) return;
    card.classList.remove("rh-tilting");
    card.style.transform = "";
  }
  function paint(){
    frame = 0;
    var card = active;
    if (!card || !card.isConnected) return;
    var rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var x = Math.max(0,Math.min(1,(pointerX-rect.left)/rect.width));
    var y = Math.max(0,Math.min(1,(pointerY-rect.top)/rect.height));
    var rx = ((.5-y)*4.2).toFixed(2);
    var ry = ((x-.5)*5.2).toFixed(2);
    card.style.transform = "perspective(900px) rotateX("+rx+"deg) rotateY("+ry+"deg) translate3d(0,-2px,0)";
  }
  document.addEventListener("pointermove",function(event){
    var card = event.target && event.target.closest ? event.target.closest(sel) : null;
    if (card !== active) {
      reset(active);
      active = card;
      if (active) active.classList.add("rh-tilting");
    }
    if (!active) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!frame) frame = requestAnimationFrame(paint);
  },{passive:true});

  document.addEventListener("pointerout",function(event){
    var card = event.target && event.target.closest ? event.target.closest(sel) : null;
    if (!card || card.contains(event.relatedTarget)) return;
    if (card === active) {
      reset(active);
      active = null;
    }
  },{passive:true});
  window.addEventListener("blur",function(){reset(active);active=null;},{passive:true});
})();