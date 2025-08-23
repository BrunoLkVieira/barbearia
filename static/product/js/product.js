
const modal = document.getElementById('productModal');

const openModalBtns = [
    document.getElementById('newServiceBtn'),
    document.getElementById('newServiceBtnFooter')
    ];

function openModal() {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cancelModal(){
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

// Fecha o modal ao clicar no "x"
const closeBtn = modal.querySelector('.close-btn');
if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });
}

// Fecha o modal ao clicar fora dele
window.addEventListener('click', e => {
    if (e.target === modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});


