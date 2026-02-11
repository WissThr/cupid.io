import { writable } from 'svelte/store';

let audio: HTMLAudioElement | null = null;

export const musicEnabled = writable(false);

export function startMusic() {
	if (typeof window === 'undefined') return;

	if (!audio) {
		audio = new Audio('/music.mp3');
		audio.loop = true;
		audio.volume = 0.35;
	}

	// tenter de jouer (peut être bloqué tant que pas d’interaction user)
	audio.play().catch(() => {});

	musicEnabled.set(true);
}

export function stopMusic() {
	if (!audio) return;
	audio.pause();
	audio.currentTime = 0;
	musicEnabled.set(false);
}

export function fadeOutMusic(ms = 600) {
	if (!audio) return;

	const steps = 20;
	const stepMs = Math.max(10, Math.floor(ms / steps));
	const startVol = audio.volume;

	let i = 0;
	const t = window.setInterval(() => {
		i += 1;
		const k = 1 - i / steps;
		audio!.volume = Math.max(0, startVol * k);
		if (i >= steps) {
			window.clearInterval(t);
			stopMusic();
			// remettre le volume par défaut pour la prochaine fois
			audio!.volume = startVol;
		}
	}, stepMs);
}
