const HERO_RANDOM_MAX_STEPS = 12;

// ==================== VIEWPORT SCALING & MOBILE DETECTION ====================

const DESIGN_WIDTH = 2560;
const DESIGN_HEIGHT = 1440;
const MOBILE_BREAKPOINT = 1024; // Consider anything under 1024px width as mobile

function isMobileDevice() {
	// Check for mobile/tablet devices
	const userAgent = navigator.userAgent || navigator.vendor || window.opera;
	const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
	const isMobileWidth = window.innerWidth < MOBILE_BREAKPOINT;
	const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
	
	// Consider it mobile if it's mobile UA or has mobile width with touch
	return isMobileUA || (isMobileWidth && isTouchDevice);
}

function setupViewportScaling() {
	const mobileOverlay = document.getElementById('mobileOverlay');
	const body = document.body;
	const html = document.documentElement;
	
	if (isMobileDevice()) {
		// Show mobile overlay
		if (mobileOverlay) {
			mobileOverlay.style.display = 'flex';
		}
		// Hide main content
		if (body) {
			body.classList.remove('desktop-scaled');
			body.style.transform = 'none';
			body.style.width = 'auto';
			body.style.height = 'auto';
			body.style.overflow = 'hidden';
		}
		return;
	}
	
	// Hide mobile overlay on desktop
	if (mobileOverlay) {
		mobileOverlay.style.display = 'none';
	}
	
	// Scale body to fill viewport while maintaining 2K proportions
	function applyScaling() {
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		
		// Use Math.max to fill entire viewport (might crop slightly on one axis)
		const scaleX = viewportWidth / DESIGN_WIDTH;
		const scaleY = viewportHeight / DESIGN_HEIGHT;
		const scale = Math.max(scaleX, scaleY);
		
		// Apply transform to body
		if (body) {
			body.classList.add('desktop-scaled');
			body.style.width = `${DESIGN_WIDTH}px`;
			body.style.height = `${DESIGN_HEIGHT}px`;
			
			// Calculate scaled dimensions
			const scaledWidth = DESIGN_WIDTH * scale;
			const scaledHeight = DESIGN_HEIGHT * scale;
			
			// Center the scaled content
			const offsetX = (viewportWidth - scaledWidth) / 2;
			const offsetY = (viewportHeight - scaledHeight) / 2;
			
			body.style.transformOrigin = 'top left';
			body.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
			
			// Fix fixed position elements - position them relative to viewport, not scaled body
			const topCta = document.querySelector('.top-cta');
			const heroRailControls = document.querySelector('.hero-rail-controls');
			const crimeBack = document.querySelector('.crime-back');
			
			// Calculate inverse scale and offset to compensate for body transform
			const inverseScale = 1 / scale;
			const inverseOffsetX = -offsetX * inverseScale;
			const inverseOffsetY = -offsetY * inverseScale;
			
			if (topCta) {
				// Position at viewport coordinates - ensure it's always in viewport
				const safeTop = 16;
				const safeRight = 16;
				
				topCta.style.position = 'fixed';
				topCta.style.top = `${safeTop}px`;
				topCta.style.right = `${safeRight}px`;
				topCta.style.transform = `translate(${inverseOffsetX}px, ${inverseOffsetY}px) scale(${inverseScale})`;
				topCta.style.transformOrigin = 'top right';
				topCta.style.zIndex = '100000';
				topCta.style.pointerEvents = 'auto';
				topCta.style.margin = '0';
			}
			
			if (heroRailControls) {
				// Position at viewport coordinates - use larger bottom offset to prevent cutoff
				const controlsBottom = Math.max(48, Math.min(64, viewportHeight * 0.05)); // 5% of viewport height, clamped to 48-64px
				
				heroRailControls.style.position = 'fixed';
				heroRailControls.style.left = '50%';
				heroRailControls.style.bottom = `${controlsBottom}px`;
				heroRailControls.style.transform = 'translateX(-50%)';
				heroRailControls.style.transformOrigin = 'center bottom';
				heroRailControls.style.zIndex = '100000';
				heroRailControls.style.pointerEvents = 'auto';
				heroRailControls.style.margin = '0';
			}
			
			if (crimeBack) {
				// Position back button at viewport coordinates with inverse scaling
				const safeTop = 24;
				const safeLeft = 24;
				
				crimeBack.style.position = 'fixed';
				crimeBack.style.top = `${safeTop}px`;
				crimeBack.style.left = `${safeLeft}px`;
				crimeBack.style.transform = `translate(${inverseOffsetX}px, ${inverseOffsetY}px) scale(${inverseScale})`;
				crimeBack.style.transformOrigin = 'top left';
				crimeBack.style.zIndex = '100000';
				crimeBack.style.pointerEvents = 'auto';
				crimeBack.style.margin = '0';
			}
		}
		
		// Ensure html and body fill viewport and don't scroll
		if (html) {
			html.style.width = '100%';
			html.style.height = '100%';
			html.style.overflow = 'hidden';
			html.style.background = 'var(--bg)';
		}
	}
	
	// Apply scaling on load and resize
	applyScaling();
	
	// Debounce resize handler
	let resizeTimeout;
	window.addEventListener('resize', () => {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(applyScaling, 100);
	});
	
	// Also apply scaling after a short delay to handle any layout shifts
	setTimeout(applyScaling, 100);
	setTimeout(applyScaling, 500);
}

// Initialize viewport scaling and mobile detection immediately
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', setupViewportScaling);
} else {
	setupViewportScaling();
}

function exitSplitMode() {
	// Restore the hero rail for current category
	const category = state.currentCategory;
	const dataset = getDataset(category);
	renderHeroCards(dataset, category);
	document.body.classList.remove('is-split-open');
}
// ==================== ROOTS ROLEPLAY – HERO EXPERIENCE ====================

const HOLD_DURATION_MS = 1100;
const HOLD_RESET_DELAY_MS = 220;

const state = {
	companies: [],
	crimeFactions: [],
	nogos: [],
	whitelist: [],
	currentCategory: 'legal',
	currentIndex: 0,
	heroCardsMounted: false,
	heroRailDragging: {
		active: false,
		startX: 0,
		scrollLeft: 0,
		moved: false,
		blockClickUntil: 0
	},
	heroControlsInit: false,
	heroRandomCooldown: false,
	heroRandomSpinTimeouts: [],
	youtubeReady: false,
	youtubeInitQueue: [],
	detailVideo: null,
	railIdleTimer: null,
	railAutoTimer: null
};

const CATEGORY_CONFIG = {
	legal: {
		getDataset: () => state.companies,
		getTitle: (item) => {
			const { titleMain, fallback } = parseCompanyTitleParts(item.title, item.displayName || item.id);
			return titleMain || fallback;
		},
		getTagline: (item) => {
			const { tagline } = parseCompanyTitleParts(item.title, item.displayName || '');
			return tagline || '';
		},
		getContent: (item) => item.description || '',
		getMedia: (item) => {
			if (Array.isArray(item.videos) && item.videos.length > 0 && item.videos[0].youtubeId) {
				return { 
					type: 'video', 
					youtubeId: item.videos[0].youtubeId,
					buyUrl: item.videos[0].buyUrl || null,
					allVideos: item.videos,
					videoIndex: 0
				};
			}

			if (item.image) {
				return { type: 'image', src: normalizeAssetPath(item.image), alt: item.displayName || item.title || 'Visual' };
			}
			return null;
		},
		buildCollage: buildCompanyCollage
	},
	illegal: {
		getDataset: () => state.crimeFactions,
		getTitle: (item) => item.title || item.id,
		getTagline: (item) => item.tagline || '',
		getContent: (item) => item.content || '',
		getMedia: (item) => {
			// Check for videos array first (like legal items)
			if (Array.isArray(item.videos) && item.videos.length > 0 && item.videos[0].youtubeId) {
				return { 
					type: 'video', 
					youtubeId: item.videos[0].youtubeId,
					buyUrl: item.videos[0].buyUrl || item.buyUrl || null,
					allVideos: item.videos,
					videoIndex: 0
				};
			}
			// Fallback to videoId property
			if (item.videoId) {
				return { 
					type: 'video', 
					youtubeId: item.videoId,
					buyUrl: item.buyUrl || null,
					allVideos: null,
					videoIndex: 0
				};
			}
			if (item.image) {
				return { type: 'image', src: normalizeAssetPath(item.image), alt: item.title || 'Crew' };
			}
			return null;
		},
		buildCollage: buildCrimeCollage
	},
	regelwerk: {
		getDataset: () => state.nogos,
		getTitle: (item) => item.title || item.id,
		getTagline: (item) => item.tagline || '',
		getContent: (item) => item.content || '',
		getMedia: (item) => {
			if (item.image) {
				return { type: 'image', src: normalizeAssetPath(item.image), alt: item.title || 'Regelwerk' };
			}
			return null;
		},
		buildCollage: buildRegelwerkCollage
	},
	whitelist: {
		getDataset: () => state.whitelist,
		getTitle: (item) => item.title || item.id,
		getTagline: (item) => item.tagline || '',
		getContent: (item) => item.content || '',
		getMedia: (item) => {
			if (item.image) {
				return { type: 'image', src: normalizeAssetPath(item.image), alt: item.title || 'Whitelist' };
			}
			return null;
		},
		buildCollage: buildWhitelistCollage
	}
};

const COLLAGE_LAYOUTS = [
	[
		{ x: -8, y: -10, w: 44, h: 34, r: -9 },
		{ x: 34, y: -6, w: 40, h: 30, r: 7 },
		{ x: 76, y: -2, w: 34, h: 28, r: -5 },
		{ x: 4, y: 32, w: 38, h: 32, r: 11 },
		{ x: 44, y: 30, w: 36, h: 32, r: -6 },
		{ x: 84, y: 30, w: 32, h: 30, r: 12 },
		{ x: 16, y: 66, w: 38, h: 32, r: -7 },
		{ x: 54, y: 64, w: 32, h: 30, r: 6 },
		{ x: -6, y: 64, w: 30, h: 30, r: 3 },
		{ x: 80, y: 66, w: 34, h: 34, r: -11 }
	],
	[
		{ x: -6, y: -8, w: 42, h: 32, r: -8 },
		{ x: 32, y: -10, w: 44, h: 31, r: 9 },
		{ x: 72, y: -4, w: 36, h: 28, r: -4 },
		{ x: 2, y: 34, w: 34, h: 30, r: 8 },
		{ x: 40, y: 32, w: 38, h: 32, r: -7 },
		{ x: 78, y: 30, w: 34, h: 32, r: 10 },
		{ x: 12, y: 68, w: 36, h: 32, r: -5 },
		{ x: 48, y: 66, w: 32, h: 30, r: 5 },
		{ x: -4, y: 68, w: 30, h: 30, r: 1 },
		{ x: 74, y: 68, w: 36, h: 34, r: -12 }
	]
];

const MAX_COLLAGE_ITEMS = Math.max(...COLLAGE_LAYOUTS.map((layout) => layout.length));
const COLLAGE_SIZE_SCALE = 0.79;

// Helper function to build image array from folder with all files
// Since we can't list files client-side, we try common patterns and known files
function buildImageArrayFromFolder(folderPath, knownFiles = [], numberedRange = null) {
	const images = [];
	// Add known files
	knownFiles.forEach(file => {
		images.push(`${folderPath}/${file}`);
	});
	// Add numbered files if range specified
	if (numberedRange) {
		for (let i = numberedRange.start; i <= numberedRange.end; i++) {
			images.push(`${folderPath}/${i}.png`);
		}
	}
	return images;
}

// All images from random_characters folder (for polaroids)
const RANDOM_CHARACTER_IMAGES = (() => {
	const knownFiles = [
		'addad.png', 'afdwdar.png', 'agrwrq.png', 'awd.png', 'awfaqrf.png', 'bfd.png',
		'csacas.png', 'daw.png', 'dwa.png', 'fva.png', 'ges.png', 'gse.png',
		'hed.png', 'jyd.png', 'kitt.png', 'qeeweq.png', 'qeweqw.png', 'qewqe.png',
		'qweeq.png', 'rhtrh.png', 'sffeefws.png', 'wad.png', 'waewq.png', 'wda.png', 'yk.png'
	];
	return buildImageArrayFromFolder('public/random_characters', knownFiles, { start: 1, end: 100 });
})();

// Company character images
const COMPANY_CHARACTER_IMAGES = [
	'public/company_characters/admin_character.png',
	'public/company_characters/aldente_character.png',
	'public/company_characters/ambulance_character.png',
	'public/company_characters/aod_character.png',
	'public/company_characters/bikes_character.png',
	'public/company_characters/blockbudz_character.png',
	'public/company_characters/burgershot_character.png',
	'public/company_characters/caseys_character.png',
	'public/company_characters/church_character.png',
	'public/company_characters/doj_character.png',
	'public/company_characters/larrys_character.png',
	'public/company_characters/leapfrog_character.png',
	'public/company_characters/news_character.png',
	'public/company_characters/pearls_character.png',
	'public/company_characters/pier76_character.png',
	'public/company_characters/police_character.png',
	'public/company_characters/reds_character.png',
	'public/company_characters/sheriff_character.png',
	'public/company_characters/smokeys_character.png',
	'public/company_characters/taxi_character.png',
	'public/company_characters/tuner_character.png',
	'public/company_characters/yellowjack_character.png'
];

// Crime character images
const CRIME_CHARACTER_IMAGES_ARRAY = [
	'public/crime_characters/aod_character.png',
	'public/crime_characters/ballas_character.png',
	'public/crime_characters/lost_character.png',
	'public/crime_characters/madrazo_character.png',
	'public/crime_characters/pit_character.png',
	'public/crime_characters/rednecks_character.png'
];

// Crime shuffle images
const CRIME_SHUFFLE_IMAGES = (() => {
	// Only images from public/crime_shuffle folder (25 images total)
	const knownFiles = [
		'addad.png',
		'afdwdar.png',
		'agrwrq.png',
		'awd.png',
		'awfaqrf.png',
		'bfd.png',
		'csacas.png',
		'daw.png',
		'dwa.png',
		'fva.png',
		'ges.png',
		'gse.png',
		'hed.png',
		'jyd.png',
		'kitt.png',
		'qeeweq.png',
		'qeweqw.png',
		'qewqe.png',
		'qweeq.png',
		'rhtrh.png',
		'sffeefws.png',
		'wad.png',
		'waewq.png',
		'wda.png',
		'yk.png'
	];
	return knownFiles.map(file => `public/crime_shuffle/${file}`);
})();

// Helper function to get unique random images from pool
function getUniqueRandomImages(pool, count) {
	const shuffled = [...pool];
	// Fisher-Yates shuffle
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	// Return unique images up to the requested count
	return shuffled.slice(0, Math.min(count, shuffled.length));
}

function pickRandomCharacterImage() {
	return RANDOM_CHARACTER_IMAGES[Math.floor(Math.random() * RANDOM_CHARACTER_IMAGES.length)];
}

function getCharacterAltFromSrc(src) {
	const filename = (src.split('/').pop() || '').replace('.png', '');
	return filename ? `Character ${filename}` : 'Character';
}

function getRandomizedLayout(baseLayout = []) {
	const jitter = (value, range) => value + (Math.random() * range * 2 - range);
	return baseLayout.map((frame) => {
		const scaleFactor = jitter(COLLAGE_SIZE_SCALE, 0.16);
		return {
			x: jitter(frame.x, 10),
			y: jitter(frame.y, 10),
			w: Math.max(18, frame.w * scaleFactor),
			h: Math.max(18, frame.h * scaleFactor),
			r: jitter(frame.r || 0, 16)
		};
	});
}

// ==================== INITIALISATION ====================

async function init() {
	console.log('🌱 Initialising Roots Roleplay hero experience...');
	const loaded = await loadContent();
	if (!loaded) return;

	setupEventListeners();
	setCategory('legal', { skipAutoOpen: true });
	activateAppShell();
	spawnFloatingLogos();

	console.log('✅ Hero experience ready!');
}

async function loadContent() {
	try {
		const basePath = getBasePath();
		
		const [companies, crime, nogos, whitelist] = await Promise.all([
			fetch(`${basePath}/content/companies.json`).then((r) => r.json()),
			fetch(`${basePath}/content/crime-factions.json`).then((r) => r.json()),
			fetch(`${basePath}/content/nogos.json`).then((r) => r.json()),
			fetch(`${basePath}/content/whitelist.json`).then((r) => r.json())
		]);

		state.companies = (companies.companies || []).filter(Boolean);
		state.crimeFactions = (crime.factions || []).filter(Boolean);
		
		// Transform nogos.json into card format
		const nogosSteps = (nogos.steps || []).filter(Boolean);
		
		// Create first card with roots_nogo.png image only (no text)
		const introImageCard = {
			id: 'regelwerk-intro',
			title: '',
			content: '',
			image: 'public/roots_nogo.png',
			tagline: '',
			showTextLabel: false,
			isIntroImageCard: true // Mark as intro image card (image only, no content)
		};
		
		// First step is the introduction (Einleitung)
		const einleitungCard = nogosSteps.length > 0 ? {
			id: 'regelwerk-einleitung',
			title: nogosSteps[0].title || 'Einleitung',
			content: nogosSteps[0].content || '',
			tagline: '',
			isEinleitung: true, // Mark as Einleitung card
			showTextLabel: true
		} : null;
		
		// Transform remaining steps (starting from index 1) into NoGo cards
		const nogosCards = nogosSteps.slice(1).map((step, index) => ({
			id: `nogo-${index}`,
			title: step.title || '',
			content: step.content || '',
			tagline: '',
			nogoNumber: index + 1, // NoGo 1, NoGo 2, etc.
			showTextLabel: true
		}));
		
		// Create guidelines card with all guideline images and Discord CTA
		const guidelineImages = Array.from({ length: 10 }, (_, i) => `public/guidelines/${i + 4}.png`);
		const guidelinesCard = {
			id: 'guidelines',
			title: 'Guidelines',
			content: '',
			tagline: '',
			guidelineImages: guidelineImages,
			showGuidelines: true
		};
		
		// Create final card with roots_choice.png image only (no text)
		const choiceImageCard = {
			id: 'regelwerk-choice',
			title: '',
			content: '',
			image: 'public/whitelist/roots_choice.png',
			tagline: '',
			showTextLabel: false,
			isIntroImageCard: true // Mark as intro image card (image only, no content)
		};
		
		// Combine: einleitung card, intro image card, then nogos, then choice image, then guidelines card
		state.nogos = [...(einleitungCard ? [einleitungCard] : []), introImageCard, ...nogosCards, choiceImageCard, guidelinesCard];

		// Transform whitelist.json into card format
		const whitelistSteps = (whitelist.steps || []).filter(Boolean);
		
		// Create first intro card with roots_welcome.png image only (no text)
		const whitelistWelcomeCard = {
			id: 'whitelist-welcome',
			title: '',
			content: '',
			image: 'public/whitelist/roots_welcome.png',
			tagline: '',
			showTextLabel: false,
			isIntroImageCard: true // Mark as intro image card (image only, no content)
		};
		
		// Create second intro card with roots_serverzeiten.png image only (no text)
		const whitelistServerzeitenCard = {
			id: 'whitelist-serverzeiten',
			title: '',
			content: '',
			image: 'public/whitelist/roots_serverzeiten.png',
			tagline: '',
			showTextLabel: false,
			isIntroImageCard: true // Mark as intro image card (image only, no content)
		};
		
		// Transform all steps into whitelist cards
		const whitelistCards = whitelistSteps.map((step, index) => {
			const card = {
				id: `whitelist-step-${index}`,
				title: step.title || '',
				content: step.content || '',
				tagline: '',
				stepNumber: index + 1,
				showTextLabel: true,
				links: step.links || [],
				serverInfo: step.serverInfo || [],
				footer: step.footer || ''
			};
			
			// Add guidelines support if present
			if (step.showGuidelines) {
				const guidelineImages = Array.from({ length: 10 }, (_, i) => `public/guidelines/${i + 4}.png`);
				card.showGuidelines = true;
				card.guidelineImages = guidelineImages;
				card.showTextLabel = false; // Guidelines card doesn't show text label
			}
			
			return card;
		});
		
		// Create final card with roots_beginyourstory.png image only (no text)
		// This will be inserted between step 6 and step 7 (after Sicheres RP, before FiveM Server)
		const whitelistFinalCard = {
			id: 'whitelist-final',
			title: '',
			content: '',
			image: 'public/whitelist/roots_beginyourstory.png',
			tagline: '',
			showTextLabel: false,
			isIntroImageCard: true // Mark as intro image card (image only, no content)
		};
		
		// Combine: welcome image, serverzeiten image, steps 1-6, final image, then step 7
		// Step 6 is at index 5 (0-based), so we insert the final image after index 5
		const firstSixSteps = whitelistCards.slice(0, 6);
		const lastStep = whitelistCards.slice(6);
		state.whitelist = [whitelistWelcomeCard, whitelistServerzeitenCard, ...firstSixSteps, whitelistFinalCard, ...lastStep];

		// Inject a shuffling placeholder card at the front of the illegal rail
		const illegalMysteryCard = {
			id: 'underworld-mystery',
			title: '???',
			placeholder: true,
			placeholderText: 'Wähle dein Syndikat',
			placeholderVariant: 'illegal-mystery'
		};
		state.crimeFactions = [illegalMysteryCard, ...state.crimeFactions];

		// Inject a shuffling placeholder card at the front of the legal rail
		const legalMysteryCard = {
			id: 'mystery',
			displayName: 'Dein Weg',
			title: 'Dein Weg',
			description: '',
			image: '',
			placeholder: true,
			placeholderText: 'Dich'
		};
		state.companies = [legalMysteryCard, ...state.companies];
		return true;
	} catch (error) {
		console.error('❌ Failed to load content:', error);
		return false;
	}
}

function activateAppShell() {
	const app = document.getElementById('appRoot');
	if (!app) return;
	app.classList.add('app--active');
	app.classList.remove('app--gated');
}

function wireChoiceButton(button, { autoOpenDetail = false } = {}) {
	if (!button) return;

	const guardKey = autoOpenDetail ? 'detailChoiceBound' : 'heroChoiceBound';
	if (button.dataset[guardKey] === '1') return;

	if (button.dataset.choice) {
		const handleChoice = (event) => {
			if (event) event.preventDefault();
			const choice = button.dataset.choice;
			if (!choice) return;
			setCategory(choice, { autoOpen: autoOpenDetail });
		};
		button.addEventListener('click', handleChoice);
		button.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				handleChoice();
			}
		});
	} else if (button.dataset.link) {
		const handleLink = (event) => {
			if (event) event.preventDefault();
			const targetUrl = button.dataset.link;
			if (!targetUrl) return;
			window.open(targetUrl, '_blank', 'noopener');
		};
		button.addEventListener('click', handleLink);
		button.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				handleLink();
			}
		});
	}

	button.dataset[guardKey] = '1';
}

function setupEventListeners() {
	document.querySelectorAll('.hero-choice__btn').forEach((button) => {
		wireChoiceButton(button, { autoOpenDetail: false });
	});

	const closeBtn = document.getElementById('crimeBack');
	if (closeBtn) {
		closeBtn.addEventListener('click', () => closeDetail());
		closeBtn.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				closeDetail();
			}
		});
	}

	const prevBtn = document.getElementById('crimePrev');
	if (prevBtn) {
		prevBtn.addEventListener('click', () => navigateDetail(-1));
		prevBtn.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				navigateDetail(-1);
			}
		});
	}

	const nextBtn = document.getElementById('crimeNext');
	if (nextBtn) {
		nextBtn.addEventListener('click', () => navigateDetail(1));
		nextBtn.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				navigateDetail(1);
			}
		});
	}

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			if (document.body.classList.contains('is-split-open')) {
				exitSplitMode();
			} else {
				closeDetail();
			}
		} else if (event.key === 'ArrowRight' && isDetailOpen()) {
			navigateDetail(1);
		} else if (event.key === 'ArrowLeft' && isDetailOpen()) {
			navigateDetail(-1);
		} else if (event.key === 'ArrowRight' && !isDetailOpen()) {
			navigateHeroRail(1);
		} else if (event.key === 'ArrowLeft' && !isDetailOpen()) {
			navigateHeroRail(-1);
		}
	});

	window.addEventListener('resize', () => {
		if (isDetailOpen()) {
			requestAnimationFrame(alignCollageToMedia);
		}
		// Re-align hero rail auto-scroll when resizing
		resetHeroRailIdle();
	});

	// Subtle 3D tilt on hero cards
	document.addEventListener('pointermove', handleCardTiltMove);
	document.addEventListener('pointerleave', resetCardTilt, true);

	// Ensure bottom controls are wired even before rail controls initialize
	initHeroRailButtons();
}

function setCategory(category, options = {}) {
    if (!CATEGORY_CONFIG[category]) return;

    state.currentCategory = category;
    const dataset = getDataset(category);
    state.currentIndex = 0;

    updateChoiceButtons();
    resetHeroRailIdle();
    clearHeroRandomSpin();
    renderHeroCards(dataset, category);
    
    // Use polaroids for legal, illegal, regelwerk, and whitelist categories
    const container = document.getElementById('heroDynamicBg');
    if (container) {
        if (category === 'regelwerk' || category === 'whitelist' || category === 'legal' || category === 'illegal') {
            spawnFloatingLogos(category);
        } else {
            container.innerHTML = '';
            if (Array.isArray(spawnFloatingLogos._highlightTimers)) {
                spawnFloatingLogos._highlightTimers.forEach((id) => clearTimeout(id));
            }
            spawnFloatingLogos._highlightTimers = [];
        }
    }

    if (dataset.length === 0) {
        closeDetail({ silent: true, force: true });
        return;
    }

    if (options.autoOpen) {
        openDetail(category, state.currentIndex);
    } else if (!options.skipAutoOpen) {
        closeDetail({ silent: true, force: true });
        highlightHeroCard(state.currentIndex);
    }
}

function updateChoiceButtons() {
	document.querySelectorAll('.hero-choice__btn[data-choice]').forEach((button) => {
		button.classList.toggle('is-active', button.dataset.choice === state.currentCategory);
	});
}

function renderHeroCards(dataset, category = state.currentCategory) {
	const stack = document.getElementById('heroCardStack');
	if (!stack) return;

	stack.innerHTML = '';
	stack.classList.toggle('is-illegal', category === 'illegal');
	stack.classList.add('as-rail');

	if (!Array.isArray(dataset) || dataset.length === 0) {
		const empty = document.createElement('p');
		empty.className = 'hero-empty';
		empty.textContent = 'Keine Einträge gefunden.';
		stack.appendChild(empty);
		state.heroCardsMounted = false;
		return;
	}

	const track = document.createElement('div');
	track.className = 'hero-card-track';
	dataset.forEach((item, index) => {
		const card = createHeroCard(item, index, category);
		track.appendChild(card);
		
		// Add arrow between all whitelist cards (including intro images and final image)
		if (category === 'whitelist' && index < dataset.length - 1) {
			const arrow = document.createElement('div');
			arrow.className = 'hero-card-arrow';
			arrow.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
			arrow.setAttribute('aria-hidden', 'true');
			// Use the same animation delay as the card
			arrow.style.setProperty('--animation-delay', `${index * 0.1}s`);
			track.appendChild(arrow);
		}
	});

	if (category === 'legal' || category === 'illegal') {
		const hint = document.createElement('div');
		hint.className = 'hero-rail-hint';
		hint.innerHTML = '<span class="hero-rail-hint__text">Wir Suchen</span><span class="hero-rail-hint__arrow">→</span>';
		track.insertBefore(hint, track.firstChild || null);
	}
	stack.appendChild(track);

	state.heroCardsMounted = true;
	const initialIndex = clampHeroIndex(state.currentIndex);
	state.currentIndex = initialIndex;
	const initialAlign = initialIndex === 0 ? 'start' : 'center';
	
	// Use double requestAnimationFrame to ensure layout is complete
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			const stack = getHeroRail();
			if (stack) {
				// Reset to 0 first
				stack.scrollLeft = 0;
				// Always call focusHeroRailIndex to ensure highlighting works
				focusHeroRailIndex(initialIndex, { smooth: false, align: initialAlign });
			}
		});
	});
	
	setupHeroRailControls();
}

function createHeroCard(item, index, category) {
	const card = document.createElement('button');
	card.type = 'button';
	const isPlaceholder = !!(item && item.placeholder === true);
	card.className = 'hero-card' + (category === 'illegal' ? ' hero-card--illegal' : '') + (category === 'regelwerk' ? ' hero-card--regelwerk' : '') + (category === 'whitelist' ? ' hero-card--whitelist' : '') + (isPlaceholder ? ' hero-card--placeholder' : '');
	card.dataset.index = String(index);
	card.dataset.category = category;

	const imageSrc = getHeroCardImage(item, category);
	const logoSrc = getHeroCardLogo(item, category);
	// For illegal, use the thumbnail image as backdrop; for legal, use the company logo
	// For regelwerk and whitelist, only use image backdrop on intro image card
	const isRegelwerkIntro = category === 'regelwerk' && item?.isIntroImageCard;
	const isWhitelistIntro = category === 'whitelist' && item?.isIntroImageCard;
	const logoValue = (category === 'illegal' || isRegelwerkIntro || isWhitelistIntro) ? `url('${imageSrc}')` : (logoSrc ? `url('${logoSrc}')` : '');
	const title = CATEGORY_CONFIG[category].getTitle(item);

	card.setAttribute('aria-label', isPlaceholder ? '' : `${title} öffnen`);
	if (logoValue) {
		card.style.setProperty('--card-logo', logoValue);
	}

	const placeholderText = isPlaceholder
		? (item?.placeholderText || (category === 'illegal' ? 'Wähle dein Syndikat' : 'Dich'))
		: '';

	const buildIllegalPlaceholder = () => {
		// Illegal shuffle: use only crime_shuffle
		const illegalShufflePool = CRIME_SHUFFLE_IMAGES;
		// Ensure exactly 8 characters - always create 8 cells
		const faceCount = 8;
		// Get exactly 8 unique images (or as many as available if pool is smaller)
		const requestedCount = Math.min(faceCount, illegalShufflePool.length);
		let faces = getUniqueRandomImages(illegalShufflePool, requestedCount);
		// If we got fewer than 8, try to get more unique ones
		if (faces.length < faceCount && illegalShufflePool.length >= faceCount) {
			const used = new Set(faces.map(f => normalizeAssetPath(f)));
			const remaining = illegalShufflePool.filter(img => !used.has(normalizeAssetPath(img)));
			const needed = faceCount - faces.length;
			if (remaining.length >= needed) {
				const additional = getUniqueRandomImages(remaining, needed);
				faces = [...faces, ...additional];
			}
		}
		// Always create exactly 8 cells with proper error handling
		// Ensure we have exactly 8 unique images
		const usedSrcs = new Set();
		const finalFaces = [];
		
		// First, add all faces we got
		faces.forEach(face => {
			const normalized = normalizeAssetPath(face);
			if (!usedSrcs.has(normalized)) {
				finalFaces.push(normalized);
				usedSrcs.add(normalized);
			}
		});
		
		// Fill up to 8 with additional unique images
		while (finalFaces.length < faceCount && illegalShufflePool.length > 0) {
			const available = illegalShufflePool
				.map(normalizeAssetPath)
				.filter(src => !usedSrcs.has(src));
			
			if (available.length === 0) {
				// If we've exhausted all unique images, break
				break;
			}
			
			const additional = available[Math.floor(Math.random() * available.length)];
			finalFaces.push(additional);
			usedSrcs.add(additional);
		}
		
		// Build grid HTML - always create 8 cells
		const gridCells = [];
		for (let index = 0; index < faceCount; index++) {
			if (index < finalFaces.length) {
				const normalizedSrc = finalFaces[index];
				const alt = getCharacterAltFromSrc(normalizedSrc);
				gridCells.push(`
					<div class="illegal-placeholder__cell">
						<img class="illegal-placeholder__image" src="${normalizedSrc}" alt="${escapeHtml(alt)}" loading="lazy" aria-hidden="true">
					</div>
				`);
			} else {
				// This shouldn't happen if we have enough images, but create empty cell as fallback
				gridCells.push(`
					<div class="illegal-placeholder__cell">
						<img class="illegal-placeholder__image" src="" alt="" loading="lazy" aria-hidden="true" style="display: none;">
					</div>
				`);
			}
		}
		
		const grid = gridCells.join('');

		return `
			<span class="hero-card__backdrop" aria-hidden="true"></span>
			<div class="illegal-placeholder">
				<div class="illegal-placeholder__stage">
					<div class="illegal-placeholder__grid" data-count="${faceCount}">${grid}</div>
				</div>
				<div class="illegal-placeholder__controls">
					<button class="split-shuffle" type="button" aria-label="Neue Crew mischen"><span class="split-shuffle__icon">✦</span><span class="split-shuffle__text">Dich</span></button>
				</div>
			</div>
		`;
	};

	let mainContentHtml;
	if (isPlaceholder) {
		if (category === 'illegal') {
			mainContentHtml = buildIllegalPlaceholder();
		} else {
			mainContentHtml = `
				<span class="hero-card__backdrop" aria-hidden="true"></span>
				<span class="hero-card__single-logo" aria-hidden="true"></span>
				<span class="hero-card__text">${escapeHtml(placeholderText)}</span>
			`;
		}
	} else {
		// For regelwerk and whitelist cards, show content directly on card with image backdrop
		if (category === 'regelwerk' || category === 'whitelist') {
			if (item?.isIntroImageCard) {
				// Intro image card - just image, no text
				const altText = category === 'whitelist' ? 'Serverzeiten' : 'Roots NoGo';
				mainContentHtml = `
					<span class="hero-card__backdrop" aria-hidden="true"></span>
					<img class="hero-card__image" src="${imageSrc}" alt="${altText}" loading="lazy">
				`;
			} else if (item?.showGuidelines) {
				// Guidelines card - show all guideline images with Discord CTA in middle
				const guidelineImages = item.guidelineImages || [];
				// Create grid: 4 columns x 4 rows = 16 slots
				// Layout: Discord (2x2) centered (cols 2-3, rows 2-3), guidelines around it filling all space
				// Row 1: 4 guidelines (cells 1,2,3,4)
				// Row 2: 1 guideline (cell 1), Discord 2x2 (cells 2-3), 1 guideline (cell 4)
				// Row 3: 1 guideline (cell 1), Discord continues (cells 2-3), 1 guideline (cell 4)
				// Row 4: 2 guidelines (cells 1,2), 2 guidelines (cells 3,4)
				const topRow = guidelineImages.slice(0, 4);
				const row2Left = guidelineImages.slice(4, 5);
				const row2Right = guidelineImages.slice(5, 6);
				const row3Left = guidelineImages.slice(6, 7);
				const row3Right = guidelineImages.slice(7, 8);
				const bottomRow = guidelineImages.slice(8, 10);
				// We have 10 images total, using 8 so far (4 top + 1 row2 left + 1 row2 right + 1 row3 left + 1 row3 right)
				// Bottom row needs 4 cells, but we only have 2 images left, so we'll use those 2
				
				const topRowHtml = topRow.map((imgSrc, idx) => 
					`<div class="hero-card__guideline-item">
						<img src="${imgSrc}" alt="Guideline ${idx + 4}" loading="lazy" class="hero-card__guideline-image">
					</div>`
				).join('');
				
				const row2LeftHtml = row2Left.map((imgSrc, idx) => 
					`<div class="hero-card__guideline-item" style="grid-column: 1; grid-row: 2;">
						<img src="${imgSrc}" alt="Guideline ${idx + 8}" loading="lazy" class="hero-card__guideline-image">
					</div>`
				).join('');
				
				const ctaHtml = `<div class="hero-card__guideline-item hero-card__guideline-item--cta" style="grid-column: 2 / 4; grid-row: 2 / 4;">
					<a href="https://discord.gg/rootsroleplay" target="_blank" rel="noopener noreferrer" class="hero-card__guidelines-discord-cta">
						<svg class="hero-card__discord-icon" width="32" height="32" viewBox="0 0 71 55" fill="currentColor" aria-hidden="true">
							<path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z"/>
						</svg>
						<span class="hero-card__discord-text">Lese die Guidelines auf unserem Discord</span>
					</a>
				</div>`;
				
				const row2RightHtml = row2Right.map((imgSrc, idx) => 
					`<div class="hero-card__guideline-item" style="grid-column: 4; grid-row: 2;">
						<img src="${imgSrc}" alt="Guideline ${idx + 9}" loading="lazy" class="hero-card__guideline-image">
					</div>`
				).join('');
				
				const row3LeftHtml = row3Left.map((imgSrc, idx) => 
					`<div class="hero-card__guideline-item" style="grid-column: 1; grid-row: 3;">
						<img src="${imgSrc}" alt="Guideline ${idx + 10}" loading="lazy" class="hero-card__guideline-image">
					</div>`
				).join('');
				
				const row3RightHtml = row3Right.map((imgSrc, idx) => 
					`<div class="hero-card__guideline-item" style="grid-column: 4; grid-row: 3;">
						<img src="${imgSrc}" alt="Guideline ${idx + 11}" loading="lazy" class="hero-card__guideline-image">
					</div>`
				).join('');
				
				// Bottom row: use remaining 2 images, fill remaining 2 cells with first 2 images again to fill the grid
				const bottomRowHtml = bottomRow.map((imgSrc, idx) => 
					`<div class="hero-card__guideline-item" style="grid-column: ${idx + 1}; grid-row: 4;">
						<img src="${imgSrc}" alt="Guideline ${idx + 12}" loading="lazy" class="hero-card__guideline-image">
					</div>`
				).join('') + 
				// Fill remaining 2 bottom cells by reusing first 2 images
				guidelineImages.slice(0, 2).map((imgSrc, idx) => 
					`<div class="hero-card__guideline-item" style="grid-column: ${idx + 3}; grid-row: 4;">
						<img src="${imgSrc}" alt="Guideline ${idx + 4}" loading="lazy" class="hero-card__guideline-image">
					</div>`
				).join('');
				
				mainContentHtml = `
					<span class="hero-card__backdrop" aria-hidden="true"></span>
					<div class="hero-card__guidelines-content">
						<div class="hero-card__guidelines-grid">
							${topRowHtml}
							${row2LeftHtml}
							${ctaHtml}
							${row2RightHtml}
							${row3LeftHtml}
							${row3RightHtml}
							${bottomRowHtml}
						</div>
					</div>
				`;
			} else if (item?.showTextLabel) {
				const content = CATEGORY_CONFIG[category].getContent(item) || '';
				// Format content - replace double newlines with paragraph breaks, single newlines with spaces
				const formattedContent = content
					.split(/\n{2,}/)
					.map(para => para.replace(/\n/g, ' ').trim())
					.filter(para => para.length > 0)
					.map(para => `<p>${escapeHtml(para)}</p>`)
					.join('');
				
				if (item?.isEinleitung) {
					// Einleitung card - no image, just content
					mainContentHtml = `
						<span class="hero-card__backdrop" aria-hidden="true"></span>
						<div class="hero-card__nogo-content">
							<div class="hero-card__nogo-header">
								<span class="hero-card__text hero-card__text--nogo hero-card__text--einleitung">Einleitung</span>
								<span class="hero-card__text-title">${escapeHtml(title)}</span>
							</div>
							<div class="hero-card__nogo-description">${formattedContent}</div>
						</div>
					`;
				} else if (category === 'whitelist') {
					// Whitelist cards - simple design with no flip
					const stepNumber = item.stepNumber || (index);
					
					// Handle guidelines card (similar to regelwerk)
					if (item?.showGuidelines) {
						const guidelineImages = item.guidelineImages || [];
						// Create grid: 4 columns x 4 rows = 16 slots
						const topRow = guidelineImages.slice(0, 4);
						const row2Left = guidelineImages.slice(4, 5);
						const row2Right = guidelineImages.slice(5, 6);
						const row3Left = guidelineImages.slice(6, 7);
						const row3Right = guidelineImages.slice(7, 8);
						const bottomRow = guidelineImages.slice(8, 10);
						
						const topRowHtml = topRow.map((imgSrc, idx) => 
							`<div class="hero-card__guideline-item">
								<img src="${imgSrc}" alt="Guideline ${idx + 4}" loading="lazy" class="hero-card__guideline-image">
							</div>`
						).join('');
						
						const row2LeftHtml = row2Left.map((imgSrc, idx) => 
							`<div class="hero-card__guideline-item" style="grid-column: 1; grid-row: 2;">
								<img src="${imgSrc}" alt="Guideline ${idx + 8}" loading="lazy" class="hero-card__guideline-image">
							</div>`
						).join('');
						
						const ctaHtml = `<div class="hero-card__guideline-item hero-card__guideline-item--cta" style="grid-column: 2 / 4; grid-row: 2 / 4;">
							<a href="https://discord.gg/rootsroleplay" target="_blank" rel="noopener noreferrer" class="hero-card__guidelines-discord-cta">
								<svg class="hero-card__discord-icon" width="32" height="32" viewBox="0 0 71 55" fill="currentColor" aria-hidden="true">
									<path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z"/>
								</svg>
								<span class="hero-card__discord-text">Komm auf unseren Discord</span>
							</a>
						</div>`;
						
						const row2RightHtml = row2Right.map((imgSrc, idx) => 
							`<div class="hero-card__guideline-item" style="grid-column: 4; grid-row: 2;">
								<img src="${imgSrc}" alt="Guideline ${idx + 9}" loading="lazy" class="hero-card__guideline-image">
							</div>`
						).join('');
						
						const row3LeftHtml = row3Left.map((imgSrc, idx) => 
							`<div class="hero-card__guideline-item" style="grid-column: 1; grid-row: 3;">
								<img src="${imgSrc}" alt="Guideline ${idx + 10}" loading="lazy" class="hero-card__guideline-image">
							</div>`
						).join('');
						
						const row3RightHtml = row3Right.map((imgSrc, idx) => 
							`<div class="hero-card__guideline-item" style="grid-column: 4; grid-row: 3;">
								<img src="${imgSrc}" alt="Guideline ${idx + 11}" loading="lazy" class="hero-card__guideline-image">
							</div>`
						).join('');
						
						const bottomRowHtml = bottomRow.map((imgSrc, idx) => 
							`<div class="hero-card__guideline-item" style="grid-column: ${idx + 1}; grid-row: 4;">
								<img src="${imgSrc}" alt="Guideline ${idx + 12}" loading="lazy" class="hero-card__guideline-image">
							</div>`
						).join('') + 
						guidelineImages.slice(0, 2).map((imgSrc, idx) => 
							`<div class="hero-card__guideline-item" style="grid-column: ${idx + 3}; grid-row: 4;">
								<img src="${imgSrc}" alt="Guideline ${idx + 4}" loading="lazy" class="hero-card__guideline-image">
							</div>`
						).join('');
						
						mainContentHtml = `
							<span class="hero-card__backdrop" aria-hidden="true"></span>
							<div class="hero-card__guidelines-content">
								<div class="hero-card__guidelines-grid">
									${topRowHtml}
									${row2LeftHtml}
									${ctaHtml}
									${row2RightHtml}
									${row3LeftHtml}
									${row3RightHtml}
									${bottomRowHtml}
								</div>
							</div>
						`;
					} else {
					
					// Build buttons for links
					let buttonsHtml = '';
					if (item.links && item.links.length > 0) {
						const buttons = item.links.map(link => 
							`<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="hero-card__nogo-button">
								<span class="hero-card__nogo-button-text">${escapeHtml(link.text)}</span>
							</a>`
						).join('');
						buttonsHtml = `<div class="hero-card__nogo-buttons">${buttons}</div>`;
					}
					
					// Build server info display with click-to-copy
					let serverInfoHtml = '';
					if (item.serverInfo && item.serverInfo.length > 0) {
						const serverInfo = item.serverInfo.map((info, idx) => 
							`<div class="hero-card__server-info" data-copy-text="${escapeHtml(info)}" data-copy-id="server-${stepNumber}-${idx}">
								<span class="hero-card__server-info-text">${escapeHtml(info)}</span>
								<span class="hero-card__server-info-hint">Klicken zum Kopieren</span>
								<span class="hero-card__server-info-copied">✓ Kopiert!</span>
							</div>`
						).join('');
						serverInfoHtml = `<div class="hero-card__server-info-container">${serverInfo}</div>`;
					}
					
					// Add Quick Connect button for Schritt 5 (TeamSpeak) and Schritt 7 (FiveM)
					let quickConnectHtml = '';
					if (stepNumber === 5 && item.serverInfo && item.serverInfo.length > 0) {
						// TeamSpeak Quick Connect - prefer entry with port, otherwise use first with default port
						let serverAddress = item.serverInfo.find(info => info.includes(':')) || item.serverInfo[0];
						// If no port specified, use default TeamSpeak port 9987
						if (!serverAddress.includes(':')) {
							serverAddress = `${serverAddress}:9987`;
						}
						quickConnectHtml = `<a href="ts3server://${serverAddress}" class="hero-card__quick-connect hero-card__quick-connect--teamspeak">
							<svg class="hero-card__quick-connect-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
								<path d="M12 2a10 10 0 00-3.92 19.21c.62.11.85-.27.85-.6v-2.1c-3.46.75-4.18-1.67-4.18-1.67-.57-1.44-1.38-1.82-1.38-1.82-1.13-.78.09-.77.09-.77 1.26.09 1.92 1.3 1.92 1.3 1.11 1.92 2.9 1.36 3.61 1.04.11-.8.43-1.36.78-1.67-2.77-.32-5.69-1.38-5.69-6.15 0-1.36.51-2.47 1.3-3.34-.13-.33-.56-1.67.12-3.47 0 0 1.05-.33 3.45 1.29.99-.28 2.05-.42 3.11-.42s2.12.14 3.11.42c2.4-1.62 3.45-1.29 3.45-1.29.68 1.8.25 3.14.12 3.47.8.87 1.3 1.98 1.3 3.34 0 4.79-2.92 5.83-5.7 6.14.44.38.84 1.12.84 2.27v3.36c0 .33.22.71.86.59A10 10 0 0012 2z"/>
							</svg>
							<span>Quick Connect</span>
						</a>`;
					} else if (stepNumber === 7 && item.serverInfo && item.serverInfo.length > 0) {
						// FiveM Quick Connect - use first server info, extract IP/domain
						const firstServer = item.serverInfo[0];
						// Remove "connect " prefix if present
						const serverAddress = firstServer.replace(/^connect\s+/i, '').trim();
						quickConnectHtml = `<a href="fivem://connect/${serverAddress}" class="hero-card__quick-connect hero-card__quick-connect--fivem">
							<svg class="hero-card__quick-connect-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
								<path d="M12.46 2c.32 0 .6.18.75.46l8.24 16.27c.21.4.06.9-.34 1.11-.12.07-.26.1-.4.1h-4.5l-2.04-4.57a.9.9 0 00-1.64 0L9.5 19.94H4.75c-.46 0-.84-.38-.84-.84 0-.13.03-.27.1-.4l8.24-16.24A.85.85 0 0112.46 2zm.51 8.87l3.22 7.21h2.14l-5.36-10.7-1.77 3.49 1.77-.02zm-1.94 4.1l-1.2 3.1h2.45l-1.25-3.1z"/>
							</svg>
							<span>Quick Connect</span>
						</a>`;
					}
					
					// Add footer text if present
					let footerTextHtml = '';
					if (item.footer) {
						footerTextHtml = `<div class="hero-card__whitelist-footer">${escapeHtml(item.footer)}</div>`;
					}
					
					mainContentHtml = `
						<span class="hero-card__backdrop" aria-hidden="true"></span>
						<div class="hero-card__whitelist-content">
							<div class="hero-card__whitelist-header">
								<span class="hero-card__whitelist-step">Schritt ${stepNumber}</span>
								<span class="hero-card__whitelist-title">${escapeHtml(title)}</span>
							</div>
							<div class="hero-card__whitelist-description">${formattedContent}</div>
							${buttonsHtml}
							${serverInfoHtml}
							${footerTextHtml}
							${quickConnectHtml}
						</div>
					`;
					// Add animation delay based on index
					card.style.setProperty('--animation-delay', `${index * 0.1}s`);
					card.classList.add('hero-card--whitelist-step');
					
					// Add click-to-copy handlers for server info
					if (item.serverInfo && item.serverInfo.length > 0) {
						// Use setTimeout to ensure DOM is ready
						setTimeout(() => {
							const serverInfoElements = card.querySelectorAll('.hero-card__server-info');
							serverInfoElements.forEach((el) => {
								el.addEventListener('click', async (e) => {
									e.preventDefault();
									const textToCopy = el.dataset.copyText;
									if (!textToCopy) return;
									
									// Immediately show "Kopiert!" and disable hover
									el.classList.add('hero-card__server-info--copied');
									el.classList.add('hero-card__server-info--no-hover');
									
									try {
										await navigator.clipboard.writeText(textToCopy);
										
										// Remove the class after animation completes and re-enable hover
										setTimeout(() => {
											el.classList.remove('hero-card__server-info--copied');
											// Re-enable hover after a short delay
											setTimeout(() => {
												el.classList.remove('hero-card__server-info--no-hover');
											}, 300);
										}, 2500);
									} catch (err) {
										console.error('Failed to copy:', err);
										// Remove classes on error too
										el.classList.remove('hero-card__server-info--copied');
										el.classList.remove('hero-card__server-info--no-hover');
									}
								});
							});
						}, 100);
					}
					}
				} else {
				// NoGo cards with text labels - card flip design
				const nogoNumber = item.nogoNumber || (index + 1);
				
				// Special handling for nogo 11 - add buttons for links
				let descriptionHtml = formattedContent;
				if (nogoNumber === 11) {
					// Extract links from content and create buttons
					const cfxLink = 'https://runtime.fivem.net/platform-license-agreement-12-sept-2023.pdf';
					const rockstarLink = 'https://www.rockstargames.com/legal';
					
					// Remove everything from "Links:" onwards and replace with buttons
					descriptionHtml = formattedContent.replace(
						/<p>Links:.*$/m,
						''
					).replace(
						/<p>.*CFX Platform License Agreement.*$/m,
						''
					).replace(
						/<p>.*Rockstar Games Legal.*$/m,
						''
					).trim() + `<div class="hero-card__nogo-buttons">
							<a href="${cfxLink}" target="_blank" rel="noopener noreferrer" class="hero-card__nogo-button">
								<span class="hero-card__nogo-button-text">CFX Platform License Agreement</span>
							</a>
							<a href="${rockstarLink}" target="_blank" rel="noopener noreferrer" class="hero-card__nogo-button">
								<span class="hero-card__nogo-button-text">Rockstar Games Legal</span>
							</a>
						</div>`;
				}
				
				mainContentHtml = `
					<div class="hero-card__flip-container">
						<div class="hero-card__face hero-card__face--back">
							<img src="public/roots_R.png" alt="Roots" loading="lazy">
							<span class="hero-card__footer">Klicken zum Umdrehen</span>
						</div>
						<div class="hero-card__face hero-card__face--front">
							<span class="hero-card__backdrop" aria-hidden="true"></span>
							<div class="hero-card__nogo-content">
								<div class="hero-card__nogo-header">
									<span class="hero-card__text hero-card__text--nogo">NoGo ${nogoNumber}</span>
									<span class="hero-card__text-title">${escapeHtml(title)}</span>
								</div>
								<div class="hero-card__nogo-description">${descriptionHtml}</div>
							</div>
							<span class="hero-card__footer">Klicken zum Umdrehen</span>
						</div>
					</div>
				`;
				// Start with back showing (flipped state) - except for the first nogo card (NoGo 1)
				if (nogoNumber !== 1) {
					card.classList.add('hero-card--flipped');
				}
			}
			} else {
				mainContentHtml = `
					<span class="hero-card__backdrop" aria-hidden="true"></span>
					<img class="hero-card__image" src="${imageSrc}" alt="${escapeHtml(title)}" loading="lazy">
				`;
			}
		} else {
			mainContentHtml = `
				<span class="hero-card__backdrop" aria-hidden="true"></span>
				<img class="hero-card__image" src="${imageSrc}" alt="${escapeHtml(title)}" loading="lazy">
			`;
		}
	}

	// Show footer for non-regelwerk/whitelist cards or regelwerk cards that don't flip (but not intro image or guidelines)
	// Whitelist cards never show footer
	const showFooter = (category !== 'regelwerk' && category !== 'whitelist') || (category === 'regelwerk' && !item?.showTextLabel && !item?.isIntroImageCard && !item?.showGuidelines);
	const footerText = isPlaceholder ? '' : 'Zum Öffnen klicken';
	
	card.innerHTML = `
		${mainContentHtml}
		${showFooter ? `<span class="hero-card__footer">${footerText}</span>` : ''}
	`;

	// Add interactive grid splitting effect for placeholder card
	if (isPlaceholder) {
		card.style.setProperty('--card-logo', 'none');
		
		// Add error handlers for illegal placeholder images after DOM insertion
		if (category === 'illegal') {
			setTimeout(() => {
				const grid = card.querySelector('.illegal-placeholder__grid');
				if (grid) {
					const images = Array.from(grid.querySelectorAll('.illegal-placeholder__image'));
					const illegalShufflePool = CRIME_SHUFFLE_IMAGES;
					
					images.forEach((img, index) => {
						let retryCount = 0;
						const maxRetries = 10;
						
						const handleError = () => {
							// Get all currently used images (excluding empty/broken ones)
							const allImages = Array.from(grid.querySelectorAll('.illegal-placeholder__image'));
							const usedSrcs = new Set();
							allImages.forEach(i => {
								if (i.src && i.src !== img.src && i.complete && i.naturalHeight > 0) {
									const normalized = normalizeAssetPath(i.src);
									usedSrcs.add(normalized);
								}
							});
							
							// Find an unused image from the pool
							const available = illegalShufflePool
								.map(normalizeAssetPath)
								.filter(src => {
									const normalized = normalizeAssetPath(src);
									return !usedSrcs.has(normalized);
								});
							
							if (available.length > 0 && retryCount < maxRetries) {
								retryCount++;
								const retrySrc = normalizeAssetPath(available[Math.floor(Math.random() * available.length)]);
								img.src = retrySrc;
								img.alt = getCharacterAltFromSrc(retrySrc);
								img.style.display = '';
								img.style.visibility = 'visible';
							} else if (retryCount >= maxRetries && available.length > 0) {
								// After max retries, still try to get a unique one
								const fallbackSrc = normalizeAssetPath(available[0]);
								img.src = fallbackSrc;
								img.alt = getCharacterAltFromSrc(fallbackSrc);
								img.style.display = '';
								img.style.visibility = 'visible';
							}
						};
						
						img.onerror = handleError;
						
						// Check if image failed to load initially or is empty
						if (!img.src || img.src === '' || !img.complete || img.naturalHeight === 0) {
							// Trigger error handler to get a valid image
							setTimeout(() => {
								if (!img.src || img.src === '' || !img.complete || img.naturalHeight === 0) {
									handleError();
								}
							}, 100);
						}
						
						// Also check after a longer delay to catch slow-loading images
						setTimeout(() => {
							if (!img.complete || img.naturalHeight === 0) {
								handleError();
							}
						}, 500);
					});
				}
			}, 100);
		}
	}

	// Auto-size text in nogo/whitelist description cards to fit perfectly
	if ((category === 'regelwerk' || category === 'whitelist') && !isPlaceholder && item?.showTextLabel) {
		const descriptionEl = card.querySelector('.hero-card__nogo-description');
		if (descriptionEl) {
			// Use requestAnimationFrame to ensure card is rendered first
			requestAnimationFrame(() => {
				autoSizeTextToFit(descriptionEl);
			});
		}
	}

	if (isPlaceholder && category === 'illegal') {
		const placeholderRoot = card.querySelector('.illegal-placeholder');
		const shuffleBtn = card.querySelector('.split-shuffle');
		const grid = card.querySelector('.illegal-placeholder__grid');

		if (placeholderRoot && grid && shuffleBtn) {
			const highlightClass = 'illegal-placeholder__cell--selected';
			let shuffleActive = false;
			const cadence = [60, 80, 100, 120, 140, 160, 200, 240, 280, 340, 420, 520];

			const getCells = () => Array.from(grid.querySelectorAll('.illegal-placeholder__cell'));
			const getImages = () => Array.from(grid.querySelectorAll('.illegal-placeholder__image'));
			
			// Track used images to prevent duplicates
			let usedImages = new Set();
			// Illegal shuffle: use only crime_shuffle
			const illegalShufflePool = CRIME_SHUFFLE_IMAGES;
			const getAvailableImages = () => {
				const currentImages = getImages().map(img => img.src);
				usedImages = new Set(currentImages);
				return illegalShufflePool.filter(img => {
					const normalized = normalizeAssetPath(img);
					return !usedImages.has(normalized);
				});
			};
			
			const getRandomUniqueImage = (availablePool) => {
				if (availablePool.length === 0) {
					// If all images are used, reset and use all images
					const randomImg = illegalShufflePool[Math.floor(Math.random() * illegalShufflePool.length)];
					return normalizeAssetPath(randomImg);
				}
				return normalizeAssetPath(availablePool[Math.floor(Math.random() * availablePool.length)]);
			};

			const clearSelection = () => {
				getCells().forEach((cell) => cell.classList.remove(highlightClass));
			};

			shuffleBtn.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				if (shuffleActive) return;
				shuffleActive = true;
				clearSelection();
				shuffleBtn.disabled = true;
				shuffleBtn.classList.add('is-rolling');
				
				// Get unique images for final result - always use 8, not current count
				const imageCount = 8;
				// Illegal shuffle: use only crime_shuffle
				const illegalShufflePool = CRIME_SHUFFLE_IMAGES;
				// Ensure we get exactly 8 unique images
				let finalImages = getUniqueRandomImages(illegalShufflePool, Math.min(imageCount, illegalShufflePool.length));
				// If we got fewer than 8, try to get more unique ones
				if (finalImages.length < imageCount && illegalShufflePool.length >= imageCount) {
					const used = new Set(finalImages.map(f => normalizeAssetPath(f)));
					const remaining = illegalShufflePool.filter(img => !used.has(normalizeAssetPath(img)));
					const needed = imageCount - finalImages.length;
					if (remaining.length >= needed) {
						const additional = getUniqueRandomImages(remaining, needed);
						finalImages = [...finalImages, ...additional];
					}
				}
				let finalImageIndex = 0;
				
				// Track images used during animation to prevent duplicates
				const usedDuringAnimation = new Set();
				let step = 0;
				const spin = () => {
					getImages().forEach((img, index) => {
						// During animation, use random images (ensuring no duplicates)
						// On final step, use the pre-selected unique images
						if (step < cadence.length - 1) {
							// Get available images excluding those already used in this animation cycle
							const availablePool = illegalShufflePool.filter(imgPath => {
								const normalized = normalizeAssetPath(imgPath);
								return !usedDuringAnimation.has(normalized);
							});
							// If we've used all images, reset the set
							if (availablePool.length === 0) {
								usedDuringAnimation.clear();
								// Re-filter with empty set
								const allAvailable = illegalShufflePool.map(img => normalizeAssetPath(img));
								const src = allAvailable[Math.floor(Math.random() * allAvailable.length)];
								usedDuringAnimation.add(src);
								img.src = src;
								img.alt = getCharacterAltFromSrc(src);
							} else {
								const src = normalizeAssetPath(availablePool[Math.floor(Math.random() * availablePool.length)]);
								usedDuringAnimation.add(src);
								img.src = src;
								img.alt = getCharacterAltFromSrc(src);
							}
							// Retry with different image if current one fails
							img.onerror = () => {
								const retryPool = illegalShufflePool.filter(imgPath => {
									const normalized = normalizeAssetPath(imgPath);
									return !usedDuringAnimation.has(normalized);
								});
								if (retryPool.length > 0) {
									const retrySrc = normalizeAssetPath(retryPool[Math.floor(Math.random() * retryPool.length)]);
									usedDuringAnimation.add(retrySrc);
									img.src = retrySrc;
								}
							};
						} else {
							// Final step: use unique images from pre-selected set (one per image, no duplicates)
							// Track which images we've already assigned in this final step
							if (!spin._usedFinalImages) {
								spin._usedFinalImages = new Set();
							}
							// Use images by index to ensure no duplicates - each image gets a unique one
							// Ensure we have exactly 8 images
							if (index < 8) {
								let src = null;
								// First try: use the pre-selected image at this index
								if (index < finalImages.length) {
									const candidate = normalizeAssetPath(finalImages[index]);
									if (!spin._usedFinalImages.has(candidate)) {
										src = candidate;
										spin._usedFinalImages.add(src);
									}
								}
								// If that was already used, find next available from finalImages
								if (!src) {
									for (let i = 0; i < finalImages.length; i++) {
										const candidate = normalizeAssetPath(finalImages[i]);
										if (!spin._usedFinalImages.has(candidate)) {
											src = candidate;
											spin._usedFinalImages.add(src);
											break;
										}
									}
								}
								// Last resort: find any unused from pool
								if (!src) {
									const remainingPool = illegalShufflePool.filter(imgPath => {
										const normalized = normalizeAssetPath(imgPath);
										return !spin._usedFinalImages.has(normalized);
									});
									if (remainingPool.length > 0) {
										src = normalizeAssetPath(remainingPool[Math.floor(Math.random() * remainingPool.length)]);
										spin._usedFinalImages.add(src);
									}
								}
								
								if (src) {
									const alt = getCharacterAltFromSrc(src);
									img.src = src;
									img.alt = alt;
									img.style.display = '';
									// Retry with different image if current one fails
									img.onerror = () => {
										spin._usedFinalImages.delete(src);
										// Find an unused image from final set
										const remainingFinalImages = finalImages.filter(finalImg => {
											const normalized = normalizeAssetPath(finalImg);
											return !spin._usedFinalImages.has(normalized);
										});
										if (remainingFinalImages.length > 0) {
											const retrySrc = normalizeAssetPath(remainingFinalImages[0]);
											spin._usedFinalImages.add(retrySrc);
											img.src = retrySrc;
											img.alt = getCharacterAltFromSrc(retrySrc);
										} else {
											// Last resort: find any unused from pool
											const remainingPool = illegalShufflePool.filter(imgPath => {
												const normalized = normalizeAssetPath(imgPath);
												return !spin._usedFinalImages.has(normalized);
											});
											if (remainingPool.length > 0) {
												const retrySrc = normalizeAssetPath(remainingPool[Math.floor(Math.random() * remainingPool.length)]);
												spin._usedFinalImages.add(retrySrc);
												img.src = retrySrc;
												img.alt = getCharacterAltFromSrc(retrySrc);
											}
										}
									};
								}
							}
						}
					});
					// Clear used images after each animation step (except final)
					if (step < cadence.length - 1) {
						usedDuringAnimation.clear();
					} else if (step === cadence.length - 1) {
						// Clear final images tracking after final step completes
						if (spin._usedFinalImages) {
							spin._usedFinalImages.clear();
						}
					}
					step++;
					if (step < cadence.length) {
						setTimeout(spin, cadence[step]);
					} else {
						const cells = getCells();
						if (cells.length) {
							cells[Math.floor(Math.random() * cells.length)].classList.add(highlightClass);
						}
						shuffleBtn.classList.remove('is-rolling');
						shuffleBtn.disabled = false;
						shuffleActive = false;
					}
				};
				setTimeout(spin, cadence[0]);
			});
		}
	} else if (isPlaceholder && category === 'legal' && !item?.isHint) {
		const maxLevels = 3; // initial grid + two deeper splits (64 max panels)
		// Combine both crime and random character images for legal section
		// Legal shuffle: use random_characters + company_characters + crime_characters + crime_shuffle
		const legalCharacterPool = [...RANDOM_CHARACTER_IMAGES, ...COMPANY_CHARACTER_IMAGES, ...CRIME_CHARACTER_IMAGES_ARRAY, ...CRIME_SHUFFLE_IMAGES];
		const getRandomCharacterImage = () => {
			const img = legalCharacterPool[Math.floor(Math.random() * legalCharacterPool.length)];
			return normalizeAssetPath(img);
		};
		const getRandomCharacterAlt = (src) => getCharacterAltFromSrc(src);

		// Track used images across all panels in this card to prevent duplicates
		const usedPanelImages = new Set();

		const wireGridHover = () => {};
		const wireCardPointerHiding = () => {};

		const clearSplitSelection = () => {
			card.querySelectorAll('.split-panel--selected').forEach((el) => el.classList.remove('split-panel--selected'));
		};

		const ensureShuffleButton = () => {
			let btn = card.querySelector('.split-shuffle');
			if (btn) return btn;

			btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'split-shuffle';
			btn.innerHTML = '<span class="split-shuffle__icon">✦</span><span class="split-shuffle__text">Shuffle</span>';
			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				clearSplitSelection();
				const imgs = Array.from(card.querySelectorAll('.split-panel__image'));
				if (imgs.length === 0) return;
				btn.disabled = true;
				btn.classList.add('is-rolling');
				const cadence = [60, 80, 100, 120, 140, 160, 200, 240, 280, 340, 420, 520];
				// Get unique images for final result
				const allImgs = Array.from(card.querySelectorAll('.split-panel__image'));
				const finalImages = getUniqueRandomImages(legalCharacterPool, allImgs.length);
				let finalImageIndex = 0;
				// Track images used during animation to prevent duplicates
				const usedDuringAnimation = new Set();
				let step = 0;
				const spin = () => {
					const currentImgs = Array.from(card.querySelectorAll('.split-panel__image'));
					if (step < cadence.length - 1) {
						// During animation: ensure no duplicates within this step
						currentImgs.forEach((img) => {
							const availablePool = legalCharacterPool.filter(imgPath => {
								const normalized = normalizeAssetPath(imgPath);
								return !usedDuringAnimation.has(normalized);
							});
							// If we've used all images, reset the set
							if (availablePool.length === 0) {
								usedDuringAnimation.clear();
								const allAvailable = legalCharacterPool.map(img => normalizeAssetPath(img));
								const src = allAvailable[Math.floor(Math.random() * allAvailable.length)];
								usedDuringAnimation.add(src);
								img.src = src;
								img.alt = getRandomCharacterAlt(src);
							} else {
								const src = normalizeAssetPath(availablePool[Math.floor(Math.random() * availablePool.length)]);
								usedDuringAnimation.add(src);
								img.src = src;
								img.alt = getRandomCharacterAlt(src);
							}
						});
						// Clear used images after each animation step
						usedDuringAnimation.clear();
					} else {
						// Final step: use unique images from pre-selected set (already unique via getUniqueRandomImages)
						// Track used images to ensure no duplicates even in final step
						const usedFinalImages = new Set();
						currentImgs.forEach((img, index) => {
							// Use one image per panel, ensuring no duplicates
							let src;
							if (index < finalImages.length) {
								src = normalizeAssetPath(finalImages[index]);
								// Double-check it's not already used (shouldn't happen, but safety check)
								if (usedFinalImages.has(src)) {
									// Find an unused image from the pool
									const remainingPool = legalCharacterPool.filter(imgPath => {
										const normalized = normalizeAssetPath(imgPath);
										return !usedFinalImages.has(normalized);
									});
									if (remainingPool.length > 0) {
										src = normalizeAssetPath(remainingPool[Math.floor(Math.random() * remainingPool.length)]);
									} else {
										// Last resort: use any image
										src = normalizeAssetPath(legalCharacterPool[Math.floor(Math.random() * legalCharacterPool.length)]);
									}
								}
								usedFinalImages.add(src);
							} else {
								// If we have more panels than finalImages, get from remaining pool
								const remainingPool = legalCharacterPool.filter(imgPath => {
									const normalized = normalizeAssetPath(imgPath);
									return !usedFinalImages.has(normalized);
								});
								if (remainingPool.length > 0) {
									src = normalizeAssetPath(remainingPool[Math.floor(Math.random() * remainingPool.length)]);
									usedFinalImages.add(src);
								} else {
									// Last resort: use any image
									src = normalizeAssetPath(legalCharacterPool[Math.floor(Math.random() * legalCharacterPool.length)]);
									usedFinalImages.add(src);
								}
							}
							if (src) {
								img.src = src;
								img.alt = getRandomCharacterAlt(src);
								// Retry with different image if current one fails to load
								img.onerror = () => {
									const retryPool = legalCharacterPool.filter(imgPath => {
										const normalized = normalizeAssetPath(imgPath);
										return !usedFinalImages.has(normalized);
									});
									if (retryPool.length > 0) {
										const retrySrc = normalizeAssetPath(retryPool[Math.floor(Math.random() * retryPool.length)]);
										usedFinalImages.add(retrySrc);
										img.src = retrySrc;
									}
								};
							}
						});
					}
					step++;
					if (step < cadence.length) {
						setTimeout(spin, cadence[step]);
					} else {
						const allPanels = Array.from(card.querySelectorAll('.split-panel'));
						allPanels.forEach((panel) => panel.classList.remove('split-panel--selected'));
						if (allPanels.length > 0) {
							const target = allPanels[Math.floor(Math.random() * allPanels.length)];
							target.classList.add('split-panel--selected');
						}
						btn.classList.remove('is-rolling');
						btn.disabled = false;
					}
				};
				setTimeout(spin, cadence[0]);
			});
			card.appendChild(btn);
			return btn;
		};

		function buildPanelsForLevel(container, level) {
			for (let i = 0; i < 4; i++) {
				const panel = document.createElement('div');
				panel.className = `split-panel split-panel--${i}`;
				// Get unique image that hasn't been used yet in this card
				const availablePool = legalCharacterPool.filter(imgPath => {
					const normalized = normalizeAssetPath(imgPath);
					return !usedPanelImages.has(normalized);
				});
				// If all images are used, reset and start over (shouldn't happen with large pool)
				let characterSrc;
				if (availablePool.length === 0) {
					usedPanelImages.clear();
					const allAvailable = legalCharacterPool.map(img => normalizeAssetPath(img));
					characterSrc = allAvailable[Math.floor(Math.random() * allAvailable.length)];
					usedPanelImages.add(characterSrc);
				} else {
					characterSrc = normalizeAssetPath(availablePool[Math.floor(Math.random() * availablePool.length)]);
					usedPanelImages.add(characterSrc);
				}
				const characterAlt = getRandomCharacterAlt(characterSrc);
				panel.innerHTML = `
					<span class="split-panel__backdrop"></span>
					<img class="split-panel__image" src="${characterSrc}" alt="${characterAlt}" loading="lazy">
				`;
				// Add error handler to retry with different image if load fails
				const imgEl = panel.querySelector('.split-panel__image');
				if (imgEl) {
					imgEl.onerror = () => {
						// Find an unused image from the pool
						const retryPool = legalCharacterPool.filter(imgPath => {
							const normalized = normalizeAssetPath(imgPath);
							return !usedPanelImages.has(normalized);
						});
						if (retryPool.length > 0) {
							const retrySrc = normalizeAssetPath(retryPool[Math.floor(Math.random() * retryPool.length)]);
							usedPanelImages.add(retrySrc);
							imgEl.src = retrySrc;
							imgEl.alt = getRandomCharacterAlt(retrySrc);
						}
					};
				}
				panel.addEventListener('click', (event) => {
					event.stopPropagation();
					if (level < maxLevels) {
						splitPanel(panel, level + 1);
					}
				});
				container.appendChild(panel);
			}
		}

		function splitPanel(panel, level) {
			if (level > maxLevels) return;
			panel.classList.add('split-panel--splitting');
			setTimeout(() => {
				const subGrid = document.createElement('div');
				subGrid.className = `split-grid split-grid--level-${level}`;
				buildPanelsForLevel(subGrid, level);
				clearSplitSelection();
				panel.innerHTML = '';
				panel.appendChild(subGrid);
				wireGridHover(subGrid);
				wireCardPointerHiding();
				ensureShuffleButton();
			}, 200);
		}

		function splitCard() {
			if (card.querySelector('.split-grid')) return;
			const grid = document.createElement('div');
			grid.className = 'split-grid split-grid--level-1';
			buildPanelsForLevel(grid, 1);
			clearSplitSelection();
			card.innerHTML = '';
			card.appendChild(grid);
			wireGridHover(grid);
			wireCardPointerHiding();
			ensureShuffleButton();
			card.removeEventListener('click', splitCard);
		}

		card.addEventListener('click', splitCard);
	} else if (!isPlaceholder) {
		// Handle regelwerk card flips (whitelist cards are non-interactive)
		if (category === 'regelwerk') {
			if (item?.showTextLabel && !item?.isEinleitung) {
				// NoGo cards - flip on click
				card.style.cursor = 'pointer';
				card.addEventListener('click', (e) => {
					if (Date.now() < (state.heroRailDragging.blockClickUntil || 0)) return;
					card.classList.toggle('hero-card--flipped');
				});
			} else {
				// Other regelwerk cards are non-interactive
				card.style.cursor = 'default';
			}
		} else if (category === 'whitelist') {
			// Whitelist cards are non-interactive (no flip, no detail)
			card.style.cursor = 'default';
		} else {
			const activate = () => {
				if (Date.now() < (state.heroRailDragging.blockClickUntil || 0)) return;
				openDetail(category, index);
			};
			card.addEventListener('click', activate);
			card.addEventListener('keydown', (event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					activate();
				}
			});
		}
	}

	return card;
}

// ==================== HERO RAIL CONTROLS ====================

function getHeroRail() {
	return document.getElementById('heroCardStack');
}

function getHeroRailCards() {
    const stack = getHeroRail();
    if (!stack) return [];
    return Array.from(stack.querySelectorAll(`.hero-card[data-category="${state.currentCategory}"]`));
}

const heroRailScrollState = {
	ticking: false,
	targetIndex: null,
	wheelLocked: false,
	startLock: false
};

function clampHeroIndex(index) {
	const dataset = getDataset(state.currentCategory);
	if (!dataset || dataset.length === 0) return 0;
	return Math.max(0, Math.min(dataset.length - 1, index));
}

function focusHeroRailIndex(index, { smooth = true, pulse = false, align = 'center' } = {}) {
	const stack = getHeroRail();
	const cards = getHeroRailCards();
	if (!stack || cards.length === 0) return;

	const clamped = clampHeroIndex(index);
	const card = cards[clamped];
	if (!card) return;

	state.currentIndex = clamped;
	highlightHeroCard(clamped);

	heroRailScrollState.targetIndex = smooth ? clamped : null;
	heroRailScrollState.startLock = align === 'start';

	let targetLeft;
	if (align === 'start') {
		// If index is 0, always scroll to 0, otherwise use card position
		if (clamped === 0) {
			targetLeft = 0;
		} else {
			targetLeft = Math.max(0, card.offsetLeft);
		}
	} else {
		targetLeft = Math.max(0, card.offsetLeft - (stack.clientWidth - card.clientWidth) / 2);
	}
	const supportsSmoothScroll = typeof stack.scrollTo === 'function';
	const behavior = smooth && supportsSmoothScroll ? 'smooth' : 'auto';

	try {
		if (supportsSmoothScroll) {
			stack.scrollTo({ left: targetLeft, behavior });
		} else {
			stack.scrollLeft = targetLeft;
		}
	} catch {
		stack.scrollLeft = targetLeft;
	}

	if (pulse) {
		card.classList.add('hero-card--pulse');
		setTimeout(() => card.classList.remove('hero-card--pulse'), 700);
	}
}

function syncHeroRailIndexFromScroll({ force = false } = {}) {
	const stack = getHeroRail();
	const cards = getHeroRailCards();
	if (!stack || cards.length === 0) return;
	if (heroRailScrollState.startLock && stack.scrollLeft <= 2) {
		if (force) heroRailScrollState.startLock = false;
		return;
	}
	const stackRect = stack.getBoundingClientRect();
	const stackCenter = stackRect.left + stackRect.width / 2;
	let best = state.currentIndex;
	let bestDist = Number.POSITIVE_INFINITY;
	cards.forEach((card, idx) => {
		const rect = card.getBoundingClientRect();
		const center = rect.left + rect.width / 2;
		const dist = Math.abs(center - stackCenter);
		if (dist < bestDist) {
			bestDist = dist;
			best = idx;
		}
	});
	if (!force && heroRailScrollState.targetIndex !== null) {
		if (best === heroRailScrollState.targetIndex) {
			heroRailScrollState.targetIndex = null;
		} else {
			return;
		}
	}
	if (force || best !== state.currentIndex) {
		state.currentIndex = best;
		highlightHeroCard(best);
	}
}

function scheduleHeroRailSync(force = false) {
	if (force) {
		heroRailScrollState.ticking = false;
		syncHeroRailIndexFromScroll({ force: true });
		return;
	}
	if (heroRailScrollState.ticking) return;
	heroRailScrollState.ticking = true;
	requestAnimationFrame(() => {
		heroRailScrollState.ticking = false;
		syncHeroRailIndexFromScroll();
	});
}

function navigateHeroRail(direction = 1) {
	const dataset = getDataset(state.currentCategory);
	if (!dataset || dataset.length === 0) return;
	const next = clampHeroIndex(state.currentIndex + (direction || 1));
	focusHeroRailIndex(next, { smooth: true });
	resetHeroRailIdle();
}

function setupHeroRailControls() {
	const stack = getHeroRail();
	if (!stack || !state.heroCardsMounted) return;
	if (stack.dataset.controlsInit === '1') {
		resetHeroRailIdle();
		scheduleHeroRailSync(true);
		return;
	}
	stack.dataset.controlsInit = '1';

    initHeroRailButtons();
    initHeroRailRandom();

	const onWheel = (event) => {
		if (isDetailOpen()) return;
		if (heroRailScrollState.wheelLocked) {
			event.preventDefault();
			return;
		}
		const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
		if (delta === 0) return;
		event.preventDefault();
		navigateHeroRail(delta > 0 ? 1 : -1);
		heroRailScrollState.wheelLocked = true;
		setTimeout(() => {
			heroRailScrollState.wheelLocked = false;
		}, 260);
	};
	stack.addEventListener('wheel', onWheel, { passive: false });

	stack.addEventListener('scroll', () => scheduleHeroRailSync(), { passive: true });

	const app = document.getElementById('appRoot');
	const onAppWheel = (event) => {
		if (isDetailOpen()) return;
		if (stack.contains(event.target)) return;
		if (heroRailScrollState.wheelLocked) {
			event.preventDefault();
			return;
		}
		const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
		if (delta === 0) return;
		event.preventDefault();
		navigateHeroRail(delta > 0 ? 1 : -1);
		heroRailScrollState.wheelLocked = true;
		setTimeout(() => {
			heroRailScrollState.wheelLocked = false;
		}, 260);
	};
	app?.addEventListener('wheel', onAppWheel, { passive: false });

	const prev = document.getElementById('heroRailPrev');
	const next = document.getElementById('heroRailNext');
	prev?.addEventListener('click', () => navigateHeroRail(-1));
	next?.addEventListener('click', () => navigateHeroRail(1));

	const reset = () => resetHeroRailIdle();
	['pointerdown', 'keydown', 'touchstart'].forEach((ev) => {
		stack.addEventListener(ev, reset, { passive: true });
	});

	resetHeroRailIdle();
	scheduleHeroRailSync(true);
}

function initHeroRailButtons() {
    if (state.heroControlsInit) return;
    const bottomPrev = document.getElementById('heroRailBottomPrev');
    const bottomNext = document.getElementById('heroRailBottomNext');
	bottomPrev?.addEventListener('click', () => navigateHeroRail(-1));
	bottomNext?.addEventListener('click', () => navigateHeroRail(1));
    state.heroControlsInit = true;
}

function initHeroRailDrag(stack) {
    const dragState = state.heroRailDragging;

    const onPointerDown = (event) => {
        if (event.button === 1 || event.button === 2) return;
        if (event.pointerType && event.pointerType !== 'mouse') return; // use native touch scroll
        const rect = stack.getBoundingClientRect();
        dragState.active = true;
        dragState.startX = event.clientX - rect.left;
        dragState.scrollLeft = stack.scrollLeft;
        dragState.moved = false;
        resetHeroRailIdle();
    };

    const onPointerMove = (event) => {
        if (!dragState.active) return;
        const rect = stack.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const delta = (x - dragState.startX);
        if (!dragState.moved && Math.abs(delta) > 4) {
            dragState.moved = true;
            stack.classList.add('is-dragging');
            if (event.pointerId !== undefined) stack.setPointerCapture(event.pointerId);
        }
        if (dragState.moved) {
            stack.scrollLeft = dragState.scrollLeft - delta;
            event.preventDefault();
        }
    };

    const endDrag = (event) => {
        if (!dragState.active) return;
        dragState.active = false;
        stack.classList.remove('is-dragging');
        if (event?.pointerId !== undefined) {
            try { stack.releasePointerCapture(event.pointerId); } catch {}
        }
        if (dragState.moved) {
            dragState.blockClickUntil = Date.now() + 300;
			scheduleHeroRailSync(true);
        }
        dragState.moved = false;
    };

	stack.addEventListener('pointerdown', onPointerDown);
	stack.addEventListener('pointermove', onPointerMove);
	stack.addEventListener('pointerup', endDrag);
	stack.addEventListener('pointercancel', endDrag);
	stack.addEventListener('pointerleave', endDrag);
}

function getHeroCardByIndex(index) {
	const cards = getHeroRailCards();
	return cards[index] || null;
}

function tagHeroCard(index, className, duration = 420) {
	const card = getHeroCardByIndex(index);
	if (!card) return;
	card.classList.add(className);
	if (duration > 0) {
		const timeout = setTimeout(() => card.classList.remove(className), duration);
		state.heroRandomSpinTimeouts.push(timeout);
	}
}

function easeOutCubic(t) {
	const clamped = clamp(t, 0, 1);
	return 1 - Math.pow(1 - clamped, 3);
}

function getHeroRandomDelay(step, totalSteps) {
	if (totalSteps <= 1) return 480;
	const progress = step / (totalSteps - 1);
	const eased = easeOutCubic(progress);
	return Math.round(lerp(64, 620, eased));
}

function clearHeroRandomSpin({ keepRolling = false, keepCooldown = false } = {}) {
	if (state.heroRandomSpinTimeouts.length) {
		state.heroRandomSpinTimeouts.forEach((timeout) => clearTimeout(timeout));
		state.heroRandomSpinTimeouts = [];
	}
	document
		.querySelectorAll('.hero-card--roulette, .hero-card--random-lock')
		.forEach((card) => card.classList.remove('hero-card--roulette', 'hero-card--random-lock'));
	if (!keepRolling) {
		const randomButton = document.getElementById('heroRailRandom');
		randomButton?.classList.remove('is-rolling');
	}
	if (!keepCooldown) {
		state.heroRandomCooldown = false;
	}
	document.body.classList.remove('is-random-rolling', 'is-random-lock', 'is-random-reveal');
}

function buildHeroRandomSequence({ startIndex, targetIndex, total }) {
	if (total <= 1) return [targetIndex];
	const sequence = [];
	let current = clampHeroIndex(startIndex);
	let direction = Math.random() > 0.5 ? 1 : -1;
	const maxSteps = Math.min(HERO_RANDOM_MAX_STEPS, total * 2 + 4);

	for (let step = 0; step < maxSteps; step += 1) {
		if ((direction > 0 && current >= total - 1) || (direction < 0 && current <= 0)) {
			direction *= -1;
		}

		if (step > maxSteps * 0.55) {
			direction = targetIndex >= current ? 1 : -1;
		} else if (Math.random() < 0.25) {
			direction *= -1;
		}

		current = clampHeroIndex(current + direction);
		sequence.push(current);
	}

	if (sequence.length === 0 || sequence[sequence.length - 1] !== targetIndex) {
		sequence.push(targetIndex);
	}
	return sequence;
}

function initHeroRailRandom() {
	const randomBtn = document.getElementById('heroRailRandom');
	if (!randomBtn) return;

		const activateRandom = () => {
		if (state.heroRandomCooldown) return;
		const dataset = getDataset(state.currentCategory);
		if (!dataset || dataset.length === 0) return;

		state.heroRandomCooldown = true;
		randomBtn.classList.add('is-rolling');
		clearHeroRandomSpin({ keepRolling: true, keepCooldown: true });
		document.body.classList.add('is-random-rolling');
		resetHeroRailIdle();

		// Special handling for regelwerk - flip through nogo cards 1-12
		if (state.currentCategory === 'regelwerk') {
			// Find nogo cards (items with showTextLabel and nogoNumber)
			const nogoCards = dataset
				.map((item, idx) => ({ item, index: idx }))
				.filter(({ item }) => item?.showTextLabel && !item?.isEinleitung && item?.nogoNumber)
				.sort((a, b) => (a.item.nogoNumber || 0) - (b.item.nogoNumber || 0))
				.slice(0, 12); // Only first 12 nogo cards
			
			if (nogoCards.length === 0) {
				randomBtn.classList.remove('is-rolling');
				state.heroRandomCooldown = false;
				document.body.classList.remove('is-random-rolling');
				return;
			}

			// Randomly select one of the nogo cards
			const selected = nogoCards[Math.floor(Math.random() * nogoCards.length)];
			const targetIndex = selected.index;
			const currentIndex = clampHeroIndex(state.currentIndex);
			
			const sequence = buildHeroRandomSequence({
				startIndex: currentIndex,
				targetIndex,
				total: dataset.length
			});

			const totalSteps = sequence.length;
			let accumulated = 0;
			sequence.forEach((index, step) => {
				const isFinal = step === totalSteps - 1;
				const delay = getHeroRandomDelay(step, totalSteps);
				accumulated += delay;
				const timeout = setTimeout(() => {
					const pulse = isFinal || step > totalSteps - 3;
					jumpHeroRailToIndex(index, { smooth: step !== 0, pulse, align: 'center' });
					if (isFinal) {
						tagHeroCard(targetIndex, 'hero-card--random-lock', 1120);
						document.body.classList.add('is-random-lock');
						const revealTimeout = setTimeout(() => {
							document.body.classList.remove('is-random-rolling');
							document.body.classList.add('is-random-reveal');
							highlightHeroCard(targetIndex);
							setTimeout(() => document.body.classList.remove('is-random-reveal'), 900);
							
							// Flip the card to show front (remove flipped class)
							setTimeout(() => {
								const card = getHeroCardByIndex(targetIndex);
								if (card) {
									card.classList.remove('hero-card--flipped');
								}
							}, 500);
						}, Math.min(460, delay + 160));
						state.heroRandomSpinTimeouts.push(revealTimeout);
					} else {
						tagHeroCard(index, 'hero-card--roulette', delay + 180);
					}
				}, accumulated);
				state.heroRandomSpinTimeouts.push(timeout);
			});

			const cooldownTimeout = setTimeout(() => {
				randomBtn.classList.remove('is-rolling');
				state.heroRandomCooldown = false;
				document.body.classList.remove('is-random-rolling', 'is-random-lock');
				state.heroRandomSpinTimeouts = [];
			}, accumulated + 900);
			state.heroRandomSpinTimeouts.push(cooldownTimeout);
			return;
		}

		// Original behavior for other categories
		const currentIndex = clampHeroIndex(state.currentIndex);
		let targetIndex = Math.floor(Math.random() * dataset.length);
		if (dataset.length > 1 && targetIndex === currentIndex) {
			targetIndex = (targetIndex + 1) % dataset.length;
		}
		const sequence = buildHeroRandomSequence({
			startIndex: currentIndex,
			targetIndex,
			total: dataset.length
		});

		const totalSteps = sequence.length;
		let accumulated = 0;
		sequence.forEach((index, step) => {
			const isFinal = step === totalSteps - 1;
			const delay = getHeroRandomDelay(step, totalSteps);
			accumulated += delay;
			const timeout = setTimeout(() => {
				const pulse = isFinal || step > totalSteps - 3;
				jumpHeroRailToIndex(index, { smooth: step !== 0, pulse, align: 'center' });
				if (isFinal) {
					const finalIndex = targetIndex; // Use the targetIndex variable
					tagHeroCard(finalIndex, 'hero-card--random-lock', 1120);
					document.body.classList.add('is-random-lock');
					const revealTimeout = setTimeout(() => {
						document.body.classList.remove('is-random-rolling');
						document.body.classList.add('is-random-reveal');
						highlightHeroCard(finalIndex);
						setTimeout(() => document.body.classList.remove('is-random-reveal'), 900);
						
						// Open the detail page after reveal animation
						setTimeout(() => {
							const finalDataset = getDataset(state.currentCategory);
							if (finalDataset && finalDataset.length > 0 && finalIndex < finalDataset.length) {
								const selectedItem = finalDataset[finalIndex];
								// Only open if it's not a placeholder
								if (!selectedItem.placeholder) {
									openDetail(state.currentCategory, finalIndex);
								}
							}
						}, 1000); // Delay to let reveal animation complete
					}, Math.min(460, delay + 160));
					state.heroRandomSpinTimeouts.push(revealTimeout);
				} else {
					tagHeroCard(index, 'hero-card--roulette', delay + 180);
				}
			}, accumulated);
			state.heroRandomSpinTimeouts.push(timeout);
		});

		const cooldownTimeout = setTimeout(() => {
			randomBtn.classList.remove('is-rolling');
			state.heroRandomCooldown = false;
			document.body.classList.remove('is-random-rolling', 'is-random-lock');
			state.heroRandomSpinTimeouts = [];
		}, accumulated + 900);
		state.heroRandomSpinTimeouts.push(cooldownTimeout);
	};

	randomBtn.addEventListener('click', activateRandom);
}

function stopHeroRailAuto() {
	if (state.railAutoTimer) {
		clearInterval(state.railAutoTimer);
		state.railAutoTimer = null;
	}
}

function resetHeroRailIdle() {
	if (state.railIdleTimer) {
		clearTimeout(state.railIdleTimer);
		state.railIdleTimer = null;
	}
	stopHeroRailAuto();
}

function jumpHeroRailToIndex(index, options = {}) {
	const { smooth = false, ...rest } = options;
	focusHeroRailIndex(index, { ...rest, smooth });
}

function spawnFloatingLogos(category = state.currentCategory) {
	const container = document.getElementById('heroDynamicBg');
	if (!container) return;
	container.innerHTML = '';
	if (Array.isArray(spawnFloatingLogos._highlightTimers)) {
		spawnFloatingLogos._highlightTimers.forEach((id) => clearTimeout(id));
	}
	spawnFloatingLogos._highlightTimers = [];
	const stripeConfigs = [
		{
			modifier: 'bg-polaroid-stripe--left',
			count: 12,
			rotate: '-22deg',
			top: '-18%',
			left: '18%',
			zIndex: 1,
			duration: '118s',
			delay: '0s',
			curve: -0.6
		},
		{
			modifier: 'bg-polaroid-stripe--center',
			count: 14,
			rotate: '-18deg',
			duration: '112s',
			delay: '-24s',
			top: '-20%',
			left: '34%',
			zIndex: 2,
			curve: 0
		},
		{
			modifier: 'bg-polaroid-stripe--right',
			count: 13,
			rotate: '-21deg',
			duration: '126s',
			delay: '-32s',
			top: '-12%',
			left: '50%',
			zIndex: 1,
			curve: 1.8
		}
	];

	const shuffleArray = (array) => {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array;
	};

	// Polaroids: use ALL images from company_characters, crime_characters, crime_shuffle, and random_characters
	const imagePool = [...RANDOM_CHARACTER_IMAGES, ...COMPANY_CHARACTER_IMAGES, ...CRIME_CHARACTER_IMAGES_ARRAY, ...CRIME_SHUFFLE_IMAGES];
	const pool = shuffleArray(imagePool.slice());
	let cursor = 0;
	const pullNextImage = () => {
		if (cursor >= pool.length) {
			shuffleArray(pool);
			cursor = 0;
		}
		const src = normalizeAssetPath(pool[cursor++]);
		return { src, alt: getCharacterAltFromSrc(src) };
	};

	const createBackgroundPolaroid = (emphasis = false, curveOffset = 0) => {
		const figure = document.createElement('figure');
		figure.className = 'bg-polaroid';
		if (emphasis) {
			figure.classList.add('bg-polaroid--highlight');
		}
		figure.setAttribute('aria-hidden', 'true');
		const tilt = (Math.random() * 6 - 3).toFixed(2);
		const offset = curveOffset.toFixed(2);
		const scale = (0.95 + Math.random() * 0.08).toFixed(2);

		figure.style.setProperty('--bg-polaroid-tilt', `${tilt}deg`);
		figure.style.setProperty('--bg-polaroid-offset', `${offset}%`);
		figure.style.setProperty('--bg-polaroid-scale', scale);

		const img = document.createElement('img');
		img.className = 'bg-polaroid__image';
		let { src } = pullNextImage();
		img.alt = '';
		img.loading = 'lazy';
		img.decoding = 'async';
		img.setAttribute('aria-hidden', 'true');
		
		// Retry with a different image if current one fails to load (404 or other error)
		let retryCount = 0;
		const maxRetries = 3;
		img.onerror = () => {
			if (retryCount < maxRetries) {
				retryCount++;
				// Try a different image from the pool
				const nextImage = pullNextImage();
				img.src = nextImage.src;
			} else {
				// After max retries, hide the figure
				figure.style.display = 'none';
			}
		};
		
		img.src = src;

		figure.appendChild(img);
		return figure;
	};

	stripeConfigs.forEach((config, index) => {
		const stripe = document.createElement('div');
		stripe.className = `bg-polaroid-stripe ${config.modifier}`;
		if (typeof config.top === 'string') stripe.style.top = config.top;
		if (typeof config.left === 'string') stripe.style.left = config.left;
		stripe.style.setProperty('--bg-stripe-rotate', config.rotate);
		stripe.style.zIndex = String(config.zIndex || 0);

		const inner = document.createElement('div');
		inner.className = 'bg-polaroid-stripe__inner';
		inner.style.setProperty('--bg-line-duration', config.duration);
		inner.style.setProperty('--bg-line-delay', config.delay);

		const polaroids = [];
		for (let i = 0; i < config.count; i += 1) {
			const emphasis = index === 1 && (i % Math.ceil(config.count / 4) === 0);
			const midpoint = (config.count - 1) / 2;
			const curveOffset = config.curve ? (i - midpoint) * config.curve : 0;
			polaroids.push(createBackgroundPolaroid(emphasis, curveOffset));
		}

		polaroids.forEach((node) => inner.appendChild(node));
		polaroids.forEach((node) => inner.appendChild(node.cloneNode(true)));

		stripe.appendChild(inner);

		container.appendChild(stripe);

		const scheduleHighlight = (stripeEl) => {
			const delay = 4000 + Math.random() * 9000;
			const timer = setTimeout(() => {
				const cards = Array.from(stripeEl.querySelectorAll('.bg-polaroid'));
				if (cards.length === 0) {
					scheduleHighlight(stripeEl);
					return;
				}
				cards.forEach((card) => card.classList.remove('bg-polaroid--pulse'));
				const target = cards[Math.floor(Math.random() * cards.length)];
				target.classList.add('bg-polaroid--pulse');
				const removalTimer = setTimeout(() => {
					target.classList.remove('bg-polaroid--pulse');
				}, 5200);
				spawnFloatingLogos._highlightTimers.push(removalTimer);
				scheduleHighlight(stripeEl);
			}, delay);
			spawnFloatingLogos._highlightTimers.push(timer);
		};

		scheduleHighlight(stripe);
	});

	if (!spawnFloatingLogos._resizeBound) {
		window.addEventListener('resize', debounce(() => {
			// Only respawn if we're in a category that uses polaroids
			if (state.currentCategory === 'regelwerk' || state.currentCategory === 'whitelist' || state.currentCategory === 'legal' || state.currentCategory === 'illegal') {
				spawnFloatingLogos(state.currentCategory);
			}
		}, 500));
		spawnFloatingLogos._resizeBound = true;
	}
}

function handleCardTiltMove(e) {
    const cards = document.querySelectorAll('.hero-card, .detail-hero-card');
    cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const inBounds = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (!inBounds) return;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width; // -0.5..0.5
        const dy = (e.clientY - cy) / rect.height;
        const stack = card.closest('.hero-card-stack');
        const max = stack && stack.classList.contains('as-rail') ? 4 : 8;
        card.style.setProperty('--tiltY', `${(-dx * max).toFixed(2)}deg`);
        card.style.setProperty('--tiltX', `${(dy * max).toFixed(2)}deg`);
    });
}

function resetCardTilt(e) {
    const target = e?.target;
    if (target && target.classList && (target.classList.contains('hero-card') || target.classList.contains('detail-hero-card'))) {
        target.style.setProperty('--tiltX', '0deg');
        target.style.setProperty('--tiltY', '0deg');
        return;
    }
    document.querySelectorAll('.hero-card, .detail-hero-card').forEach((card) => {
        card.style.setProperty('--tiltX', '0deg');
        card.style.setProperty('--tiltY', '0deg');
    });
}

// Hold-to-open removed; function kept as a no-op to preserve references
function attachHoldHandler() {}

// ==================== DETAIL OVERLAY ====================

function openDetail(category, index) {
	const detailBg = document.getElementById('detailDynamicBg');
	if (detailBg) {
		// Spawn flying logos for legal and illegal categories, polaroids for regelwerk
		if (category === 'illegal') {
			// Clear any fog/damage effects first
			detailBg.querySelectorAll('.fog-container, .crime-damage-container').forEach(el => el.remove());
			spawnFogEffect(detailBg);
			spawnCrimeDamage(detailBg);
			// Also spawn crime logos
			spawnDetailFlyingLogos(detailBg, 'illegal');
		} else if (category === 'regelwerk' || category === 'whitelist') {
			// Clear any fog/damage effects first
			detailBg.querySelectorAll('.fog-container, .crime-damage-container, .detail-flying-logo').forEach(el => el.remove());
			// Use the same polaroid effect as legal
			spawnDetailPolaroids(detailBg);
		} else {
			// Legal category - flying logos
			// Clear any fog/damage effects first
			detailBg.querySelectorAll('.fog-container, .crime-damage-container').forEach(el => el.remove());
			spawnDetailFlyingLogos(detailBg);
		}
	}
	const config = CATEGORY_CONFIG[category];
	if (!config) return;

	const dataset = config.getDataset();
	if (!dataset || dataset.length === 0) return;

	const safeIndex = Math.max(0, Math.min(dataset.length - 1, index));
	const item = dataset[safeIndex];
	if (!item) return;
	
	// Don't open detail page for placeholder items
	if (item.placeholder) return;

	state.currentCategory = category;
	state.currentIndex = safeIndex;
	
	// Add class to crime-detail for illegal category and set data-category
	const detailEl = document.getElementById('detailOverlay') || document.querySelector('.crime-detail');
	if (detailEl) {
		detailEl.setAttribute('data-category', category);
		if (category === 'illegal') {
			detailEl.classList.add('is-illegal');
		} else {
			detailEl.classList.remove('is-illegal');
		}
	}

	renderDetail(item, category);
	updateDetailNav();
	showDetailOverlay();
	highlightHeroCard(safeIndex);
}

function renderDetail(item, category) {
	const config = CATEGORY_CONFIG[category];
	if (!config) return;

	const titleEl = document.getElementById('detailTitle');
	const taglineEl = document.getElementById('detailTagline');
	const contentEl = document.querySelector('#detailContent .content-text-body');
	const logoEl = document.getElementById('detailCompanyLogo');

	if (titleEl) titleEl.textContent = config.getTitle(item);
	if (taglineEl) {
		const tagline = config.getTagline(item);
		if (tagline) {
			taglineEl.textContent = tagline;
			taglineEl.style.display = 'block';
			// Scale tagline to fit on one line
			setTimeout(() => {
				scaleTaglineToFit(taglineEl);
			}, 100);
		} else {
			taglineEl.style.display = 'none';
		}
	}
	if (contentEl) contentEl.innerHTML = formatParagraphs(config.getContent(item));
	
	// Set company logo (hide for illegal category)
	if (logoEl) {
		if (category === 'illegal') {
			logoEl.style.display = 'none';
		} else {
			const logoSrc = getHeroCardLogo(item, category);
			if (logoSrc) {
				logoEl.src = logoSrc;
				logoEl.alt = config.getTitle(item) + ' Logo';
				logoEl.style.display = 'block';
			} else {
				logoEl.style.display = 'none';
			}
		}
	}
	
	// Set company/crime character image
	const characterEl = document.getElementById('detailCharacter');
	if (characterEl) {
		let characterSrc;
		if (category === 'legal') {
			// Legal detail: use company_characters
			characterSrc = normalizeAssetPath(`public/company_characters/${item.id}_character.png`);
		} else if (category === 'illegal') {
			// Illegal detail: use crime_characters
			characterSrc = normalizeAssetPath(`public/crime_characters/${item.id}_character.png`);
		} else {
			characterSrc = getHeroCardImage(item, category);
		}
		if (characterSrc) {
			characterEl.src = characterSrc;
			characterEl.alt = config.getTitle(item) + ' Character';
			characterEl.style.display = 'block';
		} else {
			characterEl.style.display = 'none';
		}
	}

	renderDetailMedia(item, category);

    const collageItems = config.buildCollage(item, category);
    renderDetailCollage(collageItems, item.id || config.getTitle(item), item, category);
    const heroImage = getHeroCardImage(item, category);
    const heroLogo = getHeroCardLogo(item, category);
    const title = CATEGORY_CONFIG[category].getTitle(item);
    const tagline = CATEGORY_CONFIG[category].getTagline(item);
    mountInlineHeroCard({ category, heroImage, heroLogo, title, tagline });
}

function mountInlineHeroCard({ category = state.currentCategory, heroImage = '', heroLogo = '', title = '', tagline = '' } = {}) {
    const left = document.querySelector('.crime-detail-left');
    if (!left) return;
    const media = document.getElementById('detailMedia');
    if (!media) return;
    let row = left.querySelector('.detail-media-row');
    if (!row) {
        row = document.createElement('div');
        row.className = 'detail-media-row';
        const parent = media.parentElement || left;
        if (parent) parent.insertBefore(row, media);
        row.appendChild(media);
    }
    const existing = row.querySelector('.detail-inline-hero');
    if (existing) existing.remove();
    const card = document.createElement('article');
    card.className = `detail-hero-card detail-hero-card--${category === 'illegal' ? 'illegal' : 'legal'} detail-inline-hero`;
    card.dataset.category = category;
    
    row.appendChild(card);
}

function renderDetailMedia(item, category) {
	const config = CATEGORY_CONFIG[category];
	const media = config?.getMedia?.(item);
	const container = document.getElementById('detailMedia');
	if (!container) return;

	destroyDetailVideoPlayer();
	container.innerHTML = '';
	if (!media) return;

	if (media.type === 'video' && media.youtubeId) {
		mountDetailVideoPlayer({
			youtubeId: media.youtubeId,
			title: config.getTitle(item),
			buyUrl: media.buyUrl || null,
			allVideos: media.allVideos || null,
			videoIndex: media.videoIndex || 0
		});
	} else if (media.type === 'image' && media.src) {
		const img = document.createElement('img');
		img.src = media.src;
		img.alt = media.alt || config.getTitle(item);
		img.loading = 'lazy';
		// Use contain for regelwerk and whitelist to show complete image, cover for others
		const objectFit = (category === 'regelwerk' || category === 'whitelist') ? 'contain' : 'cover';
		img.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:${objectFit};object-position:center;`;
		if (category === 'regelwerk') {
			img.classList.add('detail-media-image--regelwerk');
		} else if (category === 'whitelist') {
			img.classList.add('detail-media-image--whitelist');
		}
		container.appendChild(img);
	}
}

function queueYouTubePlayerInit(initialiser) {
	if (typeof initialiser !== 'function') return;
	const hasPlayer = typeof window !== 'undefined' && window.YT && typeof window.YT.Player === 'function';
	if (state.youtubeReady || hasPlayer) {
		state.youtubeReady = true;
		try {
			initialiser();
		} catch (error) {
			console.warn('⚠️ Failed to initialise YouTube player:', error);
		}
		return;
	}
	state.youtubeInitQueue.push(initialiser);
}

window.onYouTubeIframeAPIReady = function onYouTubeIframeAPIReady() {
	state.youtubeReady = true;
	const queue = Array.isArray(state.youtubeInitQueue) ? state.youtubeInitQueue.slice() : [];
	state.youtubeInitQueue = [];
	queue.forEach((fn) => {
		if (typeof fn === 'function') {
			try {
				fn();
			} catch (error) {
				console.warn('⚠️ Deferred YouTube player initialisation failed:', error);
			}
		}
	});
};

function destroyDetailVideoPlayer() {
	const current = state.detailVideo;
	if (!current) return;
	if (current.hideTimer) {
		clearTimeout(current.hideTimer);
		current.hideTimer = null;
	}
	if (current.player && typeof current.player.destroy === 'function') {
		try {
			current.player.destroy();
		} catch (error) {
			console.warn('⚠️ Failed to destroy YouTube player:', error);
		}
	}
	if (current.controls) {
		const { element, muteBtn, volumeSlider, onMute, onVolume } = current.controls;
		if (muteBtn && onMute) muteBtn.removeEventListener('click', onMute);
		if (volumeSlider && onVolume) volumeSlider.removeEventListener('input', onVolume);
		if (element && element.parentElement === current.wrapper) {
			element.parentElement.removeChild(element);
		}
	}
	if (current.playerHost && current.playerHost.parentElement === current.wrapper) {
		current.wrapper.removeChild(current.playerHost);
	}
	if (current.wrapper && current.handlers) {
		const { pointerEnter, pointerMove, pointerLeave, focusIn, focusOut, controlsEnter, controlsLeave } = current.handlers;
		if (pointerEnter) current.wrapper.removeEventListener('pointerenter', pointerEnter);
		if (pointerMove) current.wrapper.removeEventListener('pointermove', pointerMove);
		if (pointerLeave) current.wrapper.removeEventListener('pointerleave', pointerLeave);
		if (focusIn) current.wrapper.removeEventListener('focusin', focusIn);
		if (focusOut) current.wrapper.removeEventListener('focusout', focusOut);
		if (current.controls?.element) {
			if (controlsEnter) current.controls.element.removeEventListener('pointerenter', controlsEnter);
			if (controlsLeave) current.controls.element.removeEventListener('pointerleave', controlsLeave);
		}
	}
	state.detailVideo = null;
}

function mountDetailVideoPlayer({ youtubeId, title, buyUrl, allVideos = null, videoIndex = 0 }) {
	const container = document.getElementById('detailMedia');
	if (!container || !youtubeId) return;

	const host = document.createElement('div');
	host.className = 'detail-video-player__host';
	const hostId = `detailVideoPlayer_${youtubeId}_${Math.random().toString(36).slice(2, 9)}`;
	host.id = hostId;

	container.appendChild(host);
	const controls = buildDetailVideoControls(buyUrl, allVideos, videoIndex);
	container.appendChild(controls.element);

	// Get buyUrl from current video if multiple videos exist
	let currentBuyUrl = buyUrl;
	if (allVideos && allVideos.length > videoIndex && allVideos[videoIndex]) {
		currentBuyUrl = allVideos[videoIndex].buyUrl || buyUrl || null;
	}
	
	const detailVideoState = {
		player: null,
		playerHost: host,
		wrapper: container,
		currentVideoId: youtubeId,
		currentTitle: title || '',
		buyUrl: currentBuyUrl,
		allVideos: allVideos || null,
		currentVideoIndex: videoIndex,
		hideTimer: null,
		handlers: null,
		controls,
		lastVolume: 60,
		isMuted: true
	};

	state.detailVideo = detailVideoState;
	wireDetailVideoControls(detailVideoState);
	
	// Always wire video navigation (buttons will be disabled if only one video)
	if (controls.element._videoNav) {
		const { prevBtn, nextBtn } = controls.element._videoNav;
		
		prevBtn.addEventListener('click', () => {
			if (detailVideoState.allVideos && detailVideoState.allVideos.length > 1 && detailVideoState.currentVideoIndex > 0) {
				switchDetailVideo(detailVideoState, -1);
			}
		});
		
		nextBtn.addEventListener('click', () => {
			if (detailVideoState.allVideos && detailVideoState.allVideos.length > 1 && detailVideoState.currentVideoIndex < detailVideoState.allVideos.length - 1) {
				switchDetailVideo(detailVideoState, 1);
			}
		});
	}

	const initialisePlayer = () => {
		detailVideoState.player = new YT.Player(hostId, {
			videoId: youtubeId,
			playerVars: {
				autoplay: 1,
				controls: 0,
				rel: 0,
				modestbranding: 1,
				playsinline: 1,
				loop: 1,
				playlist: youtubeId,
				origin: window.location.origin
			},
			events: {
				onReady: (event) => handleDetailVideoReady(detailVideoState, event?.target),
				onStateChange: (event) => handleDetailVideoStateChange(detailVideoState, event)
			}
		});
	};

	queueYouTubePlayerInit(initialisePlayer);
}

function switchDetailVideo(detailVideoState, direction) {
	if (!detailVideoState.allVideos || detailVideoState.allVideos.length <= 1) {
		// Still update UI even if navigation is disabled
		return;
	}
	
	const newIndex = detailVideoState.currentVideoIndex + direction;
	if (newIndex < 0 || newIndex >= detailVideoState.allVideos.length) return;
	
	const newVideo = detailVideoState.allVideos[newIndex];
	if (!newVideo || !newVideo.youtubeId) return;
	
	// Update state
	detailVideoState.currentVideoIndex = newIndex;
	detailVideoState.currentVideoId = newVideo.youtubeId;
	detailVideoState.buyUrl = newVideo.buyUrl || null;
	
	// Update video player
	if (detailVideoState.player) {
		try {
			detailVideoState.player.loadVideoById(newVideo.youtubeId);
		} catch (error) {
			console.warn('Failed to switch video:', error);
		}
	}
	
	// Update UI
	const controls = detailVideoState.controls?.element;
	if (controls && controls._videoNav) {
		const { prevBtn, nextBtn, counter } = controls._videoNav;
		
		// Update counter
		if (counter) {
			counter.textContent = `${newIndex + 1} / ${detailVideoState.allVideos.length}`;
		}
		
		// Update button states
		const videoCount = detailVideoState.allVideos ? detailVideoState.allVideos.length : 1;
		prevBtn.disabled = videoCount <= 1 || newIndex === 0;
		nextBtn.disabled = videoCount <= 1 || newIndex === videoCount - 1;
	}
	
	// Update buy link
	const buyBtn = controls?.querySelector('.video-buy-link');
	if (buyBtn) {
		if (detailVideoState.buyUrl) {
			buyBtn.href = detailVideoState.buyUrl;
			buyBtn.style.display = '';
		} else {
			buyBtn.style.display = 'none';
		}
	}
	
	// Show controls briefly
	showDetailVideoControls(detailVideoState, { autoHide: true });
}

// Helper function to create SVG icons
function createSVGIcon(type) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('fill', 'none');
	svg.setAttribute('stroke', 'currentColor');
	svg.setAttribute('stroke-width', '2');
	svg.setAttribute('stroke-linecap', 'round');
	svg.setAttribute('stroke-linejoin', 'round');
	
	let path;
	switch(type) {
		case 'mute':
			path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path.setAttribute('d', 'M11 5L6 9H2v6h4l5 4V5z');
			svg.appendChild(path);
			const muteX1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			muteX1.setAttribute('x1', '23');
			muteX1.setAttribute('y1', '9');
			muteX1.setAttribute('x2', '17');
			muteX1.setAttribute('y2', '15');
			svg.appendChild(muteX1);
			const muteX2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			muteX2.setAttribute('x1', '17');
			muteX2.setAttribute('y1', '9');
			muteX2.setAttribute('x2', '23');
			muteX2.setAttribute('y2', '15');
			svg.appendChild(muteX2);
			break;
		case 'unmute':
			path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path.setAttribute('d', 'M11 5L6 9H2v6h4l5 4V5z');
			svg.appendChild(path);
			const unmutePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			unmutePath.setAttribute('d', 'M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07');
			svg.appendChild(unmutePath);
			break;
		case 'video':
			path = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			path.setAttribute('x', '2');
			path.setAttribute('y', '6');
			path.setAttribute('width', '18');
			path.setAttribute('height', '12');
			path.setAttribute('rx', '2');
			svg.appendChild(path);
			const videoPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			videoPath.setAttribute('d', 'm10 9 5 3-5 3V9z');
			svg.appendChild(videoPath);
			break;
	}
	
	return svg;
}

function buildDetailVideoControls(buyUrl = null, allVideos = null, videoIndex = 0) {
	const element = document.createElement('div');
	element.className = 'video-controls';
	element.id = 'detailVideoControls';
	element.setAttribute('role', 'group');
	element.setAttribute('aria-label', 'Videosteuerung');

	const muteBtn = document.createElement('button');
	muteBtn.type = 'button';
	muteBtn.className = 'control-btn control-btn--mute';
	muteBtn.setAttribute('aria-label', 'Ton stummschalten');
	const muteIcon = document.createElement('span');
	muteIcon.className = 'control-btn__icon';
	muteIcon.setAttribute('aria-hidden', 'true');
	muteIcon.appendChild(createSVGIcon('mute'));
	muteBtn.appendChild(muteIcon);

	const volumeWrapper = document.createElement('div');
	volumeWrapper.className = 'volume-control';

	const volumeSlider = document.createElement('input');
	volumeSlider.type = 'range';
	volumeSlider.className = 'volume-slider';
	volumeSlider.min = '0';
	volumeSlider.max = '100';
	volumeSlider.step = '5';
	volumeSlider.value = '0';
	volumeSlider.style.setProperty('--volume-percent', '0%');
	volumeSlider.setAttribute('aria-label', 'Lautstärke');

	volumeWrapper.append(volumeSlider);
	
	// Always add video counter and navigation (show 1/1 for single videos)
	const videoCount = (allVideos && Array.isArray(allVideos) && allVideos.length > 0) ? allVideos.length : 1;
	const currentIndex = Math.max(0, Math.min(videoIndex, videoCount - 1));
	
	// Previous video button
	const prevBtn = document.createElement('button');
	prevBtn.type = 'button';
	prevBtn.className = 'video-nav-btn video-nav-btn--prev';
	prevBtn.setAttribute('aria-label', 'Vorheriges Video');
	prevBtn.innerHTML = '<span aria-hidden="true">‹</span>';
	prevBtn.disabled = videoCount <= 1 || currentIndex === 0;
	
	// Video counter (always show, even for single videos)
	const videoCounter = document.createElement('div');
	videoCounter.className = 'video-counter';
	videoCounter.setAttribute('aria-label', 'Video-Anzahl');
	const counterIcon = document.createElement('span');
	counterIcon.className = 'video-counter__icon';
	counterIcon.appendChild(createSVGIcon('video'));
	const counterText = document.createElement('span');
	counterText.className = 'video-counter__text';
	counterText.textContent = `${currentIndex + 1} / ${videoCount}`;
	videoCounter.appendChild(counterIcon);
	videoCounter.appendChild(counterText);
	
	// Next video button
	const nextBtn = document.createElement('button');
	nextBtn.type = 'button';
	nextBtn.className = 'video-nav-btn video-nav-btn--next';
	nextBtn.setAttribute('aria-label', 'Nächstes Video');
	nextBtn.innerHTML = '<span aria-hidden="true">›</span>';
	nextBtn.disabled = videoCount <= 1 || currentIndex === videoCount - 1;
	
	// Store references for later updates
	element._videoNav = {
		prevBtn,
		nextBtn,
		counter: videoCounter.querySelector('.video-counter__text')
	};

	// Add buy link button if buyUrl exists (use current video's buyUrl)
	const currentBuyUrl = allVideos && allVideos.length > videoIndex && allVideos[videoIndex] 
		? (allVideos[videoIndex].buyUrl || buyUrl) 
		: buyUrl;
	
	let buyLinkWrapper = null;
	if (currentBuyUrl) {
		buyLinkWrapper = document.createElement('div');
		buyLinkWrapper.className = 'video-buy-link-wrapper';
		
		const buyBtn = document.createElement('a');
		buyBtn.href = currentBuyUrl;
		buyBtn.target = '_blank';
		buyBtn.rel = 'noopener noreferrer';
		buyBtn.className = 'video-buy-link';
		buyBtn.innerHTML = `
			<span class="video-buy-link__icon">❤️</span>
			<span class="video-buy-link__text">We love this Creator</span>
		`;
		
		buyLinkWrapper.appendChild(buyBtn);
	}
	
	// Append all elements in order: mute, volume, buy link (if exists), prev button, counter, next button
	const elementsToAppend = [muteBtn, volumeWrapper];
	if (buyLinkWrapper) elementsToAppend.push(buyLinkWrapper);
	elementsToAppend.push(prevBtn, videoCounter, nextBtn);
	element.append(...elementsToAppend);

	return {
		element,
		muteBtn,
		muteIcon,
		volumeSlider,
		onMute: null,
		onVolume: null
	};
}

function wireDetailVideoControls(detailVideoState) {
	const { wrapper, controls } = detailVideoState;
	if (!wrapper || !controls?.element) return;

	const show = () => showDetailVideoControls(detailVideoState, { autoHide: true });
	const hide = () => hideDetailVideoControls(detailVideoState);

	const pointerEnter = () => show();
	const pointerMove = () => show();
	const pointerLeave = () => hide();
	const focusIn = () => show();
	const focusOut = () => hide();
	const controlsEnter = () => show();
	const controlsLeave = () => hide();

	wrapper.addEventListener('pointerenter', pointerEnter);
	wrapper.addEventListener('pointermove', pointerMove);
	wrapper.addEventListener('pointerleave', pointerLeave);
	wrapper.addEventListener('focusin', focusIn);
	wrapper.addEventListener('focusout', focusOut);
	controls.element.addEventListener('pointerenter', controlsEnter);
	controls.element.addEventListener('pointerleave', controlsLeave);

	const onMute = () => {
		const player = state.detailVideo?.player;
		if (!player) return;
		if (player.isMuted()) {
			const targetVolume = detailVideoState.lastVolume > 0 ? detailVideoState.lastVolume : 60;
			try {
				player.unMute();
				player.setVolume(targetVolume);
			} catch {}
			updateDetailVideoUi(detailVideoState, { muted: false, volume: targetVolume });
		} else {
			try {
				detailVideoState.lastVolume = player.getVolume();
				player.mute();
			} catch {}
			updateDetailVideoUi(detailVideoState, { muted: true, volume: 0 });
		}
		show();
	};

	const onVolume = (event) => {
		const inputValue = Number.parseInt(event?.target?.value, 10);
		const volume = Number.isFinite(inputValue) ? clamp(inputValue, 0, 100) : 0;
		const player = state.detailVideo?.player;
		detailVideoState.lastVolume = volume > 0 ? volume : detailVideoState.lastVolume;
		
		// Update CSS variable for progress visualization
		if (event?.target) {
			event.target.style.setProperty('--volume-percent', `${volume}%`);
		}
		
		if (player) {
			try {
				player.setVolume(volume);
			} catch {}
			if (volume === 0) {
				try { player.mute(); } catch {}
				updateDetailVideoUi(detailVideoState, { muted: true, volume: 0 });
			} else {
				try {
					if (player.isMuted()) player.unMute();
				} catch {}
				updateDetailVideoUi(detailVideoState, { muted: false, volume });
			}
		} else {
			updateDetailVideoUi(detailVideoState, { muted: volume === 0, volume });
		}
		show();
	};

	controls.muteBtn.addEventListener('click', onMute);
	controls.volumeSlider.addEventListener('input', onVolume);

	controls.onMute = onMute;
	controls.onVolume = onVolume;

	detailVideoState.handlers = { pointerEnter, pointerMove, pointerLeave, focusIn, focusOut, controlsEnter, controlsLeave };
	updateDetailVideoUi(detailVideoState, { muted: true, volume: 0 });
}

function updateDetailVideoUi(detailVideoState, { muted, volume } = {}) {
	const { controls } = detailVideoState;
	if (!controls) return;

	if (typeof volume === 'number' && Number.isFinite(volume)) {
		const clamped = clamp(Math.round(volume), 0, 100);
		if (controls.volumeSlider) {
			controls.volumeSlider.value = String(clamped);
			// Update CSS variable for progress visualization
			controls.volumeSlider.style.setProperty('--volume-percent', `${clamped}%`);
		}
		if (clamped > 0) {
			detailVideoState.lastVolume = clamped;
		}
	}

	const isMuted = typeof muted === 'boolean' ? muted : Number(controls.volumeSlider?.value || 0) === 0;
	if (controls.muteIcon) {
		// Replace SVG icon based on mute state
		controls.muteIcon.innerHTML = '';
		controls.muteIcon.appendChild(createSVGIcon(isMuted ? 'mute' : 'unmute'));
	}
	if (controls.muteBtn) {
		controls.muteBtn.setAttribute('aria-label', isMuted ? 'Ton einschalten' : 'Ton stummschalten');
		controls.muteBtn.dataset.state = isMuted ? 'muted' : 'unmuted';
	}
	detailVideoState.isMuted = isMuted;
}

function showDetailVideoControls(detailVideoState, { autoHide = false } = {}) {
	const controls = detailVideoState?.controls?.element;
	if (!controls) return;
	controls.classList.add('is-visible');
	if (detailVideoState.hideTimer) {
		clearTimeout(detailVideoState.hideTimer);
		detailVideoState.hideTimer = null;
	}
	if (autoHide) {
		detailVideoState.hideTimer = setTimeout(() => {
			hideDetailVideoControls(detailVideoState);
		}, 2400);
	}
}

function hideDetailVideoControls(detailVideoState) {
	const controls = detailVideoState?.controls?.element;
	const wrapper = detailVideoState?.wrapper;
	if (!controls) return;
	if (controls.matches(':hover') || wrapper?.matches(':hover')) {
		return;
	}
	if (detailVideoState.hideTimer) {
		clearTimeout(detailVideoState.hideTimer);
		detailVideoState.hideTimer = null;
	}
	controls.classList.remove('is-visible');
}

function handleDetailVideoReady(detailVideoState, player) {
	if (!player) return;
	try {
		player.mute();
		player.playVideo();
	} catch (error) {
		console.warn('⚠️ Unable to start detail video automatically:', error);
	}
	updateDetailVideoUi(detailVideoState, { muted: true, volume: 0 });
	showDetailVideoControls(detailVideoState, { autoHide: true });
}

function handleDetailVideoStateChange(detailVideoState, event) {
	if (!event || !detailVideoState?.player || typeof YT === 'undefined') return;
	const stateValue = event.data;
	if (stateValue === YT.PlayerState.ENDED) {
		try {
			detailVideoState.player.seekTo(0, true);
			detailVideoState.player.playVideo();
		} catch (error) {
			console.warn('⚠️ Failed to loop detail video:', error);
		}
	}
}

function renderDetailCollage(items, seed = '', detailItem = null, category = state.currentCategory) {
	const collage = document.getElementById('detailCollage');
	if (!collage) return;

	collage.innerHTML = '';
	collage.dataset.userModified = '0';
	collage.dataset.layoutMode = 'mirror';
	collage.classList.remove('detail-polaroids');
	collage.classList.remove('detail-collage--scatter');
	collage.classList.add('detail-hero-mirror');

	const resolvedCategory = category || state.currentCategory;
        const title = detailItem ? CATEGORY_CONFIG[resolvedCategory]?.getTitle(detailItem) : '';
        const tagline = detailItem ? CATEGORY_CONFIG[resolvedCategory]?.getTagline(detailItem) : '';
        const heroImage = detailItem ? getHeroCardImage(detailItem, resolvedCategory) : '';
        const heroLogo = detailItem ? getHeroCardLogo(detailItem, resolvedCategory) : '';

        spawnDetailHeroMirror(collage, {
                category: resolvedCategory,
                heroImage: heroImage || pickRandomCharacterImage(),
                heroLogo,
                title,
                tagline
        });
	updateChoiceButtons();
	requestAnimationFrame(() => alignCollageToMedia());
}

let collageRealignRaf = null;
function queueCollageRealign() {
	if (collageRealignRaf) cancelAnimationFrame(collageRealignRaf);
	collageRealignRaf = requestAnimationFrame(() => {
		collageRealignRaf = null;
		alignCollageToMedia();
	});
}

function updateDetailNav() {
	const dataset = getDataset(state.currentCategory);
	const nav = document.getElementById('crimeDetailNav') || document.getElementById('crimeNav');
	if (!nav) return;

	if (!dataset || dataset.length <= 1) {
		nav.hidden = true;
		return;
	}

	nav.hidden = false;
	
	// Filter out placeholder items for counting
	const realItems = dataset.filter(item => !item.placeholder);
	const total = realItems.length;
	
	const counter = document.getElementById('crimeNavCounter');
	const nextTitle = document.getElementById('crimeNavNextTitle');
	const prevTitle = document.getElementById('crimeNavPrevTitle');
	const prevBtn = document.getElementById('crimePrev');
	const nextBtn = document.getElementById('crimeNext');
	
	// Calculate current position among real items only
	const currentItem = dataset[state.currentIndex];
	if (!currentItem || currentItem.placeholder) {
		// If current item is placeholder, find nearest real item
		let realIndex = 0;
		for (let i = 0; i < dataset.length; i++) {
			if (!dataset[i].placeholder) {
				realIndex++;
				if (i >= state.currentIndex) break;
			}
		}
		if (counter) {
			counter.textContent = `${realIndex} / ${total}`;
		}
		return;
	}
	
	// Count how many real items come before current index
	let realItemPosition = 0;
	for (let i = 0; i <= state.currentIndex; i++) {
		if (!dataset[i].placeholder) {
			realItemPosition++;
		}
	}
	
	const index = state.currentIndex;
	
	// Find next non-placeholder item
	let nextIndex = (index + 1) % dataset.length;
	let nextAttempts = 0;
	while (dataset[nextIndex] && dataset[nextIndex].placeholder && nextAttempts < dataset.length) {
		nextIndex = (nextIndex + 1) % dataset.length;
		nextAttempts++;
	}
	
	// Find prev non-placeholder item
	let prevIndex = (index - 1 + dataset.length) % dataset.length;
	let prevAttempts = 0;
	while (dataset[prevIndex] && dataset[prevIndex].placeholder && prevAttempts < dataset.length) {
		prevIndex = (prevIndex - 1 + dataset.length) % dataset.length;
		prevAttempts++;
	}

	if (counter) {
		counter.textContent = `${realItemPosition} / ${total}`;
	}
	
	const nextTitleText = dataset[nextIndex] && !dataset[nextIndex].placeholder 
		? CATEGORY_CONFIG[state.currentCategory].getTitle(dataset[nextIndex])
		: '';
	const prevTitleText = dataset[prevIndex] && !dataset[prevIndex].placeholder
		? CATEGORY_CONFIG[state.currentCategory].getTitle(dataset[prevIndex])
		: '';
	
	// Update next button logo (hide for illegal category)
	const nextLogoEl = document.getElementById('crimeNavNextLogo');
	if (nextLogoEl) {
		if (state.currentCategory === 'illegal') {
			nextLogoEl.style.display = 'none';
		} else {
			const nextLogo = getHeroCardLogo(dataset[nextIndex], state.currentCategory);
			if (nextLogo) {
				nextLogoEl.src = nextLogo;
				nextLogoEl.alt = nextTitleText + ' Logo';
				nextLogoEl.style.display = 'block';
			} else {
				nextLogoEl.style.display = 'none';
			}
		}
	}
	
	// Update prev button logo (hide for illegal category)
	const prevLogoEl = document.getElementById('crimeNavPrevLogo');
	if (prevLogoEl) {
		if (state.currentCategory === 'illegal') {
			prevLogoEl.style.display = 'none';
		} else {
			const prevLogo = getHeroCardLogo(dataset[prevIndex], state.currentCategory);
			if (prevLogo) {
				prevLogoEl.src = prevLogo;
				prevLogoEl.alt = prevTitleText + ' Logo';
				prevLogoEl.style.display = 'block';
			} else {
				prevLogoEl.style.display = 'none';
			}
		}
	}
	
	if (nextTitle) {
		nextTitle.textContent = nextTitleText || '—';
		nextTitle.style.display = nextTitleText ? 'block' : 'none';
	}
	
	if (prevTitle) {
		prevTitle.textContent = prevTitleText || '—';
		prevTitle.style.display = prevTitleText ? 'block' : 'none';
	}
	
	if (prevBtn) prevBtn.dataset.target = String(prevIndex);
	if (nextBtn) nextBtn.dataset.target = String(nextIndex);
}

function navigateDetail(direction = 1) {
	const dataset = getDataset(state.currentCategory);
	if (!dataset || dataset.length === 0) return;
	
	// Skip placeholder items when navigating
	let nextIndex = state.currentIndex;
	let attempts = 0;
	const maxAttempts = dataset.length; // Prevent infinite loop
	
	do {
		nextIndex = (nextIndex + direction + dataset.length) % dataset.length;
		attempts++;
		// If we've checked all items and they're all placeholders, break
		if (attempts >= maxAttempts) break;
	} while (dataset[nextIndex] && dataset[nextIndex].placeholder && attempts < maxAttempts);
	
	// Only open if we found a non-placeholder item
	if (dataset[nextIndex] && !dataset[nextIndex].placeholder) {
		openDetail(state.currentCategory, nextIndex);
	}
}

function showDetailOverlay() {
	const overlay = document.getElementById('detailOverlay');
	if (!overlay) return;
	overlay.classList.add('active');
	document.body.style.overflow = 'hidden';
	document.body.classList.add('is-detail-open');
}

function closeDetail(options = {}) {
    const overlay = document.getElementById('detailOverlay');
    if (!overlay) return;
    if (!overlay.classList.contains('active') && !options.force) return;

    destroyDetailVideoPlayer();
    clearHeroRandomSpin();

    overlay.classList.remove('active');
    document.body.style.overflow = '';
    document.body.classList.remove('is-detail-open');

    if (!options.silent) {
        highlightHeroCard(null);
    }

    resetHeroRailIdle();
    scheduleHeroRailSync(true);
}

function isDetailOpen() {
	const overlay = document.getElementById('detailOverlay');
	return overlay ? overlay.classList.contains('active') : false;
}

function highlightHeroCard(index) {
	if (!state.heroCardsMounted) return;

	document.querySelectorAll('.hero-card').forEach((card) => {
		const cardIndex = Number(card.dataset.index);
		const cardCategory = card.dataset.category;
		const isActive = index !== null && cardIndex === index && cardCategory === state.currentCategory;
		card.classList.toggle('hero-card--active', isActive);
	});
}

// ==================== COLLAGE HELPERS ====================

function applyCollageLayout(container, layout) {
    if (!container) return;
    const items = Array.from(container.children);
    if (items.length === 0) return;

    let frames = layout || COLLAGE_LAYOUTS[0];
	const fallback = frames[frames.length - 1];
	const inset = 18;
    const offset = inset / 2;
    const total = items.length;
    const goldenAngle = (Math.PI / 180) * 137.5;

    const rightSideOnly = container.dataset.rightSideOnly === '1';
    if (rightSideOnly) {
        frames = frames.map((f) => ({ ...f, x: Math.max(52, f.x) }));
    }

	// Configure horizontal spread
	const minLeftPct = rightSideOnly ? 54 : -2;
	const baseCenter = rightSideOnly ? 66 : 52;
	const spreadFactor = rightSideOnly ? 0.5 : 2.45;

    // Track placed rectangles to reduce overlap
    const placed = [];

	items.forEach((item, index) => {
		const frame = frames[index] || fallback;
		const baseX = clamp(frame.x, -40, 160);
		const baseY = clamp(frame.y, -40, 160);
		const seed = index + 1;
		const t = (index + 0.6) / (total + 1.2);
		const angle = index * goldenAngle;
		const spiral = 0.35 + t * 0.65;
		const flowWaveX = Math.cos(angle * 0.45) * (8 + spiral * 11);
		const flowWaveY = Math.sin(angle * 0.45) * (6 + spiral * 9);
		const sizeWave = 1 + Math.sin(angle * 0.7) * 0.16 + Math.cos(angle * 1.1) * 0.12;
		const baseScale = 1.16 + (Math.random() - 0.5) * 0.36;
		const baseWidth = frame.w * baseScale;
		const baseHeight = frame.h * baseScale;
		const orientation = item.dataset.orientation || 'square';
		let widthFactor = 1.08;
		let heightFactor = 1.08;
		if (orientation === 'portrait') {
			widthFactor *= 0.74;
			heightFactor *= 1.42;
		} else if (orientation === 'landscape') {
			widthFactor *= 1.44;
			heightFactor *= 0.72;
		} else {
			widthFactor *= 1.18;
			heightFactor *= 1.18;
		}
		const sizeJitterW = 0.88 + Math.random() * 0.54;
		const sizeJitterH = 0.9 + Math.random() * 0.48;
		const widthMin = orientation === 'portrait' ? 28 : 36;
		const widthMax = orientation === 'landscape' ? 92 : 86;
		const heightMin = orientation === 'landscape' ? 28 : 44;
		const heightMax = orientation === 'portrait' ? 102 : 84;
		const widthScaled = clamp(baseWidth * widthFactor * sizeWave * sizeJitterW, widthMin, widthMax);
		const heightScaled = clamp(baseHeight * heightFactor * sizeWave * sizeJitterH, heightMin, heightMax);
		const orbitRadius = 26 + spiral * 40;
		const orbitSkew = 0.78 + Math.sin(angle * 0.55) * 0.12;
		const normalizedX = baseCenter + Math.cos(angle) * orbitRadius * orbitSkew + (baseX - 40) * spreadFactor + flowWaveX;
		const normalizedY = 34 + Math.sin(angle) * orbitRadius * 0.92 + (baseY - 42) * 0.28 + flowWaveY;
		const maxLeft = 100 - widthScaled - inset;
		const maxTop = 100 - heightScaled - inset;
		let finalLeft = clamp(normalizedX, minLeftPct, maxLeft);
		let finalTop = clamp(normalizedY, 0, maxTop);

        // Anti-overlap repulsion: nudge away from previously placed items
        const rect = { left: finalLeft, top: finalTop, w: widthScaled, h: heightScaled };
		const maxIterations = 32;
        for (let iter = 0; iter < maxIterations; iter++) {
            let moved = false;
            for (const p of placed) {
                const overlapX = Math.min(rect.left + rect.w, p.left + p.w) - Math.max(rect.left, p.left);
                const overlapY = Math.min(rect.top + rect.h, p.top + p.h) - Math.max(rect.top, p.top);
                if (overlapX > 0 && overlapY > 0) {
                    const overlapArea = overlapX * overlapY;
                    const minArea = Math.min(rect.w * rect.h, p.w * p.h);
                    const ratio = overlapArea / minArea;
					if (ratio > 0.045) {
                        // Direction away from the overlapping item
                        const cx = rect.left + rect.w / 2;
                        const cy = rect.top + rect.h / 2;
                        const px = p.left + p.w / 2;
                        const py = p.top + p.h / 2;
                        let dx = cx - px;
                        let dy = cy - py;
                        const len = Math.max(0.01, Math.hypot(dx, dy));
                        dx /= len;
                        dy /= len;
						const step = 9.4; // percent-based step
                        rect.left = clamp(rect.left + dx * step, minLeftPct, maxLeft);
                        rect.top = clamp(rect.top + dy * step, 0, maxTop);
                        moved = true;
                    }
                }
            }
            if (!moved) break;
        }
        // Commit rect and track it
        finalLeft = rect.left;
        finalTop = rect.top;
        placed.push({ ...rect });
		const depth = 26 + spiral * 54 + Math.sin(angle) * 10;
		const rotation = (frame.r ?? 0) + Math.sin(angle) * 2.8 + Math.cos(angle * 0.45) * 2.1;
		const hueShift = (seed * 23) % 16;
		const saturation = 0.96 + (spiral * 0.12);

        const jitterLeft = clamp(finalLeft + (Math.random() - 0.5) * 4.2, minLeftPct, maxLeft);
        const jitterTop = clamp(finalTop + (Math.random() - 0.5) * 3.4, 0, maxTop);
		item.style.left = `calc(${jitterLeft}% + ${offset}%)`;
		item.style.top = `calc(${jitterTop}% + ${offset}%)`;
		item.style.width = `calc(${widthScaled}% - ${inset}%)`;
		item.style.height = `calc(${heightScaled}% - ${inset}%)`;
		item.style.setProperty('--thumb-rotate', `${rotation.toFixed(2)}deg`);
		item.style.setProperty('--thumb-depth', `${depth.toFixed(2)}px`);
		item.style.setProperty('--thumb-glow', `${(0.22 + spiral * 0.18).toFixed(3)}`);
		item.style.setProperty('--thumb-saturation', `${saturation.toFixed(3)}`);
		item.style.setProperty('--thumb-hue', `${hueShift.toFixed(2)}deg`);
		item.style.zIndex = String(20 + Math.round(spiral * 40));
	});
}

function alignCollageToMedia() {
	try {
		const media = document.getElementById('detailMedia');
		const collage = document.getElementById('detailCollage');
		const rightCol = document.querySelector('.crime-detail-right');
		const content = document.getElementById('detailContent');
		const controls = document.getElementById('crimeNav') || document.querySelector('.hero-rail-controls');

		if (!media || !collage || !rightCol || !content) return;

		if (window.matchMedia('(max-width: 1024px)').matches) {
			collage.style.marginTop = '';
			collage.style.height = '';
			collage.style.minHeight = '';
			collage.style.maxHeight = '';
			collage.style.left = '';
			collage.style.width = '';
			clearThumbnailHighlights(collage);
			Array.from(collage.children).forEach((child) => {
				child.style.left = '';
				child.style.top = '';
				child.style.width = '';
				child.style.height = '';
				child.style.setProperty('--thumb-rotate', '0deg');
			});
			return;
		}

		const rightRect = rightCol.getBoundingClientRect();
		const mediaRect = media.getBoundingClientRect();
		const contentRect = content.getBoundingClientRect();
		const controlsRect = controls?.getBoundingClientRect();

		const offsetTop = Math.max(0, Math.round(mediaRect.top - rightRect.top));
		const targetBottom = controlsRect ? controlsRect.bottom : contentRect.bottom;
		const desiredHeight = Math.max(520, Math.round(targetBottom - mediaRect.top));

        collage.style.marginTop = `${offsetTop}px`;
        collage.style.height = `${desiredHeight}px`;
        collage.style.minHeight = `${desiredHeight}px`;
        collage.style.maxHeight = `${desiredHeight}px`;

        // Apply layout based on mode
        if (collage.dataset.userModified !== '1') {
            if (collage.dataset.layoutMode === 'scatter') {
                const layoutIndex = parseInt(collage.dataset.layoutIndex || '0', 10) || 0;
                const frames = getRandomizedLayout(COLLAGE_LAYOUTS[layoutIndex]);
                applyCollageLayout(collage, frames);
			} else if (collage.dataset.layoutMode === 'polaroids' || collage.dataset.layoutMode === 'mirror') {
                // Polaroids are already positioned by spawnDetailPolaroids, no additional layout needed
                // Just ensure the container is properly sized
                collage.style.position = 'relative';
            }
        }
    } catch (error) {
        console.warn('⚠️ Collage alignment failed:', error);
    }
}

function spawnDetailHeroMirror(container, context = {}) {
        if (!container) return;
        container.innerHTML = '';
        if (Array.isArray(container.__highlightTimers)) {
                container.__highlightTimers.forEach((t) => clearTimeout(t));
        }
        container.__highlightTimers = [];

        const { category = state.currentCategory } = context;
        container.dataset.category = category;
        container.classList.toggle('detail-hero-mirror--illegal', category === 'illegal');
        container.classList.toggle('detail-hero-mirror--legal', category !== 'illegal');

        const foreground = document.createElement('div');
        foreground.className = 'detail-hero-mirror__foreground';
        container.appendChild(foreground);

        const brandLogo = document.createElement('img');
        brandLogo.className = 'hero-logo';
        brandLogo.src = 'public/roots-roleplay.svg';
        brandLogo.alt = 'Roots Roleplay';
        brandLogo.loading = 'lazy';
        brandLogo.decoding = 'async';
        foreground.appendChild(brandLogo);

        const content = document.createElement('div');
        content.className = 'hero-left__content';
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'hero-choice';
        buttonGroup.setAttribute('role', 'group');
        buttonGroup.setAttribute('aria-label', 'Aktionen');
        const buttons = [
            { label: 'Regelwerk', className: 'hero-choice__btn--rules', dataset: { choice: 'regelwerk' } },
            { label: 'Whitelist', className: 'hero-choice__btn--whitelist', dataset: { choice: 'whitelist' } }
        ];
        buttons.forEach((b) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `hero-choice__btn ${b.className}`.trim();
            btn.textContent = b.label;
            Object.keys(b.dataset).forEach((key) => { btn.dataset[key] = b.dataset[key]; });
            wireChoiceButton(btn, { autoOpenDetail: false });
            buttonGroup.appendChild(btn);
        });
        content.appendChild(buttonGroup);
        foreground.appendChild(content);
}

function spawnDetailFlyingLogos(container, category = 'legal') {
	if (!container) return;
	// Clear only existing flying logos, not fog/damage effects
	container.querySelectorAll('.detail-flying-logo').forEach(el => el.remove());
	
	let logos = [];
	
	if (category === 'illegal') {
		// Get all crime logos from crime_logos folder (13.png through 23.png)
		const crimeLogoNumbers = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
		logos = crimeLogoNumbers.map(num => ({
			id: `crime-logo-${num}`,
			src: normalizeAssetPath(`public/crime_logos/${num}.png`),
			alt: `Crime Logo ${num}`
		}));
	} else {
		// Get all company logos from companies folder
		logos = state.companies
			.filter(company => company && company.id && !company.placeholder)
			.map(company => ({
				id: company.id,
				src: normalizeAssetPath(`public/company/${company.id}.png`),
				alt: (company.displayName || company.title || company.id) + ' Logo'
			}));
	}
	
	if (logos.length === 0) return;
	
	// Create floating logos with random positions and animations - limit to 15 for performance
	const logoCount = Math.min(logos.length * 2, 15);
	const shuffledLogos = shuffleArray([...logos, ...logos]).slice(0, logoCount);
	
	// Stagger creation to avoid loading all at once
	shuffledLogos.forEach((logo, index) => {
		setTimeout(() => {
			const logoEl = document.createElement('img');
			logoEl.className = 'detail-flying-logo';
			logoEl.alt = logo.alt;
			logoEl.loading = 'lazy';
			logoEl.decoding = 'async';
			logoEl.setAttribute('aria-hidden', 'true');
			
			// Random position
			const left = Math.random() * 100;
			const top = Math.random() * 100;
			const size = 40 + Math.random() * 60; // 40-100px
			const duration = 20 + Math.random() * 30; // 20-50s
			const delay = Math.random() * 5; // 0-5s delay
			const direction = Math.random() > 0.5 ? 1 : -1;
			
			logoEl.style.left = `${left}%`;
			logoEl.style.top = `${top}%`;
			logoEl.style.width = `${size}px`;
			logoEl.style.height = 'auto';
			logoEl.style.opacity = '0.45';
			logoEl.style.setProperty('--fly-duration', `${duration}s`);
			logoEl.style.setProperty('--fly-delay', `${delay}s`);
			logoEl.style.setProperty('--fly-direction', direction);
			
			// Set src after appending to reduce concurrent loads
			container.appendChild(logoEl);
			logoEl.src = logo.src;
		}, index * 50); // Stagger by 50ms each
	});
}

function spawnPoliceLights(container) {
	if (!container) return;
	
	// Clear only police lights, keep rain
	const existingLights = container.querySelectorAll('.police-light');
	existingLights.forEach(light => light.remove());
	
	// Create multiple police light elements
	const lightCount = 8; // Number of light sources
	
	for (let i = 0; i < lightCount; i++) {
		const lightEl = document.createElement('div');
		lightEl.className = 'police-light';
		lightEl.setAttribute('aria-hidden', 'true');
		
		// Random position
		const left = Math.random() * 100;
		const top = Math.random() * 100;
		const size = 200 + Math.random() * 300; // 200-500px
		const delay = Math.random() * 2; // 0-2s delay
		const isRed = i % 2 === 0; // Alternate between red and blue
		
		lightEl.style.left = `${left}%`;
		lightEl.style.top = `${top}%`;
		lightEl.style.width = `${size}px`;
		lightEl.style.height = `${size}px`;
		lightEl.style.setProperty('--light-delay', `${delay}s`);
		lightEl.classList.add(isRed ? 'police-light--red' : 'police-light--blue');
		
		container.appendChild(lightEl);
	}
}

function spawnRainEffect(container) {
	if (!container) return;
	
	// Clear only rain, keep police lights
	const existingRain = container.querySelectorAll('.rain-drop');
	existingRain.forEach(drop => drop.remove());
	
	// Create rain container if it doesn't exist
	let rainContainer = container.querySelector('.rain-container');
	if (!rainContainer) {
		rainContainer = document.createElement('div');
		rainContainer.className = 'rain-container';
		rainContainer.setAttribute('aria-hidden', 'true');
		container.appendChild(rainContainer);
	}
	
	// Create multiple rain drops
	const dropCount = 150; // Number of rain drops
	
	for (let i = 0; i < dropCount; i++) {
		const drop = document.createElement('div');
		drop.className = 'rain-drop';
		drop.setAttribute('aria-hidden', 'true');
		
		// Random properties
		const left = Math.random() * 100; // 0-100%
		const delay = Math.random() * 2; // 0-2s delay
		const duration = 0.5 + Math.random() * 0.5; // 0.5-1s duration
		const length = 10 + Math.random() * 20; // 10-30px length
		const opacity = 0.3 + Math.random() * 0.4; // 0.3-0.7 opacity
		
		drop.style.left = `${left}%`;
		drop.style.setProperty('--rain-delay', `${delay}s`);
		drop.style.setProperty('--rain-duration', `${duration}s`);
		drop.style.height = `${length}px`;
		drop.style.opacity = opacity;
		
		rainContainer.appendChild(drop);
	}
}

function spawnFogEffect(container) {
	if (!container) return;
	
	// Clear all existing effects first (flying logos, etc.)
	container.querySelectorAll('.detail-flying-logo').forEach(el => el.remove());
	
	// Clear only fog, keep other effects
	const existingFog = container.querySelectorAll('.fog-layer');
	existingFog.forEach(fog => fog.remove());
	
	// Create fog container if it doesn't exist
	let fogContainer = container.querySelector('.fog-container');
	if (!fogContainer) {
		fogContainer = document.createElement('div');
		fogContainer.className = 'fog-container';
		fogContainer.setAttribute('aria-hidden', 'true');
		container.appendChild(fogContainer);
	}
	
	// Create multiple fog layers
	const fogLayerCount = 8; // Number of fog layers
	
	for (let i = 0; i < fogLayerCount; i++) {
		const fogLayer = document.createElement('div');
		fogLayer.className = 'fog-layer';
		fogLayer.setAttribute('aria-hidden', 'true');
		
		// Random properties
		const size = 200 + Math.random() * 300; // 200-500px
		const left = Math.random() * 120 - 10; // -10% to 110% for overflow
		const top = Math.random() * 100; // 0-100%
		const delay = Math.random() * 10; // 0-10s delay
		const duration = 20 + Math.random() * 30; // 20-50s duration
		const opacity = 0.15 + Math.random() * 0.15; // 0.15-0.3 opacity
		const direction = Math.random() > 0.5 ? 1 : -1; // Left or right movement
		
		fogLayer.style.width = `${size}px`;
		fogLayer.style.height = `${size}px`;
		fogLayer.style.left = `${left}%`;
		fogLayer.style.top = `${top}%`;
		fogLayer.style.setProperty('--fog-delay', `${delay}s`);
		fogLayer.style.setProperty('--fog-duration', `${duration}s`);
		fogLayer.style.setProperty('--fog-direction', direction);
		fogLayer.style.opacity = opacity;
		
		fogContainer.appendChild(fogLayer);
	}
}

function spawnCrimeDamage(container) {
	if (!container) return;
	
	// Clear only damage effects, keep other effects
	const existingDamage = container.querySelectorAll('.crime-damage');
	existingDamage.forEach(damage => damage.remove());
	
	// Create damage container if it doesn't exist
	let damageContainer = container.querySelector('.crime-damage-container');
	if (!damageContainer) {
		damageContainer = document.createElement('div');
		damageContainer.className = 'crime-damage-container';
		damageContainer.setAttribute('aria-hidden', 'true');
		container.appendChild(damageContainer);
	}
	
	// Create crack lines
	const crackCount = 6; // Number of cracks
	
	for (let i = 0; i < crackCount; i++) {
		const crack = document.createElement('div');
		crack.className = 'crime-damage crime-damage--crack';
		crack.setAttribute('aria-hidden', 'true');
		
		// Random properties
		const length = 50 + Math.random() * 150; // 50-200px
		const angle = Math.random() * 360; // 0-360deg
		const left = Math.random() * 100; // 0-100%
		const top = Math.random() * 100; // 0-100%
		const opacity = 0.2 + Math.random() * 0.3; // 0.2-0.5
		
		crack.style.width = `${length}px`;
		crack.style.left = `${left}%`;
		crack.style.top = `${top}%`;
		crack.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
		crack.style.opacity = opacity;
		
		damageContainer.appendChild(crack);
	}
	
	// Create blood splatters (subtle)
	const splatterCount = 4; // Number of splatters
	
	for (let i = 0; i < splatterCount; i++) {
		const splatter = document.createElement('div');
		splatter.className = 'crime-damage crime-damage--splatter';
		splatter.setAttribute('aria-hidden', 'true');
		
		// Random properties
		const size = 20 + Math.random() * 40; // 20-60px
		const left = Math.random() * 100; // 0-100%
		const top = Math.random() * 100; // 0-100%
		const rotation = Math.random() * 360; // 0-360deg
		const opacity = 0.15 + Math.random() * 0.15; // 0.15-0.3
		
		splatter.style.width = `${size}px`;
		splatter.style.height = `${size}px`;
		splatter.style.left = `${left}%`;
		splatter.style.top = `${top}%`;
		splatter.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
		splatter.style.opacity = opacity;
		
		damageContainer.appendChild(splatter);
	}
}

function spawnDetailPolaroids(container) {
    if (!container) return;
    container.innerHTML = '';
    const stripeConfigs = [
        { modifier: 'film-strip--one', count: 9, angle: '10deg', duration: '96s', delay: '-12s', top: '-4%', shift: '-40px', curve: 0.7 },
        { modifier: 'film-strip--two', count: 10, angle: '12deg', duration: '104s', delay: '-24s', top: '16%', shift: '-8px', curve: 0.9 },
        { modifier: 'film-strip--three', count: 10, angle: '14deg', duration: '112s', delay: '-36s', top: '38%', shift: '26px', curve: 1.1 },
        { modifier: 'film-strip--four', count: 9, angle: '16deg', duration: '120s', delay: '-48s', top: '62%', shift: '60px', curve: 1.3 }
    ];

    // Combine both crime and random character images for polaroids
    const combinedPool = [...CRIME_CHARACTER_IMAGES, ...RANDOM_CHARACTER_IMAGES];
    const pool = shuffleArray(combinedPool.slice());
    let cursor = 0;
    const pullNextImage = () => {
        if (cursor >= pool.length) {
            shuffleArray(pool);
            cursor = 0;
        }
        const src = pool[cursor++];
        return { src, alt: getCharacterAltFromSrc(src) };
    };

    const createPolaroid = (emphasis = false, curveOffset = 0) => {
        const figure = document.createElement('figure');
        figure.className = 'bg-polaroid';
        if (emphasis) figure.classList.add('bg-polaroid--highlight');
        figure.setAttribute('aria-hidden', 'true');
        const tilt = (Math.random() * 6 - 3).toFixed(2);
        const offset = curveOffset.toFixed(2);
        const scale = (0.95 + Math.random() * 0.08).toFixed(2);
        figure.style.setProperty('--bg-polaroid-tilt', `${tilt}deg`);
        figure.style.setProperty('--bg-polaroid-offset', `${offset}%`);
        figure.style.setProperty('--bg-polaroid-scale', scale);
        const img = document.createElement('img');
        img.className = 'bg-polaroid__image';
        const { src } = pullNextImage();
        img.src = src;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.setAttribute('aria-hidden', 'true');
        figure.appendChild(img);
        return figure;
    };

    stripeConfigs.forEach((config, index) => {
        const stripe = document.createElement('div');
        stripe.className = `bg-polaroid-stripe ${config.modifier}`;
        stripe.style.setProperty('--film-strip-angle', config.angle);
        if (typeof config.top === 'string') stripe.style.top = config.top;
        if (typeof config.shift === 'string') stripe.style.setProperty('--film-strip-shift', config.shift);

        const inner = document.createElement('div');
        inner.className = 'bg-polaroid-stripe__inner';
        inner.style.setProperty('--bg-line-duration', config.duration);
        inner.style.setProperty('--bg-line-delay', config.delay);
        const polaroids = [];
        for (let i = 0; i < config.count; i += 1) {
            const emphasis = index === 1 && (i % Math.ceil(config.count / 4) === 0);
            const midpoint = (config.count - 1) / 2;
            const curveOffset = config.curve ? (i - midpoint) * config.curve : 0;
            polaroids.push(createPolaroid(emphasis, curveOffset));
        }
        polaroids.forEach((node) => inner.appendChild(node));
        polaroids.forEach((node) => inner.appendChild(node.cloneNode(true)));
        stripe.appendChild(inner);
        container.appendChild(stripe);

        const scheduleHighlight = (stripeEl) => {
            const delay = 4000 + Math.random() * 9000;
            const timer = setTimeout(() => {
                const cards = Array.from(stripeEl.querySelectorAll('.bg-polaroid'));
                if (cards.length === 0) { scheduleHighlight(stripeEl); return; }
                cards.forEach((card) => card.classList.remove('bg-polaroid--pulse'));
                const target = cards[Math.floor(Math.random() * cards.length)];
                target.classList.add('bg-polaroid--pulse');
                setTimeout(() => { target.classList.remove('bg-polaroid--pulse'); }, 5200);
                scheduleHighlight(stripeEl);
            }, delay);
            // Store timers on container to allow future cleanup if needed
            container.__highlightTimers = container.__highlightTimers || [];
            container.__highlightTimers.push(timer);
        };
        scheduleHighlight(stripe);
    });
}

function enableThumbnailDragging(container) {
    // Function now disabled - no draggable functionality
    // Polaroids are static decorative elements
    if (!container) return;
    // Remove any existing drag-related attributes
    Array.from(container.children).forEach((item) => {
        item.style.touchAction = '';
        item.style.userSelect = '';
        item.style.cursor = '';
        item.dataset.dragInit = '';
    });
}

function classifyThumbnailOrientations(collage) {
	if (!collage) return;
	const thumbs = Array.from(collage.querySelectorAll('.crime-thumbnail'));
	const applyOrientation = (thumb, img) => {
		if (!img || !img.naturalWidth || !img.naturalHeight) return;
		const ratio = img.naturalWidth / img.naturalHeight;
		let orientation = 'square';
		if (ratio >= 1.18) orientation = 'landscape';
		else if (ratio <= 0.82) orientation = 'portrait';
		thumb.dataset.orientation = orientation;
		queueCollageRealign();
	};
	thumbs.forEach((thumb) => {
		const img = thumb.querySelector('img');
		if (!img) return;
		if (img.complete && img.naturalWidth && img.naturalHeight) {
			applyOrientation(thumb, img);
		} else {
			img.addEventListener('load', () => applyOrientation(thumb, img), { once: true });
		}
	});
}

function handleThumbnailPointerDown(event, container) {
    // Function completely disabled - no dragging functionality
    event.preventDefault();
    event.stopPropagation();
    return;
}

// Enable rotation and resizing on thumbnails via overlay handles - DISABLED
function enableThumbnailManipulation(container) {
    // Function disabled - no manipulation controls needed for polaroids
    if (!container) return;
    // Remove any existing manipulation handles
    Array.from(container.children).forEach((item) => {
        const handles = item.querySelectorAll('.thumb-handle');
        handles.forEach(handle => handle.remove());
        const indicator = item.querySelector('.thumb-indicator');
        if (indicator) indicator.remove();
        const toolbar = item.querySelector('.thumb-toolbar');
        if (toolbar) toolbar.remove();
    });
}

// ==================== THUMBNAIL SELECTION & SHORTCUTS ====================
function getSelectedThumbnail(container) {
    return container.querySelector('.crime-thumbnail.thumb-selected');
}

function selectThumbnail(container, item) {
    if (!container || !item) return;
    // Deselect others
    Array.from(container.children).forEach((el) => {
        if (el !== item) el.classList.remove('thumb-selected');
    });
    item.classList.add('thumb-selected');
    // Ensure focus for keyboard controls
    try { item.focus(); } catch {}
    // Show and position the floating inspector near the selected item
    placeFloatingInspector(container, item);
}

function deselectThumbnail(container) {
    if (!container) return;
    const current = getSelectedThumbnail(container);
    if (current) current.classList.remove('thumb-selected');
    removeFloatingInspector(container);
}

function enableThumbnailSelection(container) {
    if (!container || container.dataset.selectionInit === '1') return;
    container.dataset.selectionInit = '1';
    // Clicking outside thumbnails deselects
    const overlay = document.getElementById('detailOverlay');
    if (overlay) {
        overlay.addEventListener('pointerdown', (e) => {
            const insideThumb = e.target && e.target.closest && e.target.closest('.crime-thumbnail');
            if (!insideThumb) {
                deselectThumbnail(container);
            }
        });
    }
}

// ==================== FLOATING INSPECTOR ====================
function ensureFloatingInspector(container) {
    let inspector = container.querySelector('.floating-inspector');
    if (!inspector) {
        inspector = document.createElement('div');
        inspector.className = 'floating-inspector';
        inspector.setAttribute('role', 'toolbar');
        inspector.setAttribute('aria-label', 'Adjust card');
        const mkBtn = (label, title) => {
            const b = document.createElement('button');
            b.className = 'thumb-btn';
            b.type = 'button';
            b.title = title;
            b.textContent = label;
            b.setAttribute('aria-label', title);
            b.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
            b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
            return b;
        };
        const btnRotL = mkBtn('↺', 'Rotate -15°');
        const btnRotR = mkBtn('↻', 'Rotate +15°');
        const btnSizeMinus = mkBtn('−', 'Shrink 10%');
        const btnSizePlus = mkBtn('+', 'Grow 10%');
        const btnReset = mkBtn('Reset', 'Reset rotation');
        inspector.append(btnRotL, btnRotR, btnSizeMinus, btnSizePlus, btnReset);

        // Actions target the currently selected thumbnail
        const adjustRotateBy = (delta) => {
            const selected = getSelectedThumbnail(container);
            if (!selected) return;
            const current = parseFloat((getComputedStyle(selected).getPropertyValue('--thumb-rotate') || '0deg').replace('deg','')) || 0;
            const deg = current + delta;
            selected.style.setProperty('--thumb-rotate', `${deg}deg`);
            placeFloatingInspector(container, selected);
        };
        const resizeByFactor = (factor) => {
            const selected = getSelectedThumbnail(container);
            if (!selected) return;
            const containerRect = container.getBoundingClientRect();
            const startW = selected.offsetWidth;
            const startH = selected.offsetHeight;
            let newW = Math.max(40, startW * factor);
            let newH = Math.max(40, startH * factor);
            let widthPct = (newW / containerRect.width) * 100;
            let heightPct = (newH / containerRect.height) * 100;
            widthPct = Math.min(80, Math.max(16, widthPct));
            heightPct = Math.min(80, Math.max(16, heightPct));
            const minLeft = container.dataset.rightSideOnly === '1' ? 55 : 0;
            const leftPct = Math.min(100 - widthPct, Math.max(minLeft, (selected.offsetLeft / containerRect.width) * 100));
            const topPct = Math.min(100 - heightPct, Math.max(0, (selected.offsetTop / containerRect.height) * 100));
            selected.style.left = `${leftPct}%`;
            selected.style.top = `${topPct}%`;
            selected.style.width = `${widthPct}%`;
            selected.style.height = `${heightPct}%`;
            placeFloatingInspector(container, selected);
        };
        btnRotL.addEventListener('click', () => adjustRotateBy(-15));
        btnRotR.addEventListener('click', () => adjustRotateBy(+15));
        btnReset.addEventListener('click', () => {
            const selected = getSelectedThumbnail(container);
            if (!selected) return;
            selected.style.setProperty('--thumb-rotate', '0deg');
            placeFloatingInspector(container, selected);
        });
        btnSizeMinus.addEventListener('click', () => resizeByFactor(0.9));
        btnSizePlus.addEventListener('click', () => resizeByFactor(1.1));

        // Do not allow inspector to start drags itself; keep visible while hovered
        inspector.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
        inspector.addEventListener('mouseenter', () => {
            if (inspector.__hideTimer) { clearTimeout(inspector.__hideTimer); inspector.__hideTimer = null; }
            inspector.classList.remove('fade-out');
        });
        inspector.addEventListener('mouseleave', () => {
            if (inspector.__hideTimer) { clearTimeout(inspector.__hideTimer); }
            inspector.__hideTimer = setTimeout(() => {
                if (!inspector.matches(':hover')) {
                    inspector.classList.add('fade-out');
                    setTimeout(() => { inspector.classList.remove('show', 'fade-out'); container.classList.remove('has-floating-inspector'); }, 180);
                }
            }, 2600);
        });
        container.appendChild(inspector);
    }
    return inspector;
}

function placeFloatingInspector(container, item) {
    if (container && container.dataset.inspectorEnabled !== '1') {
        return;
    }
    const inspector = ensureFloatingInspector(container);
    if (!item) { inspector.classList.remove('show'); container.classList.remove('has-floating-inspector'); return; }

    // Ensure visible state
    inspector.classList.remove('fade-out');
    inspector.classList.add('show');
    container.classList.add('has-floating-inspector');

    // Measure inspector to position intelligently
    const prevVis = inspector.style.visibility;
    const prevDisp = inspector.style.display;
    inspector.style.visibility = 'hidden';
    inspector.style.display = 'flex';
    const iw = inspector.offsetWidth;
    const ih = inspector.offsetHeight;
    inspector.style.visibility = prevVis;
    inspector.style.display = '';

    const margin = 10;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const itemLeft = item.offsetLeft;
    const itemTop = item.offsetTop;
    const itemW = item.offsetWidth;
    const itemH = item.offsetHeight;

    const spaceRight = cw - (itemLeft + itemW) - margin;
    const spaceLeft = itemLeft - margin;
    const spaceTop = itemTop - margin;
    const spaceBottom = ch - (itemTop + itemH) - margin;

    let left;
    let top;

    if (spaceRight >= iw) {
        left = itemLeft + itemW + margin;
        top = itemTop + (itemH / 2) - (ih / 2);
    } else if (spaceLeft >= iw) {
        left = itemLeft - iw - margin;
        top = itemTop + (itemH / 2) - (ih / 2);
    } else if (spaceTop >= ih) {
        left = itemLeft + (itemW / 2) - (iw / 2);
        top = itemTop - ih - margin;
    } else {
        left = itemLeft + (itemW / 2) - (iw / 2);
        top = itemTop + itemH + margin;
    }

    left = Math.max(margin, Math.min(cw - iw - margin, left));
    top = Math.max(margin, Math.min(ch - ih - margin, top));

    inspector.style.left = `${left}px`;
    inspector.style.top = `${top}px`;

    if (inspector.__hideTimer) { clearTimeout(inspector.__hideTimer); }
    inspector.__hideTimer = setTimeout(() => {
        if (!inspector.matches(':hover')) {
            inspector.classList.add('fade-out');
            setTimeout(() => { inspector.classList.remove('show', 'fade-out'); container.classList.remove('has-floating-inspector'); }, 180);
        }
    }, 2600);
}

function removeFloatingInspector(container) {
    const inspector = container.querySelector('.floating-inspector');
    if (inspector) {
        if (inspector.__hideTimer) { clearTimeout(inspector.__hideTimer); inspector.__hideTimer = null; }
        inspector.classList.remove('fade-out');
        inspector.classList.remove('show');
    }
    container.classList.remove('has-floating-inspector');
}

function enableThumbnailWheelRotate(container) {
    if (!container || container.dataset.wheelInit === '1') return;
    container.dataset.wheelInit = '1';
    // Rotate selected thumbnail using mouse wheel over the selected card
    container.addEventListener('wheel', (event) => {
        if (!isDetailOpen()) return;
        const selected = getSelectedThumbnail(container);
        if (!selected) return;
        const overSelected = event.target && selected.contains(event.target);
        if (!overSelected) return;
        event.preventDefault();
		const current = parseFloat((getComputedStyle(selected).getPropertyValue('--thumb-rotate') || '0deg').replace('deg','')) || 0;
		const direction = event.deltaY > 0 ? -1 : 1;
		const magnitude = Math.max(1, Math.round(Math.abs(event.deltaY) / 40));
		const baseStep = event.shiftKey ? 15 : 8;
		const fineFactor = event.altKey ? 0.5 : 1;
		let deg = current + direction * baseStep * magnitude * fineFactor;
		if (event.shiftKey) {
			deg = Math.round(deg / 15) * 15;
		}
		selected.style.setProperty('--thumb-rotate', `${deg}deg`);
    }, { passive: false });
}

function enableThumbnailKeyboard(container) {
    if (!container || container.dataset.keyboardInit === '1') return;
    container.dataset.keyboardInit = '1';
    const onKey = (event) => {
        if (!isDetailOpen()) return;
        const selected = getSelectedThumbnail(container);
        if (!selected) return;
        const collageRect = container.getBoundingClientRect();
        const step = event.shiftKey ? 2.5 : 0.8; // percent-based nudge
        const fine = event.altKey ? 0.35 : 1;
        const minLeft = container.dataset.rightSideOnly === '1' ? 55 : 0;
        const widthPct = (selected.offsetWidth / collageRect.width) * 100;
        const heightPct = (selected.offsetHeight / collageRect.height) * 100;
        let leftPct = (selected.offsetLeft / collageRect.width) * 100;
        let topPct = (selected.offsetTop / collageRect.height) * 100;
        const key = event.key;
        let handled = false;

        if (key === 'ArrowLeft') { leftPct -= step * fine; handled = true; }
        else if (key === 'ArrowRight') { leftPct += step * fine; handled = true; }
        else if (key === 'ArrowUp') { topPct -= step * fine; handled = true; }
        else if (key === 'ArrowDown') { topPct += step * fine; handled = true; }
		else if (key.toLowerCase() === 'r') {
			// Reset rotation with R
			selected.style.setProperty('--thumb-rotate', '0deg');
			handled = true;
        } else if (key.toLowerCase() === 'escape') {
            deselectThumbnail(container);
            handled = true;
        }

        if (handled && (key.startsWith('Arrow') || key.toLowerCase() === 'r' || key.toLowerCase() === 'escape')) {
            event.preventDefault();
            leftPct = Math.max(minLeft, Math.min(100 - widthPct, leftPct));
            topPct = Math.max(0, Math.min(100 - heightPct, topPct));
            // Snap gently to 10% grid when Shift held
            if (event.shiftKey) {
                leftPct = Math.round(leftPct / 2) * 2; // 2% increments
                topPct = Math.round(topPct / 2) * 2;
            }
            selected.style.left = `${leftPct}%`;
            selected.style.top = `${topPct}%`;
            // No panel needed for movement
        }
    };
    document.addEventListener('keydown', onKey);
}

function scheduleThumbnailHighlights(container, items = []) {
	if (!container) return;
	if (container.__highlightTimer) {
		clearTimeout(container.__highlightTimer);
	}

	let index = 0;
	const total = items.length;
	if (total === 0) return;

	const run = () => {
		if (!document.body.contains(container)) return;
		items.forEach((item) => item.classList.remove('pulse-highlight'));
		const target = items[index % total];
		if (target) {
			target.classList.add('pulse-highlight');
		}
		index = (index + 1) % total;
		container.__highlightTimer = setTimeout(run, 2200);
	};

	container.__highlightTimer = setTimeout(run, 1200);
}

function clearThumbnailHighlights(container) {
	if (!container) return;
	if (container.__highlightTimer) {
		clearTimeout(container.__highlightTimer);
		container.__highlightTimer = null;
	}
	Array.from(container.children).forEach((item) => item.classList.remove('pulse-highlight'));
}

function resetThumbnailIdleRestart(container) {
	if (!container) return;
	if (container.__idleRestartTimer) {
		clearTimeout(container.__idleRestartTimer);
		container.__idleRestartTimer = null;
	}
}

function prepareThumbnailIdleRestart(container) {
	if (!container) return;
	resetThumbnailIdleRestart(container);
	container.__idleRestartTimer = setTimeout(() => maybeRestartThumbnailHighlights(container), 6000);
}

function maybeRestartThumbnailHighlights(container) {
	if (!container) return;
	const items = Array.from(container.children);
	scheduleThumbnailHighlights(container, items);
}

// ==================== UTILITIES ====================

// Get base path for GitHub Pages compatibility
function getBasePath() {
	if (typeof window.__BASE_PATH__ !== 'undefined') {
		return window.__BASE_PATH__;
	}
	const path = window.location.pathname;
	// Remove the filename if present
	const cleaned = path.replace(/\/[^/]*\.html?$/, '').replace(/\/$/, '');
	return cleaned || '';
}

function normalizeAssetPath(path = '') {
	if (!path) return '';
	if (/^https?:\/\//i.test(path)) return path;
	const basePath = getBasePath();
	const trimmed = String(path).replace(/^\/+/, '');
	// Ensure path starts with base path
	return `${basePath}/${trimmed}`.replace(/\/+/g, '/');
}

function debounce(fn, wait = 300) {
	let t = null;
	return (...args) => {
		clearTimeout(t);
		t = setTimeout(() => fn(...args), wait);
	};
}

function shuffleArray(array = []) {
	const result = Array.isArray(array) ? array.slice() : [];
	for (let i = result.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

function getDataset(category = state.currentCategory) {
	return CATEGORY_CONFIG[category]?.getDataset?.() || [];
}

function getHeroCardImage(item, category) {
	if (item && item.placeholder) {
		// Use provided silhouette image or default character silhouette
		return normalizeAssetPath(item.image || 'public/character_2.png');
	}
	if (category === 'legal') {
		// Legal cards: use company_characters folder
		return normalizeAssetPath(`public/company_characters/${item.id}_character.png`);
	}
	if (category === 'illegal') {
		// Illegal cards: use crime folder images (crime_ballas.png, etc.)
		// The image path is already set in the JSON, but we ensure it uses the crime folder
		if (item.image) {
			return normalizeAssetPath(item.image);
		}
		return normalizeAssetPath(`public/crime/crime_${item.id}.png`);
	}
	if (category === 'regelwerk') {
		return normalizeAssetPath(item.image || 'public/roots_nogo.png');
	}
	const fallback = `public/crime/${item.id}.png`;
	return normalizeAssetPath(item.image || fallback);
}

function getHeroCardLogo(item, category) {
	if (item?.placeholder) return '';
	if (category === 'legal') {
		// Legal cards: use company folder for logos
		return normalizeAssetPath(`public/company/${item.id}.png`);
	}
	return normalizeAssetPath(item.badge || item.image || '');
}

function getLayoutIndex(seed = '') {
	const value = seed || '';
	let sum = 0;
	for (let i = 0; i < value.length; i += 1) {
		sum += value.charCodeAt(i);
	}
	return sum % COLLAGE_LAYOUTS.length;
}

function escapeHtml(str = '') {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function formatParagraphs(text = '') {
	const trimmed = text.trim();
	if (!trimmed) return '';
	// Always combine all text into a single paragraph
	const singleParagraph = trimmed
		.replace(/\n{2,}/g, ' ')
		.replace(/\n/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return `<p>${escapeHtml(singleParagraph)}</p>`;
}

function createCollageItem(entry, category, index) {
	if (!entry) return null;
	if (entry.placeholder) return null;
	const id = entry.id || entry.slug || entry.displayName || entry.title;
	if (!id) return null;
	const title = CATEGORY_CONFIG[category]?.getTitle?.(entry) || id;
	const key = `${category}:${id}`;
	return {
		key,
		id,
		category,
		index,
		title,
		alt: title,
		image: getHeroCardImage(entry, category),
		logo: getHeroCardLogo(entry, category)
	};
}

function buildCompanyCollage(company) {
	const datasetRaw = getDataset('legal');
	const dataset = Array.isArray(datasetRaw) ? datasetRaw : [];
	const index = dataset.findIndex((entry) => entry?.id === company?.id);
	const featured = index >= 0 ? createCollageItem(dataset[index], 'legal', index) : null;
	const remainingLimit = MAX_COLLAGE_ITEMS;
	const others = buildSharedCollageItemsFromDataset({
		dataset,
		category: 'legal',
		excludeKey: featured?.key || null,
		limit: remainingLimit
	});
	return others.slice(0, MAX_COLLAGE_ITEMS);
}

function buildCrimeCollage(faction) {
	const datasetRaw = getDataset('illegal');
	const dataset = Array.isArray(datasetRaw) ? datasetRaw : [];
	const index = dataset.findIndex((entry) => entry?.id === faction?.id);
	const featured = index >= 0 ? createCollageItem(dataset[index], 'illegal', index) : null;
	const remainingLimit = MAX_COLLAGE_ITEMS;
	const others = buildSharedCollageItemsFromDataset({
		dataset,
		category: 'illegal',
		excludeKey: featured?.key || null,
		limit: remainingLimit
	});
	return others.slice(0, MAX_COLLAGE_ITEMS);
}

function buildRegelwerkCollage(item) {
	const datasetRaw = getDataset('regelwerk');
	const dataset = Array.isArray(datasetRaw) ? datasetRaw : [];
	const index = dataset.findIndex((entry) => entry?.id === item?.id);
	const featured = index >= 0 ? createCollageItem(dataset[index], 'regelwerk', index) : null;
	const remainingLimit = MAX_COLLAGE_ITEMS;
	const others = buildSharedCollageItemsFromDataset({
		dataset,
		category: 'regelwerk',
		excludeKey: featured?.key || null,
		limit: remainingLimit
	});
	return others.slice(0, MAX_COLLAGE_ITEMS);
}

function buildWhitelistCollage(item) {
	const datasetRaw = getDataset('whitelist');
	const dataset = Array.isArray(datasetRaw) ? datasetRaw : [];
	const index = dataset.findIndex((entry) => entry?.id === item?.id);
	const featured = index >= 0 ? createCollageItem(dataset[index], 'whitelist', index) : null;
	const remainingLimit = MAX_COLLAGE_ITEMS;
	const others = buildSharedCollageItemsFromDataset({
		dataset,
		category: 'whitelist',
		excludeKey: featured?.key || null,
		limit: remainingLimit
	});
	return others.slice(0, MAX_COLLAGE_ITEMS);
}

function buildSharedCollageItemsFromDataset({ dataset = [], category, excludeKey = null, limit = MAX_COLLAGE_ITEMS } = {}) {
	const pool = [];
	const seen = new Set();
	if (excludeKey) {
		seen.add(excludeKey);
	}

	if (!Array.isArray(dataset)) return pool;

	dataset.forEach((entry, idx) => {
		const item = createCollageItem(entry, category, idx);
		if (!item) return;
		if (seen.has(item.key)) return;
		seen.add(item.key);
		pool.push(item);
	});

	return shuffleArray(pool).slice(0, limit);
}

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
	return a + (b - a) * t;
}

function parseCompanyTitleParts(rawTitle = '', fallback = '') {
	const text = String(rawTitle || '').trim();
	if (!text) return { titleMain: '', tagline: '', fallback };
	const parts = text.split(/\s[–-]\s/);
	if (parts.length >= 2) {
		return { titleMain: parts[0].trim(), tagline: parts.slice(1).join(' - ').trim(), fallback };
	}
	return { titleMain: text, tagline: '', fallback };
}

// ==================== TAGLINE SCALING ====================

function scaleTaglineToFit(element) {
	if (!element) return;
	
	// Find the content-text container (parent of parent)
	const contentText = element.closest('.content-text');
	if (!contentText) return;
	
	// Account for padding
	const padding = 40; // Approximate padding from clamp(40px, 5vw, 56px)
	const maxWidth = contentText.clientWidth - (padding * 2) - 20; // Extra margin
	const maxFontSize = 22;
	const minFontSize = 10;
	
	// Reset to max size first
	element.style.fontSize = `${maxFontSize}px`;
	
	// Check if it fits
	if (element.scrollWidth <= maxWidth) {
		// It fits, use responsive sizing
		element.style.fontSize = '';
		return;
	}
	
	// Binary search for the right font size
	let low = minFontSize;
	let high = maxFontSize;
	let bestSize = minFontSize;
	
	for (let i = 0; i < 20; i++) {
		const mid = (low + high) / 2;
		element.style.fontSize = `${mid}px`;
		
		if (element.scrollWidth <= maxWidth) {
			bestSize = mid;
			low = mid + 0.5;
		} else {
			high = mid - 0.5;
		}
	}
	
	element.style.fontSize = `${bestSize}px`;
}

// ==================== NOGO TEXT AUTO-SIZING ====================

function autoSizeTextToFit(descriptionElement) {
	if (!descriptionElement) return;
	
	const card = descriptionElement.closest('.hero-card');
	const content = descriptionElement.closest('.hero-card__nogo-content');
	if (!card || !content) return;
	
	// Get available height: card height minus header and padding
	const header = descriptionElement.previousElementSibling;
	const headerHeight = header ? header.offsetHeight : 0;
	const cardHeight = card.offsetHeight;
	const contentPadding = parseFloat(getComputedStyle(content).paddingTop) + parseFloat(getComputedStyle(content).paddingBottom);
	const availableHeight = cardHeight - headerHeight - contentPadding - 20; // Extra margin for safety
	
	if (availableHeight <= 0) return;
	
	const maxFontSize = 32; // Max from clamp(18px, 2.8vw, 32px)
	const minFontSize = 16;
	
	// Reset to max size first to measure
	descriptionElement.style.fontSize = `${maxFontSize}px`;
	descriptionElement.style.overflow = 'visible';
	
	// Check if it fits
	if (descriptionElement.scrollHeight <= availableHeight) {
		// It fits, use responsive sizing
		descriptionElement.style.fontSize = '';
		return;
	}
	
	// Binary search for the right font size
	let low = minFontSize;
	let high = maxFontSize;
	let bestSize = minFontSize;
	
	for (let i = 0; i < 25; i++) {
		const mid = (low + high) / 2;
		descriptionElement.style.fontSize = `${mid}px`;
		
		// Small delay to ensure layout recalculation
		const currentHeight = descriptionElement.scrollHeight;
		
		if (currentHeight <= availableHeight) {
			bestSize = mid;
			low = mid + 0.3;
		} else {
			high = mid - 0.3;
		}
	}
	
	descriptionElement.style.fontSize = `${bestSize}px`;
	descriptionElement.style.overflow = 'visible';
}

// ==================== RESIZE HANDLER ====================

let resizeTimeout;
function handleResize() {
	clearTimeout(resizeTimeout);
	resizeTimeout = setTimeout(() => {
		const taglineEl = document.getElementById('detailTagline');
		if (taglineEl && taglineEl.style.display !== 'none') {
			scaleTaglineToFit(taglineEl);
		}
		
		// Re-auto-size nogo/whitelist description cards
		if (state.currentCategory === 'regelwerk' || state.currentCategory === 'whitelist') {
			const nogoDescriptions = document.querySelectorAll('.hero-card--regelwerk .hero-card__nogo-description, .hero-card--whitelist .hero-card__nogo-description');
			nogoDescriptions.forEach(desc => autoSizeTextToFit(desc));
		}
	}, 150);
}

window.addEventListener('resize', handleResize);

// ==================== STARTUP ====================

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}

