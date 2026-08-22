const state = {
  artists: [],
  exhibitions: [],
  archive: { metadata: {}, timeline: [], externalProjects: [] },
  indexTab: 'artists'
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
}

async function init() {
  try {
    const [artists, exhibitions, archive] = await Promise.all([
      loadJSON('artists.json'),
      loadJSON('exhibitions.json'),
      loadJSON('archive.json')
    ]);
    state.artists = artists.artists || [];
    state.exhibitions = exhibitions.exhibitions || [];
    state.archive = archive;
  } catch (error) {
    console.error(error);
    $('#footerStatus').textContent = 'ARCHIVE STATUS: DATA ERROR';
  }

  renderHome();
  renderArchive();
  renderGallery();
  renderIndex();
  populateYearFilter();
  bindEvents();
  routeFromHash();
}

function bindEvents() {
  window.addEventListener('hashchange', routeFromHash);

  document.addEventListener('click', event => {
    const route = event.target.closest('[data-route]');
    if (route) {
      event.preventDefault();
      location.hash = route.dataset.route;
      return;
    }

    const record = event.target.closest('[data-record-id]');
    if (record) openRecord(record.dataset.recordType, record.dataset.recordId);

    const indexTab = event.target.closest('[data-index-tab]');
    if (indexTab) {
      state.indexTab = indexTab.dataset.indexTab;
      $$('.index-tab').forEach(tab => tab.classList.toggle('active', tab === indexTab));
      renderIndex();
    }
  });

  $('#yearFilter')?.addEventListener('change', renderArchive);
  $('#typeFilter')?.addEventListener('change', renderArchive);
  $('#archiveQuery')?.addEventListener('input', renderArchive);

  const searchDialog = $('#searchDialog');
  $('#globalSearch')?.addEventListener('input', event => renderSearch(event.target.value));
  $('.search-toggle')?.addEventListener('click', () => {
    searchDialog.showModal();
    setTimeout(() => $('#globalSearch')?.focus(), 30);
  });

  $('#recordClose')?.addEventListener('click', () => $('#recordDialog').close());
}

function routeFromHash() {
  const route = location.hash.replace('#', '') || 'home';
  const allowed = ['home', 'archive', 'gallery', 'index', 'about'];
  const view = allowed.includes(route) ? route : 'home';
  $$('.view').forEach(section => section.classList.toggle('active', section.dataset.view === view));
  $$('.primary-nav [data-route]').forEach(link => link.classList.toggle('active', link.dataset.route === view));
  $('#app')?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderHome() {
  const latest = [...state.exhibitions].sort((a, b) => Number(b.year) - Number(a.year)).slice(0, 3);
  $('#latestExhibitions').innerHTML = latest.map(exhibitionCard).join('');

  const timeline = state.archive.timeline || [];
  $('#timelineMini').innerHTML = timeline.slice(-5).map(item => `
    <article class="timeline-item">
      <div class="timeline-year">${item.year}</div>
      <div class="timeline-title">${escapeHTML(item.title)}</div>
      <p>${escapeHTML(item.description)}</p>
    </article>
  `).join('');

  const featured = state.exhibitions.find(item => item.id === 'venice-2009') || latest[0];
  if (featured) {
    $('#featureId').textContent = featured.archiveId || 'PZT-EXH';
    $('#featureTitle').textContent = featured.title;
    $('#featureYear').textContent = featured.year;
    $('#featureImage').src = featured.images?.[0] || '';
    $('#featureImage').alt = featured.title;
  }

  $('#roster').innerHTML = state.artists.slice(0, 10).map((artist, index) => `<li>${escapeHTML(artist.name)}</li>`).join('');
  $('#rosterCount').textContent = String(state.artists.length).padStart(2, '0');

  const years = new Set(state.exhibitions.map(item => item.year));
  $('#stats').innerHTML = [
    ['00' + state.artists.length, 'ARTISTS'],
    [String(state.exhibitions.length).padStart(3, '0'), 'EXHIBITIONS'],
    [String(state.exhibitions.reduce((sum, item) => sum + (item.images?.length || 0), 0)).padStart(3, '0'), 'IMAGES'],
    [years.size, 'YEARS INDEXED']
  ].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('');
}

function exhibitionCard(exhibition) {
  return `<a class="record-card" href="#gallery" data-route="gallery" data-record-id="${exhibition.id}" data-record-type="exhibition">
    <img class="record-image" src="${escapeAttribute(exhibition.images?.[0] || '')}" alt="${escapeAttribute(exhibition.title)}" loading="lazy">
    <div class="record-info">
      <div class="record-id">${escapeHTML(exhibition.archiveId || 'PZT-EXH')}</div>
      <div class="record-title">${escapeHTML(exhibition.title)}</div>
      <div class="record-meta">${exhibition.year} / ${escapeHTML(exhibition.city || '—')} / ${escapeHTML(exhibition.type || 'record')}</div>
    </div>
  </a>`;
}

function renderArchive() {
  const query = ($('#archiveQuery')?.value || '').trim().toLowerCase();
  const year = $('#yearFilter')?.value || 'all';
  const type = $('#typeFilter')?.value || 'all';

  let records = state.exhibitions.filter(item => {
    const haystack = JSON.stringify(item).toLowerCase();
    return (year === 'all' || String(item.year) === year) && (type === 'all' || item.type === type) && (!query || haystack.includes(query));
  });

  const timelineRecords = (state.archive.timeline || []).filter(item => {
    const haystack = JSON.stringify(item).toLowerCase();
    return (!query || haystack.includes(query)) && (year === 'all' || String(item.year) === year) && (type === 'all' || item.type === type);
  }).map(item => ({ ...item, archiveId: `PZT-TIM-${item.year}`, id: `timeline-${item.year}` }));

  const combined = [...records.map(item => ({ ...item, source: 'exhibition' })), ...timelineRecords.map(item => ({ ...item, source: 'timeline' }))]
    .sort((a, b) => Number(b.year) - Number(a.year));

  $('#archiveResults').innerHTML = combined.length ? combined.map(archiveRow).join('') : '<div class="archive-empty">NO RECORDS FOUND.</div>';
}

function archiveRow(record) {
  return `<a class="archive-record" href="#archive" data-record-id="${record.id}" data-record-type="${record.source}">
    <div class="archive-year">${record.year || '—'}</div>
    <div class="archive-id">${escapeHTML(record.archiveId || 'PZT')}</div>
    <div class="archive-title">${escapeHTML(record.title)}</div>
    <div class="archive-meta">${escapeHTML(record.venue || record.city || record.type || '')}</div>
  </a>`;
}

function populateYearFilter() {
  const years = [...new Set([
    ...state.exhibitions.map(item => item.year),
    ...(state.archive.timeline || []).map(item => item.year)
  ])].sort((a, b) => b - a);
  $('#yearFilter').innerHTML = '<option value="all">ALL</option>' + years.map(year => `<option value="${year}">${year}</option>`).join('');
}

function renderGallery() {
  const items = [];
  state.exhibitions.forEach(exhibition => {
    (exhibition.images || []).forEach((image, index) => items.push({ exhibition, image, index }));
  });
  $('#galleryGrid').innerHTML = items.map(({ exhibition, image, index }) => `
    <article class="gallery-item" data-record-id="${exhibition.id}" data-record-type="exhibition">
      <img src="${escapeAttribute(image)}" alt="${escapeAttribute(exhibition.title)} — image ${index + 1}" loading="lazy">
      <div class="gallery-caption"><strong>${escapeHTML(exhibition.title)}</strong><span>${exhibition.year}</span></div>
    </article>
  `).join('');
}

function renderIndex() {
  const container = $('#indexContent');
  if (state.indexTab === 'artists') {
    container.innerHTML = `<div class="index-list">${state.artists.map((artist, index) => `
      <article class="index-row" data-record-id="${artist.id}" data-record-type="artist">
        <div class="index-num">[${String(index + 1).padStart(2, '0')}]<br>${escapeHTML(artist.archiveId || '')}</div>
        <div class="index-name">${escapeHTML(artist.name)}</div>
        <div class="index-role">${escapeHTML(artist.role || '')}</div>
      </article>`).join('')}</div>`;
  } else {
    const records = [...state.exhibitions].sort((a, b) => Number(b.year) - Number(a.year));
    container.innerHTML = `<div class="index-list">${records.map((record, index) => `
      <article class="index-row" data-record-id="${record.id}" data-record-type="exhibition">
        <div class="index-num">[${String(index + 1).padStart(2, '0')}]<br>${escapeHTML(record.archiveId || '')}</div>
        <div class="index-name">${escapeHTML(record.title)}</div>
        <div class="index-role">${record.year} / ${escapeHTML(record.type || '')}</div>
      </article>`).join('')}</div>`;
  }
}

function openRecord(type, id) {
  const dialog = $('#recordDialog');
  const detail = $('#recordDetail');
  let record;

  if (type === 'artist') record = state.artists.find(item => item.id === id);
  else if (type === 'timeline') record = state.archive.timeline.find(item => `timeline-${item.year}` === id);
  else record = state.exhibitions.find(item => item.id === id);
  if (!record) return;

  const isArtist = type === 'artist';
  const image = isArtist ? record.portrait : record.images?.[0];
  detail.innerHTML = `<div class="detail-head">
    <span class="eyebrow">${escapeHTML(record.archiveId || 'PARAZIT RECORD')} / ${escapeHTML(type)}</span>
    <h2>${escapeHTML(record.title || record.name)}</h2>
    <p>${escapeHTML(record.description || record.bio || '')}</p>
  </div>
  ${image ? `<img class="detail-image" src="${escapeAttribute(image)}" alt="${escapeAttribute(record.title || record.name)}">` : ''}
  <div class="detail-grid">
    ${detailCell('YEAR', record.year)}
    ${detailCell('ROLE', record.role)}
    ${detailCell('TYPE', record.type)}
    ${detailCell('VENUE', record.venue)}
    ${detailCell('CITY', record.city)}
    ${detailCell('CURATOR', record.curator)}
    ${detailCell('DATES', record.start && record.end ? `${record.start} — ${record.end}` : '')}
    ${detailCell('STATUS', record.status || 'ARCHIVE RECORD')}
  </div>`;
  dialog.showModal();
}

function detailCell(label, value) {
  if (!value) return '';
  return `<div class="detail-cell"><span>${label}</span>${escapeHTML(value)}</div>`;
}

function renderSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    $('#searchResults').innerHTML = '<div class="archive-empty">TYPE TO SEARCH THE ARCHIVE.</div>';
    return;
  }

  const artists = state.artists.filter(item => JSON.stringify(item).toLowerCase().includes(q)).map(item => ({ type: 'artist', id: item.id, title: item.name, meta: item.role }));
  const exhibitions = state.exhibitions.filter(item => JSON.stringify(item).toLowerCase().includes(q)).map(item => ({ type: 'exhibition', id: item.id, title: item.title, meta: `${item.year} / ${item.city || ''}` }));
  const timeline = (state.archive.timeline || []).filter(item => JSON.stringify(item).toLowerCase().includes(q)).map(item => ({ type: 'timeline', id: `timeline-${item.year}`, title: item.title, meta: item.year }));
  const results = [...artists, ...exhibitions, ...timeline].slice(0, 20);

  $('#searchResults').innerHTML = results.length ? results.map(item => `<a href="#${item.type === 'artist' ? 'index' : 'archive'}" class="search-result" data-record-id="${item.id}" data-record-type="${item.type}"><strong>${escapeHTML(item.title)}</strong><br><small>${escapeHTML(item.type)} / ${escapeHTML(item.meta || '')}</small></a>`).join('') : '<div class="archive-empty">NO MATCHES.</div>';
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function escapeAttribute(value = '') { return escapeHTML(value); }

document.addEventListener('DOMContentLoaded', init);
