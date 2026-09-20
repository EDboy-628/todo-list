(function () {
  const STORAGE_KEY = 'todoList.v1';

  /* ---------- DOM 引用 ---------- */
  const input = document.getElementById('todo-input');
  const addBtn = document.getElementById('add-btn');
  const listEl = document.getElementById('list-wrap');
  const emptyHint = document.getElementById('empty-hint');
  const doneCount = document.getElementById('done-count');
  const totalCount = document.getElementById('total-count');
  const clearDoneBtn = document.getElementById('clear-done');
  const filterBtns = document.querySelectorAll('.filter');
  const thinkingEl = document.getElementById('thinking');
  const previewEl = document.getElementById('preview');
  const previewBody = document.getElementById('preview-body');
  const confirmBtn = document.getElementById('confirm-add');
  const cancelBtn = document.getElementById('cancel-add');

  /* ---------- 数据 ---------- */
  let todos = load();
  let filter = 'all';
  let candidates = []; // AI 解析出的候选任务
  let confirmedIds = new Set(); // 预览中已勾选（确认可加）

  /* ---------- 本地规则引擎：一句话 -> 任务列表 (伪 AI) ---------- */
  const RULES = [
    { match: /出差|出差\s*|出差去/, group: '✈️ 出差准备', tasks: ['订往返机票', '预定酒店', '整理证件与充电器', '列出差日程'] },
    { match: /旅行|旅游|去玩|度假/, group: '✈️ 旅行', tasks: ['规划行程', '订酒店', '收拾行李', '查天气预报'] },
    { match: /购物|买\s*|采购|超市|买点|去买/, group: '🛒 采购', tasks: ['列出购物清单', '比价与下单', '去超市采购'] },
    { match: /学习|看书|读书|复习|考试|背/, group: '📚 学习', tasks: ['制定学习计划', '整理重点笔记', '完成练习'] },
    { match: /工作|开会|方案|汇报|项目|写|做\s*报/, group: '💼 工作', tasks: ['列工作要点', '整理交付物', '安排时间'] },
    { match: /生日|纪念|聚会|聚餐|聚会/, group: '🎂 生活', tasks: ['准备礼物', '确认时间地点', '邀请朋友'] },
    { match: /健身|跑步|运动|锻炼|减肥/, group: '🏃 健康', tasks: ['安排锻炼', '记录饮食', '设置提醒'] },
    { match: /明天|后天|下周|下个月|周末|出差|旅行|购物/, group: '🔥 今日必做', tasks: ['拆解今日步骤', '安排时间', '设置提醒'] },
  ];

  // 兜底：没命中任何规则
  const DEFAULT_RESULT = { group: '📌 待办', tasks: ['这件事拆成第一步', '这件事拆成第二步'] };

  function parseInput(text) {
    for (let i = 0; i < RULES.length; i++) {
      const rule = RULES[i];
      if (rule.match.test(text)) {
        // 可能命中多条，合并去重（优先取第一个命中的分组做标题，任务可合并）
        return { group: rule.group, tasks: rule.tasks.slice() };
      }
    }
    return { group: DEFAULT_RESULT.group, tasks: DEFAULT_RESULT.tasks.slice() };
  }

  /* ---------- 持久化 ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedDemo();
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  // 首次打开时的示例数据：覆盖不同分组与完成状态，便于功能测试
  function seedDemo() {
    return [
      { id: 'demo-c1', text: '订往返机票', group: '✈️ 出差准备', done: true, remind: null, note: '示例' },
      { id: 'demo-c2', text: '预定上海酒店', group: '✈️ 出差准备', done: false, remind: '两天前', note: '示例' },
      { id: 'demo-c3', text: '整理证件与充电器', group: '✈️ 出差准备', done: false, remind: null, note: '示例' },
      { id: 'demo-c4', text: '把冰箱里的菜列个清单', group: '🛒 采购', done: false, remind: null, note: '示例' },
      { id: 'demo-c5', text: '去超市采购周末食材', group: '🛒 采购', done: false, remind: '周末', note: '示例' },
      { id: 'demo-c6', text: '复习期货交易笔记', group: '📚 学习', done: true, remind: null, note: '示例' },
      { id: 'demo-c7', text: '写一份复盘', group: '📚 学习', done: false, remind: null, note: '示例' },
      { id: 'demo-c8', text: '给爸妈打个电话', group: '🎂 生活', done: false, remind: '周五晚', note: '示例' },
    ];
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(todos)); }

  /* ---------- 渲染 ---------- */
  function render() {
    // 按分组聚合
    const groups = {};
    todos.forEach(function (t) {
      const g = t.group || '📌 待办';
      if (!groups[g]) groups[g] = { items: [], done: 0 };
      groups[g].items.push(t);
      if (t.done) groups[g].done += 1;
    });

    const keys = Object.keys(groups);
    listEl.innerHTML = '';

    // 空态
    emptyHint.classList.toggle('hidden', keys.length !== 0);

    // 分组下的过滤逻辑（简单：全部/未完成/已完成应用到每个组）
    keys.forEach(function (groupName) {
      const g = groups[groupName];
      const visible = g.items.filter(function (t) {
        if (filter === 'active') return !t.done;
        if (filter === 'done') return t.done;
        return true;
      });
      if (visible.length === 0 && filter !== 'all') return;

      // 分组头 + 微进度条
      const head = document.createElement('div');
      head.className = 'group-head';
      const pct = g.items.length ? Math.round((g.done / g.items.length) * 100) : 0;
      head.innerHTML =
        '<div class="group-title">' + escapeHtml(groupName) +
        ' <span class="group-progress">' + g.done + '/' + g.items.length + ' · ' + pct + '%</span></div>' +
        '<div class="mini-bar"><div class="mini-fill" style="width:' + pct + '%"></div></div>';
      listEl.appendChild(head);

      // 组内任务
      const ul = document.createElement('ul');
      ul.className = 'todo-list';
      visible.forEach(function (todo) {
        const li = document.createElement('li');
        li.className = 'todo-item' + (todo.done ? ' done' : '');

        const check = document.createElement('button');
        check.className = 'check';
        check.innerHTML = '✓';
        check.setAttribute('aria-label', todo.done ? '标记为未完成' : '标记为已完成');
        check.addEventListener('click', function () { toggle(todo.id); });

        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = todo.text;
        if (todo.remind) {
          const remind = document.createElement('span');
          remind.className = 'remind';
          remind.textContent = '🔔 ' + todo.remind;
          label.appendChild(document.createElement('br'));
          label.appendChild(remind);
        }

        const del = document.createElement('button');
        del.className = 'del';
        del.textContent = '✕';
        del.setAttribute('aria-label', '删除');
        del.addEventListener('click', function () { remove(todo.id); });

        li.appendChild(check);
        li.appendChild(label);
        li.appendChild(del);
        ul.appendChild(li);
      });
      listEl.appendChild(ul);
    });

    const done = todos.reduce(function (acc, t) { return acc + (t.done ? 1 : 0); }, 0);
    doneCount.textContent = done;
    totalCount.textContent = todos.length;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- 智能解析闭环：输入 -> 思考 -> 预览 ---------- */
  function onSmartInput() {
    const text = input.value.trim();
    if (!text) return;

    // 关闭之前预览
    previewEl.classList.add('hidden');
    thinkingEl.classList.remove('hidden');

    // 模拟 AI 延迟
    setTimeout(function () {
      const result = parseInput(text);
      thinkingEl.classList.add('hidden');

      // 组装候选任务（带原描述当备注）
      candidates = result.tasks.map(function (taskText) {
        return { text: taskText, group: result.group, done: false, note: text };
      });
      confirmedIds = new Set(candidates.map(function (_, i) { return i; })); // 默认全选

      renderPreview(text, result.group);
    }, 900);
  }

  function renderPreview(origin, groupName) {
    previewBody.innerHTML = '';
    const originInfo = document.createElement('div');
    originInfo.className = 'preview-origin';
    originInfo.textContent = '🗂️ 输入：「' + origin + '」 · 归类：' + groupName;
    previewBody.appendChild(originInfo);

    candidates.forEach(function (c, i) {
      const row = document.createElement('label');
      row.className = 'preview-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = confirmedIds.has(i);
      cb.addEventListener('change', function () {
        if (cb.checked) confirmedIds.add(i); else confirmedIds.delete(i);
      });
      const span = document.createElement('span');
      span.textContent = c.text;
      row.appendChild(cb);
      row.appendChild(span);
      previewBody.appendChild(row);
    });

    previewEl.classList.remove('hidden');
    previewEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function confirmAdd() {
    const toAdd = [];
    candidates.forEach(function (c, i) {
      if (confirmedIds.has(i)) {
        toAdd.push({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          text: c.text,
          group: c.group,
          done: false,
          remind: null
        });
      }
    });
    todos = todos.concat(toAdd);
    save();
    candidates = [];
    confirmedIds = new Set();
    previewEl.classList.add('hidden');
    input.value = '';
    filter = 'all';
    filterBtns.forEach(function (b) { b.classList.toggle('active', b.dataset.filter === 'all'); });
    render();
  }

  /* ---------- 任务操作 ---------- */
  function toggle(id) {
    const t = todos.find(function (item) { return item.id === id; });
    if (!t) return;
    t.done = !t.done;
    save();
    render();
  }
  function remove(id) {
    todos = todos.filter(function (item) { return item.id !== id; });
    save();
    render();
  }
  function clearDone() {
    todos = todos.filter(function (t) { return !t.done; });
    save();
    render();
  }
  function setFilter(next) {
    filter = next;
    filterBtns.forEach(function (btn) { btn.classList.toggle('active', btn.dataset.filter === next); });
    render();
  }

  /* ---------- 事件绑定 ---------- */
  addBtn.addEventListener('click', onSmartInput);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); onSmartInput(); } });
  clearDoneBtn.addEventListener('click', clearDone);
  confirmBtn.addEventListener('click', confirmAdd);
  cancelBtn.addEventListener('click', function () {
    candidates = [];
    confirmedIds = new Set();
    previewEl.classList.add('hidden');
  });
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { setFilter(btn.dataset.filter); });
  });

  render();
})();