const HERO_RANDOM_MAX_STEPS = 12;
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
				return { type: 'video', youtubeId: item.videos[0].youtubeId };
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
			if (item.videoId) {
				return { type: 'video', youtubeId: item.videoId };
			}
			if (item.image) {
				return { type: 'image', src: normalizeAssetPath(item.image), alt: item.title || 'Crew' };
			}
			return null;
		},
		buildCollage: buildCrimeCollage
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

const RANDOM_CHARACTER_IMAGES = Array.from({ length: 100 }, (_, index) => `public/characters_random/${index + 1}.png`);

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
		const [companies, crime] = await Promise.all([
			fetch('content/companies.json').then((r) => r.json()),
			fetch('content/crime-factions.json').then((r) => r.json())
		]);

		state.companies = (companies.companies || []).filter(Boolean);
		state.crimeFactions = (crime.factions || []).filter(Boolean);

		// Inject a shuffling placeholder card at the front of the illegal rail
		const illegalMysteryCard = {
			id: 'underworld-mystery',
			title: '???',
			placeholder: true,
			placeholderText: 'Wähle dein Syndikat',
			placeholderVariant: 'illegal-mystery'
		};
		state.crimeFactions = [illegalMysteryCard, ...state.crimeFactions];

		// Inject a non-interactive placeholder card at the front of the legal rail
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
		track.appendChild(createHeroCard(item, index, category));
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
	focusHeroRailIndex(initialIndex, { smooth: false, align: initialAlign });
	setupHeroRailControls();
}

function createHeroCard(item, index, category) {
	const card = document.createElement('button');
	card.type = 'button';
	const isPlaceholder = !!(item && item.placeholder === true);
	card.className = 'hero-card' + (category === 'illegal' ? ' hero-card--illegal' : '') + (isPlaceholder ? ' hero-card--placeholder' : '');
	card.dataset.index = String(index);
	card.dataset.category = category;

	const imageSrc = getHeroCardImage(item, category);
	const logoSrc = getHeroCardLogo(item, category);
	// For illegal, use the thumbnail image as backdrop; for legal, use the company logo
	const logoValue = category === 'illegal' ? `url('${imageSrc}')` : (logoSrc ? `url('${logoSrc}')` : '');
	const title = CATEGORY_CONFIG[category].getTitle(item);

	card.setAttribute('aria-label', isPlaceholder ? '' : `${title} öffnen`);
	if (logoValue) {
		card.style.setProperty('--card-logo', logoValue);
	}

	const placeholderText = isPlaceholder
		? (item?.placeholderText || (category === 'illegal' ? 'Wähle dein Syndikat' : 'Dich'))
		: '';

	const buildIllegalPlaceholder = () => {
		const pool = RANDOM_CHARACTER_IMAGES.slice();
		for (let i = pool.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[pool[i], pool[j]] = [pool[j], pool[i]];
		}
		const faceCount = 12;
		const faces = pool.slice(0, faceCount);
		const grid = faces
			.map((src) => {
				const alt = getCharacterAltFromSrc(src);
				return `
					<div class="illegal-placeholder__cell">
						<img class="illegal-placeholder__image" src="${src}" alt="${escapeHtml(alt)}" loading="lazy" aria-hidden="true">
					</div>
				`;
			})
			.join('');

		return `
			<span class="hero-card__backdrop" aria-hidden="true"></span>
			<div class="illegal-placeholder">
				<div class="illegal-placeholder__stage">
					<div class="illegal-placeholder__grid" data-count="${faces.length}">${grid}</div>
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
		mainContentHtml = `
			<span class="hero-card__backdrop" aria-hidden="true"></span>
			<img class="hero-card__image" src="${imageSrc}" alt="${escapeHtml(title)}" loading="lazy">
		`;
	}

	card.innerHTML = `
		${mainContentHtml}
		<span class="hero-card__footer">${isPlaceholder ? '' : 'Zum Öffnen klicken'}</span>
	`;

	// Add interactive grid splitting effect for placeholder card
	if (isPlaceholder) {
		card.style.setProperty('--card-logo', 'none');
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
			const randomImage = () => {
				const src = pickRandomCharacterImage();
				return { src, alt: getCharacterAltFromSrc(src) };
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
				let step = 0;
				const spin = () => {
					getImages().forEach((img) => {
						const { src, alt } = randomImage();
						img.src = src;
						img.alt = alt;
					});
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
		const getRandomCharacterImage = () => pickRandomCharacterImage();
		const getRandomCharacterAlt = (src) => getCharacterAltFromSrc(src);

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
				let step = 0;
				const spin = () => {
					const allImgs = Array.from(card.querySelectorAll('.split-panel__image'));
					allImgs.forEach((img) => {
						const src = getRandomCharacterImage();
						img.src = src;
						img.alt = getRandomCharacterAlt(src);
					});
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
				const characterSrc = getRandomCharacterImage();
				const characterAlt = getRandomCharacterAlt(characterSrc);
				panel.innerHTML = `
					<span class="split-panel__backdrop"></span>
					<img class="split-panel__image" src="${characterSrc}" alt="${characterAlt}" loading="lazy">
				`;
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
		targetLeft = Math.max(0, card.offsetLeft);
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
					tagHeroCard(index, 'hero-card--random-lock', 1120);
					document.body.classList.add('is-random-lock');
					const revealTimeout = setTimeout(() => {
						document.body.classList.remove('is-random-rolling');
						document.body.classList.add('is-random-reveal');
						highlightHeroCard(index);
						setTimeout(() => document.body.classList.remove('is-random-reveal'), 900);
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

function spawnFloatingLogos() {
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

	const pool = shuffleArray(RANDOM_CHARACTER_IMAGES.slice());
	let cursor = 0;
	const pullNextImage = () => {
		if (cursor >= pool.length) {
			shuffleArray(pool);
			cursor = 0;
		}
		const src = pool[cursor++];
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
		window.addEventListener('resize', debounce(() => spawnFloatingLogos(), 500));
		spawnFloatingLogos._resizeBound = true;
	}
}

function handleCardTiltMove(e) {
	const cards = document.querySelectorAll('.hero-card');
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
	if (target && target.classList && target.classList.contains('hero-card')) {
		target.style.setProperty('--tiltX', '0deg');
		target.style.setProperty('--tiltY', '0deg');
		return;
	}
	document.querySelectorAll('.hero-card').forEach((card) => {
		card.style.setProperty('--tiltX', '0deg');
		card.style.setProperty('--tiltY', '0deg');
	});
}

// Hold-to-open removed; function kept as a no-op to preserve references
function attachHoldHandler() {}

// ==================== DETAIL OVERLAY ====================

function openDetail(category, index) {
	const config = CATEGORY_CONFIG[category];
	if (!config) return;

	const dataset = config.getDataset();
	if (!dataset || dataset.length === 0) return;

	const safeIndex = Math.max(0, Math.min(dataset.length - 1, index));
	const item = dataset[safeIndex];
	if (!item) return;

	state.currentCategory = category;
	state.currentIndex = safeIndex;

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
	const contentEl = document.getElementById('detailContent');

	if (titleEl) titleEl.textContent = config.getTitle(item);
	if (taglineEl) taglineEl.textContent = config.getTagline(item);
	if (contentEl) contentEl.innerHTML = formatParagraphs(config.getContent(item));

	renderDetailMedia(item, category);

    const collageItems = config.buildCollage(item, category);
    renderDetailCollage(collageItems, item.id || config.getTitle(item), item, category);
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
			title: config.getTitle(item)
		});
	} else if (media.type === 'image' && media.src) {
		const img = document.createElement('img');
		img.src = media.src;
		img.alt = media.alt || config.getTitle(item);
		img.loading = 'lazy';
		img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
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

function mountDetailVideoPlayer({ youtubeId, title }) {
	const container = document.getElementById('detailMedia');
	if (!container || !youtubeId) return;

	const host = document.createElement('div');
	host.className = 'detail-video-player__host';
	const hostId = `detailVideoPlayer_${youtubeId}_${Math.random().toString(36).slice(2, 9)}`;
	host.id = hostId;

	container.appendChild(host);
	const controls = buildDetailVideoControls();
	container.appendChild(controls.element);

	const detailVideoState = {
		player: null,
		playerHost: host,
		wrapper: container,
		currentVideoId: youtubeId,
		currentTitle: title || '',
		hideTimer: null,
		handlers: null,
		controls,
		lastVolume: 60,
		isMuted: true
	};

	state.detailVideo = detailVideoState;
	wireDetailVideoControls(detailVideoState);

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

function buildDetailVideoControls() {
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
	muteIcon.textContent = '🔇';
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
	volumeSlider.setAttribute('aria-label', 'Lautstärke');

	volumeWrapper.append(volumeSlider);
	element.append(muteBtn, volumeWrapper);

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
		if (controls.volumeSlider) controls.volumeSlider.value = String(clamped);
		if (clamped > 0) {
			detailVideoState.lastVolume = clamped;
		}
	}

	const isMuted = typeof muted === 'boolean' ? muted : Number(controls.volumeSlider?.value || 0) === 0;
	if (controls.muteIcon) controls.muteIcon.textContent = isMuted ? '🔇' : '🔊';
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
	const nav = document.getElementById('crimeNav');
	if (!nav) return;

	if (!dataset || dataset.length <= 1) {
		nav.hidden = true;
		return;
	}

	nav.hidden = false;
	const total = dataset.length;
	const index = state.currentIndex;
	const prevIndex = (index - 1 + total) % total;
	const nextIndex = (index + 1) % total;

	const counter = document.getElementById('crimeNavCounter');
	const nextTitle = document.getElementById('crimeNavNextTitle');
	const prevTitle = document.getElementById('crimeNavPrevTitle');
	const statusLabel = document.getElementById('crimeNavStatusLabel');
	const prevBtn = document.getElementById('crimePrev');
	const nextBtn = document.getElementById('crimeNext');

	if (counter) counter.textContent = `${index + 1} / ${total}`;
	if (nextTitle) nextTitle.textContent = CATEGORY_CONFIG[state.currentCategory].getTitle(dataset[nextIndex]);
	if (prevTitle) prevTitle.textContent = CATEGORY_CONFIG[state.currentCategory].getTitle(dataset[prevIndex]);
	if (statusLabel) statusLabel.textContent = 'Weiter zu';
	if (prevBtn) prevBtn.dataset.target = String(prevIndex);
	if (nextBtn) nextBtn.dataset.target = String(nextIndex);
}

function navigateDetail(direction = 1) {
	const dataset = getDataset(state.currentCategory);
	if (!dataset || dataset.length === 0) return;
	const nextIndex = (state.currentIndex + direction + dataset.length) % dataset.length;
	openDetail(state.currentCategory, nextIndex);
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

		// For polaroid or mirror layout, don't add marginTop, let it flow naturally
		if (collage.dataset.layoutMode === 'polaroids' || collage.dataset.layoutMode === 'mirror') {
			collage.style.marginTop = '0px';
		} else {
			collage.style.marginTop = `${offsetTop}px`;
		}
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

        const {
                category = state.currentCategory,
                heroImage = '',
                heroLogo = '',
                title = '',
                tagline = ''
        } = context;

        container.dataset.category = category;
        container.classList.toggle('detail-hero-mirror--illegal', category === 'illegal');
        container.classList.toggle('detail-hero-mirror--legal', category !== 'illegal');

        const stripesHost = document.createElement('div');
        stripesHost.className = 'detail-hero-mirror__stripes';
        container.appendChild(stripesHost);

        // Background character lines (reuse floating logo stripes but scoped here)
        const stripeConfigs = [
                { modifier: 'bg-polaroid-stripe--mirror-back', count: 18, rotate: '26deg', duration: '138s', delay: '-18s', top: '-34%', right: '74%', zIndex: 1, curve: -1.1 },
                { modifier: 'bg-polaroid-stripe--mirror-mid-left', count: 16, rotate: '22deg', duration: '124s', delay: '-32s', top: '-18%', right: '58%', zIndex: 2, curve: -0.4 },
                { modifier: 'bg-polaroid-stripe--mirror-center', count: 18, rotate: '18deg', duration: '116s', delay: '-46s', top: '-24%', right: '38%', zIndex: 3, curve: 0.1 },
                { modifier: 'bg-polaroid-stripe--mirror-mid-right', count: 16, rotate: '20deg', duration: '128s', delay: '-58s', top: '-12%', right: '22%', zIndex: 2, curve: 0.9 },
                { modifier: 'bg-polaroid-stripe--mirror-front', count: 14, rotate: '16deg', duration: '142s', delay: '-72s', top: '4%', right: '8%', zIndex: 4, curve: 1.4 }
        ];

        const pool = RANDOM_CHARACTER_IMAGES.slice();
        // Shuffle pool
        for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        let cursor = 0;
        const pullNextImage = () => {
                if (cursor >= pool.length) {
                        // reshuffle and wrap
                        for (let i = pool.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [pool[i], pool[j]] = [pool[j], pool[i]];
                        }
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
                stripe.style.setProperty('--bg-stripe-rotate', `-${config.rotate}`); // mirror angle
                if (typeof config.top === 'string') stripe.style.top = config.top;
                if (typeof config.right === 'string') stripe.style.right = config.right;
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
                        polaroids.push(createPolaroid(emphasis, curveOffset));
                }
                polaroids.forEach((n) => inner.appendChild(n));
                polaroids.forEach((n) => inner.appendChild(n.cloneNode(true)));
                stripe.appendChild(inner);
                stripesHost.appendChild(stripe);
        });

        const foreground = document.createElement('div');
        foreground.className = 'detail-hero-mirror__foreground';
        container.appendChild(foreground);

        const heroCard = document.createElement('article');
        heroCard.className = `detail-hero-card detail-hero-card--${category === 'illegal' ? 'illegal' : 'legal'}`;
        heroCard.dataset.category = category;

        const cardBackdrop = document.createElement('span');
        cardBackdrop.className = 'detail-hero-card__backdrop';
        cardBackdrop.setAttribute('aria-hidden', 'true');
        heroCard.appendChild(cardBackdrop);

        if (heroImage) {
                const image = document.createElement('img');
                image.className = 'detail-hero-card__image';
                image.src = heroImage;
                image.alt = title ? `${title} – Charaktervisualisierung` : '';
                image.loading = 'lazy';
                image.decoding = 'async';
                heroCard.appendChild(image);
        }

        const emblem = document.createElement('span');
        emblem.className = 'detail-hero-card__emblem';
        emblem.setAttribute('aria-hidden', 'true');
        heroCard.appendChild(emblem);

        if (heroLogo) {
                const logo = document.createElement('img');
                logo.className = 'detail-hero-card__logo';
                logo.src = heroLogo;
                logo.alt = title ? `${title} Logo` : 'Logo';
                logo.loading = 'lazy';
                logo.decoding = 'async';
                heroCard.appendChild(logo);
        }

        const overlay = document.createElement('div');
        overlay.className = 'detail-hero-card__overlay';

        const overlayLabel = document.createElement('span');
        overlayLabel.className = 'detail-hero-card__label';
        overlayLabel.textContent = category === 'illegal' ? 'Illegaler Weg' : 'Legaler Weg';
        overlay.appendChild(overlayLabel);

        const overlayTitle = document.createElement('h3');
        overlayTitle.className = 'detail-hero-card__title';
        overlayTitle.textContent = title || 'Roots Roleplay';
        overlay.appendChild(overlayTitle);

        if (tagline) {
                const overlaySubtitle = document.createElement('p');
                overlaySubtitle.className = 'detail-hero-card__subtitle';
                overlaySubtitle.textContent = tagline;
                overlay.appendChild(overlaySubtitle);
        }

        heroCard.appendChild(overlay);
        foreground.appendChild(heroCard);

        const cta = document.createElement('section');
        cta.className = 'detail-hero-cta';

        const taglineGroup = document.createElement('div');
        taglineGroup.className = 'detail-hero-cta__tagline';

        const accent = document.createElement('span');
        accent.className = 'detail-hero-cta__accent';
        accent.textContent = category === 'illegal' ? 'ILLEGALER WEG' : 'LEGALER WEG';
        taglineGroup.appendChild(accent);

        const titleEl = document.createElement('h3');
        titleEl.className = 'detail-hero-cta__title';
        titleEl.textContent = title || 'Wähle deinen Weg';
        taglineGroup.appendChild(titleEl);

        cta.appendChild(taglineGroup);

        const description = document.createElement('p');
        description.className = 'detail-hero-cta__description';
        description.textContent = tagline || 'Finde deinen Platz auf Roots Roleplay – vom ersten Job bis zur großen Geschichte.';
        cta.appendChild(description);

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'hero-choice detail-hero-cta__buttons';

        const buttonConfigs = [
                { label: 'Legal', choice: 'legal', className: '' },
                { label: 'Illegal', choice: 'illegal', className: 'hero-choice__btn--illegal' },
                { label: 'Regelwerk', link: 'https://rootsroleplay.de/regelwerk', className: 'hero-choice__btn--rules' },
                { label: 'Whitelist', link: 'https://rootsroleplay.de/whitelist', className: 'hero-choice__btn--whitelist' }
        ];

        buttonConfigs.forEach((config) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `hero-choice__btn ${config.className || ''}`.trim();
                button.textContent = config.label;
                if (config.choice) {
                        button.dataset.choice = config.choice;
                }
                if (config.link) {
                        button.dataset.link = config.link;
                }
                wireChoiceButton(button, { autoOpenDetail: false });
                buttonGroup.appendChild(button);
        });

        cta.appendChild(buttonGroup);
        foreground.appendChild(cta);
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

    const pool = shuffleArray(RANDOM_CHARACTER_IMAGES.slice());
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

function normalizeAssetPath(path = '') {
	if (!path) return '';
	if (/^https?:\/\//i.test(path)) return path;
	const trimmed = String(path).replace(/^\/+/, '');
	return `/${trimmed}`;
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
		return normalizeAssetPath(`public/characters/${item.id}_character.png`);
	}
	const fallback = `public/crime/${item.id}.png`;
	return normalizeAssetPath(item.image || fallback);
}

function getHeroCardLogo(item, category) {
	if (item?.placeholder) return '';
	if (category === 'legal') {
		return normalizeAssetPath(`public/service-app/${item.id}.png`);
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
	return trimmed
		.split(/\n{2,}/)
		.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
		.join('');
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

// ==================== STARTUP ====================

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
