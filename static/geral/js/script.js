// Função para formatar a data atual
function formatCurrentDate() {
    const now = new Date();
    
    // Mapeamento de dias da semana
    const diasSemana = [
        "Domingo", "Segunda-feira", "Terça-feira", 
        "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"
    ];
    
    // Mapeamento de meses
    const meses = [
        "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    
    // Obter componentes da data
    const dia = now.getDate();
    const mes = meses[now.getMonth()];
    const ano = now.getFullYear();
    const diaSemana = diasSemana[now.getDay()];
    
    // Formatar a data no padrão brasileiro
    return `${dia} de ${mes} de ${ano} - ${diaSemana}`;
}

// Atualizar o elemento com a data formatada
document.addEventListener('DOMContentLoaded', function() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = formatCurrentDate();
        
        // Atualizar a cada minuto (opcional, mas útil para garantir precisão)
        setInterval(() => {
            dateElement.textContent = formatCurrentDate();
        }, 60000);
    }
});


// HEADER SIDEBAR
document.addEventListener("DOMContentLoaded", function () {
    const userProfile = document.getElementById('userProfile');
    const userSidebar = document.querySelector('.user-sidebar');
    const chevronIcon = document.getElementById('chevronIcon');

    userProfile.addEventListener('click', function (e) {
        e.stopPropagation();
        
        // Verifica se o modal está visível
        const isVisible = userSidebar.classList.contains('show');
        
        // Se estiver visível (clicando para fechar)
        if (isVisible) {
            userSidebar.classList.remove('show');
            chevronIcon.classList.remove('rotate');
        } 
        // Se não estiver visível (clicando para abrir)
        else {
            userSidebar.classList.add('show');
            chevronIcon.classList.add('rotate');
        }
    });

    // Fecha ao clicar fora
    document.addEventListener('click', function (e) {
        if (!userProfile.contains(e.target)) {
            userSidebar.classList.remove('show');
            chevronIcon.classList.remove('rotate');
        }
    });
});


// HEADER DINAMICO
document.addEventListener("DOMContentLoaded", function() {
    const currentUrl = window.location.pathname;
    const navTabs = document.querySelectorAll(".nav-tabs a");

    navTabs.forEach(link => {
        const href = link.getAttribute("href")?.trim();
        const tab = link.querySelector(".nav-tab");

        if (!href || !tab) return;
        tab.classList.remove("active");

        if (
            currentUrl.startsWith(href) ||
            (
                href.includes("barbershop/units") && 
                (currentUrl.includes("/units") || currentUrl.includes("/funcionarios") || currentUrl.includes("/funcionamento"))
            )
        ) {
            tab.classList.add("active");
        }
    });
});


