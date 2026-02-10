// MAIN NAVIGATION
document.addEventListener('DOMContentLoaded', function () {
    const allLinks = document.querySelectorAll('.nav-link');
    const allSections = document.querySelectorAll('.content-section');

    allLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);

            if (targetSection) {
                allLinks.forEach(l => l.classList.remove('active'));
                allSections.forEach(s => s.classList.remove('active'));
                this.classList.add('active');
                targetSection.classList.add('active');
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // LOAD DATA & POPULATE
    loadData();

    // GLOBAL CLOSE HANDLER
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('modal-close')) {
            closeModal();
        }
    });
});

// === DATA LOADING ===
let artistData = {};
let exhibitionData = {};

async function loadData() {
    try {
        // Load artists
        const artistsResponse = await fetch('artists.json');
        const artistsJson = await artistsResponse.json();
        artistData = Object.fromEntries(
            artistsJson.artists.map(artist => [artist.id, artist])
        );

        // Load exhibitions  
        const exhibitionsResponse = await fetch('exhibitions.json');
        const exhibitionsJson = await exhibitionsResponse.json();
        exhibitionData = Object.fromEntries(
            exhibitionsJson.exhibitions.map(ex => [ex.id, ex])
        );

        // Populate grids
        populateGrids();

    } catch (error) {
        console.error('Failed to load data:', error);
        // Fallback to hardcoded data if JSON fails
        loadFallbackData();
    }
}

function loadFallbackData() {
    artistData = {
        'kozin': { name: 'Vladimir Kozin', bio: 'Co-editor...', portrait: 'images/kozin-portrait.jpg' },
        'motolyanets': { name: 'Semyon Motolyanets', bio: 'Performance artist...', portrait: 'images/motolyanets-portrait.jpg' },
        'panin': { name: 'Igor Panin', bio: 'Book designer...', portrait: 'images/panin-portrait.jpg' }
    };

    exhibitionData = {
        'the-act': { title: 'THE ACT 2010', description: '...', images: ['images/the-act-1.jpg', 'images/the-act-2.jpg'] },
        'venice-2009': { title: 'Venice Biennale 2009', description: '...', images: ['images/venice-1.jpg'] }
    };

    populateGrids();
}

// === POPULATE GRIDS ===
function populateGrids() {
    populateArtistGrid();
    populateExhibitionGrid();
}

function populateArtistGrid() {
    const artistGrid = document.querySelector('#artists .grid');
    if (artistGrid && Object.keys(artistData).length) {
        artistGrid.innerHTML = Object.entries(artistData).map(([id, artist]) => `
            <a href="#" class="grid-item" data-artist="${id}">
                <img src="${artist.portrait}" alt="${artist.name}" class="grid-image" loading="lazy">
                <div class="grid-info">
                    <h3 class="grid-title">${artist.name.split(' ').slice(0, 2).join(' ')}</h3>
                    <p class="grid-subtitle">${artist.bio.split('.')[0]}</p>
                </div>
            </a>
        `).join('');

        artistGrid.addEventListener('click', function (e) {
            const artistLink = e.target.closest('.grid-item[data-artist]');
            if (artistLink) {
                e.preventDefault();
                document.body.insertAdjacentHTML('beforeend', createArtistModal(artistLink.dataset.artist));
            }
        });
    }
}

function populateExhibitionGrid() {
    const exhibitionGrid = document.querySelector('#exhibitions .grid');
    if (exhibitionGrid && Object.keys(exhibitionData).length) {
        exhibitionGrid.innerHTML = Object.entries(exhibitionData).map(([id, ex]) => {
            const year = ex.year || ex.title.match(/\d{4}/)?.[0] || '2020';
            const shortTitle = ex.title.replace(/\s*\d{4}.*/, '').trim();

            return `
                <a href="#" class="grid-item" data-exhibition="${id}">
                    <div class="image-container">
                        <img src="${ex.images[0]}" alt="${ex.title}" class="grid-image" loading="lazy">
                        <span class="year-badge">${year}</span>
                    </div>
                    <div class="grid-info">
                        <h3 class="grid-title">${shortTitle}</h3>
                        <p class="grid-subtitle">Exhibition</p>
                    </div>
                </a>
            `;
        }).join('');

        exhibitionGrid.addEventListener('click', function (e) {
            const exhibitionLink = e.target.closest('.grid-item[data-exhibition]');
            if (exhibitionLink) {
                e.preventDefault();
                document.body.insertAdjacentHTML('beforeend', createExhibitionModal(exhibitionLink.dataset.exhibition));
            }
        });
    }
}




// === MODAL CREATION ===
function createArtistModal(artistId) {
    const data = artistData[artistId];
    if (!data) return '';

    return `
        <div class="artist-modal-overlay" onclick="closeModal(event)">
            <div class="artist-modal modal" onclick="event.stopPropagation()">
                <button class="modal-close" onclick="closeModal()">&times;</button>
                <div class="artist-modal-content modal-content">
                    <img src="${data.portrait}" alt="${data.name}" class="artist-photo">
                    <div class="artist-info">
                        <h3>${data.name}</h3>
                        <p>${data.bio}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}


function createExhibitionModal(exhibitionId) {
    const data = exhibitionData[exhibitionId];
    if (!data) return '';

    currentExhibition = data;
    currentExhibitionIndex = 0;

    return `
        <div class="exhibition-modal-overlay" onclick="closeModal(event)">
            <div class="exhibition-modal" onclick="event.stopPropagation()">
                <button class="modal-close" onclick="closeModal()">&times;</button>
                <h3>${data.title}</h3>
                <p>${data.description}</p>
                <div class="carousel-container">
                    <button class="carousel-prev" onclick="moveCarousel(-1)">‹</button>
                    <img src="${data.images[0]}" class="carousel-image" id="carousel-img">
                    <button class="carousel-next" onclick="moveCarousel(1)">›</button>
                </div>
                <div class="carousel-dots" id="carousel-dots"></div>
            </div>
        </div>
    `;
}

function closeModal(event) {
    document.querySelectorAll('[class*="modal-overlay"]').forEach(overlay => overlay.remove());
}

// === CAROUSEL ===
let currentExhibitionIndex = 0;
let currentExhibition = null;

function moveCarousel(direction) {
    currentExhibitionIndex += direction;
    if (currentExhibitionIndex >= currentExhibition.images.length) currentExhibitionIndex = 0;
    if (currentExhibitionIndex < 0) currentExhibitionIndex = currentExhibition.images.length - 1;

    document.getElementById('carousel-img').src = currentExhibition.images[currentExhibitionIndex];
    updateCarouselDots();
}

function updateCarouselDots() {
    const dotsContainer = document.getElementById('carousel-dots');
    if (dotsContainer) {
        dotsContainer.innerHTML = currentExhibition.images.map((_, i) =>
            `<span class="dot ${i === currentExhibitionIndex ? 'active' : ''}" onclick="goToSlide(${i})"></span>`
        ).join('');
    }
}

function goToSlide(index) {
    currentExhibitionIndex = index;
    document.getElementById('carousel-img').src = currentExhibition.images[index];
    updateCarouselDots();
}
