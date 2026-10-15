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
}
window.selectBikePart = selectPart;

document.querySelectorAll('[data-part]').forEach(el => el.addEventListener('click', () => selectPart(el.dataset.part)));
document.querySelector('#close-card').addEventListener('click', () => {
  inspector.classList.add('closed');
  inspector.setAttribute('aria-hidden', 'true');
});

const menu = document.querySelector('#menu-panel');
document.querySelector('#menu-button').addEventListener('click', () => menu.classList.toggle('open'));
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => menu.classList.remove('open')));

const toast = document.querySelector('#stats-toast');
document.querySelector('#stats-button').addEventListener('click', () => toast.classList.toggle('open'));
document.querySelector('#dismiss-toast').addEventListener('click', () => toast.classList.remove('open'));
document.querySelectorAll('a[href="#ride-log"]').forEach(link => link.addEventListener('click', e => { e.preventDefault(); toast.classList.add('open'); }));

document.querySelector('#orbit-button').addEventListener('click', e => {
  const button = e.currentTarget;
  button.classList.toggle('active');
  const active = button.classList.contains('active');
  button.setAttribute('aria-pressed', String(active));
  button.querySelector('small').textContent = active ? 'Auto orbit active' : 'Drag to rotate';
  window.setBikeAutoRotate?.(active);
});
