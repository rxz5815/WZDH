document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
    let categoryOrder = [];
    let activeSubFilters = {}; 
    let currentEngine = "https://www.baidu.com/s?wd=";
    
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // --- [1. 新增：SVG小地球图标 (Base64) 和 智能抓取函数] ---
    const GLOBE_ICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7.06-3.6-7.55-7.55H5.4c.45 2.13 2.11 3.84 4.25 4.3l.35 3.25zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm6.65-5.35c-.49 3.95-3.6 7.06-7.55 7.55l.35-3.25c2.14-.46 3.8-2.17 4.25-4.3h2.95zM4.45 11.45c.49-3.95 3.6-7.06 7.55-7.55l-.35 3.25c-2.14.46-3.8 2.17-4.25 4.3H4.45zm14.15 0c-.45-2.13-2.11-3.84-4.25-4.3l.35-3.25c3.95.49 7.06 3.6 7.55 7.55h-3.65z'/%3E%3C/svg%3E`;

    async function getSmartIcon(targetUrl) {
        if (!targetUrl || targetUrl.includes('placeholder')) return GLOBE_ICON;
        let domain = "";
        try { domain = new URL(targetUrl).hostname; } catch (e) { domain = targetUrl; }

        // 并联第一梯队（最快、最清晰）
        const tier1 = [
            `https://favicon.im/?url=${domain}&size=64`,
            `https://favicon.vemetric.com/${domain}&size=64&format=png`,
            `https://favicon.is/${domain}?larger=true`
        ];
        // 并联第二梯队（稳定性补丁）
        const tier2 = [
            `https://faviconsnap.com/api/favicon?url=${domain}`,
            `https://icons.duckduckgo.com/ip3/${domain}.ico`,
            `https://api.afmax.cn/so/ico/index.php?r=${targetUrl}`
        ];

        const checkImage = (url) => new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => (img.width > 1) ? resolve(url) : reject();
            img.onerror = reject;
            img.src = url;
        });

        try {
            return await Promise.any(tier1.map(checkImage));
        } catch (e) {
            try {
                return await Promise.any(tier2.map(checkImage));
            } catch (e2) {
                return GLOBE_ICON; // 最终兜底
            }
        }
    }

    const grads = [
        'linear-gradient(to right, #0f0c29,#302b63,#24243e)',
        'linear-gradient(to right, #667db6,#0082c8,#667db6)',
        'linear-gradient(to right, #373b44,#4286f4)',
        'linear-gradient(to right, #355c7d,#6c5b7b,#c06c84)',
        'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', 
        'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
        'linear-gradient(135deg, #202124 0%, #3c4043 100%)', 
        'linear-gradient(135deg, #2c3e50 0%, #4ca1af 80%)',
        'linear-gradient(45deg, #3d2b56 0%, #8e54e9 80%)', 
        'linear-gradient(135deg, #283048 0%, #859398 80%)',
        'linear-gradient(45deg, #1e2a38 0%, #5a7fa5 80%)', 
        'linear-gradient(135deg, #192841 0%, #607d8b 80%)',
        'linear-gradient(45deg, #271f30 0%, #7b4397 80%)', 
        'linear-gradient(135deg, #182c39 0%, #486a78 80%)',
        'linear-gradient(45deg, #221d2e 0%, #614e77 80%)', 
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    ];

    const updateBg = (val, save = true) => {
        const bg = document.getElementById('bg-canvas');
        if(val.startsWith('http')) bg.style.backgroundImage = `url(${val})`;
        else bg.style.background = val;
        if(save) localStorage.setItem('nav_bg_v18', val);
    };
    updateBg(localStorage.getItem('nav_bg_v18') || grads[0]);

    document.getElementById('btn-toggle-bg').onclick = () => {
        let curr = localStorage.getItem('nav_bg_v18');
        let nextIdx = (grads.indexOf(curr) + 1) % grads.length;
        updateBg(grads[nextIdx]);
    };

    document.getElementById('btn-random-bg').onclick = async () => {
        const res = await fetch(`https://picsum.photos/1920/1080?random=${Math.random()}`);
        if(res.url) updateBg(res.url);
    };

    async function fetchData() {
        try {
            const res = await fetch('/api/links');
            const data = await res.json();
            allLinks = data.links || [];
            categoryOrder = data.order || [];
            render(); 
            if (document.getElementById('modal-cat').style.display === 'flex') {
                renderCatAdmin();
            }
        } catch (e) { render(); }
    }
    fetchData();

    const catHint = document.getElementById('cat-hint');
    const subCatHint = document.getElementById('sub-cat-hint');
    catHint.onchange = () => updateSubCatDropdown(catHint.value);

    function updateSubCatDropdown(catName, selectedSub = "") {
        subCatHint.innerHTML = '<option value="">选择二级小类</option>';
        if (!catName) return;
        const subs = [...new Set(allLinks.filter(l => l.category === catName && l.subCategory).map(l => l.subCategory))];
        subs.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s; opt.textContent = s;
            if (s === selectedSub) opt.selected = true;
            subCatHint.appendChild(opt);
        });
    }

    function render() {
        const main = document.getElementById('main-content');
        const nav = document.getElementById('category-ul');
        main.innerHTML = ''; nav.innerHTML = '';
        catHint.innerHTML = '<option value="">选择大分类</option>';

        const grouped = allLinks.reduce((acc, l) => {
            if (!acc[l.category]) acc[l.category] = [];
            if (l.title !== 'placeholder_hidden') acc[l.category].push(l);
            return acc;
        }, {});

        let cats = Object.keys(grouped);
        let sortedCats = categoryOrder.filter(c => cats.includes(c));
        cats.forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });

        sortedCats.forEach(cat => {
            nav.innerHTML += `<li><a href="#${cat}">${cat}</a></li>`;
            catHint.innerHTML += `<option value="${cat}">${cat}</option>`;
            
            const sec = document.createElement('section');
            sec.id = cat;
            const subCats = [...new Set(allLinks.filter(l => l.category === cat && l.subCategory).map(l => l.subCategory))];
            const currentSub = activeSubFilters[cat] || 'all';

            let subFilterHtml = '';
            if (subCats.length > 0) {
                subFilterHtml = `<div class="sub-cat-filter">
                    <span class="sub-cat-item ${currentSub === 'all' ? 'active' : ''}" data-sub="all">全部</span>
                    ${subCats.map(s => `<span class="sub-cat-item ${currentSub === s ? 'active' : ''}" data-sub="${s}">${s}</span>`).join('')}
                </div>`;
            }

            sec.innerHTML = `<div class="category-header"><h2 class="category-title">${cat}</h2>${subFilterHtml}</div><div class="link-grid" data-cat="${cat}" data-sub="${currentSub}"></div>`;
            const grid = sec.querySelector('.link-grid');
            
// 绑定子分类切换逻辑：支持点击 + 鼠标划过
            sec.querySelectorAll('.sub-cat-item').forEach(item => {
                const switchSub = () => {
                    const subTarget = item.dataset.sub;
                    // 如果已经是当前选中的，则不重复执行，防止闪烁
                    if (activeSubFilters[cat] === subTarget && item.classList.contains('active')) return;

                    activeSubFilters[cat] = subTarget; 
                    sec.querySelectorAll('.sub-cat-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    grid.dataset.sub = subTarget;
    
                    grid.querySelectorAll('.link-card').forEach(card => {
                        card.style.display = (subTarget === 'all' || card.dataset.sub === subTarget) ? '' : 'none';
                    });
                };

                item.onclick = switchSub;      // 保留点击，兼容移动端
                item.onmouseenter = switchSub; // 核心优化：鼠标移入即触发切换
            });

            grid.ondragover = e => { e.preventDefault(); grid.classList.add('drag-over'); };
            grid.ondragleave = () => grid.classList.remove('drag-over');
            grid.ondrop = async function(e) {
                grid.classList.remove('drag-over');
                const url = e.dataTransfer.getData('text/plain');
                const itemIdx = allLinks.findIndex(l => l.url === url);
                if (itemIdx > -1) {
                    const item = allLinks.splice(itemIdx, 1)[0];
                    const oldCat = item.category;
                    item.category = cat;
                    const currentSub = grid.dataset.sub;
                    if (currentSub !== 'all') item.subCategory = currentSub;
                    else if (oldCat !== cat) item.subCategory = ""; 

                    let insertIdx = -1;
                    for (let i = allLinks.length - 1; i >= 0; i--) {
                        if (allLinks[i].category === cat && (currentSub === 'all' || allLinks[i].subCategory === currentSub)) {
                            insertIdx = i + 1; break;
                        }
                    }
                    if (insertIdx === -1) allLinks.push(item);
                    else allLinks.splice(insertIdx, 0, item);
                    render(); apiReq('updateLinksOrder', { link: allLinks }, true);
                }
            };

            (grouped[cat] || []).forEach(l => {
                const card = createCard(l);
                if (currentSub !== 'all' && l.subCategory !== currentSub) card.style.display = 'none';
                grid.appendChild(card);
            });
            main.appendChild(sec);
        });
    }

function createCard(l) {
    const card = document.createElement('div');
    card.className = 'link-card'; card.draggable = true;
    card.dataset.sub = l.subCategory || "";
    if (l.desc) card.setAttribute('data-desc', l.desc);

        // 1. 初始化：谷歌地址直接转小地球，防止挂起
    const isGoogle = !l.icon || l.icon.includes('google.com');
    const initialIcon = isGoogle ? GLOBE_ICON : l.icon;
    
    card.innerHTML = `
        <div class="card-del" onclick="deleteSite(event, '${l.url}')">&times;</div>
        <img src="${initialIcon}" class="site-icon">
        <h3>${l.title}</h3>
    `;

    const img = card.querySelector('.site-icon');

    // 图标处理函数：判断是否为全球通用API
    const saveIfGlobal = (url) => {
        const globalAPIs = ['favicon.im', 'vemetric.com', 'favicon.is', 'faviconsnap.com'];
        // 修改点：增加一个判断，只有 sessionStorage 里有密码（管理员）才执行保存
        const isAdmin = !!sessionStorage.getItem('auth_pwd_v9');
        
        if (isAdmin && globalAPIs.some(api => url.includes(api))) {
            l.icon = url;
            apiReq('save', { link: l }, true); // 这里的 true 确保是静默保存
        }
    };

    // 核心逻辑：加载失败或原本是谷歌链接时，触发竞速
    img.onerror = async function() {
        if (this.src === GLOBE_ICON) return; 
        const betterIcon = await getSmartIcon(l.url);
        this.src = betterIcon;
        saveIfGlobal(betterIcon);
    };

    if (isGoogle) {
        getSmartIcon(l.url).then(iconUrl => {
            if (iconUrl && iconUrl !== GLOBE_ICON) {
                img.src = iconUrl;
                saveIfGlobal(iconUrl);
            }
        });
    }

        card.onclick = () => window.open(l.url, '_blank');
        card.oncontextmenu = (e) => { e.preventDefault(); openEdit(l); };

        card.ondragstart = (e) => { e.dataTransfer.setData('text/plain', l.url); card.classList.add('dragging'); };
        card.ondragend = () => card.classList.remove('dragging');
        card.ondragover = e => { e.preventDefault(); if (document.querySelector('.dragging') !== card) card.classList.add('drag-insert-before'); };
        card.ondragleave = () => card.classList.remove('drag-insert-before');

card.ondrop = async (e) => {
            e.preventDefault(); e.stopPropagation();
            card.classList.remove('drag-insert-before');
            const draggedUrl = e.dataTransfer.getData('text/plain');
            if (draggedUrl === l.url) return;
            const draggedIdx = allLinks.findIndex(x => x.url === draggedUrl);
            if (draggedIdx === -1) return;
            const item = allLinks.splice(draggedIdx, 1)[0];
            item.category = l.category;
            const grid = card.closest('.link-grid');
            const currentSub = grid.dataset.sub;
            if (currentSub !== 'all') item.subCategory = currentSub;
            const newTargetIdx = allLinks.findIndex(x => x.url === l.url);
            allLinks.splice(newTargetIdx, 0, item);
            
            render(); 
            // 修改点：确保拖拽排序的保存优先级最高，且不被图标修复请求淹没
            setTimeout(() => {
                apiReq('updateLinksOrder', { link: allLinks }, true);
            }, 100); 
        };
        return card;
    }

    function setupSearch(boxSel) {
        const box = document.querySelector(boxSel);
        const inp = box.querySelector('.search-input');
        const engineBar = box.querySelector('.search-engines');
        const isModal = boxSel.includes('modal');
        const resultsArea = document.getElementById('modal-results-area');

        inp.addEventListener('input', function() {
            const q = this.value.trim().toLowerCase();
            const isInt = box.querySelector('.tab.active').dataset.type === 'internal';
            if(!isInt) return;
            if (q.length === 0) {
                if(isModal) resultsArea.innerHTML = '';
                else { document.body.classList.remove('is-searching'); document.querySelectorAll('.link-card, section').forEach(el => el.style.display = ''); }
                return;
            }
            if(isModal) {
                resultsArea.innerHTML = '';
                allLinks.filter(l => l.title !== 'placeholder_hidden' && l.title.toLowerCase().includes(q)).forEach(l => resultsArea.appendChild(createCard(l)));
            } else {
                document.body.classList.add('is-searching');
                document.querySelectorAll('.link-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q) ? 'block' : 'none');
                document.querySelectorAll('section').forEach(sec => {
                    sec.style.display = Array.from(sec.querySelectorAll('.link-card')).some(c => c.style.display !== 'none') ? 'block' : 'none';
                });
            }
        });

        const confirmSearch = () => {
            const q = inp.value.trim();
            const isInt = box.querySelector('.tab.active').dataset.type === 'internal';
            if(q && !isInt) window.open(currentEngine + encodeURIComponent(q), '_blank');
        };
        box.querySelector('.search-trigger-btn').onclick = confirmSearch;
        inp.onkeydown = e => { if(e.key === 'Enter') confirmSearch(); };
        box.querySelectorAll('.tab').forEach(t => t.onclick = () => {
            box.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            const isInt = t.dataset.type === 'internal';
            if(engineBar) engineBar.style.display = isInt ? 'none' : 'flex';
            inp.placeholder = isInt ? "快速检索站内..." : "输入搜索内容";
            inp.value = ""; if(isModal) resultsArea.innerHTML = '';
            else { document.body.classList.remove('is-searching'); document.querySelectorAll('.link-card, section').forEach(el => el.style.display = ''); }
            inp.focus();
        });
    }
    setupSearch('.main-search'); setupSearch('.modal-inner-search');

    document.body.addEventListener('click', e => {
        if(e.target.classList.contains('engine')) {
            document.querySelectorAll('.engine').forEach(x => x.classList.remove('active'));
            e.target.classList.add('active'); currentEngine = e.target.dataset.url;
        }
    });

    document.querySelectorAll('.modal-overlay').forEach(el => el.onclick = () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        document.getElementById('modal-results-area').innerHTML = '';
    });

    window.openEdit = (l = {}) => {
        document.getElementById('modal-link').style.display = 'flex';
        document.getElementById('in-title').value = (l.title === 'placeholder_hidden' ? '' : l.title) || '';
        document.getElementById('in-desc').value = l.desc || '';
        catHint.value = l.category || '';
        updateSubCatDropdown(l.category || '', l.subCategory || '');
        const urlInput = document.getElementById('in-url');
        const prevImg = document.getElementById('prev-img');
        urlInput.value = (l.url?.includes('placeholder') ? '' : l.url) || '';
        if (l.icon && l.icon !== '') { prevImg.src = l.icon; prevImg.classList.add('loaded'); }
        else { prevImg.src = ''; prevImg.classList.remove('loaded'); }
    };

document.getElementById('in-url').oninput = async function() {
    const val = this.value.trim();
    const prevImg = document.getElementById('prev-img');
    if (!val || !val.startsWith('http')) { 
        prevImg.src = ''; 
        prevImg.classList.remove('loaded'); 
        return; 
    }
    // 添加站点时，也使用竞速预览，保证管理员看到的也是高清图
    const fastIcon = await getSmartIcon(val);
    prevImg.src = fastIcon;
    prevImg.classList.add('loaded');
};

    document.getElementById('btn-cat-admin').onclick = () => { renderCatAdmin(); document.getElementById('modal-cat').style.display = 'flex'; };

    
function renderCatAdmin() {
        const box = document.getElementById('cat-list-box');
        if (!box) return;
        box.innerHTML = '';
        
        const cats = [...new Set(allLinks.map(l => l.category))];
        let sortedCats = categoryOrder.filter(c => cats.includes(c));
        cats.forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });

        sortedCats.forEach((c, idx) => {
            // --- 大类行 ---
            const row = document.createElement('div');
            row.className = 'cat-admin-row'; row.draggable = true;
            row.innerHTML = `
                <i class="fas fa-bars drag-handle"></i>
                <input type="text" value="${c}">
                <div class="row-btns">
                    <button class="btn-mini blue" onclick="addSubCat('${c}')">+子类</button>
                    <button class="btn-mini blue" onclick="renameCat('${c}', this)">改名</button>
                    <button class="btn-mini red" onclick="deleteCat('${c}')">删除</button>
                </div>`;
            
            row.ondragstart = (e) => { e.dataTransfer.setData('cat-idx', idx); row.style.opacity = '0.5'; };
            row.ondragend = () => row.style.opacity = '1';
            row.ondragover = e => e.preventDefault();
            row.ondrop = async (e) => {
                e.preventDefault();
                const from = e.dataTransfer.getData('cat-idx');
                if (from === "") return;
                const fromIdx = parseInt(from);
                if (fromIdx === idx) return;
                const newOrder = [...sortedCats];
                const [movedItem] = newOrder.splice(fromIdx, 1);
                newOrder.splice(idx, 0, movedItem);
                categoryOrder = newOrder;
                render();
                renderCatAdmin();
                apiReq('updateOrder', { order: categoryOrder }, true);
            };
            box.appendChild(row);

            // --- 子类列表渲染 ---
            const subCats = [...new Set(allLinks
                .filter(l => l.category === c && l.subCategory)
                .map(l => l.subCategory)
            )];

            if (subCats.length > 0) {
                const subBox = document.createElement('div');
                subBox.className = 'sub-cat-admin-list';
                subCats.forEach((s) => {
                    const sRow = document.createElement('div');
                    sRow.className = 'sub-cat-row';
                    sRow.draggable = true; 
                    sRow.innerHTML = `
                        <i class="fas fa-bars drag-handle" style="font-size:12px; opacity:0.5;"></i>
                        <input type="text" value="${s}">
                        <div class="row-btns">
                            <button class="btn-mini blue" onclick="renameSubCat('${c}', '${s}', this)">改名</button>
                            <button class="btn-mini red" onclick="deleteSubCat('${c}', '${s}')">删除</button>
                        </div>`;
                    
                    sRow.ondragstart = (e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData('sub-parent', c);
                        e.dataTransfer.setData('sub-name', s);
                        sRow.style.opacity = '0.5';
                    };
                    sRow.ondragend = () => sRow.style.opacity = '1';
                    sRow.ondragover = e => e.preventDefault();
                    sRow.ondrop = async (e) => {
                        e.preventDefault(); e.stopPropagation();
                        const pCat = e.dataTransfer.getData('sub-parent');
                        const fSub = e.dataTransfer.getData('sub-name');
                        if (pCat !== c || fSub === s) return;

                        const otherLinks = allLinks.filter(l => !(l.category === c && l.subCategory === fSub));
                        const movingLinks = allLinks.filter(l => l.category === c && l.subCategory === fSub);
                        const tPos = otherLinks.findIndex(l => l.category === c && l.subCategory === s);
                        otherLinks.splice(tPos, 0, ...movingLinks);
                        allLinks = otherLinks;

                        render();
                        renderCatAdmin();
                        apiReq('updateLinksOrder', { link: allLinks }, true);
                    };
                    subBox.appendChild(sRow);
                });
                box.appendChild(subBox);
            }
        });
    }

async function apiReq(action, data, noRefresh = false) {
        // 修改点：不再主动弹窗，而是先看有没有存下的密码
        let pwd = sessionStorage.getItem('auth_pwd_v9');
        
        // 如果没有密码且不是静默操作（比如是手动点删除/改名），才弹窗问
        if(!pwd && !noRefresh) {
            pwd = prompt("管理密码:");
        }
        
        if(!pwd) return false;

        try {
            const res = await fetch('/api/links', { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({ ...data, password: pwd, action }) 
            });
            
            if(res.ok) { 
                sessionStorage.setItem('auth_pwd_v9', pwd); 
                if(!noRefresh) await fetchData(); 
                return true; 
            }
            if(res.status === 401) { 
                // 只有手动操作失败才提醒密码错误
                if(!noRefresh) alert("密码错误！"); 
                sessionStorage.removeItem('auth_pwd_v9'); 
            }
        } catch(e) { console.error(e); }
        return false;
    }

    window.deleteSite = (e, u) => { e.stopPropagation(); if(confirm("确定删除吗？")) apiReq('delete', { link: {url:u} }); };
    window.renameCat = (old, btn) => apiReq('renameCategory', { oldCategory: old, newCategory: btn.closest('.cat-admin-row').querySelector('input').value });
    window.deleteCat = (cat) => confirm(`确定要删除分类 "${cat}" 及其所有站点吗？`) && apiReq('deleteCategory', { oldCategory: cat });
    window.addNewCategory = () => {
        const n = document.getElementById('new-cat-input').value.trim();
        if(n) apiReq('addCategory', { newCategory: n }).then(() => document.getElementById('new-cat-input').value = '');
    };
    window.addSubCat = p => { const n = prompt(`为 "${p}" 添加子分类:`); if(n) apiReq('addSubCategory', { parentCategory: p, newSubCategory: n }); };
    window.renameSubCat = (p, o, btn) => { const n = btn.closest('.sub-cat-row').querySelector('input').value.trim(); if(n && n !== o) apiReq('renameSubCategory', { parentCategory: p, oldSubCategory: o, newSubCategory: n }); };
    
    window.deleteSubCat = (parent, sub) => {
        if(confirm(`确定删除子分类 "${sub}" 吗？其下站点将失去子分类属性。`)) {
            if (activeSubFilters[parent] === sub) {
                activeSubFilters[parent] = 'all';
            }
            apiReq('deleteSubCategory', { parentCategory: parent, oldSubCategory: sub });
        }
    };
document.getElementById('link-form').onsubmit = async function(e) {
        e.preventDefault(); 
        const data = Object.fromEntries(new FormData(this));
        if (!data.category) return alert("请选择一个分类！");
        
        // 提交前再次确认图标链接，如果是空或者加载失败，尝试最后抓取一次
        const currentPreview = document.getElementById('prev-img').src;
        data.icon = (currentPreview && currentPreview !== window.location.href) ? currentPreview : await getSmartIcon(data.url);
        
        if(await apiReq('save', { link: data })) {
            document.getElementById('modal-link').style.display = 'none';
            await fetchData(); // 保存后刷新数据以显示新图标
        }
    };

    document.getElementById('btn-top').onclick = () => window.scrollTo({top:0, behavior:'smooth'});
    document.getElementById('btn-float-search').onclick = () => { document.getElementById('modal-search').style.display='flex'; setTimeout(() => document.querySelector('.modal-inner-search .search-input').focus(), 100); };
    document.getElementById('btn-add-site').onclick = () => openEdit();
    window.onscroll = () => {
        const y = window.scrollY;
        document.getElementById('btn-top').style.display = document.getElementById('btn-float-search').style.display = y > 300 ? 'flex' : 'none';
    };
});
