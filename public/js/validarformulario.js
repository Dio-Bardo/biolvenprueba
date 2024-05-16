function validarFormulario() {
    const nombre = document.getElementById('nombre').value.trim();
    const nombre_usuario = document.getElementById('nombre_usuario').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const email = document.getElementById('email').value.trim();
    const confirmEmail = document.getElementById('confirmEmail').value.trim();
    const ciudad = document.getElementById('ciudad').value.trim();
    const estado = document.getElementById('estado').value.trim();
    const zona_distribucion = document.getElementById('zona_distribucion').value.trim();
    const contraseña = document.getElementById('contraseña').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const agree = document.getElementById('agree').checked;

    if (nombre === '' || nombre_usuario === '' || telefono === '' || email === '' || confirmEmail === '' || ciudad === '' || estado === '' || zona_distribucion === '' || contraseña === '' || confirmPassword === '') {
        alert("Por favor complete todos los campos del formulario.");
        return false;
    }

    if (email !== confirmEmail) {
        alert("Los correos electrónicos no coinciden.");
        return false;
    }

    if (contraseña !== confirmPassword) {
        alert("Las contraseñas no coinciden.");
        return false;
    }

    if (!agree) {
        alert("Debe aceptar la política de privacidad para continuar.");
        return false;
    }

    return true;
}