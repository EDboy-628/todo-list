/* ================================================================
   SECTION: Constants & State
   ================================================================ */
const STORAGE_KEY = 'smartTodo.v2';
const SETTINGS_KEY = 'smartTodo.settings';
const TEMPLATE_KEY = 'smartTodo.templates';

let todos = [];
let filter = 'all';
let searchQuery = '';
let candidates = [];
let selectedIdx = new Set();
let draggedItem = null;
let theme = 'light';
let batchMode = false;
let batchSet = new Set();

/* ================================================================
   SECTION: AI Rule Engine - 15+ scenarios
   ================================================================ */
const RULES = [
  {
    match: /出差|出差去/,
    group: '✈️ 出差准备', icon: '✈️',
    deadline_days: 1,
    tasks: [
      { text: '预订往返机票/火车票', priority: 'high' },
      { text: '预订酒店住宿', priority: 'high' },
      { text: '整理证件、充电器与随身物品', priority: 'high' },
      { text: '列出差日程与会议安排', priority: 'medium' },
      { text: '准备出差报销材料', priority: 'low' },
    ]
  },
  {
    match: /旅行|旅游|去玩|度假|出游/,
    group: '✈️ 旅行计划', icon: '🧳',
    deadline_days: 2,
    tasks: [
      { text: '规划行程路线与景点', priority: 'high' },
      { text: '订机票/火车票', priority: 'high' },
      { text: '预订酒店或民宿', priority: 'high' },
      { text: '收拾行李（衣物、日用品、药品）', priority: 'medium' },
      { text: '查看天气预报并调整计划', priority: 'medium' },
      { text: '购买旅行保险', priority: 'low' },
    ]
  },
  {
    match: /学习|看书|读书|复习|考试|备考|背/,
    group: '📚 学习计划', icon: '📚',
    deadline_days: 3,
    tasks: [
      { text: '制定学习计划与时间表', priority: 'high' },
      { text: '整理课程笔记与重点', priority: 'high' },
      { text: '完成今日练习/作业', priority: 'medium' },
      { text: '复习错题与薄弱环节', priority: 'medium' },
      { text: '找一套模拟题自测', priority: 'low' },
    ]
  },
  {
    match: /购物|采购|买\s*|超市|买菜/,
    group: '🛒 购物采购', icon: '🛒',
    deadline_days: 1,
    tasks: [
      { text: '列出完整购物清单', priority: 'high' },
      { text: '比价并选择购买渠道', priority: 'medium' },
      { text: '下单或前往采购', priority: 'high' },
      { text: '核对收货与售后', priority: 'low' },
    ]
  },
  {
    match: /健身|跑步|运动|锻炼|减肥|瑜伽/,
    group: '🏃 健康运动', icon: '🏃',
    deadline_days: 1,
    tasks: [
      { text: '安排今日运动项目与时长', priority: 'high' },
      { text: '准备运动装备与补给', priority: 'medium' },
      { text: '记录饮食与热量摄入', priority: 'medium' },
      { text: '完成运动并拉伸放松', priority: 'high' },
    ]
  },
  {
    match: /搬家|搬迁/,
    group: '📦 搬家事项', icon: '📦',
    deadline_days: 5,
    tasks: [
      { text: '联系搬家公司并预约时间', priority: 'high' },
      { text: '分类打包物品并标记箱子', priority: 'high' },
      { text: '办理水电气宽带过户/迁移', priority: 'high' },
      { text: '更改收件地址（快递、银行等）', priority: 'medium' },
      { text: '打扫新旧房屋卫生', priority: 'medium' },
      { text: '清点贵重物品单独携带', priority: 'high' },
    ]
  },
  {
    match: /聚会|聚餐|派对|请客|生日|庆祝/,
    group: '🎂 聚会安排', icon: '🎂',
    deadline_days: 3,
    tasks: [
      { text: '确定时间地点与参加人数', priority: 'high' },
      { text: '预订餐厅或采购食材', priority: 'high' },
      { text: '邀请朋友并发定位', priority: 'medium' },
      { text: '准备礼物或伴手礼', priority: 'medium' },
      { text: '布置场地（如需）', priority: 'low' },
    ]
  },
  {
    match: /面试|求职|找工作|应聘/,
    group: '💼 求职面试', icon: '💼',
    deadline_days: 2,
    tasks: [
      { text: '研究目标公司与岗位要求', priority: 'high' },
      { text: '更新简历并针对性优化', priority: 'high' },
      { text: '准备自我介绍与常见问题', priority: 'high' },
      { text: '准备合适的着装与材料', priority: 'medium' },
      { text: '确认面试时间与地点/链接', priority: 'high' },
    ]
  },
  {
    match: /看病|去医院|就医|体检|挂号/,
    group: '🏥 就医体检', icon: '🏥',
    deadline_days: 1,
    tasks: [
      { text: '提前挂号或预约', priority: 'high' },
      { text: '准备医保卡、病历与检查报告', priority: 'high' },
      { text: '列出症状与想问的问题', priority: 'medium' },
      { text: '安排陪同人员（如需）', priority: 'medium' },
    ]
  },
  {
    match: /做饭|下厨|烹饪|做菜/,
    group: '🍳 下厨烹饪', icon: '🍳',
    deadline_days: 1,
    tasks: [
      { text: '确定菜谱与用餐人数', priority: 'high' },
      { text: '列出食材采购清单', priority: 'high' },
      { text: '超市或线上采购食材', priority: 'medium' },
      { text: '提前备菜（洗切腌制）', priority: 'medium' },
      { text: '烹饪并摆盘上桌', priority: 'medium' },
    ]
  },
  {
    match: /育儿|带娃|孩子|宝宝/,
    group: '👶 育儿日常', icon: '👶',
    deadline_days: 1,
    tasks: [
      { text: '准备三餐与营养搭配', priority: 'high' },
      { text: '安排学习/早教活动', priority: 'medium' },
      { text: '户外活动或亲子互动', priority: 'medium' },
      { text: '检查作业或学习进度', priority: 'medium' },
      { text: '按时哄睡与规律作息', priority: 'high' },
    ]
  },
  {
    match: /工作|汇报|开会|方案|项目|周报|月报/,
    group: '💼 工作任务', icon: '💼',
    deadline_days: 1,
    tasks: [
      { text: '整理今日工作优先级清单', priority: 'high' },
      { text: '处理紧急邮件与消息', priority: 'high' },
      { text: '推进项目关键交付物', priority: 'medium' },
      { text: '准备会议材料或汇报内容', priority: 'medium' },
      { text: '记录工作日志或写日报', priority: 'low' },
    ]
  },
  {
    match: /整理|打扫|清洁|大扫除|收拾/,
    group: '🧹 整理打扫', icon: '🧹',
    deadline_days: 1,
    tasks: [
      { text: '整理桌面与文件归档', priority: 'medium' },
      { text: '扫地拖地清洁地面', priority: 'high' },
      { text: '擦拭家具与电器表面', priority: 'medium' },
      { text: '清理过期物品与垃圾', priority: 'medium' },
      { text: '清洗更换床单被套', priority: 'low' },
    ]
  },
  {
    match: /明天|后天|下周|下个月|周末|今天|今晚|明早/,
    group: '🔥 今日必做', icon: '🔥',
    deadline_days: 1,
    tasks: [
      { text: '明确今日最重要的三件事', priority: 'high' },
      { text: '拆解每个目标的具体步骤', priority: 'medium' },
      { text: '设置时间提醒与截止时间', priority: 'medium' },
    ]
  },
];

/* 自然语言时间提取：识别 明天/今天/后天/下周X/下个月X号/X点 等，返回 {dateStr, remainText} */
function extractNaturalTime(text) {
  var mapping = {
    '今天': 0, '今晚': 0, '今晚': 0, '明早': 1,
    '明天': 1, '明天白天': 1, '后天': 2,
    '大后天': 3, '这周': 0, '本周': 0,
  };
  var now = new Date();
  var todayStr = now.toISOString().split('T')[0];

  // 具体星期：下周一..日 / 周X
  var weekMatch = text.match(/((?:下|这|本)?周([一二三四五六日天]))|(周[一二三四五六日天])/);
  if (weekMatch) {
    var label = weekMatch[2] || weekMatch[3];
    var dayNum = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 }[label];
    var prefix = weekMatch[1] ? (weekMatch[1].indexOf('下') !== -1 ? 'next' : 'this') : 'next';
    var cur = now.getDay(); // 0=周日
    var diff = (dayNum - cur + 7) % 7;
    if (prefix === 'next') diff += 7;
    var d = new Date(now);
    d.setDate(d.getDate() + diff);
    return { dateStr: d.toISOString().split('T')[0], remainText: '下周' + label };
  }

  // 相对天词
  for (var k in mapping) {
    if (text.indexOf(k) !== -1) {
      var d2 = new Date(now);
      d2.setDate(d2.getDate() + mapping[k]);
      return { dateStr: d2.toISOString().split('T')[0], remainText: k };
    }
  }

  // 下个月X号
  var monthDay = text.match(/下个月(\d{1,2})号/);
  if (monthDay) {
    var d3 = new Date(now.getFullYear(), now.getMonth() + 1, parseInt(monthDay[1], 10));
    return { dateStr: d3.toISOString().split('T')[0], remainText: '下月' + monthDay[1] + '号' };
  }

  return null;
}

/* 多场景合并解析：命中多个规则时全部合并，带去重 */
function parseInput(text) {
  var results = [];
  var usedGroups = {};

  for (var i = 0; i < RULES.length; i++) {
    var rule = RULES[i];
    var m = text.match(rule.match);
    if (m) {
      // 未命中过的分组才加入，避免重复输出
      if (usedGroups[rule.group]) continue;
      usedGroups[rule.group] = true;
      results.push({
        group: rule.group, icon: rule.icon,
        deadline_days: rule.deadline_days || 1,
        tasks: rule.tasks.map(function (t) { return { text: t.text, priority: t.priority }; })
      });
    }
  }

  // 兜底
  if (results.length === 0) {
    results.push({
      group: '📌 待办事项', icon: '📌',
      deadline_days: 1,
      tasks: [
        { text: '拆解任务第一步：明确具体目标', priority: 'high' },
        { text: '拆解任务第二步：列出行动步骤', priority: 'medium' },
        { text: '拆解任务第三步：设定截止时间', priority: 'medium' },
        { text: '拆解任务第四步：开始执行并追踪', priority: 'low' },
      ]
    });
  }

  return results;
}

/* ================================================================
   SECTION: Persistence
   ================================================================ */
function loadTodos() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // 首次访问：把演示数据写入存储，保证刷新前后一致（可在页面里逐条删除）
      var seed = seedDemo();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch (e) { return seedDemo(); }
}

function saveTodos() { localStorage.setItem(STORAGE_KEY, JSON.stringify(todos)); }

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { return {}; }
}
function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

/* 模板持久化 */
function loadTemplates() {
  try { return JSON.parse(localStorage.getItem(TEMPLATE_KEY)) || []; } catch (e) { return []; }
}
function saveTemplates(ts) { localStorage.setItem(TEMPLATE_KEY, JSON.stringify(ts)); }

function seedDemo() {
  var now = new Date();
  function d(offset) {
    var dt = new Date(now);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().split('T')[0];
  }
  return [
    { id: uid(), text: '预订往返机票', group: '✈️ 出差准备', done: false, priority: 'high', deadline: d(2), tags: [], createdAt: now.toISOString(), subtasks: [] },
    { id: uid(), text: '预订酒店住宿', group: '✈️ 出差准备', done: true, priority: 'high', deadline: d(1), tags: [], createdAt: now.toISOString(), subtasks: [] },
    { id: uid(), text: '整理证件与充电器', group: '✈️ 出差准备', done: false, priority: 'medium', deadline: d(0), tags: [], createdAt: now.toISOString(), subtasks: [] },
    { id: uid(), text: '列出差日程', group: '✈️ 出差准备', done: false, priority: 'medium', deadline: d(1), tags: [], createdAt: now.toISOString(), subtasks: [] },
    { id: uid(), text: '制定学习计划与时间表', group: '📚 学习计划', done: false, priority: 'high', deadline: d(1), tags: [], createdAt: now.toISOString(), subtasks: [] },
    { id: uid(), text: '整理课程笔记', group: '📚 学习计划', done: true, priority: 'high', deadline: d(0), tags: [], createdAt: now.toISOString(), subtasks: [] },
    { id: uid(), text: '完成今日练习', group: '📚 学习计划', done: false, priority: 'medium', deadline: d(3), tags: [], createdAt: now.toISOString(), subtasks: [] },
    { id: uid(), text: '列购物清单并比价', group: '🛒 购物采购', done: false, priority: 'medium', deadline: d(0), tags: [], createdAt: now.toISOString(), subtasks: [] },
  ];
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ================================================================
   SECTION: DOM references
   ================================================================ */
var $ = function (sel) { return document.querySelector(sel); };

var dom = {
  input: $('#todo-input'),
  btnAi: $('#btn-ai'),
  thinking: $('#thinking'),
  preview: $('#preview'),
  previewMeta: $('#preview-meta'),
  previewGroup: $('#preview-group'),
  previewList: $('#preview-list'),
  btnCancel: $('#btn-cancel'),
  btnConfirm: $('#btn-confirm'),
  listContainer: $('#list-container'),
  emptyState: $('#empty-state'),
  filterPills: $('#filter-pills'),
  searchInput: $('#search-input'),
  statToday: $('#stat-today'),
  statWeek: $('#stat-week'),
  ringFill: $('#ring-fill'),
  ringPct: $('#ring-pct'),
  toast: $('#toast'),
  undoBar: $('#undo-bar'),
  undoMsg: $('#undo-msg'),
  btnUndo: $('#btn-undo'),
  btnTheme: $('#btn-theme'),
  btnExport: $('#btn-export'),
  btnImport: $('#btn-import'),
  importFile: $('#import-file'),
  // 新增
  btnTemplates: $('#btn-templates'),
  btnStats: $('#btn-stats'),
  btnBatch: $('#btn-batch'),
  btnNotify: $('#btn-notify'),
  overdueBanner: $('#overdue-banner'),
  overdueText: $('#overdue-text'),
  overdueClose: $('#overdue-close'),
  batchBar: $('#batch-bar'),
  batchCount: $('#batch-count'),
  batchDone: $('#batch-done'),
  batchPriority: $('#batch-priority'),
  batchDelete: $('#batch-delete'),
  batchExit: $('#batch-exit'),
  statsModal: $('#stats-modal'),
  statsBody: $('#stats-body'),
  statsClose: $('#stats-close'),
  templateModal: $('#template-modal'),
  templateBody: $('#template-body'),
  templateClose: $('#template-close'),
  confetti: $('#confetti'),
};

/* ================================================================
   SECTION: Toast & Undo
   ================================================================ */
var toastTimer;
function showToast(msg) {
  clearTimeout(toastTimer);
  dom.toast.textContent = msg;
  dom.toast.classList.add('show');
  toastTimer = setTimeout(function () { dom.toast.classList.remove('show'); }, 2500);
}

function showUndo(msg, action) {
  dom.undoMsg.textContent = msg;
  dom.undoBar.classList.remove('hidden');
  dom.btnUndo.onclick = function () { action(); dom.undoBar.classList.add('hidden'); };
  setTimeout(function () { dom.undoBar.classList.add('hidden'); }, 6000);
}

/* ================================================================
   SECTION: Audio & Confetti
   ================================================================ */
var audioCtx = null;
function playCompletionSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var now = audioCtx.currentTime;
    [523.25, 659.25, 783.99].forEach(function (freq, i) {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.4);
    });
  } catch (e) { /* 无音频环境忽略 */ }
}

/* Confetti 粒子特效 */
function burstConfetti() {
  var canvas = dom.confetti;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  var ctx = canvas.getContext('2d');
  var colors = ['#4f6ef6', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#f472b6'];
  var particles = [];
  var count = 120;
  for (var i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.3,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 6,
      vy: 2 + Math.random() * 3,
      vx: (Math.random() - 0.5) * 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  var frames = 0;
  function step() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy += 0.06;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    frames++;
    if (frames < 180) requestAnimationFrame(step);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(step);
}

/* ================================================================
   SECTION: Theme
   ================================================================ */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme);
  dom.btnTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
  // 整体写回，避免覆盖 settings 中的其它字段（如通知开关）
  settings.theme = theme;
  saveSettings(settings);
}

/* ================================================================
   SECTION: Stats
   ================================================================ */
function updateStats() {
  var now = new Date();
  var today = now.toISOString().split('T')[0];

  var todayPending = todos.filter(function (t) {
    return !t.done && t.deadline && t.deadline <= today;
  }).length;

  // 正确的本周完成：本周一到现在，completed
  var weekday = (now.getDay() + 6) % 7; // 周一=0
  var monday = new Date(now);
  monday.setDate(now.getDate() - weekday);
  monday.setHours(0, 0, 0, 0);
  // 完成任务需要记录 completedAt，这里用 createdAt 时间近似——见 toggleTask 记录 doneAt
  var weekDone = todos.filter(function (t) { return t.done && t.doneAt && new Date(t.doneAt) >= monday; }).length;

  var total = todos.length;
  var done = todos.filter(function (t) { return t.done; }).length;
  var pct = total === 0 ? 0 : Math.round((done / total) * 100);

  dom.statToday.textContent = todayPending;
  dom.statWeek.textContent = weekDone;

  var circumference = 150.8;
  var offset = circumference - (pct / 100) * circumference;
  dom.ringFill.setAttribute('stroke-dashoffset', offset);
  dom.ringPct.textContent = pct + '%';
}

/* 过期横幅 */
function updateOverdueBanner() {
  var now = new Date().toISOString().split('T')[0];
  var overdue = todos.filter(function (t) { return !t.done && t.deadline && t.deadline < now; });

  // 系统级到期提醒：需用户手动开启，且每个自然日最多推送一次
  if (overdue.length > 0 && isNotifyOn()) {
    notifyOncePerDay('⏰ 有任务已逾期', '共 ' + overdue.length + ' 个任务已逾期，记得处理');
  }

  if (overdue.length === 0 || dom.input.value) {
    dom.overdueBanner.classList.add('hidden');
    return;
  }
  dom.overdueText.textContent = '有 ' + overdue.length + ' 个任务已逾期，记得处理';
  dom.overdueBanner.classList.remove('hidden');
}

/* ================================================================
   SECTION: AI Preview (多场景 + 自然语言时间)
   ================================================================ */
function onSmartInput() {
  var text = dom.input.value.trim();
  if (!text) return;

  dom.preview.classList.remove('show');
  dom.thinking.classList.add('show');

  setTimeout(function () {
    var groups = parseInput(text);
    var timeInfo = extractNaturalTime(text);
    dom.thinking.classList.remove('show');

    var candidates = [];
    groups.forEach(function (g) {
      var dl = new Date();
      dl.setDate(dl.getDate() + (g.deadline_days || 1));
      var deadlineStr = timeInfo ? timeInfo.dateStr : dl.toISOString().split('T')[0];
      g.tasks.forEach(function (t) {
        candidates.push({
          text: t.text, group: g.group, icon: g.icon,
          priority: t.priority || 'medium', deadline: deadlineStr,
        });
      });
    });
    window._candidates = candidates;
    window._selectedIdx = new Set(candidates.map(function (_, i) { return i; }));

    dom.previewMeta.innerHTML = '📝 输入：「<strong>' + escapeHtml(text) + '</strong>」' +
      (timeInfo ? ' <span class="chip">⏰ ' + timeInfo.remainText + '</span>' : '');
    dom.previewGroup.textContent = candidates.length ? candidates[0].icon + ' ' + groups.length + ' 个场景' : '';
    dom.previewList.innerHTML = '';

    candidates.forEach(function (c, i) {
      var div = document.createElement('label');
      div.className = 'preview-item';
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = true;
      cb.addEventListener('change', function () {
        if (cb.checked) window._selectedIdx.add(i); else window._selectedIdx.delete(i);
      });
      var span = document.createElement('span');
      span.className = 'preview-text';
      span.textContent = '[' + c.icon + '] ' + c.text;
      var ptag = document.createElement('span');
      ptag.className = 'preview-priority priority-' + c.priority;
      ptag.textContent = { high: '高', medium: '中', low: '低' }[c.priority];
      div.appendChild(cb); div.appendChild(span); div.appendChild(ptag);
      dom.previewList.appendChild(div);
    });

    dom.preview.classList.add('show');
  }, 800);
}

function confirmAdd() {
  var c = window._candidates || [];
  var sel = window._selectedIdx || new Set();
  var toAdd = [];
  c.forEach(function (item, i) {
    if (sel.has(i)) {
      toAdd.push({
        id: uid(), text: item.text, group: item.group, icon: item.icon,
        done: false, priority: item.priority, deadline: item.deadline,
        tags: [], createdAt: new Date().toISOString(), subtasks: [],
      });
    }
  });

  if (toAdd.length === 0) return;
  todos = todos.concat(toAdd);
  saveTodos();
  window._candidates = []; window._selectedIdx = new Set();
  dom.preview.classList.remove('show');
  dom.input.value = '';
  dom.thinking.classList.remove('show');
  filter = 'all';
  dom.searchInput.value = '';
  searchQuery = '';
  updateFilterPills();
  render();
  showToast('✅ 已添加 ' + toAdd.length + ' 个任务');
}

function cancelAdd() {
  window._candidates = []; window._selectedIdx = new Set();
  dom.preview.classList.remove('show');
}

/* ================================================================
   SECTION: Task Operations (含周期重复 / 子任务 / 批量)
   ================================================================ */
function toggleTask(id) {
  var t = findTask(id);
  if (!t) return;
  t.done = !t.done;
  if (t.done) {
    t.doneAt = new Date().toISOString();
    // 周期重复：完成后自动重建为未完成，截止延后一周
    if (t.repeat === 'weekly') {
      var nt = copyRepeat(t);
      todos.push(nt);
    }
    playCompletionSound();
    burstConfetti();
  } else {
    t.doneAt = null;
  }
  saveTodos();
  render();
  updateStats();
}

/* 复制周期任务（每周重复，延后7天，重置未完成） */
function copyRepeat(orig) {
  var d = new Date(orig.deadline);
  d.setDate(d.getDate() + 7);
  return {
    id: uid(), text: orig.text, group: orig.group, icon: orig.icon,
    done: false, priority: orig.priority,
    deadline: d.toISOString().split('T')[0],
    tags: orig.tags || [], createdAt: new Date().toISOString(),
    subtasks: orig.subtasks ? orig.subtasks.map(function (s) { return Object.assign({}, s); }) : [],
    repeat: 'weekly',
  };
}

function findTask(id) {
  for (var i = 0; i < todos.length; i++) { if (todos[i].id === id) return todos[i]; }
  return null;
}

function deleteTask(id) {
  var idx = -1;
  for (var i = 0; i < todos.length; i++) { if (todos[i].id === id) { idx = i; break; } }
  if (idx === -1) return;
  var removed = todos.splice(idx, 1)[0];
  saveTodos();
  render();
  updateStats();
  showUndo('已删除「' + removed.text + '」', function () {
    todos.splice(idx, 0, removed);
    saveTodos(); render(); updateStats(); showToast('已撤销删除');
  });
}

function updateTaskText(id, newText) {
  var t = findTask(id);
  if (!t || !newText.trim()) return;
  t.text = newText.trim();
  saveTodos(); render();
}

function cyclePriority(id) {
  var t = findTask(id);
  if (!t) return;
  var order = ['high', 'medium', 'low'];
  var idx = order.indexOf(t.priority);
  t.priority = order[(idx + 1) % order.length];
  saveTodos(); render(); updateStats(); showToast('优先级已更新');
}

function cycleRepeat(id) {
  var t = findTask(id);
  if (!t) return;
  t.repeat = t.repeat === 'weekly' ? null : 'weekly';
  saveTodos(); render(); showToast(t.repeat ? '已开启每周重复' : '已关闭每周重复');
}

/* ---- 子任务 ---- */
function toggleSubtasks(id) {
  var t = findTask(id);
  if (!t) return;
  t.subtasks = t.subtasks || [];
  t.expanded = !t.expanded;
  saveTodos(); render();
}
function toggleSubtask(taskId, subIdx) {
  var t = findTask(taskId);
  if (!t || !t.subtasks) return;
  t.subtasks[subIdx].done = !t.subtasks[subIdx].done;
  // 全部子任务完成时，父任务也完成
  var all = t.subtasks.every(function (s) { return s.done; });
  if (all) { t.done = true; t.doneAt = new Date().toISOString(); }
  saveTodos(); render(); updateStats();
}
function addSubtask(taskId, text) {
  var t = findTask(taskId);
  if (!t || !text.trim()) return;
  t.subtasks = t.subtasks || [];
  t.subtasks.push({ text: text.trim(), done: false });
  t.expanded = true;
  saveTodos(); render();
}

/* ---- 批量模式 ---- */
function toggleBatchMode() {
  batchMode = !batchMode;
  batchSet = new Set();
  render();
  updateBtnBatch();
  showToast(batchMode ? '批量模式已开启：点选任务后批量完成 / 高优 / 删除' : '已退出批量模式');
}
function updateBatchUI() {
  dom.batchCount.textContent = batchSet.size === 0 ? '批量模式：请点选任务' : '已选 ' + batchSet.size + ' 项';
  dom.batchBar.classList.toggle('hidden', !batchMode);
}
/* 顶栏批量按钮的状态同步 */
function updateBtnBatch() {
  dom.btnBatch.classList.toggle('active', batchMode);
  dom.btnBatch.title = batchMode ? '退出批量模式' : '批量操作';
}
function batchDoneSelected() {
  batchSet.forEach(function (id) {
    var t = findTask(id); if (t && !t.done) { t.done = true; t.doneAt = new Date().toISOString(); }
  });
  finishBatch('批量完成 ' + batchSet.size + ' 项');
}
function batchDeleteSelected() {
  var ids = Array.from(batchSet);
  todos = todos.filter(function (t) { return ids.indexOf(t.id) === -1; });
  finishBatch('已删除 ' + ids.length + ' 项');
}
function batchPrioritySelected() {
  batchSet.forEach(function (id) { var t = findTask(id); if (t) t.priority = 'high'; });
  finishBatch('批量设为高优先级');
}
function finishBatch(msg) {
  saveTodos(); batchSet = new Set(); updateBatchUI(); render(); updateStats(); showToast(msg);
}

/* ================================================================
   SECTION: Drag & Drop
   ================================================================ */
function handleDragStart(e, id) {
  if (batchMode) return;
  for (var i = 0; i < todos.length; i++) { if (todos[i].id === id) { draggedItem = todos[i]; break; } }
  e.target.closest('.task-item').classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function handleDrop(e, targetId) {
  e.preventDefault();
  if (!draggedItem || draggedItem.id === targetId) return;
  var fromIdx = -1, toIdx = -1;
  for (var i = 0; i < todos.length; i++) {
    if (todos[i].id === draggedItem.id) fromIdx = i;
    if (todos[i].id === targetId) toIdx = i;
  }
  if (fromIdx === -1 || toIdx === -1) return;
  var moved = todos.splice(fromIdx, 1)[0];
  todos.splice(toIdx, 0, moved);
  saveTodos(); render(); draggedItem = null;
}
function handleDragEnd(e) {
  var item = e.target.closest('.task-item');
  if (item) item.classList.remove('dragging');
  draggedItem = null;
}

/* ================================================================
   SECTION: Templates
   ================================================================ */
var DEFAULT_TEMPLATES = [
  { name: '出差', icon: '✈️', text: '下周去上海出差三天' },
  { name: '学习', icon: '📚', text: '这周开始准备考试复习' },
  { name: '购物', icon: '🛒', text: '周末去超市买点菜' },
  { name: '聚会', icon: '🎂', text: '周末朋友来家里聚餐' },
  { name: '搬家', icon: '📦', text: '下个月搬家到新公寓' },
  { name: '健身', icon: '🏃', text: '这周开始健身锻炼' },
];

function getTemplates() {
  var ts = loadTemplates();
  if (ts.length === 0) { ts = DEFAULT_TEMPLATES.map(function (t) { return Object.assign({}, t); }); }
  return ts;
}

function openTemplates() {
  var ts = getTemplates();
  dom.templateBody.innerHTML = '';
  ts.forEach(function (t) {
    var row = document.createElement('div');
    row.className = 'template-item';
    var name = document.createElement('button');
    name.className = 'template-apply';
    name.innerHTML = '<span class="t-icon">' + (t.icon || '📌') + '</span> ' + escapeHtml(t.name);
    name.addEventListener('click', function () {
      dom.input.value = t.text;
      dom.templateModal.classList.add('hidden');
      onSmartInput();
    });
    row.appendChild(name);
    var del = document.createElement('button');
    del.className = 'template-del'; del.textContent = '✕';
    del.addEventListener('click', function () {
      var updated = getTemplates().filter(function (x) { return x.name !== t.name; });
      saveTemplates(updated);
      openTemplates();
    });
    row.appendChild(del);
    dom.templateBody.appendChild(row);
  });
  // 保存当前为新模板
  var saveRow = document.createElement('div');
  saveRow.className = 'template-save';
  var inp = document.createElement('input');
  inp.placeholder = '输入一句话存为模板…';
  saveRow.appendChild(inp);
  var btn = document.createElement('button');
  btn.textContent = '🖫 保存为模板';
  btn.addEventListener('click', function () {
    var s = inp.value.trim();
    if (!s) return;
    var ts2 = getTemplates();
    ts2.push({ name: s.slice(0, 8), icon: '📌', text: s });
    saveTemplates(ts2);
    openTemplates();
  });
  saveRow.appendChild(btn);
  dom.templateBody.appendChild(saveRow);

  dom.templateModal.classList.remove('hidden');
}

/* ================================================================
   SECTION: Stats Modal
   ================================================================ */
function openStats() {
  var total = todos.length;
  var done = todos.filter(function (t) { return t.done; }).length;
  var incomplete = total - done;
  var pct = total === 0 ? 0 : Math.round((done / total) * 100);

  // 分组分布
  var gcount = {};
  todos.forEach(function (t) { var g = t.group || '其他'; gcount[g] = (gcount[g] || 0) + 1; });
  // 优先级分布
  var pcount = { high: 0, medium: 0, low: 0 };
  todos.forEach(function (t) { var k = t.priority || 'medium'; if (pcount[k] !== undefined) pcount[k]++; });

  var html = '';
  html += '<div class="stat-overview">';
  html += '<div class="stat-big">' + total + '<small>总任务</small></div>';
  html += '<div class="stat-big">' + done + '<small>已完成</small></div>';
  html += '<div class="stat-big">' + incomplete + '<small>未完成</small></div>';
  html += '</div>';
  html += '<div class="stat-section"><h4>整体完成率</h4>';
  html += '<div class="gauge-row"><div class="gauge-fill" style="width:' + pct + '%"></div></div>';
  html += '<span class="gauge-label">' + pct + '%</span></div>';

  html += '<div class="stat-section"><h4>按分组分布</h4><div class="chart">';
  Object.keys(gcount).forEach(function (g) {
    var num = gcount[g];
    var w = total === 0 ? 0 : Math.round((num / total) * 100);
    html += '<div class="chart-row"><span class="chart-label">' + escapeHtml(g) + '</span>' +
      '<div class="chart-bar"><div class="chart-fill c1" style="width:' + w + '%"></div></div>' +
      '<span class="chart-num">' + num + '</span></div>';
  });
  html += '</div></div>';

  html += '<div class="stat-section"><h4>优先级分布</h4><div class="chip-stats">';
  ['high', 'medium', 'low'].forEach(function (k, i) {
    html += '<span class="chip-stat"><span class="chip-dot dot-' + ['high', 'medium', 'low'][i] + '"></span>' +
      { high: '高', medium: '中', low: '低' }[k] + '：' + (pcount[k] || 0) + ' 项</span>';
  });
  html += '</div></div>';

  dom.statsBody.innerHTML = html;
  dom.statsModal.classList.remove('hidden');
}

/* ================================================================
   SECTION: Render
   ================================================================ */
function getFilteredTodos() {
  var filtered = todos.slice();
  if (filter === 'active') filtered = filtered.filter(function (t) { return !t.done; });
  else if (filter === 'done') filtered = filtered.filter(function (t) { return t.done; });
  else if (filter === 'high') filtered = filtered.filter(function (t) { return t.priority === 'high'; });

  if (searchQuery) {
    var q = searchQuery.toLowerCase();
    filtered = filtered.filter(function (t) {
      return t.text.toLowerCase().indexOf(q) !== -1 || t.group.toLowerCase().indexOf(q) !== -1;
    });
  }
  return filtered;
}

function render() {
  var filtered = getFilteredTodos();

  var groups = {};
  filtered.forEach(function (t) {
    var g = t.group || '📌 待办事项';
    if (!groups[g]) groups[g] = { items: [], icon: t.icon || '📌' };
    groups[g].items.push(t);
  });
  var groupKeys = Object.keys(groups);

  dom.listContainer.innerHTML = '';
  dom.emptyState.classList.toggle('hidden', groupKeys.length > 0);

  groupKeys.forEach(function (gName) {
    var g = groups[gName];
    var doneCount = g.items.filter(function (t) { return t.done; }).length;
    var total = g.items.length;
    var pct = Math.round((doneCount / total) * 100);

    var wrap = document.createElement('div');
    wrap.className = 'group-wrap';

    var inner = '';
    inner += '<div class="group-header">';
    inner += '<span class="group-icon">' + g.icon + '</span>';
    inner += '<div class="group-info"><div class="group-name">' + escapeHtml(gName);
    inner += ' <span class="group-stats">' + doneCount + '/' + total + ' · ' + pct + '%</span>';
    inner += '</div></div><span class="group-arrow">▼</span></div>';
    inner += '<div class="group-progress-bar"><div class="group-progress-fill" style="width:' + pct + '%"></div></div>';

    inner += '<ul class="task-list">';
    g.items.forEach(function (t, idx) {
      // 批量模式复选框
      var batchCb = '';
      if (batchMode) {
        batchCb = '<span class="task-batch-cb" data-batch="' + t.id + '">' + (batchSet.has(t.id) ? '☑' : '☐') + '</span>';
      }

      var deadlineHtml = '';
      if (t.deadline) {
        var today = new Date().toISOString().split('T')[0];
        var diff = Math.ceil((new Date(t.deadline) - new Date(today)) / 86400000);
        if (diff < 0) deadlineHtml = '<span class="task-tag tag-overdue">⚠ 已逾期</span>';
        else if (diff === 0) deadlineHtml = '<span class="task-tag tag-deadline">📅 今天截止</span>';
        else if (diff <= 3) deadlineHtml = '<span class="task-tag tag-deadline">📅 还有 ' + diff + ' 天</span>';
        else deadlineHtml = '<span class="task-tag tag-deadline">📅 ' + t.deadline + '</span>';
      }

      var repeatHtml = t.repeat === 'weekly' ? '<span class="task-tag tag-repeat">🔄 每周</span>' : '';
      var pLabel = { high: '高', medium: '中', low: '低' }[t.priority];

      inner += '<li class="task-item' + (t.done ? ' completed' : '') + '" draggable="true">';
      inner += batchCb;
      inner += '<span class="task-priority-bar priority-bar-' + t.priority + '"></span>';
      inner += '<span class="task-check" data-id="' + t.id + '">✓</span>';
      inner += '<div class="task-body">';
      inner += '<span class="task-text" data-id="' + t.id + '" contenteditable="false">' + escapeHtml(t.text) + '</span>';
      inner += '<div class="task-meta">' + deadlineHtml + repeatHtml;
      inner += '<span class="task-priority-tag priority-tag-' + t.priority + '">' + pLabel + '优先级</span>';
      inner += '</div></div>';

      // 子任务展开
      if (t.subtasks && t.subtasks.length > 0) {
        var subCount = t.subtasks.filter(function (s) { return s.done; }).length;
        inner += '<span class="task-sub-toggle ' + (t.expanded ? 'expanded' : '') + '" data-sub-toggle="' + t.id + '">' +
          (t.expanded ? '▼' : '▶') + ' ' + subCount + '/' + t.subtasks.length + '</span>';
      } else {
        inner += '<span class="task-sub-add" data-sub-add="' + t.id + '" title="添加子任务">+</span>';
      }

      inner += '<span class="task-drag">⋮⋮</span>';
      inner += '<div class="task-actions">';
      inner += '<button class="task-btn" data-action="repeat" data-id="' + t.id + '" title="切换每周重复">🔄</button>';
      inner += '<button class="task-btn" data-action="priority" data-id="' + t.id + '" title="切换优先级">⤴</button>';
      inner += '<button class="task-btn delete" data-action="delete" data-id="' + t.id + '" title="删除">✕</button>';
      inner += '</div></li>';

      // 子任务列表（展开时）
      if (t.subtasks && t.subtasks.length > 0 && t.expanded) {
        inner += '<li class="subtask-list">';
        t.subtasks.forEach(function (s, si) {
          inner += '<div class="subtask-item ' + (s.done ? 'done' : '') + '">' +
            '<span class="subtask-check" data-subtask="' + t.id + '" data-index="' + si + '">' + (s.done ? '✔' : '○') + '</span>' +
            '<span class="subtask-text">' + escapeHtml(s.text) + '</span></div>';
        });
        inner += '<div class="subtask-add-row"><input class="subtask-input" data-subinput="' + t.id + '" placeholder="添加子任务，回车确认" /><button class="subtask-confirm" data-subconfirm="' + t.id + '">加</button></div>';
        inner += '</li>';
      }
    });
    inner += '</ul>';

    wrap.innerHTML = inner;

    // 事件绑定
    var items = wrap.querySelectorAll('.task-item');
    for (var j = 0; j < items.length; j++) {
      (function (item, taskData) {
        if (batchMode) {
          var bc = item.querySelector('[data-batch]');
          if (bc) bc.addEventListener('click', function (e) {
            e.stopPropagation();
            if (batchSet.has(taskData.id)) batchSet.delete(taskData.id);
            else batchSet.add(taskData.id);
            render(); updateBatchUI();
          });
          return; // 批量模式下跳过其它操作
        }
        item.querySelector('.task-check').addEventListener('click', function () { toggleTask(taskData.id); });
        var delBtn = item.querySelector('[data-action="delete"]');
        if (delBtn) delBtn.addEventListener('click', function (e) { e.stopPropagation(); deleteTask(taskData.id); });
        var priBtn = item.querySelector('[data-action="priority"]');
        if (priBtn) priBtn.addEventListener('click', function (e) { e.stopPropagation(); cyclePriority(taskData.id); });
        var repBtn = item.querySelector('[data-action="repeat"]');
        if (repBtn) repBtn.addEventListener('click', function (e) { e.stopPropagation(); cycleRepeat(taskData.id); });

        var textEl = item.querySelector('.task-text');
        textEl.addEventListener('dblclick', function () {
          textEl.contentEditable = 'true'; textEl.focus();
          var range = document.createRange(); range.selectNodeContents(textEl);
          var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        });
        textEl.addEventListener('blur', function () {
          textEl.contentEditable = 'false';
          var newText = textEl.textContent.trim();
          if (newText && newText !== taskData.text) updateTaskText(taskData.id, newText);
        });
        textEl.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); textEl.blur(); }
          if (e.key === 'Escape') { textEl.textContent = taskData.text; textEl.blur(); }
        });

        item.addEventListener('dragstart', function (e) { handleDragStart(e, taskData.id); });
        item.addEventListener('dragover', function (e) { handleDragOver(e); });
        item.addEventListener('drop', function (e) { handleDrop(e, taskData.id); });
        item.addEventListener('dragend', function (e) { handleDragEnd(e); });
      })(items[j], g.items[j]);
    }

    // 子任务事件（委托，放 wrap 级）
    wrap.addEventListener('click', function (e) {
      var st = e.target.getAttribute && e.target.getAttribute('data-sub-toggle');
      if (st) { e.stopPropagation(); toggleSubtasks(st); return; }
      var sa = e.target.getAttribute && e.target.getAttribute('data-sub-add');
      if (sa) {
        e.stopPropagation();
        var t = findTask(sa);
        if (t) { t.expanded = true; saveTodos(); render(); }
        return;
      }
      var sc = e.target.getAttribute && e.target.getAttribute('data-subtask');
      if (sc) { e.stopPropagation(); toggleSubtask(sc, parseInt(e.target.getAttribute('data-index'), 10)); return; }
      var cf = e.target.getAttribute && e.target.getAttribute('data-subconfirm');
      if (cf) { e.stopPropagation(); addSubtaskFromInput(cf); return; }
    });

    // 子任务输入框回车
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var id = e.target.getAttribute && e.target.getAttribute('data-subinput');
        if (id) { e.preventDefault(); addSubtaskFromInput(id); }
      }
    });

    wrap.querySelector('.group-header').addEventListener('click', function () {
      wrap.classList.toggle('collapsed');
    });

    dom.listContainer.appendChild(wrap);
  });

  updateStats();
  updateOverdueBanner();
  updateBatchUI();
}

function addSubtaskFromInput(taskId) {
  var input = $('[data-subinput="' + taskId + '"]');
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;
  addSubtask(taskId, text);
}

function updateFilterPills() {
  var pills = dom.filterPills.querySelectorAll('.filter-pill');
  for (var i = 0; i < pills.length; i++) {
    pills[i].classList.toggle('active', pills[i].dataset.filter === filter);
  }
}

/* ================================================================
   SECTION: Export / Import
   ================================================================ */
function exportData() {
  var payload = { version: 'smartTodo.v2', exportedAt: new Date().toISOString(), todos: todos, templates: getTemplates() };
  var data = JSON.stringify(payload, null, 2);
  var blob = new Blob([data], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'todo-backup-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 数据已导出');
}

function importData(file) {
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var data = JSON.parse(reader.result);
      if (data.todos && Array.isArray(data.todos)) {
        todos = data.todos;
      } else if (Array.isArray(data)) {
        todos = data;
      } else { throw new Error('无效格式'); }
      // 备份中含自定义模板时一并恢复
      var restoredTemplates = 0;
      if (data.templates && Array.isArray(data.templates) && data.templates.length > 0) {
        saveTemplates(data.templates);
        restoredTemplates = data.templates.length;
      }
      saveTodos();
      render();
      showToast('📤 已导入 ' + todos.length + ' 条任务' + (restoredTemplates ? ' · ' + restoredTemplates + ' 个模板' : ''));
    } catch (e) {
      showToast('❌ 文件格式无效');
    }
  };
  reader.readAsText(file);
}

/* ================================================================
   SECTION: Events
   ================================================================ */
dom.btnAi.addEventListener('click', onSmartInput);
dom.input.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); onSmartInput(); }
});
dom.btnConfirm.addEventListener('click', confirmAdd);
dom.btnCancel.addEventListener('click', cancelAdd);

dom.filterPills.addEventListener('click', function (e) {
  if (e.target.classList.contains('filter-pill')) {
    filter = e.target.dataset.filter;
    updateFilterPills(); render();
  }
});

dom.searchInput.addEventListener('input', function () {
  searchQuery = dom.searchInput.value;
  render(); updateOverdueBanner();
});

dom.btnTheme.addEventListener('click', function () {
  theme = theme === 'light' ? 'dark' : 'light';
  applyTheme();
});

dom.btnBatch.addEventListener('click', toggleBatchMode);
dom.btnNotify.addEventListener('click', toggleNotify);
dom.btnExport.addEventListener('click', exportData);
dom.btnImport.addEventListener('click', function () { dom.importFile.click(); });
dom.importFile.addEventListener('change', function (e) {
  if (e.target.files[0]) { importData(e.target.files[0]); dom.importFile.value = ''; }
});

dom.btnTemplates.addEventListener('click', openTemplates);
dom.templateClose.addEventListener('click', function () { dom.templateModal.classList.add('hidden'); });

dom.btnStats.addEventListener('click', openStats);
dom.statsClose.addEventListener('click', function () { dom.statsModal.classList.add('hidden'); });

// 点击遮罩关闭弹窗
[dom.statsModal, dom.templateModal].forEach(function (m) {
  m.addEventListener('click', function (e) { if (e.target === m) m.classList.add('hidden'); });
});

dom.overdueClose.addEventListener('click', function () { dom.overdueBanner.classList.add('hidden'); });

// 批量操作按钮（退出按钮与顶栏 ☑️ 均可切换批量模式）
dom.batchExit.addEventListener('click', toggleBatchMode);
dom.batchDone.addEventListener('click', batchDoneSelected);
dom.batchPriority.addEventListener('click', batchPrioritySelected);
dom.batchDelete.addEventListener('click', function () { if (confirm('确认删除所选 ' + batchSet.size + ' 项？')) batchDeleteSelected(); });

// Demo tags
dom.emptyState.addEventListener('click', function (e) {
  if (e.target.classList.contains('empty-tag')) {
    dom.input.value = e.target.dataset.demo;
    onSmartInput();
  }
});

// 键盘快捷键 Ctrl+K 聚焦 / Esc 退出批量
document.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    if (!batchMode) dom.input.focus();
  }
  if (e.key === 'Escape') {
    if (dom.statsModal.classList.contains('hidden') === false) { dom.statsModal.classList.add('hidden'); }
    if (dom.templateModal.classList.contains('hidden') === false) { dom.templateModal.classList.add('hidden'); }
    if (batchMode) { toggleBatchMode(); }
  }
});

/* ================================================================
   SECTION: Helpers & Init
   ================================================================ */
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

todos = loadTodos();
var settings = loadSettings();
theme = settings.theme || 'light';
applyTheme();
render();

/* ================================================================
   SECTION: Notification (浏览器到期提醒)
   ================================================================ */
/* 推送系统通知：仅在已授权时静默生效，未授权不打扰 */
function notifyIfSupported(title, body) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: body });
    }
  } catch (e) { /* no-op */ }
}

/* 通知开关：持久化在 smartTodo.settings 的 notify 字段 */
function isNotifyOn() {
  return settings.notify === true && 'Notification' in window && Notification.permission === 'granted';
}

/* 同一自然日只推送一次，避免定时刷新时重复提醒 */
function notifyOncePerDay(title, body) {
  var today = new Date().toISOString().split('T')[0];
  if (settings.notifyDate === today) return;
  notifyIfSupported(title, body);
  settings.notifyDate = today;
  saveSettings(settings);
}

function updateBtnNotify() {
  var on = isNotifyOn();
  dom.btnNotify.textContent = on ? '🔔' : '🔕';
  dom.btnNotify.classList.toggle('active', on);
  dom.btnNotify.title = on ? '到期通知：已开启（点击关闭）' : '到期通知：点击开启';
}

/* 顶栏 🔔：开启 / 关闭到期通知（file:// 打开时浏览器通常会拒绝授权） */
function toggleNotify() {
  if (!('Notification' in window)) {
    showToast('❌ 当前浏览器不支持通知');
    return;
  }
  if (isNotifyOn()) {
    settings.notify = false;
    saveSettings(settings);
    updateBtnNotify();
    showToast('🔕 已关闭到期通知');
    return;
  }

  var asked = false;
  var handle = function (perm) {
    if (asked) return;
    asked = true;
    if (perm === 'granted') {
      settings.notify = true;
      saveSettings(settings);
      showToast('🔔 到期通知已开启');
      notifyIfSupported('智能待办清单', '到期通知已开启，任务逾期时我会提醒你');
    } else {
      showToast('❌ 通知权限被拒绝，可在浏览器权限设置中重新允许');
    }
    updateBtnNotify();
  };

  try {
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      handle(Notification.permission);
      return;
    }
    var p = Notification.requestPermission(handle);
    if (p && typeof p.then === 'function') p.then(handle);
  } catch (e) {
    showToast('❌ 无法请求通知权限');
  }
}

/* 定时检查：每分钟刷新统计与逾期横幅；跨天时重绘列表，保证「今天截止 / 已逾期」始终准确 */
var lastDay = new Date().toISOString().split('T')[0];
setInterval(function () {
  var today = new Date().toISOString().split('T')[0];
  if (today !== lastDay) {
    lastDay = today;
    render();
  } else {
    updateStats();
    updateOverdueBanner();
  }
}, 60000);

updateBtnNotify();