<script lang="ts">
	import { goto } from '$app/navigation';
	import { startMusic } from '$lib/audio';
</script>

<div id="welcome" class="flex h-screen items-center justify-center">
	<div class="bg-opacity-80 bg-gray-90 rounded-lg p-8 text-center shadow-lg">
		<h1 class="mb-6 text-4xl font-bold">Bienvenue dans</h1>
		<img src="/logo.png" alt="Cupid.io Logo" class="mx-auto mb-4 h-32 w-64" />
		<h2 class="mb-6 text-center text-3xl text-lg">
			Un crush ou ton âme sœur souhaiterait te demander quelque chose !
		</h2>
		<button
			class="center mx-auto block rounded bg-pink-500 px-4 py-2 text-white transition-colors duration-300 hover:bg-pink-600"
			on:click={async () => {
				startMusic(); // démarre pendant le geste utilisateur
				await goto('/questionnaire'); // navigation SPA => l’audio continue
			}}
		>
			Commencer !
		</button>
	</div>
</div>
