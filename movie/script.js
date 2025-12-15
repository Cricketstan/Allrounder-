// API Configuration
const API_BASE_URL = 'https://dillzy-movie.cricketstream745.workers.dev';

const API_ENDPOINTS = {
    'hollywood-movies': `${API_BASE_URL}/hollywood/movies`,
    'hollywood-series': `${API_BASE_URL}/hollywood/series`,
    'netflix': `${API_BASE_URL}/platform/netflix`,
    'prime': `${API_BASE_URL}/platform/prime`,
    'bollywood': `${API_BASE_URL}/bollywood/movies`
};

// State Management
let currentCategory = 'all';
let currentOffset = 0;
let allMovies = [];
let filteredMovies = [];
let currentFilter = 'all';
let selectedMovie = null;

// DOM Elements
const moviesGrid = document.getElementById('moviesGrid');
const loadingSpinner = document.getElementById('loadingSpinner');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const navLinks = document.querySelectorAll('.nav-link');
const filterBtns = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('searchInput');
const sectionTitle = document.getElementById('sectionTitle');
const movieModal = document.getElementById('movieModal');
const closeModal = document.getElementById('closeModal');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const nav = document.querySelector('.nav');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing app...');
        console.log('API Endpoints configured:', Object.keys(API_ENDPOINTS));
    loadAllMovies();
    setupEventListeners();
    console.log('Event listeners setup complete');
});

// Setup Event Listeners
function setupEventListeners() {
    // Navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            currentCategory = link.dataset.category;
            currentOffset = 0;
            
            if (currentCategory === 'all') {
                loadAllMovies();
                sectionTitle.textContent = 'All Movies';
            } else {
                loadMoviesByCategory(currentCategory);
                sectionTitle.textContent = link.textContent;
            }
            
            // Close mobile menu
            nav.classList.remove('active');
        });
    });

    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            filterMovies();
        });
    });

    // Search functionality
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchMovies(e.target.value);
        }, 500);
    });

    // Load more button
    loadMoreBtn.addEventListener('click', () => {
        currentOffset += 20;
        if (currentCategory === 'all') {
            loadAllMovies(true);
        } else {
            loadMoviesByCategory(currentCategory, true);
        }
    });

    // Modal close
    closeModal.addEventListener('click', () => {
        movieModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        stopVideo();
    });

    // Close modal on outside click
    movieModal.addEventListener('click', (e) => {
        if (e.target === movieModal) {
            movieModal.classList.remove('active');
            document.body.style.overflow = 'auto';
            stopVideo();
        }
    });

    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', () => {
        nav.classList.toggle('active');
    });

    // Play online button
    document.getElementById('playOnlineBtn').addEventListener('click', () => {
        playOnline();
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => {
        toggleDownloadOptions();
    });
}

// Load all movies from all APIs
async function loadAllMovies(append = false) {
    console.log('Loading all movies, append:', append);
    showLoading();
    
    if (!append) {
        allMovies = [];
        moviesGrid.innerHTML = '';
    }

    try {
        console.log('Fetching from', Object.keys(API_ENDPOINTS).length, 'endpoints');
        const promises = Object.values(API_ENDPOINTS).map(endpoint => {
            console.log('Fetching:', endpoint);
            return fetchMovies(`${endpoint}?offset=${currentOffset}`);
        });
        
        const results = await Promise.all(promises);
        console.log('Received results:', results.map(r => r ? r.length : 0));
        
        results.forEach((movies, index) => {
            if (movies && movies.length > 0) {
                console.log(`API ${index} returned ${movies.length} movies`);
                allMovies = allMovies.concat(movies);
                        } else {
                            console.warn(`API ${index} returned no movies`);
                console.log('Total movies loaded:', allMovies.length);
            }
        });

        filteredMovies = allMovies;
        filterMovies();
        
    } catch (error) {
        console.error('Error loading movies:', error);
        showError('Failed to load movies. Please try again later.');
    } finally {
        hideLoading();
    }
}

// Load movies by specific category
async function loadMoviesByCategory(category, append = false) {
    showLoading();
    
    if (!append) {
        allMovies = [];
        moviesGrid.innerHTML = '';
    }

    try {
        const endpoint = API_ENDPOINTS[category];
        const movies = await fetchMovies(`${endpoint}?offset=${currentOffset}`);
        
        if (movies && movies.length > 0) {
            allMovies = append ? allMovies.concat(movies) : movies;
            filteredMovies = allMovies;
            filterMovies();
        } else {
            if (!append) {
                moviesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 50px;">No movies found.</p>';
            }
            loadMoreBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading movies:', error);
        showError('Failed to load movies. Please try again later.');
    } finally {
        hideLoading();
    }
}

// Fetch movies from API
async function fetchMovies(url) {
    try {
        console.log('Fetching URL:', url);
        const response = await fetch(url);
        console.log('Response status:', response.status, 'for', url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const items = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        console.log('Received data items:', items.length);
        return items;
    } catch (error) {
        console.error('Fetch error for', url, ':', error);
        return [];
    }
}

// Filter movies by type
function filterMovies() {
    if (currentFilter === 'all') {
        displayMovies(allMovies);
    } else {
        const filtered = allMovies.filter(movie => {
            if (currentFilter === 'series') {
                return movie.type === 'series' || movie.title?.toLowerCase().includes('season');
            } else if (currentFilter === 'movie') {
                return movie.type === 'movie' || !movie.title?.toLowerCase().includes('season');
            }
            return true;
        });
        displayMovies(filtered);
    }
}

// Search movies
function searchMovies(query) {
    if (!query.trim()) {
        displayMovies(allMovies);
        return;
    }

    const searchQuery = query.toLowerCase();
    const results = allMovies.filter(movie => 
        movie.title?.toLowerCase().includes(searchQuery) ||
        movie.name?.toLowerCase().includes(searchQuery) ||
        movie.description?.toLowerCase().includes(searchQuery)
    );

    displayMovies(results);
}

// Display movies in grid
function displayMovies(movies) {
        console.log('Displaying movies:', movies ? movies.length : 0);
    
    if (!movies || movies.length === 0) {
        moviesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 50px; color: #b3b3b3;">No movies found.</p>';
        loadMoreBtn.style.display = 'none';
        return;
    }

    moviesGrid.innerHTML = '';
    
    movies.forEach((movie, index) => {
        try {
            const movieCard = createMovieCard(movie);
            moviesGrid.appendChild(movieCard);
        } catch (error) {
            console.error('Error creating card for movie', index, ':', error, movie);
        }
        console.log('Displayed', moviesGrid.children.length, 'movie cards');
    });

    loadMoreBtn.style.display = movies.length >= 20 ? 'block' : 'none';
}

// Create movie card element
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    
    const title = movie.title || movie.name || 'Untitled';
    const poster = movie.featured_image || movie.poster || movie.image || 'https://via.placeholder.com/220x320?text=No+Poster';
    const year = movie.year || movie.date?.split('-')[0] || movie.release_date?.split('-')[0] || 'N/A';
    const rating = movie.rating || movie.vote_average || '7.5';
    const type = movie.type || (title.toLowerCase().includes('season') || title.toLowerCase().includes('series')) ? 'Series' : 'Movie';
    
    card.innerHTML = `
        <img src="${poster}" alt="${title}" class="movie-poster" onerror="this.src='https://via.placeholder.com/220x320?text=No+Poster'">
        <div class="movie-badge">${type}</div>
        <div class="movie-card-info">
            <h3 class="movie-card-title" title="${title}">${title}</h3>
            <div class="movie-card-meta">
                <span class="movie-card-year">
                    <i class="fas fa-calendar"></i> ${year}
                </span>
                <span class="movie-card-rating">
                    <i class="fas fa-star"></i> ${rating}
                </span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => openMovieModal(movie));
    
    return card;
}

// Open movie details modal
function openMovieModal(movie) {
    selectedMovie = movie;
    
    const title = movie.title || movie.name || 'Untitled';
    const poster = movie.featured_image || movie.poster || movie.image || 'https://via.placeholder.com/300x450?text=No+Poster';
    const year = movie.year || movie.date?.split('-')[0] || movie.release_date?.split('-')[0] || 'N/A';
    const rating = movie.rating || movie.vote_average || '7.5';
    const duration = movie.duration || movie.runtime || '120';
    const description = movie.description || movie.content || movie.excerpt || movie.overview || 'No description available.';
    
    document.getElementById('modalPoster').src = poster;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalYear').innerHTML = `<i class="fas fa-calendar"></i> ${year}`;
    document.getElementById('modalRating').innerHTML = `<i class="fas fa-star"></i> ${rating}`;
    document.getElementById('modalDuration').innerHTML = `<i class="fas fa-clock"></i> ${duration} min`;
    document.getElementById('modalDescription').textContent = description;
    
    // Hide video player and download options initially
    document.getElementById('videoPlayerContainer').style.display = 'none';
    document.getElementById('downloadOptions').style.display = 'none';
    
    movieModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Play movie online
function playOnline() {
    const videoContainer = document.getElementById('videoPlayerContainer');
    const videoPlayer = document.getElementById('videoPlayer');
    const videoSource = document.getElementById('videoSource');
    const qualitySelector = document.getElementById('qualitySelector');
    
    videoContainer.style.display = 'block';
    qualitySelector.innerHTML = '';
    
    // Get download links from the selected movie
    const downloadLinks = getDownloadLinks(selectedMovie);
    
    if (downloadLinks.length === 0) {
        alert('No playable video sources available for this movie.');
        return;
    }
    
    // Find the best quality link for streaming
    const streamableLink = downloadLinks.find(link => 
        link.type === 'direct' || link.quality.includes('1080p') || link.quality.includes('720p')
    );
    
    if (streamableLink) {
        videoSource.src = streamableLink.url;
        videoPlayer.load();
        videoPlayer.play();
        
        // Create quality selector buttons
        const uniqueQualities = [...new Set(downloadLinks.map(link => link.quality))];
        uniqueQualities.forEach((quality, index) => {
            const btn = document.createElement('button');
            btn.className = `quality-btn ${index === 0 ? 'active' : ''}`;
            btn.textContent = quality;
            btn.addEventListener('click', () => {
                const link = downloadLinks.find(l => l.quality === quality);
                if (link) {
                    const currentTime = videoPlayer.currentTime;
                    videoSource.src = link.url;
                    videoPlayer.load();
                    videoPlayer.currentTime = currentTime;
                    videoPlayer.play();
                    
                    document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
            });
            qualitySelector.appendChild(btn);
        });
    } else {
        alert('No direct streaming link available. Please use download option.');
    }
    
    // Scroll to video player
    videoContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Stop video playback
function stopVideo() {
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.pause();
    videoPlayer.currentTime = 0;
}

// Toggle download options
function toggleDownloadOptions() {
    const downloadOptions = document.getElementById('downloadOptions');
    const qualityTabs = document.getElementById('qualityTabs');
    const downloadLinks = document.getElementById('downloadLinks');
    
    if (downloadOptions.style.display === 'none') {
        downloadOptions.style.display = 'block';
        
        // Get all download links
        const links = getDownloadLinks(selectedMovie);
        
        if (links.length === 0) {
            downloadLinks.innerHTML = '<p style="color: #b3b3b3;">No download links available.</p>';
            return;
        }
        
        // Group links by quality
        const qualityGroups = {};
        links.forEach(link => {
            if (!qualityGroups[link.quality]) {
                qualityGroups[link.quality] = [];
            }
            qualityGroups[link.quality].push(link);
        });
        
        // Create quality tabs
        qualityTabs.innerHTML = '';
        const qualities = Object.keys(qualityGroups);
        
        qualities.forEach((quality, index) => {
            const tab = document.createElement('button');
            tab.className = `quality-tab ${index === 0 ? 'active' : ''}`;
            tab.textContent = quality;
            tab.addEventListener('click', () => {
                document.querySelectorAll('.quality-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                displayDownloadLinks(qualityGroups[quality]);
            });
            qualityTabs.appendChild(tab);
        });
        
        // Display first quality links
        displayDownloadLinks(qualityGroups[qualities[0]]);
        
        // Scroll to download section
        downloadOptions.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        downloadOptions.style.display = 'none';
    }
}

// Display download links
function displayDownloadLinks(links) {
    const downloadLinksContainer = document.getElementById('downloadLinks');
    downloadLinksContainer.innerHTML = '';
    
    links.forEach(link => {
        const linkItem = document.createElement('div');
        linkItem.className = 'download-link-item';
        
        const icon = link.type === 'zip' ? 'fa-file-archive' : 
                    link.type === 'folder' ? 'fa-folder' : 'fa-download';
        
        const typeName = link.type === 'zip' ? 'ZIP Archive' : 
                        link.type === 'folder' ? 'Folder' : 'Direct Download';
        
        const description = link.description || `${link.quality} Quality`;
        const size = link.size || '';
        
        linkItem.innerHTML = `
            <div class="download-link-info">
                <i class="fas ${icon} download-icon"></i>
                <div class="download-link-text">
                    <h4>${typeName} - ${link.quality}</h4>
                    <p>${description} ${size ? '- ' + size : ''}</p>
                </div>
            </div>
            <a href="${link.url}" target="_blank" class="download-link-btn">
                <i class="fas fa-download"></i> Download
            </a>
        `;
        
        downloadLinksContainer.appendChild(linkItem);
    });
}

// Extract download links from movie object
function getDownloadLinks(movie) {
    const links = [];
    
    // Parse the links field from the API
    if (movie.links && typeof movie.links === 'string') {
        const linkLines = movie.links.split('\n');
        linkLines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 8) {
                const url = parts[0].trim();
                const description = parts[7].trim();
                const sizeText = parts[8]?.trim() || '';
                
                // Extract quality from description
                let quality = '720p';
                if (description.includes('480p')) quality = '480p';
                else if (description.includes('720p')) quality = '720p';
                else if (description.includes('1080p')) quality = '1080p';
                else if (description.includes('2160p') || description.includes('4K')) quality = '4K';
                
                // Determine type
                let type = 'direct';
                if (description.toLowerCase().includes('zip')) type = 'zip';
                else if (description.toLowerCase().includes('folder')) type = 'folder';
                
                if (url && url.startsWith('http')) {
                    links.push({
                        quality: quality,
                        type: type,
                        url: url,
                        description: description,
                        size: sizeText
                    });
                }
            }
        });
    }
    
    // Check for downloadLinks structure
    if (movie.downloadLinks) {
        Object.keys(movie.downloadLinks).forEach(quality => {
            const qualityLinks = movie.downloadLinks[quality];
            if (qualityLinks.zip) {
                links.push({ quality, type: 'zip', url: qualityLinks.zip });
            }
            if (qualityLinks.folder) {
                links.push({ quality, type: 'folder', url: qualityLinks.folder });
            }
            if (qualityLinks.direct) {
                links.push({ quality, type: 'direct', url: qualityLinks.direct });
            }
        });
    }
    
    // Check for cloudlinks
    if (movie.cloudlinks) {
        try {
            const cloudLinksData = typeof movie.cloudlinks === 'string' ? JSON.parse(movie.cloudlinks) : movie.cloudlinks;
            if (Array.isArray(cloudLinksData)) {
                cloudLinksData.forEach(link => {
                    links.push({
                        quality: link.quality || '720p',
                        type: link.type || 'direct',
                        url: link.url || link.link
                    });
                });
            }
        } catch (e) {
            console.log('Error parsing cloudlinks:', e);
        }
    }
    
    return links;
}

// Scroll to movies section
function scrollToMovies() {
    document.getElementById('moviesSection').scrollIntoView({ behavior: 'smooth' });
}

// Show loading spinner
function showLoading() {
    loadingSpinner.classList.add('active');
}

// Hide loading spinner
function hideLoading() {
    loadingSpinner.classList.remove('active');
}

// Show error message
function showError(message) {
    moviesGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 50px;">
            <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #e50914; margin-bottom: 20px;"></i>
            <p style="color: #b3b3b3; font-size: 18px;">${message}</p>
        </div>
    `;
}

// Utility function to debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
