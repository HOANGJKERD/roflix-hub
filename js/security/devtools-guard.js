(function () {
      const block = document.getElementById('devtools-block');
      if (!block) return;
      let open = false;
      function setBlock(state) {
        if (open === state) return;
        open = state;
        block.style.display = state ? 'flex' : 'none';
        try { document.body.style.overflow = state ? 'hidden' : ''; } catch (_) {}
      }
      document.addEventListener('keydown', function (e) {
        const k = (e.key || '').toUpperCase();
        if (
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(k)) ||
          (e.ctrlKey && k === 'U')
        ) {
          e.preventDefault();
          setBlock(true);
        }
      }, true);
      document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
      });
      function check() {
        const threshold = 160;
        const widthDiff = window.outerWidth - window.innerWidth > threshold;
        const heightDiff = window.outerHeight - window.innerHeight > threshold;
        // Chỉ bật khi lệch rõ (tránh false positive trên mobile)
        if (window.innerWidth < 768) {
          setBlock(false);
          return;
        }
        setBlock(widthDiff || heightDiff);
      }
      setInterval(check, 900);
      window.addEventListener('resize', check);
    })();
