// Update your modal creation functions:
function createArtistModal(artistId) {
    const data = artistData[artistId];
    return `
        <div class="artist-modal-overlay" onclick="closeModal(event)">
            <div class="artist-modal" onclick="event.stopPropagation()">
                <button class="modal-close" onclick="closeModal()">&times;</button>
                <div class="artist-modal-content">
                    <img src="${data.image}" alt="${data.name}" class="artist-photo">
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
    currentExhibition = exhibitionData[exhibitionId];
    currentExhibitionIndex = 0;

    return `
        <div class="exhibition-modal-overlay" onclick="closeModal(event)">
            <div class="exhibition-modal" onclick="event.stopPropagation()">
                <button class="modal-close" onclick="closeModal()">&times;</button>
                <div class="exhibition-modal-content">
                    <h3>${currentExhibition.title}</h3>
                    <p>${currentExhibition.description}</p>
                    <div class="carousel-container">
                        <button class="carousel-prev" onclick="moveCarousel(-1)">‹</button>
                        <img src="${currentExhibition.images[0]}" class="carousel-image" id="carousel-img">
                        <button class="carousel-next" onclick="moveCarousel(1)">›</button>
                    </div>
                    <div class="carousel-dots" id="carousel-dots"></div>
                </div>
            </div>
        </div>
    `;
}
