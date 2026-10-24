
(function(){
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var path = location.pathname.toLowerCase();
  var world = path.indexOf("roflix") >= 0 ? "flix" : path.indexOf("rotruyen") >= 0 ? "story" : path.indexOf("roedu") >= 0 ? "edu" : "";
  if (!world) return;
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
  if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;
  var sel = ".movie-card-premium,.topic-card,.story,.subject-card,.source-card,.quest-card,.hero-console";
  document.addEventListener("pointermove", function(event){
    var card = event.target.closest(sel);
    if (!card) return;
    var rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var x = (event.clientX - rect.left) / rect.width;
    var y = (event.clientY - rect.top) / rect.height;
    card.classList.add("rh-tilting");
    card.style.transform = "perspective(900px) rotateX(" + ((0.5 - y) * 7).toFixed(2) + "deg) rotateY(" + ((x - 0.5) * 9).toFixed(2) + "deg) translateY(-4px)";
  }, {passive:true});
  document.addEventListener("pointerout", function(event){
    var card = event.target.closest && event.target.closest(sel);
    if (!card || card.contains(event.relatedTarget)) return;
    card.classList.remove("rh-tilting");
    card.style.transform = "";
  });
})();
