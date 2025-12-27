const LIFF_App = {
    shopId: 'demo',
    selectedCast: null,

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
        const container = document.getElementById('cast-grid');
        container.innerHTML = '';

        res.data.forEach(c => {
            const card = document.createElement('div');
            card.className = 'cast-card';
            // 画像がない場合はダミー
            const imgUrl = c.image_url ? c.image_url : 'https://via.placeholder.com/150?text=No+Image';
            
            card.innerHTML = `
                <div class="cast-img" style="background-image: url('${imgUrl}');"></div>
                <div class="cast-info">
                    <h3>${c.name} (${c.age}歳)</h3>
                    <p class="meta">T${c.height} / ${c.sizes}</p>
                    <p class="intro">${c.introduction ? c.introduction : 'よろしくお願いします！'}</p>
                    <button class="btn-book" onclick="LIFF_App.showBookingForm('${c.id}', '${c.name}')">空き状況を見る</button>
                </div>
            `;
            container.appendChild(card);
        });
    },

    loadMenu: async function() {
        const res = await this.postData('get_menu');
        const sel = document.getElementById('res-course');
        sel.innerHTML = '<option value="">コースを選択してください</option>';
        res.data.forEach(m => {
            if(m.type === 'course') {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `${m.name} - ${m.price}円 (${m.minutes}分)`;
                sel.appendChild(opt);
            }
        });
    },

    // 予約フォームを表示する
    showBookingForm: function(castId, castName) {
        this.selectedCast = castId;
        
        // 画面切り替え
        document.getElementById('view-list').classList.add('hidden');
        document.getElementById('view-form').classList.remove('hidden');
        
        // キャスト名セット
        document.getElementById('target-cast-name').textContent = castName + ' への予約';
        
        // 日付初期値
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('res-date').value = today;
        
        // ページ上部へ
        window.scrollTo(0, 0);
    },

    // 一覧に戻る
    backToList: function() {
        document.getElementById('view-form').classList.add('hidden');
        document.getElementById('view-list').classList.remove('hidden');
    },

    submit: async function() {
        const data = {
            cast_id: this.selectedCast,
            date: document.getElementById('res-date').value,
            time: document.getElementById('res-time').value,
            course_id: document.getElementById('res-course').value,
            customer_name: document.getElementById('res-name').value,
            line_id: 'DUMMY_LINE_ID'
        };

        if(!data.date || !data.time || !data.course_id || !data.customer_name) {
            alert('必須項目を入力してください');
            return;
        }

        const btn = document.getElementById('btn-submit');
        btn.disabled = true;
        btn.textContent = '送信中...';

        const res = await this.postData('save_reservation', data);
        if(res.status === 'success') {
            alert('予約リクエストを送信しました！\nお店からの連絡をお待ちください。');
            location.reload();
        } else {
            alert('エラー: ' + res.message);
            btn.disabled = false;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => LIFF_App.init());
