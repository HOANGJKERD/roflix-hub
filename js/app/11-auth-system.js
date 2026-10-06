// ============================================================
// AUTH SYSTEM
// ============================================================
function openAuthModal(mode = 'login') {
    switchAuthMode(mode);
    const modal = document.getElementById('auth-modal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('open'), 10);
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.classList.remove('open');
    setTimeout(() => modal.classList.add('hidden'), 400);
}

function switchAuthMode(mode) {
    const loginBox = document.getElementById('login-form-box');
    const regBox = document.getElementById('register-form-box');
    if (mode === 'register') {
        loginBox.classList.add('hidden');
        regBox.classList.remove('hidden');
    } else {
        regBox.classList.add('hidden');
        loginBox.classList.remove('hidden');
    }
}

function roflixAuthRedirectUrl() {
    try {
        const url = new URL(window.location.href);
        url.hash = '';
        url.search = '';
        return url.toString();
    } catch (_) {
        return window.location.origin + '/';
    }
}

function roflixAuthErrorMessage(error, fallback) {
    const message = String(error?.message || '').trim();
    const code = String(error?.code || '').trim().toLowerCase();
    if (error?.status === 429 || code === 'over_email_send_rate_limit' || /rate limit|too many requests|after \d+ seconds/i.test(message)) {
        const seconds = message.match(/after\s+(\d+)\s+seconds?/i)?.[1];
        return `Supabase đang giới hạn gửi email. ${seconds ? `Vui lòng chờ khoảng ${seconds} giây rồi thử lại.` : 'Vui lòng chờ một lúc rồi thử lại.'}`;
    }
    if (/one-time token not found|email link is invalid or has expired/i.test(message)) {
        return 'Link xác minh đã hết hạn hoặc đã được dùng. Hãy yêu cầu gửi lại email xác minh mới.';
    }
    return message || fallback;
}

async function resendRoFlixVerification(email) {
    const sb = window.rfSupabase;
    if (!sb || !email) return false;
    const { error } = await sb.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: roflixAuthRedirectUrl() }
    });
    if (error) {
        showToast('error', 'Không gửi được email', roflixAuthErrorMessage(error, 'Không thể gửi lại email xác minh.'));
        return false;
    }
    showToast('success', 'Đã gửi lại email', 'Hãy kiểm tra hộp thư và cả mục Spam/Thư rác.');
    return true;
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pwd = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    if (!name || !email) {
        showToast('error', 'Lỗi', 'Vui lòng nhập tên và email.');
        return;
    }
    if (pwd !== confirm) {
        showToast('error', 'Lỗi', 'Mật khẩu xác nhận không khớp!');
        return;
    }
    if (pwd.length < 6) {
        showToast('error', 'Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự!');
        return;
    }

    const sb = window.rfSupabase;
    if (!sb) {
        showToast('error', 'Lỗi', 'Supabase chưa sẵn sàng. Hãy tải lại trang.');
        return;
    }

    const redirectTo = roflixAuthRedirectUrl();
    const { data, error } = await sb.auth.signUp({
        email,
        password: pwd,
        options: {
            data: { display_name: name },
            emailRedirectTo: redirectTo
        }
    });

    if (error) {
        const message = String(error.message || '');
        const duplicate = /already registered|already exists|user already/i.test(message);
        if (duplicate) {
            showToast('warning', 'Email đã được đăng ký', 'Nếu tài khoản đang chờ xác minh, hãy kiểm tra email hoặc dùng chức năng gửi lại email xác minh.');
        } else {
            showToast('error', 'Đăng ký thất bại', roflixAuthErrorMessage(error, 'Không thể tạo tài khoản.'));
        }
        return;
    }

    const profile = getProfile();
    profile.name = name;
    saveProfile(profile);

    try {
        if (window.rfAnalytics) window.rfAnalytics.track('signup', {
            metadata: { hasSession: !!data?.session, emailVerificationRequired: !data?.session }
        });
    } catch (_) {}

    closeAuthModal();

    if (data?.session) {
        checkUserAuthStatus();
        showToast('success', 'Đăng ký thành công!', `Chào mừng ${name} đến với RoFlix!`);
        return;
    }

    showToast('success', 'Tạo tài khoản thành công!', '📧 RoFlix đã gửi email xác minh. Hãy mở email và bấm “Xác minh tài khoản” trước khi đăng nhập.');
}

async function handleLogin(e) {
    e.preventDefault();
    const input = document.getElementById('login-email').value.trim();
    const pwd = document.getElementById('login-password').value;
    const sb = window.rfSupabase;
    if (!sb) {
        showToast('error', 'Lỗi', 'Supabase chưa sẵn sàng. Hãy tải lại trang.');
        return;
    }

    const { data, error } = await sb.auth.signInWithPassword({ email: input, password: pwd });
    if (error) {
        const message = String(error.message || '');
        if (/email not confirmed/i.test(message)) {
            showToast('warning', 'Email chưa được xác minh', 'Hãy mở email RoFlix để xác minh tài khoản, hoặc gửi lại email xác minh.');
        } else {
            showToast('error', 'Đăng nhập thất bại', roflixAuthErrorMessage(error, message || 'Không thể đăng nhập.'));
        }
        return;
    }
    try { if (window.rfAnalytics) window.rfAnalytics.track('login'); } catch (_) {}
    checkUserAuthStatus();
    closeAuthModal();
    showToast('success', 'Đăng nhập thành công!', `Chào mừng ${data.user?.user_metadata?.display_name || data.user?.email || 'bạn'} trở lại!`);
}

async function mockGoogleAuth() {
    showToast('info', 'Google đã tắt', 'Hãy đăng nhập hoặc tạo tài khoản bằng email và mật khẩu.');
    openAuthModal('login');
}

async function handleLogout() {
    const sb = window.rfSupabase;
    if (sb) await sb.auth.signOut();
    localStorage.removeItem('roflix-current-user');
    checkUserAuthStatus();
    showToast('info', 'Đã đăng xuất', 'Hẹn gặp lại bạn!');
}

async function checkUserAuthStatus() {
    const navContainer = document.getElementById('user-nav-container');
    if (!navContainer) return;
    let user = null;
    try {
        const sb = window.rfSupabase;
        if (sb) {
            const { data } = await sb.auth.getUser();
            user = data?.user || null;
            if (user) {
                try {
                    const profileRes = await sb.from('profiles').select('account_status,display_name,role').eq('id', user.id).maybeSingle();
                    const accountStatus = profileRes?.data?.account_status || 'active';
                    if (accountStatus !== 'active') {
                        await sb.auth.signOut();
                        user = null;
                        showToast('error', 'Tài khoản bị hạn chế', accountStatus === 'banned' ? 'Tài khoản này đã bị cấm.' : 'Tài khoản này đang bị tạm khóa.');
                    }
                } catch (_) {}
            }
        }
    } catch (_) {}

    navContainer.classList.remove('hidden');
    navContainer.setAttribute('aria-hidden', 'false');
    if (user && (user.email || user.id)) {
        try {
            localStorage.setItem('roflix-current-user', JSON.stringify({
                id: user.id,
                email: user.email || '',
                name: user.user_metadata?.display_name || user.email || 'RoFlix User'
            }));
        } catch (_) {}
        const displayName = String(user.user_metadata?.display_name || user.email || 'RoFlix User').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
        navContainer.innerHTML = `
            <div class="relative group">
                <button class="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-gray-900/90 hover:bg-gray-800 text-white font-bold px-3 py-2 text-xs sm:text-sm transition max-w-[180px]" aria-label="Tài khoản">
                    <span class="w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center"><i class="fa-solid fa-user text-[10px]"></i></span>
                    <span class="truncate max-w-[100px]">${displayName}</span><i class="fa-solid fa-chevron-down text-[9px]"></i>
                </button>
                <div class="absolute right-0 mt-2 w-44 glass-premium p-2 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible focus-within:opacity-100 focus-within:visible transition-all z-50">
                    <button onclick="navigateToProfile()" class="w-full text-left px-3 py-2 rounded-lg text-xs text-white hover:bg-amber-500/10 hover:text-amber-400"><i class="fa-solid fa-user mr-2"></i>Hồ sơ của tôi</button>
                    <button onclick="handleLogout()" class="w-full text-left px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10"><i class="fa-solid fa-right-from-bracket mr-2"></i>Đăng xuất</button>
                </div>
            </div>`;
    } else {
        try { localStorage.removeItem('roflix-current-user'); } catch (_) {}
        navContainer.innerHTML = `<button id="user-login-button" onclick="openAuthModal('login')" class="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold px-4 py-2 text-xs sm:text-sm shadow-lg transition active:scale-95 whitespace-nowrap"><i class="fa-solid fa-user"></i><span>Đăng nhập</span></button>`;
    }
    try { if (typeof renderContinueWatching === 'function') renderContinueWatching(); } catch (_) {}
}
