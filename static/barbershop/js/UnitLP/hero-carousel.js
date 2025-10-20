// hero-carousel.js

class HeroCarousel {
    constructor() {
        this.carousel = document.querySelector('.hero-carousel');
        this.slides = document.querySelectorAll('.hero-slide');
        this.currentSlide = 0;
        this.interval = null;
        this.slideDuration = 4000; // 4 segundos
        
        this.init();
    }
    
    init() {
        if (!this.carousel || this.slides.length === 0) return;
        
        this.showSlide(this.currentSlide);
        this.startAutoSlide();
        
        this.carousel.addEventListener('mouseenter', () => this.stopAutoSlide());
        this.carousel.addEventListener('mouseleave', () => this.startAutoSlide());
    }
    
    showSlide(index) {
        const offset = -100 * index;
        this.carousel.style.transform = `translateX(${offset}%)`;
    }
    
    nextSlide() {
        this.currentSlide = (this.currentSlide + 1) % this.slides.length;
        this.showSlide(this.currentSlide);
    }
    
    startAutoSlide() {
        this.stopAutoSlide();
        this.interval = setInterval(() => this.nextSlide(), this.slideDuration);
    }
    
    stopAutoSlide() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

// Inicializar o carrossel
document.addEventListener('DOMContentLoaded', () => {
    new HeroCarousel();
});