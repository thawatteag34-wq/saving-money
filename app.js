// ---------- Element references ----------
const goalNameEl   = document.getElementById('goalName');
const incomeEl      = document.getElementById('income');
const amountEl       = document.getElementById('amount');
const periodValueEl  = document.getElementById('periodValue');
const periodUnitEl   = document.getElementById('periodUnit');

const calcBtn  = document.getElementById('calcBtn');
const saveBtn  = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');

const stampEmpty  = document.getElementById('stampEmpty');
const stampResult = document.getElementById('stampResult');
const stampBadge  = document.getElementById('stampBadge');
const stampWord   = document.getElementById('stampWord');
const stampNote   = document.getElementById('stampNote');

const figDaily   = document.getElementById('figDaily');
const figPercent = document.getElementById('figPercent');
const figDays    = document.getElementById('figDays');

const historyList  = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');

const STORAGE_KEY = 'savingsGoals';

// holds the most recent calculation so the Save button can reuse it
let lastResult = null;

// ---------- Core calculation ----------
function calculateGoal() {
  const name        = goalNameEl.value.trim() || 'เป้าหมายไม่มีชื่อ';
  const income      = parseFloat(incomeEl.value);
  const amount      = parseFloat(amountEl.value);
  const periodValue = parseFloat(periodValueEl.value);
  const unit        = periodUnitEl.value; // 'days' or 'months'

  if (!income || income <= 0 || !amount || amount <= 0 || !periodValue || periodValue <= 0) {
    alert('กรุณากรอกรายได้ จำนวนเงินเป้าหมาย และระยะเวลาให้ครบและมากกว่า 0');
    return null;
  }

  const totalDays = unit === 'months' ? periodValue * 30 : periodValue;
  const dailySaving = amount / totalDays;
  const monthlyEquivalent = dailySaving * 30;
  const percentOfIncome = (monthlyEquivalent / income) * 100;

  // classify difficulty using if / else
  let tier, tierLabel, note;
  if (percentOfIncome <= 10) {
    tier = 'easy';
    tierLabel = 'สบายมาก';
    note = 'เป้าหมายนี้กินสัดส่วนรายได้น้อยมาก ตั้งออมอัตโนมัติแล้วลืมมันไปได้เลย';
  } else if (percentOfIncome <= 25) {
    tier = 'comfort';
    tierLabel = 'ทำได้สบาย';
    note = 'อยู่ในเกณฑ์ที่จัดการได้ดี ลองกันเงินไว้ต้นเดือนก่อนใช้จ่ายอื่น';
  } else if (percentOfIncome <= 50) {
    tier = 'stretch';
    tierLabel = 'ต้องวางแผนหน่อย';
    note = 'ควรลดรายจ่ายที่ไม่จำเป็นลง หรือขยายระยะเวลาออมเพิ่มอีกนิด';
  } else if (percentOfIncome <= 80) {
    tier = 'hard';
    tierLabel = 'ค่อนข้างโหด';
    note = 'สัดส่วนสูงมากเมื่อเทียบกับรายได้ ลองยืดระยะเวลาหรือหารายได้เสริม';
  } else {
    tier = 'hard';
    tierLabel = 'แทบเป็นไปไม่ได้';
    note = 'เป้าหมายนี้อาจไม่สมจริงกับรายได้ปัจจุบัน แนะนำให้ขยายเวลาออมออกไปอีก';
  }

  return {
    id: Date.now(),
    name, income, amount, periodValue, unit,
    totalDays, dailySaving, percentOfIncome, tier, tierLabel, note,
    savedAt: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  };
}

// ---------- Render the stamp result ----------
function renderStamp(result) {
  stampEmpty.classList.add('hidden');
  stampResult.classList.remove('hidden');

  stampBadge.className = 'stamp-badge tier-' + result.tier;
  stampWord.textContent = result.tierLabel;

  figDaily.textContent = '฿' + result.dailySaving.toFixed(2);
  figPercent.textContent = result.percentOfIncome.toFixed(1) + '%';
  figDays.textContent = result.totalDays + ' วัน';
  stampNote.textContent = result.note;

  // restart the stamp-down animation on every calculation
  stampBadge.style.animation = 'none';
  void stampBadge.offsetWidth;
  stampBadge.style.animation = '';
}

// ---------- localStorage helpers ----------
function loadGoals() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveGoals(goals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

function renderHistory() {
  const goals = loadGoals();
  historyList.innerHTML = '';

  if (goals.length === 0) {
    historyEmpty.classList.remove('hidden');
    return;
  }
  historyEmpty.classList.add('hidden');

  goals.slice().reverse().forEach(g => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <div class="hi-main">
        <span class="hi-name">${escapeHtml(g.name)}</span>
        <span class="hi-meta">฿${g.dailySaving.toFixed(2)}/วัน · ${g.totalDays} วัน · บันทึกเมื่อ ${g.savedAt}</span>
      </div>
      <span class="hi-tag tag-${g.tier}">${g.tierLabel}</span>
      <button class="hi-delete" data-id="${g.id}" title="ลบรายการนี้">&times;</button>
    `;
    historyList.appendChild(li);
  });

  // wire up delete buttons
  historyList.querySelectorAll('.hi-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const remaining = loadGoals().filter(g => g.id !== id);
      saveGoals(remaining);
      renderHistory();
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Event wiring ----------
calcBtn.addEventListener('click', () => {
  const result = calculateGoal();
  if (result) {
    lastResult = result;
    renderStamp(result);
  }
});

saveBtn.addEventListener('click', () => {
  // if the user hasn't pressed "คำนวณ" yet (or changed inputs since), calculate fresh
  const result = calculateGoal();
  if (!result) return;
  lastResult = result;
  renderStamp(result);

  const goals = loadGoals();
  goals.push(result);
  saveGoals(goals);
  renderHistory();
});

clearBtn.addEventListener('click', () => {
  if (confirm('ต้องการล้างรายการที่บันทึกไว้ทั้งหมดหรือไม่?')) {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
  }
});

// ---------- Init ----------
renderHistory();
