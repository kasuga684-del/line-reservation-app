const LIFF_App = {
    shopId: 'demo',
    selectedCastId: null,
    castsData: [],
    
    // 予約一時データ
    bookingData: {
        date: null,
        time: null,
        courseId: null
    },

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

    showCastDetail: async function(castId) {
        const cast = this.castsData.find(c => c.id === castId);
        if(!cast) return;
        this.selectedCastId = castId;
        const imgUrl = cast.image_url ? cast.image_url : 'https://via.placeholder.com/400x500/ffb6c1/ffffff?text=No+Image';
        document.getElementById('detail-img').style.backgroundImage = `url('${imgUrl}')`;
        document.getElementById('detail-name').textContent = cast.name;
        document.getElementById('detail-age').textContent = `(${cast.age}歳)`;
        document.getElementById('detail-meta').textContent = `T${cast.height}cm / BWH: ${cast.sizes}`;
        document.getElementById('detail-intro').innerHTML = cast.introduction ? cast.introduction.replace(/\n/g, '<br>') : 'よろしくお願いします！';
        
        // スケジュール表の生成（APIから取得）
        document.getElementById('schedule-matrix').innerHTML = '<div style="padding:20px;text-align:center;">スケジュール確認中...</div>';
        this.switchView('view-detail');
        window.scrollTo(0, 0);
        
        await this.loadWeeklySchedule(castId);
    },

    loadWeeklySchedule: async function(castId) {
        const res = await this.postData('get_weekly_availability', { cast_id: castId });
        const matrix = document.getElementById('schedule-matrix');
        matrix.innerHTML = '';

        // テーブルヘッダー (日付)
        let html = '<table class="sch-table"><thead><tr><th>時間</th>';
        res.data.forEach(d => {
            const dateObj = new Date(d.date);
            const dayStr = ['日','月','火','水','木','金','土'][dateObj.getDay()];
            const mmdd = (dateObj.getMonth()+1) + '/' + dateObj.getDate();
            const isSat = dateObj.getDay() === 6;
            const isSun = dateObj.getDay() === 0;
            const colorClass = isSun ? 'col-sun' : (isSat ? 'col-sat' : '');
            html += `<th class="${colorClass}">${mmdd}<br>${dayStr}</th>`;
        });
        html += '</tr></thead><tbody>';

        // タイムスロット (12:00 ～ 29:00 まで30分刻み)
        const startHour = 12;
        const endHour = 29; // 翌朝5時
        
        for (let h = startHour; h < endHour; h++) {
            for (let min = 0; min < 60; min += 30) {
                const hourDisplay = h % 24;
                const timeStr = `${hourDisplay.toString().padStart(2,'0')}:${min.toString().padStart(2,'0')}`;
                // 比較用数値 (例: 1200, 2430)
                const timeVal = h * 100 + min; 

                html += `<tr><td class="time-label">${timeStr}</td>`;
                
                // 各日の判定
                res.data.forEach(day => {
                    // 1. シフトがあるか？
                    let isShift = false;
                    if (day.shift && day.shift.start && day.shift.end) {
                        const sH = parseInt(day.shift.start.split(':')[0]);
                        const sM = parseInt(day.shift.start.split(':')[1]);
                        const eH = parseInt(day.shift.end.split(':')[0]);
                        const eM = parseInt(day.shift.end.split(':')[1]);
                        
                        // 深夜対応（00:00以降は+24して計算）
                        let startVal = sH * 100 + sM;
                        let endVal = eH * 100 + eM;
                        if(startVal < 1000) startVal += 2400; // お店が昼からなので朝の時間は翌日扱い
                        if(endVal < startVal) endVal += 2400;

                        if (timeVal >= startVal && timeVal < endVal) {
                            isShift = true;
                        }
                    }

                    // 2. 予約済みか？
                    let isBooked = false;
                    if(day.bookings.includes(timeStr)) {
                        isBooked = true;
                    }

                    // 判定結果
                    if (!isShift || isBooked) {
                        html += '<td class="cell-ng">✕</td>';
                    } else {
                        // 予約可能 (クリックで予約へ)
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
        // コース選択へ進む
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
