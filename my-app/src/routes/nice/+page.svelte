<!-- src/routes/result/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';

	type Pick = {
		id: string;
		title: string;
		asset: string; // normal image/gif url (on dessinera la première frame si gif => dépend du navigateur)
		corrupt: string; // unused here
	};

	let picks: Pick[] = [];
	let dateValue = ''; // yyyy-mm-dd
	let timeValue = ''; // hh:mm

	let canvasEl: HTMLCanvasElement | null = null;
	let previewUrl = '';

	const W = 1080;
	const H = 1920;

	onMount(() => {
		// Charger les 5 picks depuis localStorage (format exact de ton questionnaire)
		const raw = localStorage.getItem('cupid_picks');
		if (raw) {
			try {
				const arr = JSON.parse(raw);
				if (Array.isArray(arr)) {
					picks = arr.slice(0, 5).map((p: any, idx: number) => ({
						id: String(p?.id ?? `pick_${idx}`),
						title: String(p?.title ?? ''),
						asset: String(p?.asset ?? '/placeholder.png'),
						corrupt: String(p?.corrupt ?? '')
					}));
				}
			} catch {
				// ignore
			}
		}

		if (!picks.length) {
			// fallback
			picks = [
				{ id: 'a', title: '...', asset: '/placeholder.png', corrupt: '' },
				{ id: 'b', title: '...', asset: '/placeholder.png', corrupt: '' },
				{ id: 'c', title: '...', asset: '/placeholder.png', corrupt: '' },
				{ id: 'd', title: '...', asset: '/placeholder.png', corrupt: '' },
				{ id: 'e', title: '...', asset: '/placeholder.png', corrupt: '' }
			];
		}

		// Pré-remplir date/heure avec “maintenant + 1h” (optionnel)
		const now = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		const yyyy = now.getFullYear();
		const mm = pad(now.getMonth() + 1);
		const dd = pad(now.getDate());
		dateValue = `${yyyy}-${mm}-${dd}`;

		const plus1 = new Date(now.getTime() + 60 * 60 * 1000);
		timeValue = `${pad(plus1.getHours())}:${pad(plus1.getMinutes())}`;
	});

	function formatFrenchDate(dateStr: string) {
		// dateStr: yyyy-mm-dd
		try {
			const [y, m, d] = dateStr.split('-').map(Number);
			const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
			return dt.toLocaleDateString('fr-FR', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		} catch {
			return dateStr;
		}
	}

	function formatTime(t: string) {
		// "HH:MM" => "HHhMM"
		if (!t) return '';
		const [hh, mm] = t.split(':');
		return mm ? `${hh}h${mm}` : t;
	}

	function loadImage(src: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			// IMPORTANT : si tes images viennent d'autres domaines, ça peut "taint" le canvas.
			// Pour éviter ça : héberge-les dans /static (même origine) ou assure CORS.
			img.crossOrigin = 'anonymous';
			img.onload = () => resolve(img);
			img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
			img.src = src;
		});
	}

	function roundRect(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		r: number
	) {
		const radius = Math.min(r, w / 2, h / 2);
		ctx.beginPath();
		ctx.moveTo(x + radius, y);
		ctx.arcTo(x + w, y, x + w, y + h, radius);
		ctx.arcTo(x + w, y + h, x, y + h, radius);
		ctx.arcTo(x, y + h, x, y, radius);
		ctx.arcTo(x, y, x + w, y, radius);
		ctx.closePath();
	}

	async function generateAndDownload() {
		if (!canvasEl) return;

		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		canvasEl.width = W;
		canvasEl.height = H;

		// Fond gradient
		const grad = ctx.createLinearGradient(0, 0, W, H);
		grad.addColorStop(0, '#ff4da6'); // rose
		grad.addColorStop(0.55, '#8b5cf6'); // violet
		grad.addColorStop(1, '#0b0b10'); // sombre
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, W, H);

		// Vignette douce
		ctx.fillStyle = 'rgba(0,0,0,0.25)';
		ctx.fillRect(0, 0, W, H);

		// Carte centrale
		const cardX = 40;
		const cardY = 240;
		const cardW = W - 80;
		const cardH = 1200;

		ctx.save();
		ctx.globalAlpha = 0.92;
		ctx.fillStyle = 'rgba(20, 20, 28, 0.80)';
		roundRect(ctx, cardX, cardY, cardW, cardH, 42);
		ctx.fill();
		ctx.restore();

		// Petits “coeurs” décoratifs (simples cercles)
		for (let i = 0; i < 24; i++) {
			const x = 60 + Math.random() * (W - 120);
			const y = 60 + Math.random() * (H - 120);
			const r = 3 + Math.random() * 8;
			ctx.fillStyle = `rgba(255,255,255,${0.06 + Math.random() * 0.08})`;
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fill();
		}

		// Texte principal
		ctx.fillStyle = 'rgba(255,255,255,0.98)';
		ctx.textAlign = 'center';

		ctx.font = 'bold 92px system-ui, -apple-system, Segoe UI, Roboto, Arial';
		ctx.fillText('J’ai dit oui 💘', W / 2, cardY + 150);

		const dateFr = formatFrenchDate(dateValue);
		const timeFr = formatTime(timeValue);

		ctx.font = '600 48px system-ui, -apple-system, Segoe UI, Roboto, Arial';
		ctx.fillStyle = 'rgba(255,255,255,0.92)';
		ctx.fillText(`Retrouvons-nous le ${dateFr}`, W / 2, cardY + 240);
		ctx.fillText(`à ${timeFr}`, W / 2, cardY + 310);

		// Sous-texte
		ctx.font = '500 32px system-ui, -apple-system, Segoe UI, Roboto, Arial';
		ctx.fillStyle = 'rgba(255,255,255,0.75)';
		ctx.fillText(`(preuve officielle générée par Cupid.io)`, W / 2, cardY + 380);
		ctx.fillText(`(parlons aussi de mes intérêts :D)`, W / 2, cardY + 430);

		// --- TILES en "U" (ne chevauche pas le texte) ---
		const tile = 240;
		const pad = 34;
		const gap = 34;

		// ⚠️ Ajuste si besoin : plus grand = plus bas, donc + d’espace pour le texte
		const tilesStartY = cardY + 520;

		// Rangée du milieu (où seront 1 et 2)
		const rowMidY = tilesStartY;

		// Rangée du bas (où seront 3,5,4)
		const rowBottomY = tilesStartY + tile + gap;

		// X utiles
		let leftX = cardX + pad;
		let rightX = cardX + cardW - pad - tile;
		const centerX = cardX + (cardW - tile) / 2;

		// "U" mapping :
		// index 0 = intérêt 1 -> bas-gauche (rowMidY)
		// index 1 = intérêt 2 -> bas-droite (rowMidY)
		// index 2 = intérêt 3 -> rangée du bas gauche (rowBottomY) (un peu rapproché du centre)
		// index 3 = intérêt 4 -> rangée du bas droite (rowBottomY) (un peu rapproché du centre)
		// index 4 = intérêt 5 -> rangée du bas centre (rowBottomY)
		const innerOffset = 140; // rapproche 3 et 4 vers le centre (style "U")

		const tiles = [
			// intérêt 1
			{ x: leftX, y: rowMidY },

			// intérêt 2
			{ x: rightX, y: rowMidY },

			// intérêt 3 (bas gauche, plus proche du centre)
			{ x: leftX + innerOffset, y: rowBottomY },

			// intérêt 4 (bas droite, plus proche du centre)
			{ x: rightX - innerOffset, y: rowBottomY },

			// intérêt 5 (bas centre)
			{ x: centerX, y: rowBottomY }
		];

		// --- Hearts décoratifs ---
		const hearts = await Promise.allSettled([
			loadImage('heart1.webp'),
			loadImage('heart2.jpg'),
			loadImage('heart3.jpg')
		]);

		function drawHeart(
			img: HTMLImageElement,
			x: number,
			y: number,
			w: number,
			h: number,
			alpha = 0.9,
			rot = 0
		) {
			ctx.save();
			ctx.globalAlpha = alpha;
			ctx.translate(x + w / 2, y + h / 2);
			ctx.rotate(rot);
			ctx.drawImage(img, -w / 2, -h / 2, w, h);
			ctx.restore();
		}

		// Positions
		const heartSizeSide = 140;
		const heartSizeTop = 110;

		// gauche carte
		leftX = cardX - heartSizeSide / 2;
		const leftY = cardY + cardH * 0.45 - heartSizeSide / 2;

		// droite carte
		rightX = cardX + cardW - heartSizeSide / 2;
		const rightY = cardY + cardH * 0.42 - heartSizeSide / 2;

		// au-dessus du 5e intérêt
		const fifth = tiles[4];
		const topX = fifth.x + tile / 2 - heartSizeTop / 2;
		const topY = fifth.y - heartSizeTop - 18;

		// dessin
		if (hearts[0].status === 'fulfilled')
			drawHeart(hearts[0].value, leftX, leftY, heartSizeSide, heartSizeSide, 0.75, -0.18);
		if (hearts[1].status === 'fulfilled')
			drawHeart(hearts[1].value, rightX, rightY, heartSizeSide, heartSizeSide, 0.75, 0.22);
		if (hearts[2].status === 'fulfilled')
			drawHeart(hearts[2].value, topX, topY, heartSizeTop, heartSizeTop, 0.9, 0);

		// Dessiner les tiles (cadres) + images
		const imgs = await Promise.allSettled(picks.slice(0, 5).map((p) => loadImage(p.asset)));

		for (let i = 0; i < 5; i++) {
			const pos = tiles[i];
			const title = picks[i]?.title ?? '';
			const res = imgs[i];

			// cadre flou-like
			ctx.save();
			ctx.fillStyle = 'rgba(255,255,255,0.10)';
			roundRect(ctx, pos.x - 10, pos.y - 10, tile + 20, tile + 20, 32);
			ctx.fill();
			ctx.restore();

			// image (ou placeholder)
			ctx.save();
			roundRect(ctx, pos.x, pos.y, tile, tile, 26);
			ctx.clip();

			// fond tile
			ctx.fillStyle = 'rgba(0,0,0,0.25)';
			ctx.fillRect(pos.x, pos.y, tile, tile);

			if (res && res.status === 'fulfilled') {
				const img = res.value;
				// cover
				const scale = Math.max(tile / img.width, tile / img.height);
				const dw = img.width * scale;
				const dh = img.height * scale;
				const dx = pos.x + (tile - dw) / 2;
				const dy = pos.y + (tile - dh) / 2;
				ctx.drawImage(img, dx, dy, dw, dh);
			} else {
				// fallback visuel
				ctx.fillStyle = 'rgba(255,255,255,0.18)';
				ctx.fillRect(pos.x, pos.y, tile, tile);
			}

			ctx.restore();

			// label
			ctx.save();
			ctx.fillStyle = 'rgba(0,0,0,0.45)';
			roundRect(ctx, pos.x, pos.y + tile - 64, tile, 64, 20);
			ctx.fill();

			ctx.font = '700 26px system-ui, -apple-system, Segoe UI, Roboto, Arial';
			ctx.fillStyle = 'rgba(255,255,255,0.95)';
			ctx.textAlign = 'center';
			ctx.fillText(title, pos.x + tile / 2, pos.y + tile - 22);
			ctx.restore();
		}

		// Signature
		ctx.save();
		ctx.fillStyle = 'rgba(255,255,255,0.65)';
		ctx.font = '600 28px system-ui, -apple-system, Segoe UI, Roboto, Arial';
		ctx.textAlign = 'center';
		ctx.fillText('Ramène des fleurs surtout ! 💐', W / 2, cardY + cardH - 40);
		ctx.restore();

		// Preview + download
		const dataUrl = canvasEl.toDataURL('image/png');
		previewUrl = dataUrl;

		const a = document.createElement('a');
		a.href = dataUrl;
		a.download = 'cupid-oui.png';
		a.click();
	}
</script>

<div
	class="relative min-h-screen w-full overflow-x-hidden overflow-y-auto bg-gradient-to-br from-pink-600 via-fuchsia-800 to-gray-950"
>
	<div class="pointer-events-none fixed inset-0 bg-black/35"></div>

	<div class="relative z-10 flex min-h-screen items-start justify-center px-3 py-10 sm:px-6">
		<div
			class="w-full max-w-3xl rounded-3xl bg-gray-900/75 p-6 pb-10 text-center shadow-2xl backdrop-blur sm:p-10"
		>
			<h1 class="mb-3 text-4xl font-extrabold text-white sm:text-5xl">💘 Résultat</h1>
			<p class="mb-10 text-base text-gray-200 sm:text-lg">
				Rentre une date et une heure, puis télécharge ton screen “J’ai dit oui”.
			</p>

			<div class="mx-auto mb-8 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
				<label class="text-left">
					<span class="mb-2 block text-sm font-semibold text-gray-200">Date</span>
					<input
						type="date"
						bind:value={dateValue}
						class="w-full rounded-xl bg-black/30 px-4 py-3 text-white ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-pink-400"
					/>
				</label>

				<label class="text-left">
					<span class="mb-2 block text-sm font-semibold text-gray-200">Heure</span>
					<input
						type="time"
						bind:value={timeValue}
						class="w-full rounded-xl bg-black/30 px-4 py-3 text-white ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-pink-400"
					/>
				</label>
			</div>

			<button
				class="mx-auto mb-8 block w-full max-w-xl rounded-2xl bg-pink-500 px-6 py-4 text-xl font-extrabold text-white shadow-lg transition hover:scale-[1.01] hover:bg-pink-600"
				on:click={generateAndDownload}
			>
				Valider & Télécharger 📸
			</button>

			<!-- Canvas “hors écran” mais dispo -->
			<canvas bind:this={canvasEl} class="hidden"></canvas>

			{#if previewUrl}
				<div class="mt-6">
					<p class="mb-3 text-sm font-semibold text-gray-200/80">Aperçu :</p>
					<img
						src={previewUrl}
						alt="Aperçu du screen"
						class="mx-auto max-h-[420px] w-auto rounded-2xl shadow-2xl ring-1 ring-white/10"
						draggable="false"
					/>
				</div>
			{/if}
		</div>
	</div>
</div>
