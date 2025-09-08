// Configurar datas padrão
const today = new Date();
const lastMonth = new Date(today);
lastMonth.setMonth(lastMonth.getMonth() - 1);

document.getElementById('dateStart').value = formatDate(lastMonth);
document.getElementById('dateEnd').value = formatDate(today);




// Função para carregar o modal de relatório
// document.getElementById("generatePoolBtn").addEventListener("click", async () => {
//     // Funcao para puxar o modal e vincular a const 
//     const response = await fetch("../../modals/5.Dashboard/CreatePool.html");
//     const PoolModalHtml = await response.text();

//     //juntando modal externo pra div escondido 
//     document.getElementById("poolModalContainer").innerHTML = PoolModalHtml;
//     document.querySelector(".modal").style.display = "flex";

//     // Modal  para fechar modal no botao fechar 
//     document.querySelector(".close").addEventListener("click", () => {
//         document.getElementById("poolModalContainer").innerHTML = "";
//     });
        
// });

const modal = document.querySelector('.modal');

function openAppointmentModal() {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeAppointmentModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

function cancelAppointmentModal(){
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

window.addEventListener('click', function (e) {
    if (e.target === modal) {
        closeAppointmentModal();
    }
});





// Configurar gráficos e eventos
document.addEventListener('DOMContentLoaded', function() {
    // Receita do Mês
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    const revenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
            datasets: [{
                label: 'Receita (R$)',
                data: [700, 1200, 1950, 1850],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#3498db',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    // Receitas por Categoria
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    const categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: ['Plano Básico', 'Plano Corte + barba', 'Plano Corte básico'],
            datasets: [{
                data: [200, 150, 300],
                backgroundColor: [
                    'rgba(52, 152, 219, 0.8)',
                    'rgba(46, 204, 113, 0.8)',
                    'rgba(155, 89, 182, 0.8)',
                    'rgba(253, 249, 10, 0.8)',
                ],
                borderColor: [
                    'rgba(52, 152, 219, 1)',
                    'rgba(46, 204, 113, 1)',
                    'rgba(155, 89, 182, 1)',
                    'rgba(253, 249, 10, 0.8)',
                ],
                borderWidth: 1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: R$ ${context.raw.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });

    
    // Comissões por Barbeiro
    const commissionsCtx = document.getElementById('commissionsChart').getContext('2d');
    const commissionsChart = new Chart(commissionsCtx, {
        type: 'bar',
        data: {
            labels: ['Raphael Matias', 'Lucas Lopes', 'Carlos Silva'],
            datasets: [{
                label: 'Comissões (R$)',
                data: [850, 720, 480],
                backgroundColor: [
                    'rgba(230, 126, 34, 0.7)',
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(46, 204, 113, 0.7)'
                ],
                borderWidth: 0,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
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