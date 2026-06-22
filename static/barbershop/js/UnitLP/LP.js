function updateHeaderDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const now = new Date();
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        dateEl.textContent = now.toLocaleDateString('pt-BR', options);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateHeaderDate();
    
    // Smooth scroll para os links do menu
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const id = this.getAttribute('href');
            if (id !== '#') {
                e.preventDefault();
                const el = document.querySelector(id);
                if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
            }
        });
    });

    const hoursContainer = document.querySelector('.location-container');
    if (hoursContainer) {
        hoursContainer.style.height = 'auto';
        hoursContainer.style.minHeight = '450px'; 
    }
});