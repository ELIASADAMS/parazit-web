const state = {
  archive: {},
  artists: [],
  exhibitions: [],
  artworks: [],
  documents: [],
  venues: [],
  snapshots: [],
  sources: [],
  relations: [],
  indexTab: 'artists'
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

async function loadJSON(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
}

async function init() {
  try {
    const [archive, artists, exhibitions, artworks, documents, venues, snapshots, sources, relations] = await Promise.all([
      loadJSON('archive.json'), loadJSON('artists.json'), loadJSON('exhibitions.json'), loadJSON('artworks.json'),
      loadJSON('documents.json'), loadJSON('venues.json'), loadJSON('snapshots.json'), loadJSON('sources.json'), loadJSON('relations.json')
    ]);
    state.archive = archive;
    state.artists = artists.artists || [];
    state.exhibitions = exhibitions.exhibitions || [];
    state.artworks = artworks.artworks || [];
    state.documents = documents.documents || [];
    state.venues = venues.venues || [];
    state.snapshots = snapshots.snapshots || [];
    state.sources = sources.sources || [];
    state.relations = relations.relations || [];
    validateData();
    renderAll();
    populateFilters();
    bindEvents();
    routeFromHash();
  } catch (error) {
    console.error(error);
    $('#footerStatus').textContent = 'ARCHIVE STATUS: DATA ERROR';
  }
}

function validateData() {
  const ids = new Map();
  const collections = [
    ['artist', state.artists], ['exhibition', state.exhibitions], ['artwork', state.artworks],
    ['document', state.documents], ['venue', state.venues], ['snapshot', state.snapshots]
  ];
  collections.forEach(([type, items]) => items.forEach(item => {
    const key = `${type}:${item.id}`;
    if (ids.has(key)) console.warn('Duplicate archive ID:', key);
    ids.set(key, item);
  }));
  state.relations.forEach(relation => ['from','to'].forEach(side => {
    const ref = relation[side];
    if (ref && !ids.has(`${ref.type}:${ref.id}`) && ref.type !== 'institution') console.warn('Unresolved relation:', ref);
  }));
}

const recordCollections = {
  artist: 'artists', exhibition: 'exhibitions', artwork: 'artworks',
  document: 'documents', venue: 'venues', snapshot: 'snapshots'
};

function getRecord(type, id) {
  return (state[recordCollections[type]] || []).find(item => item.id === id);
}

function allRecords() {
  return Object.entries(recordCollections).flatMap(([recordType, collection]) =>
    (state[collection] || []).map(item => ({ ...item, recordType }))
  );
}

function labelFor(type) {
  return ({artist:'ARTIST', exhibition:'EXHIBITION', artwork:'ARTWORK', document:'DOCUMENT', venue:'VENUE', snapshot:'SNAPSHOT'}[type] || String(type).toUpperCase());
}

function nameFor(ref) {
  const record = ref && getRecord(ref.type, ref.id);
  return record?.name || record?.title || record?.originalUrl || ref?.id || '—';
}

function related(type, id) {
  const refs = [];
  state.relations.forEach(rel => {
    if (rel.from?.type === type && rel.from?.id === id) refs.push({ relation: rel.relation, direction:'out', ref: rel.to, role: rel.role, sourceIds: rel.sourceIds || [] });
    if (rel.to?.type === type && rel.to?.id === id) refs.push({ relation: rel.relation, direction:'in', ref: rel.from, role: rel.role, sourceIds: rel.sourceIds || [] });
  });
  const record = getRecord(type, id);
  const addRefs = (ids, relation, refType) => (ids || []).forEach(refId => refs.push({ relation, direction:'out', ref:{ type: refType, id:refId } }));
  addRefs(record?.artistIds || record?.artists, 'includes-artist', 'artist');
  addRefs(record?.exhibitionIds, 'shown-in', 'exhibition');
  addRefs(record?.artworkIds, 'includes-work', 'artwork');
  addRefs(record?.documentIds, 'documented-by', 'document');
  if (record?.venueId) refs.push({ relation:'held-at', direction:'out', ref:{ type:'venue', id:record.venueId } });
  return refs.filter((item, index, arr) => item.ref && arr.findIndex(x => `${x.ref.type}:${x.ref.id}:${x.relation}` === `${item.ref.type}:${item.ref.id}:${item.relation}`) === index);
}

function renderAll() {
  renderHome();
  renderArchive();
  renderGallery();
  renderIndex();
  $('#systemTicker').textContent = `PARAZIT DATABASE • ${allRecords().length} RECORDS • ${state.relations.length} RELATIONS • SOURCE-AWARE ARCHIVE • EST. 2000 •`;
  $('#footerStatus').textContent = `ARCHIVE STATUS: ${state.archive.metadata?.status || 'ACTIVE'}`;
}

function renderHome() {
  const latest = [...state.exhibitions].sort((a,b) => Number(b.year || 0)-Number(a.year || 0)).slice(0,4);
  $('#latestExhibitions').innerHTML = latest.map(exhibitionCard).join('');

  const timeline = (state.archive.timeline || []).slice().sort((a,b)=>Number(a.year)-Number(b.year)).slice(-6);
  $('#timelineMini').innerHTML = timeline.map(item => `
    <button class="timeline-item" type="button" data-timeline-year="${esc(item.year)}">
      <span class="timeline-year">${esc(item.year)}</span>
      <span class="timeline-title">${esc(item.title)}</span>
      <span class="timeline-copy">${esc(item.description)}</span>
    </button>`).join('');

  const featured = state.artworks.find(x => x.images?.length) || state.exhibitions.find(x => x.images?.length) || state.exhibitions[0];
  if (featured) {
    $('#featureId').textContent = featured.archiveId || '—';
    $('#featureTitle').textContent = featured.title || featured.name || 'PARAZIT';
    $('#featureYear').textContent = featured.year || '';
    const image = featured.images?.[0];
    if (image) { $('#featureImage').src = image; $('#featureImage').alt = featured.title || featured.name; }
  }

  const documentedArtists = state.artists.filter(x => x.status === 'documented participant' || x.status === 'documented');
  $('#rosterCount').textContent = String(documentedArtists.length).padStart(2,'0');
  $('#roster').innerHTML = documentedArtists.slice(0,10).map((x,i) => `<li><button type="button" class="roster-link" data-record-type="artist" data-record-id="${esc(x.id)}"><span>[${String(i+1).padStart(2,'0')}]</span>${esc(x.name)}</button></li>`).join('');

  $('#stats').innerHTML = [
    [state.artists.length,'ARTISTS'], [state.exhibitions.length,'EXHIBITIONS'], [state.artworks.length,'WORKS'], [state.documents.length,'DOCUMENTS']
  ].map(([value,label]) => `<div class="stat"><strong>${String(value).padStart(2,'0')}</strong><span>${label}</span></div>`).join('');
}

function exhibitionCard(ex) {
  const image = ex.images?.[0] || 'images/venice-1.jpg';
  const venue = getRecord('venue', ex.venueId)?.name || ex.city || '';
  return `<button type="button" class="record-card" data-record-type="exhibition" data-record-id="${esc(ex.id)}">
    <img class="record-image" src="${esc(image)}" alt="${esc(ex.title)}" loading="lazy">
    <span class="record-info"><span class="record-id">${esc(ex.archiveId || '')}</span><span class="record-title">${esc(ex.title)}</span><span class="record-meta">${esc(ex.year)} / ${esc(venue)}</span></span>
  </button>`;
}

function renderArchive() {
  const query = ($('#archiveQuery')?.value || '').trim().toLowerCase();
  const year = $('#yearFilter')?.value || 'all';
  const type = $('#typeFilter')?.value || 'all';
  const events = state.exhibitions.filter(item => {
    const text = JSON.stringify(item).toLowerCase();
    return (year === 'all' || String(item.year) === year) && (type === 'all' || item.type === type) && (!query || text.includes(query));
  }).sort((a,b)=>Number(b.year || 0)-Number(a.year || 0));

  $('#archiveResults').innerHTML = events.length ? events.map(ex => {
    const venue = getRecord('venue', ex.venueId);
    return `<button type="button" class="archive-record" data-record-type="exhibition" data-record-id="${esc(ex.id)}">
      <span class="archive-year">${esc(ex.year)}</span><span class="archive-type">${esc(ex.type)}</span>
      <span class="archive-title">${esc(ex.title)}</span><span class="archive-meta">${esc(venue?.name || ex.city || '—')}</span>
    </button>`;
  }).join('') : '<div class="archive-empty">NO RECORDS / TRY ANOTHER QUERY</div>';
}

function renderGallery() {
  const items = [];
  state.artworks.forEach(work => (work.images || []).forEach(image => items.push({image, title:work.title, year:work.year, type:'artwork', id:work.id})));
  state.exhibitions.forEach(ex => (ex.images || []).forEach(image => items.push({image, title:ex.title, year:ex.year, type:'exhibition', id:ex.id})));
  $('#galleryGrid').innerHTML = items.length ? items.map(item => `<button type="button" class="gallery-item" data-record-type="${esc(item.type)}" data-record-id="${esc(item.id)}"><img src="${esc(item.image)}" alt="${esc(item.title)}" loading="lazy"><span class="gallery-caption"><strong>${esc(item.title)}</strong><span>${esc(item.year || '')}</span></span></button>`).join('') : '<div class="archive-empty">IMAGE INDEX / NO DIGITIZED IMAGES YET</div>';
}

function renderIndex() {
  const configs = {
    artists: {records:state.artists, type:'artist', name:x=>x.name, meta:x=>x.role || x.status},
    exhibitions: {records:state.exhibitions, type:'exhibition', name:x=>x.title, meta:x=>`${x.year || '—'} / ${x.type || '—'}`},
    artworks: {records:state.artworks, type:'artwork', name:x=>x.title, meta:x=>`${x.year || '—'} / ${x.medium || '—'}`},
    documents: {records:state.documents, type:'document', name:x=>x.title, meta:x=>`${x.date || '—'} / ${x.type || '—'}`},
    venues: {records:state.venues, type:'venue', name:x=>x.name, meta:x=>`${x.city || '—'} / ${x.type || '—'}`},
    snapshots: {records:state.snapshots, type:'snapshot', name:x=>x.title, meta:x=>x.capturedAt || x.platform || '—'}
  };
  const config = configs[state.indexTab] || configs.artists;
  $$('.index-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.indexTab === state.indexTab));
  $('#indexContent').innerHTML = `<div class="index-list">${config.records.map((item,i)=>`<button type="button" class="index-row" data-record-type="${config.type}" data-record-id="${esc(item.id)}"><span class="index-num">${String(i+1).padStart(3,'0')} / ${esc(item.archiveId || '')}</span><span class="index-name">${esc(config.name(item))}</span><span class="index-role">${esc(config.meta(item))}</span></button>`).join('')}</div>`;
}

function populateFilters() {
  const years = [...new Set(state.exhibitions.map(x=>x.year).filter(Boolean))].sort((a,b)=>Number(b)-Number(a));
  $('#yearFilter').innerHTML = '<option value="all">ALL</option>' + years.map(year=>`<option value="${esc(year)}">${esc(year)}</option>`).join('');
}

function renderSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) { $('#searchResults').innerHTML = '<div class="archive-empty">TYPE TO SEARCH THE ARCHIVE</div>'; return; }
  const results = allRecords().filter(item => JSON.stringify(item).toLowerCase().includes(q)).slice(0,40);
  $('#searchResults').innerHTML = results.length ? results.map(item => `<button type="button" class="search-result" data-record-type="${esc(item.recordType)}" data-record-id="${esc(item.id)}"><strong>${esc(item.archiveId || '')}</strong> / ${esc(labelFor(item.recordType))} / ${esc(item.name || item.title)}</button>`).join('') : '<div class="archive-empty">NO MATCHES</div>';
}

function venueName(record) {
  if (record?.venueId) return getRecord('venue',record.venueId)?.name || record.venueId;
  return record?.city || '—';
}

function detailCell(label,value) {
  return `<div class="detail-cell"><span>${esc(label)}</span>${esc(value)}</div>`;
}

function renderRelations(rels) {
  if (!rels.length) return '';
  return `<section class="detail-relations"><div class="eyebrow">RELATIONS</div>${rels.map(rel=>`<button type="button" class="relation-row" data-record-type="${esc(rel.ref.type)}" data-record-id="${esc(rel.ref.id)}"><span>${esc(rel.direction === 'out' ? rel.relation : `is-${rel.relation}`)}</span><strong>${esc(nameFor(rel.ref))}</strong><small>${esc(labelFor(rel.ref.type))}</small></button>`).join('')}</section>`;
}

function renderSources(sources) {
  if (!sources.length) return `<section class="detail-sources"><div class="eyebrow">PROVENANCE</div><p>NO SOURCE ATTACHED / RECORD REQUIRES VERIFICATION</p></section>`;
  return `<section class="detail-sources"><div class="eyebrow">PROVENANCE</div>${sources.map(source=>`<a class="source-row" href="${esc(source.url)}" target="_blank" rel="noopener"><span>${esc(source.type)}</span><strong>${esc(source.title)}</strong></a>`).join('')}</section>`;
}

function openRecord(type, id, updateHash = true) {
  const record = getRecord(type,id);
  if (!record) return;
  if (updateHash) history.pushState({type,id}, '', `#record=${encodeURIComponent(type)}:${encodeURIComponent(id)}`);
  const dialog = $('#recordDialog');
  const rels = related(type,id);
  const sources = (record.sourceIds || []).map(sourceId => state.sources.find(source=>source.id===sourceId)).filter(Boolean);
  const image = record.images?.[0];
  const title = record.name || record.title || record.originalUrl || id;
  const description = record.description || record.bio || record.notes || '';
  $('#recordDetail').innerHTML = `
    <div class="detail-head"><span class="eyebrow">${esc(labelFor(type))} / ${esc(record.archiveId || id)}</span><h2>${esc(title)}</h2><p>${esc(description)}</p></div>
    ${image ? `<img class="detail-image" src="${esc(image)}" alt="${esc(title)}">` : ''}
    <div class="detail-grid">
      ${detailCell('DATE / YEAR', record.start && record.end ? `${record.start} → ${record.end}` : (record.year || record.date || record.capturedAt || '—'))}
      ${detailCell('STATUS', record.status || record.confidence || '—')}
      ${detailCell('PLACE', venueName(record))}
      ${detailCell('TYPE', record.type || record.role || record.platform || '—')}
    </div>
    ${record.url ? `<a class="detail-action" href="${esc(record.url)}" target="_blank" rel="noopener">OPEN EXTERNAL RECORD →</a>` : ''}
    ${renderRelations(rels)}
    ${renderSources(sources)}
  `;
  if (!dialog.open) dialog.showModal();
}

function closeRecord() {
  const dialog = $('#recordDialog');
  if (dialog.open) dialog.close();
  if (location.hash.startsWith('#record=')) history.pushState({}, '', '#index');
}

function goArchiveYear(year) {
  location.hash = 'archive';
  setTimeout(() => {
    const filter = $('#yearFilter');
    if (filter) { filter.value = String(year); renderArchive(); }
  }, 0);
}

function routeFromHash() {
  const raw = location.hash.replace(/^#/,'');
  const recordMatch = raw.match(/^record=([^:]+):(.+)$/);
  if (recordMatch) {
    const type = decodeURIComponent(recordMatch[1]);
    const id = decodeURIComponent(recordMatch[2]);
    openRecord(type, id, false);
    return;
  }
  const allowed = ['home','archive','gallery','index','about'];
  const view = allowed.includes(raw) ? raw : 'home';
  $$('.view').forEach(section => section.classList.toggle('active', section.dataset.view === view));
  $$('.primary-nav [data-route]').forEach(link => link.classList.toggle('active', link.dataset.route === view));
  if (view !== 'home') $('#app')?.focus({preventScroll:true});
}

function bindEvents() {
  window.addEventListener('hashchange', routeFromHash);
  window.addEventListener('popstate', routeFromHash);

  document.addEventListener('click', event => {
    const route = event.target.closest('[data-route]');
    if (route) { event.preventDefault(); location.hash = route.dataset.route; return; }

    const record = event.target.closest('[data-record-id]');
    if (record) { event.preventDefault(); openRecord(record.dataset.recordType, record.dataset.recordId); return; }

    const timeline = event.target.closest('[data-timeline-year]');
    if (timeline) { event.preventDefault(); goArchiveYear(timeline.dataset.timelineYear); return; }

    const tab = event.target.closest('[data-index-tab]');
    if (tab) { state.indexTab = tab.dataset.indexTab; renderIndex(); return; }
  });

  $('#yearFilter')?.addEventListener('change', renderArchive);
  $('#typeFilter')?.addEventListener('change', renderArchive);
  $('#archiveQuery')?.addEventListener('input', renderArchive);
  $('#globalSearch')?.addEventListener('input', event => renderSearch(event.target.value));
  $('.search-toggle')?.addEventListener('click', () => { $('#searchDialog').showModal(); renderSearch(''); setTimeout(()=>$('#globalSearch')?.focus(),20); });
  $('#recordClose')?.addEventListener('click', closeRecord);

  ['searchDialog','recordDialog'].forEach(id => {
    const dialog = $(`#${id}`);
    dialog?.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
  });

  $('#searchDialog')?.addEventListener('close', () => $('#globalSearch')?.blur());
  $('#recordDialog')?.addEventListener('close', () => {
    if (location.hash.startsWith('#record=')) history.pushState({}, '', '#index');
  });
}

init();
