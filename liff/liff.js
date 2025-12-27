const LIFF_App = {
    shopId: 'demo', // デモ用固定
    
    init: async function() {
        // URLパラメータがあればshop_id上書き (?shop=xxx)
        const params = new URLSearchParams(window.location.search);
        if(params.has('shop')) this.shopId = params.get('shop');
        
        // 日付初期値：今日
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('res-date').value = today;

        await this.loadCasts();
        await this.loadMenu();
    },

    // API通信 (トークン不要・shop_id必須)
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
        const sel = document.getElementById('res-cast');
        sel.innerHTML = '<option value="">(指名なし)</option>';
        res.data.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name + (c.age ? ` (${c.age})` : '');
            sel.appendChild(opt);
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

    submit: async function() {
        const data = {
            cast_id: document.getElementById('res-cast').value,
            date: document.getElementById('res-date').value,
            time: document.getElementById('res-time').value,
            course_id: document.getElementById('res-course').value,
            customer_name: document.getElementById('res-name').value,
            line_id: 'DUMMY_LINE_ID' // 本番はLIFFから取得
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
