// ============================================================
        // EDIT PROFILE
        // ============================================================
        function openEditProfile() {
            const profile = getProfile();
            document.getElementById('edit-name').value = profile.name || '';
            document.getElementById('edit-bio').value = profile.bio || '';
            document.getElementById('edit-country').value = profile.country || 'Việt Nam';
            document.getElementById('edit-fav-movie').value = profile.favoriteMovie || '';
            document.getElementById('edit-birthday').value = profile.birthday || '';
            document.getElementById('edit-banner').value = profile.banner !== 'default' ? profile.banner : '';
            
            const modal = document.getElementById('edit-profile-modal');
            modal.classList.remove('hidden');
            setTimeout(() => modal.classList.add('open'), 10);
        }

        function closeEditProfile() {
            const modal = document.getElementById('edit-profile-modal');
            modal.classList.remove('open');
            setTimeout(() => modal.classList.add('hidden'), 400);
        }

        document.getElementById('edit-profile-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            const profile = getProfile();
            profile.name = document.getElementById('edit-name').value.trim() || 'Người dùng';
            profile.bio = document.getElementById('edit-bio').value.trim() || 'Chào mừng đến với RoFlix! 🎬';
            profile.country = document.getElementById('edit-country').value;
            profile.favoriteMovie = document.getElementById('edit-fav-movie').value.trim();
            profile.birthday = document.getElementById('edit-birthday').value;
            
            const bannerUrl = document.getElementById('edit-banner').value.trim();
            if (bannerUrl && bannerUrl.startsWith('http')) {
                profile.banner = bannerUrl;
            } else {
                profile.banner = 'default';
            }
            
            saveProfile(profile);
            
            try {
                const sb = window.rfSupabase;
                if (sb) {
                    const { error } = await sb.auth.updateUser({ data: { display_name: profile.name } });
                    if (error) console.warn('[RoFlix] Không cập nhật được display_name trên Supabase:', error.message);
                }
                await checkUserAuthStatus();
            } catch (err) {
                console.warn('[RoFlix] Cập nhật profile cloud thất bại:', err);
            }
            
            closeEditProfile();
            renderProfile();
            showToast('success', '✅ Đã cập nhật!', 'Hồ sơ của bạn đã được lưu.');
        });
