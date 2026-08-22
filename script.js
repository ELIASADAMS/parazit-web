const state = {
  archive: {}, artists: [], exhibitions: [], artworks: [], documents: [], venues: [], snapshots: [], sources: [], relations: [], indexTab: 'artists'
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
  } catch (error) {
    console.error(error);
    $('#footerStatus').textContent = 'ARCHIVE STATUS: DATA ERROR';
  }

  renderAll();
  bindEvents();
  populateFilters();
  routeFromHash();
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
  state.relations.forEach(relation => {
    ['from','to'].forEach(side => {
      const ref = relation[side];
      if (ref && !ids.has(`${ref.type}:${ref.id}`) && ref.type !== 'institution') console.warn('Unresolved relation:', ref);
    });
  });
}

function allRecords() {
  return [
    ...state.artists.map(x => ({...x, recordType:'artist'})),
    ...state.exhibitions.map(x => ({...x, recordType:'exhibition'})),
    ...state.artworks.map(x => ({...x, recordType:'artwork'})),
    ...state.documents.map(x => ({...x, recordType:'document'})),
    ...state.venues.map(x => ({...x, recordType:'venue'})),
    ...state.snapshots.map(x => ({...x, recordType:'snapshot'}))
  ];
}

function getRecord(type, id) {
  const map = { artist: state.artists, exhibition: state.exhibitions, artwork: state.artworks, document: state.documents, venue: state.venues, snapshot: state.snapshots };
  return (map[type] || []).find(item => item.id === id);
}

function related(type, id) {
  const refs = [];
  state.relations.forEach(rel => {
    if (rel.from?.type === type && rel.from?.id === id) refs.push({ relation: rel.relation, direction:'out', ref: rel.to, role: rel.role, sourceIds: rel.sourceIds || [] });
    if (rel.to?.type === type && rel.to?.id === id) refs.push({ relation: rel.relation, direction:'in', ref: rel.from, role: rel.role, sourceIds: rel.sourceIds || [] });
  });

  // Embedded IDs remain useful as an editorial shortcut while relations.json grows.
  const record = getRecord(type, id);
  if (record?.artistIds) record.artistIds.forEach(ref => refs.push({relation:'includes-artist', direction:'out', ref:{type:'artist', id:ref}}));
  if (record?.artists) record.artists.forEach(ref => refs.push({relation:'includes-artist', direction:'out', ref:{type:'artist', id:ref}}));
  if (record?.exhibitionIds) record.exhibitionIds.forEach(ref => refs.push({relation:'shown-in', direction:'out', ref:{type:'exhibition', id:ref}}));
  if (record?.artworkIds) record.artworkIds.forEach(ref => refs.push({relation:'includes-work', direction:'out', ref:{type:'artwork', id:ref}}));
  if (record?.documentIds) record.documentIds.forEach(ref => refs.push({relation:'documented-by', direction:'out', ref:{type:'document', id:ref}}));
  if (record?.venueId) refs.push({relation:'held-at', direction:'out', ref:{type:'venue', id:record.venueId}});
  return refs.filter((item, index, arr) => item.ref && arr.findIndex(x => `${x.ref.type}:${x.ref.id}:${x.relation}` === `${item.ref.type}:${item.ref.id}:${item.relation}`) === index);
}

function labelFor(type) {
  return ({artist:'ARTIST', exhibition:'EXHIBITION', artwork:'ARTWORK', document:'DOCUMENT', venue:'VENUE', snapshot:'SNAPSHOT'}[type] || String(type).toUpperCase());
}

function nameFor(ref) {
  if (!ref) return '—';
  if (ref.type === 'artist') return getRecord('artist', ref.id)?.name || ref.id;
  if (ref.type === 'exhibition') return getRecord('exhibition', ref.id)?.title || ref.id;
  if (ref.type === 'artwork') return getRecord('artwork', ref.id)?.title || ref.id;
  if (ref.type === 'document') return getRecord('document', ref.id)?.title || ref.id;
  if (ref.type === 'venue') return getRecord('venue', ref.id)?.name || ref.id;
  if (ref.type === 'snapshot') return getRecord('snapshot', ref.id)?.title || ref.id;
  return ref.id;
}

function renderAll() {
  renderHome(); renderArchive(); renderGallery(); renderIndex();
  $('#systemTicker').textContent = `PARAZIT DATABASE • ${allRecords().length} RECORDS • ${state.relations.length} RELATIONS • SOURCE-AWARE ARCHIVE • EST. 2000 •`;
  $('#footerStatus').textContent = `ARCHIVE STATUS: ${state.archive.metadata?.status || 'ACTIVE'}`;
}

function renderHome() {
  const latest = [...state.exhibitions].sort((a,b) => Number(b.year)-Number(a.year)).slice(0,3);
  $('#latestExhibitions').innerHTML = latest.map(exhibitionCard).join('');
  $('#timelineMini').innerHTML = (state.archive.timeline || []).slice().sort((a,b)=>a.year-b.year).slice(-5).map(item => `
    <article class="timeline-item" data-record-type="timeline" data-record-id="${esc(item.id)}">
      <div class="timeline-year">${esc(item.year)}</div><div class="timeline-title">${esc(item.title)}</div><p>${esc(item.description)}</p>
    </article>`).join('');
  const featured = state.artworks[0] || state.exhibitions.find(x => x.images?.length) || state.exhibitions[0];
  if (featured) {
    $('#featureId').textContent = featured.archiveId || '—';
    $('#featureTitle').textContent = featured.title;
    $('#featureYear').textContent = featured.year || '';
    const image = featured.images?.[0];
    if (image) { $('#featureImage').src = image; $('#featureImage').alt = featured.title; }
  }
  const documentedArtists = state.artists.filter(x => x.status === 'documented participant');
  $('#rosterCount').textContent = String(documentedArtists.length).padStart(2,'0');
  $('#roster').innerHTML = documentedArtists.slice(0,10).map(x => `<li>${esc(x.name)}</li>`).join('');
  const years = new Set(state.exhibitions.map(x=>x.year).filter(Boolean));
  $('#stats').innerHTML = [
    [state.artists.length,'ARTISTS'], [state.exhibitions.length,'EVENTS'], [state.artworks.length,'WORKS'], [state.documents.length,'DOCUMENTS']
  ].map(([value,label]) => `<div class="stat"><strong>${String(value).padStart(2,'0')}</strong><span>${label}</span></div>`).join('');
}

function exhibitionCard(ex) {
  const image = ex.images?.[0] || 'images/venice-1.jpg';
  const venue = getRecord('venue', ex.venueId)?.name || ex.city || '';
  return `<a href="#" class="record-card" data-record-type="exhibition" data-record-id="${esc(ex.id)}">
    <img class="record-image" src="${esc(image)}" alt="${esc(ex.title)}" loading="lazy">
    <div class="record-info"><div class="record-id">${esc(ex.archiveId || '')}</div><div class="record-title">${esc(ex.title)}</div><div class="record-meta">${esc(ex.year)} / ${esc(venue)}</div></div>
  </a>`;
}

function renderArchive() {
  const query = ($('#archiveQuery')?.value || '').trim().toLowerCase();
  const year = $('#yearFilter')?.value || 'all';
  const type = $('#typeFilter')?.value || 'all';
  const events = state.exhibitions.filter(item => {
    const text = JSON.stringify(item).toLowerCase();
    return (year === 'all' || String(item.year) === year) && (type === 'all' || item.type === type) && (!query || text.includes(query));
  }).sort((a,b)=>Number(b.year)-Number(a.year));

  $('#archiveResults').innerHTML = events.length ? events.map(ex => {
    const venue = getRecord('venue', ex.venueId);
    return `<a href="#" class="archive-record" data-record-type="exhibition" data-record-id="${esc(ex.id)}">
      <div class="archive-year">${esc(ex.year)}</div><div class="archive-type">${esc(ex.type)}</div>
      <div class="archive-title">${esc(ex.title)}</div><div class="archive-meta">${esc(venue?.name || ex.city || '—')}</div>
    </a>`;
  }).join('') : '<div class="archive-empty">NO RECORDS / TRY ANOTHER QUERY</div>';
}

function renderGallery() {
  const items = [];
  state.artworks.forEach(work => (work.images || []).forEach(image => items.push({image, title:work.title, year:work.year, type:'artwork', id:work.id})));
  state.exhibitions.forEach(ex => (ex.images || []).forEach(image => items.push({image, title:ex.title, year:ex.year, type:'exhibition', id:ex.id})));
  $('#galleryGrid').innerHTML = items.length ? items.map(item => `<div class="gallery-item" data-record-type="${item.type}" data-record-id="${esc(item.id)}"><img src="${esc(item.image)}" alt="${esc(item.title)}" loading="lazy"><div class="gallery-caption"><strong>${esc(item.title)}</strong><span>${esc(item.year || '')}</span></div></div>`).join('') : '<div class="archive-empty">IMAGE INDEX / NO DIGITIZED IMAGES YET</div>';
}

function renderIndex() {
  const configs = {
    artists: {label:'ARTISTS', records:state.artists, name:x=>x.name, meta:x=>x.role || x.status},
    exhibitions: {label:'EXHIBITIONS', records:state.exhibitions, name:x=>x.title, meta:x=>`${x.year} / ${x.type}`},
    artworks: {label:'WORKS', records:state.artworks, name:x=>x.title, meta:x=>`${x.year || '—'} / ${x.medium || '—'}`},
    documents: {label:'DOCUMENTS', records:state.documents, name:x=>x.title, meta:x=>`${x.date || '—'} / ${x.type}`},
    venues: {label:'VENUES', records:state.venues, name:x=>x.name, meta:x=>`${x.city || '—'} / ${x.type}`},
    snapshots: {label:'SNAPSHOTS', records:state.snapshots, name:x=>x.title, meta:x=>x.capturedAt || x.platform || '—'}
  };
  const config = configs[state.indexTab] || configs.artists;
  $$('.index-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.indexTab === state.indexTab));
  $('#indexContent').innerHTML = `<div class="index-list">${config.records.map((item,i)=>`<div class="index-row" data-record-type="${state.indexTab === 'artworks' ? 'artwork' : state.indexTab === 'documents' ? 'document' : state.indexTab === 'venues' ? 'venue' : state.indexTab === 'snapshots' ? 'snapshot' : state.indexTab.slice(0,-1)}" data-record-id="${esc(item.id)}"><span class="index-num">${String(i+1).padStart(3,'0')} / ${esc(item.archiveId || '')}</span><span class="index-name">${esc(config.name(item))}</span><span class="index-role">${esc(config.meta(item))}</span></div>`).join('')}</div>`;
}

function populateFilters() {
  const years = [...new Set(state.exhibitions.map(x=>x.year).filter(Boolean))].sort((a,b)=>b-a);
  $('#yearFilter').innerHTML = '<option value="all">ALL</option>' + years.map(year=>`<option value="${year}">${year}</option>`).join('');
}

function renderSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) { $('#searchResults').innerHTML = '<div class="archive-empty">TYPE TO SEARCH THE ARCHIVE</div>'; return; }
  const results = allRecords().filter(item => JSON.stringify(item).toLowerCase().includes(q)).slice(0,40);
  $('#searchResults').innerHTML = results.length ? results.map(item => `<a href="#" class="search-result" data-record-type="${item.recordType}" data-record-id="${esc(item.id)}"><strong>${esc(item.archiveId || '')}</strong> / ${esc(labelFor(item.recordType))} / ${esc(item.name || item.title)}</a>`).join('') : '<div class="archive-empty">NO MATCHES</div>';
}

function openRecord(type, id) {
  const record = getRecord(type,id);
  if (!record) return;
  const dialog = $('#recordDialog');
  const rels = related(type,id);
  const sources = (record.sourceIds || []).map(id => state.sources.find(source=>source.id===id)).filter(Boolean);
  const image = record.images?.[0];
  const title = record.name || record.title || record.originalUrl || id;
  const meta = record.archiveId || id;
  $('#recordDetail').innerHTML = `
    <div class="detail-head"><span class="eyebrow">${esc(labelFor(type))} / ${esc(meta)}</span><h2>${esc(title)}</h2><p>${esc(record.description || record.bio || record.notes || '')}</p></div>
    ${image ? `<img class="detail-image" src="${esc(image)}" alt="${esc(title)}">` : ''}
    <div class="detail-grid">
      ${detailCell('YEAR', record.year || record.date || record.capturedAt || '—')}
      ${detailCell('STATUS', record.status || record.confidence || '—')}
      ${detailCell('PLACE', venueName(record))}
      ${detailCell('TYPE', record.type || record.role || '—')}
    </div>
    ${renderRelations(rels)}
    ${renderSources(sources)}
  `;
  dialog.showModal();
}

function venueName(record) {
  if (record.venueId) return getRecord('venue',record.venueId)?.name || record.venueId;
  if (record.city) return record.city;
  return '—';
}

function detailCell(label,value) { return `<div class="detail-cell"><span>${esc(label)}</span>${esc(value)}</div>`; }

function renderRelations(rels) {
  if (!rels.length) return '';
  return `<section class="detail-relations"><div class="eyebrow">RELATIONS</div>${rels.map(rel=>`<a href="#" class="relation-row" data-record-type="${esc(rel.ref.type)}" data-record-id="${esc(rel.ref.id)}"><span>${esc(rel.direction === 'out' ? rel.relation : `is-${rel.relation}`)}</span><strong>${esc(nameFor(rel.ref))}</strong><small>${esc(labelFor(rel.ref.type))}</small></a>`).join('')}</section>`;
}

function renderSources(sources) {
  if (!sources.length) return `<section class="detail-sources"><div class="eyebrow">PROVENANCE</div><p>NO SOURCE ATTACHED / RECORD REQUIRES VERIFICATION</p></section>`;
  return `<section class="detail-sources"><div class="eyebrow">PROVENANCE</div>${sources.map(source=>`<a class="source-row" href="${esc(source.url)}" target="_blank" rel="noopener"><span>${esc(source.type)}</span><strong>${esc(source.title)}</strong></a>`).join('')}</section>`;
}

function routeFromHash() {
  const raw = location.hash.replace(/^#/,'');
  const recordMatch = raw.match(/^record=([^:]+):(.+)$/);
  if (recordMatch) { openRecord(recordMatch[1], decodeURIComponent(recordMatch[2])); return; }
  const allowed = ['home','archive','gallery','index','about'];
  const view = allowed.includes(raw) ? raw : 'home';
  $$('.view').forEach(section => section.classList.toggle('active', section.dataset.view === view));
  $$('.primary-nav [data-route]').forEach(link => link.classList.toggle('active', link.dataset.route === view));
  if (view !== 'home') $('#app')?.focus({preventScroll:true});
}

function bindEvents() {
  window.addEventListener('hashchange', routeFromHash);
  document.addEventListener('click', event => {
    const route = event.target.closest('[data-route]');
    if (route) { event.preventDefault(); location.hash = route.dataset.route; return; }
    const record = event.target.closest('[data-record-id]');
    if (record) { event.preventDefault(); openRecord(record.dataset.recordType, record.dataset.recordId); return; }
    const tab = event.target.closest('[data-index-tab]');
    if (tab) { state.indexTab = tab.dataset.indexTab; renderIndex(); return; }
  });
  $('#yearFilter')?.addEventListener('change', renderArchive);
  $('#typeFilter')?.addEventListener('change', renderArchive);
  $('#archiveQuery')?.addEventListener('input', renderArchive);
  $('#globalSearch')?.addEventListener('input', event => renderSearch(event.target.value));
  $('.search-toggle')?.addEventListener('click', () => { $('#searchDialog').showModal(); setTimeout(()=>$('#globalSearch')?.focus(),20); });
  $('#recordClose')?.addEventListener('click', () => $('#recordDialog').close());
}

init();
