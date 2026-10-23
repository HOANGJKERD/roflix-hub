(function(){
  "use strict";
  const subjects = [
    {name:"Toán học",icon:"∑",group:"Khoa học tự nhiên"},{name:"Ngữ văn",icon:"文",group:"Ngôn ngữ"},{name:"Tiếng Anh",icon:"A",group:"Ngoại ngữ"},{name:"Vật lí",icon:"ϟ",group:"Khoa học tự nhiên"},
    {name:"Hóa học",icon:"⚗",group:"Khoa học tự nhiên"},{name:"Sinh học",icon:"⌘",group:"Khoa học tự nhiên"},{name:"Lịch sử",icon:"◷",group:"Khoa học xã hội"},{name:"Địa lí",icon:"◎",group:"Khoa học xã hội"},
    {name:"Giáo dục kinh tế và pháp luật",icon:"§",group:"Khoa học xã hội"},{name:"Tin học",icon:"⌘",group:"Công nghệ"},{name:"Công nghệ",icon:"⚙",group:"Công nghệ"},{name:"Giáo dục thể chất",icon:"↗",group:"Phát triển cá nhân"},
    {name:"Giáo dục quốc phòng và an ninh",icon:"✦",group:"Phát triển cá nhân"},{name:"Hoạt động trải nghiệm, hướng nghiệp",icon:"✧",group:"Phát triển cá nhân"},{name:"Nội dung giáo dục địa phương",icon:"⌖",group:"Địa phương"}
  ];
  let selectedGrade = "10";
  const grid = document.getElementById("subject-grid");
  const search = document.getElementById("subject-search");
  const empty = document.getElementById("subject-empty");
  function renderSubjects(){
    const query = (search.value || "").trim().toLocaleLowerCase("vi");
    const filtered = subjects.filter(s => s.name.toLocaleLowerCase("vi").includes(query) || s.group.toLocaleLowerCase("vi").includes(query));
    grid.innerHTML = filtered.map(s => '<button class="subject-card" type="button" data-subject="'+s.name.replace(/"/g,"&quot;")+'"><span class="subject-symbol" aria-hidden="true">'+s.icon+'</span><strong>'+s.name+'</strong><small>Lớp '+selectedGrade+' · '+s.group+'</small></button>').join("");
    empty.hidden = filtered.length > 0;
  }
  document.querySelectorAll(".grade-btn").forEach(btn => btn.addEventListener("click", function(){
    selectedGrade = this.dataset.grade;
    document.querySelectorAll(".grade-btn").forEach(other => {const active=other===this;other.classList.toggle("active",active);other.setAttribute("aria-pressed",String(active));});
    renderSubjects();
  }));
  search.addEventListener("input",renderSubjects);
  grid.addEventListener("click",function(event){
    const card=event.target.closest("[data-subject]");
    if(!card)return;
    const name=card.dataset.subject;
    alert(name+" · Lớp "+selectedGrade+"\n\nĐây là khung điều hướng ban đầu. Chương, bài học và tài liệu sẽ chỉ được xuất bản sau khi nguồn được kiểm tra.");
  });
  const start=document.getElementById("start-quiz"),panel=document.getElementById("quiz-panel"),feedback=document.getElementById("quiz-feedback");
  start.addEventListener("click",function(){panel.hidden=!panel.hidden;start.innerHTML=panel.hidden?'Bắt đầu <span>→</span>':'Ẩn câu hỏi <span>↑</span>';if(!panel.hidden)panel.scrollIntoView({behavior:"smooth",block:"nearest"});});
  document.querySelectorAll("[data-answer]").forEach(btn=>btn.addEventListener("click",function(){
    document.querySelectorAll("[data-answer]").forEach(b=>b.classList.remove("correct","incorrect"));
    if(this.dataset.answer==="b"){this.classList.add("correct");feedback.textContent="Chính xác! x = 12 − 5 = 7. Đây là câu hỏi mẫu, không cộng XP.";}
    else{this.classList.add("incorrect");document.querySelector('[data-answer="b"]').classList.add("correct");feedback.textContent="Chưa đúng. Chuyển 5 sang vế phải: x = 12 − 5 = 7. Đây là câu hỏi mẫu, không cộng XP.";}
  }));
  renderSubjects();
})();