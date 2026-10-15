const parts = {
  frame: { n: '01', category: 'Frameset', title: 'Frame & fork', description: 'The foundation of every ride. Lightweight alloy tubing balances a responsive feel with the strength for everyday roads.', spec: 'Alloy · road geometry' },
  drivetrain: { n: '02', category: 'Groupset', title: 'Drivetrain', description: 'A reliable Shimano Claris 2 × 8 setup. Find an easier gear for the climb, then settle into a steady rhythm on the open road.', spec: 'Shimano Claris · 2 × 8' },
  cockpit: { n: '03', category: 'Contact points', title: 'Cockpit', description: 'Classic drop bars and integrated shift levers put multiple hand positions and quick gear changes within reach.', spec: 'Drop bar · STI levers' },
  wheels: { n: '04', category: 'Wheelset', title: 'Wheelset', description: 'A 700c alloy wheelset with fine spokes and narrow road tires, ready for long stretches of smooth pavement.', spec: '700c · alloy rims' }
};
const inspector = document.querySelector('#part-card');
let selectedPart = 'frame';

function selectPart(key) {
  const part = parts[key];
  if (!part) return;
  setOrbitActive(false);
  selectedPart = key;
  inspector.classList.remove('closed');
  inspector.setAttribute('aria-hidden', 'false');
  document.querySelector('#part-number').innerHTML = `${part.n} <span>/ 04</span>`;
  document.querySelector('#part-category').textContent = part.category;
  document.querySelector('#part-title').textContent = part.title;
  document.querySelector('#part-description').textContent = part.description;
  document.querySelector('#part-spec').textContent = part.spec;
  document.querySelectorAll('.hotspot').forEach(el => el.classList.toggle('active', el.dataset.part === key));
  document.querySelectorAll('.dock-item').forEach(el => el.classList.toggle('active', el.dataset.part === key));
  window.focusBikePart?.(key);
}
window.selectBikePart = selectPart;

function setOrbitActive(active) {
  const button = document.querySelector('#orbit-button');
  button.classList.toggle('active', active);
  button.setAttribute('aria-pressed', String(active));
  button.setAttribute('aria-label', active ? 'Pause automatic bike rotation' : 'Start automatic bike rotation');
  button.querySelector('small').textContent = active ? 'Slow orbit' : 'Drag to rotate';
  window.setBikeAutoRotate?.(active);
}
window.setOrbitUi = setOrbitActive;

document.querySelectorAll('[data-part]').forEach(el => el.addEventListener('click', () => selectPart(el.dataset.part)));
document.querySelector('#close-card').addEventListener('click', () => {
  inspector.classList.add('closed');
  inspector.setAttribute('aria-hidden', 'true');
});

document.querySelector('#zoom-out').addEventListener('click', () => window.zoomBikeOverview?.());

const statsPanel = document.querySelector('#stats-panel');
const statsScrim = document.querySelector('#stats-scrim');
const statsTrigger = document.querySelector('#stats-button');
document.querySelectorAll('.view-option').forEach(button => button.addEventListener('click', () => {
  const isForest = button.dataset.view === 'forest';
  document.querySelector('.garage').classList.toggle('outdoor-view', isForest);
  document.querySelectorAll('.view-option').forEach(option => {
    const active = option === button;
    option.classList.toggle('active', active);
    option.setAttribute('aria-pressed', String(active));
  });
  document.querySelector('#scene-location').textContent = isForest ? 'Forest clearing' : 'Studio bay';
  window.setBikeEnvironment?.(isForest);
}));
function setStatsOpen(open) {
  document.querySelector('.garage').classList.toggle('stats-open', open);
  statsPanel.setAttribute('aria-hidden', String(!open));
  statsScrim.setAttribute('aria-hidden', String(!open));
  if (open) document.querySelector('#stats-close').focus();
  else statsTrigger.focus();
}
statsTrigger.addEventListener('click', () => setStatsOpen(true));
document.querySelector('#stats-close').addEventListener('click', () => setStatsOpen(false));
statsScrim.addEventListener('click', () => setStatsOpen(false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.querySelector('.garage').classList.contains('stats-open')) setStatsOpen(false);
});
document.querySelector('#orbit-button').addEventListener('click', e => {
  const button = e.currentTarget;
  setOrbitActive(!button.classList.contains('active'));
});
