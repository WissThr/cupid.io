<!-- src/routes/questionnaire/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import interestsData from '$lib/interests.json';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	type Asset = { type: 'image' | 'gif'; src: string };
	type Interest = {
		id: string;
		title: string;
		questionTemplate?: string;
		asset?: Asset;
		corrupt?: Asset;
	};

	const MAX_YES = 5;

	// ✅ Positions plus “compactes” sur mobile, comme tu voulais
	const CORNERS = [
		'absolute top-3 left-3 sm:top-6 sm:left-6',
		'absolute top-3 right-3 sm:top-6 sm:right-6',
		'absolute bottom-3 left-3 sm:bottom-6 sm:left-6',
		'absolute bottom-3 right-3 sm:bottom-6 sm:right-6'
	] as const;

	const BOTTOM_CENTER = 'absolute bottom-3 left-1/2 -translate-x-1/2 sm:bottom-6';

	const reactionsYes = [
		"J'en étais sûr !",
		"Je le savais… c'était écrit 😌",
		'Très bon goût, très bon.',
		"Ok wow, j'avais raison.",
		'Ça te correspond beaucoup trop.'
	];

	const reactionsNo = [
		"Je m'en serais jamais douté :O",
		'Plot twist monumental.',
		'Ok… je note… 👀',
		"Ça m'arrange pas mais ok.",
		'Tu viens de me surprendre.'
	];

	const reactionsAny = [
		'Analyse en cours… ✅',
		'Intéressant… très intéressant.',
		"Je m'attendais à tout sauf à ça.",
		'Ok ok ok…',
		'On continue.'
	];

	let interests: Interest[] = [];
	let remaining: Interest[] = [];
	let current: Interest | null = null;

	let yesCount = 0;
	let askedCount = 0;

	let picked: { id: string; title: string; src: string; posClass: string }[] = [];

	let reactionVisible = false;
	let reactionText = '';
	let locked = false;

	function shuffle<T>(arr: T[]): T[] {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	function templateQuestion(it: Interest) {
		const tpl = it.questionTemplate ?? "Est-ce que t'aimes bien {title} ?";
		return tpl.replace('{title}', it.title);
	}

	function pickReaction(isYes: boolean) {
		const pool = [...reactionsAny, ...(isYes ? reactionsYes : reactionsNo)];
		return pool[Math.floor(Math.random() * pool.length)];
	}

	function getAssetSrc(it: Interest) {
		return it.asset?.src && it.asset.src !== '' ? it.asset.src : '/placeholder.png';
	}

	function nextPosClass() {
		if (picked.length < 4) return CORNERS[picked.length];
		return BOTTOM_CENTER;
	}

	function popNext(): Interest | null {
		if (yesCount >= MAX_YES || remaining.length === 0) return null;
		return remaining.shift() ?? null;
	}

	function savePicksToStorage() {
		localStorage.setItem(
			'cupid_picks',
			JSON.stringify(
				picked.slice(0, 5).map((p) => ({
					id: p.id.split(':')[0], // on enlève le suffixe Date.now() si tu en as
					title: p.title,
					asset: p.src,
					corrupt: interests.find((i) => i.id === p.id.split(':')[0])?.corrupt?.src ?? ''
				}))
			)
		);
	}

	async function handleAnswer(isYes: boolean) {
		if (!current || locked) return;
		locked = true;

		const answered = current;
		const next = popNext();

		// ✅ cacher tout de suite la question (évite l’effet “ancienne -> nouvelle” visible)
		current = null;

		reactionText = pickReaction(isYes);
		reactionVisible = true;
		await new Promise((r) => setTimeout(r, 1400));
		reactionVisible = false;

		if (isYes && yesCount < MAX_YES) {
			picked = [
				...picked,
				{
					id: answered.id,
					title: answered.title,
					src: getAssetSrc(answered),
					posClass: nextPosClass()
				}
			];
			yesCount += 1;
		}

		askedCount += 1;

		if (yesCount >= MAX_YES || next === null) {
			savePicksToStorage();
			window.location.href = '/the-question';
			return;
		}

		current = next;
		locked = false;
	}

	onMount(() => {
		interests = (interestsData?.interests ?? []) as Interest[];
		remaining = shuffle(interests);
		current = popNext();
	});
</script>

<!-- ✅ Full-screen, no scroll, gradient + stacking propre -->
<div
	class="relative isolate h-screen w-screen overflow-hidden bg-gradient-to-br from-pink-600 via-fuchsia-700 to-gray-950"
>
	<!-- ✅ Vignette derrière TOUT (ne cache plus les images) -->
	<div class="pointer-events-none absolute inset-0 z-0 bg-black/35"></div>

	<!-- ✅ Collected images au-dessus (mobile + petits) -->
	{#each picked as p (p.id)}
		<div in:fade={{ duration: 400 }} class={p.posClass + ' pointer-events-none z-20'}>
			<div class="rounded-2xl bg-white/10 p-2 shadow-2xl backdrop-blur">
				<img
					src={p.src}
					alt={p.title}
					class="h-20 w-20 rounded-xl object-cover select-none sm:h-32 sm:w-32 md:h-44 md:w-44"
					draggable="false"
				/>
			</div>
		</div>
	{/each}

	<!-- ✅ Center card au-dessus de tout -->
	<div class="relative z-0 flex h-full items-center justify-center px-2 sm:px-6">
		<div
			class="w-[90%] max-w-md rounded-2xl bg-gray-900/80 p-4 text-center shadow-2xl backdrop-blur"
		>
			<div class="mb-4">
				<h1 class="mb-2 text-xl font-extrabold tracking-tight text-white sm:mb-3 sm:text-4xl">
					Questionnaire
				</h1>
				<p class="text-xs text-gray-200 sm:text-lg">
					Réponds vite et honnêtement… c’est pour la science 💘
				</p>
			</div>

			{#if reactionVisible}
				<div in:fade={{ duration: 160 }} class="rounded-2xl bg-black/30 px-4 py-6">
					<p class="text-lg font-bold text-white sm:text-2xl">{reactionText}</p>
					<p class="mt-2 text-sm text-gray-200 sm:text-base">…</p>
				</div>
			{:else if current}
				{#key current.id}
					<div in:fade={{ duration: 220 }} class="rounded-2xl bg-black/25 px-4 py-6">
						<p
							class="text-md mx-auto mb-4 max-w-xl leading-snug font-semibold text-white sm:mb-5 sm:text-lg"
						>
							{templateQuestion(current)}
						</p>

						<div class="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-center">
							<button
								class="mx-auto w-full max-w-xs rounded-xl bg-pink-500 px-4 py-2 text-base font-extrabold text-white sm:rounded-2xl sm:px-5 sm:py-3 sm:text-lg"
								disabled={locked}
								on:click={() => handleAnswer(true)}
							>
								OUI 💘
							</button>

							<button
								class="mx-auto w-full max-w-xs rounded-xl bg-gray-500 px-4 py-2 text-base font-extrabold text-white sm:rounded-2xl sm:px-5 sm:py-3 sm:text-lg"
								disabled={locked}
								on:click={() => handleAnswer(false)}
							>
								NON 😬
							</button>
						</div>
					</div>
				{/key}
			{:else}
				<p class="text-white">Initialisation…</p>
			{/if}
		</div>
	</div>
</div>
