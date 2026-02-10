let currentIndex = 0;

function mostrarGaleria(tipo) {
    const carousel = document.getElementById('carousel');
    const leftArrow = document.querySelector('.arrow.left');
    const rightArrow = document.querySelector('.arrow.right');
    
    // Busca no container que NÃO é apagado
    const sourceId = tipo === 'cortes' ? 'data-cortes' : 'data-produtos';
    const sourceContainer = document.getElementById(sourceId);
    
    if (!sourceContainer) return;
    const fotosBanco = sourceContainer.querySelectorAll('img');

    carousel.innerHTML = ''; // Limpa as imagens visuais antigas

    fotosBanco.forEach((imgOriginal, index) => {
        const img = document.createElement('img');
        img.src = imgOriginal.src;
        img.alt = `Foto ${index + 1}`;
        if (index === 0) img.classList.add('active');
        carousel.appendChild(img);
    });

    currentIndex = 0;
    
    if (fotosBanco.length === 0) {
        carousel.innerHTML = '<p style="color: white; padding: 20px; width: 100%; text-align: center;">Nenhuma foto cadastrada.</p>';
    }

    // Gerencia as setas
    const arrowsDisplay = fotosBanco.length > 1 ? 'block' : 'none';
    if(leftArrow) leftArrow.style.display = arrowsDisplay;
    if(rightArrow) rightArrow.style.display = arrowsDisplay;

    // Atualiza o estilo visual dos botões (CORTES/PRODUTOS)
    document.querySelectorAll('.btnFoto').forEach(btn => {
        btn.classList.remove('ativo');
        const text = btn.innerText.toLowerCase();
        if ((tipo === 'cortes' && text.includes('cortes')) || (tipo === 'produtos' && text.includes('produtos'))) {
            btn.classList.add('ativo');
        }
    });

    highlightCurrentImage();
}

function scrollCarousel(direction) {
    const carousel = document.getElementById('carousel');
    const images = carousel.querySelectorAll('img');
    if (images.length <= 1) return;

    images[currentIndex].classList.remove('active');
    currentIndex += direction;

    if (currentIndex < 0) currentIndex = images.length - 1;
    if (currentIndex >= images.length) currentIndex = 0;

    highlightCurrentImage();
}

function highlightCurrentImage() {
    const carousel = document.getElementById('carousel');
    const images = carousel.querySelectorAll('img');
    if (images.length === 0) return;

    images.forEach(img => img.classList.remove('active'));
    images[currentIndex].classList.add('active');

    const imgElement = images[currentIndex];
    // Centraliza a imagem ativa no scroll
    const scrollPos = imgElement.offsetLeft - (carousel.offsetWidth / 2) + (imgElement.offsetWidth / 2);

    carousel.scrollTo({
        left: scrollPos,
        behavior: 'smooth'
    });
}

// Carrega a galeria inicial
window.addEventListener('load', () => {
    mostrarGaleria('cortes');
});