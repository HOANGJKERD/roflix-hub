/* RoFlix Watch Party Realtime
 * Supabase Realtime Broadcast + Presence.
 * No service key is used. Works across browsers/devices on the same Supabase project.
 */
(function () {
  const state = {
    channel: null,
    code: '',
    isHost: false,
    presenceId: 'u-' + Math.random().toString(36).slice(2, 10),
    lastState: null,
    suppress: false,
    chat: []
  };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const $ = id => document.getElementById(id);

  function getClient() {
    return window.rfSupabase || null;
  }

  function currentEpisodeIndex() {
    const list = window.currentEpisodeList || [];
    const player = $('movie-player');
    if (!list.length || !player) return Number(window.rfLastEpisodeIndex || 0) || 0;
    const src = player.src || '';
    const idx = list.findIndex(e => e && e.link && src === e.link);
    return idx >= 0 ? idx : (Number(window.rfLastEpisodeIndex || 0) || 0);
  }

  function currentRoomState(extra = {}) {
    const idx = currentEpisodeIndex();
    const ep = (window.currentEpisodeList || [])[idx] || {};
    return {
      code: state.code,
      movieSlug: window.currentSlug || '',
      movieTitle: window.currentMovieTitle || '',
      episodeIndex: idx,
      episodeName: ep.name || '',
      sentAt: Date.now(),
      sender: state.presenceId,
      ...extra
    };
  }

  function renderStatus(text, good = true) {
    const el = $('rf-party-status');
    if (el) el.innerHTML = `<span style="color:${good ? '#a7f3d0' : '#fca5a5'}">${esc(text)}</span>`;
  }

  function renderPresence(presences) {
    const el = $('rf-party-members');
    if (!el) return;
    const entries = Object.values(presences || {});
    const metas = []; entries.forEach(arr => (arr || []).forEach(m => metas.push(m || {})));
    const count = Math.max(Object.keys(presences || {}).length, metas.length);
    el.innerHTML = `<div style="color:#9ca3af;font-size:13px;margin-bottom:8px">👥 Đang ở trong phòng: <b style="color:#fbbf24">${count}</b></div><div class="rf-party-member-list">${metas.slice(0,12).map(m=>`<span class="rf-party-member">${m.host?'👑':'👤'} ${esc(m.name||'RoFlix user')}</span>`).join('')}</div>`;
  }

  function renderChat() {
    const box = $('rf-party-chat-list'); if (!box) return;
    box.innerHTML = state.chat.length ? state.chat.slice(-30).map(m=>`<div class="rf-party-chat-msg"><b>${esc(m.name||'User')}</b><span>${new Date(m.at||Date.now()).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</span><p>${esc(m.text||'')}</p></div>`).join('') : '<div class="rf-party-chat-empty">Chưa có tin nhắn. 👋</div>';
    box.scrollTop = box.scrollHeight;
  }

  async function sendChat() {
    const input = $('rf-party-chat-input'); if (!input || !state.channel) return;
    const text = input.value.trim(); if (!text) return;
    const user = await getClient()?.auth?.getUser?.();
    const name = user?.data?.user?.user_metadata?.display_name || user?.data?.user?.email?.split('@')[0] || 'RoFlix user';
    const msg = {name:name.slice(0,40),text:text.slice(0,500),at:Date.now(),sender:state.presenceId};
    state.chat.push(msg); renderChat(); input.value='';
    try { await state.channel.send({type:'broadcast',event:'party_chat',payload:msg}); } catch (_) {}
  }
  window.rfWatchPartySendChat = sendChat;

  function channelName(code) {
    return `roflix-watch-party:${code}`;
  }

  async function leaveChannel() {
    if (!state.channel) return;
    try { await state.channel.untrack(); } catch (_) {}
    try { await getClient()?.removeChannel(state.channel); } catch (_) {}
    state.channel = null;
    state.code = '';
    state.isHost = false;
  }

  async function joinRealtimeParty(code, isHost) {
    const sb = getClient();
    if (!sb) throw new Error('Supabase chưa sẵn sàng.');
    await leaveChannel();
    state.code = code;
    state.isHost = !!isHost;

    const channel = sb.channel(channelName(code), {
      config: { broadcast: { self: false }, presence: { key: state.presenceId } }
    });

    channel
      .on('broadcast', { event: 'party_state' }, ({ payload }) => {
        if (!payload || payload.sender === state.presenceId) return;
        applyRemoteState(payload);
      })
      .on('broadcast', { event: 'party_chat' }, ({ payload }) => {
        if (!payload || payload.sender === state.presenceId) return;
        state.chat.push(payload); renderChat();
      })
      .on('broadcast', { event: 'party_ping' }, ({ payload }) => {
        if (!payload || payload.sender === state.presenceId) return;
        if (state.isHost) return;
        renderStatus(`Đã nhận tín hiệu đồng bộ từ phòng lúc ${new Date(payload.sentAt || Date.now()).toLocaleTimeString()}.`);
      })
      .on('presence', { event: 'sync' }, () => renderPresence(channel.presenceState()))
      .on('presence', { event: 'join' }, () => { renderPresence(channel.presenceState()); if (state.isHost) setTimeout(() => broadcastState({ type: 'member_joined' }), 180); })
      .on('presence', { event: 'leave' }, () => renderPresence(channel.presenceState()));

    await new Promise((resolve, reject) => {
      let done = false;
      channel.subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          done = true;
          try {
            const u = await getClient()?.auth?.getUser?.();
            const name = u?.data?.user?.user_metadata?.display_name || u?.data?.user?.email?.split('@')[0] || 'RoFlix user';
            await channel.track({
              userId: u?.data?.user?.id || null,
              joinedAt: new Date().toISOString(),
              host: state.isHost,
              name: name.slice(0,40)
            });
          } catch (_) {}
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (!done) reject(new Error('Không thể kết nối phòng xem chung.'));
        }
      });
    });

    state.channel = channel;
    state.chat = [];
    renderPresence(channel.presenceState()); renderChat();
    renderStatus(state.isHost ? 'Phòng đã sẵn sàng. Bạn là chủ phòng.' : 'Đã tham gia phòng. Đang chờ chủ phòng đồng bộ.');

    if (state.isHost) {
      setTimeout(() => broadcastState({ type: 'room_ready' }), 250);
    }
  }

  async function broadcastState(extra = {}) {
    if (!state.channel) return;
    const payload = currentRoomState(extra);
    state.lastState = payload;
    try {
      await state.channel.send({ type: 'broadcast', event: 'party_state', payload });
    } catch (e) {
      console.warn('[RoFlix Watch Party]', e);
    }
  }

  async function applyRemoteState(payload) {
    if (!payload || state.suppress) return;
    state.suppress = true;
    try {
      if (payload.movieSlug && payload.movieSlug !== window.currentSlug && typeof viewMovieDetail === 'function') {
        await viewMovieDetail(payload.movieSlug, window.currentSourceId);
        await new Promise(r => setTimeout(r, 250));
      }
      if (Number.isFinite(Number(payload.episodeIndex)) && typeof playMovieByIndex === 'function') {
        const idx = Number(payload.episodeIndex);
        if ((window.currentEpisodeList || [])[idx]) playMovieByIndex(idx, { fromParty: true });
      }
      renderStatus(`Đã đồng bộ: ${payload.movieTitle || 'phim'} · ${payload.episodeName || 'tập ' + ((payload.episodeIndex || 0) + 1)}`);
    } catch (e) {
      console.error('[RoFlix Watch Party] apply state', e);
      renderStatus('Không thể đồng bộ phim/tập từ chủ phòng.', false);
    } finally {
      setTimeout(() => { state.suppress = false; }, 500);
    }
  }

  window.rfWatchPartyBroadcast = function (extra = {}) {
    if (state.channel && state.isHost && !state.suppress) broadcastState(extra);
  };

  window.rfWatchPartyCreate = async function () {
    const title = ($('rf-party-title')?.value || '').trim() || (window.currentMovieTitle || 'Phòng xem RoFlix');
    const code = 'RF-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    const result = $('rf-party-result');
    if (result) result.innerHTML = '⏳ Đang tạo phòng realtime...';
    try {
      await joinRealtimeParty(code, true);
      if (result) result.innerHTML = `<div style="font-size:14px">Đã tạo phòng <b>${esc(title)}</b></div><div style="margin-top:6px">Mã mời: <strong style="font-size:26px;color:#fbbf24">${code}</strong></div><button onclick="navigator.clipboard?.writeText('${code}')" class="bg-gray-700 rounded-lg px-3 py-2 mt-2">Sao chép mã</button>`;
      if (window.currentSlug) await broadcastState({ type: 'host_created', roomTitle: title });
    } catch (e) {
      if (result) result.innerHTML = `<span style="color:#fca5a5">${esc(e.message || 'Không tạo được phòng.')}</span>`;
    }
  };

  window.rfWatchPartyJoin = async function () {
    const code = ($('rf-party-join')?.value || '').trim().toUpperCase();
    if (!code) return renderStatus('Nhập mã phòng trước.', false);
    renderStatus('⏳ Đang kết nối phòng realtime...');
    try {
      await joinRealtimeParty(code, false);
    } catch (e) {
      renderStatus(e.message || 'Không thể tham gia phòng.', false);
    }
  };

  window.rfWatchPartyLeave = async function () {
    await leaveChannel();
    renderStatus('Đã rời phòng xem chung.');
    const members = $('rf-party-members');
    if (members) members.innerHTML = '';
  };

  window.rfWatchPartySyncNow = async function () {
    if (!state.channel) return renderStatus('Bạn chưa tham gia phòng.', false);
    if (!state.isHost) return renderStatus('Chỉ chủ phòng có thể đồng bộ phim/tập.', false);
    await broadcastState({ type: 'manual_sync' });
    renderStatus('Đã gửi trạng thái xem hiện tại cho mọi người.');
  };

  window.rfWatchPartyIsHost = () => state.isHost;

  document.addEventListener('DOMContentLoaded', () => {
    const player = $('movie-player');
    if (!player) return;
    player.addEventListener('load', () => {
      if (state.isHost && !state.suppress) setTimeout(() => broadcastState({ type: 'player_loaded' }), 300);
    });
  });

  window.addEventListener('beforeunload', () => { try { leaveChannel(); } catch (_) {} });
})();
