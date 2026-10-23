(() => {
  "use strict";
  if (window.__rohubLegalModalLoaded) return;
  window.__rohubLegalModalLoaded = true;

  const style = document.createElement("style");
  style.textContent = `
    .rohub-legal-footer{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:10px;margin:18px auto 8px;padding:0 14px}
    .rohub-legal-trigger{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:42px;padding:10px 17px;border:1px solid rgba(245,158,11,.48);border-radius:999px;background:linear-gradient(135deg,rgba(245,158,11,.13),rgba(139,92,246,.13));color:#f8fafc;font:inherit;font-size:13px;font-weight:700;line-height:1.35;letter-spacing:.15px;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.18);transition:transform .18s ease,border-color .18s ease,background .18s ease}
    .rohub-legal-trigger:hover{transform:translateY(-1px);border-color:#f59e0b;background:linear-gradient(135deg,rgba(245,158,11,.22),rgba(139,92,246,.2))}
    .rohub-legal-trigger:focus-visible,.rohub-legal-close:focus-visible{outline:3px solid #a78bfa;outline-offset:3px}
    .rohub-legal-dialog{width:min(760px,calc(100% - 28px));max-width:760px;max-height:min(86dvh,820px);padding:0;border:1px solid rgba(167,139,250,.35);border-radius:22px;background:#0b0d14;color:#f3f4f6;box-shadow:0 28px 100px rgba(0,0,0,.68);overflow:hidden}
    .rohub-legal-dialog::backdrop{background:rgba(3,4,10,.78);backdrop-filter:blur(8px)}
    .rohub-legal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:22px 24px 18px;border-bottom:1px solid rgba(255,255,255,.09);background:radial-gradient(circle at 0 0,rgba(245,158,11,.14),transparent 52%),radial-gradient(circle at 100% 0,rgba(139,92,246,.16),transparent 48%),#0d0f18}
    .rohub-legal-eyebrow{margin:0 0 7px;color:#fbbf24;font-size:10px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase}
    .rohub-legal-title{margin:0;color:#fff;font-size:clamp(21px,4vw,29px);line-height:1.2;font-weight:850;letter-spacing:-.6px}
    .rohub-legal-subtitle{margin:8px 0 0;color:#a9afc0;font-size:13px;line-height:1.65}
    .rohub-legal-close{flex:0 0 38px;width:38px;height:38px;border:1px solid rgba(255,255,255,.13);border-radius:12px;background:rgba(255,255,255,.05);color:#e5e7eb;font-size:22px;line-height:1;cursor:pointer}
    .rohub-legal-close:hover{background:rgba(255,255,255,.12)}
    .rohub-legal-body{padding:20px 24px 24px;overflow:auto;max-height:calc(min(86dvh,820px) - 110px);overscroll-behavior:contain}
    .rohub-legal-notice{margin:0 0 18px;padding:13px 15px;border:1px solid rgba(245,158,11,.25);border-radius:14px;background:rgba(245,158,11,.07);color:#e5e7eb;font-size:13px;line-height:1.7}
    .rohub-legal-section{margin:0 0 19px}
    .rohub-legal-section h3{display:flex;align-items:center;gap:9px;margin:0 0 7px;color:#f9fafb;font-size:15px;line-height:1.4}
    .rohub-legal-section h3 span{color:#fbbf24}
    .rohub-legal-section p,.rohub-legal-section li{color:#b9c0d0;font-size:13px;line-height:1.8}
    .rohub-legal-section p{margin:0}
    .rohub-legal-section ul{margin:7px 0 0;padding-left:20px}
    .rohub-legal-footer-note{margin:20px 0 0;padding-top:14px;border-top:1px solid rgba(255,255,255,.09);color:#858da0;font-size:11px;line-height:1.7}
    @media(max-width:560px){.rohub-legal-head{padding:18px 17px 15px}.rohub-legal-body{padding:16px 17px 20px}.rohub-legal-title{font-size:22px}.rohub-legal-subtitle{font-size:12px}.rohub-legal-trigger{width:100%;max-width:340px}.rohub-legal-dialog{border-radius:18px}}
    @media(prefers-reduced-motion:reduce){.rohub-legal-trigger{transition:none}}
  `;
  document.head.appendChild(style);

  const footer = document.querySelector("footer");
  if (footer) {
    const footerActions = document.createElement("div");
    footerActions.className = "rohub-legal-footer";
    footerActions.innerHTML = '<button class="rohub-legal-trigger" type="button" aria-haspopup="dialog" aria-controls="rohub-legal-dialog"><span aria-hidden="true">📜</span> Pháp lý &amp; mục đích RoHub</button>';
    footer.appendChild(footerActions);
  }

  const dialog = document.createElement("dialog");
  dialog.id = "rohub-legal-dialog";
  dialog.className = "rohub-legal-dialog";
  dialog.setAttribute("aria-labelledby", "rohub-legal-title");
  dialog.innerHTML = `
    <div class="rohub-legal-head">
      <div>
        <p class="rohub-legal-eyebrow">ROHUB · TRANSPARENCY CENTER</p>
        <h2 class="rohub-legal-title" id="rohub-legal-title">Pháp lý &amp; mục đích RoHub</h2>
        <p class="rohub-legal-subtitle">Thông tin về định hướng dự án, nguồn nội dung và quyền của các bên liên quan.</p>
      </div>
      <button class="rohub-legal-close" type="button" aria-label="Đóng cửa sổ pháp lý">×</button>
    </div>
    <div class="rohub-legal-body">
      <p class="rohub-legal-notice"><strong>RoHub</strong> là dự án cá nhân do <strong>Hoangjkerd</strong> phát triển, hướng đến học tập và giải trí, không nhằm mục đích thương mại. Theo mô hình hiện tại, dự án không có quảng cáo hoặc hoạt động cá độ. Mục đích phi lợi nhuận không thay thế việc tuân thủ quyền tác giả và các điều khoản áp dụng.</p>
      <section class="rohub-legal-section">
        <h3><span aria-hidden="true">01</span> Mục đích xây dựng</h3>
        <p>RoHub kết nối các khu vực RoFlix, RoTruyện và RoEdu trong một nền tảng chung. Dự án được phát triển nhằm phục vụ trải nghiệm khám phá, giải trí và học tập; đồng thời khuyến khích người dùng tiếp cận nguồn nội dung và tài liệu phù hợp.</p>
      </section>
      <section class="rohub-legal-section">
        <h3><span aria-hidden="true">02</span> RoFlix · Nguồn phim bên ngoài</h3>
        <p>RoFlix tích hợp dữ liệu, liên kết hoặc trình phát từ các nguồn bên ngoài, trong đó có KKPhim và VSMOV. RoHub không tuyên bố sở hữu bản quyền đối với phim, hình ảnh, poster hoặc tài sản của các bên thứ ba. Việc API miễn phí hoặc nội dung có thể truy cập được không tự nó xác nhận quyền phân phối hay quyền nhúng tại mọi khu vực. Việc tích hợp cần tuân theo điều khoản nguồn và quyền của chủ thể liên quan.</p>
      </section>
      <section class="rohub-legal-section">
        <h3><span aria-hidden="true">03</span> RoTruyện · Manga và bản dịch</h3>
        <p>RoTruyện có thể dẫn tới hoặc tích hợp nội dung từ nguồn bên ngoài như MangaDex, cùng một số bản dịch do cộng tác viên cung cấp. Tên tác giả, nhóm dịch và nguồn được ghi nhận khi thông tin đó có sẵn. Ghi nguồn hoặc được tặng bản dịch không tự động thay thế quyền cần thiết đối với tác phẩm gốc, bản dịch, hình ảnh và việc lưu trữ hoặc hiển thị nội dung.</p>
      </section>
      <section class="rohub-legal-section">
        <h3><span aria-hidden="true">04</span> RoEdu · Mục đích học tập</h3>
        <p>RoEdu hướng đến việc hỗ trợ học sinh học tập. Dự án ưu tiên liên kết đến nguồn chính thức, tài liệu được phép sử dụng, nội dung tự biên soạn và câu hỏi luyện tập mới. Mỗi tài liệu cần được xem xét theo nguồn gốc, giấy phép, điều kiện sử dụng và yêu cầu ghi công tương ứng.</p>
      </section>
      <section class="rohub-legal-section">
        <h3><span aria-hidden="true">05</span> Quyền sở hữu và yêu cầu rà soát</h3>
        <p>Quyền đối với tác phẩm và tài sản trí tuệ thuộc về chủ sở hữu hoặc chủ thể có quyền hợp pháp tương ứng. RoHub không xem việc ghi nguồn, liên kết hoặc nhúng là bằng chứng tự động về giấy phép. Chủ sở hữu quyền hoặc đại diện được ủy quyền khi yêu cầu rà soát nên cung cấp URL cụ thể, thông tin chứng minh quyền hoặc ủy quyền và nội dung yêu cầu để dự án có cơ sở xem xét.</p>
      </section>
      <section class="rohub-legal-section">
        <h3><span aria-hidden="true">06</span> Nguyên tắc xử lý</h3>
        <ul>
          <li>Tôn trọng quyền tác giả, điều khoản nguồn và phạm vi giấy phép được xác minh.</li>
          <li>Không coi nội dung miễn phí hoặc mục đích phi lợi nhuận là sự cho phép sao chép, lưu trữ hay phân phối lại.</li>
          <li>Rà soát các yêu cầu bản quyền cụ thể và xem xét hạn chế hoặc gỡ nội dung phù hợp khi có căn cứ.</li>
        </ul>
      </section>
      <p class="rohub-legal-footer-note">Thông tin này giải thích mục đích và nguyên tắc của dự án, không phải tư vấn pháp lý và không thay thế giấy phép hoặc xác nhận quyền sử dụng cho từng tác phẩm. Tình trạng nguồn và điều kiện sử dụng có thể thay đổi theo thời gian.</p>
    </div>
  `;
  document.body.appendChild(dialog);

  const trigger = document.querySelector(".rohub-legal-trigger");
  const closeButton = dialog.querySelector(".rohub-legal-close");
  const closeDialog = () => {
    if (dialog.open) dialog.close();
    if (trigger) trigger.focus();
  };

  if (trigger) {
    trigger.addEventListener("click", () => {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      closeButton.focus();
    });
  }
  closeButton.addEventListener("click", closeDialog);
  dialog.addEventListener("click", event => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener("close", () => {
    if (trigger && document.activeElement !== trigger) trigger.focus();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && dialog.open) closeDialog();
  });
})();