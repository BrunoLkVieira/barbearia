const cpfInput = document.getElementById('cpf');

cpfInput.addEventListener('input', function() {
    if (this.value.length > 11) {
    this.value = this.value.slice(0, 11);
    }
});

window.showPassword = function () {
  const passwordInput = document.getElementById("password");
  const toggleIcon = document.querySelector(".password-toggle i.fa-eye");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleIcon.classList.remove("fa-eye");
    toggleIcon.classList.add("fa-eye-slash");
  } else {
    passwordInput.type = "password";
    toggleIcon.classList.remove("fa-eye-slash");
    toggleIcon.classList.add("fa-eye");
  }
};

