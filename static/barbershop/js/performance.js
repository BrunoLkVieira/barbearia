// Configurar datas padrão
const today = new Date();
const lastMonth = new Date(today);
lastMonth.setMonth(lastMonth.getMonth() - 1);

document.getElementById('dateStart').value = formatDate(lastMonth);
document.getElementById('dateEnd').value = formatDate(today);

// Dados de exemplo
const barberData = {
    'rm': {
        name: 'Raphael Matias',
        services: [
            {name: 'Corte Executivo', count: 12},
            {name: 'Barba Completa', count: 8},
            {name: 'Corte + Barba', count: 7},
            {name: 'Sobrancelha', count: 5}
        ],
        products: [
            {name: 'Pomada Modeladora', count: 4},
            {name: 'Óleo para Barba', count: 2},
            {name: 'Shampoo Anticaspa', count: 2}
        ]
    },
    'll': {
        name: 'Lucas Lopes',
        services: [
            {name: 'Corte Simples', count: 10},
            {name: 'Barba Completa', count: 6},
            {name: 'Corte Degradê', count: 8},
            {name: 'Sobrancelha', count: 4}
        ],
        products: [
            {name: 'Gel Fixador', count: 3},
            {name: 'Creme para Barba', count: 2}
        ]
    },
    'cs': {
        name: 'Carlos Silva',
        services: [
            {name: 'Corte Social', count: 8},
            {name: 'Barba Desenhada', count: 7},
            {name: 'Corte + Barba', count: 6},
            {name: 'Hidratação Capilar', count: 3}
        ],
        products: [
            {name: 'Pomada Modeladora', count: 3},
            {name: 'Óleo para Barba', count: 2},
            {name: 'Shampoo Anticaspa', count: 2}
        ]
    },
    'ma': {
        name: 'Marcos Almeida',
        services: [
            {name: 'Corte Militar', count: 7},
            {name: 'Barba Completa', count: 5},
            {name: 'Corte + Barba', count: 4},
            {name: 'Sobrancelha', count: 3}
        ],
        products: [
            {name: 'Gel Fixador', count: 2},
            {name: 'Creme para Barba', count: 1}
        ]
    }
};

// Função para carregar o modal
const modal = document.querySelector('.modal');

function closeDetails() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

function cancelDetails(){
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

window.addEventListener('click', function (e) {
    if (e.target === modal) {
        closeDetails();
    }
});




// Funções para abrir e fechar o modal
function openDetails(barberId) {
    const barber = barberData[barberId];
    if (!barber) return;
    
    // Preencher o modal
    document.getElementById('modalBarberName').textContent = barber.name;
    
    // Preencher serviços
    const servicesList = document.getElementById('servicesList');
    servicesList.innerHTML = '';
    
    document.body.style.overflow = 'hidden';
    barber.services.forEach(service => {
        const item = document.createElement('div');
        item.className = 'service-item';
        item.innerHTML = `
            <span class="service-name">${service.name}</span>
            <span class="service-count">${service.count} serviços</span>
        `;
        servicesList.appendChild(item);
    });
    
    // Preencher produtos
    const productsList = document.getElementById('productsList');
    productsList.innerHTML = '';
    barber.products.forEach(product => {
        const item = document.createElement('div');
        item.className = 'product-item';
        item.innerHTML = `
            <span class="product-name">${product.name}</span>
            <span class="product-count">${product.count} vendas</span>
        `;
        productsList.appendChild(item);
    });
    
    // Exibir modal
    document.getElementById('detailsModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

// Carregar o modal quando a página estiver pronta
document.addEventListener('DOMContentLoaded', function() {
    // Carregar o modal de detalhes
    loadPerformanceModal();
});

function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    
    return [year, month, day].join('-');
}