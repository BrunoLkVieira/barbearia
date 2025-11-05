
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});


function confirmDelete(formId, confirmationText) {
    Swal.fire({
        title: 'Você tem certeza?',
        text: confirmationText,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', // Vermelho (perigo)
        cancelButtonColor: '#3085d6', // Azul
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        // Se o usuário clicar em "Sim, excluir!"
        if (result.isConfirmed) {
            const form = document.getElementById(formId);
            if (form) {
                form.submit();
            }
        }
    });
}