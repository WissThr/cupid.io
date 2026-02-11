<script>
			let copied = false;

			function copyLink() {
				navigator.clipboard.writeText(window.location.origin);
				copied = true;
				setTimeout(() => {
					copied = false;
				}, 2000);
			}
		</script>
		
		<div id="welcome" class="flex h-screen items-start justify-center">
	<div class="bg-opacity-80 bg-gray-90 rounded-lg p-8 text-center shadow-lg">
		<p class="mb-4 text-center text-2xl font-bold">Je t'ai bien eu, fallait voir ta tête!</p>
		<p class="mb-4 text-center text-lg">Merci d'avoir participé, j'espère que ça t'a plu !</p>
		<p class="mb-4 text-center text-lg">
			N'hésite pas à partager le site avec tes amis (ou avec ton/ta vrai(e) crush) !
		</p>
		<h1 class="mb-6 text-4xl font-bold">Bonne Saint Valentin !</h1>
		<button
			on:click={copyLink}
			class="mb-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
		>
			{copied ? 'Copié !' : 'Copier le lien'}
		</button>
		<img src="/fazbear.gif" alt="Some description" class="mx-auto" />
	</div>
</div>
