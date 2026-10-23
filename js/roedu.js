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
    openSubjectDetail(name);
  });
  const subjectDialog=document.getElementById("subject-dialog");
  const detailTitle=document.getElementById("subject-dialog-title"),detailGrade=document.getElementById("subject-dialog-grade"),detailNote=document.getElementById("subject-dialog-note"),viewBook=document.getElementById("subject-view-book"),viewCurriculum=document.getElementById("subject-view-curriculum");
  function openSubjectDetail(name){
    detailTitle.textContent=name; detailGrade.textContent="Lớp "+selectedGrade+" · Nguồn sách giáo khoa";
    viewBook.href="/roedu-reader?grade="+encodeURIComponent(selectedGrade)+"&subject="+encodeURIComponent(name);
    viewCurriculum.href=name==="Lịch sử"?"https://moet.gov.vn/content/vanban/Lists/VBPQ/Attachments/1483/vbhn-chuong-trinh-mon-lich-su.pdf":"https://moet.gov.vn/content/tintuc/Lists/News/Attachments/8421/chuong-trinh-tong-the-ctgdpt-2018.pdf";
    detailNote.textContent="Đã xác định cổng sách chính thức theo khối lớp. Tên đầu sách và mục lục chương/bài của môn này chưa được xác minh riêng trong RoEdu; hãy chọn đúng đầu sách trên cổng NXBGDVN. Chỉ sau khi đối chiếu sách và mục lục thực tế mới xuất bản lộ trình học.";
    if(subjectDialog.showModal) subjectDialog.showModal(); else window.open(viewBook.href,"_blank","noopener");
  }
  document.getElementById("subject-dialog-close").addEventListener("click",()=>subjectDialog.close());
  subjectDialog.addEventListener("click",event=>{if(event.target===subjectDialog)subjectDialog.close();});
  const start=document.getElementById("start-quiz"),panel=document.getElementById("quiz-panel"),feedback=document.getElementById("quiz-feedback");
  start.addEventListener("click",function(){panel.hidden=!panel.hidden;start.innerHTML=panel.hidden?'Bắt đầu <span>→</span>':'Ẩn câu hỏi <span>↑</span>';if(!panel.hidden)panel.scrollIntoView({behavior:"smooth",block:"nearest"});});
  document.querySelectorAll("[data-answer]").forEach(btn=>btn.addEventListener("click",function(){
    document.querySelectorAll("[data-answer]").forEach(b=>b.classList.remove("correct","incorrect"));
    if(this.dataset.answer==="b"){this.classList.add("correct");feedback.textContent="Chính xác! x = 12 − 5 = 7. Đây là câu hỏi mẫu, không cộng XP.";}
    else{this.classList.add("incorrect");document.querySelector('[data-answer="b"]').classList.add("correct");feedback.textContent="Chưa đúng. Chuyển 5 sang vế phải: x = 12 − 5 = 7. Đây là câu hỏi mẫu, không cộng XP.";}
  }));
  renderSubjects();
})();