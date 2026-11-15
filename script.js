// =========================================
// 기본 요소
// =========================================
const scroller = document.getElementById('scroll');      // 테두리 안쪽 스크롤 영역
const header = document.getElementById('header');
const hero = document.getElementById('hero');
const worksTrack = document.getElementById('worksTrack');
const worksSection = document.getElementById('works');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

let projects = { web: [], video: [] };
let mode = 'web';          // 'web' 또는 'video'
let currentIndex = 0;


// =========================================
// 1. 관성 스크롤 (PC 마우스 휠에만)
// =========================================
const smooth = {
  enabled: window.matchMedia('(pointer: fine)').matches && !reduceMotion,
  target: 0,
  current: 0,
  running: false,
  ease: 0.1,               // 숫자가 작을수록 더 미끄러짐
};

function maxScroll() {
  return scroller.scrollHeight - scroller.clientHeight;
}

function smoothLoop() {
  smooth.current += (smooth.target - smooth.current) * smooth.ease;
  if (Math.abs(smooth.target - smooth.current) < 0.5) {
    smooth.current = smooth.target;
    smooth.running = false;
  }
  scroller.scrollTop = smooth.current;
  if (smooth.running) requestAnimationFrame(smoothLoop);
}

function startSmooth() {
  if (!smooth.running) {
    smooth.running = true;
    requestAnimationFrame(smoothLoop);
  }
}

// 작업물 구간: 휠을 두 번 정도 굴려야 다음 작업물로 한 칸 이동
const STEP_THRESHOLD = 150;   // 휠 한 번이 보통 100 → 두 번째에 넘어감
const STEP_COOLDOWN = 200;    // 한 칸 이동 후 잠깐 쉬기 (트랙패드 연속 이동 방지)
let stepAcc = 0;
let stepLockUntil = 0;

function itemY(i) {
  const { start, distance } = trackRange();
  return start + distance * ((i + 0.5) / Math.max(items().length, 1));
}

// true를 돌려주면 작업물 구간에서 처리한 것
function handleWorksWheel(delta) {
  if (isMobile() || !items().length) return false;
  const { start, distance } = trackRange();
  const end = start + distance;
  const y = smooth.target;
  const last = items().length - 1;

  // 위에서 들어올 때: 구간 시작을 넘으면 첫 작업물에 멈춤
  if (y < start - 1 && y + delta > start) { scrollToY(itemY(0)); stepAcc = 0; return true; }
  // 아래에서 들어올 때: 마지막 작업물에 멈춤
  if (y > end + 1 && y + delta < end) { scrollToY(itemY(last)); stepAcc = 0; return true; }

  if (y < start - 1 || y > end + 1) return false;        // 구간 밖

  // 구간 안인데 아직 첫/마지막 작업물 자리에 맞춰지지 않았으면 먼저 맞춤
  if (delta > 0 && y < itemY(0) - 1) { scrollToY(itemY(0)); stepAcc = 0; return true; }
  if (delta < 0 && y > itemY(last) + 1) { scrollToY(itemY(last)); stepAcc = 0; return true; }

  if (performance.now() < stepLockUntil) return true;
  if (Math.sign(delta) !== Math.sign(stepAcc)) stepAcc = 0;
  stepAcc += delta;
  if (Math.abs(stepAcc) < STEP_THRESHOLD) return true;

  const dir = stepAcc > 0 ? 1 : -1;
  stepAcc = 0;
  const next = currentIndex + dir;
  stepLockUntil = performance.now() + STEP_COOLDOWN;
  if (next > last) { scrollToY(end + 2); return true; }   // 마지막에서 아래로: 구간 밖으로
  if (next < 0) { scrollToY(start - 2); return true; }    // 처음에서 위로: 구간 밖으로
  scrollToY(itemY(next));
  return true;
}

if (smooth.enabled) {
  scroller.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;               // 화면 확대(ctrl+휠)는 그대로
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? scroller.clientHeight : 1;
    const delta = e.deltaY * unit;
    if (handleWorksWheel(delta)) return;
    smooth.target = Math.max(0, Math.min(maxScroll(), smooth.target + delta));
    startSmooth();
  }, { passive: false });
}

// 키보드·스크롤바로 움직였을 때 위치 맞추기
scroller.addEventListener('scroll', () => {
  if (!smooth.running) {
    smooth.target = smooth.current = scroller.scrollTop;
  }
});

// 원하는 위치로 이동 (immediate: 바로 이동)
function scrollToY(y, immediate = false) {
  y = Math.max(0, Math.min(maxScroll(), y));
  if (immediate) {
    smooth.running = false;
    smooth.target = smooth.current = y;
    scroller.scrollTop = y;
  } else if (smooth.enabled) {
    smooth.target = y;
    startSmooth();
  } else {
    scroller.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
}

// 요소의 스크롤 영역 안 위치
function topOf(el) {
  return el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
}

// 메뉴·로고 링크
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute('href').slice(1);
  if (!id) return;
  e.preventDefault();
  const y = id === 'top' ? 0 : topOf(document.getElementById(id));
  scrollToY(y);
});


// =========================================
// 2. 헤더 숨김·등장
// =========================================
let lastY = 0;
let idleTimer = null;
let headerLocked = false;    // 마우스를 올리면 true → 아래로 스크롤해야 풀림

function showHeader() { header.classList.remove('is-hidden'); }
function hideHeader() { header.classList.add('is-hidden'); }

function onHeaderScroll() {
  const y = scroller.scrollTop;
  const dy = y - lastY;
  lastY = y;
  const threshold = hero.offsetHeight / 2;   // 히어로 중간

  // 히어로가 보이는 동안은 바깥 테두리 양옆 선을 숨김 (style.css)
  document.body.classList.toggle('in-hero', y < hero.offsetHeight);

  clearTimeout(idleTimer);

  if (y < threshold) {
    showHeader();
    headerLocked = false;
    return;
  }
  if (dy > 0) {                 // 아래로
    headerLocked = false;
    hideHeader();
  } else if (dy < 0) {          // 위로
    showHeader();
  }

  // 스크롤이 멈추고 1초 뒤 숨김 (마우스가 올라가 있으면 유지)
  idleTimer = setTimeout(() => {
    if (!headerLocked && scroller.scrollTop >= threshold) hideHeader();
  }, 1000);
}

header.addEventListener('mouseenter', () => { headerLocked = true; showHeader(); });
header.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch') headerLocked = true;   // 모바일: 터치하면 유지
});


// =========================================
// 3. 작업물 화면 고정 스크롤
// =========================================
const listEl = document.getElementById('worksList');
const stripEl = document.getElementById('worksStrip');
const summaryEl = document.getElementById('worksSummary');
const mobileEl = document.getElementById('worksMobile');
const ticksL = document.getElementById('ticksLeft');
const ticksR = document.getElementById('ticksRight');
const TICK_COUNT = 21;

function items() { return projects[mode] || []; }

// 테두리 안쪽 높이를 CSS에 알려주고, 작업물 개수로 고정 구간 길이를 정한다
function layout() {
  const panelH = scroller.clientHeight;
  document.documentElement.style.setProperty('--panel-h', panelH + 'px');
  document.documentElement.style.setProperty('--contact-h', document.getElementById('contact').offsetHeight + 'px');
  const count = Math.max(items().length, 1);
  worksTrack.style.height = (panelH + count * panelH * 0.5) + 'px';
  placeStrip();
}

// 기간을 영어로: "17일" → "17 days", "2주" → "2 weeks" (그 외 글은 그대로)
function durationEn(d) {
  const m = /^(\d+)\s*(일|주)$/.exec(d || '');
  if (!m) return d || '';
  const n = Number(m[1]);
  return `${n} ${m[2] === '일' ? 'day' : 'week'}${n === 1 ? '' : 's'}`;
}

function renderWorks() {
  const list = items();

  // 왼쪽 목록: 짧은 이름(listTitle)이 있으면 그것을 씀
  listEl.innerHTML = list.map((p, i) => `
    <li data-index="${i}">
      <button type="button">
        <span>${p.listTitle || p.title}</span>
        <span class="meta">${durationEn(p.duration)}</span>
      </button>
    </li>`).join('');

  // 가운데 이미지 띠. 이미지가 없으면 단색 자리
  const picture = (p, label) => p.image
    ? `<img class="tone" src="${p.image}" alt="${p.title}" loading="lazy">`
    : `<div class="tone">${label}</div>`;

  // 이미지 위 버튼은 [Discover] 하나. 누르면 자세히 보기 팝업 ([Web][Process]는 팝업 안에)
  const actions = (i) => `
    <div class="actions"><button class="action discover" type="button" data-index="${i}">[Discover]</button></div>`;

  // 맨 위에 빈 칸을 하나 두어, 첫 작업물도 가운데에 오게 함 (2026-11-12: 마지막 작업물 그림은 넣지 않음)
  const ghost = list.length > 1 ? '<div class="strip-ghost" aria-hidden="true"></div>' : '';

  stripEl.innerHTML = ghost + list.map((p, i) => `
    <div class="strip-item">
      ${picture(p, `대표 이미지 자리<br>${p.title}`)}
      <i class="corners"></i>
      ${actions(i)}
    </div>`).join('');

  // 모바일 목록 (마우스가 없어서 버튼을 항상 보여줌)
  mobileEl.innerHTML = list.map((p, i) => `
    <div class="m-item">
      <div class="m-image">
        ${picture(p, '대표 이미지 자리')}
        ${actions(i)}
      </div>
      <p class="m-title"><span>${p.listTitle || p.title}</span><span class="meta">${durationEn(p.duration)}</span></p>
      <p class="text" style="margin-top:6px">${p.summary}</p>
    </div>`).join('');

  // 진행 표시 눈금
  const ticks = Array.from({ length: TICK_COUNT }, () => '<i></i>').join('');
  ticksL.innerHTML = ticks;
  ticksR.innerHTML = ticks;

  currentIndex = -1;
  layout();
  updateWorks(true);
}

// 띠를 옮겨 현재 작업물을 가운데에
function placeStrip() {
  const view = stripEl.parentElement;
  const viewH = view.clientHeight;
  const itemH = 400;   // 이미지 높이 (2026-11-13 348 → 400, 같은 비율로 키움. style.css .works-stage 가운데 칸 폭 455px과 짝)
  const gap = 40;      // style.css .works-strip gap과 같아야 함
  stripEl.querySelectorAll('.strip-item').forEach((el) => { el.style.height = itemH + 'px'; });
  const slots = Math.max(currentIndex, 0) + (stripEl.querySelector('.strip-ghost') ? 1 : 0);   // 맨 위 반투명 칸만큼 한 칸 더
  const offset = (viewH - itemH) / 2 - slots * (itemH + gap);
  stripEl.style.transform = `translateY(${offset}px)`;
}

function setIndex(i) {
  const list = items();
  if (!list.length || i === currentIndex) return;
  currentIndex = i;
  const p = list[i];

  listEl.querySelectorAll('li').forEach((li, n) => li.classList.toggle('is-current', n === i));
  stripEl.querySelectorAll('.strip-item').forEach((el, n) => el.classList.toggle('is-current', n === i));
  scrambleTo(summaryEl, p.summary);
  placeStrip();
}

// 문자 효과: 영문·기호가 마구 바뀌다가 왼쪽부터 한글 문장으로 완성
const SCRAMBLE_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/?[]{}#$%^&*=+-_|!~';
let scrambleRun = 0;
const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

function scrambleTo(el, text) {
  const ghost = el.querySelector('.ghost');
  const live = el.querySelector('.live');
  ghost.textContent = text;
  const run = ++scrambleRun;

  if (reduceMotion) { live.textContent = text; return; }

  const chars = [...text];
  const duration = 900;                                   // 전체 길이 (ms)
  const settle = chars.map((_, i) =>
    (i / chars.length) * duration * 0.75 + Math.random() * duration * 0.25);
  const start = performance.now();
  let frame = 0;

  function tick(now) {
    if (run !== scrambleRun) return;                      // 다음 작업물로 바뀌면 중단
    const t = now - start;
    if (frame++ % 2 === 0) {                              // 너무 빠르지 않게 두 프레임마다
      // 아직 돌고 있는 글자는 주황(<b>), 자리 잡은 글자는 원래 색
      live.innerHTML = chars.map((c, i) => {
        if (c === ' ' || t >= settle[i]) return escapeHtml(c);
        return `<b>${escapeHtml(SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)])}</b>`;
      }).join('');
    }
    if (t < duration) requestAnimationFrame(tick);
    else live.textContent = text;
  }
  requestAnimationFrame(tick);
}

function trackRange() {
  const start = topOf(worksTrack);
  const distance = worksTrack.offsetHeight - scroller.clientHeight;
  return { start, distance };
}

function updateWorks(force = false) {
  if (isMobile()) return;
  const list = items();
  if (!list.length) return;
  const { start, distance } = trackRange();
  const progress = Math.max(0, Math.min(1, (scroller.scrollTop - start) / distance));
  const i = Math.min(list.length - 1, Math.floor(progress * list.length));
  if (force) currentIndex = -1;
  setIndex(i);

  const on = Math.round(progress * (TICK_COUNT - 1));
  [ticksL, ticksR].forEach((t) => {
    t.querySelectorAll('i').forEach((tick, n) => tick.classList.toggle('is-on', n === on));
  });
}

// 목록을 누르면 해당 작업물 위치로 이동
listEl.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const i = Number(li.dataset.index);
  const { start, distance } = trackRange();
  scrollToY(start + distance * ((i + 0.5) / items().length));
});


// =========================================
// 4. 웹 / 영상 전환 — 로딩 종이가 가운데로 닫혔다가 다시 열림
// =========================================
let switching = false;

function applyMode(next) {
  const y = scroller.scrollTop;
  const secTop = topOf(worksSection);
  const inWorks = y >= secTop - 1 && y < secTop + worksSection.offsetHeight;

  mode = next;
  document.body.dataset.mode = next;
  renderWorks();

  // 작업물 섹션에서 눌렀다면 첫 작업물로 맞춤, 그 외에는 그 자리 그대로
  if (inWorks) scrollToY(topOf(worksSection), true);
}

function switchMode(next) {
  if (switching || next === mode) return;

  if (reduceMotion) { applyMode(next); return; }

  switching = true;
  switchCurtain(next).then(() => { switching = false; });
}

// 전환 (2026-11-12): 로딩 종이를 다시 씀. 헤더 아래 선과 히어로 아래 선 자리에 종이를 깔고(헤더 글자가 사라짐)
// → 두 선이 가운데로 모여 닫힘 → 덮인 동안 모드를 바꾸고 히어로 연출을 처음 상태로 → 다시 벌어지며 열림 → 종이가 걷히며 헤더 글자가 생김
async function switchCurtain(next) {
  const heroBottom = hero.getBoundingClientRect().bottom;
  const frame = scroller.getBoundingClientRect();
  const top = Math.max(header.getBoundingClientRect().bottom, frame.top);
  // 히어로 아래 선이 화면 안에 보이면 거기, 아니면 화면 아래 테두리
  const bottom = heroBottom > top + 40 && heroBottom <= frame.bottom ? heroBottom : frame.bottom;
  const center = innerHeight / 2;   // 닫혔을 때 두 종이가 만나는 가운데 선
  loader.style.setProperty('--open-top', `${top - center}px`);
  loader.style.setProperty('--open-bottom', `${bottom - center}px`);
  loader.style.setProperty('--line-p', 1);

  // 1) 열린 자리에 종이를 바로 놓고 서서히 나타냄 (안 움직이는 부분은 그대로 보여서 헤더 글자만 사라지는 것처럼 보임)
  loader.classList.add('is-switch', 'is-open', 'is-fade');
  loader.classList.remove('is-done');
  loader.getBoundingClientRect();
  loader.classList.remove('is-fade');
  await wait(300);
  // 2) 가운데로 닫힘
  loader.classList.remove('is-open');
  await wait(780);
  // 3) 덮인 동안 바꾸기 + 히어로 연출을 처음 상태로 되돌림
  applyMode(next);
  document.body.classList.add('hero-reset');
  document.body.classList.remove('hero-set');
  document.body.getBoundingClientRect();
  document.body.classList.remove('hero-reset');
  await wait(120);
  // 4) 다시 열림 → 히어로 연출 다시 재생 → 종이가 걷힘
  loader.classList.add('is-open');
  await wait(800);
  document.body.classList.add('hero-set');
  await wait(300);
  loader.classList.add('is-fade');
  await wait(400);
  loader.classList.add('is-done');
  loader.classList.remove('is-switch');
}

// 헤더 로고 옆 Web / Video 버튼 (2026-11-12)
document.querySelectorAll('[data-switch]').forEach((btn) => {
  btn.addEventListener('click', () => switchMode(btn.dataset.switch));
});


// =========================================
// 5. 스킬: 섹션에 들어오면 스케치가 그려짐 / 칸을 누르면 작품 팝업
// =========================================
const skillGrid = document.querySelector('.skill-grid');
new IntersectionObserver((entries, obs) => {
  if (entries[0].isIntersecting) { skillGrid.classList.add('is-drawn'); obs.disconnect(); }
}, { root: scroller, threshold: 0.35 }).observe(skillGrid);

// 팝업에 나열할 작품 (웹은 작업물 데이터에서 가져옴)
const SKILL_WORKS = {
  // 묶음마다 [소제목, [이미지, 설명]...]
  // youtube: 목록 대신 이 영상을 바로 재생 (주소 https://youtu.be/ 뒤의 글자)
  video: { title: '영상편집 하이라이트', youtube: 'jGwCoICCJBI' },
  // zoom: 이미지를 누르면 새 탭 대신 팝업 가운데에 크게 띄움
  design: { title: '디자인', zoom: true, groups: [
    ['Photoshop', [
      ['images/works/ps-00.webp', '유튜브 썸네일'],
      ['images/works/ps-01.webp', '카드뉴스'],
    ]],
    ['Illustrator', [
      ['images/works/il-02.webp', '좋아하는 애니메이션 장면'],
      ['images/works/il-08.webp', '일러스트'],
      ['images/works/il-09.webp', '일러스트'],
      ['images/works/il-10.webp', '일러스트'],
      ['images/works/il-11.webp', '일러스트'],
      ['images/works/il-13.webp', '런치패드'],
      ['images/works/il-07.webp', '펜'],
      ['images/works/il-12.webp', '소품: 검'],
      ['images/works/il-14.webp', '소품: 몽둥이'],
      ['images/works/il-16.webp', '소품: 석궁'],
      ['images/works/il-17.webp', '소품: 리볼버'],
      ['images/works/il-15.webp', '병원 복도'],
    ]],
  ] },
};

const modal = document.getElementById('modal');
const modalGrid = document.getElementById('modalGrid');
let modalFrom = null;   // 닫으면 누른 칸으로 초점을 돌려줌

function openModal(key, from) {
  const s = SKILL_WORKS[key];
  if (s.youtube) {
    showModal(s.title, `<iframe src="https://www.youtube-nocookie.com/embed/${s.youtube}?autoplay=1&rel=0&enablejsapi=1" title="${s.title}"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`, false, from);
    modalGrid.className = 'modal-player';
    // 시작 음량 30%: 플레이어가 준비되는 시점이 일정하지 않아 몇 번 나눠 보냄
    const player = modalGrid.querySelector('iframe');
    const setVolume = () => player.contentWindow && player.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[30]}', '*');
    player.addEventListener('load', () => [0, 500, 1500].forEach((ms) => setTimeout(setVolume, ms)));
    return;
  }
  const html = s.groups.map(([sub, items]) => `
    ${sub ? `<p class="modal-sub">${sub}</p>` : ''}
    ${items.map(([src, cap]) => `
      <figure><a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="${cap}" loading="lazy"></a>
        <figcaption>${cap}</figcaption></figure>`).join('')}`).join('');   // 누르면 새 탭에서 크게
  showModal(s.title, html, false, from);
  modalGrid.classList.toggle('can-zoom', !!s.zoom);
}

// 팝업 안 이미지 크게 보기: 아무 데나 누르거나 Esc로 닫음
const zoom = document.getElementById('zoom');
modalGrid.addEventListener('click', (e) => {
  const a = e.target.closest('.can-zoom a');
  if (!a) return;
  e.preventDefault();
  const img = zoom.querySelector('img');
  img.src = a.href;
  img.alt = a.querySelector('img').alt;
  zoom.hidden = false;
});
zoom.addEventListener('click', () => { zoom.hidden = true; });

// 작업물 자세히 보기 (tour-kyrgyzstan.com 구성: 큰 제목 → 이미지 → 4칸 정보 → 과정)
function openWork(i, from) {
  const p = items()[i];
  if (!p) return;
  const facts = (p.facts || []).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const steps = (p.steps || []).map(([name, when], n) => `
    <li><span class="num">${String(n + 1).padStart(2, '0')}</span><b>${name}</b>${when ? `<span class="meta">${when}</span>` : ''}</li>`).join('');
  const html = `
    <div class="detail">
      <div class="detail-media">
        <div class="detail-image">${p.image ? `<img src="${p.detailImage || p.image}" alt="${p.title}">` : ''}<i class="corners"></i></div>
      </div>
      <div class="detail-info">
        <h2 class="detail-title">${p.title}</h2>
        ${p.headline ? `<p class="detail-lead">${p.headline}</p>` : ''}
        <dl class="detail-facts">${facts}</dl>
        <p class="detail-summary">${p.summary}</p>
        ${steps ? `<p class="detail-sub">작업 과정</p><ol class="detail-steps">${steps}</ol>` : ''}
        <div class="detail-actions">
          <a class="action" href="${p.siteUrl}" target="_blank" rel="noopener">[${p.siteLabel}]</a>
          ${p.processUrl.endsWith('.pdf') ? `<a class="action" href="${p.processUrl}" target="_blank" rel="noopener">[Process]</a>` : ''}
          ${p.githubUrl ? `<a class="action" href="${p.githubUrl}" target="_blank" rel="noopener">[GitHub]</a>` : ''}
        </div>
      </div>
    </div>`;
  // 창 위 분류 이름: category가 있으면 그것 (예: 일체형 웹)
  showModal(p.category || (mode === 'web' ? '웹' : '영상편집'), html, true, from);
}
// [Process]: 기획서 PDF를 새 탭으로 엶 (브라우저 PDF 보기). PDF가 아직 없는 작업물은 버튼을 숨김

function showModal(title, html, detail, from) {
  document.getElementById('modalTitle').textContent = title;
  modalGrid.className = detail ? 'modal-body' : 'modal-grid';
  modal.classList.toggle('is-detail', detail);
  modalGrid.innerHTML = html;
  modalGrid.scrollTop = 0;
  modal.hidden = false;
  modal.querySelector('.modal-panel').scrollTop = 0;
  modal.getBoundingClientRect();              // 시작 상태(테두리가 바깥 테두리와 겹침) 적용
  modal.classList.add('is-open');             // → 테두리가 안쪽으로 좁아짐 (style.css)
  modalFrom = from;
  document.getElementById('modalClose').focus({ preventScroll: true });
}

// [Discover] 버튼 (PC 띠·모바일 목록 공통)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.discover');
  if (btn) openWork(Number(btn.dataset.index), btn);
});

function closeModal() {
  zoom.hidden = true;
  const player = modalGrid.querySelector('iframe');
  if (player) player.remove();                // 영상을 끔 (그냥 숨기면 소리가 계속 남)
  modal.classList.remove('is-open');          // 내용이 빠지고 테두리가 다시 바깥으로 넓어진 뒤 닫힘
  const wait = modal.classList.contains('is-detail') && !reduceMotion ? 700 : 0;
  setTimeout(() => { if (!modal.classList.contains('is-open')) modal.hidden = true; }, wait);
  if (modalFrom) modalFrom.focus({ preventScroll: true });   // 초점만 돌려주고 화면은 그대로
}

// 그림을 누르면(또는 키보드 Enter/Space) 팝업
function openFromArt(e) {
  const art = e.target.closest('.cell[data-skill] .skill-art');
  if (!art) return;
  if (e.type === 'keydown') { if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); }
  // 키보드로 열었을 때만 닫은 뒤 그림으로 초점을 돌려줌 (마우스로 열면 테두리가 남지 않게)
  openModal(art.closest('.cell').dataset.skill, e.type === 'keydown' ? art : null);
}
skillGrid.addEventListener('click', openFromArt);
skillGrid.addEventListener('keydown', openFromArt);
document.getElementById('modalClose').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });   // 바깥(흐린 곳) 누르면 닫힘
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || modal.hidden) return;
  if (!zoom.hidden) zoom.hidden = true;       // 크게 본 이미지가 있으면 그것만 먼저 닫음
  else closeModal();
});


// =========================================
// 6. 한 문장 화면: 화면을 채운 뒤 더 내리면 문장이 흐려짐
// =========================================
const statement = document.getElementById('statement');
const statementText = document.getElementById('statementText');
const statementText2 = document.getElementById('statementText2');
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function updateStatement() {
  if (reduceMotion) return;
  const p = (scroller.scrollTop - topOf(statement)) / scroller.clientHeight;   // 화면을 채운 순간 0, 한 화면 내릴 때마다 +1
  // 첫 문장: 0~0.5 흐려짐 → 0.5~0.9 사라짐
  statementText.style.setProperty('--dim', clamp01(p / 0.5).toFixed(3));
  statementText.style.setProperty('--op', (1 - clamp01((p - 0.5) / 0.4)).toFixed(3));
  // 두 번째 문장: 1~1.3 나타나서 그대로 남음 (끝에 연락 칸이 아래서 올라와 붙음)
  statementText2.style.setProperty('--op', clamp01((p - 1) / 0.3).toFixed(3));
}


// =========================================
// 공통: 스크롤·크기 변화
// =========================================
let ticking = false;
scroller.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    onHeaderScroll();
    updateWorks();
    updateStatement();
    ticking = false;
  });
});

window.addEventListener('resize', () => { layout(); updateWorks(true); });

// =========================================
// 5. 로딩 — 새로고침할 때마다 재생
// =========================================
const loader = document.getElementById('loader');
const LINE1 = '방동훈';
const LINE2 = 'Portfolio';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 한글을 치는 순서대로 나누기: 방 → ㅂ, 바, 방
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
function keySteps(ch) {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return [ch];          // 한글이 아니면 그대로
  const cho = Math.floor(code / 588);
  const jung = Math.floor((code % 588) / 28);
  const jong = code % 28;
  const steps = [CHO[cho], String.fromCharCode(0xac00 + cho * 588 + jung * 28)];
  if (jong) steps.push(ch);
  return steps;
}

// 사람이 치는 것처럼 한 타마다 간격을 조금씩 다르게
const keyDelay = (base) => base * (0.7 + Math.random() * 0.7);

// 가운데 선: 한 타 칠 때마다 조금씩 양쪽으로 그어져, 마지막 글자와 함께 끝까지 닿음
const TOTAL_KEYS = [...LINE1 + LINE2].reduce((n, ch) => n + keySteps(ch).length, 0);
let typedKeys = 0;

async function typeLine(el, text, base) {
  const caret = el.nextElementSibling;
  caret.classList.remove('is-blink');
  caret.classList.add('is-on');
  let done = '';
  for (const ch of text) {
    if (loaderSkipped) return;
    for (const step of keySteps(ch)) {
      el.textContent = done + step;
      typedKeys += 1;
      loader.style.setProperty('--line-p', typedKeys / TOTAL_KEYS);
      await wait(keyDelay(base));
    }
    done += ch;
  }
}

function blinkCaret(el) {
  const caret = el.nextElementSibling;
  caret.classList.remove('is-on');
  caret.classList.add('is-blink');
}
function hideCaret(el) {
  el.nextElementSibling.classList.remove('is-on', 'is-blink');
}

// 열림: 가운데 선이 둘로 갈라져 히어로 윗줄 칸의 위·아래 선 자리에서 멈춤
// → 위쪽 종이는 헤더 칸, 아래쪽 종이는 설명 칸을 딱 덮은 채로 남고, 그 자리에서 내용이 나타남
async function openLoader() {
  const cell = document.querySelector('.hero-a').getBoundingClientRect();   // 히어로 윗줄 칸: 위 = 헤더 선, 아래 = 아래 줄 선
  const mid = loader.querySelector('.loader-top').getBoundingClientRect().bottom;
  loader.style.setProperty('--open-top', `${cell.top - mid}px`);
  loader.style.setProperty('--open-bottom', `${cell.bottom - mid}px`);
  loader.classList.add('is-open');
  await wait(800);
  document.body.classList.add('hero-set'); // 히어로 칸 선·꺾쇠·글이 나타남 (style.css)
  await wait(450);
  loader.classList.add('is-fade');         // 종이가 걷히며 헤더·설명 칸 내용이 보임 (선은 그대로 이어짐)
  await wait(400);
  loader.classList.add('is-done');
  loaderActive = false;
}

// 건너뛰기 (2026-11-15): 로딩 중 스크롤(휠·터치·아래 방향 키)하면 바로 끝나고 히어로가 나옴
// 그 스크롤은 페이지를 움직이지 않게 막음 → 히어로가 맨 위에서 시작
let loaderActive = true;
let loaderSkipped = false;
const SKIP_KEYS = ['ArrowDown', 'PageDown', ' ', 'End'];
function skipLoader(e) {
  if (!loaderActive) return;
  if (e.type === 'keydown' && !SKIP_KEYS.includes(e.key)) return;
  e.preventDefault();
  e.stopPropagation();                     // 관성 스크롤(wheel 처리)까지 가지 않게
  if (loaderSkipped || loader.classList.contains('is-open')) return;   // 이미 열리는 중이면 그대로 둠
  loaderSkipped = true;
  loaderActive = false;
  document.body.classList.add('hero-set');
  loader.classList.add('is-fade');
  setTimeout(() => loader.classList.add('is-done'), 400);
}
['wheel', 'touchmove', 'keydown'].forEach((type) => window.addEventListener(type, skipLoader, { capture: true, passive: false }));

async function playLoader() {
  if (reduceMotion) { loaderActive = false; loader.classList.add('is-done'); document.body.classList.add('hero-set'); return; }
  const l1 = document.getElementById('loaderLine1');
  const l2 = document.getElementById('loaderLine2');

  blinkCaret(l1);
  await wait(450);                         // 시작 전 커서 깜빡임
  await typeLine(l1, LINE1, 115);          // 한글: 자모 조합
  hideCaret(l1);
  blinkCaret(l2);
  await wait(350);                         // 줄 바꿈
  await typeLine(l2, LINE2, 100);
  blinkCaret(l2);
  await wait(600);                         // 다 친 뒤 잠깐 멈춤
  hideCaret(l2);
  if (loaderSkipped) return;               // 건너뛰었으면 이미 히어로가 나와 있음
  openLoader();
}

playLoader();


// 작업물 데이터 불러오기
fetch('data/projects.json')
  .then((res) => res.json())
  .then((data) => { projects = data; renderWorks(); })
  .catch(() => { summaryEl.textContent = '작업물 데이터를 불러오지 못했습니다.'; });

layout();
