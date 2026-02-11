<!-- src/routes/the-question/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { fadeOutMusic } from '$lib/audio';

	let stoppedBgMusic = false;

	type Pick = {
		id: string;
		title: string;
		asset: string; // normal (string URL)
		corrupt: string; // cursed (string URL)
	};

	type Mode = 'ask' | 'corrupt' | 'yes' | 'blackout';
	type BlackoutPhase = 'dark' | 'eyes' | 'foxy';

	let mode: Mode = 'ask';

	// Picks venant du questionnaire (exactement ton format localStorage)
	let picks: Pick[] = [];

	// corruption 0..5 (1 par clic NON en mode corrupt)
	let corruptedCount = 0;
	let isAdvancing = false;

	// message “réaction”
	let message = '';
	let showMessage = false;

	// audio
	let isMuted = false;
	let humAudio: HTMLAudioElement | null = null;

	// blackout phases
	let blackoutPhase: BlackoutPhase = 'dark';
	let blackoutT1: number | null = null;
	let blackoutT2: number | null = null;
	let blackoutT3: number | null = null;

	// positions: 4 coins + bas-centre (comme avant)
	const POS = [
		'absolute top-3 left-3 sm:top-6 sm:left-6',
		'absolute top-3 right-3 sm:top-6 sm:right-6',
		'absolute bottom-3 left-3 sm:bottom-6 sm:left-6',
		'absolute bottom-3 right-3 sm:bottom-6 sm:right-6',
		'absolute bottom-3 left-1/2 -translate-x-1/2 sm:bottom-6'
	] as const;

	const noLines = [
		'…t’es sûr ?',
		'Relis bien ce que tu viens de faire.',
		'Ok. On va y aller doucement.',
		'Tu veux vraiment choisir ça ?',
		'Encore une fois.'
	];

	const corruptLines = [
		"Ṭ̵̏̈ǔ̷̙ ̸̟̈p̶̼̟͋͝e̵̘͆ư̸̧x̶̛͚̏ ̷̦́è̵̩̺ṇ̵͋͛c̷͖͂̈o̷͉̥̍͋r̴̢̂ë̸̲̕ ̵͙͓͐c̵̥͑͗h̴̞͔̾a̴͕͘͝ñ̸͈̻̉g̷̭̍ĕ̸͔̣r̸͎͎̔̏ ̵̣̋͝d̸͓͠'̸̯̓å̴̛̯v̴̦̂í̶̠s̷̛͆ͅ.̷̼͌",
		'L̶̪̤̇e̷̩͗ ̵̨̹̆̌b̸̩́̎õ̶͙ṷ̸͕̔͝ẗ̸̹́͋ŏ̴̬͈ṉ̶̏̇ ̴̠̍̉O̷͈̰̾͌Ŭ̴̙̖̕I̷̬̙̓͠ ̵̘̺͊̈́e̶̤̭͐s̶̡̆̓t̵̼͊ ̶̰̱̐j̵̝͂u̶͔̩͆͝s̶̬̕t̷̠̔e̵͍̼͂͝ ̴̟̂̊l̴͚̽̀à̴̻͔̍̉.̶͍̰̒͌',
		'P̵̩̺̍̚ö̴̙́u̶͔̣͋r̸̋̄͜q̷̡̛̖û̶̫o̵̹͝ï̷̧ ̴̨̊t̷͑͜ͅṵ̷̄ ̴̯͉̏f̸̯̯̚ả̵̫̚i̸͓̾̽s̴̮͂ ̸̭͗͝ç̴̡̅̿ă̷̙͛ ̴̹̐̚?̶̭̉͗',
		'Ç̵̩̍a̴͍̋ ̸͙͇͠n̶̯͛ę̴̫͋͂ ̸̪̪͐̀s̷̻̑ ̶͍̓͛a̴̯͔͆r̵̫̭̿r̶͇͒ê̶͚͊t̷̢́ê̸̮̼r̵̯̋a̸̙̪̿̈ ̵̩̿͂p̶̜̐́ḁ̷͙̿s̵̺̩̋.̵͎̙̚͠'
	];

	function rand<T>(arr: T[]) {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	function showTempMessage(txt: string, ms = 1200) {
		message = txt;
		showMessage = true;
		window.setTimeout(() => (showMessage = false), ms);
	}

	function glitchify(text: string, level: number) {
		const noise = ['#', '%', '&', '@', '*', '⧗', '⟟', '⟁', '⧫', '⨂', '⨁', '⫷', '⫸', '█'];
		const chars = text.split('');
		const swaps = Math.floor(chars.length * level * 0.35);
		for (let i = 0; i < swaps; i++) {
			const idx = Math.floor(Math.random() * chars.length);
			chars[idx] = noise[Math.floor(Math.random() * noise.length)];
		}
		if (level > 0.55) chars.push(' ', noise[Math.floor(Math.random() * noise.length)]);
		return chars.join('');
	}

	function pickSrc(p: Pick, idx: number) {
		// picks 0..(corruptedCount-1) sont corrompus
		const isCorrupted = idx < corruptedCount;
		return isCorrupted && p.corrupt ? p.corrupt : p.asset;
	}

	// thème global selon corruptedCount (fond qui se dégrade)
	$: themeClass =
		corruptedCount === 0
			? 'bg-gradient-to-br from-pink-600 via-fuchsia-800 to-gray-950'
			: corruptedCount === 1
				? 'bg-gradient-to-br from-fuchsia-800 via-purple-950 to-gray-950'
				: corruptedCount === 2
					? 'bg-gradient-to-br from-purple-950 via-gray-950 to-black'
					: corruptedCount === 3
						? 'bg-gradient-to-br from-gray-950 via-black to-black'
						: corruptedCount === 4
							? 'bg-gradient-to-br from-black via-black to-black'
							: 'bg-black';

	// “jeu” sur les boutons pendant corruption
	$: yesScale = mode === 'corrupt' ? 1 + corruptedCount * 0.18 : 1;
	$: yesNudgeY = mode === 'corrupt' ? -corruptedCount * 10 : 0;
	$: yesGlow = mode === 'corrupt' ? 0.25 + corruptedCount * 0.12 : 0.22;

	$: noScale = mode === 'corrupt' ? Math.max(0.72, 1 - corruptedCount * 0.08) : 1;
	$: noOpacity = mode === 'corrupt' ? Math.max(0.25, 1 - corruptedCount * 0.18) : 1;

	$: titleText =
		mode === 'ask'
			? 'THE question'
			: mode === 'corrupt'
				? glitchify('THE question', Math.min(1, corruptedCount / 5))
				: mode === 'yes'
					? '💘'
					: '';

	$: questionText =
		mode === 'ask'
			? 'Est-ce que tu accepterais un date avec moi ?'
			: mode === 'corrupt'
				? glitchify('… tu ne veux vraiment pas sortir avec moi ?', Math.min(1, corruptedCount / 5))
				: mode === 'yes'
					? "Ok… t'as dit oui."
					: '';

	function toggleMute() {
		isMuted = !isMuted;
		if (humAudio) {
			if (isMuted) humAudio.pause();
			else humAudio.play().catch(() => {});
		}
	}

	async function onYes() {
		mode = 'yes';
		if (humAudio) humAudio.pause();
		clearBlackoutTimers();
		await goto('/nice');
	}

	function onNo() {
		if (!stoppedBgMusic) {
			stoppedBgMusic = true;
			fadeOutMusic(100); // fondu doux
		}
		// Premier NON -> on entre en corruption (step-by-step ensuite)
		if (mode === 'ask') {
			mode = 'corrupt';
			showTempMessage(rand(noLines), 1400);
			return;
		}
		// En mode corruption, chaque clic NON avance d'1 niveau
		advanceCorruption();
	}

	async function advanceCorruption() {
		if (isAdvancing || mode !== 'corrupt') return;
		isAdvancing = true;

		showTempMessage(rand(corruptLines), 1100);
		await new Promise((r) => window.setTimeout(r, 650));

		corruptedCount = Math.min(5, corruptedCount + 1);

		// audio à partir d'un certain niveau (si pas muté)
		if (corruptedCount >= 5 && !isMuted && humAudio) {
			humAudio.volume = 0.55;
			humAudio.play().catch(() => {});
		}

		// fin -> blackout
		if (corruptedCount >= 5) {
			await new Promise((r) => window.setTimeout(r, 900));
			mode = 'blackout';
			startBlackoutSequence();
		}

		isAdvancing = false;
	}

	function clearBlackoutTimers() {
		if (blackoutT1) window.clearTimeout(blackoutT1);
		if (blackoutT2) window.clearTimeout(blackoutT2);
		if (blackoutT3) window.clearTimeout(blackoutT3);
		blackoutT1 = null;
		blackoutT2 = null;
		blackoutT3 = null;
	}

	function startBlackoutSequence() {
		clearBlackoutTimers();
		blackoutPhase = 'dark';

		// 1) 5 secondes: noir total
		blackoutT1 = window.setTimeout(() => {
			blackoutPhase = 'eyes';

			// 2) 24 secondes: yeux
			blackoutT2 = window.setTimeout(() => {
				blackoutPhase = 'foxy';

				// 3) FOXY pendant X secondes, puis /result
				blackoutT3 = window.setTimeout(async () => {
					await goto('/result');
				}, 3000); // <-- durée du jumpscare (3s).
			}, 5_700);
		}, 5_000);
	}

	onMount(() => {
		// Récupération EXACTE de ton localStorage (format de ton code)
		const raw = localStorage.getItem('cupid_picks');
		if (raw) {
			try {
				const arr = JSON.parse(raw);
				if (Array.isArray(arr)) {
					picks = arr.slice(0, 5).map((p: any, idx: number) => ({
						id: String(p?.id ?? `pick_${idx}`),
						title: String(p?.title ?? '...'),
						asset: String(p?.asset || '/placeholder.png'),
						corrupt: String(p?.corrupt || '')
					}));
				}
			} catch {
				// ignore
			}
		}

		// fallback si pas de picks
		if (!picks.length) {
			picks = [
				{ id: 'a', title: 'un truc', asset: '/placeholder.png', corrupt: '/placeholder.png' },
				{ id: 'b', title: 'un autre truc', asset: '/placeholder.png', corrupt: '/placeholder.png' },
				{ id: 'c', title: 'encore', asset: '/placeholder.png', corrupt: '/placeholder.png' },
				{ id: 'd', title: '...', asset: '/placeholder.png', corrupt: '/placeholder.png' },
				{ id: 'e', title: '...', asset: '/placeholder.png', corrupt: '/placeholder.png' }
			];
		}

		// audio (mets tes fichiers dans static/)
		humAudio = new Audio('/hum-creepy.m4a');
		humAudio.loop = true;

		return () => {
			clearBlackoutTimers();
			if (humAudio) humAudio.pause();
		};
	});
</script>

<!-- Full screen, no scroll, thème évolutif -->
<div
	class={'relative h-screen w-screen overflow-hidden ' +
		(mode === 'blackout' ? 'bg-black' : themeClass)}
>
	<!-- vignette (pas en blackout) -->
	{#if mode !== 'blackout'}
		<div class="pointer-events-none absolute inset-0 z-0 bg-black/35"></div>
	{/if}

	<!-- message “réaction” -->
	{#if showMessage}
		<div
			in:fade={{ duration: 120 }}
			class="absolute top-10 left-1/2 z-40 -translate-x-1/2 rounded-2xl bg-black/55 px-6 py-4 text-center text-xl font-bold text-white backdrop-blur"
		>
			{message}
		</div>
	{/if}

	<!-- Intérêts : mêmes positions que le questionnaire -->
	{#if mode !== 'blackout'}
		<div class="absolute inset-0 z-10">
			{#each picks as p, idx (p.id)}
				<div class={POS[idx]}>
					<div
						class={'rounded-2xl bg-white/10 p-2 shadow-2xl backdrop-blur ' +
							(idx < corruptedCount ? 'ring-2 ring-red-500/30' : '')}
					>
						{#key idx < corruptedCount ? `c-${p.id}-${corruptedCount}` : `n-${p.id}`}
							<img
								in:fade={{ duration: 240 }}
								src={pickSrc(p, idx)}
								alt={p.title}
								class={'h-20 w-20 rounded-xl object-cover select-none sm:h-36 sm:w-36 md:h-44 md:w-44' +
									(idx < corruptedCount ? 'contrast-125 saturate-50' : '')}
								draggable="false"
							/>
						{/key}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Centre: question + boutons (ask/corrupt/yes) -->
	{#if mode === 'ask' || mode === 'corrupt' || mode === 'yes'}
		<div
			class="relative z-20 flex h-full items-center justify-center px-3 pt-6 sm:items-center sm:px-6 sm:pt-0"
		>
			<div
				class="w-[95%] max-w-2xl rounded-2xl bg-gray-900/80 p-4 text-center shadow-2xl backdrop-blur sm:w-full sm:rounded-3xl sm:p-10"
			>
				<h1 class="mb-2 text-2xl font-extrabold text-white sm:mb-4 sm:text-5xl">
					{titleText}
				</h1>

				<p
					class="mx-auto mb-6 max-w-xl text-lg leading-snug font-semibold text-white sm:mb-10 sm:text-3xl"
				>
					{questionText}
				</p>

				{#if mode !== 'yes'}
					<div class="flex flex-col gap-4 sm:flex-row sm:justify-center">
						<!-- OUI qui devient “tentant” pendant la corruption -->
						<button
							class="mx-auto w-full max-w-xs rounded-xl bg-pink-500 px-5 py-3 text-base font-extrabold text-white shadow-lg transition hover:scale-[1.02] hover:bg-pink-600 sm:rounded-2xl sm:px-8 sm:py-4 sm:text-2xl"
							style={`transform: translateY(${yesNudgeY}px) scale(${yesScale}); box-shadow: 0 0 60px rgba(255, 105, 180, ${yesGlow});`}
							disabled={isAdvancing}
							on:click={onYes}
						>
							OUI 💘
						</button>

						<!-- NON qui se “dégrade” -->
						<button
							class="mx-auto w-full max-w-xs rounded-xl bg-gray-200/10 px-5 py-3 text-base font-extrabold text-white shadow-lg transition hover:bg-gray-200/20 sm:rounded-2xl sm:px-8 sm:py-4 sm:text-2xl"
							style={`transform: scale(${noScale}); opacity:${noOpacity};`}
							disabled={isAdvancing}
							on:click={onNo}
						>
							{mode === 'corrupt' ? glitchify('NON 😬', Math.min(1, corruptedCount / 5)) : 'NON 😬'}
						</button>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<!-- BLACKOUT final multi-phases -->
		<div class="relative z-30 flex h-full w-full items-center justify-center bg-black">
			{#if blackoutPhase === 'dark'}
				<!-- 5s: noir total -->
				<div class="absolute inset-0 bg-black"></div>
			{:else if blackoutPhase === 'eyes'}
				<!-- 24s: yeux -->
				<div class="text-center" in:fade={{ duration: 250 }}>
					<div class="mx-auto mb-8 flex items-center justify-center gap-10">
						<div class="eye"></div>
						<div class="eye"></div>
					</div>

					<p class="text-lg font-semibold text-white/70">
						{isMuted ? '…' : "T̶̤̻͚̬̪̱̜̖͖͍̈́́̀̏ư̷̥͍̮̺̗̦̙̏͐̃̎͛͑̂̀͝͝ ̸̫̖̳̦̟͔͑̐ņ̶̈͆̐̒̂'̷̧͈̩̥̳̗̿͜ä̶̡̯̼͔̱̯͙̥̦̗͕u̷͚̺̽̋̾̎̓̈̏̍͗̃͠r̵͍͇̈́̄̋̉a̶̰͐̈́͗͆͗̌̔́̆̾͗ĩ̸̫͇̃̍̍͒̚s̶͖̻͈̲̖͍̰̹̊͛̈͗̋̓̊̑ ̷͉̹̣͔̝̞̫̘̿̅̕j̵̢̫̻̠͔̫͈̲̺̲͕̉̆̐̍̅͐̎͋̏́͠͠á̷̪͓͕̯̩͉̘̟̱̯̪̫̍̃̔̈m̴͍̱͕̋̌̊͒̐̿̓͘a̴͕̹̯̲̼̬̣̱̅̌́̿̅͂̒̈́͗ͅͅì̷̡͔̗͙̭͗̉͝s̸̢̛̗̻̘̞̝̙̝̮̳̆̅͘͘͝ ̸̟̠̪̫̝̱͐̅̊́̑́̍̐͛͜ḑ̵̛̯͔͆̌̈́̀͛̃ų̸̙̤̖̙̞̂̈́̇̅̎͂̋̕"}
					</p>
				</div>
			{:else}
				<!-- puis FOXY plein écran -->
				<img
					src="/foxy.gif"
					alt="foxy"
					class="absolute inset-0 h-full w-full object-cover"
					draggable="false"
				/>
			{/if}
		</div>
	{/if}
</div>

<style>
	.eye {
		width: 84px;
		height: 54px;
		border-radius: 999px;
		background: radial-gradient(
			circle at 55% 45%,
			rgba(255, 255, 255, 0.95) 0 18%,
			rgb(255, 255, 255) 19% 100%
		);
		box-shadow:
			0 0 20px rgba(255, 255, 255, 0.35),
			0 0 60px rgba(255, 0, 0, 0.12);
		position: relative;
		overflow: hidden;
		animation: blink 1s infinite;
	}

	.eye::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 52%;
		width: 18px;
		height: 18px;
		transform: translate(-50%, -50%);
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.85);
		box-shadow: 0 0 16px rgba(0, 0, 0, 0.5);
		animation: look 30s ease-in-out infinite;
	}

	@keyframes blink {
		0%,
		96%,
		100% {
			transform: scaleY(1);
		}
		97% {
			transform: scaleY(0.08);
		}
	}

	@keyframes look {
		0%,
		100% {
			transform: translate(-50%, -50%) translateX(0);
		}
		50% {
			transform: translate(-50%, -50%) translateX(14px);
		}
	}

	@media (max-height: 700px) {
		.question-card {
			transform: scale(0.92);
		}
	}
</style>
