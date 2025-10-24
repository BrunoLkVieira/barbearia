const imagens = {
    cortes: [
        'https://i.pinimg.com/236x/9b/a6/b1/9ba6b1b30a3b7f7fc59d305dac033244.jpg',
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSio0ArjBzgK6nbWzhY2pDB169_ZYpngJfb2JixtNGSj6dYcEVAW3zA11n3y9m1GFtbvlM&usqp=CAU',
        'https://i.pinimg.com/736x/62/a6/0f/62a60f761cbf5108cd822be037ddda8b.jpg',
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        'https://i.pinimg.com/736x/7d/64/2e/7d642e09a2dff69c50c439165ec27c06.jpg',
        'https://images.unsplash.com/photo-1605497788044-5a32c7078486?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        'https://i.pinimg.com/736x/e2/13/80/e213806a0a2436487a6aee8cbc3efe33.jpg',
        'https://4.bp.blogspot.com/-Y7Dp4m1DXIE/W5ewWfXnW2I/AAAAAAABLBE/2Bt4CydhP9oAPUMHl44_M0nszcrNWKaWACLcBGAs/s1600/cortes-de-cabelo-masculino-2019-design%20(4).jpg'
    ],
    produtos: [
        'https://images.unsplash.com/photo-1602143407151-7111542de6e8?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        'https://images.tcdn.com.br/img/img_prod/686591/barboterapia_inteligente_xeque_mate_barba_forte_150g_3_produtos_141_1_20201124165210.jpg',
        'https://images.tcdn.com.br/img/img_prod/731726/balm_para_barba_ice_forest_140g_barba_de_macho_113_1_850ad62bc83c71242013cfb5efc00f63.jpg',
        'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        'https://cdn.awsli.com.br/400x400/1821/1821289/produto/228625880/imagens-hero-produtos-macholandia-2022-05-ofxhzv8osz.jpg',
        'https://images.tcdn.com.br/img/img_prod/746965/kit_barbearia_profissional_macho_landia_barba_terapia_4_passos_131_1_20200312162223.jpeg'
    ]
};

let currentIndex = 0;

function mostrarGaleria(tipo) {
    const carousel = document.getElementById('carousel');
    const leftArrow = document.querySelector('.arrow.left');
    const rightArrow = document.querySelector('.arrow.right');

    carousel.innerHTML = ''; // limpa as imagens anteriores

    imagens[tipo].forEach((src, index) => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = `Imagem ${index + 1} de ${tipo}`;
        if (index === 0) img.classList.add('active');
        carousel.appendChild(img);
    });

    currentIndex = 0;
    highlightCurrentImage();

    // Mostrar ou esconder setas
    if (imagens[tipo].length <= 1) {
        leftArrow.style.display = 'none';
        rightArrow.style.display = 'none';
    } else {
        leftArrow.style.display = 'block';
        rightArrow.style.display = 'block';
    }

    // Atualiza botão ativo
    const botoes = document.querySelectorAll('.btnFoto');
    botoes.forEach(btn => btn.classList.remove('ativo'));

    // Ativa o botão clicado
    botoes.forEach(btn => {
        const texto = btn.textContent.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (texto.includes(tipo)) {
            btn.classList.add('ativo');
        }
    });
}

function scrollCarousel(direction) {
    const carousel = document.getElementById('carousel');
    const images = carousel.querySelectorAll('img');
    const totalImages = images.length;

    if (totalImages === 0) return;

    images[currentIndex].classList.remove('active');
    currentIndex += direction;

    if (currentIndex < 0) currentIndex = totalImages - 1;
    if (currentIndex >= totalImages) currentIndex = 0;

    images[currentIndex].classList.add('active');

    const imageWidth = images[0].offsetWidth;
    const gap = 20; // gap definido no CSS
    const scrollPosition = currentIndex * (imageWidth + gap);

    carousel.scrollTo({
        left: scrollPosition - carousel.offsetWidth / 2 + imageWidth / 2,
        behavior: 'smooth'
    });
}

function highlightCurrentImage() {
    const carousel = document.getElementById('carousel');
    const images = carousel.querySelectorAll('img');

    images.forEach(img => img.classList.remove('active'));
    if (images[currentIndex]) images[currentIndex].classList.add('active');

    const imageWidth = images[0].offsetWidth;
    const gap = 20; // gap definido no CSS
    const scrollPosition = currentIndex * (imageWidth + gap);

    carousel.scrollTo({
        left: scrollPosition - carousel.offsetWidth / 2 + imageWidth / 2,
        behavior: 'smooth'
    });
}

// carregar cortes como padrão
window.addEventListener('load', () => {
    mostrarGaleria('cortes');
});