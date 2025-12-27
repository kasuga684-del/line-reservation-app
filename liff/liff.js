const LIFF_App = {
    shopId: 'demo',
    selectedCastId: null,
    castsData: [],
    bookingData: { date: null, time: null },

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
        } catch (e) { console.error(e); alert('通信エラーが発生しました。時間を置いて再試行してください。'); throw e; }
    },

    loadCasts: async function() {
        const res = await this.postData('get_casts');
        this.castsData = res.data;
        const container = document.getElementById('cast-grid');
        container.innerHTML = '';
        if(!this.castsData || this.castsData.length === 0) { container.innerHTML = '<p style="text-align:center;padding:20px;">現在キャストは表示できません。</p>'; return; }
        
        this.castsData.forEach(c => {
            const card = document.createElement('div');
            card.className = 'cast-card';
            // ここでクリックイベントを設定
            card.onclick = () => this.showCastDetail(c.id);
            
            const imgUrl = c.image_url ? c.image_url : 'https://via.placeholder.com/300x400/ffb6c1/ffffff?text=No+Image';
            card.innerHTML = `
                <div class="cast-img-wrapper"><div class="cast-img" style="background-image: url('${imgUrl}');"></div></div>
                <div class="cast-info"><h3>${c.name} <small>(${c.age})</small></h3><p class="meta">T${c.height}</p></div>
            `;
            container.appendChild(card);
        });
    },

    showCastDetail: async function(castId) {
        console.log('Clicked cast:', castId);
        const cast = this.castsData.find(c => c.id === castId);
        if(!cast) return;
        
        this.selectedCastId = castId;
        
        // 画面切り替え（データ取得前に切り替えて体感速度を上げる）
        this.switchView('view-detail');
        window.scrollTo(0, 0);

        // 基本情報セット
        const imgUrl = cast.image_url ? cast.image_url : 'https://via.placeholder.com/400x500/ffb6c1/ffffff?text=No+Image';
        document.getElementById('detail-img').style.backgroundImage = `url('${imgUrl}')`;
        document.getElementById('detail-name').textContent = cast.name;
        document.getElementById('detail-age').textContent = `(${cast.age}歳)`;
        document.getElementById('detail-meta').textContent = `T${cast.height}cm / BWH: ${cast.sizes}`;
        document.getElementById('detail-intro').innerHTML = cast.introduction ? cast.introduction.replace(/\n/g, '<br>') : 'よろしくお願いします！';
        
        // スケジュール表の取得
        document.getElementById('schedule-matrix').innerHTML = '<div style="padding:20px;text-align:center;">スケジュール確認中...</div>';
        await this.loadWeeklySchedule(castId);
    },

    loadWeeklySchedule: async function(castId) {
        // GAS側で新機能がデプロイされていないとここでエラーになる
        try {
            const res = await this.postData('get_weekly_availability', { cast_id: castId });
            this.renderMatrix(res.data);
        } catch(e) {
            document.getElementById('schedule-matrix').innerHTML = '<div style="color:red;padding:20px;text-align:center;">スケジュールの読み込みに失敗しました。<br>お店にお電話ください。</div>';
        }
    },

    renderMatrix: function(data) {
        const matrix = document.getElementById('schedule-matrix');
        let html = '<table class="sch-table"><thead><tr><th>時間</th>';
        data.forEach(d => {
            const dateObj = new Date(d.date);
            const dayStr = ['日','月','火','水','木','金','土'][dateObj.getDay()];
            const mmdd = (dateObj.getMonth()+1) + '/' + dateObj.getDate();
            const colorClass = dateObj.getDay()===0 ? 'col-sun' : (dateObj.getDay()===6 ? 'col-sat' : '');
            html += `<th class="${colorClass}">${mmdd}<br>${dayStr}</th>`;
        });
        html += '</tr></thead><tbody>';

        const startHour = 12; // 開始時間
        const endHour = 29;   // 終了時間(翌5時)
        
        for (let h = startHour; h < endHour; h++) {
            for (let min = 0; min < 60; min += 30) {
                const hDisp = h % 24;
                const timeStr = `${hDisp.toString().padStart(2,'0')}:${min.toString().padStart(2,'0')}`;
                const timeVal = h * 100 + min; 

                html += `<tr><td class="time-label">${timeStr}</td>`;
                
                data.forEach(day => {
                    let isShift = false;
                    // シフト判定
                    if (day.shift && day.shift.start && day.shift.end) {
                        const sParts = day.shift.start.split(':'); const eParts = day.shift.end.split(':');
                        let sVal = parseInt(sParts[0])*100 + parseInt(sParts[1]);
                        let eVal = parseInt(eParts[0])*100 + parseInt(eParts[1]);
                        if(sVal < 1000) sVal += 2400; // 深夜補正
                        if(eVal < sVal) eVal += 2400;
                        if (timeVal >= sVal && timeVal < eVal) isShift = true;
                    }
                    
                    // 予約済み判定
                    let isBooked = day.bookings.includes(timeStr);

                    if (!isShift || isBooked) {
                        html += '<td class="cell-ng">✕</td>';
                    } else {
                        html += `<td class="cell-ok" onclick="LIFF_App.selectSlot('${day.date}', '${timeStr}')">〇</td>`;
                    }
                });
                html += '</tr>';
            }
        }
        html += '</tbody></table>';
        matrix.innerHTML = html;
    },

    selectSlot: function(date, time) {
        this.bookingData.date = date;
        this.bookingData.time = time;
        this.switchView('view-form');
        document.getElementById('confirm-datetime').textContent = `${date} ${time}～`;
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
            date: this.bookingData.date,
            time: this.bookingData.time,
            course_id: document.getElementById('res-course').value,
            customer_name: document.getElementById('res-name').value,
            customer_tel: document.getElementById('res-tel').value,
            line_id: 'DUMMY_LINE_ID'
        };
        if(!data.course_id || !data.customer_name || !data.customer_tel) { alert('すべての項目を入力してください。'); return; }
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
