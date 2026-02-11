<script lang="ts">
	export let visible = true;
</script>

{#if visible}
	<div
		id="warning"
		class="fixed right-0 bottom-0 left-0 border-t border-gray-700 bg-gray-900/90 p-4 text-center text-xs text-gray-300"
	>
		<button
			class="absolute top-2 right-4 text-gray-400 hover:text-white"
			on:click={() => (visible = false)}
		>
			✕
		</button>
		<p class="mb-2 font-semibold text-white">
			Créé par Wissam Tahiri
			<a href="https://wissamtahiri-swart.vercel.app/" class="underline">(Portfolio)</a>
			<a href="https://www.linkedin.com/in/wissam-tahiri-552217244/" class="underline">(LinkedIn)</a
			>
			<a href="https://github.com/WissThr" class="underline">(GitHub)</a>
			<a href="mailto:wissam.tahiri.75@gmail.com" class="underline">(Email)</a>
		</p>

		<p class="mb-2 font-semibold text-yellow-400">⚠️ Avertissement</p>

		<p>
			Ce site est à but humoristique. Mettez le son ! Il peut contenir des flashs et des contenus
			sensibles. (ironique vu le peureux que je suis ^^)
		</p>
	</div>
{/if}
