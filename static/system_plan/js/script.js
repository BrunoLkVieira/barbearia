// Toggle entre mensal/semestral
function updatePlans(period) {
    const prices = document.querySelectorAll('.price');
    const totals = document.querySelectorAll('.total-price');
    const diferences = document.querySelectorAll('.diference');

    prices.forEach((price, i) => {
        const totalPriceEl = totals[i];
        const diferencePriceEl = diferences[i];
        const monthlyValue = parseFloat(price.dataset.monthly);
        const semesterValue = parseFloat(price.dataset.semester);

        if (period === 'semester') {
            const total = semesterValue * 6; 
            const totalPerMounth = monthlyValue * 6;
            const economic = totalPerMounth - total;
            price.textContent = `R$ ${semesterValue}`;
            price.dataset.period = 'por mês (plano semestral)';
            totalPriceEl.textContent = `R$ ${total} por semestre`;
            diferencePriceEl.textContent = `Economiza R$ ${economic} reais`
        } else {
            price.textContent = `R$ ${monthlyValue}`;
            price.dataset.period = 'por mês';
            totalPriceEl.textContent = "";
            diferencePriceEl.textContent = "";
        }
    });
}



// Evento de clique nos botões
document.querySelectorAll('.toggle-btn').forEach(button => {
    button.addEventListener('click', function() {
        document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        updatePlans(this.dataset.period);
    });
});
// Executa uma vez ao carregar a página para iniciar com "semester"
updatePlans('semester');



// Scroll suave para âncoras
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if(target) {
            window.scrollTo({
                top: target.offsetTop - 100,
                behavior: 'smooth'
            });
        }
    });
});



// Animação ao rolar
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if(entry.isIntersecting) {
            entry.target.classList.add('show');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.feature-card, .plan-card, .testimonial-card, .tutorial-card').forEach(el => {
    el.classList.add('hidden');
    observer.observe(el);
});



// MODAL
const modalCadastro = document.getElementById('modalContainer');

function openModal() {
    modalCadastro.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Fechar modal
function closeModal() {
    modalCadastro.style.display = 'none';
    document.body.style.overflow = '';
}

function cancelModal(){
    modalCadastro.style.display = 'none';
    document.body.style.overflow = '';
}

// window.addEventListener('click', function (e) {
//     if (e.target === modalCadastro) {
//         closeModal();
//     }
// });

function createAccount(event) {
    // Evita que o formulário seja enviado antes da validação
    event.preventDefault();

    let nome = document.querySelector("input[name='name']").value.trim();
    let sobrenome = document.querySelector("input[name='last_name']").value.trim();
    let email = document.querySelector("input[name='email']").value.trim();
    let senha = document.querySelector("input[name='password1']").value.trim();
    let senha2 = document.querySelector("input[name='password2']").value.trim();

    if (!nome || !sobrenome || !email || !senha || !senha2) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    if (senha !== senha2) {
        alert("As senhas não coincidem.");
        return;
    }

    // Se passou na validação, envia o formulário
    document.getElementById("editForm").submit();
}

// Inicialização do Swiper Cliente
document.addEventListener('DOMContentLoaded', function() {
    // Verifica se o Swiper está disponível
    if (typeof Swiper === 'function') {
        var swiper = new Swiper(".mySwiper", {
            spaceBetween: 30,
            centeredSlides: true,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
            },
            pagination: {
                el: ".swiper-pagination",
                clickable: true,
            },
            navigation: {
                nextEl: ".swiper-button-next",
                prevEl: ".swiper-button-prev",
            },
            loop: true,
        });
    } else {
        console.error("Swiper não foi carregado corretamente");
    }
});
