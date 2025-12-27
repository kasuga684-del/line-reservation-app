const LIFF_App = {
    shopId: 'demo',
    selectedCastId: null,
    castsData: [],

    init: async function() {
        const params = new URLSearchParams(window.location.search);
        if(params.has('shop')) this.shopId = params.get('shop');
        await this.loadCasts();
        await this.loadMenu();
    },

    postData: async function(act, pl = {}) {
        const url = CONFIG.API_URL;
        const body = { action: act, shop_id: this.shopId, ...pl };
        try {
            const res = await fetch(url, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) });
            return await res.json();
        } catch (e) { alert('通信エラー'); throw e; }
    },

    loadCasts: async function() {
        const res = await this.postData('get_casts');
        this.castsData = res.data;
        const container = document.getElementById('cast-grid');
        container.innerHTML = '';
        if(this.castsData.length === 0) { container.innerHTML = '<p style="text-align:center;padding:20px;">現在キャストは表示できません。</p>'; return; }
        
        this.castsData.forEach(c => {
            const card = document.createElement('div');
            card.className = 'cast-card';
            card.onclick = () => this.showCastDetail(c.id);
            const imgUrl = c.image_url ? c.image_url : 'https://via.placeholder.com/300x400/ffb6c1/ffffff?text=No+Image';
            card.innerHTML = `
                <div class="cast-img-wrapper"><div class="cast-img" style="background-image: url('${imgUrl}');"></div></div>
                <div class="cast-info"><h3>${c.name} <small>(${c.age})</small></h3><p class="meta">T${c.height} / BWH:${c.sizes}</p></div>
            `;
            container.appendChild(card);
        });
    },

    showCastDetail: function(castId) {
        const cast = this.castsData.find(c => c.id === castId);
        if(!cast) return;
        this.selectedCastId = castId;
        const imgUrl = cast.image_url ? cast.image_url : 'https://via.placeholder.com/400x500/ffb6c1/ffffff?text=No+Image';
        document.getElementById('detail-img').style.backgroundImage = `url('${imgUrl}')`;
        document.getElementById('detail-name').textContent = cast.name;
        document.getElementById('detail-age').textContent = `(${cast.age}歳)`;
        document.getElementById('detail-meta').textContent = `T${cast.height}cm / BWH: ${cast.sizes}`;
        document.getElementById('detail-intro').innerHTML = cast.introduction ? cast.introduction.replace(/\n/g, '<br>') : 'よろしくお願いします！';
        this.switchView('view-detail');
        window.scrollTo(0, 0);
    },

    showBookingForm: function() {
        const cast = this.castsData.find(c => c.id === this.selectedCastId);
        document.getElementById('target-cast-name').textContent = cast ? cast.name : '';
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('res-date').value = today;
        this.switchView('view-form');
        window.scrollTo(0, 0);
    },

    switchView: function(viewId) {
        ['view-list', 'view-detail', 'view-form'].forEach(id => { document.getElementById(id).classList.add('hidden'); });
        document.getElementById(viewId).classList.remove('hidden');
    },

    loadMenu: async function() {
        const res = await this.postData('get_menu');
        const sel = document.getElementById('res-course');
        sel.innerHTML = '<option value="">▼ コースを選択してください ▼</option>';
        res.data.forEach(m => {
            if(m.type === 'course') {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `${m.name} (${m.minutes}分) - ${parseInt(m.price).toLocaleString()}円`;
                sel.appendChild(opt);
            }
        });
    },

    submit: async function() {
        const data = {
            cast_id: this.selectedCastId,
            date: document.getElementById('res-date').value,
            time: document.getElementById('res-time').value,
            course_id: document.getElementById('res-course').value,
            customer_name: document.getElementById('res-name').value,
            customer_tel: document.getElementById('res-tel').value,
            line_id: 'DUMMY_LINE_ID'
        };
        if(!data.date || !data.time || !data.course_id || !data.customer_name || !data.customer_tel) { alert('すべての項目を入力してください。'); return; }
        const btn = document.getElementById('btn-submit');
        btn.disabled = true; btn.textContent = '送信中...';
        const res = await this.postData('save_reservation', data);
        if(res.status === 'success') {
            alert('予約リクエストを送信しました！\nお店からの連絡をお待ちください。');
            location.reload();
        } else { alert('エラー: ' + res.message); btn.disabled = false; }
    }
};
document.addEventListener('DOMContentLoaded', () => LIFF_App.init());
